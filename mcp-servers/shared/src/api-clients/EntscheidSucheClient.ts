/**
 * EntscheidSuche API Client
 * Real integration with entscheidsuche.ch Elasticsearch API
 *
 * API: POST https://entscheidsuche.ch/_search.php
 * Docs: https://entscheidsuche.ch/docs/
 * Format: Elasticsearch simple_query_string
 *
 * Response signature format: country_court_year_casetype_number_year
 * Spider names identify courts (e.g., CH_BGer = Swiss Federal Supreme Court)
 */

import { BaseAPIClient, APIClientOptions } from './BaseAPIClient';

/**
 * Hierarchy name to court mapping for common Swiss courts.
 * Keys match the hierarchy[1] values from the entscheidsuche.ch API response.
 * This is a minimal fallback; the client also loads Facetten_alle.json at runtime
 * for the full localized court/chamber tree.
 */
const COURT_MAP: Record<string, { name: string; canton?: string; level: 'federal' | 'cantonal' }> = {
  // Federal courts
  'CH_BGer': { name: 'Bundesgericht / Tribunal fédéral', level: 'federal' },
  'CH_BGE': { name: 'Bundesgericht (BGE)', level: 'federal' },
  'CH_BVGE': { name: 'Bundesverwaltungsgericht', level: 'federal' },
  'CH_BVGE_001': { name: 'Bundesverwaltungsgericht', level: 'federal' },
  'CH_BPatGer': { name: 'Bundespatentgericht', level: 'federal' },
  'CH_BStGer': { name: 'Bundesstrafgericht', level: 'federal' },
  'CH_BSTG': { name: 'Bundesstrafgericht', level: 'federal' },
  'CH_BSTG_001': { name: 'Bundesstrafgericht', level: 'federal' },
  'CH_PATG': { name: 'Bundespatentgericht', level: 'federal' },
  // Cantonal courts (using actual hierarchy values from the API)
  'ZH_OG': { name: 'Obergericht Zürich', canton: 'ZH', level: 'cantonal' },
  'ZH_VG': { name: 'Verwaltungsgericht Zürich', canton: 'ZH', level: 'cantonal' },
  'ZH_BK': { name: 'Bezirksgerichte Zürich', canton: 'ZH', level: 'cantonal' },
  'ZH_SVG': { name: 'Sozialversicherungsgericht Zürich', canton: 'ZH', level: 'cantonal' },
  'ZH_HG': { name: 'Handelsgericht Zürich', canton: 'ZH', level: 'cantonal' },
  'ZH_KSG': { name: 'Kantonsgericht Zürich', canton: 'ZH', level: 'cantonal' },
  'BE_OG': { name: 'Obergericht Bern', canton: 'BE', level: 'cantonal' },
  'BE_VG': { name: 'Verwaltungsgericht Bern', canton: 'BE', level: 'cantonal' },
  'GE_CJ': { name: 'Cour de justice de Genève', canton: 'GE', level: 'cantonal' },
  'GE_TAPI': { name: 'Tribunal administratif Genève', canton: 'GE', level: 'cantonal' },
  'BS_AG': { name: 'Appellationsgericht Basel-Stadt', canton: 'BS', level: 'cantonal' },
  'BS_APG': { name: 'Appellationsgericht Basel-Stadt', canton: 'BS', level: 'cantonal' },
  'VD_TC': { name: 'Tribunal cantonal Vaud', canton: 'VD', level: 'cantonal' },
  'TI_CRP2': { name: "Tribunale d'appello Ticino", canton: 'TI', level: 'cantonal' },
  'TI_TRAC': { name: "Tribunale d'appello Ticino", canton: 'TI', level: 'cantonal' },
  'SG_OG': { name: 'Kantonsgericht St. Gallen', canton: 'SG', level: 'cantonal' },
  'SG_VSG': { name: 'Kantonsgericht St. Gallen', canton: 'SG', level: 'cantonal' },
  'AG_OG': { name: 'Obergericht Aargau', canton: 'AG', level: 'cantonal' },
  'LU_KG': { name: 'Kantonsgericht Luzern', canton: 'LU', level: 'cantonal' },
  'FR_TC': { name: 'Tribunal cantonal Fribourg', canton: 'FR', level: 'cantonal' },
  'GR_KG': { name: 'Kantonsgericht Graubünden', canton: 'GR', level: 'cantonal' },
  'GR_VG': { name: 'Verwaltungsgericht Graubünden', canton: 'GR', level: 'cantonal' },
  'NE_TC': { name: 'Tribunal cantonal Neuchâtel', canton: 'NE', level: 'cantonal' },
  'SO_OG': { name: 'Obergericht Solothurn', canton: 'SO', level: 'cantonal' },
  'BL_KG': { name: 'Kantonsgericht Basel-Landschaft', canton: 'BL', level: 'cantonal' },
  'SZ_KG': { name: 'Kantonsgericht Schwyz', canton: 'SZ', level: 'cantonal' },
  'JU_TC': { name: 'Tribunal cantonal Jura', canton: 'JU', level: 'cantonal' },
  'SH_OG': { name: 'Obergericht Schaffhausen', canton: 'SH', level: 'cantonal' },
  'TG_OG': { name: 'Obergericht Thurgau', canton: 'TG', level: 'cantonal' },
  'AR_OG': { name: 'Appellationsgericht Appenzell Ausserrhoden', canton: 'AR', level: 'cantonal' },
  'ZG_OG': { name: 'Obergericht Zug', canton: 'ZG', level: 'cantonal' },
  'OW_OG': { name: 'Obergericht Obwalden', canton: 'OW', level: 'cantonal' },
  'NW_OG': { name: 'Obergericht Nidwalden', canton: 'NW', level: 'cantonal' },
  'GL_OG': { name: 'Obergericht Glarus', canton: 'GL', level: 'cantonal' },
  'UR_OG': { name: 'Kantonsgericht Uri', canton: 'UR', level: 'cantonal' },
  'AI_KG': { name: 'Kantonsgericht Appenzell Innerrhoden', canton: 'AI', level: 'cantonal' },
  'AI_BZG': { name: 'Bezirksgericht Appenzell Innerrhoden', canton: 'AI', level: 'cantonal' },
};

