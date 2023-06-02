// import type { AnyServerRootProps } from "../shared";

import type { RouteDefinition } from "../router/router-core";

const placeholder = (): RouteDefinition => {
  throw new Error(
    "Internal error: A routes.js file should have replaced this file during the build process."
  );
};

export default /* @__PURE__ */ placeholder();
