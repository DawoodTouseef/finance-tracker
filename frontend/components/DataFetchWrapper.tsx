import React, { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { ApiErrorMessage } from './ApiErrorMessage';

interface DataFetchWrapperProps {
  isLoading: boolean;
  isError: boolean;
  error: any;
  children: ReactNode;
  onRetry?: () => void;
  loadingMessage?: string;
  errorMessage?: string;
  showLoadingIndicator?: boolean;
  className?: string;
}

/**
 * A wrapper component that handles loading and error states for data fetching
 * Use this component to wrap any component that fetches data
 */
export function DataFetchWrapper({
  isLoading,
  isError,
  error,
  children,
  onRetry,
  loadingMessage = 'Loading...',
  errorMessage,
  showLoadingIndicator = true,
  className = '',
}: DataFetchWrapperProps) {
  // Show loading state
  if (isLoading && showLoadingIndicator) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <ApiErrorMessage 
        error={{
          message: errorMessage || 'Failed to load data',
          isNetworkError: error?.isNetworkError || false,
          status: error?.status || null,
          code: error?.code || null
        }}
        onRetry={onRetry}
        className={className}
      />
    );
  }

  // Show children if not loading or error
  return <>{children}</>;
}