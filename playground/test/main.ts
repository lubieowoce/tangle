import { jsx, renderToTree, renderTreeToString } from "./create-element";
import { inspect } from "node:util";
import Root from "./components/root.server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const main = () => {
  const readJSON = (p) => JSON.parse(readFileSync(p, "utf-8"));
  const clientManifest = readJSON(resolve(__dirname, "client-manifest.json"));
  const ssrManifest = readJSON(resolve(__dirname, "ssr-manifest.json"));

  const tree = renderToTree(jsx(Root, {}), { manifest: clientManifest });
  console.log(inspect(tree, { depth: undefined }));

  console.log(renderTreeToString(tree, { manifest: ssrManifest }));
};
