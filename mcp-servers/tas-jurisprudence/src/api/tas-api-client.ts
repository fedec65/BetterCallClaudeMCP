/**
 * TAS/CAS Jurisprudence MCP Server - JSON API Client
 *
 * Replaces the previous Jina Reader + Playwright fallback with a thin client
 * over the public JSON API exposed by jurisprudence.tas-cas.org (discovered
 * from the site's Angular bundle).
 *
 * Tool-shaped entry points preserve the previous signatures and output
 * shapes (`CasSearchOutput`, `CasAwardOutput`, `CasRecentOutput`) so existing
 * MCP clients continue to work without changes.
 */

import { DEFAULT_SCRAPER_CONFIG } from '../types.js';
import type {
  CasSearchInput,
  CasSearchOutput,
  CasSearchResult,
  CasRecentOutput,
  CasRecentDecision,
  CasAwardOutput,
  CasAwardDetails,
  CasBySportOutput
} from '../types.js';
import { normalizeCaseNumber, formatDate, retryWithBackoff, delay } from '../utils.js';
import { fetchJson, HttpError } from '../infrastructure/http-client.js';
import { withRateLimit, jurisprudenceRateLimiter } from '../infrastructure/rate-limiter.js';
import { searchCache, awardCache, recentCache, sportCache } from '../infrastructure/cache.js';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = DEFAULT_SCRAPER_CONFIG.baseUrl.replace(/\/$/, '');

// ============================================================================
// Raw API response shapes (only the fields we read)
// ============================================================================

interface TasSearchItem {
  guid: string;
  title: string | null;
  procedure: string | null;
  year: number | null;
  decisionDate: string | null;
  appellants: string | null;
  respondents: string | null;
  appellantsRep: string | null;
  respondentsRep: string | null;
  president: string | null;
  arbitrator1: string | null;
  arbitrator2: string | null;
  sportEn: string | null;
  sportFr: string | null;
  matterAbrv: string | null;
  outcome: string | null;
}

interface TasSearchResponse {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: TasSearchItem[];
}

interface TasArbitrator {
  name: string;
  role: string;
  countryName: string | null;
}

interface TasKeyword {
  nameEn: string | null;
  nameFr: string | null;
}

interface TasDetail {
  guid: string;
  caseLawProcedure?: { abreviation?: string; nameEn?: string } | null;
  sport?: { nameEn?: string } | null;
  matter?: { nameEn?: string } | null;
  outcome?: { decision?: string } | null;
  fileName: string;
  title: string | null;
  decisionDate: string | null;
  appellants?: string[] | null;
  respondents?: string[] | null;
  arbitrators?: TasArbitrator[] | null;
  keywords?: TasKeyword[] | null;
}

interface TasSportItem {
  guid: string;
  nameEn: string | null;
  nameFr: string | null;
}

interface TasSportResponse {
  items: TasSportItem[];
}

// ============================================================================
// Procedure / sport referentials
// ============================================================================

type ProcedureMap = Record<string, string>; // abbr -> guid

const PROCEDURE_TYPE_TO_ABBR: Record<string, string> = {
  Appeal: 'A',
  Ordinary: 'O',
  'Anti-Doping': 'ADD',
  Advisory: 'C'
};

let procedureMapPromise: Promise<ProcedureMap> | null = null;

async function fetchProcedureMap(): Promise<ProcedureMap> {
  const data = await apiFetchJson<unknown>(
    `${API_BASE}/CaseLawProcedure/AllCaseLawProcedures`
  );
  const map: ProcedureMap = {};
  // Defensive: accept either an array of { abreviation, guid } or a { ABBR: guid|{guid} } map.
  if (Array.isArray(data)) {
    for (const raw of data as Array<Record<string, unknown>>) {
      const abbr =
        (raw.abreviation as string | undefined) ??
        (raw.abbreviation as string | undefined);
      const guid =
        (raw.guid as string | undefined) ??
        (raw.id as string | undefined);
      if (abbr && guid) map[String(abbr).toUpperCase()] = String(guid);
    }
  } else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (typeof v === 'string') {
        map[k.toUpperCase()] = v;
      } else if (v && typeof v === 'object' && 'guid' in (v as Record<string, unknown>)) {
        const guid = (v as { guid: unknown }).guid;
        if (guid) map[k.toUpperCase()] = String(guid);
      }
    }
  }
  return map;
}

