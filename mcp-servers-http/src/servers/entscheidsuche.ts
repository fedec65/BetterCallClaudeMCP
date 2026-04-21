/**
 * Entscheidsuche MCP Server Factory (HTTP)
 *
 * Creates a Server instance with all entscheidsuche tool handlers.
 * Uses simplified EntscheidSucheClient (API-only, no database/cache).
 * Excludes get_related_decisions (requires database citation graph).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { EntscheidSucheClient, type SearchFilters, type Decision } from '../lib/entscheidsuche-client.js';

type Canton = 'ZH' | 'BE' | 'GE' | 'BS' | 'VD' | 'TI';

interface SearchParams {
  query: string;
  courtLevel?: 'federal' | 'cantonal' | 'all';
  cantons?: Canton[];
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  legalAreas?: string[];
  limit?: number;
}

interface CantonSearchParams {
  query: string;
  cantons: Canton[];
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  legalAreas?: string[];
  limit?: number;
}

interface PrecedentAnalysisParams {
  legalArea: string;
  claimType: string;
  courtLevel?: 'federal' | 'cantonal' | 'all';
  cantons?: Canton[];
  dateFrom?: string;
  dateTo?: string;
}

interface SimilarCasesParams {
  decisionId?: string;
  factPattern?: string;
  legalArea?: string;
  limit?: number;
}

interface ProvisionInterpretationParams {
  statute: string;
  article: number;
  paragraph?: number;
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export function createEntscheidsucheServer(): Server {
  const server = new Server(
    { name: 'entscheidsuche', version: '2.0.0' },
    { capabilities: { tools: {} } }
  );

  const apiClient = new EntscheidSucheClient();

  // --- Internal search helper ---

  async function doSearch(params: SearchParams) {
    const startTime = Date.now();
    let courts: string[] | undefined;
    if (params.courtLevel === 'federal') {
      courts = ['CH_BGer', 'CH_BGE', 'CH_BVGer', 'CH_BPatGer', 'CH_BStGer'];
    }

    const filters: SearchFilters = {
      query: params.query,
      courts,
      cantons: params.cantons,
      language: params.language as 'de' | 'fr' | 'it' | undefined,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      size: params.limit || 10,
    };

    const apiResult = await apiClient.searchDecisions(filters);
    const decisions = apiResult.decisions;

    const facets = {
      byCourtLevel: {
        federal: decisions.filter(d => d.courtLevel === 'federal').length,
        cantonal: decisions.filter(d => d.courtLevel === 'cantonal').length,
      },
      byCanton: decisions
        .filter(d => d.canton)
        .reduce((acc, d) => {
          acc[d.canton!] = (acc[d.canton!] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
    };

    return {
      decisions,
      totalResults: apiResult.total,
      searchTimeMs: Date.now() - startTime,
      fromCache: false,
      facets,
    };
  }

  // --- Analysis helpers (copied from source, pure logic) ---

  function analyzeDecisionOutcome(decision: Decision, _claimType: string): boolean {
    const combined = `${(decision.summary || '').toLowerCase()} ${(decision.title || '').toLowerCase()}`;
    const successIndicators = ['gutheissung', 'gutgeheissen', 'stattgegeben', 'zugesprochen', 'anspruch bejaht', 'admission', 'admis', 'accolto', 'ammesso'];
    const failureIndicators = ['abweisung', 'abgewiesen', 'nicht stattgegeben', 'anspruch verneint', 'unbegründet', 'rejet', 'rejeté', 'refusé', 'respinto', 'rigettato'];
    const hasSuccess = successIndicators.some(ind => combined.includes(ind));
    const hasFailure = failureIndicators.some(ind => combined.includes(ind));
    if (hasSuccess && !hasFailure) return true;
    if (hasFailure && !hasSuccess) return false;
    return Math.random() > 0.5;
  }

  function extractKeyFactors(decisions: Decision[], _claimType: string): string[] {
    const factors: string[] = [];
    const legalAreaCounts = new Map<string, number>();
    for (const d of decisions) {
      for (const area of d.legalAreas || []) {
        legalAreaCounts.set(area, (legalAreaCounts.get(area) || 0) + 1);
      }
    }
    const topAreas = Array.from(legalAreaCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([area]) => `Relevant legal area: ${area}`);
    factors.push(...topAreas);
    if (decisions.length > 0) {
      const years = decisions.map(d => new Date(d.decisionDate).getFullYear());
      factors.push(`Average decision year: ${Math.round(years.reduce((a, b) => a + b, 0) / years.length)}`);
    }
    return factors;
  }

  function generateRecommendations(successRate: number, byCourtLevel: Record<string, { total: number; rate: number }>, legalArea: string): string[] {
    const recs: string[] = [];
    if (successRate >= 70) recs.push(`Strong precedent support (${successRate}% success rate) - proceed with confidence`);
    else if (successRate >= 40) recs.push(`Moderate precedent support (${successRate}% success rate) - review key differentiating factors`);
    else recs.push(`Limited precedent support (${successRate}% success rate) - consider alternative strategies`);
    if (byCourtLevel.federal && byCourtLevel.cantonal) {
      if (byCourtLevel.federal.rate > byCourtLevel.cantonal.rate + 10) recs.push('Federal court shows higher success rate - consider direct appeal strategy');
      else if (byCourtLevel.cantonal.rate > byCourtLevel.federal.rate + 10) recs.push('Cantonal courts show higher success rate - leverage local precedents');
    }
    recs.push(`Focus on ${legalArea} specific arguments with documented precedent support`);
    return recs;
  }

  function calculateSimilarity(base: Decision | null, candidate: Decision, factPattern?: string): { score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];
    if (base) {
      const baseLegalAreas = new Set(base.legalAreas || []);
      const overlap = (candidate.legalAreas || []).filter(a => baseLegalAreas.has(a));
      if (overlap.length > 0) { score += 0.3; factors.push(`Matching legal areas: ${overlap.join(', ')}`); }
      if (base.chamber && candidate.chamber && base.chamber === candidate.chamber) { score += 0.2; factors.push(`Same chamber: ${base.chamber}`); }
      if (base.canton && candidate.canton && base.canton === candidate.canton) { score += 0.15; factors.push(`Same canton: ${base.canton}`); }
      if (base.language === candidate.language) { score += 0.1; factors.push(`Same language: ${base.language}`); }
      const yearDiff = Math.abs(new Date(base.decisionDate).getFullYear() - new Date(candidate.decisionDate).getFullYear());
      if (yearDiff <= 5) { score += 0.1 * (1 - yearDiff / 5); factors.push(`Temporal proximity: ${yearDiff} years apart`); }
    }
    if (factPattern) {
      const candidateText = `${candidate.title} ${candidate.summary}`.toLowerCase();
      const words = factPattern.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matching = words.filter(w => candidateText.includes(w));
      score += (matching.length / Math.max(words.length, 1)) * 0.3;
      if (matching.length > 0) factors.push(`Matching keywords: ${matching.slice(0, 5).join(', ')}`);
    }
    return { score: Math.min(score, 1), factors };
  }

  function extractInterpretation(decision: Decision, statute: string, article: number) {
    const fullText = decision.fullText || decision.summary || '';
    const pattern = new RegExp(`Art\\.?\\s*${article}[^0-9].*?${statute}|${statute}.*?Art\\.?\\s*${article}`, 'gi');
    const matches = fullText.match(pattern);
    if (!matches || matches.length === 0) {
      if (decision.summary?.includes(statute)) return { text: decision.summary, context: 'Summary reference to provision' };
      return null;
    }
    const idx = fullText.indexOf(matches[0]);
    const ctx = fullText.substring(Math.max(0, idx - 200), Math.min(fullText.length, idx + matches[0].length + 300)).trim();
    return { text: matches[0], context: ctx.length > 500 ? ctx.substring(0, 500) + '...' : ctx };
  }

  // --- Tool definitions ---

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_decisions',
        description: 'Unified search across Swiss federal (Bundesgericht) and cantonal court decisions. Uses entscheidsuche.ch API. Supports multi-canton search.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for court decisions' },
            courtLevel: { type: 'string', enum: ['federal', 'cantonal', 'all'], description: 'Filter by court level (default: all)' },
            cantons: { type: 'array', items: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'] }, description: 'Filter by cantons' },
            language: { type: 'string', enum: ['de', 'fr', 'it'], description: 'Language filter' },
            dateFrom: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            dateTo: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            legalAreas: { type: 'array', items: { type: 'string' }, description: 'Filter by legal areas' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10, description: 'Maximum results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_canton',
        description: 'Search specific canton(s) with parallel aggregation. Optimized for cantonal-only searches.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for cantonal decisions' },
            cantons: { type: 'array', items: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'] }, description: 'Cantons to search (required)' },
            language: { type: 'string', enum: ['de', 'fr', 'it'], description: 'Language filter' },
            dateFrom: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            dateTo: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            legalAreas: { type: 'array', items: { type: 'string' }, description: 'Filter by legal areas' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10, description: 'Maximum results per canton' },
          },
          required: ['query', 'cantons'],
        },
      },
      {
        name: 'get_decision_details',
        description: 'Retrieve full details of a specific court decision by ID from entscheidsuche.ch.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            decisionId: { type: 'string', description: 'Unique decision identifier' },
          },
          required: ['decisionId'],
        },
      },
      {
        name: 'analyze_precedent_success_rate',
        description: 'Analyze historical success rates for specific claim types in a legal area. Returns statistical breakdown by court level, canton, and year with strategic recommendations.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            legalArea: { type: 'string', description: "Legal area (e.g., 'Arbeitsrecht', 'Mietrecht')" },
            claimType: { type: 'string', description: "Type of claim (e.g., 'Kündigung', 'Schadenersatz')" },
            courtLevel: { type: 'string', enum: ['federal', 'cantonal', 'all'], description: 'Filter by court level' },
            cantons: { type: 'array', items: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'] }, description: 'Filter by cantons' },
            dateFrom: { type: 'string', format: 'date', description: 'Start date' },
            dateTo: { type: 'string', format: 'date', description: 'End date' },
          },
          required: ['legalArea', 'claimType'],
        },
      },
      {
        name: 'find_similar_cases',
        description: 'Find analogous court decisions based on a fact pattern or existing decision. Uses similarity scoring to identify relevant precedents.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            decisionId: { type: 'string', description: 'Decision ID to find similar cases for' },
            factPattern: { type: 'string', description: 'Description of fact pattern to match' },
            legalArea: { type: 'string', description: 'Filter by legal area' },
            limit: { type: 'number', minimum: 1, maximum: 20, default: 10, description: 'Maximum similar cases' },
          },
        },
      },
      {
        name: 'get_legal_provision_interpretation',
        description: 'Retrieve BGE interpretations of a specific statutory provision. Finds court decisions that interpret and apply the given article.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            statute: { type: 'string', description: "Statute abbreviation (e.g., 'OR', 'ZGB', 'StGB')" },
            article: { type: 'number', description: 'Article number' },
            paragraph: { type: 'number', description: 'Paragraph number (Absatz)' },
            language: { type: 'string', enum: ['de', 'fr', 'it'], description: 'Language filter' },
            dateFrom: { type: 'string', format: 'date', description: 'Start date' },
            dateTo: { type: 'string', format: 'date', description: 'End date' },
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10, description: 'Maximum interpretations' },
          },
          required: ['statute', 'article'],
        },
      },
    ],
  }));

  // --- Tool call handler ---

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_decisions': {
          const result = await doSearch(args as unknown as SearchParams);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'search_canton': {
          const params = args as unknown as CantonSearchParams;
          const startTime = Date.now();
          const filters: SearchFilters = {
            query: params.query,
            cantons: params.cantons,
            language: params.language as 'de' | 'fr' | 'it' | undefined,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            size: params.limit || 10,
          };
          const apiResult = await apiClient.searchDecisions(filters);
          const byCanton = apiResult.decisions.filter(d => d.canton).reduce((acc, d) => {
            acc[d.canton!] = (acc[d.canton!] || 0) + 1; return acc;
          }, {} as Record<string, number>);
          return {
            content: [{ type: 'text', text: JSON.stringify({
              decisions: apiResult.decisions, totalResults: apiResult.total,
              searchTimeMs: Date.now() - startTime, fromCache: false, byCanton,
            }, null, 2) }],
          };
        }

        case 'get_decision_details': {
          const { decisionId } = args as { decisionId: string };
          const decision = await apiClient.getDecision(decisionId);
          if (!decision) {
            return { content: [{ type: 'text', text: JSON.stringify({ found: false, fromCache: false }) }] };
          }
          return { content: [{ type: 'text', text: JSON.stringify({ found: true, decision, fromCache: false, source: 'api' }, null, 2) }] };
        }

        case 'analyze_precedent_success_rate': {
          const params = args as unknown as PrecedentAnalysisParams;
          const searchResult = await doSearch({
            query: `${params.legalArea} ${params.claimType}`,
            courtLevel: params.courtLevel || 'all',
            cantons: params.cantons,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            legalAreas: [params.legalArea],
            limit: 100,
          });
          const decisions = searchResult.decisions;
          const byCourtLevel: Record<string, { total: number; successful: number; rate: number }> = {};
          const byCanton: Record<string, { total: number; successful: number; rate: number }> = {};
          const byYearMap = new Map<number, { total: number; successful: number }>();

          for (const d of decisions) {
            const year = new Date(d.decisionDate).getFullYear();
            const isSuccess = analyzeDecisionOutcome(d, params.claimType);
            const level = d.courtLevel || (d.bgeReference ? 'federal' : 'cantonal');
            if (!byCourtLevel[level]) byCourtLevel[level] = { total: 0, successful: 0, rate: 0 };
            byCourtLevel[level].total++;
            if (isSuccess) byCourtLevel[level].successful++;
            if (d.canton) {
              if (!byCanton[d.canton]) byCanton[d.canton] = { total: 0, successful: 0, rate: 0 };
              byCanton[d.canton].total++;
              if (isSuccess) byCanton[d.canton].successful++;
            }
            const yd = byYearMap.get(year) || { total: 0, successful: 0 };
            yd.total++; if (isSuccess) yd.successful++; byYearMap.set(year, yd);
          }
          for (const l of Object.keys(byCourtLevel)) byCourtLevel[l].rate = byCourtLevel[l].total > 0 ? Math.round((byCourtLevel[l].successful / byCourtLevel[l].total) * 100) : 0;
          for (const c of Object.keys(byCanton)) byCanton[c].rate = byCanton[c].total > 0 ? Math.round((byCanton[c].successful / byCanton[c].total) * 100) : 0;
          const totalSuccessful = Object.values(byCourtLevel).reduce((s, d) => s + d.successful, 0);
          const overallRate = decisions.length > 0 ? Math.round((totalSuccessful / decisions.length) * 100) : 0;
          const byYear = Array.from(byYearMap.entries()).map(([year, d]) => ({ year, total: d.total, successful: d.successful, rate: d.total > 0 ? Math.round((d.successful / d.total) * 100) : 0 })).sort((a, b) => b.year - a.year);

          return { content: [{ type: 'text', text: JSON.stringify({
            success: true, analysis: {
              totalCases: decisions.length, successRate: overallRate, byCourtLevel,
              byCanton: Object.keys(byCanton).length > 0 ? byCanton : undefined,
              byYear, keyFactors: extractKeyFactors(decisions, params.claimType),
              recommendations: generateRecommendations(overallRate, byCourtLevel, params.legalArea),
            }, fromCache: false,
          }, null, 2) }] };
        }

        case 'find_similar_cases': {
          const params = args as unknown as SimilarCasesParams;
          let baseDecision: Decision | undefined;
          let searchQuery = params.factPattern || '';
          if (params.decisionId) {
            baseDecision = (await apiClient.getDecision(params.decisionId)) || undefined;
            if (baseDecision) {
              searchQuery = [baseDecision.title, baseDecision.summary, ...(baseDecision.legalAreas || [])].filter(Boolean).join(' ');
            }
          }
          if (!searchQuery) {
            return { content: [{ type: 'text', text: JSON.stringify({ success: false, similarCases: [], totalFound: 0, fromCache: false }) }] };
          }
          const searchResult = await doSearch({
            query: searchQuery.substring(0, 500),
            legalAreas: params.legalArea ? [params.legalArea] : undefined,
            limit: (params.limit || 10) * 3,
          });
          const similarCases: Array<{ decision: Decision; similarityScore: number; matchingFactors: string[] }> = [];
          for (const candidate of searchResult.decisions) {
            if (baseDecision && candidate.decisionId === baseDecision.decisionId) continue;
            const { score, factors } = calculateSimilarity(baseDecision || null, candidate, params.factPattern);
            if (score > 0.3) similarCases.push({ decision: candidate, similarityScore: Math.round(score * 100), matchingFactors: factors });
          }
          similarCases.sort((a, b) => b.similarityScore - a.similarityScore);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, similarCases: similarCases.slice(0, params.limit || 10), totalFound: similarCases.length, fromCache: false }, null, 2) }] };
        }

        case 'get_legal_provision_interpretation': {
          const params = args as unknown as ProvisionInterpretationParams;
          const articleRef = params.paragraph ? `Art. ${params.article} Abs. ${params.paragraph} ${params.statute}` : `Art. ${params.article} ${params.statute}`;
          const searchQueries = [articleRef, `Artikel ${params.article} ${params.statute}`, `${params.statute} Art. ${params.article}`];
          const searchResult = await doSearch({
            query: searchQueries.join(' OR '),
            courtLevel: 'federal',
            language: params.language,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            limit: params.limit || 20,
          });
          const interpretations: Array<{ decision: Decision; interpretation: string; context: string; date: string }> = [];
          for (const d of searchResult.decisions) {
            const interp = extractInterpretation(d, params.statute, params.article);
            if (interp) interpretations.push({ decision: d, interpretation: interp.text, context: interp.context, date: d.decisionDate });
          }
          interpretations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return { content: [{ type: 'text', text: JSON.stringify({
            success: true, provision: { statute: params.statute, article: params.article, paragraph: params.paragraph, formatted: articleRef },
            interpretations: interpretations.slice(0, params.limit || 10), totalFound: interpretations.length, fromCache: false,
          }, null, 2) }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }, null, 2) }], isError: true };
    }
  });

  return server;
}
