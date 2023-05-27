import { arrayLiteral, literal, stringLiteral } from "../codegen-helpers";
import { RouteInfo } from "./types";

export const generateRoutesExport = (routes: RouteInfo): string => {
  if (routes.page && routes.segment !== "__PAGE__") {
    // segments with a `page` get a different name
    // to disambiguate them from the layout in our nested cache
    return generateRoutesExport({
      ...routes,
      page: null,
      children: [
        {
          ...routes,
          segment: "__PAGE__",
          layout: null,
          page: routes.page,
        },
        ...(routes.children ?? []),
      ],
    });
  }
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
