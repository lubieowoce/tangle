"use client";

import {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
  createContext,
  useContext,
  Thenable,
  ReactElement,
  useCallback,
} from "react";

import {
  NavigateOptions,
  GlobalRouterContext,
  NavigationContextValue,
  useNavigationContext,
  GlobalRouterContextValue,
} from "./navigation-context";

import { ParsedPath, parsePath, takeSegment } from "./paths";
import { Use } from "../support/use";
import { __DEV__ } from "../support/is-dev";
import { SegmentErrorBoundary } from "./error-boundary";

export function Link({
  href,
  children,
  ...opts
}: PropsWithChildren<{ href: string } & NavigateOptions>) {
  const { navigate } = useNavigationContext();
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(href, opts);
      }}
    >
      {children}
    </a>
  );
}

export const getPathFromDOMState = () => {
  // TODO: searchparams etc?
  return document.location.pathname;
};

type RouterState = {
  rawPath: string;
  state: ParsedPath;
  cache: LayoutCacheNode;
  refetchKey: number;
};

const createRouterState = (
  rawPath: string,
  cache?: LayoutCacheNode
): RouterState => {
  return {
    rawPath,
    state: parsePath(rawPath),
    cache: cache ?? createEmptyLayoutCache(),
    refetchKey: 0,
  };
};

const changeRouterPath = (
  router: RouterState,
  rawPath: string
): RouterState => {
  return {
    ...router,
    rawPath,
    state: parsePath(rawPath),
  };
};

const useDebugCacheReal = (cache: LayoutCacheNode) => {
  useEffect(() => {
    const prop = "LAYOUT_CACHE";
    (window as any)[prop] = cache;
    Object.defineProperties(window, {
      [prop]: { value: cache, configurable: true },
      [prop + "_S"]: {
        get() {
          return debugCache(cache);
        },
        configurable: true,
      },
    });
    return () => {
      delete (window as any)[prop];
      delete (window as any)[prop + "_S"];
    };
  }, [cache]);
};

const useDebugCache = !__DEV__
  ? (_cache: LayoutCacheNode) => {}
  : useDebugCacheReal;

export type ClientRouterProps = {
  initialCache: LayoutCacheNode;
  initialPath: string;
  globalErrorFallback?: ReactNode;
  globalErrorIncludeDocument?: boolean;
  fetchSubtree: FetchSubtreeFn;
};

