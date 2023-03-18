//@ts-check

/**
 * @typedef {import('./types.cjs').Ctx} Ctx
 */

const { getContext } = require("./shared-context.cjs");

/**
 * @typedef {{ moduleId: string }} Options
 */

const LOADER_NAME = "client-component-for-ssr";

/**
 * @type {import('webpack').LoaderDefinitionFunction<Options, {}>}
 * */
const load = function (_source) {
  const options = this.getOptions();
  console.log(`${LOADER_NAME} :: loading`, options);

  // reuse the stashed source that `client-components-for-rsc` loaded.
  // that one replaced the file with a proxy, now let's emit the actual module that'll be used for SSR.
  const ctx = getContext();
  const mod = ctx.geClientModuleById(options.moduleId);

  // FIXME!!!!!! this replace is such a hack, we need an actual moduleId
  const importSpecifier =
    // @ts-ignore  lib: es2021
    this.request.replaceAll(this._compiler?.context, ".");

  ctx.addSSRModule(mod.manifestId, {
    importSpecifier,
  });

  // we're doing some weird stuff, so let's make sure that webpack knows
  // that this actually depends on the original file's content for cache/watch.
  this.addDependency(mod.resourcePath);

  return (
    mod.source +
    `console.log("loaded SSR module", ${JSON.stringify(mod.manifestId)});\n`
  );
};

module.exports = load;
