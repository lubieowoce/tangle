// @ts-check
const path = require("node:path");
const webpack = require("webpack");

const rel = (/** @type {string} */ p) => path.resolve(__dirname, p);

const opts = {
  entry: rel("./src/client.tsx"),
  destDir: rel("./dist/client"),
  moduleDir: rel("./src"),
  nodeModulesDir: rel("./node_modules"),
};

const serverModules = [rel("src/app/server-child.tsx")];

// https://stackoverflow.com/a/6969486

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

const stubModules = (/** @type {string[]} */ modules) => {
  const regexp = new RegExp(modules.map(escapeRegExp).join("|"));
  for (const mod of modules) {
    console.assert(regexp.test(mod), "Regex failed for '%s'", mod);
  }
  return new webpack.NormalModuleReplacementPlugin(
    regexp,
    rel("./src/app/blank.ts")
  );
};

/** @type {import('webpack').Configuration} */
const config = {
  entry: opts.entry,
  mode: "development",
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
  plugins: [stubModules(serverModules)],
  target: ["web", "es6"],
  optimization: {
    usedExports: true,
  },
};

module.exports = config;
