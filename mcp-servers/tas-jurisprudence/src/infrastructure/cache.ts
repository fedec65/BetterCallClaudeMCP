/**
 * TAS/CAS Jurisprudence MCP Server - Cache Infrastructure
 * Simple Map-based cache with TTL support
 */

import type { CacheEntry } from '../types.js';

/**
 * Simple TTL cache implementation
 */
export class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private defaultTtl: number;
  private maxSize: number;

  constructor(defaultTtlMs: number = 60000, maxSize: number = 100) {
    this.defaultTtl = defaultTtlMs;
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: T, ttlMs?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.defaultTtl
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ============================================================================
// Cache Instances with Different TTLs
// ============================================================================

/**
 * Search results cache - 10 minute TTL
 * Search results don't change frequently
 */
export const searchCache = new Cache<any>(10 * 60 * 1000, 50);

/**
 * Award details cache - 30 minute TTL
 * Award details are static once published
 */
export const awardCache = new Cache<any>(30 * 60 * 1000, 100);

/**
 * Recent decisions cache - 5 minute TTL
 * Recent decisions page changes more frequently
 */
export const recentCache = new Cache<any>(5 * 60 * 1000, 10);

/**
 * Sport browse cache - 15 minute TTL
 */
export const sportCache = new Cache<any>(15 * 60 * 1000, 50);

// Periodic cleanup interval (every 5 minutes)
setInterval(() => {
  searchCache.cleanup();
  awardCache.cleanup();
  recentCache.cleanup();
  sportCache.cleanup();
}, 5 * 60 * 1000);
