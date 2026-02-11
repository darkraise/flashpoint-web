import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { reportError } from '@/components/error/ErrorReporter';

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

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    reportError({
      type: 'client_error',
      message: error.message,
      stack: error.stack,
      url: window.location.pathname,
      context: { componentStack: errorInfo.componentStack },
    }).catch(() => {});

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-2xl w-full bg-card rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                <p className="text-muted-foreground mt-1">
                  An unexpected error occurred. We've logged the issue and will look into it.
                </p>
              </div>
            </div>

            {import.meta.env.DEV && this.state.error ? (
              <div className="mb-6 p-4 bg-background rounded-lg border border-border">
                <h2 className="text-sm font-semibold text-destructive mb-2">Error Details:</h2>
                <pre className="text-xs text-muted-foreground overflow-auto max-h-64">
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

            <div className="flex gap-3">
              <Button variant="default" onClick={this.handleReset}>
                <RefreshCw size={18} className="mr-2" />
                Try Again
              </Button>
              <Button variant="secondary" onClick={this.handleGoHome}>
                <Home size={18} className="mr-2" />
                Go to Home
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">If this problem persists, please try:</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
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
