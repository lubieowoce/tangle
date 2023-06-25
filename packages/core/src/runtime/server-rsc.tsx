import {
  renderToPipeableStream,
  ClientManifest,
  decodeReply,
  decodeReplyFromBusboy,
  PipeableStream,
  decodeAction,
} from "react-server-dom-webpack/server";

import { ServerRouter } from "./root";
import { readablefromPipeable } from "./utils";
import type { ParsedPath } from "@owoce/tangle-router";
import { AssetsManifest } from "./server-ssr";
import busboy from "busboy";
import {
  serverActionHandlers,
  serverActionsManifest,
} from "./generated/action-handlers";

import type { Request, Response } from "express";
import { RSC_CONTENT_TYPE } from "./shared";

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
  return async function handleAction(
    id: string | null,
    req: Request,
    res: Response
  ) {
    type Handler = (typeof serverActionHandlers)[string];

    const getHandler = (id: string): Handler => {
      const handler = serverActionHandlers[id];
      if (!handler) {
        throw new Error("Unrecognized action id: " + JSON.stringify(id));
      }
      return handler;
    };

    const handleFlightResult = (result: PipeableStream) => {
      res.status(200);
      res.header("content-type", RSC_CONTENT_TYPE);
      result.pipe(res);
    };

    const handleNoJsResult = () => {
      res.status(303); // "See Other"
      res.header("location", req.originalUrl);
      res.send("Redirecting...");
    };

    const manifest = serverActionsManifest;

    // TODO: decodeReply* seems to add a FormData as the last argument even if we didn't pass it,
    // not sure if we need to do anything about that

    if (id === null) {
      const formData = await getFormDataFromRequest(req);
      const decoded = await decodeAction(formData, manifest);
      if (!decoded) {
        throw new Error("Could not decode form action");
      }
      await decoded();
      return handleNoJsResult();
    }

    type Args = any[];
    let args: Args;

    const handler = getHandler(id);

    // adapted from
    // https://github.com/facebook/react/blob/8ec962d825fc948ffda5ab863e639cd4158935ba/fixtures/flight/server/region.js#L124

    if (req.is("json")) {
      args = JSON.parse(await getRawBodyAsString(req));
    } else if (req.is("multipart/form-data")) {
      // Use busboy to streamingly parse the reply from form-data.
      const bb = busboy({ headers: req.headers });
      const reply = decodeReplyFromBusboy<Args>(bb, manifest);
      req.pipe(bb);
      args = await reply;
    } else if (req.is("application/x-www-form-urlencoded")) {
      const body = formDataFromSearchQueryString(new URL(req.url).search);
      args = await decodeReply<Args>(body, manifest);
    } else {
      args = await decodeReply<Args>(req.body, manifest);
    }

    console.log("handleAction :: args", args);

    const handlerResultPromise = handler(...args);

    const result = renderToPipeableStream(
      handlerResultPromise,
      options.webpackMapForClient
    );
    return handleFlightResult(result);
  };
}

function getRawBodyAsString(req: Request) {
  return new Promise<string>((resolve, reject) => {
    let rawBody = "";
    req.on("data", function (chunk) {
      rawBody += chunk;
    });
    req.on("end", () => resolve(rawBody));
    req.on("error", (err) => reject(err));
  });
}

function getFormDataFromRequest(req: Request) {
  const formData = new FormData();

  const bb = busboy({ headers: req.headers });
  req.pipe(bb);

  return new Promise<FormData>((resolve, reject) => {
    bb.on("field", (name, val) => {
      formData.append(name, val);
    });
    bb.on("file", (_name, _stream) => {
      const err = new Error("TODO: do something sensible for files");
      bb.destroy(err);
      reject(err);
    });
    bb.on("close", () => {
      resolve(formData);
    });
    bb.on("error", (err) => reject(err));
  });
}

function formDataFromSearchQueryString(query: string) {
  const searchParams = new URLSearchParams(query);
  const formData = new FormData();
  for (const [key, value] of searchParams) {
    formData.append(key, value);
  }
  return formData;
}
