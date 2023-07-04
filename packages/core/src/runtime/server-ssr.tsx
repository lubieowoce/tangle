import type { Readable } from "node:stream";
import {
  renderToPipeableStream,
  RenderToPipeableStreamOptions,
} from "react-dom/server";

import {
  createFromNodeStream,
  SSRManifest,
} from "react-server-dom-webpack/client";

import { ReactNode } from "react";
import { StaticRouter } from "@owoce/tangle-router/client";
import { Use } from "./support/use";

export type AssetsManifest = {
  main: string;
  globalCss?: string;
};

type Options = {
  path: string;
  rscStream: Readable;
  assetsManifest: AssetsManifest;
  webpackMapForSSR: NonNullable<SSRManifest>;
} & Omit<RenderToPipeableStreamOptions, "bootstrapScripts">;

export function getSSRDomStream({
  path,
  rscStream,
  assetsManifest,
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
      bootstrapScripts: [assetsManifest.main],
      ...rest,
    }
  );
  return domStream;
}
