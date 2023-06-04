import { PropsWithChildren, ReactNode, Suspense } from "react";
import { RouterSegment } from "./client-router";
import { ParsedPath, parsePath, takeSegmentMaybe } from "./paths";
import {
  RouteDefinition,
  SegmentParams,
  getMatchForSegment,
} from "./router-core";
import { SegmentErrorBoundary } from "./error-boundary";
import { preloadComponent } from "./preload-component";

export type ServerRouterOptions = {
  /** Try to preload all async segments in parallel.
   *
   * This is done using some nasty hacks, so it's possible to disable it
   * if it's causing any problems.
   */
  parallelPreload?: boolean;
  /** Log debug info. */
  debug?: boolean;
};

export function createServerRouter(routes: RouteDefinition) {
  async function ServerRouter({
    path,
    existingState,
    options,
  }: {
    path: string;
    existingState?: ParsedPath;
    options?: ServerRouterOptions;
  }) {
    options = { parallelPreload: true, debug: false, ...options };
    const isNestedFetch = !!existingState;
    const [firstSegment, ...moreSegments] = await getSegmentsToRender(
      path,
      isNestedFetch,
      existingState,
      [routes]
    );
    return segmentMatchToJSX(firstSegment, moreSegments, options);
  }

  return ServerRouter;
}

type SegmentMatchInfo = ReturnType<typeof getMatchForSegment> & {
  params: SegmentParams;
  isFetchRoot: boolean;
  key: string;
  component: SegmentMatchComponent;
  LoadingComponent: React.FC<{
    params: SegmentParams;
  }> | null;
  ErrorComponent: React.FC<{}> | null;
};

type SegmentMatchComponent =
  | {
      type: "layout";
      Component: React.FC<
        React.PropsWithChildren<{
          params: SegmentParams;
        }>
      >;
    }
  | {
      type: "page";
      Component: React.FC<{
        params: SegmentParams;
      }>;
    };

async function getSegmentsToRender(
  rawPath: string,
  isNestedFetch: boolean,
  /** we expect this to basically mean "skip rendering these segments" */
  existingState: ParsedPath | undefined,
  routes: RouteDefinition[]
) {
  const parsedPath = parsePath(rawPath);
  const segmentMatches: SegmentMatchInfo[] = [];

  let outerParams: SegmentParams = {};
  let accumKey = "";
  for (let i = 0; i < parsedPath.length; i++) {
    const segmentPath = parsedPath[i];
    accumKey += segmentPath + "/";
    const isLastSegment = i === parsedPath.length - 1;

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

    // actual routing

    const match = getMatchForSegment({ segmentPath, routes });
    if (!match) {
      // TODO: notFound
      throw new Error(
        `No match for segment ${JSON.stringify(
          segmentPath
        )} in\n${JSON.stringify(routes)}`
      );
    }
    const { segment, params: currentSegmentParams } = match;
    const params: SegmentParams = { ...outerParams, ...currentSegmentParams };

    if (segment.layout && segment.page) {
      // TODO
      throw new Error(
        "Internal error: got segment and page on the same level.\n" +
          "Pages should be a child with the name '__PAGE__' instead."
      );
    }

    const component = segment.page
      ? { type: "page" as const, Component: (await segment.page()).default }
      : segment.layout
      ? { type: "layout" as const, Component: (await segment.layout()).default }
      : { type: "layout" as const, Component: EmptySegment };

    const LoadingComponent = segment.loading
      ? (await segment.loading()).default
      : null;

    const ErrorComponent = segment.error
      ? (await segment.error()).default
      : null;

    if (isLastSegment) {
      if (component.type !== "page") {
        // TODO: notFound
        throw new Error("Last segment must have a page");
      }
      if (segmentPath !== "__PAGE__") {
        throw new Error(
          `Internal error: the last segment of parsedPath should be "__PAGE__. Path: ${JSON.stringify(
            parsedPath
          )}`
        );
      }
    }

    // recurse in the route definitions.
    if (!isLastSegment) {
      if (!segment.children) {
        throw new Error(
          `More path remaining (${JSON.stringify(
            parsedPath.slice(i)
          )}), but no child routes defined`
        );
      }
      routes = segment.children;
    }

    // if we're the root (and isFetchRootBelow becomes false), we have to stop
    // child segments from thinking they're the root too, so pass `undefined` instead of `[]` --
    // that way, we won't trip the `isFetchRoot` check above.
    existingState = isFetchRootBelow ? restOfState : undefined;

    // make the params from this segment available to the routes below.
    outerParams = params;

    if (isFetchRootBelow) {
      // we haven't found the root yet, so skip this level.
      // we only need the part from the root & below.
      continue;
    }

    segmentMatches.push({
      segment,
      key: accumKey,
      params,
      isFetchRoot,
      component,
      LoadingComponent,
      ErrorComponent,
    });
  }
  return segmentMatches;
}

