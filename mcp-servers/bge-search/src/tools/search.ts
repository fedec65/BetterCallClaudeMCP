import type {
  SearchInput,
  SearchOutput,
  SearchResultItem,
  BGESection,
  LegalDomain,
  Language,
} from '../types.js';

const BGE_SEARCH_API_BASE = 'https://bger.ch/api/v1';

/**
 * Build the search URL with query parameters
 */
export function buildSearchUrl(input: SearchInput): string {
  const params = new URLSearchParams();
  params.set('query', input.query);
  params.set('limit', String(input.limit));

  if (input.volume !== undefined) {
    params.set('volume', String(input.volume));
  }
  if (input.section !== undefined) {
    params.set('section', input.section);
  }
  if (input.yearFrom !== undefined) {
    params.set('yearFrom', String(input.yearFrom));
  }
  if (input.yearTo !== undefined) {
    params.set('yearTo', String(input.yearTo));
  }
  if (input.legalDomain !== undefined) {
    params.set('legalDomain', input.legalDomain);
  }
  if (input.language !== undefined) {
    params.set('language', input.language);
  }

  return `${BGE_SEARCH_API_BASE}/search?${params.toString()}`;
}

/**
 * Raw API response structure for search
 */
interface ApiSearchResponse {
  results: Array<{
    citation: string;
    title: string;
    date: string;
    section: string;
    volume: number;
    page: number;
    summary?: string;
    language: string;
    url?: string;
  }>;
  total: number;
}

/**
 * Parse the API response into our output format
 */
export function parseSearchResponse(
  response: ApiSearchResponse,
  query: string,
  filters: {
    volume?: number;
    section?: BGESection;
    yearFrom?: number;
    yearTo?: number;
    legalDomain?: LegalDomain;
    language?: Language;
  }
): SearchOutput {
  const results: SearchResultItem[] = response.results.map((r) => ({
    citation: r.citation,
    title: r.title,
    date: r.date,
    section: r.section as BGESection,
    volume: r.volume,
    page: r.page,
    summary: r.summary,
    language: r.language as Language,
    url: r.url,
  }));

  return {
    query,
    filters,
    results,
    totalCount: response.total,
  };
}

/**
 * Search BGE decisions via API
 */
export async function searchBGE(input: SearchInput): Promise<SearchOutput> {
  const url = buildSearchUrl(input);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`BGE Search API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ApiSearchResponse;

  const filters: {
    volume?: number;
    section?: BGESection;
    yearFrom?: number;
    yearTo?: number;
    legalDomain?: LegalDomain;
    language?: Language;
  } = {};

  if (input.volume !== undefined) filters.volume = input.volume;
  if (input.section !== undefined) filters.section = input.section;
  if (input.yearFrom !== undefined) filters.yearFrom = input.yearFrom;
  if (input.yearTo !== undefined) filters.yearTo = input.yearTo;
  if (input.legalDomain !== undefined) filters.legalDomain = input.legalDomain;
  if (input.language !== undefined) filters.language = input.language;

  return parseSearchResponse(data, input.query, filters);
}
