import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { reportError } from '@/components/error/ErrorReporter';

interface Props {
  children: ReactNode;
  gameTitle?: string;
  platform?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

export class GamePlayerErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

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
    logger.error('GamePlayerErrorBoundary caught an error:', error, errorInfo);
    reportError({
      type: 'client_error',
      message: error.message,
      stack: error.stack,
      url: window.location.pathname,
      context: { componentStack: errorInfo.componentStack },
    }).catch(() => {});
  }

  handleRetry = (): void => {
    logger.info('Retrying game player');

    this.setState({ isRetrying: true });

    this.retryTimeout = setTimeout(() => {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));

      if (this.props.onRetry) {
        this.props.onRetry();
      }
    }, 500);
  };

  componentWillUnmount(): void {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
  }

  handleBack = (): void => {
    if (this.props.onBack) {
      this.props.onBack();
    } else {
      window.history.back();
    }
  };

  private getTroubleshootingTips(): string[] {
    const { platform } = this.props;

    const commonTips = [
      'Check your internet connection',
      'Try refreshing the page',
      'Clear your browser cache',
    ];

    if (platform === 'Flash') {
      return [
        'Ensure Ruffle emulator is loaded correctly',
        'Flash content may have compatibility issues',
        ...commonTips,
      ];
    }

    if (platform === 'HTML5') {
      return [
        'Check browser console for JavaScript errors',
        'Try a different browser',
        ...commonTips,
      ];
    }

    return commonTips;
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;
      const troubleshootingTips = this.getTroubleshootingTips();

      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-2xl w-full bg-card rounded-lg border border-destructive shadow-xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-destructive/10 rounded-full flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground mb-2">Game Player Error</h2>
                <p className="text-muted-foreground">
                  {this.props.gameTitle
                    ? `Failed to load "${this.props.gameTitle}"`
                    : 'An error occurred while loading the game'}
                </p>
                {this.props.platform ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Platform: {this.props.platform}
                  </p>
                ) : null}
              </div>
            </div>

            {this.state.error && !this.state.isRetrying ? (
              <div className="mb-6 p-4 bg-background rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-destructive mb-2">Error Details:</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {this.state.error.message}
                </p>

                {this.state.error.message.includes('Failed to fetch') ? (
                  <div className="mt-3 p-3 bg-amber-500/10 rounded border border-amber-500/20">
                    <p className="text-sm text-amber-400">
                      <strong>Network Error:</strong> Unable to download game files. Check your
                      internet connection.
                    </p>
                  </div>
                ) : null}

                {this.state.error.message.includes('404') ? (
                  <div className="mt-3 p-3 bg-amber-500/10 rounded border border-amber-500/20">
                    <p className="text-sm text-amber-400">
                      <strong>File Not Found:</strong> Game files may be missing or not downloaded
                      yet.
                    </p>
                  </div>
                ) : null}

                {this.props.platform === 'Flash' && this.state.error.message.includes('Ruffle') ? (
                  <div className="mt-3 p-3 bg-primary/10 rounded border border-primary/20">
                    <p className="text-sm text-primary">
                      <strong>Ruffle Error:</strong> The Flash emulator encountered an issue. Try
                      refreshing the page.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {this.state.retryCount > 0 && !this.state.isRetrying ? (
              <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-primary">
                  Attempted {this.state.retryCount}{' '}
                  {this.state.retryCount === 1 ? 'retry' : 'retries'}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 mb-6">
              {canRetry && !this.state.isRetrying ? (
                <Button
                  variant="default"
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying}
                >
                  <RefreshCw size={18} className="mr-2" />
                  Try Again
                </Button>
              ) : null}
              {this.state.isRetrying ? (
                <Button variant="default" disabled>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Retrying...
                </Button>
              ) : null}
              <Button variant="secondary" onClick={this.handleBack}>
                <ArrowLeft size={18} className="mr-2" />
                Go Back
              </Button>
            </div>

            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Troubleshooting Tips:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {troubleshootingTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>

              {this.props.platform && !['Flash', 'HTML5'].includes(this.props.platform) ? (
                <div className="mt-4 p-3 bg-primary/10 rounded border border-primary/20">
                  <p className="text-sm text-primary flex items-start gap-2">
                    <Download size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      This game may not be playable in the browser. Consider using the Flashpoint
                      Launcher to download and play it.
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
