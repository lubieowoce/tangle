declare module "react-server-dom-webpack" {
  export {};
}

declare module "react-server-dom-webpack/server.node" {
  import type { Writable } from "node:stream";
  import type { ReactElement } from "react";
  import type { ServerContextJSONValue } from "react-shared-types";

  // https://github.com/facebook/react/blob/main/packages/react-server-dom-webpack/src/ReactFlightDOMServerNode.js

  export type Options = {
    onError?: (error: unknown) => void;
    context?: Array<[string, ServerContextJSONValue]>;
    identifierPrefix?: string;
  };

  type PipeableStream = {
    abort(reason: unknown): void;
    pipe<T extends Writable>(destination: T): T;
  };

  // export declare function renderToPipeableStream(
  export function renderToPipeableStream(
    model: ReactModel,
    webpackMap: BundlerConfig,
    options?: Options
  ): PipeableStream;

  // https://github.com/facebook/react/blob/main/packages/react-server/src/ReactFlightServer.js

  export type ReactModel =
    | ReactElement<any> // | React$Element<any>
    | LazyComponent<any, any>
    | string
    | boolean
    | number
    | symbol
    | null
    | Iterable<ReactModel>
    | ReactModelObject
    | Promise<ReactModel>;

  export type ReactModelObject = { [key: string]: ReactModel };

  // https://github.com/facebook/react/blob/main/packages/react-server-dom-webpack/src/ReactFlightServerWebpackBundlerConfig.js

  type WebpackMap = {
    [id: string]: ClientReferenceMetadata;
  };

  export type BundlerConfig = WebpackMap;

  export type ServerReference<T extends (...args: any[]) => any> = T & {
    $$typeof: symbol;
    $$id: string;
    $$bound: Array<ReactModel>;
  };

  export type ServerReferenceId = string;

  // eslint-disable-next-line no-unused-vars
  export type ClientReference<T> = {
    $$typeof: symbol;
    $$id: string;
    $$async: boolean;
  };

  export type ClientReferenceMetadata = {
    id: string;
    chunks: Array<string>;
    name: string;
    async: boolean;
  };

  // https://github.com/facebook/react/blob/main/packages/react/src/ReactLazy.js

  export type LazyComponent<T, P> = {
    $$typeof: symbol | number;
    _payload: P;
    _init: (payload: P) => T;
  };
}

declare module "react-shared-types" {
  // https://github.com/facebook/react/blob/main/packages/shared/ReactTypes.js

  // The subset of a Thenable required by things thrown by Suspense.
  // This doesn't require a value to be passed to either handler.
  export interface Wakeable {
    then(onFulfill: () => unknown, onReject: () => unknown): void | Wakeable;
  }

  // The subset of a Promise that React APIs rely on. This resolves a value.
  // This doesn't require a return value neither from the handler nor the
  // then function.
  interface ThenableImpl<T> {
    then(
      onFulfill: (value: T) => unknown,
      onReject: (error: unknown) => unknown
    ): void | Wakeable;
  }
  interface UntrackedThenable<T> extends ThenableImpl<T> {
    status?: void;
  }

  export interface PendingThenable<T> extends ThenableImpl<T> {
    status: "pending";
  }

  export interface FulfilledThenable<T> extends ThenableImpl<T> {
    status: "fulfilled";
    value: T;
  }

  export interface RejectedThenable<T> extends ThenableImpl<T> {
    status: "rejected";
    reason: unknown;
  }

  export type Thenable<T> =
    | UntrackedThenable<T>
    | PendingThenable<T>
    | FulfilledThenable<T>
    | RejectedThenable<T>;

  export type ServerContextJSONValue =
    | string
    | boolean
    | number
    | null
    | readonly ServerContextJSONValue[]
    | { [key: string]: ServerContextJSONValue };
}

declare module "react-server-dom-webpack/client.browser" {
  import type { Thenable } from "react-shared-types";

  // https://github.com/facebook/react/blob/main/packages/react-server-dom-webpack/src/ReactFlightDOMClientBrowser.js

  type CallServerCallback = <A, T>(id: string, args: A) => Promise<T>;

  export type Options = {
    callServer?: CallServerCallback;
  };

  export function createFromFetch<T>(
    promiseForResponse: Promise<Response>,
    options?: Options
  ): Thenable<T>;

  export function createFromReadableStream<T>(
    stream: ReadableStream,
    options?: Options
  ): Thenable<T>;

  export function createFromXHR<T>(
    request: XMLHttpRequest,
    options?: Options
  ): Thenable<T>;
}

declare module "react-server-dom-webpack/node-register" {
  export default function register(): void;
}
