import {
  type BundlerConfig,
  renderToPipeableStream as renderRSCToFlightPipeableStream,
} from "react-server-dom-webpack/server.node";

import { createNoopStream, throwOnMissingProperty } from "./shared";

import ServerRoot from "./app/server-root";

export function renderRSCRoot(webpackMapForClient: BundlerConfig) {
  const elem = <ServerRoot />;
  return renderRSCToFlightPipeableStream(
    elem,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
