import { RouterSegment } from "./client-router";
import { ParsedPath, parsePath, takeSegmentMaybe } from "./paths";
import {
  RouteDefinition,
  SegmentParams,
  getMatchForSegment,
  getSegmentKey,
} from "./router-core";

// TODO: we don't actually need to be calling this in generated code, we could just make it export the tree.
export function createServerRouter(routes: RouteDefinition) {
  async function pathToRouteJSX(
    parsedPath: string[],
    isNestedFetch: boolean,
    existingState: string[] | undefined,
    routes: RouteDefinition[],
    outerParams: SegmentParams | null
  ): Promise<JSX.Element | null> {
    const [segmentPath, ...restOfPath] = parsedPath;

    // machinery for nested fetches.
    // TODO: might be easier to just fish the "fetch root" out without going through this function
    // but as it is, we need to figure out where we are

    const [stateSegmentPath, restOfState] = takeSegmentMaybe(existingState);

    const doesSegmentMatchState = segmentPath === stateSegmentPath;

    // we've still got some state, but it matches the current path,
    // so the root has to be below us.
    const isFetchRootBelow =
      isNestedFetch && Boolean(existingState) && doesSegmentMatchState;

    // we've still got some state, but it no longer matches the current path.
    // this means we're the root.
    const isFetchRoot =
      isNestedFetch && Boolean(existingState) && !doesSegmentMatchState;

    // if we found the fetch root, stop passing state down -- the paths diverged,
    // so we shouldn't be comparing them.
    const restOfStateToPassDown = isFetchRootBelow ? restOfState : undefined;

    console.log("=".repeat(40));
    console.log("building jsx for path", { parsedPath });
    console.log("existing states", {
      existingState,
      restOfStateToPassDown,
      isFetchRootBelow,
      isFetchRoot,
    });

    // actual routing

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

      const treeFromLowerSegments = await pathToRouteJSX(
        restOfPath,
        isNestedFetch,
        restOfStateToPassDown,
        segment.children,
        params
      );
      if (doesSegmentMatchState) {
        // skip rendering layouts if the state matched -- return just the nested part.
        return treeFromLowerSegments;
      } else {
        tree = treeFromLowerSegments;
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

      tree = <Page key={cacheKey} params={params} />;

      // don't wrap the tree in a segment if this is the root of a nested fetch.
      // because in that case, we'll already be rendered by an existing RouterSegment
      // (it has to be this way -- we need someone to read us from the cache and display us!)
      // so adding one here will mess things up, and cause us to register subtrees a layer too deep.
      if (!isFetchRoot) {
        tree = (
          <RouterSegment
            key={segmentPath} // TODO: or cachekey?? idk
            isRootLayout={false}
            DEBUG_originalSegmentPath={segmentPath}
          >
            {tree}
          </RouterSegment>
        );
      }
    }

    if (segment.layout) {
      const isRootLayout = segment.segment === "";
      const { default: Layout } = await segment.layout();
      const cacheKey = getSegmentKey(segment, params);
      tree = (
        <Layout key={cacheKey} params={params}>
          {tree}
        </Layout>
      );
      if (!isFetchRoot) {
        tree = (
          <RouterSegment
            key={segmentPath}
            isRootLayout={isRootLayout}
            DEBUG_originalSegmentPath={segmentPath}
          >
            {tree}
          </RouterSegment>
        );
      }
    }

    return tree;
  }

  // TODO: throw this bit away?
  // this used to be a component, now it's not, so it's useless
  async function buildServerJSX({
    path,
    existingState,
  }: {
    path: string;
    existingState?: ParsedPath;
  }) {
    const parsedPath = parsePath(path);
    return pathToRouteJSX(
      parsedPath,
      !!existingState,
      existingState,
      [routes],
      null
    );
  }

  return buildServerJSX;
}
