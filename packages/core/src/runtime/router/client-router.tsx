"use client";

import {
  FC,
  PropsWithChildren,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ParsedPath, parsePath, serializePath } from "./paths";
import {
  RouteDefinition,
  SegmentParams,
  getMatchForSegment,
  // pathToRouteJSX,
} from "./router-core";

type NavigationContextValue = {
  navigate(path: ParsedPath, options?: { type?: "push" | "replace" }): void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

const useNavigationContext = () => {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("Missing NavigationContext");
  return ctx;
};

export function Link({ href, children }: PropsWithChildren<{ href: string }>) {
  // PLACEHOLDER
  return <a href={href}>{children}</a>;
}

// export function Link({ href, children }: PropsWithChildren<{ href: string }>) {
//   const { navigate } = useNavigationContext();
//   const parsedPath = useMemo(() => parsePath(href), [href]);
//   return (
//     <a
//       href={href}
//       onClick={(e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         navigate(parsedPath);
//       }}
//     >
//       {children}
//     </a>
//   );
// }

// export function ClientRouter({
//   initialPath,
//   allRoutes,
// }: {
//   initialPath?: string;
//   allRoutes: RouteDefinition[];
// }) {
//   const [initialParsedPath] = useState(() =>
//     parsePath(initialPath ?? document.location.pathname)
//   );

//   useEffect(() => {
//     const listener = (_event: PopStateEvent) => {
//       console.log("popstate", document.location.pathname);
//       setCurrentPath(parsePath(document.location.pathname));
//     };
//     window.addEventListener("popstate", listener);
//     return () => window.removeEventListener("popstate", listener);
//   }, []);

//   const [currentPath, setCurrentPath] = useState(initialParsedPath);
//   console.log("Router", currentPath);

//   const ctx: NavigationContextValue = {
//     navigate(newPath, { type = "push" } = {}) {
//       startTransition(() => {
//         setCurrentPath(newPath);
//         const newPathStr = serializePath(newPath);
//         console.log("pushing path", newPathStr);
//         if (type === "push") {
//           window.history.pushState(null, "", newPathStr);
//         } else {
//           window.history.replaceState(null, "", newPathStr);
//         }
//       });
//     },
//   };

//   console.group("building tree");
//   const tree = pathToRouteJSX(currentPath, allRoutes, null);
//   console.groupEnd();

//   return (
//     <NavigationContext.Provider value={ctx}>{tree}</NavigationContext.Provider>
//   );
// }
