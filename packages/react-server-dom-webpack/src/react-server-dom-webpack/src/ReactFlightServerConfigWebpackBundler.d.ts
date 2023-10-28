/** Adapted from the react source */

import type { ReactClientValue } from "react-server/src/ReactFlightServer";

import type {
  ClientReference,
  ServerReference,
} from "./ReactFlightWebpackReferences";

export type { ClientReference, ServerReference };

export type ClientManifest = {
  [id: string]: ClientReferenceMetadata;
};

export type ServerReferenceId = string;

export type ClientReferenceMetadata = {
  id: string;
  chunks: Array<string>;
  name: string;
  async: boolean;
};

export type ClientReferenceKey = string;

export {
  isClientReference,
  isServerReference,
} from "./ReactFlightWebpackReferences";

export function getClientReferenceKey(
  reference: ClientReference<any>
): ClientReferenceKey;

export function resolveClientReferenceMetadata<T>(
  config: ClientManifest,
  clientReference: ClientReference<T>
): ClientReferenceMetadata;

export function getServerReferenceId<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>
): ServerReferenceId;

export function getServerReferenceBoundArguments<T>(
  config: ClientManifest,
  serverReference: ServerReference<T>
): null | Array<ReactClientValue>;
