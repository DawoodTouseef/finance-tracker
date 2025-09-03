import React from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ApiErrorMessageProps {
  error: {
    message: string;
    isNetworkError: boolean;
    status?: number | null;
    code?: string | null;
  } | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Component to display API errors in a consistent way across the application
 */
export function ApiErrorMessage({ error, onRetry, className = '' }: ApiErrorMessageProps) {
  if (!error) return null;

  const { message, isNetworkError, status, code } = error;
  
  // Determine icon based on error type
  const Icon = isNetworkError ? WifiOff : AlertCircle;
  
  // Determine title based on error type
  let title = isNetworkError ? 'Network Error' : 'Error';
  
  // Add status code if available
  if (status) {
    title += ` (${status})`;
  }
  
  // Add error code if available
  if (code) {
    title += ` - ${code}`;
  }

  return (
    <Alert variant="destructive" className={`${className}`}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{message}</p>
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="self-start mt-2 flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Retry</span>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}