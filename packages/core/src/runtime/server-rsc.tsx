import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server.node";

import { throwOnMissingProperty } from "./shared";

import buildServerJSX from "./generated/server-root";
import { createNoopStream } from "./utils";
import { ParsedPath } from "./router/paths";

export function renderRSCRoot(
  path: string,
  existingState: ParsedPath | undefined,
  webpackMapForClient: ClientManifest
) {
  const tree = buildServerJSX({
    path,
    existingState,
  });

  return renderToPipeableStream(
    tree,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
