import { AutoRiaApiError, AutoRiaApiResponse } from './autoria.types';

/**
 * Centralized error handler for AutoRia API
 * Based on existing project patterns but specialized for AutoRia endpoints
 */
export class AutoRiaErrorHandler {
  private static instance: AutoRiaErrorHandler;
  
  private constructor() {}
  
  static getInstance(): AutoRiaErrorHandler {
    if (!AutoRiaErrorHandler.instance) {
      AutoRiaErrorHandler.instance = new AutoRiaErrorHandler();
    }
    return AutoRiaErrorHandler.instance;
  }

  /**
   * Handle HTTP errors with AutoRia-specific logic
   */
  async handleHttpError(response: Response, endpoint: string): Promise<AutoRiaApiError> {
    const status = response.status;
    let errorMessage = `HTTP ${status}: ${response.statusText}`;
    let errorCode = `HTTP_${status}`;
    let details: any = null;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      errorCode = errorData.code || errorCode;
      details = errorData.details;
    } catch {
      // If JSON parsing fails, use default error message
    }

    console.error(`[AutoRiaErrorHandler] ${endpoint} failed:`, {
      status,
      message: errorMessage,
      code: errorCode,
      details
    });

    // AutoRia-specific error handling
    switch (status) {
      case 401:
        return this.handleAuthError(endpoint, errorMessage);
      case 403:
        return this.handlePermissionError(endpoint, errorMessage);
      case 404:
        return this.handleNotFoundError(endpoint, errorMessage);
      case 422:
        return this.handleValidationError(endpoint, errorMessage, details);
      case 429:
        return this.handleRateLimitError(endpoint, errorMessage);
      case 500:
        return this.handleServerError(endpoint, errorMessage);
      default:
        return this.handleGenericError(status, errorMessage, errorCode);
    }
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(endpoint: string, message: string): AutoRiaApiError {
    console.log(`[AutoRiaErrorHandler] Auth error for ${endpoint}, attempting token refresh...`);
    
    // Try to refresh tokens
    this.attemptTokenRefresh().then(success => {
      if (!success) {
        console.log(`[AutoRiaErrorHandler] Token refresh failed, redirecting to login...`);
        this.redirectToLogin();
      }
    });

    return {
      code: 'AUTH_ERROR',
      message: 'Authentication failed. Please log in again.',
      status: 401
    };
  }

  /**
   * Handle permission errors
   */
  private handlePermissionError(endpoint: string, message: string): AutoRiaApiError {
    console.log(`[AutoRiaErrorHandler] Permission denied for ${endpoint}`);
    
    return {
      code: 'PERMISSION_DENIED',
      message: 'You do not have permission to perform this action.',
      status: 403
    };
  }

  /**
   * Handle not found errors
   */
  private handleNotFoundError(endpoint: string, message: string): AutoRiaApiError {
    console.log(`[AutoRiaErrorHandler] Resource not found: ${endpoint}`);
    
    return {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      status: 404
    };
  }

  /**
   * Handle validation errors
   */
  private handleValidationError(endpoint: string, message: string, details: any): AutoRiaApiError {
    console.log(`[AutoRiaErrorHandler] Validation error for ${endpoint}:`, details);
    
    return {
      code: 'VALIDATION_ERROR',
      message: message || 'Validation failed. Please check your input.',
      details,
      status: 422
    };
  }

  /**
   * Handle rate limit errors
   */
  private handleRateLimitError(endpoint: string, message: string): AutoRiaApiError {
    console.log(`[AutoRiaErrorHandler] Rate limit exceeded for ${endpoint}`);
    
    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      status: 429
    };
  }

  /**
   * Handle server errors
   */
  private handleServerError(endpoint: string, message: string): AutoRiaApiError {
    console.log(`[AutoRiaErrorHandler] Server error for ${endpoint}`);
    
    return {
      code: 'SERVER_ERROR',
      message: 'Internal server error. Please try again later.',
      status: 500
    };
  }

  /**
   * Handle generic errors
   */
  private handleGenericError(status: number, message: string, code: string): AutoRiaApiError {
    return {
      code,
      message,
      status
    };
  }

  /**
   * Attempt to refresh authentication tokens
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      // Use existing token refresh logic from the project
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('[AutoRiaErrorHandler] Token refresh successful');
        return true;
      } else {
        console.log('[AutoRiaErrorHandler] Token refresh failed');
        return false;
      }
    } catch (error) {
      console.error('[AutoRiaErrorHandler] Token refresh error:', error);
      return false;
    }
  }

  /**
   * Redirect to login page with callback URL
   */
  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(currentUrl)}&error=session_expired`;
    }
  }

  /**
   * Create a standardized error response
   */
  createErrorResponse<T>(error: AutoRiaApiError): AutoRiaApiResponse<T> {
    return {
      success: false,
      error: error.message,
      status: error.status
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: AutoRiaApiError): boolean {
    const retryableCodes = ['SERVER_ERROR', 'RATE_LIMIT_EXCEEDED'];
    const retryableStatuses = [500, 502, 503, 504, 429];
    
    return retryableCodes.includes(error.code) || retryableStatuses.includes(error.status);
  }

  /**
   * Get retry delay based on error type
   */
  getRetryDelay(error: AutoRiaApiError, attempt: number): number {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      // Exponential backoff for rate limits
      return Math.min(1000 * Math.pow(2, attempt), 30000);
    }
    
    // Standard exponential backoff
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }
}


