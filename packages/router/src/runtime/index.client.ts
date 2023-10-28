"use client";
/// <reference types="react/experimental" />

// Client APIs

export {
  ClientRouter,
  type ClientRouterProps,
  createEmptyLayoutCache,
  type FetchSubtreeFn,
  type FetchSubtreeArgs,
  Link,
  getPathFromDOMState,
} from "./router/client-router";

export {
  useNavigationContext,
  type NavigateOptions,
  type NavigationContextValue,
} from "./router/navigation-context";

// FIXME: for some reason, removing this export breaks the build...
// without this, `SegmentNotFoundBoundary` somehow ends up in rsc-layer.
// maybe something to do with the order in which webpack visits the modules,
// and that having it up here causes it to be visited early...?
export { SegmentNotFoundBoundary as __internal_SegmentNotFoundBoundary } from "./router/not-found/not-found-boundary";

// SSR-specific APIs

export { StaticRouter } from "./router/static-router";

// Shared APIs, reexported here

export {
  notFound,
  isNotFound,
  // internal
  type ParsedPath,
  parsePath,
} from "./index.shared";
