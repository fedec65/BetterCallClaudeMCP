/**
 * TAS/CAS Jurisprudence MCP Server - HTTP Client
 * Fetch wrapper with timeout and proper headers
 */

import { DEFAULT_SCRAPER_CONFIG } from '../types.js';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  timeout?: number;
  userAgent?: string;
  headers?: Record<string, string>;
}

/**
 * HTTP error class
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Create a fetch request with timeout and default headers
 */
export async function httpFetch(
  url: string,
  config: HttpClientConfig = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_SCRAPER_CONFIG.timeout,
    userAgent = DEFAULT_SCRAPER_CONFIG.userAgent,
    headers: customHeaders = {}
  } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    ...customHeaders
  };

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new HttpError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        url
      );
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(
        `Request timed out after ${timeout}ms`,
        408,
        url
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch and return text content
 */
export async function fetchText(
  url: string,
  config: HttpClientConfig = {}
): Promise<string> {
  const response = await httpFetch(url, config);
  return response.text();
}

/**
 * Fetch and return JSON content
 */
export async function fetchJson<T>(
  url: string,
  config: HttpClientConfig = {}
): Promise<T> {
  const response = await httpFetch(url, {
    ...config,
    headers: {
      ...config.headers,
      'Accept': 'application/json'
    }
  });
  return response.json() as Promise<T>;
}

/**
 * Check if a URL is accessible
 */
export async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await httpFetch(url, { timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}
