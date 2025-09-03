import { useToast } from '@/components/ui/use-toast';
import { isNetworkError, extractErrorMessage, getErrorAction, isClientAPIError } from '@/utils/apiErrorUtils';
import { APIError } from '../client';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  retryCallback?: () => void;
}

/**
 * Custom hook for handling API errors consistently across the application
 * 
 * @returns Object with handleError function
 */
export function useApiErrorHandler() {
  const { toast } = useToast();

  /**
   * Handles API errors consistently across the application
   * 
   * @param error The error object from the API call
   * @param fallbackMessage Optional custom fallback message if error doesn't have one
   * @param options Additional options for error handling
   * @returns The processed error message and details
   */
  const handleError = (error: unknown, fallbackMessage = "An unexpected error occurred", options?: ErrorHandlerOptions) => {
    const { showToast = true, logToConsole = true, retryCallback } = options || {};
    
    // Extract user-friendly error message
    const message = extractErrorMessage(error, fallbackMessage);
    
    // Determine if this is a network error
    const isOfflineError = isNetworkError(error);
    
    // Get appropriate action based on error type
    let errorAction = getErrorAction(error);
    
    // If we have a retry callback, use it instead of the default action for network errors
    if (isOfflineError && retryCallback && !errorAction) {
      errorAction = {
        label: 'Retry',
        onClick: retryCallback
      };
    } else if (isOfflineError && retryCallback && errorAction) {
      // Override the default action with our retry callback
      errorAction = {
        ...errorAction,
        onClick: retryCallback
      };
    }
    
    // Log error to console if enabled
    if (logToConsole) {
      console.error('API Error:', error);
    }
    
    // Determine the toast title based on error type
    let title = 'Error';
    if (isOfflineError) {
      title = 'Network Error';
    } else if (isClientAPIError(error)) {
      if (error.status === 401) {
        title = 'Authentication Error';
      } else if (error.status === 403) {
        title = 'Permission Error';
      } else if (error.status === 404) {
        title = 'Not Found';
      } else if (error.status >= 500) {
        title = 'Server Error';
      }
    }
    
    // Show toast notification if enabled
    if (showToast) {
      toast({
        title,
        description: message,
        variant: 'destructive',
        action: errorAction
      });
    }
    
    // Return error details for potential use in UI
    return {
      message,
      isNetworkError: isOfflineError,
      status: isClientAPIError(error) ? error.status : null,
      retry: retryCallback,
      code: isClientAPIError(error) ? error.code : null
    };
  };

  return {
    handleError
  };
}