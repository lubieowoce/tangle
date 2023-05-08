import { RouterSegment } from "./client-router";
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

    let tree: JSX.Element | null = null;

    if (segment.layout && segment.page) {
      // TODO
      throw new Error("Not supported yet: segment and page on the same level");
    }

    if (restOfPath.length > 0) {
      console.log("recursing", restOfPath);
      // more path remaining, need to recurse
      if (!segment.children) {
        throw new Error(
          `More path remaining (${restOfPath}), but no child routes defined`
        );
      }
      tree = await pathToRouteJSX(restOfPath, segment.children, params);
    } else {
      console.log("stopping walk", segmentPath);
      // no more path remaining, render the component
      if (!segment.page) {
        throw new Error(`Missing component for segment ${segmentPath}`);
      }
      const { default: Page } = await segment.page();
      const cacheKey = getSegmentKey(segment, params);
      // TODO: this won't work if we've got a layout on the same level as the page,
      // because we'll do the same segmentPath twice... need to disambiguate them somehow
      tree = (
        <RouterSegment segmentPath={segmentPath} isRootLayout={false}>
          <Page key={cacheKey} params={params} />
        </RouterSegment>
      );
    }

    if (segment.layout) {
      const isRootLayout = segment.segment === "";
      const { default: Layout } = await segment.layout();
      const cacheKey = getSegmentKey(segment, params);
      tree = (
        <RouterSegment isRootLayout={isRootLayout} segmentPath={segmentPath}>
          <Layout key={cacheKey} params={params}>
            {tree}
          </Layout>
        </RouterSegment>
      );
    }

    return tree;
  }

  async function ServerRoot({ path }: { path: string }) {
    const parsedPath = parsePath(path);
    const tree = await pathToRouteJSX(parsedPath, [routes], null);
    return tree;
  }

  return ServerRoot;
}
