"use client";
import { createContext, useContext } from "react";

export type NavigateOptions = {
  noCache?: boolean;
  instant?: boolean;
  type?: "push" | "replace";
};

export type NavigationContextValue = {
  key: string;
  isNavigating: boolean;
  navigate(newPath: string, opts?: NavigateOptions): void;
};

export const NavigationContext = createContext<NavigationContextValue | null>(
  null
);

export function createDummyNavigation(path: string): NavigationContextValue {
  return {
    key: path,
    isNavigating: false,
    navigate() {
      throw new Error("Cannot call navigate on the Server.");
    },
  };
}

export function useNavigationContext() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("Missing Navigationcontext");
  return ctx;
}
