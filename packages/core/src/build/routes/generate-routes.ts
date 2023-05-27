import { arrayLiteral, literal, stringLiteral } from "../codegen-helpers";
import { RouteInfo } from "./types";

export const generateRoutesExport = (routes: RouteInfo): string => {
  return `{
      segment: ${stringLiteral(routes.segment)},
      page: ${
        routes.page
          ? `() => import(/* webpackMode: "eager" */ ${stringLiteral(
              routes.page
            )})`
          : literal(null)
      },
      layout: ${
        routes.layout
          ? `() => import(/* webpackMode: "eager" */ ${stringLiteral(
              routes.layout
            )})`
          : literal(null)
      },
      loading: ${
        routes.loading
          ? `() => import(/* webpackMode: "eager" */ ${stringLiteral(
              routes.loading
            )})`
          : literal(null)
      },
      children: ${
        routes.children
          ? arrayLiteral(
              routes.children.map((child) => generateRoutesExport(child))
            )
          : literal(null)
      },
    }`;
};
