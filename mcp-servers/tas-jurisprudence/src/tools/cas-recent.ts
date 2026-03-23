/**
 * TAS/CAS Jurisprudence MCP Server - Recent Decisions Tool
 */

import type { CasRecentOutput } from '../types.js';
import { CasRecentInputSchema } from '../types.js';
import { getRecentDecisions, getRecentDecisionsWithPlaywright } from '../scraper/recent-decisions-scraper.js';

/**
 * Get recent CAS/TAS decisions
 */
export async function casRecent(input: unknown): Promise<CasRecentOutput> {
  // Validate input
  const validated = CasRecentInputSchema.parse(input);

  // Try simple fetch first
  let result = await getRecentDecisions(validated.limit);

  // If no results, try with Playwright
  if (result.decisions.length === 0) {
    result = await getRecentDecisionsWithPlaywright(validated.limit);
  }

  return result;
}
