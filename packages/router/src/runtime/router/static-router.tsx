"use client";

import { PropsWithChildren } from "react";
import { SegmentContext, createEmptyLayoutCache } from "./client-router";
import {
  GlobalRouterContext,
  GlobalRouterContextValue,
} from "./navigation-context";
import { parsePath } from "./paths";

export function StaticRouter({
  path,
  children,
}: PropsWithChildren<{ path: string }>) {
  return (
    <GlobalRouterContext.Provider value={createStaticRouter(path)}>
      <SegmentContext.Provider
        value={{
          cacheNode: createEmptyLayoutCache(),
          remainingPath: parsePath(path),
        }}
      >
        {children}
      </SegmentContext.Provider>
    </GlobalRouterContext.Provider>
  );
}

function createStaticRouter(path: string): GlobalRouterContextValue {
  return {
    state: parsePath(path),
    navigation: {
      key: path,
      isNavigating: false,
      navigate() {
        throw new Error("Cannot call navigate on the server.");
      },
      refresh() {
        throw new Error("Cannot call refresh on the server.");
      },
      changeByServerActionResults() {
        throw new Error(
          "Cannot call changeByServerActionResults on the server."
        );
      },
    },
  };
}
