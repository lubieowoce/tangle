import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server.node";

import { throwOnMissingProperty } from "./shared";

import ServerRoot from "./generated/server-root";
import { createNoopStream } from "./utils";

export function renderRSCRoot(
  path: string,
  webpackMapForClient: ClientManifest
) {
  const elem = <ServerRoot path={path} />;
  return renderToPipeableStream(
    elem,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
