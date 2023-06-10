// for some reason the 'react-server' condition isn't applied, so this doesn't work:
//  import { createServerRouter } from "@owoce/tangle-router/server";
// as a workaround, i've made a `/server__no-conditions` subpath which doesn't require 'react-server'.
// TODO: change this when https://github.com/dai-shi/waku/pull/71 is released
import { createServerRouter } from "@owoce/tangle-router/server__no-conditions";

import routes from "./generated/routes.js";

const ServerRouter = createServerRouter(routes);
export default ServerRouter;
