"use client";

import {
  PropsWithChildren,
  ReactNode,
  useEffect,
  useMemo,
  useState,
  useTransition,
  // @ts-ignore  TODO: enable react@next types
  use,
  createContext,
  useContext,
} from "react";

import { Thenable } from "react__shared/ReactTypes";
import {
  NavigateOptions,
  GlobalRouterContext,
  NavigationContextValue,
  useNavigationContext,
  GlobalRouterContextValue,
} from "./navigation-context";
import { FLIGHT_REQUEST_HEADER } from "../shared";
import { createFromFetch } from "react-server-dom-webpack/client.browser";
import { ParsedPath, parsePath } from "./paths";

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

export const createCache = () => new Map<string, Thenable<ReactNode>>();

export type ServerResponseCache = ReturnType<typeof createCache>;

export const getPathFromDOMState = () => {
  // TODO: searchparams etc?
  return document.location.pathname;
};

export const ClientRouter = ({
  cache,
  initialPath,
  children,
}: PropsWithChildren<{
  cache: ServerResponseCache;
  initialPath: string;
}>) => {
  const [pathKey, setPathKey] = useState<string>(initialPath);
  const state = useMemo(() => parsePath(pathKey), [pathKey]);
  const [isNavigating, startTransition] = useTransition();

  useEffect(() => {
    const listener = (_event: PopStateEvent) => {
      const restoredPath = getPathFromDOMState();
      console.log("popstate", restoredPath);
      setPathKey(restoredPath);
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);

  const navigation = useMemo<NavigationContextValue>(
    () => ({
      key: pathKey,
      isNavigating,
      navigate(
        newPath,
        {
          type = "push",
          // noCache = false,
          instant = false,
        }: NavigateOptions = {}
      ) {
        const doNavigate = () => {
          // let newKey = newPath;
          // if (noCache) {
          //   newKey += ":" + Date.now();
          // }

          setPathKey(newPath);

          // TODO: do we wanna use the state for something?
          // like the current key, if we do something like the date-key above?
          if (type === "push") {
            window.history.pushState(null, "", newPath);
          } else {
            window.history.replaceState(null, "", newPath);
          }

          if (cache.has(newPath)) {
            return;
          }
          cache.set(
            newPath,
            // TODO: partial refetches
            createFromFetch(
              fetch(newPath, { headers: { [FLIGHT_REQUEST_HEADER]: "1" } }),
              {}
            )
          );
        };

        if (instant) {
          doNavigate();
        } else {
          startTransition(doNavigate);
        }
      },
    }),
    [pathKey, isNavigating, cache]
  );

  const ctx: GlobalRouterContextValue = useMemo(
    () => ({
      navigation,
      state,
    }),
    [state, navigation]
  );

  return (
    <GlobalRouterContext.Provider value={ctx}>
      {children}
    </GlobalRouterContext.Provider>
  );
};

export const RenderCurrentPathFromCache = ({
  cache,
}: {
  cache: ServerResponseCache;
}) => {
  const { key } = useNavigationContext();
  const treeThenable = cache.get(key);
  if (!treeThenable) {
    const msg = `INTERNAL ERROR: Cache key not found: ${JSON.stringify(key)}`;
    console.error(msg, cache);
    throw new Error(msg);
  }
  return use(treeThenable);
};

// new cache

export const createLayoutCacheRoot = (): LayoutCache => {
  return {
    segment: "",
    subTree: null,
    children: new Map(),
  };
};

export const createLayoutCacheNode = (
  segment: string,
  subTree: ReactNode
): LayoutCache => ({
  segment,
  subTree,
  children: new Map(),
});

type LayoutCache = {
  segment: string;
  subTree: ReactNode;
  children: Map<string, LayoutCache>;
};

type SegmentContextValue = {
  remainingPath: ParsedPath;
  cacheNode: LayoutCache;
};

export const SegmentContext = createContext<SegmentContextValue | null>(null);

const useSegmentContext = () => {
  const ctx = useContext(SegmentContext);
  if (!ctx) {
    throw new Error("Missing LayoutCacheContext.Provider");
  }
  return ctx;
};

export const RouterSegment = ({
  children,
  isRootLayout,
}: PropsWithChildren<{
  segmentPath: string;
  isRootLayout: boolean;
}>) => {
  const { cacheNode: parentCacheNode, remainingPath } = useSegmentContext();

  const [segmentPath, pathBelowSegment] = useMemo(() => {
    const [segmentPath, ...restOfPath] = remainingPath;
    return [segmentPath, restOfPath];
  }, [remainingPath]);
  console.log("RouterSegmentLayout", segmentPath, pathBelowSegment);

  if (!parentCacheNode.children.has(segmentPath)) {
    console.log("storing subtree for segment", segmentPath);
    parentCacheNode.children.set(
      segmentPath,
      createLayoutCacheNode(segmentPath, children)
    );
  } else {
    console.log("already got cached subtree for segment", segmentPath);
  }

  const ownCacheNode = parentCacheNode.children.get(segmentPath)!;
  const ctxForSegmentsBelow: SegmentContextValue = useMemo(
    () => ({ cacheNode: ownCacheNode, remainingPath: pathBelowSegment }),
    [ownCacheNode]
  );

  const cachedChildren = ownCacheNode.subTree;

  return (
    <SegmentContext.Provider value={ctxForSegmentsBelow}>
      {cachedChildren}
    </SegmentContext.Provider>
  );
};

// export const RouterSegmentPage = ({
//   segment,
//   children,
//   cacheKey,
// }: PropsWithChildren<{
//   segment: string;
//   cacheKey: string;
// }>) => {
//   const cache = useLayoutCacheContext();
//   console.log("RouterSegmentPage", segment, cacheKey, cache);
//   if (!cache.currentLayout.has(cacheKey)) {
//     console.log("caching children", cacheKey, children);
//     cache.currentLayout.set(cacheKey, children);
//   }
//   const cachedChildren = cache.currentLayout.get(cacheKey);
//   // return cachedChildren as any;
//   // return use(cachedChildren);
//   return children as any;
// };
