import { createFromFetch, encodeReply } from "react-server-dom-webpack/client";

import {
  ACTIONS_ROUTE_PREFIX,
  FLIGHT_REQUEST_HEADER,
  ROUTER_STATE_HEADER,
  RSC_CONTENT_TYPE,
} from "../shared";
import type { ReactNode } from "react";
import type { FetchSubtreeArgs } from "@owoce/tangle-router";

export type CreateFromFetchOptions = NonNullable<
  Parameters<typeof createFromFetch>[1]
>;

export type CallServerCallback = NonNullable<
  CreateFromFetchOptions["callServer"]
>;

export const callServer = (async (id, args) => {
  console.log("callServer", id, args);
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
  // TODO: response value
  return createFromFetch(responsePromise);
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

  return createFromFetch<ReactNode>(request, OPTIONS_FOR_CREATE);
}
