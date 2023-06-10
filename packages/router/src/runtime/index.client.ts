"use client";
/// <reference types="react/next" />

// Client APIs

export {
  ClientRouter,
  type ClientRouterProps,
  createEmptyLayoutCache,
  type FetchSubtreeFn,
  type FetchSubtreeArgs,
  Link,
  getPathFromDOMState,
  // internal
  SegmentContext,
} from "./router/client-router";

export {
  useNavigationContext,
  type NavigateOptions,
  type NavigationContextValue,
  // internal
  createStaticRouter,
  GlobalRouterContext,
} from "./router/navigation-context";

export {
  // internal
  SegmentNotFoundBoundary,
} from "./router/not-found/not-found-boundary";

// Shared APIs, reexported here

export {
  notFound,
  isNotFound,
  // internal
  type ParsedPath,
  parsePath,
} from "./index.shared";
