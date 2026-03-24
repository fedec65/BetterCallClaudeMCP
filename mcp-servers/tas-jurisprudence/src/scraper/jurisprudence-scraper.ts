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
 * Get detailed award information using search-first approach
 * The site uses ?details=UUID query parameter, not /decision/ routes
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
      let targetUrl: string;
      let finalCaseNumber = normalizedCaseNumber;

      // If URL provided directly, use it
      if (url) {
        targetUrl = url;
      } else if (normalizedCaseNumber) {
        // Search-first approach: find the decision UUID by searching for the case number
        const parsed = parseCaseNumber(normalizedCaseNumber);

        // Build search URL for this specific case number
        const searchParams = new URLSearchParams();
        searchParams.set('q', normalizedCaseNumber); // Search by full case number
        searchParams.set('page', '1');
        searchParams.set('size', '10');
        const searchUrl = `${BASE_URL}?${searchParams.toString()}`;

        const debugMode = process.env.DEBUG_SCRAPER === 'true';

        // Navigate to search page
        await navigateAndWaitWithBlazor(page, searchUrl, {
          waitForBlazor: true,
          contentSelectors: ['table tbody tr', 'tr.line-wrapped'],
          timeout: 30000,
          debug: debugMode
        });

        // Get search results to find the UUID
        const searchHtml = await page.content();
        const $search = cheerio.load(searchHtml);

        // Find the matching row in search results
        let foundUuid: string | null = null;
        const targetCaseNum = String(parsed.number).padStart(4, '0');

        $search('table tbody tr').each((_, row) => {
          if (foundUuid) return; // Already found, skip remaining iterations
          const cells = $search(row).find('td');
          if (cells.length >= 4) {
            const rowYear = $search(cells[1]).text().trim();
            const rowType = $search(cells[2]).text().trim();
            const rowNum = $search(cells[3]).text().trim().padStart(4, '0');

            // Check if this row matches our case
            if (rowYear === String(parsed.year) && rowType === parsed.type && rowNum === targetCaseNum) {
              // Mark as found, will click below
              foundUuid = 'found';
            }
          }
        });

        if (!foundUuid) {
          return { found: false, award: null, error: 'Case not found in search results' };
        }

        // Click the matching row to open details panel
        await page.click('table tbody tr:first-child');
        await page.waitForTimeout(3000); // Wait for details panel to appear

        // Get the current URL which should now have ?details=UUID
        targetUrl = page.url();
      } else {
        return { found: false, award: null, error: 'No URL or case number provided' };
      }

      // Get the page content after details panel is loaded
      const html = await page.content();
      const $ = cheerio.load(html);

      // Check if details panel is present
      const detailsCard = $('app-detailed-outcome-card');
      if (detailsCard.length === 0) {
        return { found: false, award: null, error: 'Details panel not found' };
      }

      // Extract case number from title
      const caseNumFromPage = detailsCard.find('.title h2').first().text().trim();
      if (caseNumFromPage && !finalCaseNumber) {
        try {
          finalCaseNumber = normalizeCaseNumber(caseNumFromPage);
        } catch {
          finalCaseNumber = caseNumFromPage;
        }
      }

      // Extract sport from keyword component
      const sport = detailsCard.find('.sport app-keyword .keyword span').first().text().trim() || null;

      // Extract date
      const date = detailsCard.find('.date strong').first().text().trim();

      // Extract parties from party-container sections
      let appellant: string | null = null;
      let respondent: string | null = null;

      detailsCard.find('.info .party-container').each((_, container) => {
        const label = $(container).find('.info-title').text().trim().toLowerCase();
        const entries = $(container).find('.party-entry').map((_, entry) => $(entry).text().trim()).get();
        const partyText = entries.join(', ');

        if (label.includes('appellant')) {
          appellant = partyText || null;
        } else if (label.includes('respondent')) {
          respondent = partyText || null;
        }
      });

      // Extract procedure type from the case number (A = Appeal, O = Ordinary, AD = Anti-Doping)
      let procedureType: 'Appeal' | 'Ordinary' | 'Anti-Doping' | 'Advisory' | null = null;
      if (finalCaseNumber) {
        const parsed = parseCaseNumber(finalCaseNumber);
        procedureType = mapProcedureType(parsed.type);
      }

      // Extract arbitrators
      const arbitrators: CasAwardDetails['arbitrators'] = [];
      detailsCard.find('.info .party-container').each((_, container) => {
        const label = $(container).find('.info-title').text().trim().toLowerCase();
        if (label.includes('arbitrator')) {
          $(container).find('.party-entry').each((_, entry) => {
            const name = $(entry).text().trim();
            const isPresident = name.toLowerCase().includes('president') ||
                               label.includes('president');
            if (name) {
              arbitrators.push({
                name: name.replace(/president[:\s]*/i, '').trim(),
                role: isPresident ? 'President' : 'Arbitrator'
              });
            }
          });
        }
      });

      // Extract keywords (sport is already extracted, look for other keywords)
      const keywords: string[] = [];
      if (sport) keywords.push(sport);

      // Look for additional keywords in the card
      detailsCard.find('.keyword span, app-keyword .keyword span').each((_, el) => {
        const keyword = $(el).text().trim();
        if (keyword && !keywords.includes(keyword)) {
          keywords.push(keyword);
        }
      });

      // Extract operative part / decision summary
      const operativePart = detailsCard.find('[class*="operative"], [class*="decision"]').first().text().trim() || null;

      // Extract summary if available
      const summary = detailsCard.find('.summary, [class*="summary"]').first().text().trim() || null;

      // Build title from parties
      const title = appellant && respondent
        ? `${appellant} v. ${respondent}`
        : `CAS Decision ${finalCaseNumber}`;

      // Generate PDF URL
      const pdfUrl = finalCaseNumber ? generatePdfUrl(finalCaseNumber) : null;

      const award: CasAwardDetails = {
        case_number: caseNumFromPage || finalCaseNumber || 'Unknown',
        case_number_normalized: finalCaseNumber || 'Unknown',
        title,
        sport,
        procedure_type: procedureType || 'Appeal',
        date,
        parties: { appellant, respondent },
        arbitrators,
        keywords: keywords.length > 0 ? keywords : [],
        operative_part: operativePart ? cleanText(operativePart) : null,
        summary: summary ? cleanText(summary) : null,
        full_text: includeFullText ? 'Full text extraction requires PDF parsing - not implemented in this version' : null,
        pdf_url: pdfUrl || '',
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
