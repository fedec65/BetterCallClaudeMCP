/**
 * TAS/CAS Jurisprudence MCP Server - Rate Limiter
 * Enforces 10-second crawl delay per robots.txt
 */

import { CAS_CONSTANTS } from '../types.js';

/**
 * Rate limiter state
 */
interface RateLimiterState {
  lastRequestTime: number;
  queue: Array<{
    resolve: () => void;
    timestamp: number;
  }>;
  isProcessing: boolean;
}

/**
 * Rate limiter singleton for CAS website access
 * Respects robots.txt crawl-delay of 10 seconds
 */
export class RateLimiter {
  private static instance: RateLimiter;
  private state: RateLimiterState;
  private readonly delayMs: number;

  private constructor(delayMs: number = CAS_CONSTANTS.CRAWL_DELAY_MS) {
    this.delayMs = delayMs;
    this.state = {
      lastRequestTime: 0,
      queue: [],
      isProcessing: false
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Wait for a slot to become available
   * Returns a promise that resolves when it's safe to make a request
   */
  async waitForSlot(): Promise<void> {
    return new Promise(resolve => {
      this.state.queue.push({
        resolve,
        timestamp: Date.now()
      });

      this.processQueue();
    });
  }

  /**
   * Process the queue of waiting requests
   */
  private processQueue(): void {
    if (this.state.isProcessing || this.state.queue.length === 0) {
      return;
    }

    this.state.isProcessing = true;

    const processNext = async (): Promise<void> => {
      if (this.state.queue.length === 0) {
        this.state.isProcessing = false;
        return;
      }

      const now = Date.now();
      const elapsed = now - this.state.lastRequestTime;
      const waitTime = Math.max(0, this.delayMs - elapsed);

      if (waitTime > 0) {
        await this.delay(waitTime);
      }

      const next = this.state.queue.shift();
      if (next) {
        this.state.lastRequestTime = Date.now();
        next.resolve();
      }

      // Process next in queue
      if (this.state.queue.length > 0) {
        // Use setImmediate-like behavior to prevent stack overflow
        setTimeout(() => processNext(), 0);
      } else {
        this.state.isProcessing = false;
      }
    };

    processNext();
  }

  /**
   * Promise-based delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current state for debugging
   */
  getState(): { queueLength: number; lastRequestTime: number; delayMs: number } {
    return {
      queueLength: this.state.queue.length,
      lastRequestTime: this.state.lastRequestTime,
      delayMs: this.delayMs
    };
  }

  /**
   * Clear the queue (for testing or emergency situations)
   */
  clearQueue(): void {
    // Resolve all waiting requests
    while (this.state.queue.length > 0) {
      const next = this.state.queue.shift();
      if (next) {
        next.resolve();
      }
    }
    this.state.isProcessing = false;
  }
}

/**
 * Convenience function to get rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  return RateLimiter.getInstance();
}

/**
 * Decorator for rate-limited functions
 * Usage: @rateLimited async myFunction() { ... }
 */
export function rateLimited(
  _target: unknown,
  _propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: unknown[]): Promise<unknown> {
    await getRateLimiter().waitForSlot();
    return originalMethod.apply(this, args);
  };

  return descriptor;
}
