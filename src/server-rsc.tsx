import {
  type BundlerConfig,
  renderToPipeableStream as renderRSCToFlightPipeableStream,
} from "react-server-dom-webpack/server.node";

import { throwOnMissingProperty } from "./shared";

import ServerRoot from "./app/server-root";
import { ServerRootProps } from "./app/root-props";
import { createNoopStream } from "./utils";

export function renderRSCRoot(
  props: ServerRootProps,
  webpackMapForClient: BundlerConfig
) {
  const elem = <ServerRoot {...props} />;
  return renderRSCToFlightPipeableStream(
    elem,
    throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
  ).pipe(createNoopStream());
}
