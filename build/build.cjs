//@ts-check

// not sure why TS doesn't pick this up automatically...
/// <reference types="../types/react-server-dom-webpack" />
const ReactFlightWebpackPlugin = require("react-server-dom-webpack/plugin");
// const ReactFlightWebpackPlugin =
//   /** @type {import("react-server-dom-webpack/plugin").default} */ (
//     /** @type {unknown} */ (require("react-server-dom-webpack/plugin"))
//   );

const path = require("node:path");
const { runWebpack } = require("./run-webpack.cjs");

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
        ssrManifestFilename: "ssr-manifest.json",
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

  // WON'T WORK, server compiler isn't implemented yet
  // console.log("building server...");
  // /** @type {Configuration} */
  // const serverConfig = {
  //   ...shared,
  //   entry: opts.server.entry,
  //   resolve: {
  //     ...shared.resolve,
  //   },
  //   module: {
  //     ...shared.module,
  //   },
  //   plugins: [
  //     new ReactFlightWebpackPlugin({
  //       isServer: true,
  //       clientManifestFilename: "SERVER__client-manifest.json",
  //       ssrManifestFilename: "SERVER__ssr-manifest.json",
  //       clientReferences,
  //       // clientReferences: opts.moduleDir + "/*",
  //     }),
  //   ],
  //   target: "node16",
  //   output: {
  //     path: opts.server.destDir,
  //     clean: true,
  //   },
  // };
  // await runWebpack(serverConfig);
};

main();
