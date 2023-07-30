/** Adapted from the react source */

type ResolveContext = {
  conditions: Array<string>;
  parentURL: string | void;
};

type ResolveFunction = (
  path: string,
  context: ResolveContext,
  fn: ResolveFunction
) => { url: string } | Promise<{ url: string }>;

type GetSourceContext = {
  format: string;
};

type GetSourceFunction = (
  path: string,
  context: GetSourceContext,
  fn: GetSourceFunction
) => Promise<{ source: Source }>;

type TransformSourceContext = {
  format: string;
  url: string;
};

type TransformSourceFunction = (
  source: Source,
  context: TransformSourceContext,
  fn: TransformSourceFunction
) => Promise<{ source: Source }>;

type LoadContext = {
  conditions: Array<string>;
  format: string | null | void;
  importAssertions: Record<string, any>;
};

type LoadFunction = (
  path: string,
  context: LoadContext,
  fn: LoadFunction
) => Promise<{ format: string; shortCircuit?: boolean; source: Source }>;

type Source = string | ArrayBuffer | Uint8Array;

export function resolve(
  specifier: string,
  context: ResolveContext,
  defaultResolve: ResolveFunction
): Promise<{ url: string }>;

export function getSource(
  url: string,
  context: GetSourceContext,
  defaultGetSource: GetSourceFunction
): Promise<{ source: Source }>;

export function transformSource(
  source: Source,
  context: TransformSourceContext,
  defaultTransformSource: TransformSourceFunction
): Promise<{ source: Source }>;

export function load(
  url: string,
  context: LoadContext,
  defaultLoad: LoadFunction
): Promise<{ format: string; shortCircuit?: boolean; source: Source }>;
