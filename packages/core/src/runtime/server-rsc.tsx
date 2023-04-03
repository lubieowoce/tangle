import {
  type BundlerConfig,
  renderToPipeableStream as renderRSCToFlightPipeableStream,
} from "react-server-dom-webpack/server.node";

import { AnyServerRootProps, throwOnMissingProperty } from "./shared";

import ServerRoot from "./server-root";
import { createNoopStream } from "./utils";

export function renderRSCRoot(
  props: AnyServerRootProps,
  webpackMapForClient: BundlerConfig
) {
  const elem = <ServerRoot {...props} />;
  return renderRSCToFlightPipeableStream(
    elem,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
