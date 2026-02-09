import { Component, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface PlayerErrorBoundaryProps {
  children: ReactNode;
}

interface PlayerErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class PlayerErrorBoundary extends Component<
  PlayerErrorBoundaryProps,
  PlayerErrorBoundaryState
> {
  constructor(props: PlayerErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PlayerErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('[PlayerErrorBoundary] Caught error:', {
      error: error.toString(),
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    logger.info('[PlayerErrorBoundary] Error state reset, retrying render');
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[600px] bg-card border border-border rounded-lg p-8">
          <div className="text-center max-w-2xl">
            <AlertCircle size={64} className="text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Player Error</h2>
            <p className="text-muted-foreground mb-6">
              {import.meta.env.DEV
                ? 'The game player encountered an error and had to stop. This can happen due to issues with the game content, the Ruffle emulator, or browser compatibility.'
                : 'The game player encountered an error. Please try reloading.'}
            </p>

            {import.meta.env.DEV && this.state.error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-destructive mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {this.state.error.stack ? (
                  <details className="mt-2">
                    <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                      Show stack trace
                    </summary>
                    <pre className="text-xs mt-2 overflow-x-auto p-2 bg-black/20 rounded">
                      {this.state.error.stack}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : null}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
              >
                <RotateCcw size={18} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors font-medium"
              >
                Reload Page
              </button>
            </div>

            <p className="text-sm text-muted-foreground mt-6">
              If the problem persists, try using the Flashpoint Launcher instead or check the
              browser console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
