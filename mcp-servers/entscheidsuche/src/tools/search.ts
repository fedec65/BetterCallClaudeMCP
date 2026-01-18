import type { SearchInput, SearchOutput, SearchResultItem, Language } from '../types.js';

const ENTSCHEIDSUCHE_API_BASE = 'https://entscheidsuche.ch/api/v1';

/**
 * Build the search URL with query parameters
 */
export function buildSearchUrl(input: SearchInput): string {
  const params = new URLSearchParams();

  params.set('query', input.query);
  params.set('limit', String(input.limit));

  if (input.courts && input.courts.length > 0) {
    params.set('courts', input.courts.join(','));
  }

  if (input.dateFrom) {
    params.set('dateFrom', input.dateFrom);
  }

  if (input.dateTo) {
    params.set('dateTo', input.dateTo);
  }

  if (input.canton) {
    params.set('canton', input.canton);
  }

  if (input.legalDomain) {
    params.set('legalDomain', input.legalDomain);
  }

  if (input.language) {
    params.set('language', input.language);
  }

  return `${ENTSCHEIDSUCHE_API_BASE}/search?${params.toString()}`;
}

/**
 * Raw API response structure
 */
interface ApiSearchResult {
  id: string;
  title: string;
  court: string;
  date: string;
  reference: string;
  summary?: string;
  legalDomain?: string;
  language: string;
  url?: string;
}

interface ApiSearchResponse {
  results: ApiSearchResult[];
  total: number;
}

/**
 * Parse the API response into our output format
 */
export function parseSearchResponse(
  response: ApiSearchResponse,
  query: string,
  filters: SearchOutput['filters']
): SearchOutput {
  const results: SearchResultItem[] = response.results.map((item) => ({
    id: item.id,
    title: item.title,
    court: item.court,
    date: item.date,
    reference: item.reference,
    summary: item.summary,
    legalDomain: item.legalDomain,
    language: item.language as Language,
    url: item.url,
  }));

  return {
    results,
    totalCount: response.total,
    query,
    filters,
  };
}

/**
 * Search Swiss court decisions via entscheidsuche.ch API
 */
export async function searchDecisions(input: SearchInput): Promise<SearchOutput> {
  const url = buildSearchUrl(input);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Entscheidsuche API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiSearchResponse;

  const filters: SearchOutput['filters'] = {};
  if (input.courts) filters.courts = input.courts;
  if (input.dateFrom) filters.dateFrom = input.dateFrom;
  if (input.dateTo) filters.dateTo = input.dateTo;
  if (input.canton) filters.canton = input.canton;
  if (input.legalDomain) filters.legalDomain = input.legalDomain;
  if (input.language) filters.language = input.language;

  return parseSearchResponse(data, input.query, filters);
}
