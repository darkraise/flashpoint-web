/**
 * API Error Types
 *
 * Standard error handling types for API responses.
 * Used throughout the application for consistent error handling.
 */

/**
 * Standard API error response structure from the backend
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}

/**
 * API error wrapper (typically from Axios)
 */
export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  request?: unknown;
  message: string;
  code?: string;
}

/**
 * Type guard to check if an error is an ApiError
 *
 * @param error - The error to check
 * @returns true if the error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Extract a user-friendly error message from any error type
 *
 * @param error - The error (can be any type)
 * @returns A string error message suitable for display to users
 */
export function getErrorMessage(error: unknown): string {
  // Try to extract API error message first
  if (isApiError(error)) {
    return error.response?.data?.error?.message || error.message || 'An error occurred';
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Fallback for unknown error types
  return String(error);
}
