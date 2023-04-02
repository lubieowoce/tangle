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

export function getSSRDomStream(
  rscStream: streams.Readable,
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
    <HTMLPage>
      <Suspense>
        <ServerComponentWrapper />
      </Suspense>
    </HTMLPage>,
    {
      bootstrapScripts: [`${ASSETS_ROUTE}/main.js`],
      // onShellReady() {
      //   res.header("content-type", "text/html; charset=utf-8");
      //   domStream.pipe(finalOutputStream);
      //   finalOutputStream.pipe(res);
      // },
    }
  );
  return domStream;
}
