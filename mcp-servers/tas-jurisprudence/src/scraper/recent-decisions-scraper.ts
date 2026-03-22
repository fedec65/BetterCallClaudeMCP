/**
 * TAS/CAS Jurisprudence MCP Server - Recent Decisions Scraper
 * Uses main search endpoint to get recent decisions (sorted by date by default)
 */

import * as cheerio from 'cheerio';
import { Page } from 'playwright';
import {
  CasRecentOutput,
  RecentDecision,
  CAS_CONSTANTS
} from '../types.js';
import { getRateLimiter } from '../infrastructure/rate-limiter.js';
import { withPage } from './playwright-client.js';
import { cleanText, normalizeCaseNumber, generatePdfUrl } from '../utils.js';

/**
 * CSS selectors for the search results table (same as main scraper)
 * Table columns: Lang(1), Year(2), Proc.(3), Case#(4), Appellant(5), Respondent(6), Sport(7), Matter(8), Date(9), Outcome(10)
 * NOTE: Case number is split across columns 2,3,4 - need to combine Year/Proc/Number
 */
const SELECTORS = {
  resultsContainer: 'table, tbody, .results-table',
  resultRow: 'tbody tr',
  year: 'td:nth-child(2)',
  procedureType: 'td:nth-child(3)',
  caseNumberSeq: 'td:nth-child(4)', // Just the sequential number, e.g., "10168"
  appellant: 'td:nth-child(5)',
  respondent: 'td:nth-child(6)',
  sport: 'td:nth-child(7)',
  matter: 'td:nth-child(8)',
  date: 'td:nth-child(9)',
  outcome: 'td:nth-child(10)'
};

/**
 * Get recent CAS decisions
 * Uses the main search endpoint with no query to get results sorted by date
 */
export async function getRecentDecisions(limit: number = 10): Promise<CasRecentOutput> {
  // Wait for rate limiter
  await getRateLimiter().waitForSlot();

  return withPage(async (page: Page) => {
    // Navigate to search endpoint - results are sorted by date by default
    await page.goto(CAS_CONSTANTS.RECENT_URL, {
      waitUntil: 'networkidle',
      timeout: CAS_CONSTANTS.PAGE_TIMEOUT_MS
    });

    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // Parse HTML
    const html = await page.content();
    const decisions = parseRecentDecisions(html, limit);

    return {
      decisions,
      last_updated: new Date().toISOString(),
      source: CAS_CONSTANTS.RECENT_URL
    };
  });
}

/**
 * Parse recent decisions from HTML table
 * Table columns: Lang(1), Year(2), Proc.(3), Case#(4), Appellant(5), Respondent(6), Sport(7), Matter(8), Date(9), Outcome(10)
 * Case number is constructed from Year + Proc + Seq number
 */
function parseRecentDecisions(html: string, limit: number): RecentDecision[] {
  const $ = cheerio.load(html);
  const decisions: RecentDecision[] = [];

  const rows = $(SELECTORS.resultRow).toArray();

  for (const element of rows) {
    if (decisions.length >= limit) break;

    const $row = $(element);

    // Extract data from table cells - case number is split across 3 columns
    const year = cleanText($row.find(SELECTORS.year).text());
    const procedureType = cleanText($row.find(SELECTORS.procedureType).text());
    const caseNumberSeq = cleanText($row.find(SELECTORS.caseNumberSeq).text());

    if (!year || !procedureType || !caseNumberSeq) continue;

    // Construct full CAS case number: "CAS 2023/A/10168"
    const caseNumberText = `CAS ${year}/${procedureType}/${caseNumberSeq}`;

    const appellant = cleanText($row.find(SELECTORS.appellant).text());
    const respondent = cleanText($row.find(SELECTORS.respondent).text());
    const sport = cleanText($row.find(SELECTORS.sport).text());
    const date = cleanText($row.find(SELECTORS.date).text());

    // Build title from parties (Appellant v. Respondent)
    const title = appellant && respondent
      ? `${appellant} v. ${respondent}`
      : caseNumberText;

    // Generate URL from case number pattern
    // URL format: https://jurisprudence.tas-cas.org/decision/2023-A-10168
    const urlPath = `${year}-${procedureType}-${caseNumberSeq}`;
    const absoluteUrl = `${CAS_CONSTANTS.BASE_URL}/decision/${urlPath}`;

    // PDF URL - generate from case number
    const pdfUrl = generatePdfUrl(caseNumberText);

    try {
      const caseNumber = normalizeCaseNumber(caseNumberText);

      decisions.push({
        case_number: caseNumber,
        title: title || caseNumber,
        date: date || new Date().toISOString().split('T')[0],
        sport: sport || extractSportFromTitle(title),
        procedure_type: procedureType || extractProcedureFromCaseNumber(caseNumber),
        url: absoluteUrl,
        pdf_url: pdfUrl
      });
    } catch {
      // Skip invalid case numbers
    }
  }

  return decisions;
}

/**
 * Extract sport from decision title
 */
function extractSportFromTitle(title: string): string | undefined {
  const sports = [
    'Football', 'Soccer', 'Athletics', 'Cycling', 'Tennis',
    'Swimming', 'Basketball', 'Ice Hockey', 'Handball', 'Volleyball',
    'Skiing', 'Gymnastics', 'Rowing', 'Boxing', 'Wrestling',
    'Judo', 'Equestrian', 'Sailing', 'Fencing'
  ];

  const lowerTitle = title.toLowerCase();

  for (const sport of sports) {
    if (lowerTitle.includes(sport.toLowerCase())) {
      return sport;
    }
  }

  return undefined;
}

/**
 * Extract procedure type from case number
 */
function extractProcedureFromCaseNumber(caseNumber: string): string | undefined {
  const match = caseNumber.match(/\/([AO]|AD|G|M)\//);

  if (!match) return undefined;

  const typeMap: Record<string, string> = {
    'A': 'Appeal',
    'O': 'Ordinary',
    'AD': 'Anti-Doping',
    'G': 'Advisory',
    'M': 'Mediation'
  };

  return typeMap[match[1]];
}

/**
 * Check if recent decisions are accessible via main search endpoint
 */
export async function checkRecentDecisionsAvailability(): Promise<boolean> {
  try {
    await getRateLimiter().waitForSlot();

    return withPage(async (page: Page) => {
      const response = await page.goto(CAS_CONSTANTS.RECENT_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      if (response?.status() !== 200) return false;

      // Check if table is present
      try {
        await page.waitForSelector('table tbody tr', { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
