/** Adapted from the react source */

import type { ReactClientValue } from "react-server/src/ReactFlightServer";

// export type ServerReference<T extends Function> = T & {
export type ServerReference<T> = T & {
  $$typeof: symbol;
  $$id: string;
  $$bound: null | Array<ReactClientValue>;
};

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export type ClientReference<T> = {
  $$typeof: symbol;
  $$id: string;
  $$async: boolean;
};

export function isClientReference(
  reference: object
): reference is ClientReference<unknown>;

export function isServerReference(
  reference: object
): reference is ServerReference<unknown>;

export function registerClientReference<T>(
  proxyImplementation: any,
  id: string,
  exportName: string
): ClientReference<T>;

export function registerServerReference<T>(
  reference: ServerReference<T>,
  id: string,
  exportName: null | string
): ServerReference<T>;

export function createClientModuleProxy<T>(
  moduleId: string
): ClientReference<T>;
