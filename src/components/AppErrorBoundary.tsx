import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("FREE PREP render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 p-8 text-ink">
          <section className="mx-auto max-w-3xl rounded-md border border-red-200 bg-white p-6 shadow-panel">
            <h1 className="text-xl font-semibold text-red-800">The app hit a rendering error.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This screen keeps the app from going blank. Please share the message below if it
              happens again.
            </p>
            <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-red-50 p-4 text-xs text-red-900">
              {this.state.error.message}
            </pre>
            <button
              className="mt-5 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => window.location.reload()}
              type="button"
            >
              Reload App
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
