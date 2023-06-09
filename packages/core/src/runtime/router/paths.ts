export type ParsedPath = string[];

export function parsePath(rawPath: string): ParsedPath {
  rawPath = rawPath.replace(/^\//, "").replace(/\/$/, "");
  if (rawPath === "") return ["", "__PAGE__"];
  return ["", ...rawPath.split("/"), "__PAGE__"];
}

export function serializePath(path: ParsedPath): string {
  if (path[0] === "/") {
    [, ...path] = path;
  }
  if (path.at(-1) === "__PAGE__") {
    path = path.slice(0, -1);
  }
  return "/" + path.join("/");
}

type TakeSegmentMaybeResult<T> =
  | [undefined, undefined]
  | [T, undefined]
  | [T, T[]];

export const takeSegmentMaybe = (
  existingState: string[] | undefined
): TakeSegmentMaybeResult<string> => {
  if (!existingState) return [undefined, undefined];
  if (existingState.length === 0) {
    return [undefined, undefined];
  }
  const [stateSegmentPath, ...restOfState] = existingState;
  return [stateSegmentPath, restOfState];
};

export const takeSegment = (path: ParsedPath) => {
  if (path.length === 0) {
    throw new Error("Internal error: tried to takeSegment on an empty path");
  }
  const [segment, ...rest] = path;
  return [segment, rest] as const;
};
