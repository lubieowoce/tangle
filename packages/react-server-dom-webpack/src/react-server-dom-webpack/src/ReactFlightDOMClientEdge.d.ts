/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";

import type { ReactServerValue } from "react-client/src/ReactFlightReplyClient";

import type {
  SSRModuleMap,
  ModuleLoading,
} from "react-client/src/ReactFlightClientConfig";

export type SSRManifest = {
  moduleMap: SSRModuleMap;
  moduleLoading: ModuleLoading;
};

export { SSRModuleMap };

export function createServerReference<A extends any[], T>(
  id: any,
  callServer: any
): (...args: A) => Promise<T>;

export type Options = {
  ssrManifest?: SSRManifest;
  nonce?: string;
};

declare function createFromReadableStream<T>(
  stream: ReadableStream,
  options?: Options
): Thenable<T>;

declare function createFromFetch<T>(
  promiseForResponse: Promise<Response>,
  options?: Options
): Thenable<T>;

declare function encodeReply(
  value: ReactServerValue
): Promise<string | URLSearchParams | FormData>;

export { createFromFetch, createFromReadableStream, encodeReply };
