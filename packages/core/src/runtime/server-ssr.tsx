import type { Readable } from "node:stream";
import {
  renderToPipeableStream,
  RenderToPipeableStreamOptions,
} from "react-dom/server";

import { ASSETS_ROUTE } from "./shared";
import {
  createFromNodeStream,
  SSRManifest,
} from "react-server-dom-webpack/client";

import { ReactNode } from "react";
import { StaticRouter } from "@owoce/tangle-router/client";
import { Use } from "./support/use";

export type ScriptsManifest = {
  main: string;
};

type Options = {
  path: string;
  rscStream: Readable;
  scriptsManifest: ScriptsManifest;
  webpackMapForSSR: NonNullable<SSRManifest>;
} & Pick<
  RenderToPipeableStreamOptions,
  "bootstrapScriptContent" | "onError" | "onShellError" | "onShellReady"
>;

export function getSSRDomStream({
  path,
  rscStream,
  scriptsManifest,
  webpackMapForSSR,
  ...rest
}: Options) {
  const clientTreeThenable = createFromNodeStream<ReactNode>(
    rscStream,
    webpackMapForSSR
  );

  console.log("SSRing response");

  const domStream = renderToPipeableStream(
    <StaticRouter path={path}>
      <Use thenable={clientTreeThenable} />
    </StaticRouter>,
    {
      bootstrapScripts: [`${ASSETS_ROUTE}/${scriptsManifest.main}`],
      ...rest,
    }
  );
  return domStream;
}
