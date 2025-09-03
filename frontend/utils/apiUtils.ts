/**
 * Utility functions for API requests
 */

/**
 * Creates a promise that rejects after a specified timeout
 * @param ms Timeout in milliseconds
 * @returns A promise that rejects after the specified timeout
 */
export function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Wraps a fetch promise with a timeout
 * @param promise The fetch promise
 * @param timeoutMs Timeout in milliseconds
 * @returns A promise that resolves with the fetch result or rejects with a timeout error
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs)
  ]);
}

/**
 * Adds retry functionality to a promise
 * @param fn Function that returns a promise
 * @param retries Number of retries
 * @param delay Delay between retries in milliseconds
 * @param shouldRetry Function that determines if a retry should be attempted based on the error
 * @returns A promise that resolves with the result or rejects after all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  shouldRetry: (error: any) => boolean = () => true
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Don't retry if we're out of retries or if shouldRetry returns false
    if (retries <= 0 || !shouldRetry(error)) {
      throw error;
    }
    
    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with one less retry and exponential backoff
    return withRetry(fn, retries - 1, delay * 2, shouldRetry);
  }
}

/**
 * Default shouldRetry function that retries on network errors and 5xx errors
 * @param error The error to check
 * @returns True if the error should trigger a retry, false otherwise
 */
export function defaultShouldRetry(error: any): boolean {
  // Retry on network errors
  if (error instanceof TypeError && (
    error.message.includes('Failed to fetch') ||
    error.message.includes('Network request failed') ||
    error.message.includes('Network error')
  )) {
    return true;
  }
  
  // Retry on timeout errors
  if (error.message && error.message.includes('timed out')) {
    return true;
  }
  
  // Retry on 5xx errors
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }
  
  return false;
}