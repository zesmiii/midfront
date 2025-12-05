/**
 * GraphQL Error Codes
 */
export enum GraphQLErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_USER_INPUT = 'BAD_USER_INPUT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * GraphQL Error structure
 */
export interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
  };
}

/**
 * Extract error message from Apollo Client error
 */
export function extractErrorMessage(error: any): string {
  // Check for GraphQL errors
  if (error.graphQLErrors && Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0) {
    return error.graphQLErrors[0].message || 'An error occurred';
  }

  // Check for network error
  if (error.networkError) {
    if (error.networkError.statusCode === 401) {
      return 'Unauthorized. Please login again.';
    }
    if (error.networkError.statusCode === 403) {
      return 'Access forbidden. You do not have permission to perform this action.';
    }
    return error.networkError.message || 'Network error. Please check your connection.';
  }

  // Check for direct message
  if (error.message) {
    // Handle CombinedGraphQLErrors format
    if (error.message.includes('CombinedGraphQLErrors:')) {
      const match = error.message.match(/CombinedGraphQLErrors:\s*(.+)/i);
      return match ? match[1].trim() : error.message;
    }
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get error code from Apollo Client error
 */
export function getErrorCode(error: any): GraphQLErrorCode | null {
  if (error.graphQLErrors && Array.isArray(error.graphQLErrors) && error.graphQLErrors.length > 0) {
    const code = error.graphQLErrors[0].extensions?.code;
    if (code && Object.values(GraphQLErrorCode).includes(code as GraphQLErrorCode)) {
      return code as GraphQLErrorCode;
    }
  }

  if (error.networkError) {
    if (error.networkError.statusCode === 401) {
      return GraphQLErrorCode.UNAUTHENTICATED;
    }
    if (error.networkError.statusCode === 403) {
      return GraphQLErrorCode.FORBIDDEN;
    }
  }

  return null;
}

/**
 * Check if error is authentication related
 */
export function isAuthenticationError(error: any): boolean {
  const code = getErrorCode(error);
  return code === GraphQLErrorCode.UNAUTHENTICATED;
}

/**
 * Check if error is forbidden
 */
export function isForbiddenError(error: any): boolean {
  const code = getErrorCode(error);
  return code === GraphQLErrorCode.FORBIDDEN;
}

/**
 * Handle error and return user-friendly message
 */
export function handleError(error: any): {
  message: string;
  code: GraphQLErrorCode | null;
  shouldLogout: boolean;
} {
  const message = extractErrorMessage(error);
  const code = getErrorCode(error);
  const shouldLogout = isAuthenticationError(error);

  return {
    message,
    code,
    shouldLogout,
  };
}

