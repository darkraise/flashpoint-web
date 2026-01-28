/**
 * API Error Response Interface
 */
interface ApiErrorResponse {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

/**
 * Extract error message from API error response
 * @param error - The error object from API call
 * @param defaultMessage - Default message if error message cannot be extracted
 * @returns The error message string
 */
export function getApiErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred'
): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as ApiErrorResponse;
    return apiError.response?.data?.error?.message || defaultMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return defaultMessage;
}
