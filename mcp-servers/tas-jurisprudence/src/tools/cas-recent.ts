/**
 * TAS/CAS Jurisprudence MCP Server - Recent Decisions Tool
 * Tool implementation for retrieving recent CAS decisions
 */

import {
  CasRecentInputSchema,
  CasRecentOutput,
  type CasRecentInput
} from '../types.js';
import { getRecentDecisions } from '../scraper/recent-decisions-scraper.js';
import { recentCache, recentCacheKey } from '../infrastructure/cache.js';

/**
 * Tool definition for MCP server registration
 */
export const CAS_RECENT_TOOL = {
  name: 'cas_recent',
  description: 'Get the most recent CAS/TAS arbitration decisions published on the CAS website. Returns a list of the latest awards with basic metadata.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'integer',
        description: 'Maximum number of recent decisions to return (1-50)',
        minimum: 1,
        maximum: 50,
        default: 10
      }
    }
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false, // Results change as new decisions are published
    openWorldHint: true
  }
};

/**
 * Execute recent decisions tool
 */
export async function casRecent(input: unknown): Promise<CasRecentOutput> {
  // Validate input
  const validatedInput = CasRecentInputSchema.parse(input) as CasRecentInput;

  // Check cache (short TTL for recent decisions)
  const cacheKey = recentCacheKey(validatedInput.limit);
  const cached = recentCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Get recent decisions
  const result = await getRecentDecisions(validatedInput.limit);

  // Cache result
  recentCache.set(cacheKey, result);

  return result;
}
