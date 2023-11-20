/** Adapted from the react source */

import type { Thenable } from "../../shared/ReactTypes";

type ReactJSONValue =
  | string
  | boolean
  | number
  | null
  | ReactJSONValue[]
  | ReactServerObject;

export type ServerReference<T> = T;

export type CallServerCallback = <A extends any[], T>(
  id: any,
  args: A
) => Promise<T>;

export type ServerReferenceId = any;

// Serializable values
export type ReactServerValue =
  // References are passed by their value
  // | ServerReference<any> (disabled because `any` swallows everything)
  // The rest are passed as is. Sub-types can be passed in but lose their
  // subtype, so the receiver can only accept once of these.
  | string
  | boolean
  | number
  | symbol
  | null
  | void
  | bigint
  | Iterable<ReactServerValue>
  | Array<ReactServerValue>
  | Map<ReactServerValue, ReactServerValue>
  | Set<ReactServerValue>
  | Date
  | ReactServerObject
  | Promise<ReactServerValue>; // Thenable<ReactServerValue>

type ReactServerObject = { [key: string]: ReactServerValue };

export function registerServerReference(
  proxy: any,
  reference: { id: ServerReferenceId; bound: null | Thenable<Array<any>> }
): void;

export function createServerReference<A extends any[], T>(
  id: ServerReferenceId,
  callServer: CallServerCallback
): (...args: A) => Promise<T>;
