import path from "node:path";
import util from "node:util";
import fs from "node:fs";
import Express, { static as expressStatic } from "express";

import {
  ASSETS_ROUTE,
  FLIGHT_REQUEST_HEADER,
  ROUTER_STATE_HEADER,
  RSC_CONTENT_TYPE,
} from "./shared";

import { renderRSCRoot } from "./server-rsc";
import { getSSRDomStream, ScriptsManifest } from "./server-ssr";
import { catchAsync, createNoopStream } from "./utils";

import type { ClientManifest } from "react-server-dom-webpack/server";
import type { SSRManifest } from "react-server-dom-webpack/client";
import type { Transform } from "node:stream";

const CLIENT_ASSETS_DIR = path.resolve(__dirname, "../client");

const app = Express();

const filterMapSrcOnly = (map: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(map).filter(([id]) => !id.includes("node_modules"))
  );
};

const readJSONFile = (p: string) => JSON.parse(fs.readFileSync(p, "utf-8"));

const webpackMapForClient = readJSONFile(
  path.join(CLIENT_ASSETS_DIR, "client-manifest.json")
) as ClientManifest;

const webpackMapForSSR = readJSONFile(
  path.resolve(__dirname, "ssr-manifest.json")
) as NonNullable<SSRManifest>;

const scriptsManifest: ScriptsManifest = {
  // FIXME: emit this from the build, because cmon
  main: fs
    .readdirSync(CLIENT_ASSETS_DIR)
    .find((p) => /^main(\.[^.]+)?\.js$/.test(p))!,
};

console.log("scriptsManifest", scriptsManifest);

console.log(
  "client map (src only)",
  util.inspect(filterMapSrcOnly(webpackMapForClient), { depth: undefined })
);
console.log(
  "patched ssr map (src only)",
  util.inspect(filterMapSrcOnly(webpackMapForSSR), { depth: undefined })
);

app.use(ASSETS_ROUTE, expressStatic(CLIENT_ASSETS_DIR));

// TODO: distinguish which paths should hit the router somehow
app.get("/favicon.ico", (_, res) => res.status(404).send());

// these headers influence the returned content
const varyHeader = [FLIGHT_REQUEST_HEADER, ROUTER_STATE_HEADER].join(", ");

app.get(
  "*",
  catchAsync(async (req, res) => {
    // const url = new URL(req.url, `http://${req.headers.host}`);
    // const props: AnyServerRootProps = pathToParams(url);
    const path = req.path;
    res.header("vary", varyHeader);

    if (req.header(FLIGHT_REQUEST_HEADER)) {
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
      const rscStream = await renderRSCRoot(
        path,
        existingState,
        webpackMapForClient
      );
      res.header("content-type", RSC_CONTENT_TYPE);
      rscStream.pipe(res);
    } else {
      console.log("=====================");
      console.log("rendering RSC for SSR");

      const finalOutputStream = createNoopStream();

      const rscStream = await renderRSCRoot(
        path,
        undefined,
        webpackMapForClient
      );

      injectRSCPayloadIntoOutput(rscStream, finalOutputStream);

      const domStream = getSSRDomStream(
        path,
        rscStream,
        scriptsManifest,
        webpackMapForSSR
      );

      // FIXME: this causes the inline scripts to go in front of <html>, that's bad.
      // figure out how combine the streams properly
      res.header("content-type", "text/html; charset=utf-8");
      domStream.pipe(finalOutputStream);
      finalOutputStream.pipe(res);
    }
  })
);

function injectRSCPayloadIntoOutput(
  rscStream: Transform,
  finalOutputStream: Transform
) {
  rscStream.on("data", (chunk: Buffer) => {
    console.log("RSC chunk", chunk.toString("utf-8"));
    finalOutputStream.write(
      [
        `<script>`,
        `(() => {`,
        `  var chunks = window.__RSC_CHUNKS__ || (window.__RSC_CHUNKS__ = []);`,
        `  chunks.push(${JSON.stringify(chunk.toString("utf8"))});`,
        `})();`,
        `</script>`,
      ].join("\n")
    );
  });

  rscStream.on("close", () => {
    finalOutputStream.write(
      [
        `<script>`,
        `(() => {`,
        `  var chunks = window.__RSC_CHUNKS__ || (window.__RSC_CHUNKS__ = []);`,
        `  chunks.isComplete = true;`,
        `})();`,
        `</script>`,
      ].join("\n")
    );
  });
}

app.listen(8080);
