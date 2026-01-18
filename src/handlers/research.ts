import type { LegalResearchInput, LegalResearchOutput, ResearchResult } from '../types/index.js';
import { searchCache, LegalCache } from '../infrastructure/cache.js';
import { fetchWithRetry, entscheidsuche, fedlexClient, parseApiError } from '../infrastructure/http-client.js';

/**
 * Search Entscheidsuche.ch for court decisions
 */
async function searchEntscheidsuche(
  query: string,
  options: {
    jurisdiction?: string;
    canton?: string;
    dateFrom?: string;
    dateTo?: string;
    maxResults: number;
  }
): Promise<ResearchResult[]> {
  const cacheKey = LegalCache.generateKey('entscheidsuche', { query, ...options });
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached as ResearchResult[];
  }

  try {
    // Build search URL - Entscheidsuche uses GET with query params
    const params = new URLSearchParams();
    params.set('q', query);
    if (options.canton) {
      params.set('court', options.canton.toLowerCase());
    }
    if (options.dateFrom) {
      params.set('from', options.dateFrom);
    }
    if (options.dateTo) {
      params.set('to', options.dateTo);
    }
    params.set('limit', String(options.maxResults));

    const response = await fetchWithRetry('entscheidsuche', async () => {
      return entscheidsuche.get(`/api/search?${params.toString()}`);
    });

    const results: ResearchResult[] = [];

    // Parse Entscheidsuche response format
    if (response.data && Array.isArray(response.data.results)) {
      for (const item of response.data.results.slice(0, options.maxResults)) {
        results.push({
          citation: item.reference || item.id || '',
          title: item.title || item.summary?.substring(0, 100) || '',
          summary: item.summary || item.excerpt || '',
          date: item.date || item.decision_date || '',
          court: item.court || item.authority || undefined,
          chamber: item.chamber || undefined,
          relevanceScore: item.score ? item.score / 100 : 0.5,
          sourceUrl: item.url || `https://entscheidsuche.ch/docs/${item.id}`,
          language: detectResultLanguage(item.title || item.summary || ''),
        });
      }
    }

    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Entscheidsuche search error:', parseApiError(error));
    return [];
  }
}

/**
 * Search Fedlex for federal legislation
 */
async function searchFedlex(
  query: string,
  options: {
    dateFrom?: string;
    dateTo?: string;
    maxResults: number;
    lang?: string;
  }
): Promise<ResearchResult[]> {
  const cacheKey = LegalCache.generateKey('fedlex', { query, ...options });
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached as ResearchResult[];
  }

  try {
    // SPARQL query for Fedlex
    const langCode = options.lang || 'de';
    const sparqlQuery = `
      PREFIX schema: <http://schema.org/>
      PREFIX eli: <http://data.europa.eu/eli/ontology#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

      SELECT DISTINCT ?work ?title ?date ?type
      WHERE {
        ?work a eli:LegalResource .
        ?work eli:title ?title .
        OPTIONAL { ?work eli:date_document ?date }
        OPTIONAL { ?work eli:type_document ?type }
        FILTER(LANG(?title) = "${langCode}")
        FILTER(CONTAINS(LCASE(?title), LCASE("${query.replace(/"/g, '\\"')}")))
      }
      LIMIT ${options.maxResults}
    `;

    const response = await fetchWithRetry('fedlex', async () => {
      return fedlexClient.post('/sparql', `query=${encodeURIComponent(sparqlQuery)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    });

    const results: ResearchResult[] = [];

    if (response.data?.results?.bindings) {
      for (const binding of response.data.results.bindings.slice(0, options.maxResults)) {
        const workUri = binding.work?.value || '';
        const srNumber = extractSRNumber(workUri);

        results.push({
          citation: srNumber || workUri,
          title: binding.title?.value || '',
          summary: `Federal legislation: ${binding.title?.value || ''}`,
          date: binding.date?.value || '',
          relevanceScore: 0.7, // Statutes are generally highly relevant
          sourceUrl: workUri || `https://fedlex.data.admin.ch`,
          language: langCode as 'de' | 'fr' | 'it' | 'en',
        });
      }
    }

    searchCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Fedlex search error:', parseApiError(error));
    return [];
  }
}

/**
 * Extract SR number from Fedlex URI
 */
function extractSRNumber(uri: string): string {
  // Example: https://fedlex.data.admin.ch/eli/cc/27/317_321_377 -> SR 27.317
  const match = uri.match(/\/eli\/cc\/(\d+)\/(\d+)/);
  if (match) {
    return `SR ${match[1]}.${match[2]}`;
  }
  return '';
}

/**
 * Detect language from text
 */
function detectResultLanguage(text: string): 'de' | 'fr' | 'it' | 'en' {
  const germanIndicators = /\b(der|die|das|und|ist|ein|eine)\b/gi;
  const frenchIndicators = /\b(le|la|les|de|du|des|et|est)\b/gi;
  const italianIndicators = /\b(il|la|le|di|del|della|e|è)\b/gi;

  const germanMatches = (text.match(germanIndicators) || []).length;
  const frenchMatches = (text.match(frenchIndicators) || []).length;
  const italianMatches = (text.match(italianIndicators) || []).length;

  if (frenchMatches > germanMatches && frenchMatches > italianMatches) return 'fr';
  if (italianMatches > germanMatches && italianMatches > frenchMatches) return 'it';
  return 'de';
}

/**
 * Handle the legal_research tool
 * Searches Swiss legal sources for relevant precedents and statutes
 */
export async function handleLegalResearch(
  input: LegalResearchInput,
  _requestId: string
): Promise<LegalResearchOutput> {
  const {
    query,
    jurisdiction,
    canton,
    dateFrom,
    dateTo,
    sources,
    domain,
    maxResults = 10,
    lang,
  } = input;

  const allResults: ResearchResult[] = [];
  const searchSources = sources || ['precedent', 'statute'];

  // Search for precedents (court decisions)
  if (searchSources.includes('precedent')) {
    const precedentResults = await searchEntscheidsuche(query, {
      jurisdiction,
      canton,
      dateFrom,
      dateTo,
      maxResults: Math.ceil(maxResults * 0.7), // 70% of results from precedents
    });
    allResults.push(...precedentResults);
  }

  // Search for statutes
  if (searchSources.includes('statute')) {
    const statuteResults = await searchFedlex(query, {
      dateFrom,
      dateTo,
      maxResults: Math.ceil(maxResults * 0.3), // 30% of results from statutes
      lang,
    });
    allResults.push(...statuteResults);
  }

  // Sort by relevance score
  allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Limit to requested max
  const finalResults = allResults.slice(0, maxResults);

  // Generate search suggestions if few results
  const suggestions: string[] = [];
  if (finalResults.length < 3) {
    suggestions.push('Try broader search terms');
    if (jurisdiction === 'cantonal') {
      suggestions.push('Consider searching federal precedents as well');
    }
    if (dateFrom || dateTo) {
      suggestions.push('Try removing date filters');
    }
  }

  return {
    results: finalResults,
    totalResults: finalResults.length,
    query,
    filters: {
      jurisdiction,
      canton,
      dateFrom,
      dateTo,
      domain,
    },
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
