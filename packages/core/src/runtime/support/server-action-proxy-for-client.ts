import { createServerReference } from "react-server-dom-webpack/client";
import { callServer } from "../router-integration/index.client";

export const createServerActionProxy = (id: string) => {
  // See: https://github.com/facebook/react/pull/26632
  return createServerReference(id, callServer);
};
