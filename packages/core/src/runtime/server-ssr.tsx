import type { Readable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import {
  AnyServerRootProps,
  ASSETS_ROUTE,
  throwOnMissingProperty,
} from "./shared";
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
import { createDummyNavigation, NavigationContext } from "./navigation-context";

export type ScriptsManifest = {
  main: string;
};

export function getSSRDomStream(
  props: AnyServerRootProps,
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
    <NavigationContext.Provider value={createDummyNavigation(props)}>
      <HTMLPage>
        <Suspense>
          <ServerComponentWrapper />
        </Suspense>
      </HTMLPage>
    </NavigationContext.Provider>,
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
