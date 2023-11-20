/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";
import type { ImportMetadata } from "./shared/ReactFlightImportMetadata";

export type SSRModuleMap = {
  [clientId: string]: {
    [clientExportName: string]: ClientReference<any>;
  };
};

export type ServerManifest = void;

export type ServerReferenceId = string;

export type ClientReferenceMetadata = ImportMetadata;

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export type ClientReference<T> = {
  specifier: string;
  name: string;
  async?: boolean;
};

export function resolveClientReference<T>(
  bundlerConfig: SSRModuleMap,
  metadata: ClientReferenceMetadata
): ClientReference<T>;

export function resolveServerReference<T>(
  bundlerConfig: ServerManifest,
  id: ServerReferenceId
): ClientReference<T>;

export function preloadModule<T>(
  metadata: ClientReference<T>
): null | Thenable<any>;

export function requireModule<T>(metadata: ClientReference<T>): T;
