import { FC, PropsWithChildren } from "react";

export function getMatchForSegment({
  segmentPath,
  routes,
}: {
  segmentPath: string;
  routes: RouteDefinition[];
}) {
  // console.log("matching", JSON.stringify(segmentPath), "in", routes);
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
  page: ImportDefault<FC<{ params: SegmentParams }>> | null;
  loading: ImportDefault<
    FC<PropsWithChildren<{ params: SegmentParams }>>
  > | null;
  error: ImportDefault<FC<{}>> | null;
  children: RouteDefinition[] | null;
};
