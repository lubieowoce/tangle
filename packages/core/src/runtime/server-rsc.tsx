import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server.node";

import { AnyServerRootProps, throwOnMissingProperty } from "./shared";

import ServerRoot from "./user/server-root";
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
