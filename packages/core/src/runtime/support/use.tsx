import {
  ReactNode,
  // @ts-expect-error  use exists!
  use,
} from "react";
import { Thenable } from "react__shared/ReactTypes";

export function Use({
  thenable,
}: {
  thenable: Thenable<ReactNode>;
  /** This prop is unused, but shows up in the react DevTools  */
  debugLabel?: any;
}) {
  return use(thenable);
}
