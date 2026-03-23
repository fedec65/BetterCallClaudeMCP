/**
 * TAS/CAS Jurisprudence MCP Server - Search Tool
 */

import type { CasSearchOutput } from '../types.js';
import { CasSearchInputSchema } from '../types.js';
import { searchCasDecisions } from '../scraper/jurisprudence-scraper.js';

/**
 * Search CAS/TAS arbitration decisions
 */
export async function casSearch(input: unknown): Promise<CasSearchOutput> {
  // Validate input
  const validated = CasSearchInputSchema.parse(input);

  // Perform search
  return searchCasDecisions(validated);
}
