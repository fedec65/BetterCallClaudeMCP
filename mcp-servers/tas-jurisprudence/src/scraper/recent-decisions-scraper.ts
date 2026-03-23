/**
 * TAS/CAS Jurisprudence MCP Server - Recent Decisions Scraper
 * Scrapes the simpler recent decisions page from tas-cas.org
 */

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { CasRecentOutput, CasRecentDecision } from '../types.js';
import { normalizeCaseNumber, generatePdfUrl, cleanText } from '../utils.js';
import { recentCache } from '../infrastructure/cache.js';
import { tasCasRateLimiter } from '../infrastructure/rate-limiter.js';
import { fetchText } from '../infrastructure/http-client.js';

const RECENT_URL = 'https://www.tas-cas.org/en/jurisprudence/recent-decisions.html';

/**
 * Parse a recent decision from HTML
 */
function parseRecentDecision($: cheerio.CheerioAPI, element: AnyNode): CasRecentDecision | null {
  const $el = $(element);
  
  try {
    // Find case number in text
    const text = $el.text();
    const caseMatch = text.match(/(?:CAS|TAS)?\s*(\d{4}\/[AO]|AD|ADV\/\d+)/i);
    
    if (!caseMatch) return null;

    const caseNumber = caseMatch[0];
    const normalizedCaseNumber = normalizeCaseNumber(caseNumber);

    // Extract title (usually in a heading or link)
    const title = $el.find('a, h3, h4, strong').first().text().trim() || 
                  $el.text().trim().substring(0, 100);

    // Extract date
    const dateMatch = text.match(/(\d{1,2}[\s\/]\w+[\s\/]\d{4}|\d{4}[\-\/]\d{2}[\-\/]\d{2})/);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract sport (if mentioned)
    const sportMatch = text.match(/(?:sport|discipline)[:\s]*([A-Za-z]+)/i);
    const sport = sportMatch ? sportMatch[1] : null;

    // Find PDF link
    const pdfHref = $el.find('a[href$=".pdf"]').attr('href') || '';
    const pdfUrl = pdfHref.startsWith('http') ? pdfHref : 
                   pdfHref ? `https://www.tas-cas.org${pdfHref}` : 
                   generatePdfUrl(normalizedCaseNumber);

    // Find source link
    const sourceHref = $el.find('a').first().attr('href') || '';
    const sourceUrl = sourceHref.startsWith('http') ? sourceHref : 
                      sourceHref ? `https://www.tas-cas.org${sourceHref}` : 
                      `https://jurisprudence.tas-cas.org/`;

    return {
      case_number: caseNumber,
      case_number_normalized: normalizedCaseNumber,
      title: cleanText(title),
      date,
      sport,
      pdf_url: pdfUrl,
      source_url: sourceUrl
    };
  } catch (error) {
    console.error('Error parsing recent decision:', error);
    return null;
  }
}

/**
 * Get recent CAS decisions
 * Uses simpler HTML page that doesn't require JavaScript
 */
export async function getRecentDecisions(limit: number = 10): Promise<CasRecentOutput> {
  // Check cache first (5 min TTL)
  const cacheKey = `recent:${limit}`;
  const cached = recentCache.get(cacheKey);
  if (cached) {
    return cached as CasRecentOutput;
  }

  // Wait for rate limiter
  await tasCasRateLimiter.waitForSlot();

  try {
    const html = await fetchText(RECENT_URL);
    const $ = cheerio.load(html);

    const decisions: CasRecentDecision[] = [];

    // Try various selectors for recent decisions
    const selectors = [
      '.decision-item',
      '.recent-decision',
      'article',
      'li',
      '.content a',
      'table tr'
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((_, el) => {
          if (decisions.length < limit) {
            const parsed = parseRecentDecision($, el);
            if (parsed && !decisions.find(d => d.case_number_normalized === parsed.case_number_normalized)) {
              decisions.push(parsed);
            }
          }
        });
        if (decisions.length >= limit) break;
      }
    }

    const result: CasRecentOutput = {
      decisions: decisions.slice(0, limit),
      retrieved_at: new Date().toISOString(),
      source: RECENT_URL
    };

    // Cache the result
    recentCache.set(cacheKey, result);
    return result;
  } finally {
    tasCasRateLimiter.releaseSlot();
  }
}

/**
 * Alternative: Scrape recent decisions using Playwright for JavaScript-rendered content
 * Use this if the simple fetch doesn't return results
 */
export async function getRecentDecisionsWithPlaywright(limit: number = 10): Promise<CasRecentOutput> {
  // Import dynamically to avoid circular dependencies
  const { withPage, navigateAndWait } = await import('./playwright-client.js');

  // Check cache first
  const cacheKey = `recent:pw:${limit}`;
  const cached = recentCache.get(cacheKey);
  if (cached) {
    return cached as CasRecentOutput;
  }

  // Wait for rate limiter
  await tasCasRateLimiter.waitForSlot();

  try {
    const result = await withPage(async (page) => {
      await navigateAndWait(page, RECENT_URL, 'networkidle');
      const html = await page.content();
      const $ = cheerio.load(html);

      const decisions: CasRecentDecision[] = [];

      // Parse with same selectors
      const selectors = ['.decision-item', '.recent-decision', 'article', 'li', '.content a'];
      
      for (const selector of selectors) {
        $(selector).each((_, el) => {
          if (decisions.length < limit) {
            const parsed = parseRecentDecision($, el);
            if (parsed && !decisions.find(d => d.case_number_normalized === parsed.case_number_normalized)) {
              decisions.push(parsed);
            }
          }
        });
        if (decisions.length >= limit) break;
      }

      return {
        decisions: decisions.slice(0, limit),
        retrieved_at: new Date().toISOString(),
        source: RECENT_URL
      };
    });

    recentCache.set(cacheKey, result);
    return result;
  } finally {
    tasCasRateLimiter.releaseSlot();
  }
}