async function getProcedureGuid(abbr: string): Promise<string | null> {
  if (!procedureMapPromise) {
    procedureMapPromise = fetchProcedureMap().catch((err) => {
      // Don't poison the cache: clear so the next call retries.
      procedureMapPromise = null;
      throw err;
    });
  }
  try {
    const map = await procedureMapPromise;
    return map[abbr.toUpperCase()] ?? null;
  } catch {
    return null;
  }
}

async function resolveSportGuid(name: string): Promise<string | null> {
  const key = `sport:${name.trim().toLowerCase()}`;
  const cached = sportCache.get(key) as string | null;
  if (cached !== null && cached !== undefined) {
    // Explicit null cached to mean "resolved to nothing"; we use a sentinel string.
    if (cached === '__null__') return null;
    return cached;
  }

  let guid: string | null = null;
  try {
    const response = await apiFetchJson<TasSportResponse>(
      `${API_BASE}/Sport/Search?Text=${encodeURIComponent(name)}`
    );
    const items = response.items ?? [];
    const needle = name.trim().toLowerCase();
    const exact = items.find((it) =>
      (it.nameEn && it.nameEn.toLowerCase() === needle) ||
      (it.nameFr && it.nameFr.toLowerCase() === needle)
    );
    guid = (exact ?? items[0])?.guid ?? null;
  } catch {
    guid = null;
  }

  sportCache.set(key, guid ?? '__null__');
  return guid;
}

// ============================================================================
// Mapping
// ============================================================================

function mapProcedureAbbr(abbr: string | null | undefined): CasSearchResult['procedure_type'] {
  if (!abbr) return null;
  const upper = abbr.toUpperCase();
  switch (upper) {
    case 'A': return 'Appeal';
    case 'O': return 'Ordinary';
    case 'AD':
    case 'ADD': return 'Anti-Doping';
    case 'C': return 'Advisory';
    default: return null;
  }
}

/**
 * Build best-effort PDF URL from a decision title like "2023/A/10168" or
 * "2020/A/7019 & 7035". Returns null for unparsable titles. The detail
 * endpoint uses its authoritative `fileName` instead.
 */
function buildPdfUrlFromTitle(title: string): string | null {
  const m = title.match(/(\d{4})\/([A-Z]{1,4})\/(\d+)/i);
  if (!m) return null;
  return `${API_BASE}/pdf/${m[3]}.pdf`;
}

function buildDeepLink(title: string, guid: string | undefined): string {
  const q = encodeURIComponent(title);
  const details = guid ? `&details=${guid}` : '';
  return `${API_BASE}/search?q=${q}&page=1&size=10${details}`;
}

function mapSearchItem(item: TasSearchItem): CasSearchResult | null {
  const title = String(item.title ?? '').trim();
  if (!title) return null;

  let normalized: string;
  try {
    normalized = normalizeCaseNumber(title);
  } catch {
    normalized = `CAS ${title}`;
  }

  const appellant = item.appellants?.trim() || null;
  const respondent = item.respondents?.trim() || null;
  const sport = item.sportEn?.trim() || item.sportFr?.trim() || null;
  const date = formatDate(item.decisionDate ?? '');
  const outcome = item.outcome?.trim();

  return {
    case_number: title,
    case_number_normalized: normalized,
    title: appellant && respondent ? `${appellant} v. ${respondent}` : `CAS Decision ${normalized}`,
    sport,
    procedure_type: mapProcedureAbbr(item.procedure),
    date,
    parties: {
      appellant,
      respondent
    },
    url: buildDeepLink(title, item.guid),
    pdf_url: buildPdfUrlFromTitle(title),
    snippet: outcome ? `Outcome: ${outcome}` : null
  };
}

