import React from "react";

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled error while rendering page:", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Recover automatically when the route changes, so a crash on one page
    // doesn't permanently block navigation to the next one.
    if (this.state.error && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Something went wrong loading this page</h2>
          <p className="max-w-md text-sm text-gray-500">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 rounded-md bg-[#081534] px-4 py-2 text-sm font-medium text-white hover:bg-[#10214f]"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
