/**
 * TAS/CAS Jurisprudence MCP Server - Recent Decisions Tool
 */

import type { CasRecentOutput } from '../types.js';
import { CasRecentInputSchema } from '../types.js';
import { getRecentDecisions } from '../scraper/jurisprudence-scraper.js';

/**
 * Get recent CAS/TAS decisions
 */
export async function casRecent(input: unknown): Promise<CasRecentOutput> {
  // Validate input
  const validated = CasRecentInputSchema.parse(input);

  return getRecentDecisions(validated.limit);
}