export const ClientRouter = ({
  initialCache,
  initialPath,
  globalErrorFallback,
  globalErrorIncludeDocument,
  fetchSubtree,
  children,
}: PropsWithChildren<ClientRouterProps>) => {
  const [routerState, setRouterState] = useState<RouterState>(() =>
    createRouterState(initialPath, initialCache)
  );
  console.log("=".repeat(40));
  console.log("ClientRouter", routerState);
  const [isNavigating, startTransition] = useTransition();

  useDebugCache(routerState.cache);

  const changeRouterStateByPath = useCallback(
    (newPath: string) => {
      const newRouterState = changeRouterPath(routerState, newPath);
      const { cache, state: newState } = newRouterState;

      const pathExistsInCache = hasCachePath(cache, newState);
      if (pathExistsInCache) {
        setRouterState(newRouterState);
        return;
      }

      console.log("cache before create", debugCache(cache));

      const [cacheNode, existingSegments, didCreate] =
        createShallowestCacheNodeForPath(cache, newState);
      console.log("created node", { existingSegments });
      console.log("cache after create", debugCache(cache));

      const cacheInstallPath = [
        ...existingSegments,
        newState[existingSegments.length],
      ];

      if (!didCreate) {
        // we should never modify an existing node, that might impact concurrent renders
        throw new Error(
          "Internal error during navigation -- node already existed in the cache: " +
            JSON.stringify(cacheInstallPath)
        );
      }

      console.log("requesting RSC from server", {
        state: newRouterState.state,
        newPath,
        cacheInstallPath,
        cacheNode,
        existingSegments,
      });
      fetchSubtreeIntoNode(
        cacheNode,
        {
          path: newPath,
          existingState: existingSegments,
        },
        fetchSubtree
      );

      setRouterState(newRouterState);
    },
    [routerState, fetchSubtree]
  );

  const changeRouterStateForRefetch = useCallback(() => {
    // blow away the existing cache.
    // TODO: not sure if we should try to copy anything over.
    // i think it makes sense to invalidate everything under this layout,
    // and until we support layout groups, that's literally everything we've got,
    // so no point in copying anything.
    //
    // an "interesting" consequence of blowing away the whole cache is that
    // we lose the root layout and thus any error boundaries set up by the user.
    // meaning that, if the refetch fails, there's no one left to catch the error
    // apart from the root `GlobalErrorBoundary`.
    // (repro: go to `/foo`, block `/foo` in the network tab, call `refresh()`).
    //
    // TODO: should we just restore the previous state if the refresh() fails?
    // but then we'd need to expose some kind of way of reacting to that error...
    // or should we make sure that the root `error` is somehow always available? idk
    const newRouterState: RouterState = {
      ...routerState,
      refetchKey: routerState.refetchKey + 1,
      cache: createEmptyLayoutCacheWithRoot(),
    };
    console.log("refetch :: newRouterState", newRouterState);

    const cacheNode = getRootNode(newRouterState.cache);
    fetchSubtreeIntoNode(
      cacheNode,
      {
        path: newRouterState.rawPath,
        existingState: [],
      },
      fetchSubtree
    );

    setRouterState(newRouterState);
  }, [routerState, fetchSubtree]);

  const onPopState = useCallback(
    (restoredPath: string, event: PopStateEvent) => {
      console.log("popstate", restoredPath, event);
      // if a user did something like this
      // /a -> /b -> refresh (/b) -> back (/a)
      // then we may not have the restored path in the cache, so we can't just setState.
      // go through the usual flow of fetching if it's missing.
      changeRouterStateByPath(restoredPath);
      // do we need a transition here?
      // startTransition(() => changeStateByPath(restoredPath));
    },
    [changeRouterStateByPath]
  );

  useEffect(() => {
    const listener = (event: PopStateEvent) => {
      const restoredPath = getPathFromDOMState();
      onPopState(restoredPath, event);
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, [onPopState]);

  const navigation = useMemo<NavigationContextValue>(
    () => ({
      // NOTE: the refetchKey is mostly useful for error boundaries, which check this key
      // to know if they should clear. bumping the refetchKey makes the state appears different,
      // which'll clear any error boundaries that happened on the same path.
      key: `[${routerState.refetchKey}] ${routerState.rawPath}`,
      isNavigating,
      navigate(newPath, { type = "push" }: NavigateOptions = {}) {
        startTransition(() => {
          // TODO: do we wanna use the state for something?
          if (type === "push") {
            window.history.pushState(null, "", newPath);
          } else {
            window.history.replaceState(null, "", newPath);
          }
          changeRouterStateByPath(newPath);
        });
      },
      refresh() {
        startTransition(() => {
          changeRouterStateForRefetch();
        });
      },
    }),
    [
      routerState,
      isNavigating,
      changeRouterStateByPath,
      changeRouterStateForRefetch,
    ]
  );

  const ctx: GlobalRouterContextValue = useMemo(
    () => ({
      navigation,
      state: routerState.state,
    }),
    [routerState.state, navigation]
  );

  return (
    <GlobalRouterContext.Provider value={ctx}>
      <SegmentContext.Provider
        value={{
          cacheNode: routerState.cache,
          remainingPath: routerState.state,
        }}
      >
        <GlobalErrorBoundary
          includeDocument={globalErrorIncludeDocument}
          errorFallback={globalErrorFallback}
        >
          {children}
        </GlobalErrorBoundary>
      </SegmentContext.Provider>
    </GlobalRouterContext.Provider>
  );
};

function GlobalErrorBoundary({
  errorFallback,
  includeDocument = true,
  children,
}: PropsWithChildren<{
  errorFallback?: ReactNode;
  includeDocument?: boolean;
}>) {
  const el = (
    <SegmentErrorBoundary fallback={errorFallback ?? <RootErrorFallback />}>
      {children}
    </SegmentErrorBoundary>
  );

  if (!includeDocument) {
    return el;
  }

  // NOTE: this sits above the root layout, so we need the HTML boilerplate
  // -- otherwise we get issues about missing <body> etc.
  // This isn't great, because we're basically blowing away the whole document,
  // but works well enough for now.
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{el}</body>
    </html>
  );
}

function RootErrorFallback() {
  return <>An error occurred. Please refresh the page.</>;
}

export const createEmptyLayoutCache = (): LayoutCacheNode => {
  // TODO: it's a bit weird that the cache is a fake node in itself...
  return {
    segment: "<root>",
    subTree: null,
    childNodes: new Map(),
  };
};

export const createEmptyLayoutCacheWithRoot = (): LayoutCacheNode => {
  const cache = createEmptyLayoutCache();
  addChildNode(cache, "", createBlankLayoutCacheNode(""));
  return cache;
};

const getRootNode = (cache: LayoutCacheNode) => {
  const root = getChildNode(cache, "");
  if (!root) {
    throw new Error("No root cache node!");
  }
  return root;
};

const getChildNode = (cacheNode: LayoutCacheNode, key: string) => {
  return cacheNode.childNodes.get(key);
};

const addChildNode = (
  cacheNode: LayoutCacheNode,
  key: string,
  child: LayoutCacheNode
) => {
  if (cacheNode.childNodes.has(key)) {
    console.warn(
      "overriting existing child, this should't really happen...",
      cacheNode,
      key,
      child
    );
  }
  return cacheNode.childNodes.set(key, child);
};

const createShallowestCacheNodeForPath = (
  cacheNode: LayoutCacheNode,
  path: ParsedPath
): [
  cacheNode: LayoutCacheNode,
  existingPath: ParsedPath,
  didCreate: boolean
] => {
  console.log("createCacheNodeForPath", path);
  if (path.length === 0) {
    // TODO: this case is weird. i'm not sure if this should ever happen.
    return [cacheNode, [], false];
  }
  const [segment, rest] = takeSegment(path);
  let childNode = getChildNode(cacheNode, segment);
  if (!childNode) {
    childNode = createBlankLayoutCacheNode(segment);
    addChildNode(cacheNode, segment, childNode);
    return [childNode, [], true];
  } else {
    const [finalNode, existingPath, didCreate] =
      createShallowestCacheNodeForPath(childNode, rest);
    existingPath.unshift(segment); // safe to mutate, because no one else has access to it yet.
    return [finalNode, existingPath, didCreate];
  }
};

const hasCachePath = (
  cacheNode: LayoutCacheNode,
  path: ParsedPath
): boolean => {
  if (path.length === 0) throw new Error("oops, this shouldn't happen");
  const nodeForFirstSegment = cacheNode.childNodes.get(path[0]);
  if (path.length === 1 || !nodeForFirstSegment) {
    return !!nodeForFirstSegment;
  }
  return hasCachePath(nodeForFirstSegment, path.slice(1));
};

export const createLayoutCacheNode = (
  segment: string,
  subTree: ReactNode
): LayoutCacheNode => ({
  segment,
  subTree,
  childNodes: new Map(),
});

export const createBlankLayoutCacheNode = (
  segment: string
): LayoutCacheNode => ({
  segment,
  subTree: null,
  childNodes: new Map(),
});

type LayoutCacheNode = {
  segment: string;
  subTree: ReactNode;
  pending?: Thenable<ReactNode>;
  childNodes: Map<string, LayoutCacheNode>;
};

type SegmentContextValue = {
  remainingPath: ParsedPath;
  cacheNode: LayoutCacheNode;
};

export const SegmentContext = createContext<SegmentContextValue | null>(null);

const useSegmentContext = () => {
  // TODO: does this actually do anything...?
  useContext(GlobalRouterContext); // make sure we're subscribed to path changes.

  const ctx = useContext(SegmentContext);
  if (!ctx) {
    throw new Error("Missing LayoutCacheContext.Provider");
  }
  return ctx;
};

const debugCache = (cacheNode: LayoutCacheNode) => {
  const walk = (node: LayoutCacheNode): Record<string, any> | string => {
    if (!node.childNodes.size) {
      return node.subTree === null ? "<empty>" : "content ...";
    }
    return Object.fromEntries(
      [...node.childNodes.entries()].map(([k, v]) => [`${k}`, walk(v)])
    );
  };

  const res = walk(cacheNode);
  return JSON.stringify(res, null, 4);
};

export const RouterSegment = ({
  children,
  // isRootLayout, // TODO: unused. do we need it, or can we remove it?
  DEBUG_originalSegmentPath,
}: PropsWithChildren<{
  isRootLayout: boolean;
  DEBUG_originalSegmentPath: string;
}>) => {
  const { cacheNode: parentCacheNode, remainingPath } = useSegmentContext();

  const [segmentPath, pathBelowSegment] = useMemo(
    () => takeSegment(remainingPath),
    [remainingPath]
  );
  console.log(
    "RouterSegmentLayout",
    segmentPath,
    `(originally "${DEBUG_originalSegmentPath}")`,
    pathBelowSegment,
    debugCache(parentCacheNode)
  );

  if (!parentCacheNode.childNodes.has(segmentPath)) {
    console.log("storing subtree for segment", segmentPath);
    parentCacheNode.childNodes.set(
      segmentPath,
      createLayoutCacheNode(segmentPath, children)
    );
    console.log("after:", debugCache(parentCacheNode));
  } else {
    console.log("already got cached subtree for segment", segmentPath);
  }

  const ownCacheNode = parentCacheNode.childNodes.get(segmentPath)!;
  const ctxForSegmentsBelow: SegmentContextValue = useMemo(
    () => ({ cacheNode: ownCacheNode, remainingPath: pathBelowSegment }),
    [ownCacheNode, pathBelowSegment]
  );

  const pendingSubtree = ownCacheNode.pending;
  const cachedSubtree = ownCacheNode.subTree;

  return (
    <SegmentContext.Provider value={ctxForSegmentsBelow}>
      {pendingSubtree ? (
        <Use thenable={pendingSubtree} debugLabel={remainingPath} />
      ) : (
        cachedSubtree
      )}
    </SegmentContext.Provider>
  );
};

export type FetchSubtreeFn = (args: FetchSubtreeArgs) => Thenable<ReactNode>;

export type FetchSubtreeArgs = {
  path: string;
  existingState: ParsedPath;
};

function fetchSubtreeIntoNode(
  cacheNode: LayoutCacheNode,
  toFetch: FetchSubtreeArgs,
  fetchSubtree: FetchSubtreeFn
) {
  const fetchedTreeThenable = fetchSubtree(toFetch);

  cacheNode.pending = fetchedTreeThenable;
  return fetchedTreeThenable.then(
    (subTree) => {
      cacheNode.pending = undefined;
      cacheNode.subTree = subTree;
    },
    (error) => {
      cacheNode.pending = undefined;
      // throw to the nearest error boundary.
      // TODO: figure out how to not cache these
      cacheNode.subTree = (
        <ThrowFetchError rawPath={toFetch.path} error={error} />
      );
    }
  );
}

function ThrowFetchError({
  rawPath,
  error,
}: {
  rawPath: string;
  error: unknown;
}): ReactElement {
  throw new Error(`Error fetching path "${rawPath}"`, { cause: error });
}
