type Segment = string;

export type FileSystemRouteInfo = {
  segment: Segment;
  page: string | null;
  layout: string | null;
  loading: string | null;
  error: string | null;
  children: FileSystemRouteInfo[] | null;
};
