// @ts-check
const path = require("node:path");

const rel = (/** @type {string} */ p) => path.resolve(__dirname, p);

const opts = {
  entry: rel("./src/client.tsx"),
  destDir: rel("./dist/client"),
  moduleDir: rel("./src"),
  nodeModulesDir: rel("./node_modules"),
};

/** @type {import('webpack').Configuration} */
const config = {
  mode: "development",
  entry: opts.entry,
  devtool: "source-map",
  output: {
    path: opts.destDir,
    filename: "[name].js",
    // filename: "[name].[contenthash].js",
    publicPath: "auto", // we don't know the public path statically
    clean: true,
  },
  resolve: {
    modules: [opts.moduleDir, opts.nodeModulesDir],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {},
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
  plugins: [],
  target: ["web", "es6"],
  optimization: {
    usedExports: true,
  },
};

module.exports = config;