/**
 * Localized labels from entscheidsuche.ch Facetten_alle.json
 */
export interface LocalizedLabels {
  de?: string;
  fr?: string;
  it?: string;
}

/**
 * A node in the court hierarchy facet tree.
 */
export interface FacetNode extends LocalizedLabels {
  id: string;
  children?: FacetNode[];
}

/**
 * Court information with localized labels.
 */
export interface CourtInfo {
  name: string;
  nameFr?: string;
  nameIt?: string;
  canton?: string;
  level: 'federal' | 'cantonal' | 'canton';
  spider: string;
}

/**
 * Lazy-loading service for localized court/chamber labels.
 * Loads https://entscheidsuche.ch/docs/Facetten_alle.json once and caches it.
 */
class CourtLabelService {
  private labels: Map<string, CourtInfo> | undefined;
  private loading: Promise<Map<string, CourtInfo>> | undefined;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Get court info for a hierarchy id. Falls back to the static COURT_MAP.
   */
  async get(id: string): Promise<CourtInfo | undefined> {
    const map = await this.load();
    return map.get(id) ?? this.fallback(id);
  }

  /**
   * Get the full localized facet tree.
   */
  async getFacetTree(): Promise<FacetNode[]> {
    const data = await this.fetchFacets();
    return Object.entries(data).map(([id, node]) => this.buildFacetNode(id, node as FacetFileNode));
  }

  private async load(): Promise<Map<string, CourtInfo>> {
    if (this.labels) return this.labels;
    if (this.loading) return this.loading;

    this.loading = this.loadInternal().finally(() => {
      this.loading = undefined;
    });
    return this.loading;
  }

