/**
 * TAS/CAS Jurisprudence MCP Server - Main Database Scraper
 * Scrapes JavaScript-rendered content from jurisprudence.tas-cas.org
 */

import * as cheerio from 'cheerio';
import { Page } from 'playwright';
import {
  CasSearchInput,
  CasSearchOutput,
  CasAwardOutput,
  SearchResult,
  CAS_CONSTANTS
} from '../types.js';
import { getRateLimiter } from '../infrastructure/rate-limiter.js';
import { withPage } from './playwright-client.js';
import { normalizeCaseNumber, generatePdfUrl, cleanText } from '../utils.js';

/**
 * CSS selectors for the CAS jurisprudence database
 * Based on actual site structure at jurisprudence.tas-cas.org
 * Table columns: Lang(1), Year(2), Proc.(3), Case#(4), Appellant(5), Respondent(6), Sport(7), Matter(8), Date(9), Outcome(10)
 */
const SELECTORS = {
  // Search form - Angular app structure
  searchInput: '.search-bar input, app-search-bar input, input[placeholder*="Search"], input[placeholder*="Recherche"]',
  searchButton: 'button[type="submit"], .btn-primary',
  sportFilter: 'select[name="sport"], #sport-filter',
  yearFromFilter: 'input[name="year_from"], #year-from',
  yearToFilter: 'input[name="year_to"], #year-to',
  procedureTypeFilter: 'select[name="procedure_type"], #procedure-type',
  applyFiltersButton: '.filter-button, button:has-text("Apply")',

  // Results - Table structure
  // Columns: Lang(1), Year(2), Proc.(3), Case#(4), Appellant(5), Respondent(6), Sport(7), Matter(8), Date(9), Outcome(10)
  // NOTE: Case number is split across columns 2,3,4 - need to combine Year/Proc/Number
  resultsContainer: 'table, tbody, .results-table',
  resultRow: 'tbody tr',
  year: 'td:nth-child(2)',
  procedureType: 'td:nth-child(3)',
  caseNumberSeq: 'td:nth-child(4)', // Just the sequential number
  appellant: 'td:nth-child(5)',
  respondent: 'td:nth-child(6)',
  sport: 'td:nth-child(7)',
  matter: 'td:nth-child(8)',
  date: 'td:nth-child(9)',
  outcome: 'td:nth-child(10)',

  // Pagination
  pagination: '.pagination, .pager',
  nextPage: '.next, a[rel="next"]',
  pageInfo: '.page-info',

  // Award details
  awardContainer: '.award-container, .decision-details',
  awardTitle: '.award-title, h1, .case-title',
  awardMetadata: '.metadata, .case-info',
  arbitrators: '.arbitrators, .panel-members',
  keywords: '.keywords, .tags',
  operativePart: '.operative-part, .dispositive, .operative',
  fullText: '.full-text, .award-text, .decision-body'
};

/**
 * Search CAS decisions
 * Uses URL parameters for the Angular app at jurisprudence.tas-cas.org
 */
export async function searchCasDecisions(
  input: CasSearchInput
): Promise<CasSearchOutput> {
  await getRateLimiter().waitForSlot();

  return withPage(async (page: Page) => {
    // Build search URL with query parameters
    const params = new URLSearchParams();
    params.set('details', '-1'); // Detailed view
    if (input.query) {
      params.set('text', input.query);
    }

    // Navigate directly to search URL
    const searchUrl = `${CAS_CONSTANTS.BASE_URL}/search?${params.toString()}`;

    await page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: CAS_CONSTANTS.PAGE_TIMEOUT_MS
    });

    // Wait for table to load
    await page.waitForSelector('table tbody tr', { timeout: 15000 });

    // Apply filters if needed (these require UI interaction)
    if (input.sport || input.year_from || input.year_to || input.procedure_type) {
      // For now, we'll filter results client-side after fetching
      // The site uses Angular reactive forms which are complex to interact with
    }

    // Handle pagination
    if (input.page > 1) {
      // Calculate offset and navigate
      const offset = (input.page - 1) * input.page_size;
      params.set('offset', offset.toString());
      const pagedUrl = `${CAS_CONSTANTS.BASE_URL}/search?${params.toString()}`;

      await getRateLimiter().waitForSlot();
      await page.goto(pagedUrl, {
        waitUntil: 'networkidle',
        timeout: CAS_CONSTANTS.PAGE_TIMEOUT_MS
      });
      await page.waitForSelector('table tbody tr', { timeout: 10000 });
    }

    const html = await page.content();
    const allResults = parseSearchResults(html, input);
    const totalResults = await getTotalResults(page);
    const totalPages = Math.ceil(totalResults / input.page_size);

    return {
      results: allResults.slice(0, input.page_size),
      total_results: totalResults,
      page: input.page,
      page_size: input.page_size,
      total_pages: totalPages,
      has_more: input.page < totalPages
    };
  });
}

