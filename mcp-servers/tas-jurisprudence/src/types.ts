/**
 * TAS/CAS Jurisprudence MCP Server - Type Definitions
 * Zod schemas and TypeScript interfaces for CAS decision search and retrieval
 */

import { z } from 'zod';

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Search CAS decisions input schema
 */
export const CasSearchInputSchema = z.object({
  query: z.string().min(1).describe('Search query for case content, parties, or keywords'),
  sport: z.string().optional().describe('Filter by sport (e.g., "Football", "Cycling", "Athletics")'),
  year_from: z.number().int().min(1984).max(2026).optional().describe('Filter decisions from this year'),
  year_to: z.number().int().min(1984).max(2026).optional().describe('Filter decisions until this year'),
  procedure_type: z.enum(['Appeal', 'Ordinary', 'Anti-Doping', 'Advisory']).optional().describe('Filter by procedure type'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination'),
  page_size: z.number().int().min(1).max(25).default(10).describe('Results per page (max 25)')
});

export type CasSearchInput = z.infer<typeof CasSearchInputSchema>;

/**
 * Get specific award input schema
 */
export const CasGetAwardInputSchema = z.object({
  case_number: z.string().optional().describe('CAS case number (e.g., "CAS 2023/A/9876" or "2023/A/9876")'),
  url: z.string().url().optional().describe('Direct URL to the award page'),
  include_full_text: z.boolean().default(false).describe('Whether to include full PDF text (larger response)')
}).refine(data => data.case_number || data.url, {
  message: 'Either case_number or url is required'
});

export type CasGetAwardInput = z.infer<typeof CasGetAwardInputSchema>;

/**
 * Recent decisions input schema
 */
export const CasRecentInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of recent decisions to return')
});

export type CasRecentInput = z.infer<typeof CasRecentInputSchema>;

/**
 * Browse by sport input schema
 */
export const CasBySportInputSchema = z.object({
  sport: z.string().min(1).describe('Sport to browse (e.g., "Football", "Cycling")'),
  page: z.number().int().min(1).default(1).describe('Page number for pagination')
});

export type CasBySportInput = z.infer<typeof CasBySportInputSchema>;

// ============================================================================
// Output Types
// ============================================================================

/**
 * Parsed case number components
 */
export interface ParsedCaseNumber {
  year: number;
  type: 'A' | 'O' | 'AD' | 'ADV';  // Appeal, Ordinary, Anti-Doping, Advisory
  number: number;
  original: string;
  normalized: string;
}

/**
 * Search result item
 */
export interface CasSearchResult {
  case_number: string;
  case_number_normalized: string;
  title: string;
  sport: string | null;
  procedure_type: 'Appeal' | 'Ordinary' | 'Anti-Doping' | 'Advisory';
  date: string;
  parties: {
    appellant: string | null;
    respondent: string | null;
  };
  url: string;
  pdf_url: string | null;
  snippet: string | null;
}

/**
 * Search output
 */
export interface CasSearchOutput {
  results: CasSearchResult[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
  query_used: string;
  filters_applied: {
    sport?: string;
    year_from?: number;
    year_to?: number;
    procedure_type?: string;
  };
}

/**
 * Arbitrator information
 */
export interface Arbitrator {
  name: string;
  role: 'President' | 'Arbitrator';
  nationality?: string;
}

/**
 * Award details
 */
export interface CasAwardDetails {
  case_number: string;
  case_number_normalized: string;
  title: string;
  sport: string | null;
  procedure_type: 'Appeal' | 'Ordinary' | 'Anti-Doping' | 'Advisory';
  date: string;
  parties: {
    appellant: string | null;
    respondent: string | null;
  };
  arbitrators: Arbitrator[];
  keywords: string[];
  operative_part: string | null;
  summary: string | null;
  full_text: string | null;
  pdf_url: string;
  source_url: string;
}

/**
 * Award output
 */
export interface CasAwardOutput {
  found: boolean;
  award: CasAwardDetails | null;
  error?: string;
}

/**
 * Recent decision item
 */
export interface CasRecentDecision {
  case_number: string;
  case_number_normalized: string;
  title: string;
  date: string;
  sport: string | null;
  pdf_url: string;
  source_url: string;
}

/**
 * Recent decisions output
 */
export interface CasRecentOutput {
  decisions: CasRecentDecision[];
  retrieved_at: string;
  source: string;
}

/**
 * Browse by sport output
 */
export interface CasBySportOutput {
  sport: string;
  results: CasSearchResult[];
  total: number;
  page: number;
  has_more: boolean;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  baseUrl: string;
  recentUrl: string;
  pdfBaseUrl: string;
  userAgent: string;
  timeout: number;
  crawlDelay: number;
}

/**
 * Default scraper configuration
 */
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  baseUrl: 'https://jurisprudence.tas-cas.org/',
  recentUrl: 'https://www.tas-cas.org/en/jurisprudence/recent-decisions.html',
  pdfBaseUrl: 'https://www.tas-cas.org/files/decision/',
  userAgent: 'BetterCallClaude-MCP/1.0 (https://bettercallclaude.ch; legal research)',
  timeout: 15000,
  crawlDelay: 10000  // 10 seconds as per robots.txt
};

/**
 * Tool definitions for MCP
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'cas_search',
    description: 'Search CAS/TAS (Court of Arbitration for Sport) arbitration decisions by keywords, sport, year range, or procedure type. Returns case summaries with links to full awards.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query for case content, parties, or keywords' },
        sport: { type: 'string', description: 'Filter by sport (e.g., "Football", "Cycling", "Athletics")' },
        year_from: { type: 'number', description: 'Filter decisions from this year (1984-2026)' },
        year_to: { type: 'number', description: 'Filter decisions until this year (1984-2026)' },
        procedure_type: { type: 'string', enum: ['Appeal', 'Ordinary', 'Anti-Doping', 'Advisory'], description: 'Filter by procedure type' },
        page: { type: 'number', description: 'Page number for pagination (default: 1)' },
        page_size: { type: 'number', description: 'Results per page, max 25 (default: 10)' }
      },
      required: ['query']
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: 'cas_get_award',
    description: 'Retrieve detailed information about a specific CAS/TAS award including parties, arbitrators, keywords, and optionally the full text. Use case number like "CAS 2023/A/9876" or provide the award URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        case_number: { type: 'string', description: 'CAS case number (e.g., "CAS 2023/A/9876")' },
        url: { type: 'string', description: 'Direct URL to the award page' },
        include_full_text: { type: 'boolean', description: 'Include full PDF text (default: false)' }
      }
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: 'cas_recent',
    description: 'Get the most recent CAS/TAS arbitration decisions. Returns a list of the latest published awards with basic information and PDF links.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Maximum number of recent decisions (1-50, default: 10)' }
      }
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  {
    name: 'cas_by_sport',
    description: 'Browse CAS/TAS decisions by sport category. Returns paginated results for a specific sport like Football, Cycling, Athletics, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        sport: { type: 'string', description: 'Sport to browse (e.g., "Football", "Cycling")' },
        page: { type: 'number', description: 'Page number for pagination (default: 1)' }
      },
      required: ['sport']
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }
] as const;
