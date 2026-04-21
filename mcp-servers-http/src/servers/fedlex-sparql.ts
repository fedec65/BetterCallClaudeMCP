/**
 * Fedlex SPARQL MCP Server Factory (HTTP)
 *
 * Creates a Server instance with all fedlex-sparql tool handlers.
 * Imports SPARQLClient, query builders, and abbreviation map from existing source.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SPARQLClient, createFedlexClient } from '@fedlex-sparql/sparql-client.js';
import {
  buildLookupStatuteQuery,
  buildLookupByAbbreviationQuery,
  buildGetArticleQuery,
  buildGetArticleParagraphQuery,
  buildSearchQuery,
  buildSearchCountQuery,
  buildSearchByDomainQuery,
  buildSearchByDateQuery,
  buildFindAllRelatedQuery,
  buildLegislativeHistoryQuery,
  buildGetMetadataQuery,
  buildGetLanguagesQuery,
  buildGetSubjectsQuery,
  buildGetVersionHistoryQuery,
  buildGetLegalStatusQuery,
  buildGetStructureQuery,
  LEGAL_DOMAINS,
} from '@fedlex-sparql/queries/index.js';
import { lookupSRByAbbreviation } from '@fedlex-sparql/abbreviation-map.js';

import type {
  Language,
  LegalAct,
  Article,
  RelatedAct,
  SearchFilters,
  LookupStatuteInput,
  GetArticleInput,
  SearchLegislationInput,
  FindRelatedInput,
  GetMetadataInput,
  SPARQLBinding,
  RelationType,
} from '@fedlex-sparql/types/legislation.js';

export function createFedlexSparqlServer(): Server {
  const server = new Server(
    { name: 'fedlex-sparql', version: '2.0.1' },
    { capabilities: { tools: {} } }
  );

  const sparqlClient = createFedlexClient({
    timeout: 60000,
    maxRetries: 3,
    retryDelay: 2000,
  });

  // --- Handler functions (adapted from source) ---

  async function lookupStatute(input: LookupStatuteInput) {
    const startTime = Date.now();
    let query: string;
    let searchType: 'srNumber' | 'abbreviation';

    if (/^\d/.test(input.identifier)) {
      query = buildLookupStatuteQuery(input.identifier, input.language);
      searchType = 'srNumber';
    } else {
      const srNumber = lookupSRByAbbreviation(input.identifier);
      if (srNumber) {
        query = buildLookupStatuteQuery(srNumber, input.language);
        searchType = 'abbreviation';
      } else {
        query = buildLookupByAbbreviationQuery(input.identifier, input.language);
        searchType = 'abbreviation';
      }
    }

    const result = await sparqlClient.query(query);
    const bindings = result.results.bindings;

    if (bindings.length === 0) {
      return { found: false, searchTimeMs: Date.now() - startTime };
    }

    const actGroups = sparqlClient.groupBindings(bindings, 'act');
    const acts: LegalAct[] = [];

    for (const [actUri, actBindings] of actGroups) {
      const firstBinding = actBindings[0];
      acts.push({
        uri: actUri,
        srNumber: sparqlClient.extractValue(firstBinding.srNumber) || '',
        title: sparqlClient.extractMultilingualValue(actBindings, 'title'),
        abbreviation: sparqlClient.extractMultilingualValue(actBindings, 'abbreviation'),
        actType: sparqlClient.extractValue(firstBinding.actType),
        dateDocument: sparqlClient.extractValue(firstBinding.dateDocument),
        dateInForce: sparqlClient.extractValue(firstBinding.dateInForce),
        status: firstBinding.inForce ? 'in_force' : 'unknown',
      });
    }

    return { found: true, acts, searchType, searchTimeMs: Date.now() - startTime };
  }

  async function getArticle(input: GetArticleInput) {
    const startTime = Date.now();
    const query = input.paragraph
      ? buildGetArticleParagraphQuery(input.srNumber, input.articleNumber, input.paragraph, input.language)
      : buildGetArticleQuery(input.srNumber, input.articleNumber, input.language);

    const result = await sparqlClient.query(query);
    const bindings = result.results.bindings;

    if (bindings.length === 0) {
      return { found: false, searchTimeMs: Date.now() - startTime };
    }

    const firstBinding = bindings[0];
    const actInfo = {
      uri: sparqlClient.extractValue(firstBinding.act) || '',
      srNumber: sparqlClient.extractValue(firstBinding.srNumber) || '',
      title: sparqlClient.extractMultilingualValue(bindings, 'actTitle'),
    };

    const articleGroups = sparqlClient.groupBindings(bindings, 'article');
    const articles: Article[] = [];

    for (const [articleUri, articleBindings] of articleGroups) {
      const articleFirst = articleBindings[0];
      const paragraphs: Array<{
        number: string;
        text?: Record<string, string>;
        letters?: Array<{ literal: string; text?: Record<string, string> }>;
      }> = [];

      const paragraphGroups = sparqlClient.groupBindings(articleBindings, 'paragraphNum');
      for (const [paragraphNum, paragraphBindings] of paragraphGroups) {
        if (!paragraphNum) continue;
        const letters: Array<{ literal: string; text?: Record<string, string> }> = [];
        for (const binding of paragraphBindings) {
          const letterLit = sparqlClient.extractValue(binding.letterLit);
          if (letterLit) {
            letters.push({
              literal: letterLit,
              text: binding.letterText ? { [binding.letterText['xml:lang'] || 'de']: binding.letterText.value } : undefined,
            });
          }
        }
        paragraphs.push({
          number: paragraphNum,
          text: sparqlClient.extractMultilingualValue(paragraphBindings, 'paragraphText'),
          letters: letters.length > 0 ? letters : undefined,
        });
      }

      articles.push({
        uri: articleUri,
        number: sparqlClient.extractValue(articleFirst.articleNumber) || '',
        title: sparqlClient.extractMultilingualValue(articleBindings, 'articleTitle'),
        text: sparqlClient.extractMultilingualValue(articleBindings, 'articleText'),
        paragraphs: paragraphs.length > 0 ? paragraphs : undefined,
      });
    }

    return { found: true, act: actInfo, articles, searchTimeMs: Date.now() - startTime };
  }

  async function searchLegislation(input: SearchLegislationInput) {
    const startTime = Date.now();
    const filters: SearchFilters = {
      language: input.language,
      actType: input.actType,
      status: input.status,
      srNumberPrefix: input.srNumberPrefix,
      limit: input.limit || 50,
      offset: input.offset || 0,
    };

    let query: string;
    let countQuery: string | undefined;

    if (input.domain && !input.query) {
      query = buildSearchByDomainQuery(input.domain, input.language, filters.limit);
    } else if (input.dateFrom || input.dateTo) {
      query = buildSearchByDateQuery(input.dateFrom, input.dateTo, input.language, filters.limit);
    } else {
      query = buildSearchQuery(input.query || '', filters);
      countQuery = buildSearchCountQuery(input.query || '', filters);
    }

    const result = await sparqlClient.query(query);
    const bindings = result.results.bindings;

    let totalCount = bindings.length;
    if (countQuery) {
      const countResult = await sparqlClient.query(countQuery);
      if (countResult.results.bindings.length > 0) {
        const countValue = sparqlClient.extractValue(countResult.results.bindings[0].count);
        totalCount = countValue ? parseInt(countValue, 10) : bindings.length;
      }
    }

    const acts: LegalAct[] = bindings.map((binding: Record<string, SPARQLBinding>) => ({
      uri: sparqlClient.extractValue(binding.act) || '',
      srNumber: sparqlClient.extractValue(binding.srNumber) || '',
      title: binding.title ? { [binding.title['xml:lang'] || 'de']: binding.title.value } : {},
      abbreviation: binding.abbreviation ? { [binding.abbreviation['xml:lang'] || 'de']: binding.abbreviation.value } : undefined,
      actType: sparqlClient.extractValue(binding.actType),
      dateInForce: sparqlClient.extractValue(binding.dateInForce),
    }));

    const domainFacets: Record<string, number> = {};
    for (const act of acts) {
      const prefix = act.srNumber.split('.')[0];
      if (prefix && LEGAL_DOMAINS[prefix]) {
        domainFacets[prefix] = (domainFacets[prefix] || 0) + 1;
      }
    }

    return {
      acts,
      totalCount,
      hasMore: (filters.offset || 0) + acts.length < totalCount,
      facets: { byDomain: domainFacets },
      searchTimeMs: Date.now() - startTime,
    };
  }

  async function findRelated(input: FindRelatedInput) {
    const startTime = Date.now();
    const query = buildFindAllRelatedQuery(
      input.srNumber, input.relationType as RelationType, input.language, input.limit || 50
    );

    const result = await sparqlClient.query(query);
    const bindings = result.results.bindings;

    const relatedActs: RelatedAct[] = bindings.map((binding: Record<string, SPARQLBinding>) => ({
      uri: sparqlClient.extractValue(binding.relatedAct) || '',
      srNumber: sparqlClient.extractValue(binding.relatedSrNumber) || '',
      title: binding.relatedTitle ? { [binding.relatedTitle['xml:lang'] || 'de']: binding.relatedTitle.value } : {},
      relationType: (sparqlClient.extractValue(binding.relationType) as RelationType) || 'same_domain',
      relationDate: sparqlClient.extractValue(binding.relationDate),
    }));

    const byRelationType: Record<string, number> = {};
    for (const act of relatedActs) {
      const relType = act.relationType || 'unknown';
      byRelationType[relType] = (byRelationType[relType] || 0) + 1;
    }

    let legislativeHistory: Array<{ date: string; description?: string }> | undefined;
    if (input.includeHistory) {
      const historyQuery = buildLegislativeHistoryQuery(input.srNumber, input.language);
      const historyResult = await sparqlClient.query(historyQuery);
      legislativeHistory = historyResult.results.bindings.map((binding: Record<string, SPARQLBinding>) => ({
        date: sparqlClient.extractValue(binding.date) || '',
        description: sparqlClient.extractValue(binding.changeDescription),
      }));
    }

    return { srNumber: input.srNumber, relatedActs, byRelationType, legislativeHistory, searchTimeMs: Date.now() - startTime };
  }

  async function getMetadata(input: GetMetadataInput) {
    const startTime = Date.now();

    const [metadataResult, languagesResult, subjectsResult, historyResult, statusResult, structureResult] =
      await Promise.all([
        sparqlClient.query(buildGetMetadataQuery(input.srNumber, input.language)),
        sparqlClient.query(buildGetLanguagesQuery(input.srNumber)),
        sparqlClient.query(buildGetSubjectsQuery(input.srNumber, input.language)),
        sparqlClient.query(buildGetVersionHistoryQuery(input.srNumber)),
        sparqlClient.query(buildGetLegalStatusQuery(input.srNumber)),
        input.includeStructure
          ? sparqlClient.query(buildGetStructureQuery(input.srNumber, input.language))
          : Promise.resolve({ results: { bindings: [] } }),
      ]);

    const metadataBindings = metadataResult.results.bindings;
    if (metadataBindings.length === 0) {
      return { found: false, searchTimeMs: Date.now() - startTime };
    }

    const firstBinding = metadataBindings[0];
    const metadata: any = {
      uri: sparqlClient.extractValue(firstBinding.act) || '',
      srNumber: sparqlClient.extractValue(firstBinding.srNumber) || '',
      title: sparqlClient.extractMultilingualValue(metadataBindings, 'title'),
      abbreviation: sparqlClient.extractMultilingualValue(metadataBindings, 'abbreviation'),
      actType: sparqlClient.extractValue(firstBinding.actType),
      dateDocument: sparqlClient.extractValue(firstBinding.dateDocument),
      dateInForce: sparqlClient.extractValue(firstBinding.dateInForce),
      dateAbrogation: sparqlClient.extractValue(firstBinding.dateAbrogation),
      status: 'unknown' as string,
    };

    metadata.availableLanguages = languagesResult.results.bindings
      .map((b: Record<string, SPARQLBinding>) => sparqlClient.extractValue(b.language))
      .filter((lang): lang is string => !!lang);

    const subjects = subjectsResult.results.bindings
      .map((b: Record<string, SPARQLBinding>) => sparqlClient.extractValue(b.label))
      .filter((s): s is string => !!s);
    if (subjects.length > 0) metadata.subjects = subjects;

    const versions = historyResult.results.bindings.map((b: Record<string, SPARQLBinding>) => ({
      date: sparqlClient.extractValue(b.versionDate) || '',
      type: sparqlClient.extractValue(b.versionType),
      description: sparqlClient.extractValue(b.changeDescription),
    }));
    if (versions.length > 0) metadata.versionHistory = versions;

    if (statusResult.results.bindings.length > 0) {
      const statusBinding = statusResult.results.bindings[0];
      const status = sparqlClient.extractValue(statusBinding.status);
      if (status === 'in_force' || status === 'abrogated' || status === 'pending') {
        metadata.status = status;
      }
      metadata.abrogatedBy = sparqlClient.extractValue(statusBinding.abrogatedBy);
    }

    if (input.includeStructure && structureResult.results.bindings.length > 0) {
      metadata.structure = structureResult.results.bindings.map((b: Record<string, SPARQLBinding>) => ({
        partNumber: sparqlClient.extractValue(b.partNumber) || '',
        partTitle: sparqlClient.extractValue(b.partTitle),
        partType: sparqlClient.extractValue(b.partType),
      }));
    }

    const domainPrefix = input.srNumber.split('.')[0];
    if (LEGAL_DOMAINS[domainPrefix]) {
      metadata.legalDomain = LEGAL_DOMAINS[domainPrefix];
    }

    return { found: true, metadata, searchTimeMs: Date.now() - startTime };
  }

  // --- Tool definitions ---

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'lookup_statute',
        description: "Look up a Swiss federal legal act by SR number (e.g., '220' for OR) or abbreviation (e.g., 'OR', 'ZGB'). Returns basic information including title, type, and status in multiple languages (DE/FR/IT).",
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            identifier: { type: 'string', description: "SR number (e.g., '220', '210') or abbreviation (e.g., 'OR', 'ZGB', 'StGB')" },
            language: { type: 'string', enum: ['de', 'fr', 'it', 'rm'], description: 'Preferred language for results' },
          },
          required: ['identifier'],
        },
      },
      {
        name: 'get_article',
        description: 'Retrieve a specific article within a Swiss legal act. Returns article text, marginal notes, paragraphs (Absätze), and letters (Buchstaben) in structured format.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            srNumber: { type: 'string', description: "SR number of the legal act (e.g., '220' for OR)" },
            articleNumber: { type: 'string', description: "Article number (e.g., '97', '41')" },
            paragraph: { type: 'string', description: 'Specific paragraph/Absatz number (optional)' },
            language: { type: 'string', enum: ['de', 'fr', 'it', 'rm'], description: 'Preferred language for article text' },
          },
          required: ['srNumber', 'articleNumber'],
        },
      },
      {
        name: 'search_legislation',
        description: 'Search across Swiss federal legislation with full-text search and filters. Supports filtering by legal domain, date range, act type, and language.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Full-text search query' },
            domain: { type: 'string', enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], description: 'Legal domain filter by SR prefix' },
            srNumberPrefix: { type: 'string', description: "Filter by SR number prefix (e.g., '22' for contract law)" },
            dateFrom: { type: 'string', format: 'date', description: 'Filter acts in force from this date' },
            dateTo: { type: 'string', format: 'date', description: 'Filter acts in force until this date' },
            actType: { type: 'array', items: { type: 'string' }, description: "Filter by act types" },
            language: { type: 'string', enum: ['de', 'fr', 'it', 'rm'], description: 'Language filter' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: 'Maximum number of results' },
            offset: { type: 'number', minimum: 0, default: 0, description: 'Offset for pagination' },
          },
        },
      },
      {
        name: 'find_related',
        description: 'Find legislation related to a specific act through amendments, citations, references, or shared legal domain. Optionally includes legislative history.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            srNumber: { type: 'string', description: "SR number of the legal act (e.g., '220' for OR)" },
            relationType: { type: 'string', enum: ['amends', 'amended_by', 'cites', 'cited_by', 'implements', 'implemented_by', 'based_on', 'same_domain', 'same_subject'], description: 'Filter by relation type' },
            includeHistory: { type: 'boolean', default: false, description: 'Include legislative history' },
            language: { type: 'string', enum: ['de', 'fr', 'it', 'rm'], description: 'Preferred language' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: 'Maximum number of related acts' },
          },
          required: ['srNumber'],
        },
      },
      {
        name: 'get_metadata',
        description: 'Get comprehensive metadata about a legal act including publication info, subjects/keywords, version history, legal status, available languages, and optionally the document structure.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            srNumber: { type: 'string', description: "SR number of the legal act (e.g., '220' for OR)" },
            includeStructure: { type: 'boolean', default: false, description: 'Include document structure (table of contents)' },
            language: { type: 'string', enum: ['de', 'fr', 'it', 'rm'], description: 'Preferred language for metadata text' },
          },
          required: ['srNumber'],
        },
      },
    ],
  }));

  // --- Tool call handler ---

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: any;

      switch (name) {
        case 'lookup_statute':
          result = await lookupStatute(args as unknown as LookupStatuteInput);
          break;
        case 'get_article':
          result = await getArticle(args as unknown as GetArticleInput);
          break;
        case 'search_legislation':
          result = await searchLegislation(args as unknown as SearchLegislationInput);
          break;
        case 'find_related':
          result = await findRelated(args as unknown as FindRelatedInput);
          break;
        case 'get_metadata':
          result = await getMetadata(args as unknown as GetMetadataInput);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }, null, 2) }], isError: true };
    }
  });

  return server;
}
