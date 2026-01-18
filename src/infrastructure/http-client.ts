import axios, { AxiosInstance, AxiosError } from 'axios';
import pRetry from 'p-retry';
import { withRateLimit } from './rate-limiter.js';

export interface HttpClientOptions {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Create a configured HTTP client for Swiss legal APIs
 */
export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  return axios.create({
    timeout: options.timeout ?? 30000, // 30 second default timeout
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'BetterCallClaude-MCP/1.0.0 (Swiss Legal Intelligence)',
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Execute an HTTP request with retry logic and rate limiting
 */
export async function fetchWithRetry<T>(
  api: string,
  fn: () => Promise<T>,
  options: { retries?: number; onRetry?: (error: Error, attempt: number) => void } = {}
): Promise<T> {
  const { retries = 3, onRetry } = options;

  return pRetry(
    () => withRateLimit(api, fn),
    {
      retries,
      onFailedAttempt: (error) => {
        if (onRetry) {
          onRetry(error, error.attemptNumber);
        }
        // Log retry attempts
        console.error(
          `API ${api} request failed (attempt ${error.attemptNumber}/${retries + 1}):`,
          error.message
        );
      },
      shouldRetry: (error) => {
        // Retry on network errors or 5xx server errors
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          return !status || status >= 500 || status === 429;
        }
        return true;
      },
    }
  );
}

/**
 * Parse error response into a standardized format
 */
export function parseApiError(error: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (error instanceof AxiosError) {
    const status = error.response?.status;

    if (status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'API rate limit exceeded. Please try again later.',
        retryable: true,
      };
    }

    if (status === 408 || error.code === 'ECONNABORTED') {
      return {
        code: 'API_TIMEOUT',
        message: 'API request timed out. Please try again.',
        retryable: true,
      };
    }

    if (!status || status >= 500) {
      return {
        code: 'API_UNAVAILABLE',
        message: `API service unavailable: ${error.message}`,
        retryable: true,
      };
    }

    return {
      code: 'API_UNAVAILABLE',
      message: error.message,
      retryable: false,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    retryable: false,
  };
}

// Pre-configured clients for each API
export const bundesgerichtClient = createHttpClient({
  baseURL: 'https://www.bger.ch',
  timeout: 30000,
});

export const entscheidsuche = createHttpClient({
  baseURL: 'https://entscheidsuche.ch',
  timeout: 30000,
});

export const fedlexClient = createHttpClient({
  baseURL: 'https://fedlex.data.admin.ch',
  timeout: 45000, // SPARQL queries can be slow
  headers: {
    'Accept': 'application/sparql-results+json',
  },
});
