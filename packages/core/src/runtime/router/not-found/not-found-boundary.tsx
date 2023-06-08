"use client";
import * as React from "react";
import { useNavigationContext } from "../../router/navigation-context";
import { isNotFound } from "./not-found";

type SegmentNotFoundProps = React.PropsWithChildren<{
  fallback: React.ReactNode;
}>;

export function SegmentNotFoundBoundary({
  children,
  ...props
}: SegmentNotFoundProps) {
  // If the path changes, we want to reset the error boundary.
  const { key: pathKey } = useNavigationContext();
  return (
    <NotFoundBoundary pathKey={pathKey} {...props}>
      {children}
    </NotFoundBoundary>
  );
}

type NotFoundBoundaryProps = SegmentNotFoundProps & { pathKey: string };
type NotFoundBoundaryState = {
  isTriggered: boolean;
  triggeredAtKey: string | null;
};

class NotFoundBoundary extends React.Component<
  NotFoundBoundaryProps,
  NotFoundBoundaryState
> {
  constructor(props: NotFoundBoundaryProps) {
    super(props);
    this.state = { isTriggered: false, triggeredAtKey: null };
  }

  static getDerivedStateFromError(
    error: unknown
  ): Partial<NotFoundBoundaryState> | null {
    console.log(
      "NotFoundBoundary :: getDerivedStateFromError",
      error,
      isNotFound(error)
    );
    // only catch NotFound, rethrow everything else.
    if (isNotFound(error)) {
      console.log("NotFoundBoundary :: intercepting error");
      return { isTriggered: true };
    } else {
      console.log("NotFoundBoundary :: rethrowing error");
      throw error;
    }
  }

  static getDerivedStateFromProps(
    props: NotFoundBoundaryProps,
    state: NotFoundBoundaryState
  ): Partial<NotFoundBoundaryState> | null {
    const { pathKey } = props;
    const { isTriggered, triggeredAtKey } = state;

    if (isTriggered) {
      if (triggeredAtKey === null) {
        // boundary was triggered, we need to save the key when it happened.
        return { ...state, triggeredAtKey: pathKey };
      }
      if (triggeredAtKey !== null && pathKey !== triggeredAtKey) {
        // if an error was thrown before, but the path changed, clear the error.
        // we don't want the error boundary to persist if a navigation might've caused it to disappear.
        //
        // this is especially important for error boundaries high up the tree,
        // where the error might've bubbled up all the way to the root --
        // if we don't reset, "Go to the homepage" would still show the error
        // even if it didn't happen in the root page/layout.
        return { ...state, isTriggered: false, triggeredAtKey: null };
      }
    }

    return null;
  }

  render() {
    const { children, fallback } = this.props;
    const { isTriggered, triggeredAtKey } = this.state;

    const hasError = isTriggered && triggeredAtKey !== null;
    if (hasError) {
      return fallback;
    }
    return children;
  }
}
