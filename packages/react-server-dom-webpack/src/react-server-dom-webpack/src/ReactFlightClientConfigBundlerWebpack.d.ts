/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";
import type {
  ImportManifestEntry,
  ImportMetadata,
} from "./shared/ReactFlightImportMetadata";

export type SSRModuleMap = null | {
  [clientId: string]: {
    [clientExportName: string]: ClientReferenceManifestEntry;
  };
};

export type ServerManifest = {
  [id: string]: ImportManifestEntry;
};

export type ServerReferenceId = string;

export type ClientReferenceManifestEntry = ImportManifestEntry;
export type ClientReferenceMetadata = ImportMetadata;

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export type ClientReference<T> = ClientReferenceMetadata;

export function resolveClientReference<T>(
  bundlerConfig: SSRModuleMap,
  metadata: ClientReferenceMetadata
): ClientReference<T>;

export function resolveServerReference<T>(
  bundlerConfig: ServerManifest,
  id: ServerReferenceId
): ClientReference<T>;

// Start preloading the modules since we might need them soon.
// This function doesn't suspend.
export function preloadModule<T>(
  metadata: ClientReference<T>
): null | Thenable<any>;

// Actually require the module or suspend if it's not yet ready.
// Increase priority if necessary.
export function requireModule<T>(metadata: ClientReference<T>): T;
