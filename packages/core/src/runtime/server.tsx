import path from "node:path";
// import util from "node:util";
import fs from "node:fs";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import Express, { static as expressStatic } from "express";

import {
  ACTIONS_ROUTE_PREFIX,
  ASSETS_ROUTE,
  FLIGHT_REQUEST_HEADER,
  ROUTER_STATE_HEADER,
  RSC_CONTENT_TYPE,
} from "./shared";

import { createServerActionHandler, renderRSCRoot } from "./server-rsc";
import { getSSRDomStream, AssetsManifest } from "./server-ssr";
import { catchAsync, readablefromPipeable } from "./utils";

import type { ClientManifest } from "react-server-dom-webpack/server";
import type { SSRManifest } from "react-server-dom-webpack/client";
import { isNotFound } from "@owoce/tangle-router/shared";
import { createInitialRscResponseTransformStream } from "./initial-rsc-stream";
import { sanitize } from "htmlescape";

const CLIENT_ASSETS_DIR = path.resolve(__dirname, "../client");

const app = Express();

// const filterMapSrcOnly = (map: Record<string, any>): Record<string, any> => {
//   return Object.fromEntries(
//     Object.entries(map).filter(([id]) => !id.includes("node_modules"))
//   );
// };

const readJSONFile = (p: string) => JSON.parse(fs.readFileSync(p, "utf-8"));

const webpackMapForClient = readJSONFile(
  path.join(CLIENT_ASSETS_DIR, "client-manifest.json")
) as ClientManifest;

const webpackMapForSSR = readJSONFile(
  path.resolve(__dirname, "ssr-manifest.json")
) as NonNullable<SSRManifest>;

const getAssetsManifest = (): AssetsManifest => {
  const assets = fs.readdirSync(CLIENT_ASSETS_DIR);
  const addPublicPath = (p: string | undefined) =>
    p ? `${ASSETS_ROUTE}/${p}` : undefined;
  const scriptsManifest: AssetsManifest = {
    // FIXME: emit this from the build, because cmon
    main: addPublicPath(assets.find((p) => /^main(\.[^.]+)?\.js$/.test(p))!)!,
    globalCss: addPublicPath(
      assets.find((p) => /^main(\.[^.]+)?\.css$/.test(p))
    ),
  };
  return scriptsManifest;
};

const assetsManifest = getAssetsManifest();

app.use(ASSETS_ROUTE, expressStatic(CLIENT_ASSETS_DIR));

// TODO: distinguish which paths should hit the router somehow
app.get("/favicon.ico", (_, res) => res.status(404).send());

// these headers influence the returned content
const varyHeader = [FLIGHT_REQUEST_HEADER, ROUTER_STATE_HEADER].join(", ");

const handleServerAction = createServerActionHandler({ webpackMapForClient });

// server action (from callServer)

const logRequest = (req: Express.Request) => {
  console.log(`[${req.method}] ${req.url}`);
  console.log(req.headers);
};

app.post(
  ACTIONS_ROUTE_PREFIX + ":actionId",
  catchAsync(async (req, res) => {
    logRequest(req);

    const actionId = req.params["actionId"];
    if (typeof actionId !== "string") {
      res.status(400).send("Missing action id");
      return;
    }
    console.log("Executing server action", actionId);
    return handleServerAction(actionId, req, res);
  })
);

// regular requests or no-JS actions

