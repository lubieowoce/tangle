// import type { AnyServerRootProps } from "../shared";

import type { RouteDefinition } from "@owoce/tangle-router/server";

const placeholder = (): RouteDefinition => {
  throw new Error(
    "Internal error: A routes.js file should have replaced this file during the build process."
  );
};

export default /* @__PURE__ */ placeholder();
