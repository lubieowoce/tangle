import type { Readable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import { ASSETS_ROUTE, throwOnMissingProperty } from "./shared";
import {
  createFromNodeStream,
  SSRManifest,
} from "react-server-dom-webpack/client.node";

import { ReactNode } from "react";
import {
  createStaticRouter,
  GlobalRouterContext,
  SegmentContext,
  createEmptyLayoutCache,
  parsePath,
} from "./router/index.client";
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
    throwOnMissingProperty(webpackMapForSSR, "webpackMapForSSR [ssr]")
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
