import { parsePath } from "./paths";
import {
  RouteDefinition,
  SegmentParams,
  getMatchForSegment,
  getSegmentKey,
} from "./router-core";

export function createServerRouter(routes: RouteDefinition) {
  async function pathToRouteJSX(
    parsedPath: string[],
    routes: RouteDefinition[],
    outerParams: SegmentParams | null
  ): Promise<JSX.Element | null> {
    const [segmentPath, ...restOfPath] = parsedPath;
    const match = getMatchForSegment({ segmentPath, routes });
    if (!match) {
      throw new Error(
        `No match for segment ${JSON.stringify(
          segmentPath
        )} in\n${JSON.stringify(routes)}`
      );
    }
    const { segment, params: currentSegmentParams } = match;
    const params: SegmentParams = { ...outerParams, ...currentSegmentParams };

    let children: JSX.Element | null = null;

    if (restOfPath.length > 0) {
      console.log("recursing", restOfPath);
      // more path remaining, need to recurse
      if (!segment.children) {
        throw new Error(
          `More path remaining (${restOfPath}), but no child routes defined`
        );
      }
      children = await pathToRouteJSX(restOfPath, segment.children, params);
    } else {
      console.log("stopping walk", segmentPath);
      // no more path remaining, render the component
      if (!segment.page) {
        throw new Error(`Missing component for segment ${segmentPath}`);
      }
      const { default: Page } = await segment.page();
      children = <Page key={getSegmentKey(segment, params)} params={params} />;
    }

    if (segment.layout) {
      const { default: Layout } = await segment.layout();
      children = (
        <Layout key={getSegmentKey(segment, params)} params={params}>
          {children}
        </Layout>
      );
    }

    return children;
  }

  async function ServerRoot({ path }: { path: string }) {
    const parsedPath = parsePath(path);
    const tree = await pathToRouteJSX(parsedPath, [routes], null);
    return tree;
  }

  return ServerRoot;
}
