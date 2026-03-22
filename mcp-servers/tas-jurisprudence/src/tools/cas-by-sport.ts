/**
 * TAS/CAS Jurisprudence MCP Server - Browse by Sport Tool
 * Tool implementation for browsing decisions by sport category
 */

import {
  CasBySportInputSchema,
  CasBySportOutput,
  type CasBySportInput
} from '../types.js';
import { searchCasDecisions } from '../scraper/jurisprudence-scraper.js';
import { searchCache, sportCacheKey } from '../infrastructure/cache.js';

/**
 * Tool definition for MCP server registration
 */
export const CAS_BY_SPORT_TOOL = {
  name: 'cas_by_sport',
  description: 'Browse CAS arbitration decisions filtered by sport discipline. Returns paginated results for a specific sport.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sport: {
        type: 'string',
        description: 'Sport discipline to browse (e.g., "Football", "Cycling", "Athletics")',
        minLength: 1
      },
      page: {
        type: 'integer',
        description: 'Page number for pagination',
        minimum: 1,
        default: 1
      },
      procedure_type: {
        type: 'string',
        enum: ['Appeal', 'Ordinary', 'Anti-Doping', 'Advisory'],
        description: 'Filter by procedure type within sport'
      }
    },
    required: ['sport']
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  }
};

/**
 * Execute browse by sport tool
 */
export async function casBySport(input: unknown): Promise<CasBySportOutput> {
  // Validate input
  const validatedInput = CasBySportInputSchema.parse(input) as CasBySportInput;

  // Check cache
  const cacheKey = sportCacheKey(
    validatedInput.sport,
    validatedInput.page,
    validatedInput.procedure_type
  );

  const cached = searchCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      sport: validatedInput.sport,
      total_for_sport: cached.total_results
    };
  }

  // Execute search with sport filter
  const searchResult = await searchCasDecisions({
    query: '', // Empty query to get all results
    sport: validatedInput.sport,
    procedure_type: validatedInput.procedure_type,
    page: validatedInput.page,
    page_size: 10
  });

  // Build output
  const result: CasBySportOutput = {
    ...searchResult,
    sport: validatedInput.sport,
    total_for_sport: searchResult.total_results
  };

  // Cache result
  searchCache.set(cacheKey, result);

  return result;
}
