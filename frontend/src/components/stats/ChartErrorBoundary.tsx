import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component for chart components
 * Catches rendering errors in recharts and displays fallback UI
 */
export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertTriangle size={32} className="text-destructive" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {this.props.fallbackTitle || 'Chart Error'}
              </h3>
              <p className="text-muted-foreground text-sm">
                Unable to render chart. Please try refreshing the page.
              </p>
              {this.state.error ? (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {this.state.error.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
