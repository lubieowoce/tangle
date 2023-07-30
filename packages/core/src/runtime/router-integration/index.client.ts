import { createFromFetch, encodeReply } from "react-server-dom-webpack/client";

import {
  ACTIONS_ROUTE_PREFIX,
  FLIGHT_REQUEST_HEADER,
  ROUTER_STATE_HEADER,
  RSC_CONTENT_TYPE,
} from "../shared";
import type { ReactNode } from "react";
import type {
  FetchSubtreeArgs,
  NavigationContextValue,
} from "@owoce/tangle-router";
import type { ServerActionResults } from "@owoce/tangle-router/server";

export type CreateFromFetchOptions = NonNullable<
  Parameters<typeof createFromFetch>[1]
>;

export type CallServerCallback = NonNullable<
  CreateFromFetchOptions["callServer"]
>;

export type ActionResult<T> = {
  actionResult: T;
  router: ServerActionResults;
};

const globalRouterRef: { current: NavigationContextValue | null } = {
  current: null,
};

export const getGlobalRouter = () => {
  if (!globalRouterRef.current) {
    throw new Error("Internal error: globalRouter not set");
  }
  return globalRouterRef as typeof globalRouterRef & { current: {} };
};

export const setGlobalRouter = (router: NavigationContextValue) => {
  globalRouterRef.current = router;
};

export const callServer = (async <A extends any[], T>(
  id: string,
  args: A
): Promise<T> => {
  // console.log("callServer", id, args);
  const url = ACTIONS_ROUTE_PREFIX + encodeURIComponent(id);

  let requestOpts: Pick<RequestInit, "headers" | "body">;
  if (!Array.isArray(args) || args.some((a) => a instanceof FormData)) {
    requestOpts = {
      headers: { accept: RSC_CONTENT_TYPE },
      body: await encodeReply(args),
    };
  } else {
    requestOpts = {
      headers: {
        accept: RSC_CONTENT_TYPE,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
    };
  }

  const responsePromise = fetch(url, {
    method: "POST",
    ...requestOpts,
  });

  const { actionResult, router: routerPayload } = await createFromFetch<
    ActionResult<T>
  >(responsePromise);

  // console.log("callServer :: passing payload to router", routerPayload);
  const router = getGlobalRouter();
  router.current.changeByServerActionResults(routerPayload);

  return actionResult;
}) satisfies CallServerCallback;

export const OPTIONS_FOR_CREATE = {
  callServer,
} satisfies CreateFromFetchOptions;

// mark the whole thing as an async function
// that way, if fetch() throws (e.g. NetworkError),
// we get a rejected promise instead of an exception.
export async function fetchSubtree({ path, existingState }: FetchSubtreeArgs) {
  const request = fetch(path, {
    headers: {
      [FLIGHT_REQUEST_HEADER]: "1",
      // This tells our server-side router to skip rendering layouts we already have in the cache.
      // This is not an optional optimization, it's required for correctness.
      // We put the response in some nested place in the cache,
      // and it'll be rendered *within* those cached layouts,
      // so this response can't contain the layouts above its level -- we'd render them twice!
      [ROUTER_STATE_HEADER]: JSON.stringify(existingState),
      accept: RSC_CONTENT_TYPE,
    },
  });

  type _ReactNode = Exclude<ReactNode, PromiseLike<any>>;
  return createFromFetch<_ReactNode>(request, OPTIONS_FOR_CREATE);
}
