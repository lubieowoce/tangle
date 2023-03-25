/// <reference types="../types/react-server-dom-webpack" />

import { LAYERS } from "./shared.js";

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

import { createContext } from "./loaders/shared-context.js";

// not sure why TS doesn't pick this up automatically...
import ReactFlightWebpackPlugin, {
  Options as ReactFlightWebpackPluginOptions,
} from "react-server-dom-webpack/plugin";

import { runWebpack } from "./run-webpack.js";
import {
  Module,
  NormalModule,
  ExternalModule,
  dependencies,
  Compilation,
  sources,
  Configuration,
  Compiler,
} from "webpack";
import { Ctx } from "./loaders/types.js";
import { LOADER_PATH as CLIENT_COMPONENT_FOR_RSC_LOADER } from "./loaders/client-component-for-rsc.js";
import { LOADER_PATH as CLIENT_COMPONENT_FOR_SSR_LOADER } from "./loaders/client-component-for-ssr.js";
const { ModuleDependency } = dependencies;

const rel = (p: string) => path.resolve(__dirname, p);

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

const main = async () => {
  const moduleExtensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
  const moduleExtensionsRegex = /(ts|tsx|.js|jsx|json)$/;

  const shared: Configuration = {
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

  const clientReferences: ReactFlightWebpackPluginOptions["clientReferences"] =
    [path.join(opts.moduleDir, "app/client-child.tsx")];
  // const clientReferences = {
  //   directory: opts.moduleDir,
  //   include: moduleExtensionsRegex,
  //   recursive: true,
  // };

  const clientConfig: Configuration = {
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

  const ssrManifestFromRSDW: SSRManifest = JSON.parse(
    readFileSync(ssrManifestPath, "utf-8")
  );

  const ctx = createContext();

  const tsLoader = {
    loader: "ts-loader",
    options: {
      transpileOnly: true,
    },
  };

  console.log("building server...");
  const serverConfig: Configuration = {
    ...shared,
    entry: { main: opts.server.entry /* , layer: LAYERS.default */ },
    resolve: {
      ...shared.resolve,
    },
    module: {
      ...shared.module,
      rules: [
        {
          test: /\.(t|j)sx?$/,
          // only transform client components to proxies if we're in the default layer.
          // if we're in `LAYERS.ssr`, we don't want that.
          issuerLayer: (layer) => {
            return (
              !layer || // no layer assigned = default, or entrypoint i guess?
              layer === LAYERS.default
            );
          },
          exclude: /node_modules/,
          use: [
            {
              // runs last
              loader: CLIENT_COMPONENT_FOR_RSC_LOADER,
              options: {
                ctx,
              },
            },
            tsLoader,
          ],
        },
        {
          test: /\.(t|j)sx?$/,
          // if we're in `LAYERS.ssr`, don't do anything special.
          issuerLayer: LAYERS.ssr,
          exclude: /node_modules/,
          use: [tsLoader],
        },
        {
          test: /server-ssr-layer.tsx$/,
          // if we're in `LAYERS.ssr`, don't do anything special.
          layer: LAYERS.ssr,
          use: [tsLoader],
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
    experiments: { layers: true },
    output: {
      path: opts.server.destDir,
      clean: true,
    },
  };
  await runWebpack(serverConfig);
};

type SSRManifest = {
  [id: string]: {
    [exportName: string]: { specifier: string | number; name: string };
  };
};

type SSRManifestActual = {
  [id: string]: {
    [exportName: string]: {
      id: string | number;
      name: string;
      chunks: (string | number)[];
      async: boolean;
    };
  };
};

type RSCPluginOptions = {
  ctx: Ctx;
  ssrManifestFromClient: SSRManifest;
  ssrManifestFilename: string;
};

class RSCServerPlugin {
  static pluginName = "RSCServerPlugin";

  constructor(public options: RSCPluginOptions) {}

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(
      RSCServerPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        compilation.hooks.finishModules.tap(
          RSCServerPlugin.pluginName,
          (finishedModsIter) => {
            const finishedMods = [...finishedModsIter];
            console.log("compilation > finishModules");
            for (const mod of finishedMods) {
              if (
                mod instanceof NormalModule &&
                mod.request &&
                mod.request.includes(compiler.context + "/src/")
              ) {
                console.log("==============================");
                console.log(mod.request);
                console.log("layer:", mod.layer);
                console.log(mod["_source"]._value);
                console.log("==============================");
              }
            }
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
          type Rewrites = {
            [id: string]: {
              moduleId: string | number;
              chunkIds: (string | number)[];
            };
          };
          const ssrManifestSpecifierRewrite: Rewrites = {};

          const isGeneratedModule = (m: Module) =>
            m instanceof NormalModule &&
            m.request.startsWith(CLIENT_COMPONENT_FOR_SSR_LOADER);
          compilation.chunkGroups.forEach((chunkGroup) => {
            const chunkIds = chunkGroup.chunks
              .map((c) => c.id)
              .filter((id) => id !== null) as (string | number)[];

            chunkGroup.chunks.forEach(function (chunk) {
              const chunkModules =
                compilation.chunkGraph.getChunkModulesIterable(chunk);

              Array.from(chunkModules).forEach((mod) => {
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

          const finalSSRManifest: SSRManifestActual = {};
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
          console.log("manifest rewrites", ssrManifestSpecifierRewrite);
          console.log("final ssr manifest", finalSSRManifest);
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
