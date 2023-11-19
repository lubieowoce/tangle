/// <reference types="react/experimental" />

export type {
  Thenable,
  ServerContextJSONValue,
  ServerContext,
  ServerContext as ReactServerContext,
} from "react";

// This is an opaque type returned by decodeFormState on the server, but it's
// defined in this shared file because the same type is used by React on
// the client.
export type ReactFormState<S, ReferenceId> = [
  S /* actual state value */,
  string /* key path */,
  ReferenceId /* Server Reference ID */,
  number /* number of bound arguments */
];
