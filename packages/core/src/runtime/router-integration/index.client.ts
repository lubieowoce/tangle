import { createFromFetch } from "react-server-dom-webpack/client";

import {
  FLIGHT_REQUEST_HEADER,
  ROUTER_STATE_HEADER,
  RSC_CONTENT_TYPE,
} from "../shared";
import type { ReactNode } from "react";

// TODO: import from the router package
type RSCFetchArgs = { rawPath: string; existingSegments: string[] };

// mark the whole thing as an async function
// that way, if fetch() throws (e.g. NetworkError),
// we get a rejected promise instead of an exception.
export async function fetchSubtree({
  rawPath,
  existingSegments,
}: RSCFetchArgs) {
  const request = fetch(rawPath, {
    headers: {
      [FLIGHT_REQUEST_HEADER]: "1",
      // This tells our server-side router to skip rendering layouts we already have in the cache.
      // This is not an optional optimization, it's required for correctness.
      // We put the response in some nested place in the cache,
      // and it'll be rendered *within* those cached layouts,
      // so this response can't contain the layouts above its level -- we'd render them twice!
      [ROUTER_STATE_HEADER]: JSON.stringify(existingSegments),
      accept: RSC_CONTENT_TYPE,
    },
  });

  return createFromFetch<ReactNode>(request, {});
}
