import streams from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

import { ASSETS_ROUTE, throwOnMissingProperty } from "./shared";
import {
  createFromNodeStream,
  WebpackSSRMap,
} from "react-server-dom-webpack/client.node";
import {
  ReactNode,
  Suspense,
  // @ts-ignore  bad type definitions
  use,
} from "react";
import { HTMLPage } from "./app/page";
import { createDummyNavigation, NavigationContext } from "./navigation-context";
import { ServerRootProps } from "./app/root-props";

export type ScriptsManifest = {
  main: string;
};

export function getSSRDomStream(
  props: ServerRootProps,
  rscStream: streams.Readable,
  scriptsManifest: ScriptsManifest,
  webpackMapForSSR: WebpackSSRMap
) {
  const clientTreeThenable = createFromNodeStream<ReactNode>(
    rscStream,
    throwOnMissingProperty(
      webpackMapForSSR,
      "webpackMapForSSR [createFromNodeStream for ssr]"
    )
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