// NOTE: `segmentMatchToJSX` is not a component on purpose.
// it calls the side-effecting `preloadComponent` as it builds the tree.
// This allows us to start loading all the async layouts/pages in parallel.
// BUT this would break if it were made a component --
// in that case, react would await every async component individually,
// which is what we're specifically trying to avoid.
//
// The function is technically async, but the only awaits done here should be related to
// the `() => import(...)` fns for loading/error that we get from `RouteDefinition`,
// which should be basically instant.
function segmentMatchToJSX(
  segmentMatch: SegmentMatchInfo,
  segmentMatchesBelow: SegmentMatchInfo[],
  options: ServerRouterOptions
): JSX.Element | null {
  if (options.debug) {
    console.log("segmentMatchToJSX :: segment", segmentMatch);
  }

  const {
    key: cacheKey,
    component: { type, Component: RawComponent },
    LoadingComponent,
    ErrorComponent,
    params,
    isFetchRoot,
  } = segmentMatch;

  let componentProps: { params: SegmentParams; children?: ReactNode };

  const withError = (children: JSX.Element | null) => {
    if (!ErrorComponent) return children;
    return (
      <SegmentErrorBoundary key={cacheKey} errorFallback={<ErrorComponent />}>
        {children}
      </SegmentErrorBoundary>
    );
  };

  const withLoading = (children: JSX.Element | null) => {
    if (!LoadingComponent) return children;
    return (
      <Suspense fallback={<LoadingComponent key={cacheKey} params={params} />}>
        {children}
      </Suspense>
    );
  };

  if (type === "layout") {
    const [childSegment, ...rest] = segmentMatchesBelow;
    // add the boundaries each child has below the layout.
    // this is useful if a fetch fails, and the child doesn't reach the client.
    const children = withError(
      withLoading(segmentMatchToJSX(childSegment, rest, options))
    );
    componentProps = { params, children };
  } else {
    componentProps = { params };
  }

  const Component = options?.parallelPreload
    ? preloadComponent(RawComponent, componentProps)
    : RawComponent;

  let tree: JSX.Element | null = (
    <Component key={cacheKey} {...componentProps} />
  );

  // TODO: we're putting these both above and below layouts. is that correct?
  // might lead to display weirdness. maybe these should apply to the layout's children only?
  // also, what if the root layout crashes?
  tree = withError(withLoading(tree));

  // don't wrap the tree in a segment if this is the root of a nested fetch.
  // because in that case, we'll already be rendered by an existing RouterSegment
  // (it has to be this way -- we need someone to read us from the cache and display us!)
  // so adding one here will mess things up, and cause us to register subtrees a layer too deep.
  if (!isFetchRoot) {
    tree = (
      <RouterSegment
        key={cacheKey}
        isRootLayout={false}
        DEBUG_originalSegmentPath={cacheKey}
      >
        {tree}
      </RouterSegment>
    );
  }

  return tree;
}

function EmptySegment({ children }: PropsWithChildren<{}>) {
  return <>{children}</>;
}
