//@ts-check

const { createContext } = require("./loaders/shared-context.cjs");

// not sure why TS doesn't pick this up automatically...
/// <reference types="../types/react-server-dom-webpack" />
const ReactFlightWebpackPlugin = require("react-server-dom-webpack/plugin");
// const ReactFlightWebpackPlugin =
//   /** @type {import("react-server-dom-webpack/plugin").default} */ (
//     /** @type {unknown} */ (require("react-server-dom-webpack/plugin"))
//   );

const path = require("node:path");
const { runWebpack } = require("./run-webpack.cjs");
const {
  Module,
  NormalModule,
  ExternalModule,
  dependencies,
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

  // /** @type {import('react-server-dom-webpack/plugin').Options['clientReferences']} */
  // const clientReferences = [path.join(opts.moduleDir, "app/client-child.tsx")];
  // // const clientReferences = {
  // //   directory: opts.moduleDir,
  // //   include: moduleExtensionsRegex,
  // //   recursive: true,
  // // };

  // /** @type {Configuration} */
  // const clientConfig = {
  //   ...shared,
  //   entry: opts.client.entry,
  //   resolve: {
  //     ...shared.resolve,
  //   },
  //   module: {
  //     ...shared.module,
  //   },
  //   plugins: [
  //     new ReactFlightWebpackPlugin({
  //       isServer: false,
  //       clientManifestFilename: "client-manifest.json",
  //       ssrManifestFilename: "ssr-manifest.json",
  //       clientReferences,
  //       // clientReferences: opts.moduleDir,
  //       // clientReferences: opts.moduleDir + "/*",
  //     }),
  //   ],
  //   target: ["web", "es2020"],
  //   output: {
  //     path: opts.client.destDir,
  //     publicPath: "auto", // we don't know the public path statically
  //     clean: true,
  //   },
  // };
  // console.log("building client...");

  // await runWebpack(clientConfig);

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
              loader: require.resolve(
                path.resolve(__dirname, "loaders/client-component-for-rsc.cjs")
              ),
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
      new RSCPlugin({ ctx }),
    ],
    target: "node16",
    output: {
      path: opts.server.destDir,
      clean: true,
    },
  };
  await runWebpack(serverConfig);
};

/** @typedef {import('webpack').Compiler} Compiler */

/** @typedef {{ ctx: Ctx }} RSCPluginOptions */
class RSCPlugin {
  static pluginName = "RSCPlugin";

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
      RSCPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        compilation.hooks.finishModules.tap(
          RSCPlugin.pluginName,
          (finishedModsIter) => {
            const finishedMods = [...finishedModsIter];
            console.log("compilation > finishModules");
            for (const clientModInfo of this.options.ctx.clientModules) {
              const mod = finishedMods.find(
                (m) =>
                  m instanceof NormalModule &&
                  m.userRequest === clientModInfo.resourcePath
              );
              if (!mod)
                throw new Error(
                  `Cannot find module for path ${clientModInfo.resourcePath}`
                );
              // normalModuleFactory.create(
              //   {
              //     context: compiler.context,
              //     contextInfo: {
              //       compiler: "TODO",
              //       issuer: "TODO",
              //     },
              //     dependencies: [],
              //   },
              //   (err, result) => {
              //     result.
              //   }
              // );
              // mod.addDependency(new dependencies.);
            }
          }
        );
      }
    );
    compiler.hooks.thisCompilation.tap(
      RSCPlugin.pluginName,
      (compilation, { normalModuleFactory }) => {
        const parserHook = (
          /** @type {import('webpack').javascript.JavascriptParser} */ parser
        ) => {
          parser.hooks.program.tap(RSCPlugin.pluginName, () => {
            const module = parser.state.module;
            if (module.resource.includes("node_modules")) {
              return;
            }

            // console.log("parser.hooks.program", module);
          });
        };

        normalModuleFactory.hooks.parser
          .for("javascript/auto")
          .tap("HarmonyModulesPlugin", parserHook);

        normalModuleFactory.hooks.parser
          .for("javascript/esm")
          .tap("HarmonyModulesPlugin", parserHook);

        normalModuleFactory.hooks.parser
          .for("javascript/dynamic")
          .tap("HarmonyModulesPlugin", parserHook);
      }
    );
  }
}

main();
