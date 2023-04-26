import { FC, PropsWithChildren } from "react";

export function getMatchForSegment({
  segmentPath,
  routes,
}: {
  segmentPath: string;
  routes: RouteDefinition[];
}) {
  console.log("matching", segmentPath, "in", routes);
  for (const segment of routes) {
    // TODO: do this at build time, smh
    const maybeParamName = getParamName(segment.segment);
    if (maybeParamName !== null) {
      const paramName = maybeParamName;
      const params = { [paramName]: segmentPath };
      return { segment, params };
    }
    if (segmentPath === segment.segment) {
      return { segment, params: null };
    }
  }
  return null;
}

const getParamName = (segment: string) => {
  const result = segment.match(/\[(\w+)\]/);
  if (!result) return null;
  return result[1];
};

export type SegmentParams = Record<string, string>;

type ImportDefault<T> = () => Promise<{ default: T }>;

export type RouteDefinition = {
  segment: string;
  layout: ImportDefault<
    FC<PropsWithChildren<{ params: SegmentParams }>>
  > | null;
  page: ImportDefault<FC<PropsWithChildren<{ params: SegmentParams }>>> | null;
  children: RouteDefinition[] | null;
};

export function getSegmentKey(segment: RouteDefinition, params: SegmentParams) {
  return segment.segment + "-" + JSON.stringify(params);
}

// export function pathToRouteJSX(
//   parsedPath: string[],
//   routes: RouteDefinition[],
//   outerParams: SegmentParams | null
// ): JSX.Element | null {
//   const [segmentPath, ...restOfPath] = parsedPath;
//   const match = getMatchForSegment({ segmentPath, routes });
//   if (!match) {
//     throw new Error(
//       `No match for segment ${JSON.stringify(segmentPath)} in\n${JSON.stringify(
//         routes
//       )}`
//     );
//   }
//   const { segment, params: currentSegmentParams } = match;
//   const params: SegmentParams = { ...outerParams, ...currentSegmentParams };

//   let children: JSX.Element | null = null;

//   if (restOfPath.length > 0) {
//     console.log("recursing", restOfPath);
//     // more path remaining, need to recurse
//     if (!segment.children) {
//       throw new Error(
//         `More path remaining (${restOfPath}), but no child routes defined`
//       );
//     }
//     children = pathToRouteJSX(restOfPath, segment.children, params);
//   } else {
//     console.log("stopping walk", segmentPath);
//     // no more path remaining, render the component
//     if (!segment.page) {
//       throw new Error(`Missing component for segment ${segmentPath}`);
//     }
//     children = (
//       <segment.page key={getSegmentKey(segment, params)} params={params} />
//     );
//   }

//   if (segment.layout) {
//     children = (
//       <segment.layout key={getSegmentKey(segment, params)} params={params}>
//         {children}
//       </segment.layout>
//     );
//   }

//   return children;
// }
