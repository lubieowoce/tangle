/** Adapted from the react source */

import type { ServerManifest } from "react-client/src/ReactFlightClientConfig";

type ServerReferenceId = any;

export function decodeAction<T>(
  body: FormData,
  serverManifest: ServerManifest
): Promise<() => T> | null;
