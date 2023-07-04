"use client";

import { useNavigationContext } from "@owoce/tangle/client";
import { PropsWithChildren } from "react";
import { linkStyles } from "./styles";

export const RefreshButton = () => {
  const { refresh, isNavigating } = useNavigationContext();
  return (
    <button
      className={linkStyles}
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
    <div className={isNavigating ? "opacity-50" : undefined}>{children}</div>
  );
};