app.all(
  "*",
  catchAsync(async (req, res) => {
    logRequest(req);

    if (req.method === "POST") {
      console.log("Executing server action (no JS)");
      return handleServerAction(null, req, res);
    }

    const path = req.path;
    res.header("vary", varyHeader);

    if (req.header(FLIGHT_REQUEST_HEADER)) {
      //=======================
      // RSC-only render
      //=======================

      const existingStateRaw = req.header(ROUTER_STATE_HEADER);
      if (typeof existingStateRaw !== "string") {
        throw new Error(
          `Invalid "${ROUTER_STATE_HEADER}" header: ${existingStateRaw}`
        );
      }
      const existingState = JSON.parse(req.header(ROUTER_STATE_HEADER)!);

      console.log("=====================");
      console.log("rendering RSC");
      console.log("router state", existingState);
      const rscStream = await renderRSCRoot({
        path,
        existingState,
        webpackMapForClient,
        assetsManifest,
      });
      res.header("content-type", RSC_CONTENT_TYPE);
      rscStream.pipe(res);
    } else {
      //=======================
      // SSR Render
      //=======================

      console.log("=====================");
      console.log("rendering RSC for SSR");

      const rscStream = Readable.toWeb(
        await renderRSCRoot({
          path,
          existingState: undefined,
          webpackMapForClient,
          assetsManifest,
        })
      ) as ReadableStream<Uint8Array>;

      const [rscStream1, rscStream2] = rscStream.tee();

      let shellFlushed = false;
      let hasStatus = false;

      const setStatus = (status: number) => {
        if (hasStatus) return;
        hasStatus = true;
        res.statusCode = status;
      };

      const domStream = getSSRDomStream({
        path,
        rscStream: Readable.fromWeb(rscStream1 as any),
        assetsManifest,
        webpackMapForSSR,
        bootstrapScriptContent: getInitialRSCChunkContent(),
        onError(err) {
          if (!shellFlushed) {
            if (isNotFound(err)) {
              setStatus(404);
            } else {
              console.error("onError", err);
            }
          }
        },
        onShellError(err) {
          shellFlushed = true;
          finalStream.destroy();
          handleUnrecoverableError(err, setStatus, res);
        },
        onShellReady() {
          shellFlushed = true;
          setStatus(200);
          res.header("content-type", "text/html; charset=utf-8");
          finalStream.pipe(res);
        },
      });

      // TODO: converting back and forth between web and node streams isn't ideal...
      const finalStream = Readable.fromWeb(
        Readable.toWeb(readablefromPipeable(domStream)).pipeThrough<Uint8Array>(
          createInitialRscResponseTransformStream(rscStream2, {
            transformRSCChunk,
            getFinalRSCChunk,
          })
        )
      );
    }
  })
);

//=======================
// RSC Encoding
//=======================

function getInitialRSCChunkContent() {
  return `;(() => { window.__RSC_CHUNKS__ || (window.__RSC_CHUNKS__ = []); })();`;
}

function transformRSCChunk(chunk: string) {
  return [
    `<script>`,
    `(() => {`,
    `  var chunks = window.__RSC_CHUNKS__ || (window.__RSC_CHUNKS__ = []);`,
    `  chunks.push(${sanitize(JSON.stringify(chunk))});`,
    `})();`,
    `</script>`,
  ].join("\n");
}

function getFinalRSCChunk() {
  return [
    `<script>`,
    `(() => {`,
    `  var chunks = window.__RSC_CHUNKS__ || (window.__RSC_CHUNKS__ = []);`,
    `  chunks.isComplete = true;`,
    `})();`,
    `</script>`,
  ].join("\n");
}

//=======================
// Unrecoverable errors
//=======================

function handleUnrecoverableError(
  err: unknown,
  setStatus: (status: number) => void,
  res: Express.Response
) {
  if (isNotFound(err)) {
    setStatus(404);
    res.header("content-type", "text/html; charset=utf-8");
    res.send(
      defaultFallback({
        lang: "en",
        headTitle: "Page not found",
        title: "Error 404",
        message: "Page not found.",
      })
    );
  } else {
    console.error("onShellError", err);
    setStatus(500);
    res.header("content-type", "text/html; charset=utf-8");
    res.send(
      defaultFallback({
        lang: "en",
        headTitle: "Internal server error",
        title: "Internal server error",
        message: "An error occurred while processing this request.",
      })
    );
  }
}

function defaultFallback(opts: {
  lang: string;
  headTitle: string;
  title: string;
  message: string;
}) {
  return `
  <!DOCTYPE html>
  <html lang="${opts.lang}">
    <head>
      <title>${opts.headTitle}</title>
      <meta http-equiv="cache-control" content="no-store">
      <meta charset="UTF-8" />
      <meta name="robots" content="noindex">
      <style>
        html, body { margin: unset; height: 100% }
        :root { font-family: system-ui, sans-serif }
      </style>
    </head>
    <body>
      <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center">
        <div style="text-align: center">
          <h1>${opts.title}</h1>
          <p>${opts.message}</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

//=======================
// Startup
//=======================

app.listen(8080);
