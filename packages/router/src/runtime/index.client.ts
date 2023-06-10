"use client";
/// <reference types="react/next" />

// export * from "./router/index.client";

export {
  ClientRouter,
  type ClientRouterProps,
  createEmptyLayoutCache,
  type FetchSubtreeFn,
  type FetchSubtreeArgs,
  Link,
  getPathFromDOMState,
  notFound,
  useNavigationContext,
  type NavigateOptions,
  type NavigationContextValue,
  // internal
  type ParsedPath,
  createStaticRouter,
  GlobalRouterContext,
  SegmentContext,
  parsePath,
} from "./router/index.client";
