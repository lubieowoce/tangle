import { arrayLiteral, literal, stringLiteral } from "./codegen-helpers";
import { FileSystemRouteInfo } from "./types";

export const normalizeRoutes = (
  route: FileSystemRouteInfo
): FileSystemRouteInfo => {
  if (route.page && route.segment !== "__PAGE__") {
    // segments with a `page` get a different name
    // to disambiguate them from the layout in our nested cache
    return {
      ...route,
      page: null,
      children: [
        {
          ...route,
          segment: "__PAGE__",
          page: route.page,
          layout: null,
          children: null,
        },
        ...(normalizeRouteChildren(route.children) ?? []),
      ],
    };
  }
  return {
    ...route,
    children: normalizeRouteChildren(route.children),
  };
};

const normalizeRouteChildren = (
  children: FileSystemRouteInfo[] | null
): FileSystemRouteInfo[] | null => {
  if (!children) return children;
  if (!children.length) return null;

  let result: FileSystemRouteInfo[] = [];

  let foundDynamicIndex: number | null = null;
  for (let i = 0; i < children.length; i++) {
    const rawRoute = children[i];
    const route = normalizeRoutes(rawRoute);
    const isDynamic = isDynamicSegment(route);
    if (isDynamic) {
      if (foundDynamicIndex !== null) {
        const prevFoundName = result[foundDynamicIndex].segment;
        throw new Error(
          `Found multiple dynamic segments: ${prevFoundName}, ${route.segment}`
        );
      }
      foundDynamicIndex = i;
    }
    result.push(route);
  }
  // hack: move dynamic segments to the end so that router prefers literal segments
  if (foundDynamicIndex !== null && result.length > 1) {
    const dynamicSegment = result[foundDynamicIndex];
    result = removeIndex(result, foundDynamicIndex);
    result.push(dynamicSegment);
  }
  return result;
};

function removeIndex<T>(arr: T[], index: number) {
  const res = [...arr];
  res.splice(index, 1);
  return res;
}

function isDynamicSegment(route: FileSystemRouteInfo) {
  return getParamName(route.segment) !== null;
}

// duplicated from 'runtime/router/router-core'
function getParamName(segment: string) {
  const result = segment.match(/\[(\w+)\]/);
  if (!result) return null;
  return result[1];
}

type GenerateRoutesExportOpts = {
  /** Customize how the dynamic imports of route modules are generated.
   * This should return the equivalent of `"() => import('...')"`
   * appropriate for your environment.
   * @see {@link importLambdaDefault} */
  importLambda?: (specifier: string) => string;
};

/** Generates the source for a `RouteDefinition` object (see: `router-core.tsx`) */
export const generateRoutesExport = (
  route: FileSystemRouteInfo,
  opts: GenerateRoutesExportOpts = {}
): string => {
  const { importLambda = importLambdaDefault } = opts;

  if (route.page && route.segment !== "__PAGE__") {
    console.error(route);
    throw new Error("Pages should have been normalized via normalizeRoutes");
  }

  return `{
    segment: ${stringLiteral(route.segment)},
    page: ${route.page ? importLambda(route.page) : literal(null)},
    layout: ${route.layout ? importLambda(route.layout) : literal(null)},
    loading: ${route.loading ? importLambda(route.loading) : literal(null)},
    notFound: ${route.notFound ? importLambda(route.notFound) : literal(null)},
    error: ${route.error ? importLambda(route.error) : literal(null)},
    children: ${
      route.children
        ? arrayLiteral(
            route.children.map((child) => generateRoutesExport(child), opts)
          )
        : literal(null)
    },
  }`;
};

const importLambdaDefault = (specifier: string) =>
  `() => import(/* webpackMode: "eager" */ ${stringLiteral(specifier)})`;
