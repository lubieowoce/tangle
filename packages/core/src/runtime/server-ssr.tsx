import type { Readable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import { ASSETS_ROUTE } from "./shared";
import {
  createFromNodeStream,
  SSRManifest,
} from "react-server-dom-webpack/client";

import { ReactNode } from "react";
import {
  createStaticRouter,
  GlobalRouterContext,
  SegmentContext,
  createEmptyLayoutCache,
  parsePath,
} from "@owoce/tangle-router/client";
import { Use } from "./support/use";

export type ScriptsManifest = {
  main: string;
};

export function getSSRDomStream(
  path: string,
  rscStream: Readable,
  scriptsManifest: ScriptsManifest,
  webpackMapForSSR: NonNullable<SSRManifest>
) {
  const clientTreeThenable = createFromNodeStream<ReactNode>(
    rscStream,
    webpackMapForSSR
  );

  console.log("SSRing response");
  const domStream = renderToPipeableStream(
    <GlobalRouterContext.Provider value={createStaticRouter(path)}>
      <SegmentContext.Provider
        value={{
          cacheNode: createEmptyLayoutCache(),
          remainingPath: parsePath(path),
        }}
      >
        <Use thenable={clientTreeThenable} />
      </SegmentContext.Provider>
    </GlobalRouterContext.Provider>,
    {
      bootstrapScripts: [`${ASSETS_ROUTE}/${scriptsManifest.main}`],
      // onShellReady() {
      //   res.header("content-type", "text/html; charset=utf-8");
      //   domStream.pipe(finalOutputStream);
      //   finalOutputStream.pipe(res);
      // },
    }
  );
  return domStream;
}
