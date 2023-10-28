/** Adapted from the react source */

import type {
  ClientReference,
  // ServerReference,
} from "./ReactFlightServerConfig";
import type { ReactServerContext } from "shared/ReactTypes";

import type {
  ReactElement as React$Element,
  ComponentType, // hmmm... maybe this is close enough?
} from "react";

// we don't care about these
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type React$AbstractComponent<T, U> = ComponentType<any>;

type JSONValue =
  | string
  | boolean
  | number
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type ReactJSONValue =
  | string
  | boolean
  | number
  | null
  | ReactJSONValue[]
  | ReactClientObject;

// Serializable values
export type ReactClientValue =
  // Server Elements and Lazy Components are unwrapped on the Server
  | React$Element<React$AbstractComponent<any, any>>
  //
  // (disabled, idk what it is and i don't think we need it)
  // | LazyComponent<ReactClientValue, any>
  //
  // References are passed by their value
  | ClientReference<any>
  //
  // (disabled, because it causes circular reference issues)
  // | ServerReference<any>
  //
  // The rest are passed as is. Sub-types can be passed in but lose their
  // subtype, so the receiver can only accept once of these.
  | React$Element<string>
  | React$Element<ClientReference<any> & any>
  | ReactServerContext<any>
  | string
  | boolean
  | number
  | symbol
  | null
  | void
  | bigint
  | Iterable<ReactClientValue>
  | Array<ReactClientValue>
  | Map<ReactClientValue, ReactClientValue>
  | Set<ReactClientValue>
  | Date
  | ReactClientObject
  | Promise<ReactClientValue>; // Thenable<ReactClientValue>

type ReactClientObject = { [key: string]: ReactClientValue };
