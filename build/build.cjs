//@ts-check

const { readFileSync } = require("node:fs");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

const { createContext } = require("./loaders/shared-context.cjs");

// not sure why TS doesn't pick this up automatically...
/// <reference types="../types/react-server-dom-webpack" />
const ReactFlightWebpackPlugin = require("react-server-dom-webpack/plugin");
// const ReactFlightWebpackPlugin =
//   /** @type {import("react-server-dom-webpack/plugin").default} */ (
//     /** @type {unknown} */ (require("react-server-dom-webpack/plugin"))
//   );

const { runWebpack } = require("./run-webpack.cjs");
const {
  Module,
  NormalModule,
  ExternalModule,
  dependencies,
  Compilation,
  sources,
} = require("webpack");
const { ModuleDependency } = dependencies;

const rel = (/** @type {string} */ p) => path.resolve(__dirname, p);

const opts = {
  client: {
    entry: rel("../src/client.tsx"),
    destDir: rel("../dist/client"),
  },
  server: {
    entry: rel("../src/server.tsx"),
    destDir: rel("../dist/server"),
  },
  moduleDir: rel("../src"),
  nodeModulesDir: rel("../node_modules"),
};

/**
 * @typedef {import('webpack').Configuration} Configuration
 */

const CLIENT_COMPONENT_FOR_RSC_LOADER = require.resolve(
  path.resolve(__dirname, "./loaders/client-component-for-rsc.cjs")
);

const CLIENT_COMPONENT_FOR_SSR_LOADER_ID = "client-component-for-ssr";

const CLIENT_COMPONENT_FOR_SSR_LOADER = require.resolve(
  path.resolve(__dirname, `./loaders/${CLIENT_COMPONENT_FOR_SSR_LOADER_ID}.cjs`)
);

/** @typedef {import('./loaders/types.cjs').Ctx} Ctx */

