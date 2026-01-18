import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  maxSize: number;
  ttlMs: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Generic LRU cache wrapper for Swiss legal data
 * Default TTL: 5 minutes for search results, 15 minutes for static data
 */
export class LegalCache<T> {
  private cache: LRUCache<string, CacheEntry<T>>;
  private ttlMs: number;

  constructor(options: CacheOptions = { maxSize: 500, ttlMs: 5 * 60 * 1000 }) {
    this.ttlMs = options.ttlMs;
    this.cache = new LRUCache<string, CacheEntry<T>>({
      max: options.maxSize,
      ttl: options.ttlMs,
    });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Double-check TTL (belt and suspenders)
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * Generate a cache key from query parameters
   */
  static generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .filter(k => params[k] !== undefined && params[k] !== null)
      .map(k => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }
}

// Pre-configured cache instances
export const searchCache = new LegalCache<unknown>({ maxSize: 500, ttlMs: 5 * 60 * 1000 }); // 5 min
export const citationCache = new LegalCache<unknown>({ maxSize: 1000, ttlMs: 15 * 60 * 1000 }); // 15 min
export const statuteCache = new LegalCache<unknown>({ maxSize: 200, ttlMs: 60 * 60 * 1000 }); // 1 hour
