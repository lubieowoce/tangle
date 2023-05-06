type Segment = string;

export type RouteInfo = {
  segment: Segment;
  page: string | null;
  layout: string | null;
  children: RouteInfo[] | null;
};
