/**
 * TAS/CAS Jurisprudence MCP Server - CAS Search Tool
 * Tool implementation for searching CAS decisions
 */

import {
  CasSearchInputSchema,
  CasSearchOutput
} from '../types.js';
import { searchCasDecisions } from '../scraper/jurisprudence-scraper.js';
import { searchCache, searchCacheKey } from '../infrastructure/cache.js';

/**
 * Tool definition for MCP server registration
 */
export const CAS_SEARCH_TOOL = {
  name: 'cas_search',
  description: 'Search CAS/TAS arbitration decisions by keywords, sport, year range, and procedure type. Returns paginated results with case details.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search terms (keywords, case number, party names, etc.)',
        minLength: 1
      },
      sport: {
        type: 'string',
        description: 'Filter by sport discipline (e.g., "Football", "Cycling")'
      },
      year_from: {
        type: 'integer',
        description: 'Filter decisions from this year onwards',
        minimum: 1984,
        maximum: 2026
      },
      year_to: {
        type: 'integer',
        description: 'Filter decisions up to this year',
        minimum: 1984,
        maximum: 2026
      },
      procedure_type: {
        type: 'string',
        enum: ['Appeal', 'Ordinary', 'Anti-Doping', 'Advisory'],
        description: 'Filter by CAS procedure type'
      },
      page: {
        type: 'integer',
        description: 'Page number for pagination',
        minimum: 1,
        default: 1
      },
      page_size: {
        type: 'integer',
        description: 'Results per page (1-25)',
        minimum: 1,
        maximum: 25,
        default: 10
      }
    },
    required: ['query']
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  }
};

/**
 * Execute CAS search tool
 */
export async function casSearch(input: unknown): Promise<CasSearchOutput> {
  // Validate input
  const validatedInput = CasSearchInputSchema.parse(input);

  // Check cache
  const cacheKey = searchCacheKey({
    query: validatedInput.query,
    sport: validatedInput.sport,
    year_from: validatedInput.year_from,
    year_to: validatedInput.year_to,
    procedure_type: validatedInput.procedure_type,
    page: validatedInput.page,
    page_size: validatedInput.page_size
  });

  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Execute search
  const results = await searchCasDecisions(validatedInput);

  // Cache results
  searchCache.set(cacheKey, results);

  return results;
}
