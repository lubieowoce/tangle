import type { AnyServerRootProps } from "../shared";

export default function DummyServerRoot(
  _props: AnyServerRootProps
): JSX.Element {
  throw new Error(
    "Internal error: This component is meant to be replaced during the build"
  );
}
