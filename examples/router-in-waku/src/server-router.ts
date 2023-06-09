// for some reason the 'react-server' condition isn't applied, so here's a workaround
// import { createServerRouter } from "@owoce/tangle-router/server";
import { createServerRouter } from "@owoce/tangle-router/server__no-conditions";

import routes from "./generated/routes.js";

const ServerRouter = createServerRouter(routes);
export default ServerRouter;
