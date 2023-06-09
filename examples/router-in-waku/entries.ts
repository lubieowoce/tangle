import { defineEntries } from "waku/server";

export default defineEntries(
  async function getEntry(id) {
    switch (id) {
      case "ServerRouter":
        return import("./src/server-router.js");
      default:
        return null;
    }
  },
  async function getBuilder(_root, _unstable_renderForBuild) {
    return {
      "/": {
        elements: [["ServerRouter", { path: "/" }]],
      },
    };
  }
);
