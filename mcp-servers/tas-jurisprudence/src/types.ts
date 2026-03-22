/**
 * TAS/CAS Jurisprudence MCP Server - Type Definitions
 * Zod schemas and TypeScript interfaces for Court of Arbitration for Sport
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const ProcedureTypeEnum = z.enum([
  'Appeal',
  'Ordinary',
  'Anti-Doping',
  'Advisory',
  'Application',
  'Mediation'
]);

export type ProcedureType = z.infer<typeof ProcedureTypeEnum>;

export const SportEnum = z.enum([
  'Football',
  'Athletics',
  'Cycling',
  'Tennis',
  'Swimming',
  'Basketball',
  'Ice Hockey',
  'Handball',
  'Volleyball',
  'Skiing',
  'Gymnastics',
  'Rowing',
  'Boxing',
  'Wrestling',
  'Judo',
  'Equestrian',
  'Sailing',
  'Fencing',
  'Other'
]);

export type Sport = z.infer<typeof SportEnum>;

// ============================================================================
// Input Schemas (Tool Arguments)
// ============================================================================

/**
 * Tool 1: Search CAS decisions
 */
export const CasSearchInputSchema = z.object({
  query: z.string()
    .min(1, "Query cannot be empty")
    .describe("Search terms (keywords, case number, party names, etc.)"),

  sport: z.string()
    .optional()
    .describe("Filter by sport discipline (e.g., 'Football', 'Cycling')"),

  year_from: z.number()
    .int()
    .min(1984, "CAS was established in 1984")
    .max(new Date().getFullYear())
    .optional()
    .describe("Filter decisions from this year onwards"),

  year_to: z.number()
    .int()
    .min(1984)
    .max(new Date().getFullYear())
    .optional()
    .describe("Filter decisions up to this year"),

  procedure_type: ProcedureTypeEnum
    .optional()
    .describe("Filter by CAS procedure type"),

  page: z.number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number for pagination"),

  page_size: z.number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Results per page (1-25)")
});

export type CasSearchInput = z.infer<typeof CasSearchInputSchema>;

/**
 * Tool 2: Get specific award details
 */
export const CasGetAwardInputSchema = z.object({
  case_number: z.string()
    .optional()
    .describe("CAS case number (e.g., 'CAS 2023/A/9876' or '2023/A/9876')"),

  url: z.string()
    .url()
    .optional()
    .describe("Direct URL to the CAS award page"),

  include_full_text: z.boolean()
    .default(false)
    .describe("Include full text extraction from PDF (warning: slower)")
}).refine(
  data => data.case_number || data.url,
  { message: "Either case_number or url is required" }
);

export type CasGetAwardInput = z.infer<typeof CasGetAwardInputSchema>;

/**
 * Tool 3: Recent decisions
 */
export const CasRecentInputSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of recent decisions to return (1-50)")
});

export type CasRecentInput = z.infer<typeof CasRecentInputSchema>;

/**
 * Tool 4: Browse by sport
 */
export const CasBySportInputSchema = z.object({
  sport: z.string()
    .min(1)
    .describe("Sport discipline to browse (e.g., 'Football', 'Cycling')"),

  page: z.number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number for pagination"),

  procedure_type: ProcedureTypeEnum
    .optional()
    .describe("Filter by procedure type within sport")
});

export type CasBySportInput = z.infer<typeof CasBySportInputSchema>;

// ============================================================================
// Output Types (Response Structures)
// ============================================================================

/**
 * Parsed case number components
 */
export const ParsedCaseNumberSchema = z.object({
  year: z.number(),
  type: z.enum(['A', 'O', 'AD', 'G', 'M']), // Appeal, Ordinary, Anti-Doping, Advisory, Mediation
  number: z.number(),
  full_number: z.string()
});

export type ParsedCaseNumber = z.infer<typeof ParsedCaseNumberSchema>;

/**
 * Search result item
 */
