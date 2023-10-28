/** Adapted from the react source */

import type { ReactClientValue } from "react-server/src/ReactFlightServer";
import type { ServerContextJSONValue, Thenable } from "shared/ReactTypes";
import type {
  ClientManifest,
  ClientReferenceMetadata,
} from "./ReactFlightServerConfigWebpackBundler";
import type { ServerManifest } from "react-client/src/ReactFlightClientConfig";

import { decodeAction } from "react-server/src/ReactFlightActionServer";

export { ClientManifest, ClientReferenceMetadata, ServerManifest };

export {
  registerServerReference,
  registerClientReference,
  createClientModuleProxy,
} from "./ReactFlightWebpackReferences";

export type Options = {
  identifierPrefix?: string;
  signal?: AbortSignal;
  context?: Array<[string, ServerContextJSONValue]>;
  onError?: (error: unknown) => void;
};

declare function renderToReadableStream(
  model: ReactClientValue,
  webpackMap: ClientManifest,
  options?: Options
): ReadableStream;

declare function decodeReply<T>(
  body: string | FormData,
  webpackMap: ServerManifest
): Thenable<T>;

export { renderToReadableStream, decodeReply, decodeAction };
