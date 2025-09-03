import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global error boundary component that catches JavaScript errors anywhere in the
 * child component tree and displays a fallback UI instead of crashing the app
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full bg-card p-6 rounded-lg shadow-lg">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-6">
                The application encountered an unexpected error. Please try refreshing the page.
              </p>
              
              <div className="space-y-4 w-full">
                <Button 
                  className="w-full" 
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                
                <Button 
                  className="w-full" 
                  onClick={this.handleReset}
                  variant="outline"
                >
                  Try to Recover
                </Button>
              </div>
              
              {process.env.NODE_ENV !== 'production' && this.state.error && (
                <div className="mt-6 p-4 bg-muted rounded-md text-left overflow-auto max-h-[300px] w-full">
                  <p className="font-mono text-sm mb-2">{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre className="font-mono text-xs whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}