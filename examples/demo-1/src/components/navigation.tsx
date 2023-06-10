"use client";

import { useNavigationContext } from "@owoce/tangle/client";
import { PropsWithChildren } from "react";

export const RefreshButton = () => {
  const { refresh, isNavigating } = useNavigationContext();
  return (
    <button
      onClick={() => {
        console.log("refreshing");
        refresh();
      }}
    >
      Refresh
      {isNavigating ? " (loading...)" : null}
    </button>
  );
};

export const FadeOnPendingNavigation = ({
  children,
}: PropsWithChildren<{}>) => {
  const { isNavigating } = useNavigationContext();
  return (
    <div style={isNavigating ? { opacity: "0.5" } : undefined}>{children}</div>
  );
};
