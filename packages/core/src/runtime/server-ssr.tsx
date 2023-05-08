import type { Readable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import { ASSETS_ROUTE, throwOnMissingProperty } from "./shared";
import {
  createFromNodeStream,
  SSRManifest,
} from "react-server-dom-webpack/client.node";

import {
  ReactNode,
  Suspense,
  // @ts-ignore  bad type definitions
  use,
} from "react";
import { HTMLPage } from "./page";
import {
  createStaticRouter,
  GlobalRouterContext,
} from "./router/navigation-context";
import {
  SegmentContext,
  createLayoutCacheNode,
  createLayoutCacheRoot,
} from "./router/client-router";
import { parsePath } from "./router/paths";

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

  const ServerComponentWrapper = () => {
    console.log("Rendering ServerComponentWrapper");
    return use(clientTreeThenable);
  };

  console.log("SSRing response");
  const domStream = renderToPipeableStream(
    // TODO: integrate NavigationContext with router!
    <SegmentContext.Provider
      value={{
        remainingPath: parsePath(path),
        cacheNode: createLayoutCacheRoot(),
      }}
    >
      <GlobalRouterContext.Provider value={createStaticRouter(path)}>
        <HTMLPage>
          <Suspense>
            <ServerComponentWrapper />
          </Suspense>
        </HTMLPage>
      </GlobalRouterContext.Provider>
    </SegmentContext.Provider>,
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
