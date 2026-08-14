/**
 * Simplified EntscheidSuche API Client (HTTP service version)
 *
 * Lightweight client for entscheidsuche.ch Elasticsearch API.
 * No Bottleneck, no p-retry, no axios — just native fetch with basic retry.
 */

const DEFAULT_BASE_URL = 'https://entscheidsuche.ch';
const DEFAULT_TIMEOUT = 15000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const MIN_REQUEST_INTERVAL = 200; // 5 req/sec max

// --- Types ---

export interface SearchFilters {
  query: string;
  courts?: string[];
  cantons?: string[];
  language?: 'de' | 'fr' | 'it';
  languageFilter?: ('de' | 'fr' | 'it')[];
  dateFrom?: string;
  dateTo?: string;
  scrapeDateFrom?: string;
  scrapeDateTo?: string;
  size?: number;
  from?: number;
  searchAfter?: unknown[];
  includeAggregations?: boolean;
}

export interface Decision {
  decisionId: string;
  signature: string;
  title: string;
  summary: string;
  decisionDate: string;
  language: 'de' | 'fr' | 'it';
  court: string;
  courtLevel: 'federal' | 'cantonal';
  canton?: string;
  chamber?: string;
  legalAreas: string[];
  sourceUrl: string;
  documentUrl?: string;
  originalUrl?: string;
  fullText?: string;
  score: number;
  bgeReference?: string;
  relatedDecisions?: string[];
  isPdf?: boolean;
  scrapeDate?: string;
  highlights?: Record<string, string>;
  metadata?: {
    spider: string;
    hierarchy: string[];
    reference: string[];
  };
}

export interface SearchResult {
  decisions: Decision[];
  total: number;
  nextCursor?: unknown[];
  aggregations?: Record<string, number>;
}

export interface HierarchyEntry {
  id: string;
  count: number;
}

export interface LocalizedLabels {
  de?: string;
  fr?: string;
  it?: string;
}

export interface FacetNode extends LocalizedLabels {
  id: string;
  children?: FacetNode[];
}

import { COURT_MAP } from './entscheidsuche-courts.js';

// --- Client ---

