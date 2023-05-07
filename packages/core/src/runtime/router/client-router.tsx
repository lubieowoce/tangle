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
  NavigationContext,
  NavigationContextValue,
  useNavigationContext,
} from "./navigation-context";
import { FLIGHT_REQUEST_HEADER } from "../shared";
import { createFromFetch } from "react-server-dom-webpack/client.browser";

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
  return (
    <NavigationContext.Provider value={navigation}>
      {children}
    </NavigationContext.Provider>
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

export const LayoutCacheContext = createContext<LayoutCache | null>(null);

const useLayoutCacheContext = () => {
  const ctx = useContext(LayoutCacheContext);
  if (!ctx) {
    throw new Error("Missing LayoutCacheContext.Provider");
  }
  return ctx;
};

export const RouterSegment = ({
  segmentPath,
  children,
  isRootLayout,
}: PropsWithChildren<{
  segmentPath: string;
  isRootLayout: boolean;
}>) => {
  const parentCache = useLayoutCacheContext();
  console.log("RouterSegmentLayout", segmentPath);

  if (!parentCache.children.has(segmentPath)) {
    console.log("storing subtree for segment", segmentPath);
    parentCache.children.set(
      segmentPath,
      createLayoutCacheNode(segmentPath, children)
    );
  } else {
    console.log("already got cached subtree for segment", segmentPath);
  }

  const ownCache = parentCache.children.get(segmentPath)!;

  const cachedChildren = ownCache.subTree;

  return (
    <LayoutCacheContext.Provider value={ownCache}>
      {cachedChildren}
    </LayoutCacheContext.Provider>
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
