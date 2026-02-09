export interface ApiErrorResponse {
  error: {
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}

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

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string' &&
    ('statusCode' in error || 'code' in error || 'response' in error)
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.response?.data?.error?.message || error.message || 'An error occurred';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
