import path from "node:path";
import util from "node:util";
import fs from "node:fs";
import Express, { static as expressStatic } from "express";

import {
  AnyServerRootProps,
  ASSETS_ROUTE,
  FLIGHT_REQUEST_HEADER,
} from "./shared";

import { renderRSCRoot } from "./server-rsc";
import { getSSRDomStream, ScriptsManifest } from "./server-ssr";
import { createNoopStream } from "./utils";

import type { ClientManifest } from "react-server-dom-webpack/server.node";
import type { SSRManifest } from "react-server-dom-webpack/client.node";

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

app.get("/", async (req, res) => {
  const props: AnyServerRootProps = {
    input: (req.query.input as string) ?? "",
  };
  if (req.header(FLIGHT_REQUEST_HEADER)) {
    console.log("=====================");
    console.log("rendering RSC");
    const rscStream = renderRSCRoot(props, webpackMapForClient);
    rscStream.pipe(res);
  } else {
    console.log("=====================");
    console.log("rendering RSC for SSR");

    const finalOutputStream = createNoopStream();

    const rscStream = renderRSCRoot(props, webpackMapForClient);

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

    const domStream = getSSRDomStream(
      props,
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
});

app.use(ASSETS_ROUTE, expressStatic(CLIENT_ASSETS_DIR));

app.listen(8080);
