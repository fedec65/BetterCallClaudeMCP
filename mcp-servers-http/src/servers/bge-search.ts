/**
 * BGE Search MCP Server Factory (HTTP)
 *
 * Creates a Server instance with all bge-search tool handlers.
 * Uses simplified EntscheidSucheClient (API-only, no database/cache).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { EntscheidSucheClient, type SearchFilters } from '../lib/entscheidsuche-client.js';

interface SearchParams {
  query: string;
  language?: string;
  dateFrom?: string;
  dateTo?: string;
  chambers?: string[];
  legalAreas?: string[];
  limit?: number;
}

export function createBgeSearchServer(): Server {
  const server = new Server(
    { name: 'bge-search', version: '2.0.0' },
    { capabilities: { tools: {} } }
  );

  const apiClient = new EntscheidSucheClient();

  // --- Validate BGE citation format ---
  function validateCitation(citation: string) {
    const match = citation.match(/(?:BGE|ATF|DTF)?\s*(\d{2,3})\s+(I{1,3}|IV|V)\s+(\d+)/i);
    if (!match) {
      return {
        valid: false,
        error: "Invalid BGE citation format. Expected: 'BGE {volume} {chamber} {page}' (e.g., 'BGE 145 III 229')",
      };
    }
    return {
      valid: true,
      volume: match[1],
      chamber: match[2].toUpperCase(),
      page: match[3],
      normalized: `BGE ${match[1]} ${match[2].toUpperCase()} ${match[3]}`,
    };
  }

  // --- Tool definitions ---

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_bge',
        description: 'Search Swiss Federal Supreme Court (BGE) decisions by query, date range, chamber, and legal area. Uses entscheidsuche.ch API.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for BGE decisions (searches title, summary, full text)' },
            language: { type: 'string', enum: ['de', 'fr', 'it'], description: 'Language filter' },
            dateFrom: { type: 'string', format: 'date', description: 'Start date filter (YYYY-MM-DD)' },
            dateTo: { type: 'string', format: 'date', description: 'End date filter (YYYY-MM-DD)' },
            chambers: { type: 'array', items: { type: 'string', enum: ['I', 'II', 'III', 'IV', 'V'] }, description: 'Filter by chamber (I=Civil, II=Public, III=Civil, IV=Criminal, V=Social)' },
            legalAreas: { type: 'array', items: { type: 'string' }, description: "Filter by legal areas (e.g., 'Sozialversicherungsrecht')" },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 10, description: 'Maximum results' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_bge_decision',
        description: 'Retrieve a specific BGE decision by citation. Uses entscheidsuche.ch API.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            citation: { type: 'string', description: "BGE citation (e.g., 'BGE 147 V 321')" },
          },
          required: ['citation'],
        },
      },
      {
        name: 'validate_citation',
        description: 'Validate BGE citation format and normalize it.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
          type: 'object',
          properties: {
            citation: { type: 'string', description: 'BGE citation to validate' },
          },
          required: ['citation'],
        },
      },
    ],
  }));

  // --- Tool call handler ---

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_bge': {
          const params = args as unknown as SearchParams;
          const startTime = Date.now();

          const filters: SearchFilters = {
            query: params.query,
            courts: ['CH_BGer', 'CH_BGE'],
            language: params.language as 'de' | 'fr' | 'it' | undefined,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            size: params.limit || 10,
          };

          const apiResult = await apiClient.searchDecisions(filters);

          return {
            content: [{ type: 'text', text: JSON.stringify({
              decisions: apiResult.decisions,
              totalResults: apiResult.total,
              searchTimeMs: Date.now() - startTime,
              fromCache: false,
              source: 'api',
            }, null, 2) }],
          };
        }

        case 'get_bge_decision': {
          const { citation } = args as { citation: string };
          const validation = validateCitation(citation);
          if (!validation.valid) {
            return { content: [{ type: 'text', text: JSON.stringify({ found: false, fromCache: false }) }] };
          }

          const apiResult = await apiClient.searchBGE(citation);
          if (apiResult.decisions.length === 0) {
            return { content: [{ type: 'text', text: JSON.stringify({ found: false, fromCache: false }) }] };
          }

          return {
            content: [{ type: 'text', text: JSON.stringify({
              found: true,
              decision: apiResult.decisions[0],
              fromCache: false,
              source: 'api',
            }, null, 2) }],
          };
        }

        case 'validate_citation': {
          const { citation } = args as { citation: string };
          return { content: [{ type: 'text', text: JSON.stringify(validateCitation(citation), null, 2) }] };
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
