// @ts-check
// const { urlToRequest } = require("loader-utils");
// const { validate } = require("schema-utils");

const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { basename, relative } = require("node:path");
const { setContext } = require("./shared-context.cjs");

const SSR_LOADER = path.resolve(__dirname, "client-component-for-ssr.cjs");

const LOADER_NAME = "RSC_CLientForServer";

/**
 * @typedef {import('./types.cjs').Ctx} Ctx
 */

/**
 * @typedef {{ ctx: Ctx }} Options
 */

const CREATE_PROXY_MOD_PATH = path.resolve(
  __dirname,
  "../support/client-module-proxy-for-server"
);

/**
 * @type {import('webpack').LoaderDefinitionFunction<Options, {}>}
 * */
const load = createAsyncLoader(async function (source) {
  const options = this.getOptions();

  // validate(schema, options, {
  //   name: "Example Loader",
  //   baseDataPath: "options",
  // });

  if (this.resourcePath.includes("/node_modules/")) {
    return source;
  }
  // FIXME: check this properly!
  if (source.startsWith('"use client"')) {
    console.log(`${LOADER_NAME} :: found client module`, this.resourcePath);

    if (!this._compiler) {
      throw new Error(
        `${LOADER_NAME} :: Internal error: missing \`this._compiler\``
      );
    }
    const manifestId = pathToFileURL(this.resourcePath).href;
    // const manifestId = `client://${relative(
    //   this._compiler.context,
    //   this.resourcePath
    // )}`;
    const clientModuleInfo = {
      resourcePath: this.resourcePath,
      manifestId,
      source,
      context: this.context,
    };
    const id = options.ctx.addClientModule(clientModuleInfo);

    setContext(options.ctx);
    // const generatedFilename = generateFilename(this.resourcePath);
    const loaderOpts = JSON.stringify({ moduleId: id });
    // const loaderOpts = `resourcePath=${encodeURIComponent(this.resourcePath)}`;
    // const loaderOpts = JSON.stringify({ resourcePath: this.resourcePath });
    const realModuleRequest = `!${SSR_LOADER}?${loaderOpts}!${relativeWithDot(
      this.context,
      this.resourcePath
    )}`;
    console.log("requesting", realModuleRequest);
    const realModExports = await this.importModule(realModuleRequest);
    console.log(`${LOADER_NAME} :: imported`, realModExports);
    console.log();

    // TODO: steal code from packages/react-server-dom-webpack/src/ReactFlightWebpackNodeLoader.js
    // that seems to handle the export parsing correctly (using Babel, hey, why not).
    // then just call the ctx.addClientModule thing, which should queue the module to later be added into the graph + added to the SSR map
    // (not quite sure how to do that yet)
    // TODO2: something about client boundaries? idk, for now let's just get the basics working
    // TODO3: does this need something like a ExportsInfoDependency?
    const generatedCode = [
      `import { createProxy } from ${JSON.stringify(CREATE_PROXY_MOD_PATH)};`,
      ``,
      `// HACK: inject real module into the moduleGraph`,
      `;(() => import(/* webpackMode: "eager" */ ${JSON.stringify(
        realModuleRequest
      )}))();`,
      ``,
      `const proxy = /*@__PURE__*/ createProxy(${JSON.stringify(
        clientModuleInfo.manifestId
      )});`,
    ];
    const proxyExpr = (/** @type {string} */ exportName) =>
      `(/*@__PURE__*/ proxy[${JSON.stringify(exportName)}])`;

    for (const exportName in realModExports) {
      const expr = proxyExpr(exportName);
      if (exportName === "default") {
        generatedCode.push(`export default ${expr}`);
      } else {
        generatedCode.push(`export const ${exportName} = ${expr}`);
      }
    }
    return generatedCode.join("\n");
  } else {
    console.log(
      `${LOADER_NAME} :: not a client module`,
      this.resourcePath,
      "\n",
      source.split("\n")[0]
    );
  }
  return source;
});

/** @typedef {import('webpack').LoaderDefinitionFunction} LoaderDefinitionFunction */

// /** @typedef {(this: ThisParameterType<LoaderDefinitionFunction>, ...args: Parameters<LoaderDefinitionFunction>) => Promise<ReturnType<LoaderDefinitionFunction>>} AsyncLoaderDefinitionFunction */
/**
 * @template O, T
 * @typedef {import('webpack').LoaderDefinitionFunction<O, T>} AsyncLoaderDefinitionFunction
 * */

/**
 * @template O, T
 * @param {AsyncLoaderDefinitionFunction<O, T>} fn
 * @returns {import('webpack').LoaderDefinitionFunction<O, T>}
 * */
function createAsyncLoader(fn) {
  /** @type {LoaderDefinitionFunction} */
  return function (...args) {
    const _this = this;
    const finish = this.async();
    return fn.call(_this, ...args).then(
      (res) => finish(undefined, res),
      (err) => finish(err, undefined)
    );
  };
}

const relativeWithDot = (fromPath, toPath) => {
  const rel = relative(fromPath, toPath);
  if (basename(rel) === rel) {
    return `./${rel}`;
  }
  return rel;
};

const generateFilename = (/** @type {string} */ filePath) => {
  const parts = basename(filePath).split(/\./);
  const newParts = parts.slice(0, -1);
  newParts.push("__ssr__", /** @type {string} */ (parts.at(-1)));
  return newParts.join(".");
};

module.exports = load;
