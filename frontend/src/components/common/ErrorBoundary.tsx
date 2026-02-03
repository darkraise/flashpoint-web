import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire application
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store error info in state
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    // Reset error state and try to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = (): void => {
    // Navigate to home page and reset error state
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-primary px-4">
          <div className="max-w-2xl w-full bg-background-elevated rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
                <p className="text-gray-400 mt-1">
                  An unexpected error occurred. We've logged the issue and will look into it.
                </p>
              </div>
            </div>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error ? (
              <div className="mb-6 p-4 bg-background-primary rounded-lg border border-border">
                <h2 className="text-sm font-semibold text-red-400 mb-2">Error Details:</h2>
                <pre className="text-xs text-gray-300 overflow-auto max-h-64">
                  {this.state.error.toString()}
                  {this.state.errorInfo ? (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  ) : null}
                </pre>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="default"
                onClick={this.handleReset}
              >
                <RefreshCw size={18} className="mr-2" />
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={this.handleGoHome}
              >
                <Home size={18} className="mr-2" />
                Go to Home
              </Button>
            </div>

            {/* Additional help text */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-gray-400">
                If this problem persists, please try:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-400 list-disc list-inside">
                <li>Refreshing the page</li>
                <li>Clearing your browser cache</li>
                <li>Checking your internet connection</li>
                <li>Contacting support if the issue continues</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
