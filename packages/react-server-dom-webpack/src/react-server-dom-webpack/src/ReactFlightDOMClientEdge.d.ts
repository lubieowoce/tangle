/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";

import type { SSRManifest } from "./ReactFlightClientConfigWebpackBundler";

export { SSRManifest };

export function createServerReference<A extends any[], T>(
  id: any,
  callServer: any
): (...args: A) => Promise<T>;

export type Options = {
  moduleMap?: NonNullable<SSRManifest>;
};

declare function createFromReadableStream<T>(
  stream: ReadableStream,
  options?: Options
): Thenable<T>;

declare function createFromFetch<T>(
  promiseForResponse: Promise<Response>,
  options?: Options
): Thenable<T>;

export { createFromFetch, createFromReadableStream };
