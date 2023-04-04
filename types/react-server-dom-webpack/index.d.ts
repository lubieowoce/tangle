declare module "react-server-dom-webpack" {
  export {};
}

declare module "react-server-dom-webpack/client.browser" {
  export * from "react-server-dom-webpack/src/ReactFlightDOMClientBrowser";
}

declare module "react-server-dom-webpack/server.node" {
  export * from "react-server-dom-webpack/src/ReactFlightDOMServerNode";
}

declare module "react-server-dom-webpack/server.edge" {
  export * from "react-server-dom-webpack/src/ReactFlightDOMServerEdge";
}

declare module "react-server-dom-webpack/client.browser" {
  export * from "react-server-dom-webpack/src/ReactFlightDOMClientBrowser";
}

declare module "react-server-dom-webpack/client.node" {
  export * from "react-server-dom-webpack/src/ReactFlightDOMClientNode";
}

declare module "react-server-dom-webpack/client.edge" {
  export * from "react-server-dom-webpack/src/ReactFlightDOMClientEdge";
}

//========================
// host & server configs
//=======================

// these modules would normally be subsitituted by some machinery react has. (forks?)
// i'm only using webpack for server & client, so i'll plug it in here.

declare module "react-client/src/ReactFlightClientHostConfig" {
  export * from "react-server-dom-webpack/src/ReactFlightClientWebpackBundlerConfig";
}

declare module "react-server/src/ReactFlightServerConfig" {
  export * from "react-server-dom-webpack/src/ReactFlightServerWebpackBundlerConfig";
}

//==================
// bundler configs
//==================

declare module "react-server-dom-webpack/src/ReactFlightClientNodeBundlerConfig" {
  import type {
    Thenable,
    FulfilledThenable,
    RejectedThenable,
  } from "react__shared/ReactTypes";

  export type SSRManifest = {
    [clientId: string]: {
      [clientExportName: string]: ClientReference<any>;
    };
  };

  export type ServerManifest = void;

  export type ServerReferenceId = string;

  export type ClientReferenceMetadata = {
    id: string;
    chunks: Array<string>;
    name: string;
  };

  // eslint-disable-next-line no-unused-vars
  export type ClientReference<T> = {
    specifier: string;
    name: string;
  };
}

declare module "react-server-dom-webpack/src/ReactFlightClientWebpackBundlerConfig" {
  export type SSRManifest = null | {
    [clientId: string]: {
      [clientExportName: string]: ClientReferenceMetadata;
    };
  };

  export type ServerManifest = {
    [id: string]: ClientReference<any>;
  };

  export type ServerReferenceId = string;

  export type ClientReferenceMetadata = {
    id: string;
    chunks: Array<string>;
    name: string;
    async: boolean;
  };

  // eslint-disable-next-line no-unused-vars
  export type ClientReference<T> = ClientReferenceMetadata;
}

declare module "react-server-dom-webpack/src/ReactFlightServerWebpackBundlerConfig" {
  export type ClientManifest = {
    [id: string]: ClientReferenceMetadata;
  };

  export type ServerReference<T extends (...args: any[]) => any> = T & {
    $$typeof: symbol;
    $$id: string;
    $$bound: null | Array<ReactClientValue>;
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

  export type ClientReferenceKey = string;
}

//================
// server
//================

declare module "react-server-dom-webpack/src/ReactFlightDOMServerNode" {
  import type { Writable, PassThrough } from "node:stream";
  import type { ReactElement } from "react";
  import type { ReactClientValue } from "react-server/src/ReactFlightServer";
  import type { ServerContextJSONValue } from "react__shared/ReactTypes";
  import type { ClientManifest } from "react-server-dom-webpack/src/ReactFlightServerWebpackBundlerConfig";

  export { ClientManifest }; // reexport for convenience

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

  export function renderToPipeableStream(
    model: ReactClientValue,
    webpackMap: ClientManifest,
    options?: Options
  ): PipeableStream;
}

declare module "react-server-dom-webpack/src/ReactFlightDOMServerEdge" {
  import type { ReadableStream } from "node:stream/web";
  import type { ReactElement } from "react";
  import type { ServerContextJSONValue } from "react__shared/ReactTypes";
  import type { ClientManifest } from "react-server-dom-webpack/src/ReactFlightServerWebpackBundlerConfig";
  import type { ServerManifest } from "react-client/src/ReactFlightClientHostConfig";

  export { ClientManifest }; // reexport for convenience

  export type Options = {
    identifierPrefix?: string;
    signal?: AbortSignal;
    context?: Array<[string, ServerContextJSONValue]>;
    onError?: (error: unknown) => void;
  };

  export function renderToReadableStream(
    model: ReactClientValue,
    webpackMap: ClientManifest,
    options?: Options
  ): ReadableStream;

  export function decodeReply<T>(
    body: string | FormData,
    webpackMap: ServerManifest
  ): Thenable<T>;
}

//================
// client
//================

declare module "react-server-dom-webpack/src/ReactFlightDOMClientBrowser" {
  import type { Thenable } from "react__shared/ReactTypes";

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

declare module "react-server-dom-webpack/src/ReactFlightDOMClientNode" {
  import type { Thenable } from "react__shared/ReactTypes";
  import type { Readable } from "node:stream";
  import type { SSRManifest } from "react-client/src/ReactFlightClientHostConfig";

  export { SSRManifest }; // reexport for convenience

