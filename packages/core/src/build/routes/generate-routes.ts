import { arrayLiteral, literal, stringLiteral } from "../codegen-helpers";
import { FileSystemRouteInfo } from "./types";

export const generateRoutesExport = (routes: FileSystemRouteInfo): string => {
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

  const importLambda = (specifier: string) =>
    `() => import(/* webpackMode: "eager" */ ${stringLiteral(specifier)})`;

  return `{
      segment: ${stringLiteral(routes.segment)},
      page: ${routes.page ? importLambda(routes.page) : literal(null)},
      layout: ${routes.layout ? importLambda(routes.layout) : literal(null)},
      loading: ${routes.loading ? importLambda(routes.loading) : literal(null)},
      error: ${routes.error ? importLambda(routes.error) : literal(null)},
      children: ${
        routes.children
          ? arrayLiteral(
              routes.children.map((child) => generateRoutesExport(child))
            )
          : literal(null)
      },
    }`;
};
