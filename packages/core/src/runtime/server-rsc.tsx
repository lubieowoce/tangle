import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server";

import { ServerRouter } from "./root";
import { createNoopStream } from "./utils";
import { ParsedPath } from "./router/index.server";

export async function renderRSCRoot(
  path: string,
  existingState: ParsedPath | undefined,
  webpackMapForClient: ClientManifest
) {
  // @ts-expect-error  async component
  const tree = <ServerRouter path={path} existingState={existingState} />;

  return renderToPipeableStream(tree, webpackMapForClient).pipe(
    createNoopStream()
  );
}
