"use client";
import * as React from "react";
import { useNavigationContext } from "./navigation-context";

type SegmentErrorBoundaryProps = React.PropsWithChildren<{
  fallback: React.ReactNode;
}>;

export function SegmentErrorBoundary({
  children,
  ...props
}: SegmentErrorBoundaryProps) {
  // If the path changes, we want to reset the error boundary.
  const { key: pathKey } = useNavigationContext();
  return (
    <ErrorBoundary pathKey={pathKey} {...props}>
      {children}
    </ErrorBoundary>
  );
}

type ErrorBoundaryProps = SegmentErrorBoundaryProps & { pathKey: string };
type ErrorBoundaryState = {
  isTriggered: boolean;
  triggeredAtKey: string | null;
};

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { isTriggered: false, triggeredAtKey: null };
  }

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    console.error("ErrorBoundary :: getDerivedStateFromError", error);
    return { isTriggered: true };
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): Partial<ErrorBoundaryState> | null {
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
    const { triggeredAtKey } = this.state;

    const hasError = triggeredAtKey !== null;
    if (hasError) {
      return fallback;
    }
    return children;
  }
}
