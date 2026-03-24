/**
 * TAS/CAS Jurisprudence MCP Server - Recent Decisions Scraper
 * Uses the search API to get recent decisions (old /recent-decisions.html page is now 404)
 */

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { CasRecentOutput, CasRecentDecision } from '../types.js';
import { generatePdfUrl, cleanText } from '../utils.js';
import { recentCache } from '../infrastructure/cache.js';
import { tasCasRateLimiter } from '../infrastructure/rate-limiter.js';
import { withPage, navigateAndWaitWithBlazor } from './playwright-client.js';

// Use search API with empty query - returns results sorted by date
const SEARCH_BASE_URL = 'https://jurisprudence.tas-cas.org/search';

/**
 * Build search URL for recent decisions (empty query, sorted by date)
 */
function buildRecentSearchUrl(limit: number): string {
  const params = new URLSearchParams();
  params.set('q', ''); // Empty query returns all results
  params.set('page', '1');
  params.set('size', String(Math.min(limit, 25))); // API max is 25 per page
  return `${SEARCH_BASE_URL}?${params.toString()}`;
}

/**
 * Parse a search result from Angular table row into RecentDecision format
 * Table structure: td[0]=Lang, td[1]=Year, td[2]=Type, td[3]=Case#,
 *                 td[4]=Appellant, td[5]=Respondent, td[6]=Sport,
 *                 td[7]=Matter, td[8]=Date, td[9]=Outcome
 */
function parseRecentDecision($: cheerio.CheerioAPI, element: AnyNode): CasRecentDecision | null {
  const $row = $(element);

  try {
    // Get all table cells
    const cells = $row.find('td');
    if (cells.length < 10) return null;

    // Extract data from table cells by index
    const year = $(cells[1]).text().trim();
    const procType = $(cells[2]).text().trim();
    const caseNumberText = $(cells[3]).text().trim();
    const appellant = $(cells[4]).text().trim();
    const respondent = $(cells[5]).text().trim();
    const sport = $(cells[6]).text().trim();
    const date = $(cells[8]).text().trim();
    // cells[9] = outcome (not used in recent decision format)

    if (!caseNumberText || !year) return null;

    // Build normalized case number: CAS YYYY/A/NNNN
    const caseNumberNormalized = `CAS ${year}/${procType}/${caseNumberText}`;
    const caseNumber = `${year}/${procType}/${caseNumberText}`;

    // Build title from parties
    const title = appellant && respondent
      ? `${appellant} v. ${respondent}`
      : `CAS Decision ${caseNumberNormalized}`;

    // Build URL to decision page
    const sourceUrl = `https://jurisprudence.tas-cas.org/decision/${year}/${procType}/${caseNumberText.padStart(4, '0')}`;

    // Generate PDF URL
    const pdfUrl = generatePdfUrl(caseNumberNormalized);

    return {
      case_number: caseNumber,
      case_number_normalized: caseNumberNormalized,
      title: cleanText(title),
      date,
      sport: sport || null,
      pdf_url: pdfUrl,
      source_url: sourceUrl
    };
  } catch (error) {
    console.error('Error parsing recent decision:', error);
    return null;
  }
}

/**
 * Get recent CAS decisions using the search API
 * The old /recent-decisions.html page no longer exists (404)
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
    const result = await withPage(async (page) => {
      const url = buildRecentSearchUrl(limit);

      // Use Blazor-aware navigation (actually Angular, but same pattern)
      const debugMode = process.env.DEBUG_SCRAPER === 'true';
      await navigateAndWaitWithBlazor(page, url, {
        waitForBlazor: false, // Angular, not Blazor
        contentSelectors: [
          'table tbody tr.line-wrapped',
          'table tbody tr',
          'tr.line-wrapped'
        ],
        timeout: 30000,
        debug: debugMode
      });

      const html = await page.content();
      const $ = cheerio.load(html);

      const decisions: CasRecentDecision[] = [];

      // Parse results from Angular table structure
      const tableSelectors = [
        'table tbody tr.line-wrapped',
        'table tbody tr',
        'tr.line-wrapped'
      ];

      for (const selector of tableSelectors) {
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
          if (decisions.length > 0) break;
        }
      }

      return {
        decisions: decisions.slice(0, limit),
        retrieved_at: new Date().toISOString(),
        source: url
      };
    });

    recentCache.set(cacheKey, result);
    return result;
  } finally {
    tasCasRateLimiter.releaseSlot();
  }
}

/**
 * Legacy function name for backwards compatibility
 * @deprecated Use getRecentDecisions instead
 */
export const getRecentDecisionsWithPlaywright = getRecentDecisions;
