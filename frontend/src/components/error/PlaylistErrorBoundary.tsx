import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  playlistTitle?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error boundary for playlist views
 * Provides contextual error messages and recovery options
 */
export class PlaylistErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('PlaylistErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    logger.info('Retrying playlist operation');

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }));

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleBack = (): void => {
    if (this.props.onBack) {
      this.props.onBack();
    } else {
      window.history.back();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto bg-background-elevated rounded-lg border border-destructive shadow-lg p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-destructive/10 rounded-full flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">Playlist Error</h2>
                <p className="text-muted-foreground">
                  {this.props.playlistTitle
                    ? `Failed to load playlist "${this.props.playlistTitle}"`
                    : 'An error occurred while loading this playlist'}
                </p>
              </div>
            </div>

            {/* Error details */}
            {this.state.error ? (
              <div className="mb-6 p-4 bg-background-primary rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-destructive mb-2">Error Details:</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {this.state.error.message}
                </p>

                {/* Common playlist errors */}
                {this.state.error.message.includes('404') ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    This playlist may have been deleted or you don't have permission to access it.
                  </p>
                ) : null}
                {this.state.error.message.includes('403') ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    You don't have permission to access this playlist.
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Retry count */}
            {this.state.retryCount > 0 ? (
              <div className="mb-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  Attempted {this.state.retryCount}{' '}
                  {this.state.retryCount === 1 ? 'retry' : 'retries'}
                </p>
              </div>
            ) : null}

            {/* Action buttons */}
            <div className="flex gap-3">
              {canRetry ? (
                <Button variant="default" onClick={this.handleRetry}>
                  <RefreshCw size={18} className="mr-2" />
                  Try Again
                </Button>
              ) : null}
              <Button variant="secondary" onClick={this.handleBack}>
                <ArrowLeft size={18} className="mr-2" />
                Go Back
              </Button>
            </div>

            {/* Help text */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">Troubleshooting tips:</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>Verify the playlist still exists</li>
                <li>Check your internet connection</li>
                <li>Ensure you have permission to access this playlist</li>
                <li>Try refreshing the page</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
