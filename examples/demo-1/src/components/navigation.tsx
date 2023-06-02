"use client";

import { useNavigationContext } from "@owoce/tangle";

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
      {isNavigating ? "(loading...)" : null}
    </button>
  );
};
