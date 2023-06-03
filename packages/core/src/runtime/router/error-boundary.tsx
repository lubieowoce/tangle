"use client";
import * as React from "react";

type ErrorBoundaryProps = React.PropsWithChildren<{
  errorFallback: React.ReactElement;
}>;
type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: unknown) {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error("Error boundary triggered.");
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.errorFallback;
    }
    return this.props.children;
  }
}
