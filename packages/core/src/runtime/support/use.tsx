import { ReactElement, Thenable, ReactNode, use } from "react";

export function Use({
  thenable,
}: {
  thenable: Thenable<ReactNode>;
  /** This prop is unused, but shows up in the react DevTools  */
  debugLabel?: any;
}) {
  return use(thenable) as ReactElement;
}
