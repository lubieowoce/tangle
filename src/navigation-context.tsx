import { createContext, useContext } from "react";
import { ServerRootProps } from "./app/root-props";

export const getKey = (props: ServerRootProps) => JSON.stringify(props);

export type NavigateOptions = {
  noCache?: boolean;
  instant?: boolean;
};

export type NavigationContextValue = {
  key: string;
  isNavigating: boolean;
  navigate(newProps: ServerRootProps, opts?: NavigateOptions): void;
};

export const NavigationContext = createContext<NavigationContextValue | null>(
  null
);

export function createDummyNavigation(
  props: ServerRootProps
): NavigationContextValue {
  return {
    key: getKey(props),
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
