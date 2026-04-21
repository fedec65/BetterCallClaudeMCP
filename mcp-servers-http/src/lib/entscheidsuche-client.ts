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
  dateFrom?: string;
  dateTo?: string;
  size?: number;
  from?: number;
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
  fullText?: string;
  score: number;
  bgeReference?: string;
  relatedDecisions?: string[];
  metadata?: {
    spider: string;
    hierarchy: string[];
    reference: string[];
  };
}

export interface SearchResult {
  decisions: Decision[];
  total: number;
}

// --- Court mapping ---

const COURT_MAP: Record<string, { name: string; canton?: string; level: 'federal' | 'cantonal' }> = {
  'CH_BGer': { name: 'Bundesgericht', level: 'federal' },
  'CH_BGE': { name: 'Bundesgericht (BGE)', level: 'federal' },
  'CH_BVGer': { name: 'Bundesverwaltungsgericht', level: 'federal' },
  'CH_BPatGer': { name: 'Bundespatentgericht', level: 'federal' },
  'CH_BStGer': { name: 'Bundesstrafgericht', level: 'federal' },
  'ZH_OG': { name: 'Obergericht Zürich', canton: 'ZH', level: 'cantonal' },
  'ZH_VG': { name: 'Verwaltungsgericht Zürich', canton: 'ZH', level: 'cantonal' },
  'BE_OG': { name: 'Obergericht Bern', canton: 'BE', level: 'cantonal' },
  'BE_VG': { name: 'Verwaltungsgericht Bern', canton: 'BE', level: 'cantonal' },
  'GE_CJ': { name: 'Cour de justice de Genève', canton: 'GE', level: 'cantonal' },
  'GE_TA': { name: 'Tribunal administratif de Genève', canton: 'GE', level: 'cantonal' },
  'BS_OG': { name: 'Appellationsgericht Basel-Stadt', canton: 'BS', level: 'cantonal' },
  'BS_VG': { name: 'Verwaltungsgericht Basel-Stadt', canton: 'BS', level: 'cantonal' },
  'VD_TC': { name: 'Tribunal cantonal Vaud', canton: 'VD', level: 'cantonal' },
  'TI_CCA': { name: 'Tribunale cantonale Ticino', canton: 'TI', level: 'cantonal' },
};

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
    return this.normalizeSearchResponse(response, filters.language);
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

    if (filters.language) {
      must.push({ term: { 'attachment.language': filters.language } });
    }

    if (filters.dateFrom || filters.dateTo) {
      const range: Record<string, string> = {};
      if (filters.dateFrom) range.gte = filters.dateFrom;
      if (filters.dateTo) range.lte = filters.dateTo;
      must.push({ range: { date: range } });
    }

    const query = must.length === 1
      ? must[0]
      : { bool: { must } };

    return {
      size: filters.size || 10,
      from: filters.from || 0,
      sort: [{ date: 'desc' }],
      query,
    };
  }

  // --- Private: Response normalization ---

  private normalizeSearchResponse(response: any, preferredLang?: string): SearchResult {
    if (!response?.hits?.hits) {
      return { decisions: [], total: 0 };
    }

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    const decisions = response.hits.hits.map((hit: any) =>
      this.normalizeHit(hit, preferredLang)
    );

    return { decisions, total };
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
      fullText: source.attachment?.content,
      score: hit._score || 0,
      bgeReference: this.extractBGEReference(title, hit._id),
      relatedDecisions: [],
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
}
