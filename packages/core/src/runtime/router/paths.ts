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

export const getRootCachePathForNewState = (
  currentState: ParsedPath,
  newState: ParsedPath
): ParsedPath => {
  const sharedPrefix = getCommonPrefix(currentState, newState);
  const firstNonShared = newState[sharedPrefix.length];
  return [...sharedPrefix, firstNonShared];
};

// TODO: this is a bit run-and-gun, and also makes the "skipped" stuff on the server redundant
const getCommonPrefix = (left: ParsedPath, right: ParsedPath): ParsedPath => {
  const res: ParsedPath = [];
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const leftElem = left[i];
    const rightElem = right[i];
    if (leftElem !== rightElem) {
      break;
    }
    res.push(leftElem);
  }
  return res;
};

export const takeSegment = (path: ParsedPath) => {
  if (path.length === 0) {
    throw new Error("Internal error: tried to takeSegment on an empty path");
  }
  const [segment, ...rest] = path;
  return [segment, rest] as const;
};
