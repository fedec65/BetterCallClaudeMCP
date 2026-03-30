/**
 * TAS/CAS Jurisprudence MCP Server - Playwright Client
 * Singleton browser instance management for JavaScript-rendered content
 *
 * Special handling for Blazor Server-Side Rendering with SignalR WebSockets
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
  debugMode?: boolean;
}

/**
 * Navigation options for Blazor-aware content loading
 */
export interface NavigateOptions {
  /** Whether to wait for Blazor initialization */
  waitForBlazor?: boolean;
  /** CSS selectors to wait for content elements */
  contentSelectors?: string[];
  /** Total timeout for navigation and content loading */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Default content selectors for CAS/TAS pages
 */
const DEFAULT_CONTENT_SELECTORS = [
  '.result-item',
  '.search-result',
  '[class*="result"]',
  '.decision-item',
  'article',
  'li[class*="case"]',
  '[class*="decision"]',
  'table tbody tr',
  '.content a',
  '.case-number',
  'h1',
  '.details'
];

/**
 * Wait for Blazor application to be ready
 * Detects Blazor Server-Side Rendering initialization
 */
async function waitForBlazorApp(page: Page, timeout = 15000): Promise<boolean> {
  try {
    await page.waitForFunction(() => {
      // Check for Blazor markers in DOM
      const blazorMarker = document.querySelector('[blazor]');
      const blazorApp = document.querySelector('app');
      const blazorScript = document.querySelector('script[src*="blazor"]');

      // Check for Blazor JavaScript runtime
      const hasBlazorRuntime = (window as any).Blazor !== undefined ||
                                (window as any).Microsoft?.Blazor !== undefined;

      return (blazorMarker !== null || blazorApp !== null || blazorScript !== null || hasBlazorRuntime);
    }, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for specific content elements to appear
 * More reliable than networkidle for JS-rendered content
 */
async function waitForContentElements(
  page: Page,
  selectors: string[],
  timeout = 20000
): Promise<void> {
  await page.waitForFunction((selList) => {
    return selList.some((sel: string) => {
      const el = document.querySelector(sel);
      return el !== null && el.textContent?.trim().length > 0;
    });
  }, selectors, { timeout });
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
      debugMode: process.env.DEBUG_SCRAPER === 'true',
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
      // Use Docker image's pre-installed chromium if available
      const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        '/ms-playwright/chromium-1091/chrome-linux/chrome';

      this.browser = await chromium.launch({
        headless: this.config.headless,
        executablePath,
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
 * @deprecated Use navigateAndWaitWithBlazor for Blazor-rendered pages
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
 * Navigate to a Blazor-rendered page with proper content waiting
 * Uses multi-stage wait strategy:
 * 1. domcontentloaded for initial page load (faster than networkidle)
 * 2. Blazor initialization detection
 * 3. Content element appearance
 */
export async function navigateAndWaitWithBlazor(
  page: Page,
  url: string,
  options: NavigateOptions = {}
): Promise<void> {
  const {
    waitForBlazor = true,
    contentSelectors = DEFAULT_CONTENT_SELECTORS,
    timeout = 30000,
    debug = false
  } = options;

  if (debug) {
    page.on('console', msg => console.log('[PAGE]', msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]', err));
  }

  // Stage 1: Navigate with domcontentloaded (faster than networkidle)
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

  // Stage 2: Wait for Blazor initialization if enabled
  if (waitForBlazor) {
    const blazorReady = await waitForBlazorApp(page, Math.min(timeout, 10000));
    if (debug) {
      console.log('[DEBUG] Blazor ready:', blazorReady);
    }
  }

  // Stage 3: Wait for actual content elements
  try {
    await waitForContentElements(page, contentSelectors, Math.min(timeout, 20000));
    if (debug) {
      console.log('[DEBUG] Content elements found');
    }
  } catch (error) {
    // Fallback: wait additional time for slow rendering
    if (debug) {
      console.log('[DEBUG] Content wait failed, using fallback timeout');
    }
    await page.waitForTimeout(3000);
  }
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
