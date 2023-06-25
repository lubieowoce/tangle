import { createServerReference } from "react-server-dom-webpack/client";
import { callServer } from "../router-integration/index.client";
// import { callServer } from "./call-server-reexport";
// import { callServer } from "./call-server";

export const createServerActionProxy = (id: string) => {
  // See: https://github.com/facebook/react/pull/26632
  return createServerReference(id, callServer);
};