export const SearchResultSchema = z.object({
  case_number: z.string(),
  title: z.string(),
  sport: z.string().optional(),
  procedure_type: z.string().optional(),
  date: z.string().optional(),
  parties: z.object({
    appellant: z.string().optional(),
    respondent: z.string().optional()
  }).optional(),
  url: z.string().url(),
  pdf_url: z.string().url().optional(),
  summary: z.string().optional()
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Search output with pagination
 */
export const CasSearchOutputSchema = z.object({
  results: z.array(SearchResultSchema),
  total_results: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
  has_more: z.boolean()
});

export type CasSearchOutput = z.infer<typeof CasSearchOutputSchema>;

/**
 * Award details - metadata only
 */
export const AwardMetadataSchema = z.object({
  case_number: z.string(),
  title: z.string(),
  sport: z.string().optional(),
  procedure_type: z.string().optional(),
  date: z.string().optional(),
  arbitrators: z.array(z.object({
    name: z.string(),
    role: z.enum(['President', 'Arbitrator', 'Co-Arbitrator']).optional()
  })).optional(),
  parties: z.object({
    appellant: z.string().optional(),
    appellant_counsel: z.string().optional(),
    respondent: z.string().optional(),
    respondent_counsel: z.string().optional()
  }).optional(),
  keywords: z.array(z.string()).optional(),
  operative_part: z.string().optional(),
  pdf_url: z.string().url().optional(),
  url: z.string().url()
});

export type AwardMetadata = z.infer<typeof AwardMetadataSchema>;

/**
 * Award details - with optional full text
 */
export const CasAwardOutputSchema = AwardMetadataSchema.extend({
  full_text: z.string().optional(),
  pages: z.number().optional(),
  extraction_status: z.enum(['success', 'partial', 'failed', 'not_requested'])
});

export type CasAwardOutput = z.infer<typeof CasAwardOutputSchema>;

/**
 * Recent decision item
 */
export const RecentDecisionSchema = z.object({
  case_number: z.string(),
  title: z.string(),
  date: z.string(),
  sport: z.string().optional(),
  procedure_type: z.string().optional(),
  url: z.string().url(),
  pdf_url: z.string().url().optional()
});

export type RecentDecision = z.infer<typeof RecentDecisionSchema>;

/**
 * Recent decisions output
 */
export const CasRecentOutputSchema = z.object({
  decisions: z.array(RecentDecisionSchema),
  last_updated: z.string(),
  source: z.string()
});

export type CasRecentOutput = z.infer<typeof CasRecentOutputSchema>;

/**
 * Browse by sport output (extends search output)
 */
export const CasBySportOutputSchema = CasSearchOutputSchema.extend({
  sport: z.string(),
  total_for_sport: z.number()
});

export type CasBySportOutput = z.infer<typeof CasBySportOutputSchema>;

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
 * Rate limiter state
 */
export interface RateLimiterState {
  lastRequest: number;
  queue: Array<() => void>;
  processing: boolean;
}

/**
 * Scraper result types
 */
export interface ScraperSearchResult {
  items: SearchResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const CAS_CONSTANTS = {
  BASE_URL: 'https://jurisprudence.tas-cas.org',
  // Recent decisions are fetched from main search endpoint (sorted by date by default)
  RECENT_URL: 'https://jurisprudence.tas-cas.org/search?details=-1',
  PDF_BASE_URL: 'https://www.tas-cas.org/files/decision',

  // Rate limiting per robots.txt
  CRAWL_DELAY_MS: 10000, // 10 seconds

  // Cache TTLs
  CACHE_TTL: {
    SEARCH: 10 * 60 * 1000,    // 10 minutes
    AWARD: 30 * 60 * 1000,     // 30 minutes
    RECENT: 5 * 60 * 1000      // 5 minutes
  },

  // Pagination
  MAX_PAGE_SIZE: 25,
  DEFAULT_PAGE_SIZE: 10,

  // Timeouts
  PAGE_TIMEOUT_MS: 30000,
  REQUEST_TIMEOUT_MS: 15000,

  // User agent
  USER_AGENT: 'BetterCallClaude-MCP/1.0 (https://bettercallclaude.ch; legal research)'
} as const;
