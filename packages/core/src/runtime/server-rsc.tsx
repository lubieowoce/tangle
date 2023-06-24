import {
  renderToPipeableStream,
  ClientManifest,
} from "react-server-dom-webpack/server";

import { ServerRouter } from "./root";
import { readablefromPipeable } from "./utils";
import type { ParsedPath } from "@owoce/tangle-router";
import { AssetsManifest } from "./server-ssr";

export type Options = {
  path: string;
  existingState: ParsedPath | undefined;
  webpackMapForClient: ClientManifest;
  assetsManifest: AssetsManifest;
};

export async function renderRSCRoot({
  path,
  existingState,
  webpackMapForClient,
  assetsManifest,
}: Options) {
  const tree = (
    <>
      {assetsManifest.globalCss && (
        <link
          rel="stylesheet"
          key="global-css"
          href={assetsManifest.globalCss}
          // @ts-expect-error  missing 'precedence' prop
          // eslint-disable-next-line react/no-unknown-property
          precedence="TANGLE"
        />
      )}
      {/* @ts-expect-error  async component */}
      <ServerRouter path={path} existingState={existingState} />
    </>
  );

  return readablefromPipeable(
    renderToPipeableStream(tree, webpackMapForClient)
  );
}
