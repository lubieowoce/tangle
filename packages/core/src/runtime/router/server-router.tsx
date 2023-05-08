import { RouterSegment } from "./client-router";
import { ParsedPath, parsePath } from "./paths";
import {
  RouteDefinition,
  SegmentParams,
  getMatchForSegment,
  getSegmentKey,
} from "./router-core";

type TakeSegmentResult<T> = [undefined, undefined] | [T, undefined] | [T, T[]];

const takeSegment = (
  existingState: string[] | undefined
): TakeSegmentResult<string> => {
  if (!existingState) return [undefined, undefined];
  // TODO: length...?
  const [stateSegmentPath, ...restOfState] = existingState;
  if (existingState.length === 1) {
    return [stateSegmentPath, undefined];
  }
  return [stateSegmentPath, restOfState];
};

export function createServerRouter(routes: RouteDefinition) {
  async function pathToRouteJSX(
    parsedPath: string[],
    existingState: string[] | undefined,
    routes: RouteDefinition[],
    outerParams: SegmentParams | null
  ): Promise<{ skippedSegments: string[]; tree: JSX.Element | null }> {
    const [segmentPath, ...restOfPath] = parsedPath;

    const [stateSegmentPath, restOfState] = takeSegment(existingState);

    const restOfStateToPassDown =
      segmentPath === stateSegmentPath ? restOfState : undefined;
    console.log("building jsx for path", { parsedPath });
    console.log("existing states", { existingState, restOfStateToPassDown });

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

    let skippedSegments: string[] = [];
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

      const nestedResult = await pathToRouteJSX(
        restOfPath,
        restOfStateToPassDown,
        segment.children,
        params
      );
      // no need to render layouts if existing state matched.
      // return just the nested part.
      if (restOfStateToPassDown) {
        return {
          skippedSegments: [segmentPath, ...nestedResult.skippedSegments],
          tree: nestedResult.tree,
        };
      } else {
        // the segment didn't match, so we're not skipping it.
        // which means that we don't need to emit anything for that, so we only propagate the tree
        tree = nestedResult.tree;
      }
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
        <RouterSegment
          key={segmentPath} // TODO: or cachekey?? idk
          segmentPath={segmentPath}
          isRootLayout={false}
        >
          <Page key={cacheKey} params={params} />
        </RouterSegment>
      );
    }

    if (segment.layout) {
      const isRootLayout = segment.segment === "";
      const { default: Layout } = await segment.layout();
      const cacheKey = getSegmentKey(segment, params);
      tree = (
        <RouterSegment
          key={segmentPath}
          isRootLayout={isRootLayout}
          segmentPath={segmentPath}
        >
          <Layout key={cacheKey} params={params}>
            {tree}
          </Layout>
        </RouterSegment>
      );
    }

    return { skippedSegments, tree };
  }

  async function buildServerJSX({
    path,
    existingState,
  }: {
    path: string;
    existingState?: ParsedPath;
  }) {
    const parsedPath = parsePath(path);
    const { tree, skippedSegments } = await pathToRouteJSX(
      parsedPath,
      existingState,
      [routes],
      null
    );
    console.log("skipped segments", skippedSegments);
    return { tree, skippedSegments };
  }

  return buildServerJSX;
}