const main = async () => {
  const moduleExtensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
  const moduleExtensionsRegex = /(ts|tsx|.js|jsx|json)$/;

  /** @type {Configuration} */
  const shared = {
    mode: "development",
    devtool: "source-map",
    resolve: {
      modules: [opts.moduleDir, opts.nodeModulesDir],
      extensions: moduleExtensions,
    },
    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
            },
          },
        },
      ],
    },
  };

  //@ts-ignore FIXME later!
  /** @type {import('react-server-dom-webpack/plugin').Options['clientReferences']} */
  const clientReferences = [path.join(opts.moduleDir, "app/client-child.tsx")];
  // const clientReferences = {
  //   directory: opts.moduleDir,
  //   include: moduleExtensionsRegex,
  //   recursive: true,
  // };

  /** @type {Configuration} */
  const clientConfig = {
    ...shared,
    entry: opts.client.entry,
    resolve: {
      ...shared.resolve,
    },
    module: {
      ...shared.module,
    },
    plugins: [
      new ReactFlightWebpackPlugin({
        isServer: false,
        clientManifestFilename: "client-manifest.json",
        ssrManifestFilename: "ssr-manifest-intermediate.json",
        clientReferences,
        // clientReferences: opts.moduleDir,
        // clientReferences: opts.moduleDir + "/*",
      }),
    ],
    target: ["web", "es2020"],
    output: {
      path: opts.client.destDir,
      publicPath: "auto", // we don't know the public path statically
      clean: true,
    },
  };
  console.log("building client...");

  await runWebpack(clientConfig);

  const ssrManifestPath = path.join(
    opts.client.destDir,
    "ssr-manifest-intermediate.json"
  );

  /** @type {SSRManifest} */
  const ssrManifestFromRSDW = JSON.parse(
    readFileSync(ssrManifestPath, "utf-8")
  );

  /** @type {Ctx} */
  const ctx = createContext();

  console.log("building server...");
  /** @type {Configuration} */
  const serverConfig = {
    ...shared,
    entry: opts.server.entry,
    resolve: {
      ...shared.resolve,
    },
    module: {
      ...shared.module,
      rules: [
        {
          test: /\.(t|j)sx?$/,
          exclude: /node_modules/,
          use: [
            {
              // runs last
              loader: CLIENT_COMPONENT_FOR_RSC_LOADER,
              options: {
                ctx,
              },
            },
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
      ],
    },
    plugins: [
      // WON'T WORK, server compiler isn't implemented yet
      // new ReactFlightWebpackPlugin({
      //   isServer: true,
      //   clientManifestFilename: "SERVER__client-manifest.json",
      //   ssrManifestFilename: "SERVER__ssr-manifest.json",
      //   clientReferences,
      //   // clientReferences: opts.moduleDir + "/*",
      // }),
      new RSCServerPlugin({
        ctx,
        ssrManifestFromClient: ssrManifestFromRSDW,
        ssrManifestFilename: "ssr-manifest.json",
      }),
    ],
    target: "node16",
    output: {
      path: opts.server.destDir,
      clean: true,
    },
  };
  await runWebpack(serverConfig);
};

/** @typedef {{
 *   [id: string]: {
 *     [exportName: string]: { specifier: string | number, name: string },
 *   },
 * }} SSRManifest
 * */

/** @typedef {{
 *   [id: string]: {
 *     [exportName: string]: { id: string | number, name: string, chunks: (string | number)[], async: boolean },
 *   },
 * }} SSRManifestActual
 * */

/** @typedef {import('webpack').Compiler} Compiler */

/** @typedef {{ ctx: Ctx, ssrManifestFromClient: SSRManifest, ssrManifestFilename: string }} RSCPluginOptions */

class RSCServerPlugin {
  static pluginName = "RSCServerPlugin";

  /**
   * @param {RSCPluginOptions} options
   */
  constructor(options) {
    /** @type {RSCPluginOptions} */
    this.options = options;
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      RSCServerPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        compilation.hooks.finishModules.tap(
          RSCServerPlugin.pluginName,
          (finishedModsIter) => {
            const finishedMods = [...finishedModsIter];
            console.log("compilation > finishModules");
            for (const clientModInfo of this.options.ctx.clientModules) {
              const mod = finishedMods.find(
                (m) =>
                  m instanceof NormalModule &&
                  m.userRequest === clientModInfo.resourcePath
              );
              if (!mod) {
                throw new Error(
                  `Cannot find module for path ${clientModInfo.resourcePath}`
                );
              }
            }
          }
        );
      }
    );

    // Rewrite the SSR manifest that RSDW generated to match the real moduleIds
    compiler.hooks.make.tap(RSCServerPlugin.pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: RSCServerPlugin.pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
        },
        () => {
          /** @type {{ [id: string]: { moduleId: string | number, chunkIds: (string | number)[] }} */
          const ssrManifestSpecifierRewrite = {};

          const isGeneratedModule = (m) =>
            m instanceof NormalModule &&
            m.request.startsWith(CLIENT_COMPONENT_FOR_SSR_LOADER);

          compilation.chunkGroups.forEach((chunkGroup) => {
            const chunkIds = chunkGroup.chunks
              .map((c) => c.id)
              .filter((id) => id !== null);

            chunkGroup.chunks.forEach(function (chunk) {
              const chunkModules =
                compilation.chunkGraph.getChunkModulesIterable(chunk);

              Array.from(chunkModules).forEach(function (mod) {
                if (!isGeneratedModule(mod)) return;
                const moduleId = compilation.chunkGraph.getModuleId(mod);
                if (!(mod instanceof NormalModule)) {
                  throw new Error(
                    `Expected generated module ${moduleId} to be a NormalModule`
                  );
                }
                // Assumption: RSDW uses file:// ids to identify SSR modules
                const currentIdInSSRManifest = pathToFileURL(mod.resource).href;
                ssrManifestSpecifierRewrite[currentIdInSSRManifest] = {
                  moduleId,
                  chunkIds,
                };
              });
            });
          });

          /** @type {SSRManifestActual} */
          const finalSSRManifest = {};
          for (const [clientModuleId, moduleExportMap] of Object.entries(
            this.options.ssrManifestFromClient
          )) {
            for (const [exportName, exportInfo] of Object.entries(
              moduleExportMap
            )) {
              if (exportInfo.specifier in ssrManifestSpecifierRewrite) {
                const rewriteInfo =
                  ssrManifestSpecifierRewrite[exportInfo.specifier];
                const newExportInfo = {
                  name: exportName,
                  id: rewriteInfo.moduleId,
                  chunks: rewriteInfo.chunkIds, // TODO: these are server-side chunks, is this right...?
                  async: false, // TODO
                };
                finalSSRManifest[clientModuleId] ||= {};
                finalSSRManifest[clientModuleId][exportName] = newExportInfo;
              }
            }
          }
          console.log(ssrManifestSpecifierRewrite);
          console.log(finalSSRManifest);
          const ssrOutput = JSON.stringify(finalSSRManifest, null, 2);
          compilation.emitAsset(
            this.options.ssrManifestFilename,
            new sources.RawSource(ssrOutput, false)
          );
        }
      );
    });

    // compiler.hooks.thisCompilation.tap(
    //   RSCPlugin.pluginName,
    //   (compilation, { normalModuleFactory }) => {
    //     const parserHook = (
    //       /** @type {import('webpack').javascript.JavascriptParser} */ parser
    //     ) => {
    //       parser.hooks.program.tap(RSCPlugin.pluginName, () => {
    //         const module = parser.state.module;
    //         if (module.resource.includes("node_modules")) {
    //           return;
    //         }

    //         // console.log("parser.hooks.program", module);
    //       });
    //     };

    //     normalModuleFactory.hooks.parser
    //       .for("javascript/auto")
    //       .tap("HarmonyModulesPlugin", parserHook);

    //     normalModuleFactory.hooks.parser
    //       .for("javascript/esm")
    //       .tap("HarmonyModulesPlugin", parserHook);

    //     normalModuleFactory.hooks.parser
    //       .for("javascript/dynamic")
    //       .tap("HarmonyModulesPlugin", parserHook);
    //   }
    // );
  }
}

main();
