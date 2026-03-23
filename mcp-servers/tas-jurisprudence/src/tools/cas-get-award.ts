/**
 * TAS/CAS Jurisprudence MCP Server - Get Award Tool
 */

import type { CasAwardOutput } from '../types.js';
import { CasGetAwardInputSchema } from '../types.js';
import { getAwardDetails } from '../scraper/jurisprudence-scraper.js';

/**
 * Get details of a specific CAS/TAS award
 */
export async function casGetAward(input: unknown): Promise<CasAwardOutput> {
  // Validate input
  const validated = CasGetAwardInputSchema.parse(input);

  // Get award details
  return getAwardDetails(
    validated.case_number,
    validated.url,
    validated.include_full_text
  );
}
