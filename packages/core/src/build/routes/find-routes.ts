import { join, basename, relative } from "node:path";
import { readdirSync, lstatSync } from "node:fs";
import micromatch from "micromatch";
import { MODULE_EXTENSIONS_GLOB } from "../common";
import { RouteInfo } from "./types";

const IS_PAGE = "page" + MODULE_EXTENSIONS_GLOB;
const IS_LAYOUT = "layout" + MODULE_EXTENSIONS_GLOB;
const IS_LOADING = "loading" + MODULE_EXTENSIONS_GLOB;

export const isRoot = (info: RouteInfo) => info.segment === "";

export function findRoutes(
  routesRootDir: string,
  routesDir: string
): RouteInfo {
  const dirContents = readdirSync(routesDir);
  const toAbsolute = (p: string) => join(routesDir, p);
  const routeInfo: RouteInfo = {
    segment: basename(relative(routesRootDir, routesDir)),
    page: mapMaybe(micromatchFirst(dirContents, IS_PAGE), toAbsolute),
    layout: mapMaybe(micromatchFirst(dirContents, IS_LAYOUT), toAbsolute),
    loading: mapMaybe(micromatchFirst(dirContents, IS_LOADING), toAbsolute),
    children: null,
  };

  const children: RouteInfo[] = [];
  for (const entryName of dirContents) {
    const entryPath = toAbsolute(entryName);
    if (lstatSync(entryPath).isDirectory()) {
      children.push(findRoutes(routesRootDir, entryPath));
    }
  }

  if (children.length > 0) {
    routeInfo.children = children;
  }
  return routeInfo;
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
