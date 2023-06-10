import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ClientRouter,
  FetchSubtreeFn,
  createEmptyLayoutCache,
  getPathFromDOMState,
} from "@owoce/tangle-router/client";
import { serve } from "waku/client";
import type { ServerRouterProps } from "./server-router.js";

const root = createRoot(document.getElementById("root")!);

const initialCache = createEmptyLayoutCache();
const initialPath = getPathFromDOMState();

const ServerRouter = serve<ServerRouterProps>("ServerRouter");

const fetchSubtree: FetchSubtreeFn = ({ path, existingState }) => {
  return Promise.resolve(
    <ServerRouter path={path} existingState={existingState} />
  );
};

root.render(
  <StrictMode>
    <ClientRouter
      initialPath={initialPath}
      initialCache={initialCache}
      fetchSubtree={fetchSubtree}
      globalErrorIncludeDocument={false}
    >
      <ServerRouter path={initialPath} />
    </ClientRouter>
  </StrictMode>
);
