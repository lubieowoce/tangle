/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";

import type { SSRManifest } from "react-client/src/ReactFlightClientConfig";

import type { Readable } from "stream";

export { SSRManifest };

export function createServerReference<A extends any[], T>(
  id: any,
  callServer: any
): (...args: A) => Promise<T>;

declare function createFromNodeStream<T>(
  stream: Readable,
  moduleMap: NonNullable<SSRManifest>
): Thenable<T>;

export { createFromNodeStream };
