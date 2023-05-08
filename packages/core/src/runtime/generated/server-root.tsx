// import type { AnyServerRootProps } from "../shared";

import { createServerRouter } from "../router/server-router";

const DUMMY_buildServerJSX: ReturnType<typeof createServerRouter> = (
  _props
) => {
  throw new Error(
    "Internal error: This component is meant to be replaced during the build"
  );
};

export default DUMMY_buildServerJSX;
