/**
 *
 * @typedef {{ resourcePath: string, source: string; context: string; manifestId: string }} ClientModuleInfo
 * @typedef {ClientModuleInfo & { id: string }} ClientModuleInfoWithId
 * @typedef {{ importSpecifier: string }} SSRModuleInfo
 *
 * @typedef {{
 *  addClientModule(mod: ClientModuleInfo): string;
 *  clientModules: ClientModuleInfoWithId[];
 *  geClientModuleById(id: string): ClientModuleInfoWithId;
 *
 *  ssrModules: Record<string, SSRModuleInfo> | undefined;
 *  addSSRModule(manifestId: string, mod: SSRModuleInfo): void;
 *  getSSRModuleByManifestId(manifestId: string): SSRModuleInfo | null;
 * }} Ctx
 */
