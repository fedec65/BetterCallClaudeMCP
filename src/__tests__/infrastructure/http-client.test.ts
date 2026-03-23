import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  createHttpClient,
  fetchWithRetry,
  parseApiError,
  bundesgerichtClient,
  entscheidsuche,
  fedlexClient,
} from '../../infrastructure/http-client.js';

// Mock rate-limiter
vi.mock('../../infrastructure/rate-limiter.js', () => ({
  withRateLimit: vi.fn((api: string, fn: () => Promise<unknown>) => fn()),
}));

describe('HTTP Client', () => {
  describe('createHttpClient', () => {
    it('should create client with default options', () => {
      const client = createHttpClient();

      expect(client).toBeDefined();
      expect(client.defaults.timeout).toBe(30000);
      expect(client.defaults.headers['Accept']).toBe('application/json');
      expect(client.defaults.headers['User-Agent']).toContain('BetterCallClaude-MCP');
    });

    it('should create client with custom timeout', () => {
      const client = createHttpClient({ timeout: 60000 });

      expect(client.defaults.timeout).toBe(60000);
    });

    it('should create client with custom baseURL', () => {
      const client = createHttpClient({ baseURL: 'https://api.example.com' });

      expect(client.defaults.baseURL).toBe('https://api.example.com');
    });

    it('should create client with custom headers', () => {
      const client = createHttpClient({
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token',
        },
      });

      expect(client.defaults.headers['X-Custom-Header']).toBe('custom-value');
      expect(client.defaults.headers['Authorization']).toBe('Bearer token');
    });

    it('should merge custom headers with defaults', () => {
      const client = createHttpClient({
        headers: {
          'X-Custom': 'value',
        },
      });

      // Default headers should still be present
      expect(client.defaults.headers['Accept']).toBe('application/json');
      expect(client.defaults.headers['User-Agent']).toContain('BetterCallClaude-MCP');
      // Custom header should be added
      expect(client.defaults.headers['X-Custom']).toBe('value');
    });

    it('should allow overriding default headers', () => {
      const client = createHttpClient({
        headers: {
          'Accept': 'application/xml',
        },
      });

      expect(client.defaults.headers['Accept']).toBe('application/xml');
    });
  });

  describe('fetchWithRetry', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should execute function and return result on success', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' });

      const result = await fetchWithRetry('generic', mockFn);

      expect(result).toEqual({ data: 'test' });
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ data: 'success' });

      const result = await fetchWithRetry('generic', mockFn, { retries: 3 });

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(fetchWithRetry('generic', mockFn, { retries: 2 }))
        .rejects.toThrow('Persistent failure');

      // Initial call + 2 retries = 3 total
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback on failure', async () => {
      const onRetry = vi.fn();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Retry error'))
        .mockResolvedValueOnce({ data: 'success' });

      await fetchWithRetry('generic', mockFn, { retries: 3, onRetry });

      expect(onRetry).toHaveBeenCalled();
    });

    it('should use rate limiter for requests', async () => {
      const { withRateLimit } = await import('../../infrastructure/rate-limiter.js');
      const mockFn = vi.fn().mockResolvedValue({ data: 'test' });

      await fetchWithRetry('bundesgericht', mockFn);

      expect(withRateLimit).toHaveBeenCalledWith('bundesgericht', expect.any(Function));
    });

    it('should handle async functions correctly', async () => {
      const asyncFn = async () => {
        return new Promise<{ data: string }>((resolve) => {
          setTimeout(() => resolve({ data: 'async result' }), 10);
        });
      };

      const result = await fetchWithRetry('generic', asyncFn);

      expect(result).toEqual({ data: 'async result' });
    });

    it('should retry on 5xx errors', async () => {
      const axiosError = new AxiosError('Server Error');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const mockFn = vi.fn()
        .mockRejectedValueOnce(axiosError)
        .mockResolvedValueOnce({ data: 'recovered' });

      const result = await fetchWithRetry('generic', mockFn, { retries: 2 });

      expect(result).toEqual({ data: 'recovered' });
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit errors', async () => {
      const axiosError = new AxiosError('Too Many Requests');
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const mockFn = vi.fn()
        .mockRejectedValueOnce(axiosError)
        .mockResolvedValueOnce({ data: 'recovered' });

      const result = await fetchWithRetry('generic', mockFn, { retries: 2 });

      expect(result).toEqual({ data: 'recovered' });
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const axiosError = new AxiosError('Not Found');
      axiosError.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const mockFn = vi.fn().mockRejectedValue(axiosError);

      await expect(fetchWithRetry('generic', mockFn, { retries: 2 }))
        .rejects.toThrow();

      // Should not retry 404 errors
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('parseApiError', () => {
    it('should parse 429 rate limit error', () => {
      const axiosError = new AxiosError('Too Many Requests');
      axiosError.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.retryable).toBe(true);
    });

    it('should parse 408 timeout error', () => {
      const axiosError = new AxiosError('Request Timeout');
      axiosError.response = {
        status: 408,
        statusText: 'Request Timeout',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.code).toBe('API_TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should parse ECONNABORTED as timeout', () => {
      const axiosError = new AxiosError('Request aborted');
      axiosError.code = 'ECONNABORTED';

      const result = parseApiError(axiosError);

      expect(result.code).toBe('API_TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should parse 5xx errors as API unavailable', () => {
      const axiosError = new AxiosError('Internal Server Error');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.code).toBe('API_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should parse 502 as API unavailable', () => {
      const axiosError = new AxiosError('Bad Gateway');
      axiosError.response = {
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.code).toBe('API_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should parse 503 as API unavailable', () => {
      const axiosError = new AxiosError('Service Unavailable');
      axiosError.response = {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.code).toBe('API_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should parse AxiosError without response status', () => {
      const axiosError = new AxiosError('Network Error');
      // No response attached

      const result = parseApiError(axiosError);

      expect(result.code).toBe('API_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should parse 4xx errors as not retryable', () => {
      const axiosError = new AxiosError('Bad Request');
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.retryable).toBe(false);
    });

    it('should parse 404 as not retryable', () => {
      const axiosError = new AxiosError('Not Found');
      axiosError.response = {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.retryable).toBe(false);
    });

    it('should parse non-AxiosError as internal error', () => {
      const genericError = new Error('Something went wrong');

      const result = parseApiError(genericError);

      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('should handle null/undefined errors', () => {
      const result = parseApiError(null);

      expect(result.code).toBe('INTERNAL_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('should include error message in response', () => {
      const axiosError = new AxiosError('Custom error message');
      axiosError.response = {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: null,
      };

      const result = parseApiError(axiosError);

      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    it('should handle error with response data message', () => {
      const axiosError = new AxiosError('Request failed');
      axiosError.response = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'Invalid parameters provided' },
      };

      const result = parseApiError(axiosError);

      expect(result.message).toBeDefined();
    });
  });

  describe('Pre-configured Clients', () => {
    describe('bundesgerichtClient', () => {
      it('should be defined', () => {
        expect(bundesgerichtClient).toBeDefined();
      });

      it('should have correct baseURL', () => {
        expect(bundesgerichtClient.defaults.baseURL).toBe('https://www.bger.ch');
      });

      it('should have timeout configured', () => {
        expect(bundesgerichtClient.defaults.timeout).toBe(30000);
      });

      it('should have default headers', () => {
        expect(bundesgerichtClient.defaults.headers['Accept']).toBe('application/json');
        expect(bundesgerichtClient.defaults.headers['User-Agent']).toContain('BetterCallClaude-MCP');
      });
    });

    describe('entscheidsuche', () => {
      it('should be defined', () => {
        expect(entscheidsuche).toBeDefined();
      });

      it('should have correct baseURL', () => {
        expect(entscheidsuche.defaults.baseURL).toBe('https://entscheidsuche.ch');
      });

      it('should have timeout configured', () => {
        expect(entscheidsuche.defaults.timeout).toBe(30000);
      });

      it('should have default headers', () => {
        expect(entscheidsuche.defaults.headers['Accept']).toBe('application/json');
      });
    });

    describe('fedlexClient', () => {
      it('should be defined', () => {
        expect(fedlexClient).toBeDefined();
      });

      it('should have correct baseURL', () => {
        expect(fedlexClient.defaults.baseURL).toBe('https://fedlex.data.admin.ch');
      });

      it('should have longer timeout for SPARQL queries', () => {
        expect(fedlexClient.defaults.timeout).toBe(45000);
      });

      it('should have SPARQL-specific Accept header', () => {
        expect(fedlexClient.defaults.headers['Accept']).toBe('application/sparql-results+json');
      });

      it('should have User-Agent header', () => {
        expect(fedlexClient.defaults.headers['User-Agent']).toContain('BetterCallClaude-MCP');
      });
    });
  });

  describe('Client Factory Integration', () => {
    it('should create independent client instances', () => {
      const client1 = createHttpClient({ baseURL: 'https://api1.example.com' });
      const client2 = createHttpClient({ baseURL: 'https://api2.example.com' });

      expect(client1.defaults.baseURL).toBe('https://api1.example.com');
      expect(client2.defaults.baseURL).toBe('https://api2.example.com');
      expect(client1).not.toBe(client2);
    });

    it('should allow creating clients for different APIs', () => {
      const legalClient = createHttpClient({
        baseURL: 'https://legal-api.ch',
        headers: { 'X-API-Version': '2.0' },
      });

      expect(legalClient.defaults.baseURL).toBe('https://legal-api.ch');
      expect(legalClient.defaults.headers['X-API-Version']).toBe('2.0');
    });
  });
});
