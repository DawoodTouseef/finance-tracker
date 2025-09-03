import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useApiErrorHandler } from './useApiErrorHandler';
import { ErrorDetails } from './useEnhancedQuery';

/**
 * Enhanced version of React Query's useMutation hook with better error handling
 * 
 * @param mutationFn The mutation function that returns a promise
 * @param options Additional React Query options
 * @returns Enhanced UseMutationResult with additional error handling
 */
export function useEnhancedMutation<TData, TError, TVariables, TContext>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
    errorMessage?: string;
    showErrorToast?: boolean;
  }
): UseMutationResult<TData, TError, TVariables, TContext> & { errorDetails: ErrorDetails | null } {
  const { handleError } = useApiErrorHandler();
  const { errorMessage = 'Failed to complete operation', showErrorToast = true, ...mutationOptions } = options || {};

  // Use React Query's useMutation with our custom error handling
  const result = useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...mutationOptions,
    onError: (error, variables, context) => {
      // Process the error with our custom handler
      const errorDetails = handleError(error, errorMessage, {
        showToast: showErrorToast,
        retryCallback: () => result.mutate(variables, { onSuccess: mutationOptions?.onSuccess })
      });

      // Call the original onError if provided
      if (mutationOptions?.onError) {
        mutationOptions.onError(error, variables, context);
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