  export function createFromNodeStream<T>(
    stream: Readable,
    moduleMap: NonNullable<SSRManifest>
  ): Thenable<T>;
}

declare module "react-server-dom-webpack/src/ReactFlightDOMClientEdge" {
  import type { Thenable } from "react__shared/ReactTypes";
  import type { ReadableStream } from "node:stream/web";
  import type { SSRManifest } from "react-client/src/ReactFlightClientHostConfig";

  export { SSRManifest }; // reexport for convenience

  export type Options = {
    moduleMap?: SSRManifest;
  };

  export function createFromReadableStream<T>(
    stream: ReadableStream,
    options?: Options
  ): Thenable<T>;

  export function createFromFetch<T>(
    promiseForResponse: Promise<Response>,
    options?: Options
  ): Thenable<T>;
}

//================
// core
//================

declare module "react-server/src/ReactFlightServer" {
  // no idea where the `React$NAME` types come from in react's flow types, but i can just import them from regular react here
  import type {
    ElementType as React$Element,
    ComponentType as React$AbstractComponent, // hmmm... maybe this is close enough?
  } from "react";
  import type { ReactServerContext } from "react__shared/ReactTypes";

  import type {
    // Destination,
    // Chunk,
    ClientManifest,
    ClientReferenceMetadata,
    ClientReference,
    ClientReferenceKey,
    ServerReference,
    ServerReferenceId,
  } from "react-server/src/ReactFlightServerConfig";

  import type { LazyComponent } from "react/src/ReactLazy";

  type React$Element<T> = React.ElementType<T>;

  type ReactJSONValue =
    | string
    | boolean
    | number
    | null
    | readonly ReactJSONValue[]
    | ReactClientObject;

  type ReactClientObject = { [key: string]: ReactClientValue };

  // FIXME: Typescript doesn't seem to like recursive types, so this comes out as `any`...

  // Serializable values
  export type ReactClientValue =
    // Server Elements and Lazy Components are unwrapped on the Server
    | React$Element<React$AbstractComponent<any, any>>
    | LazyComponent<ReactClientValue, any>
    // References are passed by their value
    | ClientReference<any>
    | ServerReference<any>
    // The rest are passed as is. Sub-types can be passed in but lose their
    // subtype, so the receiver can only accept once of these.
    | React$Element<string>
    | React$Element<ClientReference<any> & any>
    | ReactServerContext<any>
    | string
    | boolean
    | number
    | symbol
    | null
    | void
    | Iterable<ReactClientValue>
    | Array<ReactClientValue>
    | ReactClientObject
    | Promise<ReactClientValue>; // Thenable<ReactClientValue>
}

//================
// shared
//================

declare module "react/src/ReactLazy" {
  // https://github.com/facebook/react/blob/main/packages/react/src/ReactLazy.js
  export type LazyComponent<T, P> = {
    $$typeof: symbol | number;
    _payload: P;
    _init: (payload: P) => T;
  };
}

declare module "react__shared/ReactTypes" {
  import type { Context as ReactContext } from "react";

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

  export type ReactServerContext<T = any> = ReactContext<T>;
}

//================
// misc
//================

// i dont't feel like mapping out the ones below in detail, so i'll just delare the top-level ones

declare module "react-server-dom-webpack/node-register" {
  export default function register(): void;
}

declare module "react-server-dom-webpack/plugin" {
  import type { Compiler } from "webpack";
  export type ClientReferenceSearchPath = {
    directory: string;
    recursive?: boolean;
    include: RegExp;
    exclude?: RegExp;
  };

  export type ClientReferencePath = string | ClientReferenceSearchPath;

  export type Options = {
    isServer: boolean;
    clientReferences?: ClientReferencePath | readonly ClientReferencePath[];
    chunkName?: string;
    clientManifestFilename?: string;
    ssrManifestFilename?: string;
  };

  class ReactFlightWebpackPlugin {
    // export default class ReactFlightWebpackPlugin {
    constructor(options: Options);
    apply(compiler: Compiler): void;
  }

  export = ReactFlightWebpackPlugin;
}

declare module "react-server-dom-webpack/node-loader" {
  type ResolveContext = {
    conditions: Array<string>;
    parentURL: string | void;
  };

  type ResolveFunction = (
    string,
    ResolveContext,
    ResolveFunction
  ) => { url: string } | Promise<{ url: string }>;

  type GetSourceContext = {
    format: string;
  };

  type GetSourceFunction = (
    string,
    GetSourceContext,
    GetSourceFunction
  ) => Promise<{ source: Source }>;

  type TransformSourceContext = {
    format: string;
    url: string;
  };

  type TransformSourceFunction = (
    Source,
    TransformSourceContext,
    TransformSourceFunction
  ) => Promise<{ source: Source }>;

  type LoadContext = {
    conditions: Array<string>;
    format: string | null | void;
    importAssertions: Object;
  };

  type LoadFunction = (
    string,
    LoadContext,
    LoadFunction
  ) => Promise<{ format: string; shortCircuit?: boolean; source: Source }>;

  export async function load(
    url: string,
    context: LoadContext,
    defaultLoad: LoadFunction
  ): Promise<{ format: string; shortCircuit?: boolean; source: Source }>;

  export async function transformSource(
    source: Source,
    context: TransformSourceContext,
    defaultTransformSource: TransformSourceFunction
  ): Promise<{ source: Source }>;

  export async function getSource(
    url: string,
    context: GetSourceContext,
    defaultGetSource: GetSourceFunction
  ): Promise<{ source: Source }>;

  export async function resolve(
    specifier: string,
    context: ResolveContext,
    defaultResolve: ResolveFunction
  ): Promise<{ url: string }>;
}
