export type ParsedPath = string[];

export function parsePath(rawPath: string): ParsedPath {
  rawPath = rawPath.replace(/^\//, "").replace(/\/$/, "");
  if (rawPath === "") return [""];
  return ["", ...rawPath.split("/")];
}

export function serializePath(path: ParsedPath): string {
  if (path[0] === "/") {
    [, ...path] = path;
  }
  return "/" + path.join("/");
}
