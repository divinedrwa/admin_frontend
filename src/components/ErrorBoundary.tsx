"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
          <p className="text-lg font-semibold text-fg-primary">Something went wrong</p>
          <p className="text-sm text-fg-secondary">An unexpected error occurred while rendering this page.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-fg-inverse transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
