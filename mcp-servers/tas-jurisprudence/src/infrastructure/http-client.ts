/**
 * TAS/CAS Jurisprudence MCP Server - HTTP Client
 * Fetch wrapper with timeout and custom headers
 */

import { CAS_CONSTANTS } from '../types.js';

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  url: string;
}

/**
 * HTTP error class
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public body?: string
  ) {
    super(`HTTP ${status} ${statusText}: ${url}`);
    this.name = 'HttpError';
  }
}

/**
 * Configuration for HTTP requests
 */
export interface HttpRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string | Record<string, unknown>;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * HTTP client for making requests to CAS websites
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Headers;
  private readonly defaultTimeout: number;

  constructor(
    baseUrl: string = '',
    timeout: number = CAS_CONSTANTS.REQUEST_TIMEOUT_MS
  ) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
    this.defaultHeaders = new Headers({
      'User-Agent': CAS_CONSTANTS.USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    path: string,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...config, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    config?: HttpRequestConfig
  ): Promise<HttpResponse<T>> {
    return this.request<T>(path, {
      ...config,
      method: 'POST',
      body
    });
  }

  /**
   * Make a generic HTTP request
   */
  async request<T = unknown>(
    path: string,
    config: HttpRequestConfig = {}
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(path);
    const timeout = config.timeout ?? this.defaultTimeout;

    // Build headers
    const headers = new Headers(this.defaultHeaders);
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    // Build request options
    const options: RequestInit = {
      method: config.method ?? 'GET',
      headers,
      signal: config.signal
    };

    // Add body if present
    if (config.body) {
      if (typeof config.body === 'string') {
        options.body = config.body;
      } else {
        options.body = JSON.stringify(config.body);
        headers.set('Content-Type', 'application/json');
      }
    }

    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Use provided signal or timeout signal
    if (config.signal) {
      config.signal.addEventListener('abort', () => controller.abort());
    }
    options.signal = controller.signal;

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new HttpError(
          response.status,
          response.statusText,
          url,
          body
        );
      }

      // Determine response type
      const contentType = response.headers.get('content-type') || '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json() as T;
      } else {
        data = await response.text() as T;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        url: response.url
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HttpError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms: ${url}`);
        }
        throw new Error(`Network error: ${error.message}`);
      }

      throw error;
    }
  }

  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    if (this.baseUrl) {
      const baseUrl = this.baseUrl.endsWith('/')
        ? this.baseUrl.slice(0, -1)
        : this.baseUrl;
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${baseUrl}${normalizedPath}`;
    }

    return path;
  }
}

// ============================================================================
// Pre-configured Clients
// ============================================================================

/**
 * Client for CAS jurisprudence database
 */
export const jurisprudenceClient = new HttpClient(
  CAS_CONSTANTS.BASE_URL
);

/**
 * Client for CAS main website
 */
export const websiteClient = new HttpClient(
  'https://www.tas-cas.org'
);

/**
 * Client for fetching PDF files
 */
export const pdfClient = new HttpClient(
  '',
  30000 // Longer timeout for PDFs
);
