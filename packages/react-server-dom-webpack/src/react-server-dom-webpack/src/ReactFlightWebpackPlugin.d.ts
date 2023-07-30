/** Adapted from the react source */

type ClientReferenceSearchPath = {
  directory: string;
  recursive?: boolean;
  include: RegExp;
  exclude?: RegExp;
};

type ClientReferencePath = string | ClientReferenceSearchPath;

export type Options = {
  isServer: boolean;
  clientReferences?: ClientReferencePath | ClientReferencePath[];
  chunkName?: string;
  clientManifestFilename?: string;
  ssrManifestFilename?: string;
};

export default class ReactFlightWebpackPlugin {
  clientReferences: ClientReferencePath[];
  chunkName: string;
  clientManifestFilename: string;
  ssrManifestFilename: string;

  constructor(options: Options);

  apply(compiler: any): void;
}
