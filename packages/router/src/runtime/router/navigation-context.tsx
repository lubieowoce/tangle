"use client";
import { createContext, useContext } from "react";
import type { ParsedPath } from "./paths";
import type { ServerActionResults } from "./server-actions-api";

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
  changeByServerActionResults(results: ServerActionResults): void;
};

export const GlobalRouterContext =
  createContext<GlobalRouterContextValue | null>(null);

export function useNavigationContext() {
  const ctx = useContext(GlobalRouterContext);
  if (!ctx) throw new Error("Missing GlobalRouterContext");
  return ctx.navigation;
}
