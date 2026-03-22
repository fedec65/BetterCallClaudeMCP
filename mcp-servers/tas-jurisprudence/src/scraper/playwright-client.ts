/**
 * TAS/CAS Jurisprudence MCP Server - Playwright Browser Client
 * Singleton browser instance management for JavaScript-rendered content
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { CAS_CONSTANTS } from '../types.js';

/**
 * Playwright browser client configuration
 */
interface PlaywrightConfig {
  headless: boolean;
  timeout: number;
  slowMo: number;
}

/**
 * Singleton Playwright browser manager
 */
export class PlaywrightClient {
  private static instance: PlaywrightClient;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: PlaywrightConfig;

  private constructor(config?: Partial<PlaywrightConfig>) {
    this.config = {
      headless: true,
      timeout: CAS_CONSTANTS.PAGE_TIMEOUT_MS,
      slowMo: 0,
      ...config
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<PlaywrightConfig>): PlaywrightClient {
    if (!PlaywrightClient.instance) {
      PlaywrightClient.instance = new PlaywrightClient(config);
    }
    return PlaywrightClient.instance;
  }

  /**
   * Initialize or get browser instance
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Create or get browser context
   */
  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      const browser = await this.getBrowser();
      this.context = await browser.newContext({
        userAgent: CAS_CONSTANTS.USER_AGENT,
        viewport: { width: 1920, height: 1080 },
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true
      });
    }
    return this.context;
  }

  /**
   * Create a new page
   */
  async newPage(): Promise<Page> {
    const context = await this.getContext();
    const page = await context.newPage();

    // Set default timeout
    page.setDefaultTimeout(this.config.timeout);
    page.setDefaultNavigationTimeout(this.config.timeout);

    return page;
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Check if browser is running
   */
  isConnected(): boolean {
    return this.browser?.isConnected() ?? false;
  }

  /**
   * Get browser stats for monitoring
   */
  getStats(): { connected: boolean; hasContext: boolean } {
    return {
      connected: this.isConnected(),
      hasContext: this.context !== null
    };
  }
}

/**
 * Convenience function to get Playwright client instance
 */
export function getPlaywrightClient(config?: Partial<PlaywrightConfig>): PlaywrightClient {
  return PlaywrightClient.getInstance(config);
}

/**
 * Helper function to execute browser operations with automatic cleanup
 */
export async function withPage<T>(
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const client = getPlaywrightClient();
  const page = await client.newPage();

  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(): void {
  const client = getPlaywrightClient();

  const shutdown = async (): Promise<void> => {
    console.log('Closing Playwright browser...');
    await client.close();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Close browser - exported for external shutdown handling
 */
export async function closeBrowser(): Promise<void> {
  const client = getPlaywrightClient();
  await client.close();
}
