import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server.node";

import { AnyServerRootProps, throwOnMissingProperty } from "./shared";

import ServerRoot from "./server-root";
import { createNoopStream } from "./utils";

export function renderRSCRoot(
  props: AnyServerRootProps,
  webpackMapForClient: ClientManifest
) {
  const elem = <ServerRoot {...props} />;
  return renderToPipeableStream(
    elem,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
