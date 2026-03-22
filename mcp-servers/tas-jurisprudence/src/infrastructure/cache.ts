/**
 * TAS/CAS Jurisprudence MCP Server - Cache Infrastructure
 * Simple Map-based TTL cache for search results and awards
 */

import { CAS_CONSTANTS, CacheEntry } from '../types.js';

/**
 * Generic TTL Cache implementation
 */
export class Cache<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTtl: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(defaultTtl: number = CAS_CONSTANTS.CACHE_TTL.SEARCH) {
    this.defaultTtl = defaultTtl;

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get a cached value
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set a cached value with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ============================================================================
// Cache Instances
// ============================================================================

/**
 * Cache for search results (10 min TTL)
 */
export const searchCache = new Cache<any>(CAS_CONSTANTS.CACHE_TTL.SEARCH);

/**
 * Cache for award details (30 min TTL)
 */
export const awardCache = new Cache<any>(CAS_CONSTANTS.CACHE_TTL.AWARD);

/**
 * Cache for recent decisions (5 min TTL)
 */
export const recentCache = new Cache<any>(CAS_CONSTANTS.CACHE_TTL.RECENT);

// ============================================================================
// Cache Key Generators
// ============================================================================

/**
 * Generate cache key for search queries
 */
export function searchCacheKey(params: {
  query: string;
  sport?: string;
  year_from?: number;
  year_to?: number;
  procedure_type?: string;
  page: number;
  page_size: number;
}): string {
  const parts = [
    `q:${params.query}`,
    params.sport ? `s:${params.sport}` : '',
    params.year_from ? `yf:${params.year_from}` : '',
    params.year_to ? `yt:${params.year_to}` : '',
    params.procedure_type ? `pt:${params.procedure_type}` : '',
    `p:${params.page}`,
    `ps:${params.page_size}`
  ].filter(Boolean);

  return `search:${parts.join('|')}`;
}

/**
 * Generate cache key for award details
 */
export function awardCacheKey(caseNumber: string, includeFullText: boolean): string {
  return `award:${caseNumber}:${includeFullText ? 'full' : 'meta'}`;
}

/**
 * Generate cache key for recent decisions
 */
export function recentCacheKey(limit: number): string {
  return `recent:${limit}`;
}

/**
 * Generate cache key for browse by sport
 */
export function sportCacheKey(sport: string, page: number, procedureType?: string): string {
  return `sport:${sport}:${page}:${procedureType || 'all'}`;
}
