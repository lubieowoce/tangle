"use client";
import { createContext, useContext } from "react";
import { ParsedPath, parsePath } from "./paths";

export type NavigateOptions = {
  type?: "push" | "replace";
};

export type GlobalRouterContextValue = {
  state: ParsedPath;
  navigation: NavigationContextValue;
};

export type NavigationContextValue = {
  key: string;
  isNavigating: boolean;
  navigate(newPath: string, opts?: NavigateOptions): void;
  refresh(): void;
};

export const GlobalRouterContext =
  createContext<GlobalRouterContextValue | null>(null);

export function createStaticRouter(path: string): GlobalRouterContextValue {
  return {
    state: parsePath(path),
    navigation: {
      key: path,
      isNavigating: false,
      navigate() {
        throw new Error("Cannot call navigate on the Server.");
      },
      refresh() {
        throw new Error("Cannot call refresh on the Server.");
      },
    },
  };
}

export function useNavigationContext() {
  const ctx = useContext(GlobalRouterContext);
  if (!ctx) throw new Error("Missing GlobalRouterContext");
  return ctx.navigation;
}
