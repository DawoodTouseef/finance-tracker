import { useState, useCallback } from 'react';
import { useApiErrorHandler } from './useApiErrorHandler';

type ApiRequestStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseApiRequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  errorMessage?: string;
  showErrorToast?: boolean;
  logErrorToConsole?: boolean;
}

/**
 * Custom hook for making API requests with consistent error handling and loading states
 * 
 * @param apiFunction The API function to call
 * @param options Configuration options
 * @returns Object with request state, data, error, and execute function
 */
export function useApiRequest<T, P extends any[]>(
  apiFunction: (...args: P) => Promise<T>,
  options: UseApiRequestOptions<T> = {}
) {
  const [status, setStatus] = useState<ApiRequestStatus>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const { handleError } = useApiErrorHandler();

  const {
    onSuccess,
    onError,
    errorMessage = 'Failed to complete request',
    showErrorToast = true,
    logErrorToConsole = true,
  } = options;

  const execute = useCallback(
    async (...args: P) => {
      setStatus('loading');
      setError(null);
      
      try {
        const result = await apiFunction(...args);
        setData(result);
        setStatus('success');
        onSuccess?.(result);
        return result;
      } catch (err) {
        setError(err);
        setStatus('error');
        
        // Handle the error with our custom error handler
        handleError(err, errorMessage, {
          showToast: showErrorToast,
          logToConsole: logErrorToConsole,
          retryCallback: () => execute(...args)
        });
        
        onError?.(err);
        throw err;
      }
    },
    [apiFunction, onSuccess, onError, errorMessage, showErrorToast, logErrorToConsole, handleError]
  );

  return {
    execute,
    status,
    data,
    error,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    reset: useCallback(() => {
      setStatus('idle');
      setData(null);
      setError(null);
    }, [])
  };
}