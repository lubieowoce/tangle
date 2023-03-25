import { LAYERS } from "../shared.js";

import { pathToFileURL } from "node:url";
import path from "node:path";
import { basename, relative } from "node:path";
import { setContext } from "./shared-context";
import { Ctx } from "./types";
import { LoaderDefinitionFunction, NormalModule } from "webpack";
import { LOADER_PATH as SSR_LOADER_PATH } from "./client-component-for-ssr.js";

const LOADER_NAME = "RSC_CLientForServer";

type Options = { ctx: Ctx };

const CREATE_PROXY_MOD_PATH = path.resolve(
  __dirname,
  "../support/client-module-proxy-for-server"
);

export const LOADER_PATH = __filename;

const load: LoaderDefinitionFunction<Options, {}> = createAsyncLoader(
  async function (source) {
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
      const realModuleRequest = `!${SSR_LOADER_PATH}?${loaderOpts}!${relativeWithDot(
        this.context,
        this.resourcePath
      )}`;
      console.log("requesting", realModuleRequest);

      // wait holy shit... this actually runs the code at build time?????
      // maybe we should use loadModule instead...
      const realModExports = await this.importModule(realModuleRequest, {
        layer: LAYERS.ssr,
      });

      const _realMod = await new Promise<NormalModule>((resolve, reject) =>
        this.loadModule(realModuleRequest, (err, _source, _sourcemap, mod) => {
          if (err) return reject(err);
          return resolve(mod);
        })
      );
      console.log("real module", _realMod);
      console.log("real module exports", [
        ...(this._compilation?.moduleGraph?.getExportsInfo(_realMod)
          .orderedExports ?? []),
      ]);

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
        // `// HACK: inject real module into the moduleGraph`,
        // `if (Math.random() < 0) import(/* webpackMode: "eager" */ ${JSON.stringify(
        //   realModuleRequest
        // )});`,
        ``,
        `const proxy = /*@__PURE__*/ createProxy(${JSON.stringify(
          clientModuleInfo.manifestId
        )});`,
      ];
      const proxyExpr = (exportName: string) =>
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
  }
);

type AsyncLoaderDefinitionFunction<O, T> = (
  this: ThisParameterType<LoaderDefinitionFunction<O, T>>,
  ...args: Parameters<LoaderDefinitionFunction<O, T>>
) => Promise<ReturnType<LoaderDefinitionFunction<O, T>>>;

function createAsyncLoader<O, T>(
  fn: AsyncLoaderDefinitionFunction<O, T>
): LoaderDefinitionFunction<O, T> {
  return function (...args) {
    const _this = this;
    const finish = this.async();
    return fn.call(_this, ...args).then(
      (res) => finish(undefined, res),
      (err) => finish(err, undefined)
    );
  };
}

const relativeWithDot = (fromPath: string, toPath: string) => {
  const rel = relative(fromPath, toPath);
  if (basename(rel) === rel) {
    return `./${rel}`;
  }
  return rel;
};

// const generateFilename = (/** @type {string} */ filePath) => {
//   const parts = basename(filePath).split(/\./);
//   const newParts = parts.slice(0, -1);
//   newParts.push("__ssr__", /** @type {string} */ parts.at(-1));
//   return newParts.join(".");
// };

export default load;