  private async loadInternal(): Promise<Map<string, CourtInfo>> {
    const map = new Map<string, CourtInfo>();
    try {
      const data = await this.fetchFacets();
      for (const [cantonId, canton] of Object.entries(data)) {
        const c = canton as FacetFileNode;
        map.set(cantonId, {
          name: c.de || cantonId,
          nameFr: c.fr,
          nameIt: c.it,
          canton: cantonId === 'CH' ? undefined : cantonId,
          level: cantonId === 'CH' ? 'federal' : 'canton',
          spider: cantonId,
        });
        for (const [courtId, court] of Object.entries(c.gerichte || {})) {
          const co = court as FacetCourtNode;
          map.set(courtId, {
            name: co.de || courtId,
            nameFr: co.fr,
            nameIt: co.it,
            canton: cantonId === 'CH' ? undefined : cantonId,
            level: cantonId === 'CH' ? 'federal' : 'cantonal',
            spider: courtId,
          });
          for (const [chamberId, chamber] of Object.entries(co.kammern || {})) {
            const ch = chamber as FacetChamberNode;
            map.set(chamberId, {
              name: ch.de || chamberId,
              nameFr: ch.fr,
              nameIt: ch.it,
              canton: cantonId === 'CH' ? undefined : cantonId,
              level: cantonId === 'CH' ? 'federal' : 'cantonal',
              spider: ch.spider || courtId,
            });
          }
        }
      }
    } catch {
      // Do not cache failures — allow a later attempt to reload the facet file
      return map;
    }
    this.labels = map;
    return map;
  }

  private async fetchFacets(): Promise<Record<string, FacetFileNode>> {
    const response = await fetch(`${this.baseUrl}/docs/Facetten_alle.json`);
    if (!response.ok) {
      throw new Error(`Failed to load facets: ${response.status}`);
    }
    return response.json() as Promise<Record<string, FacetFileNode>>;
  }

  private fallback(id: string): CourtInfo | undefined {
    const info = COURT_MAP[id];
    if (!info) return undefined;
    return {
      name: info.name,
      canton: info.canton,
      level: info.level,
      spider: id.split('_').slice(0, 2).join('_'),
    };
  }

