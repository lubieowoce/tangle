import { createServerRouter } from "@owoce/tangle-router/server";
import routes from "./generated/routes";

export const ServerRouter = createServerRouter(routes);
