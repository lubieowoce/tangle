import { ParamsToPathFn, PathToParamsFn } from "@owoce/tangle";
import { ServerRootProps } from "./root-props";

const INPUT_QUERY_PARAM = "input";

export const pathToParams: PathToParamsFn<ServerRootProps> = ({
  searchParams,
}) => {
  return {
    input: searchParams.get(INPUT_QUERY_PARAM) ?? "",
  };
};

export const paramsToPath: ParamsToPathFn<ServerRootProps> = (
  params: ServerRootProps
) => {
  return "/" + "?" + new URLSearchParams({ [INPUT_QUERY_PARAM]: params.input });
};
