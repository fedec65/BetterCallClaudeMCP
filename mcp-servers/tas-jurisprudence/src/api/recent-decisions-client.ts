/**
 * TAS/CAS Jurisprudence MCP Server - New-site recent-decisions client
 *
 * The categorized JSON API (jurisprudence.tas-cas.org) stopped receiving new
 * awards in April 2024. Since the 2025-12-17 website relaunch, CAS publishes
 * recent awards on server-rendered HTML pages that link directly to PDFs:
 *
 *   https://www.tas-cas.org/{en,fr,es}/jurisprudence/recent-decisions
 *   https://www.tas-cas.org/en/add/jurisprudence
 *
 * Verified page structure (2026-08-15): each award is
 *   <a href="generated\assets\lists\<list-guid>\<file>.pdf" target="_blank">
 *     <div class="share-point-quick-link">...
 *       <div class="quick-link-text"><span>CAS 2025/A/11887 X v. Y</span></div>
 *     </div>
 *   </a>
 * Hrefs are relative and use backslashes. The span text carries the case
 * number(s) and parties; the pages carry NO decision date and no sport
 * metadata, so entries expose metadata + pdf_url only.
 */

import { load } from 'cheerio';
import { DEFAULT_SCRAPER_CONFIG } from '../types.js';
import { fetchText } from '../infrastructure/http-client.js';
import { withRateLimit, jurisprudenceRateLimiter } from '../infrastructure/rate-limiter.js';
import { newSiteCache } from '../infrastructure/cache.js';
import { normalizeCaseNumber, retryWithBackoff } from '../utils.js';

export type NewSiteLanguage = 'en' | 'fr' | 'es';

/**
 * One award found on the relaunched site's jurisprudence pages.
 */
export interface NewSiteEntry {
  /** Bare case number as printed on the site, e.g. "2025/A/11887". */
  caseNumber: string;
  /** Normalized form from normalizeCaseNumber, e.g. "CAS 2025/A/11887". */
  caseNumberNormalized: string;
  /** Parties text after the last case-number token; null when absent. */
  parties: string | null;
  language: NewSiteLanguage;
  pdfUrl: string;
  /** URL of the HTML page the entry was found on. */
  pageUrl: string;
}

const NEW_SITE_BASE = 'https://www.tas-cas.org/';
const NEW_SITE_HOST = 'www.tas-cas.org';
const NEW_SITE_CACHE_KEY = 'new-site:index';

/**
 * Page fetches get a shorter timeout and fewer attempts than the JSON API:
 * an outage of the relaunched site must not stall tool calls for minutes.
 */
const NEW_SITE_PAGE_TIMEOUT_MS = 8000;
const NEW_SITE_FETCH_ATTEMPTS = 2;

/**
 * How long a TOTAL fetch failure is cached as an empty index. Short enough
 * to recover quickly after an outage, long enough that a burst of tool
 * calls during an outage doesn't each pay the full retry cost.
 */
const NEW_SITE_NEGATIVE_TTL_MS = 45 * 1000;

/**
 * Pages to scrape, in priority order: the English index first so cross-page
 * dedupe keeps the English entry when a case appears in several languages.
 */
const NEW_SITE_PAGES: ReadonlyArray<{ url: string; language: NewSiteLanguage }> = [
  { url: `${NEW_SITE_BASE}en/jurisprudence/recent-decisions`, language: 'en' },
  { url: `${NEW_SITE_BASE}fr/jurisprudence/recent-decisions`, language: 'fr' },
  { url: `${NEW_SITE_BASE}es/jurisprudence/recent-decisions`, language: 'es' },
  { url: `${NEW_SITE_BASE}en/add/jurisprudence`, language: 'en' }
];

/**
 * Case number token inside a span, tolerating irregular spacing
 * ("2022/ADD/ 56"). The type group is validated by normalizeCaseNumber.
 */
const CASE_NUMBER_RE = /(\d{4})\s*\/\s*([A-Za-z]{1,4})\s*\/\s*(\d+)/g;

/**
 * Parse one recent-decisions/ADD page into entries. Exported for tests.
 *
 * - PDF hrefs use backslashes and are relative; both are normalized and
 *   resolved against https://www.tas-cas.org/.
 * - Compound entries ("... & 2020/ADD/13 ...") yield one entry per case
 *   number, all pointing at the same PDF.
 * - Entries without a recognizable case number are skipped.
 */