function mapDetail(detail: TasDetail, fallbackTitle: string): CasAwardDetails {
  const title = String(detail.title ?? fallbackTitle ?? '').trim() || fallbackTitle;
  let normalized: string;
  try {
    normalized = normalizeCaseNumber(title);
  } catch {
    normalized = `CAS ${title}`;
  }

  const appellant = (detail.appellants ?? []).map((s) => s?.trim()).filter(Boolean).join(', ') || null;
  const respondent = (detail.respondents ?? []).map((s) => s?.trim()).filter(Boolean).join(', ') || null;
  const sport = detail.sport?.nameEn?.trim() || null;
  const date = formatDate(detail.decisionDate ?? '');

  return {
    case_number: title,
    case_number_normalized: normalized,
    title: appellant && respondent ? `${appellant} v. ${respondent}` : `CAS Decision ${normalized}`,
    sport,
    procedure_type: mapProcedureAbbr(detail.caseLawProcedure?.abreviation),
    date,
    parties: {
      appellant,
      respondent
    },
    arbitrators: (detail.arbitrators ?? []).map((a) => ({
      name: a.name,
      role: a.role === 'President' ? 'President' : 'Arbitrator',
      nationality: a.countryName?.trim() || undefined
    })),
    keywords: (detail.keywords ?? [])
      .map((k) => k.nameEn?.trim() || k.nameFr?.trim() || '')
      .filter((s): s is string => Boolean(s)),
    operative_part: null,
    summary: null,
    full_text: null,
    pdf_url: detail.fileName ? `${API_BASE}/pdf/${detail.fileName}` : '',
    source_url: buildDeepLink(title, detail.guid)
  };
}

// ============================================================================
// Network helpers: transient retry + rate-limited JSON fetch
// ============================================================================

function isTransientError(error: unknown): boolean {
  if (error instanceof HttpError) {
    // 5xx, request timeout, too many requests -> retry. 4xx other than 408/429 -> caller error, throw.
    return error.status >= 500 || error.status === 408 || error.status === 429;
  }
  // Anything else (fetch network errors, AbortError, etc.) is treated as transient.
  return true;
}

