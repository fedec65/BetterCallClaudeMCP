/**
 * TAS/CAS Jurisprudence MCP Server - Rate Limiter
 * Respects robots.txt crawl-delay of 10 seconds
 */

import { delay } from '../utils.js';

/**
 * Rate limiter with configurable minimum interval
 * Uses a queue-based approach to ensure requests are spaced appropriately
 */
export class RateLimiter {
  private lastRequestTime: number = 0;
  private minInterval: number;
  private queue: Array<() => void> = [];
  private processing: boolean = false;
  private maxConcurrent: number;
  private activeCount: number = 0;

  constructor(minIntervalMs: number = 10000, maxConcurrent: number = 1) {
    this.minInterval = minIntervalMs;
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Wait for a slot to become available
   * Returns a promise that resolves when it's safe to make a request
   */
  async waitForSlot(): Promise<void> {
    // If we're under the concurrent limit and enough time has passed, proceed immediately
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.activeCount < this.maxConcurrent && timeSinceLastRequest >= this.minInterval) {
      this.lastRequestTime = now;
      this.activeCount++;
      return;
    }

    // Otherwise, queue the request
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.lastRequestTime = Date.now();
        this.activeCount++;
        resolve();
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Release a slot after a request is complete
   */
  releaseSlot(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    
    if (!this.processing && this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Process the queue of waiting requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Wait if we haven't reached the minimum interval
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        await delay(waitTime);
      }

      // Process the next request in queue
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }

    this.processing = false;
  }

  /**
   * Get the number of requests waiting in queue
   */
  get queueLength(): number {
    return this.queue.length;
  }

  /**
   * Get the number of active requests
   */
  get activeRequests(): number {
    return this.activeCount;
  }

  /**
   * Clear the queue and reset state
   */
  clear(): void {
    this.queue = [];
    this.activeCount = 0;
    this.processing = false;
  }
}

// ============================================================================
// Singleton Rate Limiter Instances
// ============================================================================

/**
 * Main rate limiter for jurisprudence.tas-cas.org
 * Respects 10-second crawl-delay from robots.txt
 */
export const jurisprudenceRateLimiter = new RateLimiter(10000, 1);

/**
 * Rate limiter for tas-cas.org (recent decisions, etc.)
 * More lenient - 2 second delay
 */
export const tasCasRateLimiter = new RateLimiter(2000, 1);

/**
 * Execute a function with rate limiting
 * Automatically handles slot acquisition and release
 */
export async function withRateLimit<T>(
  limiter: RateLimiter,
  fn: () => Promise<T>
): Promise<T> {
  await limiter.waitForSlot();
  try {
    return await fn();
  } finally {
    limiter.releaseSlot();
  }
}
