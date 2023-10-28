/** Adapted from the react source */

import type { ReactClientValue } from "react-server/src/ReactFlightServer";
import type {
  ClientManifest,
  ClientReferenceMetadata,
} from "./ReactFlightServerConfigWebpackBundler";
import type { ServerManifest } from "react-client/src/ReactFlightClientConfig";
import type { Busboy } from "busboy";
import type { Writable } from "stream";
import type { ServerContextJSONValue, Thenable } from "shared/ReactTypes";

import { decodeAction } from "react-server/src/ReactFlightActionServer";

export {
  registerServerReference,
  registerClientReference,
  createClientModuleProxy,
} from "./ReactFlightWebpackReferences";

export { ClientManifest, ClientReferenceMetadata, ServerManifest };

export type Options = {
  onError?: (error: unknown) => void;
  context?: Array<[string, ServerContextJSONValue]>;
  identifierPrefix?: string;
};

export type PipeableStream = {
  abort(reason: unknown): void;
  pipe<T extends Writable>(destination: T): T;
};

declare function renderToPipeableStream(
  model: ReactClientValue,
  webpackMap: ClientManifest,
  options?: Options
): PipeableStream;

declare function decodeReplyFromBusboy<T>(
  busboyStream: Busboy,
  webpackMap: ServerManifest
): Thenable<T>;

declare function decodeReply<T>(
  body: string | FormData,
  webpackMap: ServerManifest
): Thenable<T>;

export {
  renderToPipeableStream,
  decodeReplyFromBusboy,
  decodeReply,
  decodeAction,
};