export function parseRecentDecisionsHtml(
  html: string,
  pageUrl: string,
  language: NewSiteLanguage
): NewSiteEntry[] {
  const $ = load(html);
  const entries: NewSiteEntry[] = [];

  $('a[href]').each((_, el) => {
    const rawHref = ($(el).attr('href') ?? '').trim();
    const href = rawHref.replace(/\\/g, '/');
    if (!/\.pdf([?#]|$)/i.test(href)) return;

    const spanText = $(el).find('.quick-link-text span').first().text().trim();
    const text = spanText || $(el).text().trim();
    if (!text) return;

    CASE_NUMBER_RE.lastIndex = 0;
    const matches = [...text.matchAll(CASE_NUMBER_RE)];
    if (matches.length === 0) return;

    // Parties = span text after the last case-number token, trimmed.
    const last = matches[matches.length - 1];
    const parties = text.slice((last.index ?? 0) + last[0].length).trim() || null;

    let pdfUrl: string;
    try {
      const resolved = new URL(href, NEW_SITE_BASE);
      // Strict host allowlist: never emit pdf_urls pointing off-domain.
      if (resolved.hostname !== NEW_SITE_HOST) return;
      pdfUrl = resolved.toString();
    } catch {
      return;
    }

    for (const m of matches) {
      const caseNumber = `${m[1]}/${m[2].toUpperCase()}/${m[3]}`;
      let caseNumberNormalized: string;
      try {
        caseNumberNormalized = normalizeCaseNumber(caseNumber);
      } catch {
        // Unknown case type (not A/O/AD/ADD/ADV/C) — skip this token.
        continue;
      }
      entries.push({ caseNumber, caseNumberNormalized, parties, language, pdfUrl, pageUrl });
    }
  });

  return entries;
}

async function fetchPage(url: string): Promise<string> {
  return withRateLimit(jurisprudenceRateLimiter, () =>
    retryWithBackoff(
      () =>
        fetchText(url, {
          timeout: NEW_SITE_PAGE_TIMEOUT_MS,
          userAgent: DEFAULT_SCRAPER_CONFIG.userAgent
        }),
      NEW_SITE_FETCH_ATTEMPTS,
      1000
    )
  );
}

/**
 * In-flight coalescing: concurrent callers share one fetch round instead of
 * each paying the full 4-page cost.
 */
let inFlightIndexPromise: Promise<NewSiteEntry[]> | null = null;

async function buildNewSiteIndex(): Promise<NewSiteEntry[]> {
  const perPage = await Promise.all(
    NEW_SITE_PAGES.map(async (page) => {
      try {
        const html = await fetchPage(page.url);
        return parseRecentDecisionsHtml(html, page.url, page.language);
      } catch {
        return null;
      }
    })
  );

  const successful = perPage.filter((r): r is NewSiteEntry[] => r !== null);
  if (successful.length === 0) {
    // Total failure: cache the empty index briefly so a burst of requests
    // during an outage doesn't each pay the retry cost, without pinning the
    // index to the outage for the full 30-minute TTL.
    newSiteCache.set(NEW_SITE_CACHE_KEY, [] as NewSiteEntry[], NEW_SITE_NEGATIVE_TTL_MS);
    return [];
  }

  const seen = new Set<string>();
  const merged: NewSiteEntry[] = [];
  for (const entries of successful) {
    for (const entry of entries) {
      if (seen.has(entry.caseNumberNormalized)) continue;
      seen.add(entry.caseNumberNormalized);
      merged.push(entry);
    }
  }

  newSiteCache.set(NEW_SITE_CACHE_KEY, merged);
  return merged;
}

/**
 * Fetch and merge all four new-site jurisprudence pages into one index,
 * deduped by normalized case number (English pages win).
 *
 * Fault tolerance: a page that fails to fetch is dropped, the others are
 * still used. If ALL pages fail, an empty array is returned (callers
 * degrade to API-only behavior) and cached for only NEW_SITE_NEGATIVE_TTL_MS
 * so the next call after the outage recovers quickly.
 */
export function getNewSiteIndex(): Promise<NewSiteEntry[]> {
  const cached = newSiteCache.get(NEW_SITE_CACHE_KEY) as NewSiteEntry[] | null;
  if (cached) return Promise.resolve(cached);

  if (!inFlightIndexPromise) {
    inFlightIndexPromise = buildNewSiteIndex().finally(() => {
      inFlightIndexPromise = null;
    });
  }
  return inFlightIndexPromise;
}
