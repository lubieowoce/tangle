import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server";

import { ServerRouter } from "./root";
import { readablefromPipeable } from "./utils";
import type { ParsedPath } from "@owoce/tangle-router";

export async function renderRSCRoot(
  path: string,
  existingState: ParsedPath | undefined,
  webpackMapForClient: ClientManifest
) {
  // @ts-expect-error  async component
  const tree = <ServerRouter path={path} existingState={existingState} />;

  return readablefromPipeable(
    renderToPipeableStream(tree, webpackMapForClient)
  );
}
