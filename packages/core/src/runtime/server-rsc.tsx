import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server.node";

import { throwOnMissingProperty } from "./shared";

import buildServerJSX from "./generated/server-root";
import { createNoopStream } from "./utils";
import { ParsedPath } from "./router/paths";

export async function renderRSCRoot(
  path: string,
  existingState: ParsedPath | undefined,
  webpackMapForClient: ClientManifest
) {
  // TODO: emitting the skipped segments as we go kinda sucks, because we need to await here now.
  // gotta fix that and calculate it up front
  const { skippedSegments, tree } = await buildServerJSX({
    path,
    existingState,
  });

  return [
    renderToPipeableStream(
      tree,
      throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
    ).pipe(createNoopStream()),
    skippedSegments,
  ] as const;
}
