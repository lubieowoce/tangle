import type { ReactNode } from "react";

// Look, don't judge me, that's how NextJS does it!
// Adapted from
// https://github.com/vercel/next.js/blob/18d112fb5ca62bdb7b1361a65c7e33615d16bdd1/packages/next/src/server/app-render/preload-component.ts

type MaybeAsyncComponent<TProps> = (
  props: TProps
) => ReactNode | Promise<ReactNode>;

export function preloadComponent<
  TProps extends Record<string, any>,
  TComp extends MaybeAsyncComponent<TProps>
>(Component: TComp, props: TProps): TComp {
  const prev = console.error;
  // Hide invalid hook call warning when calling component
  console.error = function (...args) {
    const [msg] = args;
    if (msg.startsWith("Warning: Invalid hook call.")) {
      // ignore
    } else {
      prev.apply(console, args);
    }
  };
  try {
    const result = Component(props);
    if (isPromise(result)) {
      // Catch promise rejections to prevent unhandledRejection errors
      result.then(
        () => {},
        () => {}
      );
    }
    return function (_props: TProps) {
      // We know what this component will render already.
      return result;
    } as TComp;
  } catch (x) {
    // something suspended or errored, try again later
  } finally {
    console.error = prev;
  }
  return Component;
}

function isPromise(x: unknown): x is Promise<unknown> {
  return !!(
    x &&
    typeof x === "object" &&
    "then" in x &&
    typeof x.then === "function"
  );
}
