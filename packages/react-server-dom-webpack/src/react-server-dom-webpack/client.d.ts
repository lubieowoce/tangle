/** Adapted from the react source */

export * from "./client.browser";

// Not sure how to achieve import-condition-like behavior in typescript,
// so reexport the node stuff too.
export { createFromNodeStream, SSRManifest } from "./client.node";
