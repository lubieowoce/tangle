/** Adapted from the react source */

import type { ServerManifest } from "react-client/src/ReactFlightClientConfig";
import { ReactFormState } from "../../shared/ReactTypes";

type ServerReferenceId = any;

export function decodeAction<T>(
  body: FormData,
  serverManifest: ServerManifest
): Promise<() => T> | null;

export function decodeFormState<S>(
  actionResult: S,
  body: FormData,
  serverManifest: ServerManifest
): Promise<ReactFormState<S, ServerReferenceId> | null>;
