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
} from "./router/client-router";

export {
  useNavigationContext,
  type NavigateOptions,
  type NavigationContextValue,
} from "./router/navigation-context";

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
