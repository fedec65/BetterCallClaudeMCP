/**
 * TAS/CAS Jurisprudence MCP Server - Rendered HTML fetcher
 *
 * jurisprudence.tas-cas.org is an Angular SPA: without JavaScript the
 * server returns an empty shell. Jina Reader (https://r.jina.ai) renders
 * the page with its own headless browser and returns the post-render HTML
 * (X-Respond-With: html), so read-only pages (search lists, recent
 * decisions) no longer need a local Chromium.
 *
 * Interactive flows (e.g. the click-to-open award details panel) still use
 * the local Playwright browser — see getAwardDetails.
 *
 * Jina is tried first; on any failure, or when the expected content
 * selectors are absent from the returned HTML, we transparently fall back
 * to Playwright. Set TAS_DISABLE_JINA=true to skip Jina entirely.
 * Optional env: JINA_API_KEY (raises Jina rate limits).
 *
 * Known trade-offs (deliberate):
 * - Freshness: without an API key Jina only serves cached renders for
 *   this site (an uncached render returns the empty SPA shell, which the
 *   selector validation rejects). Cached copies can lag the live site;
 *   TAS/CAS decisions are low-volatility data, and TAS_DISABLE_JINA=true
 *   restores the render-it-yourself freshness guarantee.
 * - Trust: the target URL (including search terms about public court
 *   decisions) is sent to r.jina.ai, and the returned HTML is parsed as
 *   page content. Parsing is read-only (cheerio — no script execution)
 *   and only structured text fields are extracted. JINA_API_KEY is only
 *   ever sent to r.jina.ai itself.
 */

import * as cheerio from 'cheerio';
import { navigateAndWaitWithBlazor, withPage } from './playwright-client.js';

const JINA_BASE = 'https://r.jina.ai/';

export interface RenderOptions {
  /** CSS selectors that must be present for the HTML to be considered rendered */
  contentSelectors?: string[];
  /** Forwarded to the Playwright fallback navigation */
  waitForBlazor?: boolean;
  /** Timeout in ms for the Playwright fallback navigation */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Returns true when at least one of the selectors matches content in the HTML.
 */
export function htmlContainsAny(html: string, selectors: string[]): boolean {
  const $ = cheerio.load(html);
  return selectors.some((selector) => $(selector).length > 0);
}

async function fetchViaJina(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: 'text/html',
      'X-Respond-With': 'html',
    };
    const apiKey = process.env.JINA_API_KEY;
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${JINA_BASE}${url}`, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Jina Reader returned HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch the fully rendered HTML of a page: Jina Reader first, local
 * Playwright browser as fallback.
 */
export async function getRenderedHtml(url: string, options: RenderOptions = {}): Promise<string> {
  const {
    contentSelectors = [],
    waitForBlazor = false,
    timeout = 30000,
    debug = false,
  } = options;

  if (process.env.TAS_DISABLE_JINA !== 'true') {
    try {
      // Jina renders server-side and can be slower than a local browser
      const html = await fetchViaJina(url, timeout + 15000);
      if (contentSelectors.length === 0 || htmlContainsAny(html, contentSelectors)) {
        if (debug) console.error('[tas] rendered via Jina Reader:', url);
        return html;
      }
      if (debug) {
        console.error('[tas] Jina HTML missing expected content, falling back to Playwright:', url);
      }
    } catch (error) {
      console.error(
        '[tas] Jina Reader failed, falling back to Playwright:',
        error instanceof Error ? error.message : error
      );
    }
  }

  return withPage(async (page) => {
    await navigateAndWaitWithBlazor(page, url, {
      waitForBlazor,
      contentSelectors,
      timeout,
      debug,
    });
    return page.content();
  });
}
