import {
  renderToPipeableStream,
  ClientManifest,
  decodeReply,
  decodeReplyFromBusboy,
} from "react-server-dom-webpack/server";

import { ServerRouter } from "./root";
import { readablefromPipeable } from "./utils";
import type { ParsedPath } from "@owoce/tangle-router";
import { AssetsManifest } from "./server-ssr";
import busboy from "busboy";
import { actionHandlers } from "./generated/action-handlers";

import type { Request, Response } from "express";

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

export function createServerActionHandler(
  options: Pick<Options, "webpackMapForClient">
) {
  return async function handleAction(id: string, req: Request, _res: Response) {
    const handler = actionHandlers[id];
    if (!handler) {
      throw new Error("Unrecognized action id: " + JSON.stringify(id));
    }

    // adapted from
    // https://github.com/facebook/react/blob/8ec962d825fc948ffda5ab863e639cd4158935ba/fixtures/flight/server/region.js#L124

    type Args = any[];
    let args: Args;
    if (req.is("multipart/form-data")) {
      // Use busboy to streamingly parse the reply from form-data.
      const bb = busboy({ headers: req.headers });
      const reply = decodeReplyFromBusboy<Args>(bb, {});
      req.pipe(bb);
      args = await reply;
    } else {
      args = await decodeReply<Args>(req.body, {});
    }

    return renderToPipeableStream(
      handler(...args),
      options.webpackMapForClient
    );
  };
}
