import type { AnyServerRootProps } from "../shared";

export type PathToParamsFn<TParams = AnyServerRootProps> = (
  url: URL
) => TParams;
export type ParamsToPathFn<TParams = AnyServerRootProps> = (
  params: TParams
) => string;

export function pathToParams(_url: URL): AnyServerRootProps {
  throw new Error(
    "Internal error: This function is meant to be replaced during the build"
  );
}

export function paramsToPath(_params: AnyServerRootProps): string {
  throw new Error(
    "Internal error: This function is meant to be replaced during the build"
  );
}
