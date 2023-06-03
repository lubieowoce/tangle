"use client";
import * as React from "react";
import { useNavigationContext } from "..";

type SegmentErrorBoundaryProps = React.PropsWithChildren<{
  errorFallback: React.ReactElement;
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
type ErrorBoundaryState = { errorThrownAtKey: string | null };

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { errorThrownAtKey: null };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error(error, errorInfo);
    this.setState({ errorThrownAtKey: this.props.pathKey });
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState
  ): ErrorBoundaryState | null {
    const { pathKey } = props;
    const { errorThrownAtKey } = state;

    if (errorThrownAtKey !== null && pathKey !== errorThrownAtKey) {
      // if an error was thrown before, but the path changed, clear the error.
      // we don't want the error boundary to persist if a navigation might've caused it to disappear.
      //
      // this is especially important for error boundaries high up the tree,
      // where the error might've bubbled up all the way to the root --
      // if we don't reset, "Go to the homepage" would still show the error
      // even if it didn't happen in the root page/layout.
      return { errorThrownAtKey: null };
    }
    return null;
  }

  render() {
    const { children, errorFallback } = this.props;
    const { errorThrownAtKey } = this.state;

    const hasError = errorThrownAtKey !== null;
    if (hasError) {
      return errorFallback;
    }
    return children;
  }
}
