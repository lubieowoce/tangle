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
} from "react";

import {
  NavigateOptions,
  GlobalRouterContext,
  NavigationContextValue,
  useNavigationContext,
  GlobalRouterContextValue,
} from "./navigation-context";
import { FLIGHT_REQUEST_HEADER, ROUTER_STATE_HEADER } from "../shared";
import { createFromFetch } from "react-server-dom-webpack/client.browser";
import { ParsedPath, parsePath, takeSegment } from "./paths";
import { Use } from "../support/use";
import { __DEV__ } from "../support/is-dev";

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
};

const createRouterState = (
  rawPath: string,
  cache?: LayoutCacheNode
): RouterState => {
  return {
    rawPath,
    state: parsePath(rawPath),
    cache: cache ?? createEmptyLayoutCache(),
  };
};

const changeRouterPath = (
  router: RouterState,
  rawPath: string
): RouterState => {
  return {
    rawPath,
    state: parsePath(rawPath),
    cache: router.cache,
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

export const ClientRouter = ({
  initialCache,
  initialPath,
  children,
}: PropsWithChildren<{
  initialCache: LayoutCacheNode;
  initialPath: string;
}>) => {
  const [routerState, setRouterState] = useState<RouterState>(() =>
    createRouterState(initialPath, initialCache)
  );
  console.log("=".repeat(40));
  console.log("ClientRouter", routerState);
  const [isNavigating, startTransition] = useTransition();

  useDebugCache(routerState.cache);

  useEffect(() => {
    const listener = (_event: PopStateEvent) => {
      const restoredPath = getPathFromDOMState();
      console.log("popstate", restoredPath);
      setRouterState(changeRouterPath(routerState, restoredPath));
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  const navigation = useMemo<NavigationContextValue>(
    () => ({
      key: routerState.rawPath,
      isNavigating,
      navigate(newPath, { type = "push" }: NavigateOptions = {}) {
        startTransition(() => {
          const newRouterState = changeRouterPath(routerState, newPath);

          // TODO: do we wanna use the state for something?
          if (type === "push") {
            window.history.pushState(null, "", newPath);
          } else {
            window.history.replaceState(null, "", newPath);
          }

          const { cache, state: newState } = newRouterState;

          const pathExistsInCache = hasCachePath(cache, newState);
          if (pathExistsInCache) {
            setRouterState(newRouterState);
            return;
          }

          console.log("cache before create", debugCache(cache));

          const [cacheNode, existingSegments] =
            createShallowestCacheNodeForPath(cache, newState);
          console.log("created node", { existingSegments });
          console.log("cache after create", debugCache(cache));

          const cacheInstallPath = [
            ...existingSegments,
            newState[existingSegments.length],
          ];

          // if (didExist) {
          //   // until we support refetches, we should never stomp over an existing node
          //   throw new Error(
          //     "Internal error -- node already existed in the cache: " +
          //       JSON.stringify(cacheInstallPath)
          //   );
          // }

          console.log("requesting RSC from server", {
            state: newRouterState.state,
            newPath,
            cacheInstallPath,
            cacheNode,
            existingSegments,
          });
          fetchSubtreeIntoNode(cacheNode, {
            rawPath: newPath,
            existingSegments,
          });

          setRouterState(newRouterState);
        });
      },
      refresh() {
        startTransition(() => {
          // blow away the existing cache.
          // TODO: not sure if we should try to copy anything over.
          // i think it makes sense to invalidate everything under this layout,
          // and until we support layout groups, that's literally everything we've got,
          // so no point in copying anything
          const newRouterState: RouterState = {
            ...routerState,
            cache: createEmptyLayoutCacheWithRoot(),
          };
          console.log("newRouterState", newRouterState);

          const cacheNode = getRootNode(newRouterState.cache);
          fetchSubtreeIntoNode(cacheNode, {
            rawPath: newRouterState.rawPath,
            existingSegments: [],
          });

          setRouterState(newRouterState);
        });
      },
    }),
    [routerState, isNavigating]
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
        {children}
      </SegmentContext.Provider>
    </GlobalRouterContext.Provider>
  );
};

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
): [cacheNode: LayoutCacheNode, existingPath: ParsedPath] => {
  console.log("createCacheNodeForPath", path);
  if (path.length === 0) {
    // TODO: this case is weird. i'm not sure if this should ever happen.
    return [cacheNode, []];
  }
  const [segment, rest] = takeSegment(path);
  let childNode = getChildNode(cacheNode, segment);
  if (!childNode) {
    childNode = createBlankLayoutCacheNode(segment);
    addChildNode(cacheNode, segment, childNode);
    return [childNode, []];
  } else {
    const [finalNode, existingPath] = createShallowestCacheNodeForPath(
      childNode,
      rest
    );
    existingPath.unshift(segment); // safe to mutate, because no one else has access to it yet.
    return [finalNode, existingPath];
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
  isRootLayout, // TODO: unused right now!,
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

function fetchSubtreeIntoNode(
  cacheNode: LayoutCacheNode,
  toFetch: {
    rawPath: string;
    existingSegments: ParsedPath;
  }
) {
  const { rawPath, existingSegments } = toFetch;
  const request = fetch(rawPath, {
    headers: {
      [FLIGHT_REQUEST_HEADER]: "1",
      // This tells our server-side router to skip rendering layouts we already have in the cache.
      // This is not an optional optimization, it's required for correctness.
      // We put the response in some nested place in the cache,
      // and it'll be rendered *within* those cached layouts,
      // so this response can't contain the layouts above its level -- we'd render them twice!
      [ROUTER_STATE_HEADER]: JSON.stringify(existingSegments),
    },
  });
  const fetchedTreeThenable = createFromFetch<ReactNode>(request, {});

  cacheNode.pending = fetchedTreeThenable;
  return fetchedTreeThenable.then(
    (subTree) => {
      cacheNode.pending = undefined;
      cacheNode.subTree = subTree;
    },
    (_error) => {
      cacheNode.pending = undefined;
      cacheNode.subTree = <>Oops, something went wrong</>;
    }
  );
}

const x = <a></a>;
