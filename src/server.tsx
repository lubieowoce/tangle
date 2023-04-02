import path from "node:path";
import util from "node:util";
import fs from "node:fs";
import streams from "node:stream";
import Express, { static as expressStatic } from "express";
import type { BundlerConfig } from "react-server-dom-webpack/server.node";

import { ASSETS_ROUTE, FLIGHT_REQUEST_HEADER } from "./shared";
import type { WebpackSSRMap } from "react-server-dom-webpack/client.node";
import { renderRSCRoot } from "./server-rsc";
import { getSSRDomStream } from "./server-ssr";

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
) as BundlerConfig;

const webpackMapForSSR = readJSONFile(
  path.resolve(__dirname, "ssr-manifest.json")
) as WebpackSSRMap;

console.log(
  "client map (src only)",
  util.inspect(filterMapSrcOnly(webpackMapForClient), { depth: undefined })
);
console.log(
  "patched ssr map (src only)",
  util.inspect(filterMapSrcOnly(webpackMapForSSR), { depth: undefined })
);

const createNoopStream = () =>
  new streams.Transform({
    transform(chunk: Buffer, _encoding, callback) {
      this.push(chunk);
      callback();
    },
  });

app.get("/", async (req, res) => {
  if (req.header(FLIGHT_REQUEST_HEADER)) {
    console.log("=====================");
    console.log("rendering RSC");
    const rscStream = renderRSCRoot(webpackMapForClient);
    rscStream.pipe(res);
  } else {
    console.log("=====================");
    console.log("rendering RSC for SSR");

    const finalOutputStream = createNoopStream();

    const rscStream = renderRSCRoot(webpackMapForClient);

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

    const domStream = getSSRDomStream(rscStream, webpackMapForSSR);

    // FIXME: this causes the inline scripts to go in front of <html>, that's bad.
    // figure out how combine the streams properly
    res.header("content-type", "text/html; charset=utf-8");
    domStream.pipe(finalOutputStream);
    finalOutputStream.pipe(res);
  }
});

app.use(ASSETS_ROUTE, expressStatic(CLIENT_ASSETS_DIR));

app.listen(8080);
