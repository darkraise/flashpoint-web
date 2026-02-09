import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

export class GameLibraryErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeouts: number[] = [1000, 3000, 5000];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('GameLibraryErrorBoundary caught an error:', error, errorInfo);

    if (this.isTransientError(error) && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry();
    }
  }

  private isTransientError(error: Error): boolean {
    const transientKeywords = [
      'network',
      'timeout',
      'fetch',
      'connection',
      'aborted',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ];

    const errorMessage = error.message.toLowerCase();
    return transientKeywords.some((keyword) => errorMessage.includes(keyword));
  }

  private scheduleRetry(): void {
    const delay = this.retryTimeouts[this.state.retryCount] || 5000;

    this.setState({ isRetrying: true });

    setTimeout(() => {
      logger.info(`Attempting automatic retry ${this.state.retryCount + 1}/${this.maxRetries}`);

      this.setState((prevState) => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));

      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }, delay);
  }

  handleManualRetry = (): void => {
    logger.info('Manual retry triggered');

    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-background-elevated rounded-lg border border-destructive shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-destructive/10 rounded-full flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Failed to load game library
                </h2>
                <p className="text-muted-foreground">
                  {this.state.isRetrying
                    ? `Retrying automatically (attempt ${this.state.retryCount + 1}/${this.maxRetries})...`
                    : 'An error occurred while loading the game library. This might be a temporary issue.'}
                </p>
              </div>
            </div>

            {this.state.error && !this.state.isRetrying ? (
              <div className="mb-6 p-4 bg-background-primary rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-destructive mb-2">Error Details:</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {this.state.error.message}
                </p>
              </div>
            ) : null}

            {this.state.retryCount > 0 && !this.state.isRetrying ? (
              <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  Attempted {this.state.retryCount} automatic{' '}
                  {this.state.retryCount === 1 ? 'retry' : 'retries'}
                </p>
              </div>
            ) : null}

            {!this.state.isRetrying ? (
              <div className="flex gap-3">
                <Button
                  variant="default"
                  onClick={this.handleManualRetry}
                  disabled={this.state.isRetrying}
                >
                  <RefreshCw size={18} className="mr-2" />
                  Try Again
                </Button>
              </div>
            ) : null}

            {this.state.isRetrying ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                <span className="text-sm">Retrying...</span>
              </div>
            ) : null}

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">If this problem persists, try:</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Checking your internet connection</li>
                <li>Refreshing the page (F5)</li>
                <li>Clearing your browser cache</li>
                <li>Verifying the backend server is running</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
