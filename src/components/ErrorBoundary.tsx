import React from 'react';
import { serializeError, handleAndLogError } from '../utils/errorFormatting';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any; errorInfo: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log error details for debugging
    handleAndLogError(error, 'ErrorBoundary');
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = serializeError(this.state.error);
      
      return (
        <div className="p-4 border border-red-500 rounded bg-red-50">
          <h2 className="text-red-600 font-semibold mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-3">
            We encountered an unexpected error. Please refresh the page or try again.
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-red-600 hover:text-red-800">
              Show error details
            </summary>
            <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
              {errorMessage}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}