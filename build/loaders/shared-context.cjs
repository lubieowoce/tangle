//@ts-check

/**
 * @typedef {import('./types.cjs').Ctx} Ctx
 */

/** @type {Ctx | null} */
let globalCtx = null;

const setContext = (/** @type {Ctx}*/ ctx) => {
  globalCtx = ctx;
};

const getContext = () => {
  const ctx = globalCtx;
  if (!ctx) throw new Error("Expected global ctx to be set.");
  return ctx;
};

/** @returns {Ctx} */
const createContext = () => ({
  clientModules: [],
  addClientModule(mod) {
    console.log("saving module", mod);
    const id = this.clientModules.length + "";
    this.clientModules.push({ ...mod, id });
    return id;
  },
  geClientModuleById(id) {
    const mod = this.clientModules.find((m) => m.id === id);
    if (!mod) throw new Error(`No client module with id ${id}`);
    return mod;
  },

  ssrModules: undefined,
  addSSRModule(manifestId, ssrModuleInfo) {
    this.ssrModules ||= {};
    this.ssrModules[manifestId] = ssrModuleInfo;
  },
  getSSRModuleByManifestId(manifestId) {
    if (!this.ssrModules) {
      throw new Error("No SSR modules written yet.");
    }
    return this.ssrModules[manifestId] ?? null;
    // if (!res) {
    //   console.error(`No entry for ${manifestId}\n:`, this.ssrModules);
    //   throw new Error(`No entry for ${manifestId} in ssrModules`);
    // }
  },
});

module.exports = { createContext, setContext, getContext };