/**
 * Get specific award details
 */
export async function getAwardDetails(
  caseNumber: string,
  includeFullText: boolean = false
): Promise<CasAwardOutput> {
  const normalizedNumber = normalizeCaseNumber(caseNumber);

  await getRateLimiter().waitForSlot();

  return withPage(async (page: Page) => {
    const urlPath = normalizedNumber.replace('CAS ', '').replace(/\//g, '-');
    const awardUrl = `${CAS_CONSTANTS.BASE_URL}/decision/${urlPath}`;

    await page.goto(awardUrl, {
      waitUntil: 'networkidle',
      timeout: CAS_CONSTANTS.PAGE_TIMEOUT_MS
    });

    const html = await page.content();
    const $ = cheerio.load(html);
    const metadata = extractAwardMetadata($, normalizedNumber, awardUrl);

    let fullText: string | undefined;
    let extractionStatus: 'success' | 'partial' | 'failed' | 'not_requested' = 'not_requested';

    if (includeFullText) {
      try {
        const textContent = $(SELECTORS.fullText).text();
        if (textContent && textContent.length > 100) {
          fullText = cleanText(textContent);
          extractionStatus = 'success';
        } else {
          extractionStatus = 'partial';
        }
      } catch {
        extractionStatus = 'failed';
      }
    }

    return {
      ...metadata,
      full_text: fullText,
      extraction_status: extractionStatus
    };
  });
}

/**
 * Parse search results from HTML table
 * Table columns: Lang(1), Year(2), Proc.(3), Case#(4), Appellant(5), Respondent(6), Sport(7), Matter(8), Date(9), Outcome(10)
 * Case number is constructed from Year + Proc + Seq number
 */
function parseSearchResults(html: string, input: CasSearchInput): SearchResult[] {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(SELECTORS.resultRow).each((_, element) => {
    const $row = $(element);

    // Extract data from table cells - case number is split across 3 columns
    const year = cleanText($row.find(SELECTORS.year).text());
    const procedureType = cleanText($row.find(SELECTORS.procedureType).text());
    const caseNumberSeq = cleanText($row.find(SELECTORS.caseNumberSeq).text());

    if (!year || !procedureType || !caseNumberSeq) return;

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

    results.push({
      case_number: normalizeCaseNumber(caseNumberText),
      title,
      sport: sport || undefined,
      procedure_type: procedureType || undefined,
      date: date || undefined,
      parties: appellant || respondent ? {
        appellant: appellant || undefined,
        respondent: respondent || undefined
      } : undefined,
      url: absoluteUrl,
      pdf_url: pdfUrl
    });
  });

  // Apply client-side filters if needed
  let filtered = results;

  if (input.sport) {
    filtered = filtered.filter(r =>
      r.sport?.toLowerCase().includes(input.sport!.toLowerCase())
    );
  }

  if (input.procedure_type) {
    filtered = filtered.filter(r =>
      r.procedure_type?.toLowerCase().includes(input.procedure_type!.toLowerCase())
    );
  }

  if (input.year_from) {
    filtered = filtered.filter(r => {
      const yearMatch = r.case_number.match(/CAS\s*(\d{4})/);
      if (yearMatch) {
        return parseInt(yearMatch[1], 10) >= input.year_from!;
      }
      return true;
    });
  }

  if (input.year_to) {
    filtered = filtered.filter(r => {
      const yearMatch = r.case_number.match(/CAS\s*(\d{4})/);
      if (yearMatch) {
        return parseInt(yearMatch[1], 10) <= input.year_to!;
      }
      return true;
    });
  }

  return filtered;
}

/**
 * Get total results count from page
 */
async function getTotalResults(page: Page): Promise<number> {
  try {
    const pageInfoText = await page.textContent(SELECTORS.pageInfo).catch(() => null);

    if (pageInfoText) {
      const match = pageInfoText.match(/(\d+)\s*(?:results|decisions|cases)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Fallback: count table rows
    const count = await page.$$eval(SELECTORS.resultRow, items => items.length);
    return count;
  } catch {
    return 0;
  }
}

/**
 * Extract award metadata from parsed HTML
 */
function extractAwardMetadata(
  $: cheerio.CheerioAPI,
  caseNumber: string,
  url: string
): Omit<CasAwardOutput, 'full_text' | 'extraction_status'> {
  const title = cleanText($(SELECTORS.awardTitle).text());
  const metadataText = $(SELECTORS.awardMetadata).text();

  const sportMatch = metadataText.match(/Sport:\s*([^\n]+)/i);
  const sport = sportMatch ? cleanText(sportMatch[1]) : undefined;

  const procedureMatch = metadataText.match(/(?:Procedure|Type):\s*([^\n]+)/i);
  const procedureType = procedureMatch ? cleanText(procedureMatch[1]) : undefined;

  const dateMatch = metadataText.match(/Date:\s*([^\n]+)/i);
  const date = dateMatch ? cleanText(dateMatch[1]) : undefined;

  const partiesMatch = metadataText.match(/Parties:\s*([^\n]+(?:\n\s+[^\n]+)*)/i);
  const parties = partiesMatch ? parseParties(cleanText(partiesMatch[1])) : undefined;

  const arbitratorsText = $(SELECTORS.arbitrators).text();
  const arbitrators = parseArbitrators(arbitratorsText);

  const keywordsText = $(SELECTORS.keywords).text();
  const keywords = parseKeywords(keywordsText);

  const operativePart = cleanText($(SELECTORS.operativePart).text()) || undefined;
  const pdfUrl = generatePdfUrl(caseNumber);

  return {
    case_number: caseNumber,
    title,
    sport,
    procedure_type: procedureType,
    date,
    parties,
    arbitrators: arbitrators.length > 0 ? arbitrators : undefined,
    keywords: keywords.length > 0 ? keywords : undefined,
    operative_part: operativePart,
    pdf_url: pdfUrl,
    url
  };
}

/**
 * Parse parties string into structured format
 */
function parseParties(text: string): { appellant?: string; respondent?: string } | undefined {
  const vsMatch = text.match(/(.+?)\s+(?:v\.|vs\.|against)\s+(.+)/i);

  if (vsMatch) {
    return {
      appellant: cleanText(vsMatch[1]),
      respondent: cleanText(vsMatch[2])
    };
  }

  return undefined;
}

/**
 * Parse arbitrators from text
 */
function parseArbitrators(text: string): Array<{ name: string; role?: 'President' | 'Arbitrator' | 'Co-Arbitrator' }> {
  const arbitrators: Array<{ name: string; role?: 'President' | 'Arbitrator' | 'Co-Arbitrator' }> = [];
  const parts = text.split(/[,;]/);

  for (const part of parts) {
    const cleanPart = cleanText(part);
    if (!cleanPart || cleanPart.length < 3) continue;

    let role: 'President' | 'Arbitrator' | 'Co-Arbitrator' | undefined;
    let name = cleanPart;

    if (/president/i.test(cleanPart)) {
      role = 'President';
      name = cleanPart.replace(/president[:\s]*/i, '');
    } else if (/co-arbitrator/i.test(cleanPart)) {
      role = 'Co-Arbitrator';
      name = cleanPart.replace(/co-arbitrator[:\s]*/i, '');
    } else if (/arbitrator/i.test(cleanPart)) {
      role = 'Arbitrator';
      name = cleanPart.replace(/arbitrator[:\s]*/i, '');
    }

    if (name.length > 2) {
      arbitrators.push({ name, role });
    }
  }

  return arbitrators;
}

/**
 * Parse keywords from text
 */
function parseKeywords(text: string): string[] {
  return text
    .split(/[,;]/)
    .map(k => cleanText(k))
    .filter(k => k.length > 2 && k.length < 50);
}
