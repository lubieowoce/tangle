/** Adapted from the react source */

import type { ReactClientValue } from "react-server/src/ReactFlightServer";

import type {
  ClientReference,
  ServerReference,
} from "./ReactFlightWebpackReferences";
import {
  ImportMetadata,
  ImportManifestEntry,
} from "./shared/ReactFlightImportMetadata";

export type { ClientReference, ServerReference };

export type ClientManifest = {
  [id: string]: ClientReferenceManifestEntry;
};

export type ServerReferenceId = string;

export type ClientReferenceMetadata = ImportMetadata;
export type ClientReferenceManifestEntry = ImportManifestEntry;

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