  private buildFacetNode(id: string, node: FacetFileNode): FacetNode {
    const children: FacetNode[] = [];
    for (const [courtId, court] of Object.entries(node.gerichte || {})) {
      const courtNode = this.buildCourtNode(courtId, court as FacetCourtNode);
      children.push(courtNode);
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
  spider: string;
}

/**
 * Entscheidsuche.ch search hit (actual Elasticsearch response format)
 */
export interface EntscheidSucheHit {
  _id: string;
  _index?: string;
  _score: number;
  /** Per-hit sort values returned by Elasticsearch, positional to the query sort spec */
  sort?: unknown[];
  highlight?: Record<string, string[]>;
  _source: {
    date?: string;
    hierarchy?: string[];        // e.g. ["CH", "CH_BGer", "CH_BGer_004"]
    title?: Record<string, string>;    // {de: "...", fr: "...", it: "..."}
    abstract?: Record<string, string>; // {de: "...", fr: "...", it: "..."}
    reference?: string[];        // e.g. ["4A 120/2022", "4A_120/2022"]
    attachment?: {
      content_type?: string;
      language?: string;
      content_url?: string;
      content?: string;
      [key: string]: unknown;
    };
    source?: string;
    original_url?: string;
    is_pdf?: boolean;
    scrape_date?: string;
    [key: string]: unknown;
  };
}

/**
 * Entscheidsuche.ch search response (Elasticsearch format)
 */
interface EntscheidSucheResponse {
  hits: {
    total: number | { value: number; relation: string };
    max_score: number;
    hits: EntscheidSucheHit[];
  };
  aggregations?: Record<string, {
    buckets: Array<{ key: string; doc_count: number }>;
  }>;
}

/**
 * Search filters for EntscheidSuche
 */
export interface EntscheidSucheSearchFilters {
  query: string;
  courts?: string[];          // Spider names (e.g., ['CH_BGer', 'ZH_OGer'])
  cantons?: string[];         // Canton codes (e.g., ['ZH', 'BE']) or hierarchy ids
  language?: 'de' | 'fr' | 'it';
  languageFilter?: ('de' | 'fr' | 'it')[];
  dateFrom?: string;          // ISO date
  dateTo?: string;
  scrapeDateFrom?: string;    // ISO date
  scrapeDateTo?: string;      // ISO date
  size?: number;
  from?: number;
  searchAfter?: unknown[];    // Elasticsearch search_after tuple
  includeAggregations?: boolean;
}

/**
 * A hierarchy entry with hit count.
 */
export interface HierarchyEntry {
  id: string;
  count: number;
}

/**
 * Normalized decision from entscheidsuche.ch
 */
export interface EntscheidSucheDecision {
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
  metadata?: Record<string, unknown>;
}

/**
 * EntscheidSuche API Client
 * Queries the real entscheidsuche.ch Elasticsearch API
 */
export class EntscheidSucheClient extends BaseAPIClient {
  private labelService: CourtLabelService;

  constructor(options: APIClientOptions) {
    super(options);
    this.labelService = new CourtLabelService(this.config.baseUrl);
  }

  /**
   * Search court decisions using Elasticsearch simple_query_string
   */
  async searchDecisions(filters: EntscheidSucheSearchFilters): Promise<{
    decisions: EntscheidSucheDecision[];
    total: number;
    nextCursor?: unknown[];
    aggregations?: Record<string, number>;
  }> {
    const _size = Math.min(filters.size || 10, 100);

    // Build Elasticsearch query
    const query = this.buildSearchQuery(filters);

    try {
      const response = await this.post<EntscheidSucheResponse>(
        '/_search.php',
        query,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value || 0;

      const hits = response.hits.hits || [];
      const decisions = await Promise.all(
        hits.map(hit => this.normalizeHit(hit))
      );

      const result: {
        decisions: EntscheidSucheDecision[];
        total: number;
        nextCursor?: unknown[];
        aggregations?: Record<string, number>;
      } = { decisions, total };

      if (decisions.length > 0 && filters.size && decisions.length >= filters.size) {
        // search_after values must match the sort spec ([date, _score])
        // positionally and type-wise — use the hit's own sort values
        const lastHit = hits[hits.length - 1];
        if (lastHit?.sort) {
          result.nextCursor = lastHit.sort;
        }
      }

      if (filters.includeAggregations && response.aggregations?.hierarchy) {
        result.aggregations = response.aggregations.hierarchy.buckets.reduce((acc, bucket) => {
          acc[bucket.key] = bucket.doc_count;
          return acc;
        }, {} as Record<string, number>);
      }

      return result;
    } catch (error) {
      this.logger.error('EntscheidSuche search failed', error as Error, { query: filters.query });
      throw error;
    }
  }

  /**
   * Search specifically for case numbers / BGE citations.
   * Wraps the value in quotes to force an exact phrase search.
   */
  async searchByCaseNumber(
    caseNumber: string,
    filters?: Omit<EntscheidSucheSearchFilters, 'query'>
  ): Promise<{
    decisions: EntscheidSucheDecision[];
    total: number;
    nextCursor?: unknown[];
  }> {
    return this.searchDecisions({
      ...(filters || {}),
      query: `"${caseNumber.replace(/"/g, '\\"')}"`,
      size: filters?.size || 20,
    });
  }

  /**
   * Search specifically for BGE decisions by citation
   */
  async searchBGE(citation: string): Promise<{
    decisions: EntscheidSucheDecision[];
    total: number;
    nextCursor?: unknown[];
  }> {
    // Parse BGE citation: "BGE 145 III 229" → search with structured query
    const bgeMatch = citation.match(/(?:BGE|ATF|DTF)\s*(\d+)\s+(I{1,3}|IV|V)\s+(\d+)/i);

    let query: string;
    if (bgeMatch) {
      // Structured citation search
      query = `"${bgeMatch[1]} ${bgeMatch[2]} ${bgeMatch[3]}"`;
    } else {
      // Fallback: use the citation as-is
      query = `"${citation.replace(/"/g, '\\"')}"`;
    }

    return this.searchDecisions({
      query,
      courts: ['CH_BGer', 'CH_BGE'],
      size: 10,
    });
  }

  /**
   * Get a single decision by its signature/ID
   */
  async getDecision(signature: string): Promise<EntscheidSucheDecision | null> {
    try {
      // Extract spider from signature (first two parts: country_court)
      const parts = signature.split('_');
      const spider = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : '';

      if (!spider) {
        this.logger.warn('Cannot extract spider from signature', { signature });
        return null;
      }

      // Fetch the document JSON directly
      const docUrl = `/docs/${spider}/${signature}.json`;
      const response = await this.get<Record<string, unknown>>(docUrl);

      if (!response) {
        return null;
      }

      // Create a synthetic hit for normalization
      const hit: EntscheidSucheHit = {
        _id: signature,
        _score: 1.0,
        _source: response as EntscheidSucheHit['_source'],
      };

      return this.normalizeHit(hit);
    } catch (error) {
      this.logger.warn('EntscheidSuche getDecision failed', { signature, error: (error as Error).message });
      return null;
    }
  }

  /**
   * List available hierarchy IDs with hit counts.
   * This powers the equivalent of the official `list_hierarchy` tool.
   */
  async listHierarchy(query?: string, size: number = 1000): Promise<{
    entries: HierarchyEntry[];
    total: number;
  }> {
    const must: Record<string, unknown>[] = [];
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

    if (must.length > 0) {
      body.query = must.length === 1 ? must[0] : { bool: { must } };
    }

    const response = await this.post<EntscheidSucheResponse>('/_search.php', body, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    const entries = (response.aggregations?.hierarchy?.buckets || []).map(bucket => ({
      id: bucket.key,
      count: bucket.doc_count,
    }));

    return { entries, total };
  }

  /**
   * Return the localized facet tree (canton → court → chamber).
   * Mirrors the official `list_facets` tool.
   */
  async listFacets(): Promise<FacetNode[]> {
    return this.labelService.getFacetTree();
  }

  /**
   * Build Elasticsearch query body
   */
  private buildSearchQuery(filters: EntscheidSucheSearchFilters): Record<string, unknown> {
    const must: Record<string, unknown>[] = [];

    // Main text query using simple_query_string
    if (filters.query) {
      must.push({
        simple_query_string: {
          query: filters.query,
          default_operator: 'and',
        },
      });
    }

    // Court/hierarchy filter — uses hierarchy field (e.g., CH_BGer, ZH_OG)
    if (filters.courts && filters.courts.length > 0) {
      must.push({
        terms: { hierarchy: filters.courts },
      });
    }

    // Canton filter — canton codes or hierarchy ids appear in hierarchy[0]
    if (filters.cantons && filters.cantons.length > 0) {
      must.push({
        terms: { hierarchy: filters.cantons },
      });
    }

    // Language filter — language is inside attachment object
    if (filters.languageFilter && filters.languageFilter.length > 0) {
      must.push({
        terms: { 'attachment.language': filters.languageFilter },
      });
    } else if (filters.language) {
      must.push({
        term: { 'attachment.language': filters.language },
      });
    }

    // Decision date range filter
    if (filters.dateFrom || filters.dateTo) {
      const range: Record<string, string> = {};
      if (filters.dateFrom) range.gte = filters.dateFrom;
      if (filters.dateTo) range.lte = filters.dateTo;
      must.push({
        range: { date: range },
      });
    }

    // Scrape date range filter
    if (filters.scrapeDateFrom || filters.scrapeDateTo) {
      const range: Record<string, string> = {};
      if (filters.scrapeDateFrom) range.gte = filters.scrapeDateFrom;
      if (filters.scrapeDateTo) range.lte = filters.scrapeDateTo;
      must.push({
        range: { scrape_date: range },
      });
    }

    const body: Record<string, unknown> = {
      size: Math.min(filters.size || 10, 100),
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

    if (filters.from !== undefined) {
      body.from = filters.from;
    }

    if (filters.searchAfter && filters.searchAfter.length > 0) {
      body.search_after = filters.searchAfter;
      // When using search_after, remove from to avoid confusion
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

    if (must.length === 1) {
      body.query = must[0];
    } else if (must.length > 1) {
      body.query = { bool: { must } };
    }

    return body;
  }

  /**
   * Normalize an Elasticsearch hit to our decision format.
   * Handles the actual entscheidsuche.ch response where:
   *   - hierarchy: ["CH", "CH_BGer", "CH_BGer_004"] (court identification)
   *   - title/abstract: {de: "...", fr: "...", it: "..."} (multilingual objects)
   *   - attachment.language / attachment.content_url (language and URL)
   */
  private async normalizeHit(hit: EntscheidSucheHit): Promise<EntscheidSucheDecision> {
    const src = hit._source;

    // Extract court identifier from hierarchy or _id
    const hierarchy = src.hierarchy || [];
    const spider = hierarchy[1] || this.extractSpiderFromId(hit._id);
    const canton = hierarchy[0] || '';
    const courtInfo = await this.labelService.get(spider) ?? COURT_MAP[spider];
    // hierarchy[2] is the chamber node id (e.g. "CH_BGer_001") — resolve it
    // to its localized label, never store the raw internal id as chamber
    const chamberInfo = hierarchy[2] ? await this.labelService.get(hierarchy[2]) : undefined;

    // Determine language from attachment or default
    const language = (src.attachment?.language as 'de' | 'fr' | 'it') || 'de';

    // Title and abstract are multilingual objects {de: "...", fr: "...", it: "..."}
    const titleObj = src.title || {};
    const abstractObj = src.abstract || {};

    const title = titleObj[language]
      || titleObj.de || titleObj.fr || titleObj.it
      || (Array.isArray(src.reference) ? src.reference[0] : '')
      || hit._id
      || '';

    const summary = abstractObj[language]
      || abstractObj.de || abstractObj.fr || abstractObj.it
      || '';

    // Detect BGE reference from title or ID
    let bgeReference: string | undefined;
    const bgeMatch = (title + ' ' + hit._id).match(/(\d{2,3})\s+(I{1,3}|IV|V)\s+(\d+)/);
    if (bgeMatch && (spider === 'CH_BGer' || spider === 'CH_BGE')) {
      bgeReference = `BGE ${bgeMatch[1]} ${bgeMatch[2]} ${bgeMatch[3]}`;
    }

    // URLs
    const sourceUrl = src.attachment?.content_url
      || (spider && hit._id ? `https://entscheidsuche.ch/docs/${spider}/${hit._id}` : '');
    const documentUrl = spider && hit._id
      ? `https://entscheidsuche.ch/docs/${spider}/${hit._id}.html`
      : undefined;

    // Highlights
    const highlights: Record<string, string> = {};
    if (hit.highlight) {
      for (const [field, fragments] of Object.entries(hit.highlight)) {
        if (fragments && fragments.length > 0) {
          highlights[field] = fragments.join(' … ');
        }
      }
    }

    return {
      decisionId: hit._id || '',
      signature: hit._id || '',
      title: String(title),
      summary: String(summary),
      decisionDate: src.date || '',
      language,
      court: courtInfo?.name || spider || 'Unknown',
      courtLevel: courtInfo
        ? (courtInfo.level === 'federal' ? 'federal' : 'cantonal')
        : (canton === 'CH' ? 'federal' : 'cantonal'),
      canton: courtInfo?.canton || (canton !== 'CH' ? canton : undefined),
      chamber: chamberInfo?.name,
      legalAreas: [],
      sourceUrl: String(sourceUrl),
      documentUrl,
      originalUrl: src.original_url,
      fullText: src.attachment?.content ? String(src.attachment.content) : undefined,
      score: hit._score,
      bgeReference,
      relatedDecisions: [],
      isPdf: src.is_pdf,
      scrapeDate: src.scrape_date,
      highlights,
      metadata: {
        spider,
        hierarchy,
        reference: src.reference,
      },
    };
  }

  /**
   * Extract spider (court identifier) from document ID.
   * ID format: "CH_BGer_004_4A-120-2022_2022-11-23" → "CH_BGer"
   */
  private extractSpiderFromId(id: string): string {
    if (!id) return '';
    const parts = id.split('_');
    return parts.length >= 2 ? `${parts[0]}_${parts[1]}` : '';
  }
}
