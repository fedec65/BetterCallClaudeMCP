/**
 * TAS/CAS Jurisprudence MCP Server - Main Database Scraper
 * Scrapes the JavaScript-rendered jurisprudence.tas-cas.org database
 */

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type {
  CasSearchInput,
  CasSearchOutput,
  CasSearchResult,
  CasAwardDetails,
  CasAwardOutput
} from '../types.js';
import { normalizeCaseNumber, parseCaseNumber, generatePdfUrl, cleanText } from '../utils.js';
import { searchCache, awardCache } from '../infrastructure/cache.js';
import { jurisprudenceRateLimiter } from '../infrastructure/rate-limiter.js';
import { navigateAndWaitWithBlazor, withPage } from './playwright-client.js';

const BASE_URL = 'https://jurisprudence.tas-cas.org';

/**
 * Build search URL with query parameters
 */
function buildSearchUrl(input: CasSearchInput): string {
  const params = new URLSearchParams();
  params.set('q', input.query);
  
  if (input.sport) params.set('sport', input.sport);
  if (input.year_from) params.set('yearFrom', String(input.year_from));
  if (input.year_to) params.set('yearTo', String(input.year_to));
  if (input.procedure_type) params.set('type', input.procedure_type);
  params.set('page', String(input.page));
  params.set('size', String(input.page_size));

  return `${BASE_URL}/search?${params.toString()}`;
}

/**
 * Parse a search result from Angular table row
 * Site uses Angular 18 with table structure:
 * td[0]=Lang, td[1]=Year, td[2]=Type, td[3]=Case#, td[4]=Appellant,
 * td[5]=Respondent, td[6]=Sport, td[7]=Matter, td[8]=Date, td[9]=Outcome
 */
function parseSearchResult($: cheerio.CheerioAPI, element: AnyNode): CasSearchResult | null {
  const $row = $(element);

  try {
    // Get all table cells
    const cells = $row.find('td');
    if (cells.length < 10) return null;

    // Extract data from table cells by index
    // cells[0] = language (not used in output)
    const year = $(cells[1]).text().trim();
    const procType = $(cells[2]).text().trim();
    const caseNumberText = $(cells[3]).text().trim();
    const appellant = $(cells[4]).text().trim();
    const respondent = $(cells[5]).text().trim();
    const sport = $(cells[6]).text().trim();
    // cells[7] = matter (not used in output)
    const date = $(cells[8]).text().trim();
    const outcome = $(cells[9]).text().trim();

    if (!caseNumberText || !year) return null;

    // Build normalized case number: CAS YYYY/A/NNNN
    const caseNumberNormalized = `CAS ${year}/${procType}/${caseNumberText}`;

    // Map procedure type
    const procedureType = mapProcedureType(procType);

    // Build title from parties
    const title = appellant && respondent
      ? `${appellant} v. ${respondent}`
      : `CAS Decision ${caseNumberNormalized}`;

    // Build URL to decision page
    const url = `${BASE_URL}/decision/${year}/${procType}/${caseNumberText.padStart(4, '0')}`;

    // Generate PDF URL
    const pdfUrl = generatePdfUrl(caseNumberNormalized);

    // Build snippet from outcome
    const snippet = outcome ? `Outcome: ${outcome}` : null;

    return {
      case_number: `${year}/${procType}/${caseNumberText}`,
      case_number_normalized: caseNumberNormalized,
      title,
      sport: sport || null,
      procedure_type: procedureType,
      date,
      parties: {
        appellant: appellant || null,
        respondent: respondent || null
      },
      url,
      pdf_url: pdfUrl,
      snippet
    };
  } catch (error) {
    console.error('Error parsing search result:', error);
    return null;
  }
}

/**
 * Map procedure type text to enum
 */
function mapProcedureType(text: string): CasSearchResult['procedure_type'] {
  const normalized = text.toLowerCase();
  if (normalized.includes('appeal') || normalized.includes('a/')) return 'Appeal';
  if (normalized.includes('ordinary') || normalized.includes('o/')) return 'Ordinary';
  if (normalized.includes('anti-doping') || normalized.includes('ad/')) return 'Anti-Doping';
  if (normalized.includes('advisory') || normalized.includes('adv/')) return 'Advisory';
  return 'Appeal'; // Default
}

/**
 * Search CAS decisions using Playwright for JavaScript rendering
 */
