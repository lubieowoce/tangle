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
  useReducer,
} from "react";

import { Thenable } from "react__shared/ReactTypes";
import {
  NavigateOptions,
  GlobalRouterContext,
  NavigationContextValue,
  useNavigationContext,
  GlobalRouterContextValue,
} from "./navigation-context";
import {
  FLIGHT_REQUEST_HEADER,
  ROUTER_RESPONSE_PREFIX_HEADER,
  ROUTER_STATE_HEADER,
} from "../shared";
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

// TODO: this is a bit run-and-gun, and also makes the "skipped" stuff on the server redundant
const stripCommonPrefix = (
  left: ParsedPath,
  right: ParsedPath
): [prefix: ParsedPath, rest: ParsedPath] => {
  const res: ParsedPath = [];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const leftElem = left[i];
    const rightElem = right[i];
    if (leftElem !== rightElem) {
      break;
    }
    res.push(leftElem);
  }
  return [res, right.slice(res.length)];
};

const takeSegment = (path: ParsedPath) => {
  const [segment, ...rest] = path;
  // TODO undefined...?
  return [segment, rest] as const;
};

export const ClientRouter = ({
  cache,
  initialPath,
  children,
}: PropsWithChildren<{
  cache: LayoutCache;
  initialPath: string;
}>) => {
  const [pathKey, setPathKey] = useState<string>(initialPath);
  const state = useMemo(() => parsePath(pathKey), [pathKey]);
  console.log("=".repeat(40));
  console.log("ClientRouter", state);
  const [isNavigating, startTransition] = useTransition();
  const [, forceRerender] = useReducer((count) => count + 1, 0);

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

          const newState = parsePath(newPath);
          const [, didExist] = getCacheNodeForPath(cache, newState);
          if (didExist) {
            return;
          }

          console.log("requesting RSC from server", { state, newPath });
          const request = fetch(newPath, {
            headers: {
              [FLIGHT_REQUEST_HEADER]: "1",
              [ROUTER_STATE_HEADER]: JSON.stringify(state),
            },
          });
          const fetchedRSC = createFromFetch(request, {});

          const [cacheInstallPrefix, restOfPath] = stripCommonPrefix(
            state,
            newState
          );

          const cacheInstallPath = [...cacheInstallPrefix, restOfPath[0]];
          const [cacheNode] = getCacheNodeForPath(cache, cacheInstallPath);

          // idk about this one, would be nicer to just store a promise, but let's see where it goes
          const RSCResponseWrapper = () => {
            console.log("hello from RSCResponseWrapper", {
              prefix: cacheInstallPrefix,
              rest: restOfPath,
            });
            return use(fetchedRSC);
          };
          RSCResponseWrapper[
            "displayName"
          ] = `${RSCResponseWrapper}:${JSON.stringify({
            prefix: cacheInstallPrefix,
            rest: restOfPath,
          })}`;

          cacheNode.subTree = <RSCResponseWrapper />;

          // (async () => {
          //   // const layoutPrefix = JSON.parse(
          //   //   response.headers.get(ROUTER_RESPONSE_PREFIX_HEADER)!
          //   // );
          //   // const [cacheNode] = getCacheNodeForPath(cache, layoutPrefix);

          //   // TODO: let the cache hold in-flight stuff, so that we don't have to await
          //   cacheNode.subTree = await createFromFetch(request, {});
          //   forceRerender();

          //   console.log("saved into cache", cacheInstallPath);
          // })();
        };

        if (instant) {
          doNavigate();
        } else {
          startTransition(doNavigate);
        }
      },
    }),
    [pathKey, state, isNavigating, cache]
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
      <SegmentContext.Provider
        // key={pathKey} // DEBUG ONLY
        value={{
          cacheNode: cache,
          remainingPath: state,
        }}
      >
        {children}
      </SegmentContext.Provider>
    </GlobalRouterContext.Provider>
  );
};

// new cache

export const createLayoutCacheRoot = (): LayoutCache => {
  return {
    segment: "<root>",
    subTree: null,
    children: new Map(),
  };
};

const getCacheNodeForPath = (cache: LayoutCache, path: ParsedPath) => {
  const getOrCreate = (
    cacheNode: LayoutCache,
    key: string
  ): [cacheNode: LayoutCache, didExist: boolean] => {
    const existingNode = cacheNode.children.get(key);
    if (existingNode) {
      return [existingNode, true];
    } else {
      const newNode = createLayoutCacheNode(key, null);
      cacheNode.children.set(key, newNode);
      return [newNode, false];
    }
  };

  const _getCacheNodeForPath = (
    cacheNode: LayoutCache,
    path: ParsedPath
  ): [cacheNode: LayoutCache, didExist: boolean] => {
    if (path.length === 0) throw new Error("oops, this shouldn't happen");
    const [nodeForFirstSegment, didExist] = getOrCreate(cacheNode, path[0]);
    if (path.length === 1) {
      return [nodeForFirstSegment, didExist];
    }
    const [nestedNode, nestedDidExist] = _getCacheNodeForPath(
      nodeForFirstSegment,
      path.slice(1)
    );
    return [nestedNode, didExist && nestedDidExist];
  };

  return _getCacheNodeForPath(cache, path);
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
  useContext(GlobalRouterContext); // make sure we're subscribed to path changes.
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

  const [segmentPath, pathBelowSegment] = useMemo(
    () => takeSegment(remainingPath),
    [remainingPath]
  );
  console.log(
    "RouterSegmentLayout",
    segmentPath,
    pathBelowSegment,
    parentCacheNode
  );

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
    [ownCacheNode, pathBelowSegment]
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
