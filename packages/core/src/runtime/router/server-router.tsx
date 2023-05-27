import { Suspense } from "react";
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
    parsedPath: ParsedPath,
    isNestedFetch: boolean,
    /** we expect this to basically mean "skip rendering these segments" */
    existingState: ParsedPath | undefined,
    routes: RouteDefinition[],
    outerParams: SegmentParams | null
  ): Promise<JSX.Element | null> {
    const [segmentPath, ...restOfPath] = parsedPath;

    // machinery for nested fetches.
    // TODO: might be easier to just fish the "fetch root" out without going through this function
    // but as it is, we need to figure out where we are

    const [stateSegmentPath, restOfState] = takeSegmentMaybe(existingState);
    if (stateSegmentPath !== undefined) {
      if (segmentPath !== stateSegmentPath) {
        throw new Error(
          "Internal error: existingState should always be a prefix of parsedPath"
        );
      }
    }

    // if we've still got some state, the root has to be below us.
    const isFetchRootBelow = !!(
      isNestedFetch &&
      existingState &&
      existingState.length > 0
    );

    // if we've ran out of state, this means we're the root.
    const isFetchRoot = !!(
      isNestedFetch &&
      existingState &&
      existingState.length === 0
    );

    // if we're the root (and isFetchRootBelow becomes false), we have to stop
    // child segments from thinking they're the root too, so pass `undefined` instead of `[]` --
    // that way, we won't trip the `isFetchRoot` check above.
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
      throw new Error(
        "Internal error: got segment and page on the same level.\n" +
          "Pages should be a child with the name '__PAGE__' instead."
      );
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

      if (isFetchRootBelow) {
        // we haven't found the root yet, so skip this level. we only need the part from the root & below.
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

      tree = <Page key={cacheKey} params={params} />;

      // add a loading boundary above the page, but below the layout.
      // that way, if the layout is ready but the content is not, we can show a loading state.
      if (segment.loading) {
        const { default: Loading } = await segment.loading();
        tree = (
          <Suspense fallback={<Loading key={cacheKey} params={params} />}>
            {tree}
          </Suspense>
        );
      }

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

      // add a loading boundary again, *above* the layout.
      // that way, if the layout isn't ready, we still get a loading state.
      // TODO: i'm not 100% sure if this makes sense, reusing the same `loading` might be confusing.
      // i guess we'll see!
      if (segment.loading) {
        const { default: Loading } = await segment.loading();
        tree = (
          <Suspense fallback={<Loading key={cacheKey} params={params} />}>
            {tree}
          </Suspense>
        );
      }

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
