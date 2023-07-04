import { Configuration } from "webpack";

export type TangleConfig = {
  /** Extra webpack config. Merged using `webpack-merge` */
  webpackConfig?: () => Configuration;
};

export const LAYERS = {
  default: null,
  // default: "rsc-layer",
  ssr: "ssr-layer",
  rsc: "rsc-layer",
  // shared: "shared-layer",
};
