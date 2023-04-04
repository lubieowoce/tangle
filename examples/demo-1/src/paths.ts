import { ParamsToPathFn, PathToParamsFn } from "@owoce/tangle";
import { ServerRootProps } from "./root-props";

export const pathToParams: PathToParamsFn<ServerRootProps> = ({
  searchParams,
}) => {
  return {
    input: searchParams.get("input") ?? "",
  };
};

export const paramsToPath: ParamsToPathFn<ServerRootProps> = (
  params: ServerRootProps
) => {
  return "/" + new URLSearchParams({ input: params.input });
};