async function retryTransient<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error)) throw error;
      if (attempt < maxAttempts - 1) {
        await delay(baseDelayMs * Math.pow(2, attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function apiFetchJson<T>(url: string): Promise<T> {
  return withRateLimit(jurisprudenceRateLimiter, () =>
    retryTransient(() => fetchJson<T>(url, {
      timeout: DEFAULT_SCRAPER_CONFIG.timeout,
      userAgent: DEFAULT_SCRAPER_CONFIG.userAgent
    }))
  );
}

// ============================================================================
// Public API
// ============================================================================

function filtersAppliedFromInput(input: CasSearchInput): CasSearchOutput['filters_applied'] {
  return {
    sport: input.sport,
    year_from: input.year_from,
    year_to: input.year_to,
    procedure_type: input.procedure_type
  };
}

/**
 * Search CAS decisions via the JSON API. Preserves the previous
 * `CasSearchOutput` shape and cache key (`search:${JSON.stringify(input)}`).
 */
export async function searchCasDecisions(input: CasSearchInput): Promise<CasSearchOutput> {
  const cacheKey = `search:${JSON.stringify(input)}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached as CasSearchOutput;

  const params = new URLSearchParams();
  const query = (input.query ?? '').trim();
  // API rejects an empty Content with 400; cas_by_sport uses '*' as "no
  // textual filter, please".
  if (query && query !== '*') {
    params.set('Content', query);
  }
  if (input.sport) {
    const sportGuid = await resolveSportGuid(input.sport);
    if (sportGuid) params.set('Sports', sportGuid);
  }
  if (input.procedure_type) {
    const abbr = PROCEDURE_TYPE_TO_ABBR[input.procedure_type];
    if (abbr) {
      const guid = await getProcedureGuid(abbr);
      if (guid) params.set('Procedures', guid);
    }
  }
  if (input.year_from) params.set('StartDecisionDate', `${input.year_from}-01-01`);
  if (input.year_to) params.set('EndDecisionDate', `${input.year_to}-12-31`);
  params.set('CurrentPage', String(input.page));
  params.set('PageSize', String(input.page_size));

  const url = `${API_BASE}/CaseLawDocument/SearchCaseLawDocument?${params.toString()}`;
  const response = await apiFetchJson<TasSearchResponse>(url);

  const results = (response.items ?? [])
    .map(mapSearchItem)
    .filter((r): r is CasSearchResult => r !== null);

  const total = typeof response.totalCount === 'number' ? response.totalCount : results.length;

  const output: CasSearchOutput = {
    results,
    total,
    page: input.page,
    page_size: input.page_size,
    has_more: response.hasNext ?? false,
    query_used: input.query,
    filters_applied: filtersAppliedFromInput(input)
  };

  searchCache.set(cacheKey, output);
  return output;
}

/**
 * Browse CAS decisions by sport. Shares the underlying search API and only
 * adds the sport filter.
 */
export async function browseBySport(input: { sport: string; page?: number }): Promise<CasBySportOutput> {
  const page = input.page ?? 1;
  const result = await searchCasDecisions({
    query: '*',
    sport: input.sport,
    page,
    page_size: 25
  });
  return {
    sport: input.sport,
    results: result.results,
    total: result.total,
    page,
    has_more: result.has_more
  };
}

/**
 * Fetch full award detail by GUID.
 */
async function fetchDetail(guid: string): Promise<TasDetail> {
  return apiFetchJson<TasDetail>(`${API_BASE}/CaseLawDocument/${guid}`);
}

/**
 * Find a decision GUID by searching for an exact (normalized) case number.
 * Returns null when no exact title match is found.
 */
async function findGuidByCaseNumber(caseNumber: string): Promise<string | null> {
  const bare = caseNumber.replace(/\s*&\s*\d+(?:-\d+)?$/, '').trim();
  const url = `${API_BASE}/CaseLawDocument/SearchCaseLawDocument?Content=${encodeURIComponent(bare)}&CurrentPage=1&PageSize=25`;
  const response = await apiFetchJson<TasSearchResponse>(url);
  const items = response.items ?? [];
  const exact = items.find((it) => it.title === bare);
  if (exact) return exact.guid;

  // Try match on first number for compound ranges.
  const firstNumMatch = bare.match(/(\d{4})\/([A-Z]{1,4})\/(\d+)/i);
  if (firstNumMatch) {
    const needle = firstNumMatch[0];
    const byNeedle = items.find((it) => (it.title ?? '').startsWith(needle));
    if (byNeedle) return byNeedle.guid;
  }
  return null;
}

/**
 * Extract GUID from a jurisprudence.tas-cas.org URL — either the
 * `?details=<guid>` query parameter or the `/decision/...` path
 * (latter is resolved by searching for the case number).
 */
function extractGuidFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const details = u.searchParams.get('details');
    if (details) return details;
  } catch {
    return null;
  }
  return null;
}

function extractCaseNumberFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/decision\/(\d{4})\/([A-Z]{1,4})\/(\d+)/i);
    if (m) {
      const [, year, type, num] = m;
      return `CAS ${year}/${type.toUpperCase()}/${num}`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Get detailed award information. One of `caseNumber` or `url` is required.
 * `includeFullText` is accepted for backward compatibility but is not honored:
 * the full text is only available via the PDF at `pdf_url`.
 */
export async function getAwardDetails(
  caseNumber?: string,
  url?: string,
  _includeFullText: boolean = false
): Promise<CasAwardOutput> {
  // Cache key must match the prior implementation so cache survives the rewrite.
  let normalized: string | undefined;
  if (caseNumber) {
    try {
      normalized = normalizeCaseNumber(caseNumber);
    } catch {
      return { found: false, award: null, error: `Invalid case number format: "${caseNumber}"` };
    }
  }

  const cacheKey = `award:${normalized || url}:${_includeFullText}`;
  const cached = awardCache.get(cacheKey);
  if (cached) return cached as CasAwardOutput;

  try {
    let guid: string | null = null;
    let fallbackTitle = '';

    if (url) {
      guid = extractGuidFromUrl(url);
      if (!guid) {
        const fromPath = extractCaseNumberFromUrl(url);
        if (fromPath) {
          try {
            guid = await findGuidByCaseNumber(normalizeCaseNumber(fromPath));
            fallbackTitle = fromPath;
          } catch {
            guid = null;
          }
        }
      }
    }
    if (!guid && normalized) {
      guid = await findGuidByCaseNumber(normalized);
    }

    if (!guid) {
      const result: CasAwardOutput = { found: false, award: null, error: 'Case not found' };
      awardCache.set(cacheKey, result);
      return result;
    }

    const detail = await fetchDetail(guid);
    const award = mapDetail(detail, normalized ?? fallbackTitle);
    const result: CasAwardOutput = { found: true, award };
    awardCache.set(cacheKey, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const result: CasAwardOutput = { found: false, award: null, error: message };
    // Don't poison cache on failure.
    return result;
  }
}

/**
 * Get the most recent decisions. Relies on the API's default ordering
 * (decisionDate desc) when no explicit OrderByColumn is sent.
 */
export async function getRecentDecisions(limit: number = 10): Promise<CasRecentOutput> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const cacheKey = `recent:${safeLimit}`;
  const cached = recentCache.get(cacheKey);
  if (cached) return cached as CasRecentOutput;

  const params = new URLSearchParams();
  params.set('CurrentPage', '1');
  params.set('PageSize', String(safeLimit));

  try {
    const response = await apiFetchJson<TasSearchResponse>(
      `${API_BASE}/CaseLawDocument/SearchCaseLawDocument?${params.toString()}`
    );
    const items = (response.items ?? []).slice(0, safeLimit);

    const decisions: CasRecentDecision[] = items.map((it) => {
      const title = String(it.title ?? '').trim();
      let normalized: string;
      try {
        normalized = normalizeCaseNumber(title);
      } catch {
        normalized = `CAS ${title}`;
      }
      return {
        case_number: title,
        case_number_normalized: normalized,
        title,
        date: formatDate(it.decisionDate ?? ''),
        sport: it.sportEn?.trim() || it.sportFr?.trim() || null,
        pdf_url: buildPdfUrlFromTitle(title) ?? '',
        source_url: buildDeepLink(title, it.guid)
      };
    });

    const output: CasRecentOutput = {
      decisions,
      retrieved_at: new Date().toISOString(),
      source: 'jurisprudence.tas-cas.org'
    };
    recentCache.set(cacheKey, output);
    return output;
  } catch (error) {
    // Mirror the prior tool's behavior: on failure return an empty list with
    // an empty source so the caller doesn't crash.
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      decisions: [],
      retrieved_at: new Date().toISOString(),
      source: `error: ${message}`
    };
  }
}

// silence linter about unused helper
void retryWithBackoff;

/**
 * Reset module-level caches. Intended for tests — production code should
 * never need to call this. Clears the procedure referential promise and the
 * sport GUID cache so the next call fetches fresh data.
 */
export function __resetCachesForTest(): void {
  procedureMapPromise = null;
  sportCache.clear();
}
