export type ClientModuleInfo = {
  resourcePath: string;
  source: string;
  context: string;
  manifestId: string;
};

export type ClientModuleInfoWithId = ClientModuleInfo & { id: string };

export type SSRModuleInfo = { importSpecifier: string };

export type Ctx = {
  addClientModule(mod: ClientModuleInfo): string;
  clientModules: ClientModuleInfoWithId[];
  geClientModuleById(id: string): ClientModuleInfoWithId;

  ssrModules: Record<string, SSRModuleInfo> | undefined;
  addSSRModule(manifestId: string, mod: SSRModuleInfo): void;
  getSSRModuleByManifestId(manifestId: string): SSRModuleInfo | null;
};
