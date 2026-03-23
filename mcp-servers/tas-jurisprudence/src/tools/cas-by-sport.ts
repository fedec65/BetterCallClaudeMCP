/**
 * TAS/CAS Jurisprudence MCP Server - Browse by Sport Tool
 */

import type { CasBySportOutput } from '../types.js';
import { CasBySportInputSchema } from '../types.js';
import { searchCasDecisions } from '../scraper/jurisprudence-scraper.js';

/**
 * Browse CAS/TAS decisions by sport category
 */
export async function casBySport(input: unknown): Promise<CasBySportOutput> {
  // Validate input
  const validated = CasBySportInputSchema.parse(input);

  // Use search with sport filter
  const searchResult = await searchCasDecisions({
    query: '*',  // Wildcard to get all for this sport
    sport: validated.sport,
    page: validated.page,
    page_size: 25
  });

  return {
    sport: validated.sport,
    results: searchResult.results,
    total: searchResult.total,
    page: validated.page,
    has_more: searchResult.has_more
  };
}
