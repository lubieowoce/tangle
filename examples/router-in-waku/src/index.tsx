import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ClientRouter,
  FetchSubtreeFn,
  createEmptyLayoutCache,
  getPathFromDOMState,
} from "@owoce/tangle-router/client";
import { serve } from "waku/client";

const root = createRoot(document.getElementById("root")!);

const initialCache = createEmptyLayoutCache();
const initialPath = getPathFromDOMState();

type ServerRouterProps = { path: string; existingState?: string[] };
const ServerRouter = serve<ServerRouterProps>("ServerRouter");

const fetchSubtree: FetchSubtreeFn = ({ rawPath, existingSegments }) => {
  return Promise.resolve(
    <ServerRouter path={rawPath} existingState={existingSegments} />
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
