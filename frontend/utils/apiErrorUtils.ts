/**
 * Utility functions for handling API errors consistently across the application
 */

import { APIError as ClientAPIError, ErrCode } from '../client';

// Types for API errors
export interface APIErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Re-export the client's APIError type for convenience
export type APIError = ClientAPIError;

/**
 * Check if an error is a client API error
 */
export function isClientAPIError(error: any): error is ClientAPIError {
  return error instanceof Error && 
         error.name === 'APIError' && 
         typeof error.status === 'number' && 
         typeof error.code === 'string';
}

/**
 * Check if an error is a network error (offline, timeout, etc.)
 */
export function isNetworkError(error: any): boolean {
  // First check if it's our enhanced APIError with isNetworkError property
  if (isClientAPIError(error) && error.isNetworkError) {
    return true;
  }
  
  // DOMException is thrown when a request is aborted due to network issues
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  
  // TypeError is often thrown for network errors like CORS or when the server is unreachable
  if (error instanceof TypeError && error.message.includes('network')) {
    return true;
  }

  // Check if we're offline
  if (!navigator.onLine) {
    return true;
  }

  // Check for timeout errors
  if (error.message && (
    error.message.includes('timeout') ||
    error.message.includes('timed out')
  )) {
    return true;
  }

  return false;
}

/**
 * Check if an error is an API error with a specific status code
 */
export function isApiErrorWithStatus(error: any, status: number): boolean {
  return error && typeof error.status === 'number' && error.status === status;
}

/**
 * Extract a user-friendly error message from an API error
 */
export function extractErrorMessage(error: any, fallbackMessage: string = 'An unexpected error occurred'): string {
  // Handle network errors
  if (isNetworkError(error)) {
    return navigator.onLine 
      ? 'Network request failed. Please check your connection and try again.'
      : 'You are currently offline. Please check your internet connection.';
  }

  // Handle our enhanced APIError
  if (isClientAPIError(error)) {
    // For timeout errors
    if (error.code === ErrCode.DeadlineExceeded) {
      return 'Request timed out. Please try again.';
    }
    
    // For server errors
    if (error.status >= 500) {
      return 'The server encountered an error. Please try again later.';
    }
    
    // For authentication errors
    if (error.status === 401) {
      return 'Authentication required. Please log in and try again.';
    }
    
    // For forbidden errors
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    
    // For not found errors
    if (error.status === 404) {
      return 'The requested resource was not found.';
    }
    
    // For bad request errors
    if (error.status === 400) {
      return `Invalid request: ${error.message}`;
    }
    
    // Use the message from the error
    return error.message;
  }

  // Handle API errors with structured response
  if (error?.data?.error?.message) {
    return error.data.error.message;
  }

  // Handle errors with status text
  if (error?.status && error?.statusText) {
    return `${error.statusText} (${error.status})`;
  }

  // Handle plain error objects with message
  if (error?.message) {
    return error.message;
  }

  // Fallback for unknown error formats
  return fallbackMessage;
}

/**
 * Get appropriate action based on error type
 */
export function getErrorAction(error: any): { label: string; onClick: () => void } | null {
  // For network errors, provide a retry action
  if (isNetworkError(error)) {
    return {
      label: 'Retry',
      onClick: () => window.location.reload()
    };
  }

  // For timeout errors, provide a retry action
  if (isClientAPIError(error) && error.code === ErrCode.DeadlineExceeded) {
    return {
      label: 'Retry',
      onClick: () => window.location.reload()
    };
  }

  // For 401 Unauthorized errors, provide a login action
  if (isApiErrorWithStatus(error, 401)) {
    return {
      label: 'Login',
      onClick: () => {
        // Redirect to login page or trigger auth flow
        window.location.href = '/';
      }
    };
  }

  // For 403 Forbidden errors
  if (isApiErrorWithStatus(error, 403)) {
    return {
      label: 'Go to Dashboard',
      onClick: () => {
        window.location.href = '/';
      }
    };
  }

  // For 404 Not Found errors
  if (isApiErrorWithStatus(error, 404)) {
    return {
      label: 'Go to Dashboard',
      onClick: () => {
        window.location.href = '/';
      }
    };
  }

  // For 500 Server errors
  if (isApiErrorWithStatus(error, 500)) {
    return {
      label: 'Try Again Later',
      onClick: () => {
        window.location.reload();
      }
    };
  }

  return null;
}