export class EntscheidSucheClient {
  private baseUrl: string;
  private timeout: number;
  private lastRequestTime = 0;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.ENTSCHEIDSUCHE_API_URL || DEFAULT_BASE_URL;
    this.timeout = Number(process.env.ENTSCHEIDSUCHE_TIMEOUT) || DEFAULT_TIMEOUT;
  }

  /**
   * Search decisions via Elasticsearch API
   */
  async searchDecisions(filters: SearchFilters): Promise<SearchResult> {
    const esQuery = this.buildElasticsearchQuery(filters);
    const response = await this.post('/_search.php', esQuery);
    return this.normalizeSearchResponse(response, filters);
  }

  /**
   * Search decisions by case number / BGE citation.
   * Wraps the value in quotes to force an exact phrase search.
   */
  async searchByCaseNumber(
    caseNumber: string,
    filters?: Omit<SearchFilters, 'query'>
  ): Promise<SearchResult> {
    return this.searchDecisions({
      ...(filters || {}),
      query: `"${caseNumber.replace(/"/g, '\\"')}"`,
      size: filters?.size || 20,
    } as SearchFilters);
  }

  /**
   * Search BGE decisions by citation
   */
  async searchBGE(citation: string): Promise<SearchResult> {
    const match = citation.match(/(?:BGE|ATF|DTF)?\s*(\d{2,3})\s+(I{1,3}|IV|V)\s+(\d+)/i);
    if (!match) {
      return { decisions: [], total: 0 };
    }
    const quotedCitation = `"${match[1]} ${match[2].toUpperCase()} ${match[3]}"`;
    return this.searchDecisions({
      query: quotedCitation,
      courts: ['CH_BGer', 'CH_BGE'],
      size: 10,
    });
  }

  /**
   * Get individual decision by signature
   */
  async getDecision(signature: string): Promise<Decision | null> {
    const spider = this.extractSpider(signature);
    if (!spider) return null;

    try {
      const data = await this.get(`/docs/${spider}/${encodeURIComponent(signature)}.json`);
      if (!data) return null;
      return this.normalizeHit({ _id: signature, _score: 1, _source: data });
    } catch {
      return null;
    }
  }

  /**
   * List available hierarchy IDs with hit counts.
   */
  async listHierarchy(query?: string, size: number = 1000): Promise<{
    entries: HierarchyEntry[];
    total: number;
  }> {
    const must: object[] = [];
    if (query && query !== '*') {
      must.push({
        simple_query_string: {
          query,
          default_operator: 'and',
        },
      });
    }

    const body: Record<string, unknown> = {
      size: 0,
      aggs: {
        hierarchy: {
          terms: {
            field: 'hierarchy',
            size: Math.min(size, 10000),
            order: { _count: 'desc' },
          },
        },
      },
    };

    if (must.length === 1) {
      body.query = must[0];
    } else if (must.length > 1) {
      body.query = { bool: { must } };
    }

    const response = await this.post('/_search.php', body);

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    const entries = (response.aggregations?.hierarchy?.buckets || []).map((bucket: any) => ({
      id: bucket.key,
      count: bucket.doc_count,
    }));

    return { entries, total };
  }

  /**
   * Return the localized facet tree (canton → court → chamber).
   */
  async listFacets(): Promise<FacetNode[]> {
    const data = await this.get('/docs/Facetten_alle.json');
    if (!data) {
      throw new Error('Failed to load facet tree');
    }
    return Object.entries(data as Record<string, unknown>).map(([id, node]) =>
      this.buildFacetNode(id, node as FacetFileNode)
    );
  }

  // --- Private: HTTP ---

  private async post(path: string, body: unknown): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async get(path: string): Promise<any> {
    return this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<any> {
    // Basic rate limiting
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL) {
      await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
    }
    this.lastRequestTime = Date.now();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if ((error as Error).name === 'AbortError') {
          lastError = new Error('Request timeout');
        }
        // Don't retry on 4xx
        if (lastError.message.includes('HTTP 4')) break;
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  // --- Private: Elasticsearch query builder ---

  private buildElasticsearchQuery(filters: SearchFilters): object {
    const must: object[] = [];

    if (filters.query) {
      must.push({
        simple_query_string: {
          query: filters.query,
          default_operator: 'and',
        },
      });
    }

    if (filters.courts && filters.courts.length > 0) {
      must.push({ terms: { hierarchy: filters.courts } });
    }

    if (filters.cantons && filters.cantons.length > 0) {
      must.push({ terms: { hierarchy: filters.cantons } });
    }

    if (filters.languageFilter && filters.languageFilter.length > 0) {
      must.push({ terms: { 'attachment.language': filters.languageFilter } });
    } else if (filters.language) {
      must.push({ term: { 'attachment.language': filters.language } });
    }

    if (filters.dateFrom || filters.dateTo) {
      const range: Record<string, string> = {};
      if (filters.dateFrom) range.gte = filters.dateFrom;
      if (filters.dateTo) range.lte = filters.dateTo;
      must.push({ range: { date: range } });
    }

    if (filters.scrapeDateFrom || filters.scrapeDateTo) {
      const range: Record<string, string> = {};
      if (filters.scrapeDateFrom) range.gte = filters.scrapeDateFrom;
      if (filters.scrapeDateTo) range.lte = filters.scrapeDateTo;
      must.push({ range: { scrape_date: range } });
    }

    const body: Record<string, unknown> = {
      size: filters.size || 10,
      from: filters.from ?? 0,
      sort: [{ date: 'desc' }, '_score'],
      highlight: {
        fields: {
          'attachment.content': {},
          title: {},
          abstract: {},
        },
        number_of_fragments: 3,
        fragment_size: 300,
      },
    };

    if (filters.searchAfter && filters.searchAfter.length > 0) {
      body.search_after = filters.searchAfter;
      delete body.from;
    }

    if (filters.includeAggregations) {
      body.aggs = {
        hierarchy: {
          terms: {
            field: 'hierarchy',
            size: 100,
            order: { _count: 'desc' },
          },
        },
      };
    }

    const query = must.length === 1
      ? must[0]
      : { bool: { must } };

    return {
      ...body,
      query,
    };
  }

  // --- Private: Response normalization ---

  private normalizeSearchResponse(response: any, filters: SearchFilters): SearchResult {
    if (!response?.hits?.hits) {
      return { decisions: [], total: 0 };
    }

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    const decisions = response.hits.hits.map((hit: any) =>
      this.normalizeHit(hit, filters.language)
    );

    const result: SearchResult = { decisions, total };

    const size = filters.size || 10;
    if (decisions.length > 0 && decisions.length >= size) {
      const last = decisions[decisions.length - 1];
      result.nextCursor = [last.score, last.decisionId];
    }

    if (filters.includeAggregations && response.aggregations?.hierarchy) {
      result.aggregations = response.aggregations.hierarchy.buckets.reduce(
        (acc: Record<string, number>, bucket: any) => {
          acc[bucket.key] = bucket.doc_count;
          return acc;
        },
        {}
      );
    }

    return result;
  }

  private normalizeHit(hit: any, preferredLang?: string): Decision {
    const source = hit._source || {};
    const lang = preferredLang || source.attachment?.language || 'de';
    const spider = this.extractSpider(hit._id) || '';
    const courtInfo = COURT_MAP[spider];

    const title = this.extractLocalizedText(source.title, lang)
      || (source.reference?.[0])
      || hit._id;

    const summary = this.extractLocalizedText(source.abstract, lang) || '';

    const highlights: Record<string, string> = {};
    if (hit.highlight) {
      for (const [field, fragments] of Object.entries(hit.highlight)) {
        if (Array.isArray(fragments) && fragments.length > 0) {
          highlights[field] = fragments.join(' … ');
        }
      }
    }

    return {
      decisionId: hit._id,
      signature: hit._id,
      title,
      summary,
      decisionDate: source.date || '',
      language: (source.attachment?.language || 'de') as 'de' | 'fr' | 'it',
      court: courtInfo?.name || spider,
      courtLevel: courtInfo?.level || (spider.startsWith('CH_') ? 'federal' : 'cantonal'),
      canton: courtInfo?.canton,
      legalAreas: [],
      sourceUrl: source.attachment?.content_url || `${this.baseUrl}/docs/${spider}/${hit._id}`,
      documentUrl: spider && hit._id
        ? `${this.baseUrl}/docs/${spider}/${hit._id}.html`
        : undefined,
      originalUrl: source.original_url,
      fullText: source.attachment?.content,
      score: hit._score || 0,
      bgeReference: this.extractBGEReference(title, hit._id),
      relatedDecisions: [],
      isPdf: source.is_pdf,
      scrapeDate: source.scrape_date,
      highlights,
      metadata: {
        spider,
        hierarchy: source.hierarchy || [],
        reference: source.reference || [],
      },
    };
  }

  private extractLocalizedText(obj: Record<string, string> | undefined, lang: string): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    return obj[lang] || obj.de || obj.fr || obj.it || Object.values(obj)[0];
  }

  private extractSpider(signature: string): string | null {
    if (!signature) return null;
    const parts = signature.split('_');
    return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : null;
  }

  private extractBGEReference(title: string, id: string): string | undefined {
    const combined = `${title} ${id}`;
    const match = combined.match(/(\d{2,3})\s+(I{1,3}|IV|V)\s+(\d+)/);
    return match ? `BGE ${match[1]} ${match[2]} ${match[3]}` : undefined;
  }

  // --- Private: Facet tree builder ---

  private buildFacetNode(id: string, node: FacetFileNode): FacetNode {
    const children: FacetNode[] = [];
    for (const [courtId, court] of Object.entries(node.gerichte || {})) {
      children.push(this.buildCourtNode(courtId, court as FacetCourtNode));
    }
    return {
      id,
      de: node.de,
      fr: node.fr,
      it: node.it,
      children: children.length > 0 ? children : undefined,
    };
  }

  private buildCourtNode(id: string, node: FacetCourtNode): FacetNode {
    const children: FacetNode[] = [];
    for (const [chamberId, chamber] of Object.entries(node.kammern || {})) {
      const ch = chamber as FacetChamberNode;
      children.push({
        id: chamberId,
        de: ch.de,
        fr: ch.fr,
        it: ch.it,
      });
    }
    return {
      id,
      de: node.de,
      fr: node.fr,
      it: node.it,
      children: children.length > 0 ? children : undefined,
    };
  }
}

interface FacetFileNode extends LocalizedLabels {
  gerichte?: Record<string, FacetCourtNode>;
}

interface FacetCourtNode extends LocalizedLabels {
  kammern?: Record<string, FacetChamberNode>;
}

interface FacetChamberNode extends LocalizedLabels {
  spider?: string;
}
