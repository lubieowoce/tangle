import { createServerRouter } from "./router/index.server";
import routes from "./generated/routes";

export const ServerRouter = createServerRouter(routes);
