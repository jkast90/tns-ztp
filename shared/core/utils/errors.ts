// Error handling utilities - platform agnostic

/**
 * Extracts a human-readable error message from an unknown error type.
 * Works with Error objects, strings, and falls back to a default message.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred'
): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

/**
 * Parses an API error response and extracts relevant information.
 * Handles various error formats from fetch/axios responses.
 */
export interface ParsedApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export function parseApiError(error: unknown): ParsedApiError {
  // Handle Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  // Handle object with message property
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    const errObj = error as Record<string, unknown>;
    return {
      message: errObj.message as string,
      code: typeof errObj.code === 'string' ? errObj.code : undefined,
      statusCode: typeof errObj.statusCode === 'number' ? errObj.statusCode : undefined,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
}
