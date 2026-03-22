/**
 * TAS/CAS Jurisprudence MCP Server - CAS Get Award Tool
 * Tool implementation for retrieving specific award details
 */

import {
  CasGetAwardInputSchema,
  CasAwardOutput,
  type CasGetAwardInput
} from '../types.js';
import { getAwardDetails } from '../scraper/jurisprudence-scraper.js';
import { awardCache, awardCacheKey } from '../infrastructure/cache.js';

/**
 * Tool definition for MCP server registration
 */
export const CAS_GET_AWARD_TOOL = {
  name: 'cas_get_award',
  description: 'Retrieve detailed information about a specific CAS award including parties, arbitrators, operative part, and optionally full text.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      case_number: {
        type: 'string',
        description: 'CAS case number (e.g., "CAS 2023/A/9876" or "2023/A/9876")'
      },
      url: {
        type: 'string',
        format: 'uri',
        description: 'Direct URL to the CAS award page'
      },
      include_full_text: {
        type: 'boolean',
        description: 'Include full text extraction from PDF (warning: slower)',
        default: false
      }
    },
    oneOf: [
      { required: ['case_number'] },
      { required: ['url'] }
    ]
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  }
};

/**
 * Execute get award tool
 */
export async function casGetAward(input: unknown): Promise<CasAwardOutput> {
  // Validate input
  const validatedInput = CasGetAwardInputSchema.parse(input) as CasGetAwardInput;

  // Determine case number (from input or extract from URL)
  let caseNumber = validatedInput.case_number;

  if (!caseNumber && validatedInput.url) {
    // Extract case number from URL
    const urlMatch = validatedInput.url.match(/CAS[-\s]?(\d{4})[-\/]([AO]|AD|G|M)[-\/](\d+)/i);
    if (urlMatch) {
      caseNumber = `CAS ${urlMatch[1]}/${urlMatch[2]}/${urlMatch[3]}`;
    } else {
      throw new Error('Could not extract case number from URL. Please provide case_number directly.');
    }
  }

  if (!caseNumber) {
    throw new Error('Either case_number or url must be provided');
  }

  // Check cache
  const cacheKey = awardCacheKey(caseNumber, validatedInput.include_full_text ?? false);
  const cached = awardCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Get award details
  const result = await getAwardDetails(
    caseNumber,
    validatedInput.include_full_text ?? false
  );

  // Cache result
  awardCache.set(cacheKey, result);

  return result;
}
