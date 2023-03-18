// import "./server-register-import-hook";

import path from "node:path";
import url from "node:url";
import util from "node:util";
import fs from "node:fs";
import streams from "node:stream";
import Express, { static as expressStatic } from "express";
import { renderToPipeableStream } from "react-dom/server";
import {
  BundlerConfig,
  renderToPipeableStream as renderRSCToFlightPipeableStream,
} from "react-server-dom-webpack/server.node";

import ServerRoot from "./app/server-root";
import { ROOT_DOM_NODE_ID, FLIGHT_REQUEST_HEADER } from "./shared";
import {
  ClientReference,
  ClientReferenceMetadata,
  createFromNodeStream,
  WebpackSSRMap,
} from "react-server-dom-webpack/client.node";
import {
  ReactNode,
  // @ts-ignore  bad type definitions
  use,
} from "react";

const ASSETS_ROUTE = "/_assets";

const CLIENT_ASSETS_DIR = path.resolve(__dirname, "../client");

const app = Express();

// const componentIdServer = (file: string, componentName: string) =>
//   url.pathToFileURL(path.resolve(__dirname, file)) + "#" + componentName;

const throwOnMissingProperty = <TObj extends Record<string, any>>(
  obj: TObj,
  name?: string
): TObj => {
  const msgSuffix = name ? ` (in object '${name}')` : "";
  return new Proxy(obj, {
    get(target, name) {
      if (!(name in target)) {
        throw new Error(`Missing property ${String(name)}` + msgSuffix);
      }
      const res = target[name as any];
      console.log("accessed property" + msgSuffix + ":", name, "-->", res);
      return res;
    },
  });
};

const mapTsToJS = (id: string) => {
  id = id.replace(/\.tsx?(?=$|#)/, ".js");
  id = id.replace(
    "file:///Users/urygaj01/code/rsc/src/",
    "file:///Users/urygaj01/code/rsc/dist/server/"
  );
  return id;
};

const patchClientMapTsImports = (map: BundlerConfig): BundlerConfig => {
  return Object.fromEntries(
    Object.entries(map).map(([id, meta]) => {
      const newId = mapTsToJS(id);
      return [newId, meta];
    })
  );
};

const mapObj = <TObj extends Record<string, any>>(
  obj: TObj,
  fn: (
    key: keyof TObj,
    val: TObj[keyof TObj]
  ) => [newKey: keyof TObj, newVal: TObj[keyof TObj]]
): TObj => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => fn(key, val))
  ) as TObj;
};

const patchSSRMapChunks = ({
  clientMap,
  ssrMap,
}: {
  clientMap: BundlerConfig;
  ssrMap: WebpackSSRMap;
}): WebpackSSRMap => {
  return mapObj(ssrMap, (id, exportsInfo) => {
    // const newId = mapTsToJS(id);
    const newMeta = mapObj(exportsInfo, (exportName, exportInfo) => {
      const newExportsInfo: ClientReference<any> & ClientReferenceMetadata = {
        ...exportInfo,
        id: url.fileURLToPath(mapTsToJS(exportInfo.specifier)),
        chunks: [] /* TODO */,
      };
      return [exportName, newExportsInfo];
    });

    return [id, newMeta];
  });
};

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

// const webpackMapForSSR = patchSSRMapChunks({
//   clientMap: webpackMapForClient,
//   ssrMap: readJSONFile(
//     path.join(CLIENT_ASSETS_DIR, "ssr-manifest.json")
//   ) as WebpackSSRMap,
// });

console.log(
  "patched client map (src only)",
  util.inspect(filterMapSrcOnly(webpackMapForClient), { depth: undefined })
);
console.log(
  "patched ssr map (src only)",
  util.inspect(filterMapSrcOnly(webpackMapForSSR), { depth: undefined })
);

// // for SSR
// (global as any)["__webpack_require__"] = (id: string) => {
//   const mod = require(id);
//   console.log("server-side __webpack_require__", id, "-->", mod);
//   return mod;
// };

app.get("/", async (req, res) => {
  const elem = <ServerRoot />;

  if (req.header(FLIGHT_REQUEST_HEADER)) {
    console.log("=====================");
    console.log("rendering RSC");
    const stream = renderRSCToFlightPipeableStream(
      elem,
      throwOnMissingProperty(webpackMapForClient, "webpackMapForClient [rsc]")
    );
    stream.pipe(res);
  } else {
    console.log("=====================");
    console.log("rendering RSC for SSR");
    const clientPipeableStream = renderRSCToFlightPipeableStream(
      elem,
      throwOnMissingProperty(
        webpackMapForClient,
        "webpackMapForClient [rsc for ssr]"
      )
    );

    const inoutStream = new streams.Transform({
      transform(chunk: Buffer, _encoding, callback) {
        console.log(
          "RSDW.renderToPipeableStream chunk:\n" + chunk.toString("utf8") + "\n"
        );
        this.push(chunk);
        callback();
      },
    });

    console.log("converting flight output to node stream");
    clientPipeableStream.pipe(inoutStream);
    const clientTreeThenable = createFromNodeStream<ReactNode>(
      inoutStream,
      throwOnMissingProperty(
        webpackMapForSSR,
        "webpackMapForSSR [createFromNodeStream for ssr]"
      )
    );

    const ServerComponentWrapper = () => {
      console.log(
        "ServerComponentWrapper",
        clientTreeThenable.status === "fulfilled"
          ? util.inspect(clientTreeThenable.value, { depth: undefined })
          : undefined
      );
      return use(clientTreeThenable);
    };

    // const clientStream = new TransformStream();
    // clientPipeableStream.pipe(clientStream.writable as any);
    // const clientTree = await createFromNodeStream<ReactNode>(
    //   clientStream.readable as any,
    //   webpackMap
    // );

    // const clientTree = null;

    // console.log("clientTree", util.inspect(clientTree, { depth: undefined }));
    console.log("SSRing response");
    const stream = renderToPipeableStream(
      <html>
        <head>
          <meta name="charset" content="utf8" />
        </head>
        <body>
          <div id={ROOT_DOM_NODE_ID}>
            <ServerComponentWrapper />
          </div>
        </body>
      </html>,
      {
        bootstrapScripts: [`${ASSETS_ROUTE}/main.js`],
      }
    );
    stream.pipe(res);
  }
});

app.use(ASSETS_ROUTE, expressStatic(CLIENT_ASSETS_DIR));

app.listen(8080);
