import { createServerRouter } from "./router/server-router";
import routes from "./generated/routes";

export const ServerRouter = createServerRouter(routes);
