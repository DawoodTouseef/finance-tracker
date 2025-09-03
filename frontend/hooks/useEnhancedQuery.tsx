import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useApiErrorHandler } from './useApiErrorHandler';

/**
 * Enhanced version of React Query's useQuery hook with better error handling
 * 
 * @param queryKey The query key for React Query
 * @param queryFn The query function that returns a promise
 * @param options Additional React Query options
 * @returns Enhanced UseQueryResult with additional error handling
 */
// Define the error details type for consistency
export interface ErrorDetails {
  message: string;
  isNetworkError: boolean;
  status: number | null;
  retry: (() => void) | undefined;
  code: string | null;
}

export function useEnhancedQuery<TData, TError = unknown>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, unknown[]>, 'queryKey' | 'queryFn'> & {
    errorMessage?: string;
    showErrorToast?: boolean;
  }
): UseQueryResult<TData, TError> & { errorDetails: ErrorDetails | null } {
  const { handleError } = useApiErrorHandler();
  const { errorMessage = 'Failed to fetch data', showErrorToast = true, ...queryOptions } = options || {};

  // Use React Query's useQuery with our custom error handling
  const result = useQuery<TData, TError, TData, unknown[]>({
    queryKey,
    queryFn,
    ...queryOptions,
    onError: (error) => {
      // Process the error with our custom handler
      handleError(error, errorMessage, {
        showToast: showErrorToast,
        retryCallback: () => result.refetch()
      });

      // Call the original onError if provided
      if (queryOptions?.onError) {
        queryOptions.onError(error);
      }
    },
  });

  // Add processed error details if there's an error
  const errorDetails = result.error
    ? handleError(result.error, errorMessage, { showToast: false, logToConsole: false })
    : null;

  return {
    ...result,
    errorDetails,
  };
}