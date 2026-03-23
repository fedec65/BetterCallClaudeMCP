/**
 * TAS/CAS Jurisprudence MCP Server - Playwright Client
 * Singleton browser instance management for JavaScript-rendered content
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { DEFAULT_SCRAPER_CONFIG } from '../types.js';

/**
 * Playwright client configuration
 */
export interface PlaywrightConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
}

/**
 * Singleton Playwright browser client
 * Manages a single browser instance for all scraping operations
 */
export class PlaywrightClient {
  private static instance: PlaywrightClient | null = null;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private config: PlaywrightConfig;

  private constructor(config: PlaywrightConfig = {}) {
    this.config = {
      headless: true,
      timeout: DEFAULT_SCRAPER_CONFIG.timeout,
      userAgent: DEFAULT_SCRAPER_CONFIG.userAgent,
      ...config
    };
  }

  /**
   * Get the singleton instance
   */
  static getInstance(config?: PlaywrightConfig): PlaywrightClient {
    if (!PlaywrightClient.instance) {
      PlaywrightClient.instance = new PlaywrightClient(config);
    }
    return PlaywrightClient.instance;
  }

  /**
   * Get or create the browser instance
   */
  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Get or create a browser context
   */
  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      const browser = await this.getBrowser();
      this.context = await browser.newContext({
        userAgent: this.config.userAgent,
        viewport: { width: 1280, height: 720 },
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true
      });
    }
    return this.context;
  }

  /**
   * Create a new page with default settings
   */
  async newPage(): Promise<Page> {
    const context = await this.getContext();
    const page = await context.newPage();
    
    // Set default timeout
    page.setDefaultTimeout(this.config.timeout!);
    page.setDefaultNavigationTimeout(this.config.timeout!);

    return page;
  }

  /**
   * Close the browser and cleanup
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
    PlaywrightClient.instance = null;
  }

  /**
   * Check if browser is connected
   */
  isConnected(): boolean {
    return this.browser?.isConnected() ?? false;
  }
}

/**
 * Execute a scraping operation with automatic page management
 */
export async function withPage<T>(
  fn: (page: Page) => Promise<T>,
  config?: PlaywrightConfig
): Promise<T> {
  const client = PlaywrightClient.getInstance(config);
  const page = await client.newPage();

  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

/**
 * Navigate to a URL and wait for content to load
 */
export async function navigateAndWait(
  page: Page,
  url: string,
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'
): Promise<void> {
  await page.goto(url, { waitUntil });
  
  // Additional wait for any lazy-loaded content
  await page.waitForTimeout(1000);
}

/**
 * Take a screenshot for debugging
 */
export async function takeScreenshot(page: Page, path: string): Promise<void> {
  await page.screenshot({ path, fullPage: true });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  const client = PlaywrightClient.getInstance();
  await client.close();
});

process.on('SIGINT', async () => {
  const client = PlaywrightClient.getInstance();
  await client.close();
});