export async function searchCasDecisions(input: CasSearchInput): Promise<CasSearchOutput> {
  // Check cache first
  const cacheKey = `search:${JSON.stringify(input)}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached as CasSearchOutput;
  }

  // Wait for rate limiter
  await jurisprudenceRateLimiter.waitForSlot();

  try {
    const result = await withPage(async (page) => {
      const url = buildSearchUrl(input);
      // Use Blazor-aware navigation with debug support
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

      // Get the rendered HTML
      const html = await page.content();
      const $ = cheerio.load(html);

      // Parse results from Angular table structure
      // Site uses Angular 18 with table rows having class 'line-wrapped'
      const results: CasSearchResult[] = [];

      // Primary selector for Angular table rows
      const tableSelectors = [
        'table tbody tr.line-wrapped',
        'table tbody tr',
        'tr.line-wrapped'
      ];

      for (const selector of tableSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          elements.each((_, el) => {
            const parsed = parseSearchResult($, el);
            if (parsed) {
              results.push(parsed);
            }
          });
          if (results.length > 0) break;
        }
      }

      // Parse total count
      let total = results.length;
      const totalText = $('.total, .count, [class*="total"]').first().text();
      const totalMatch = totalText.match(/(\d+)/);
      if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
      }

      return {
        results,
        total,
        page: input.page,
        page_size: input.page_size,
        has_more: results.length === input.page_size && (input.page * input.page_size) < total,
        query_used: input.query,
        filters_applied: {
          sport: input.sport,
          year_from: input.year_from,
          year_to: input.year_to,
          procedure_type: input.procedure_type
        }
      };
    });

    // Cache the result
    searchCache.set(cacheKey, result);
    return result;
  } finally {
    jurisprudenceRateLimiter.releaseSlot();
  }
}

/**
 * Get detailed award information
 */
export async function getAwardDetails(
  caseNumber?: string,
  url?: string,
  includeFullText: boolean = false
): Promise<CasAwardOutput> {
  // Normalize case number
  let normalizedCaseNumber: string | undefined;
  if (caseNumber) {
    try {
      normalizedCaseNumber = normalizeCaseNumber(caseNumber);
    } catch {
      return { found: false, award: null, error: 'Invalid case number format' };
    }
  }

  // Check cache
  const cacheKey = `award:${normalizedCaseNumber || url}:${includeFullText}`;
  const cached = awardCache.get(cacheKey);
  if (cached) {
    return cached as CasAwardOutput;
  }

  // Wait for rate limiter
  await jurisprudenceRateLimiter.waitForSlot();

  try {
    const result = await withPage(async (page) => {
      // Build URL
      let targetUrl = url;
      if (!targetUrl && normalizedCaseNumber) {
        const parsed = parseCaseNumber(normalizedCaseNumber);
        targetUrl = `${BASE_URL}/decision/${parsed.year}/${parsed.type}/${String(parsed.number).padStart(4, '0')}`;
      }

      if (!targetUrl) {
        return { found: false, award: null, error: 'No URL or case number provided' };
      }

      // Use Blazor-aware navigation with debug support
      const debugMode = process.env.DEBUG_SCRAPER === 'true';
      await navigateAndWaitWithBlazor(page, targetUrl, {
        waitForBlazor: true,
        contentSelectors: [
          '.case-number',
          'h1',
          '[class*="case"]',
          '.details',
          '[class*="award"]',
          '.title'
        ],
        timeout: 30000,
        debug: debugMode
      });
      const html = await page.content();
      const $ = cheerio.load(html);

      // Check if we found the award
      const notFound = $('body').text().toLowerCase().includes('not found') ||
                       $('body').text().toLowerCase().includes('no result');
      
      if (notFound) {
        return { found: false, award: null };
      }

      // Extract case number from page
      const caseNumFromPage = $('.case-number, h1, [class*="case"]').first().text().trim();
      const finalCaseNumber = normalizedCaseNumber || (caseNumFromPage ? normalizeCaseNumber(caseNumFromPage) : 'Unknown');

      // Extract details
      const title = $('h1, .title').first().text().trim();
      const sport = $('.sport, [class*="sport"]').first().text().trim() || null;
      const date = $('.date, [class*="date"]').first().text().trim();

      // Extract parties
      const appellant = $('.appellant, [class*="appellant"]').first().text().trim() || null;
      const respondent = $('.respondent, [class*="respondent"]').first().text().trim() || null;

      // Extract procedure type
      const typeText = $('.type, [class*="procedure"]').first().text().trim();
      const procedureType = mapProcedureType(typeText);

      // Extract arbitrators
      const arbitrators: CasAwardDetails['arbitrators'] = [];
      $('.arbitrator, [class*="arbitrator"]').each((_, el) => {
        const name = $(el).text().trim();
        const isPresident = name.toLowerCase().includes('president');
        arbitrators.push({
          name: name.replace(/president[:\s]*/i, '').trim(),
          role: isPresident ? 'President' : 'Arbitrator'
        });
      });

      // Extract keywords
      const keywords: string[] = [];
      $('.keyword, [class*="keyword"], .tag').each((_, el) => {
        const keyword = $(el).text().trim();
        if (keyword) keywords.push(keyword);
      });

      // Extract operative part
      const operativePart = $('.operative-part, [class*="operative"], .decision').first().text().trim() || null;

      // Extract summary
      const summary = $('.summary, [class*="summary"]').first().text().trim() || null;

      // Generate PDF URL
      const pdfUrl = generatePdfUrl(finalCaseNumber);

      const award: CasAwardDetails = {
        case_number: caseNumFromPage || finalCaseNumber,
        case_number_normalized: finalCaseNumber,
        title: title || `CAS Decision ${finalCaseNumber}`,
        sport,
        procedure_type: procedureType,
        date,
        parties: { appellant, respondent },
        arbitrators,
        keywords,
        operative_part: operativePart ? cleanText(operativePart) : null,
        summary: summary ? cleanText(summary) : null,
        full_text: includeFullText ? 'Full text extraction requires PDF parsing - not implemented in this version' : null,
        pdf_url: pdfUrl,
        source_url: targetUrl
      };

      return { found: true, award };
    });

    // Cache the result
    awardCache.set(cacheKey, result);
    return result;
  } finally {
    jurisprudenceRateLimiter.releaseSlot();
  }
}
