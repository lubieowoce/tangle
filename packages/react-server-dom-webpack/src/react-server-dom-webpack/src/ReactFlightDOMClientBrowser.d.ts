/** Adapted from the react source */

import type { Thenable } from "shared/ReactTypes";

import type { ReactServerValue } from "react-client/src/ReactFlightReplyClient";

import { createServerReference } from "react-client/src/ReactFlightReplyClient";

export type CallServerCallback = <A extends any[], T>(
  id: string,
  args: A
) => Promise<T>;

export { ReactServerValue };

export type Options = {
  callServer?: CallServerCallback;
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

export {
  createFromFetch,
  createFromReadableStream,
  encodeReply,
  createServerReference,
};
