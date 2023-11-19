/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";

import type {
  SSRModuleMap,
  ModuleLoading,
} from "react-client/src/ReactFlightClientConfig";

import type { Readable } from "stream";

export { SSRModuleMap };

export type SSRManifest = {
  moduleMap: SSRModuleMap;
  moduleLoading: ModuleLoading;
};

export function createServerReference<A extends any[], T>(
  id: any,
  callServer: any
): (...args: A) => Promise<T>;

export type Options = {
  nonce?: string;
};

declare function createFromNodeStream<T>(
  stream: Readable,
  ssrManifest: SSRManifest,
  options?: Options
): Thenable<T>;

export { createFromNodeStream };
