import { join, basename, relative } from "node:path";
import { readdirSync, lstatSync } from "node:fs";
import micromatch from "micromatch";
import { FileSystemRouteInfo } from "./types";

export const isRoot = (info: FileSystemRouteInfo) => info.segment === "";

type FindRoutesOpts = {
  /**A micromatch pattern fragment specifying the file extensions to check.
   * Should include the dot. */
  moduleExtensionsPattern?: string;
};

export function findRoutes(
  routesRootDir: string,
  opts: FindRoutesOpts = {}
): FileSystemRouteInfo {
  const { moduleExtensionsPattern = ".{ts,tsx,js,jsx,mjs,mjsx}" } = opts;

  const IS_PAGE = "page" + moduleExtensionsPattern;
  const IS_LAYOUT = "layout" + moduleExtensionsPattern;
  const IS_LOADING = "loading" + moduleExtensionsPattern;
  const IS_ERROR = "error" + moduleExtensionsPattern;
  const IS_NOTFOUND = "not-found" + moduleExtensionsPattern;

  function findRoutesInternal(dirPath: string) {
    const dirContents = readdirSync(dirPath);
    const toAbsolute = (p: string) => join(dirPath, p);

    const routeInfo: FileSystemRouteInfo = {
      segment: basename(relative(routesRootDir, dirPath)),
      page: mapMaybe(micromatchFirst(dirContents, IS_PAGE), toAbsolute),
      layout: mapMaybe(micromatchFirst(dirContents, IS_LAYOUT), toAbsolute),
      loading: mapMaybe(micromatchFirst(dirContents, IS_LOADING), toAbsolute),
      error: mapMaybe(micromatchFirst(dirContents, IS_ERROR), toAbsolute),
      notFound: mapMaybe(micromatchFirst(dirContents, IS_NOTFOUND), toAbsolute),
      children: null,
    };

    const children: FileSystemRouteInfo[] = [];
    for (const entryName of dirContents) {
      const entryPath = toAbsolute(entryName);
      if (lstatSync(entryPath).isDirectory()) {
        children.push(findRoutesInternal(entryPath));
      }
    }

    if (children.length > 0) {
      routeInfo.children = children;
    }
    return routeInfo;
  }

  return findRoutesInternal(routesRootDir);
}

const mapMaybe = <A, B>(val: A | null, fn: (val: A) => B): B | null => {
  if (val === null) return null;
  return fn(val);
};

const micromatchFirst = (
  candidates: string[],
  pattern: string
): string | null => {
  const result = micromatch(candidates, pattern);
  if (result.length === 0) return null;
  if (result.length === 1) return result[0];
  throw new Error(
    `Found Multiple matches for pattern ${JSON.stringify(
      pattern
    )}: ${JSON.stringify(result)}`
  );
};
