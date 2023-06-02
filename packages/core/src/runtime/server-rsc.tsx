import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server.node";

import { throwOnMissingProperty } from "./shared";

import { serverRouter } from "./root";
import { createNoopStream } from "./utils";
import { ParsedPath } from "./router/paths";

export async function renderRSCRoot(
  path: string,
  existingState: ParsedPath | undefined,
  webpackMapForClient: ClientManifest
) {
  const tree = await serverRouter({
    path,
    existingState,
  });

  return renderToPipeableStream(
    tree,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
