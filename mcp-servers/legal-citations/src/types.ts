import { z } from 'zod';

/**
 * Supported languages for Swiss legal citations
 */
export const LanguageSchema = z.enum(['de', 'fr', 'it', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

/**
 * BGE section codes
 */
export const BGESectionSchema = z.enum(['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI']);
export type BGESection = z.infer<typeof BGESectionSchema>;

/**
 * Citation types supported by the system
 */
export const CitationTypeSchema = z.enum(['bge', 'statute', 'doctrine']);
export type CitationType = z.infer<typeof CitationTypeSchema>;

// ============================================================
// validate_citation tool
// ============================================================

export const ValidateCitationInputSchema = z.object({
  citation: z.string().min(1).describe('The citation string to validate'),
  strict: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable strict validation mode (checks existence)'),
  citationType: CitationTypeSchema.optional().describe(
    'Hint for citation type (bge, statute, doctrine). Auto-detected if not provided'
  ),
});

export type ValidateCitationInput = z.input<typeof ValidateCitationInputSchema>;

export interface ValidationError {
  code: string;
  message: string;
  position?: number;
}

export interface ValidateCitationOutput {
  valid: boolean;
  citationType: CitationType | null;
  errors: ValidationError[];
  normalized?: string;
  suggestions?: string[];
}

// ============================================================
// parse_citation tool
// ============================================================

export const ParseCitationInputSchema = z.object({
  citation: z.string().min(1).describe('The citation string to parse'),
  citationType: CitationTypeSchema.optional().describe(
    'Hint for citation type. Auto-detected if not provided'
  ),
});

export type ParseCitationInput = z.infer<typeof ParseCitationInputSchema>;

/**
 * Parsed BGE citation components
 */
export interface ParsedBGECitation {
  type: 'bge';
  prefix: 'BGE' | 'ATF' | 'DTF';
  volume: number;
  section: BGESection;
  page: number;
  consideration?: string;
  language: Language;
}

/**
 * Parsed statute citation components
 */
export interface ParsedStatuteCitation {
  type: 'statute';
  article: number;
  paragraph?: number;
  letter?: string;
  number?: number;
  statute: string;
  language: Language;
}

/**
 * Parsed doctrine citation components
 */
export interface ParsedDoctrineCitation {
  type: 'doctrine';
  authors: string[];
  title: string;
  edition?: string;
  year?: number;
  marginNumber?: number;
  page?: number;
  language: Language;
}

export type ParsedCitation =
  | ParsedBGECitation
  | ParsedStatuteCitation
  | ParsedDoctrineCitation;

export interface ParseCitationOutput {
  success: boolean;
  parsed: ParsedCitation | null;
  original: string;
  normalized: string | null;
  error?: string;
}

// ============================================================
// format_citation tool
// ============================================================

export const FormatCitationInputSchema = z.object({
  citation: z.string().min(1).describe('The citation string to format'),
  targetLanguage: LanguageSchema.describe(
    'Target language for the formatted citation'
  ),
  style: z
    .enum(['full', 'short', 'inline'])
    .default('full')
    .describe('Citation formatting style'),
});

export type FormatCitationInput = z.infer<typeof FormatCitationInputSchema>;

export interface FormatCitationOutput {
  success: boolean;
  formatted: string | null;
  original: string;
  targetLanguage: Language;
  style: 'full' | 'short' | 'inline';
  error?: string;
}

// ============================================================
// convert_citation tool
// ============================================================

export const ConvertCitationInputSchema = z.object({
  citation: z.string().min(1).describe('The citation string to convert'),
  fromFormat: CitationTypeSchema.optional().describe(
    'Source format (auto-detected if not provided)'
  ),
  toFormat: CitationTypeSchema.describe('Target format for conversion'),
  targetLanguage: LanguageSchema.optional().describe(
    'Target language for the converted citation'
  ),
});

export type ConvertCitationInput = z.infer<typeof ConvertCitationInputSchema>;

export interface ConvertCitationOutput {
  success: boolean;
  converted: string | null;
  original: string;
  fromFormat: CitationType;
  toFormat: CitationType;
  targetLanguage?: Language;
  error?: string;
  warnings?: string[];
}

// ============================================================
// Common patterns and constants
// ============================================================

/**
 * Regular expression patterns for citation parsing
 */
export const CITATION_PATTERNS = {
  /**
   * BGE citation pattern (strict - requires spaces)
   * Matches: BGE 145 III 229, ATF 140 II 315, DTF 138 I 1
   * With optional consideration: BGE 145 III 229 E. 4.2
   * Requires at least one space between components for proper formatting
   */
  BGE: /^(BGE|ATF|DTF)\s+(\d+)\s+(I|Ia|II|III|IV|V|VI)\s+(\d+)(?:\s+(E\.|consid\.)\s+(\d+(?:\.\d+)*))?$/i,

  /**
   * BGE citation pattern (loose - for detecting any section)
   * Used to detect BGE-like patterns even with invalid sections
   * Allows capturing the section for specific validation errors
   */
  BGE_LOOSE: /^(BGE|ATF|DTF)\s+(\d+)\s+([IVXa-z]+)\s+(\d+)(?:\s+(E\.|consid\.)\s+(\d+(?:\.\d+)*))?$/i,

  /**
   * Statute citation pattern
   * Matches: Art. 97 OR, art. 123 Abs. 2 CO, Art. 8 lit. a ZGB
   */
  STATUTE:
    /^(Art\.|art\.)\s*(\d+)\s*(?:(Abs\.|al\.|cpv\.)\s*(\d+))?\s*(?:(lit\.|let\.|lett\.)\s*([a-z]))?\s*(?:(Ziff\.|ch\.|n\.)\s*(\d+))?\s*([A-Z]{2,10})?$/i,

  /**
   * Doctrine citation pattern (simplified)
   * Matches: GAUCH/SCHLUEP/SCHMID, OR AT, N 123
   */
  DOCTRINE: /^([A-ZÄÖÜ][A-ZÄÖÜa-zäöü]*(?:\/[A-ZÄÖÜ][A-ZÄÖÜa-zäöü]*)*),\s*(.+?)(?:,\s*(?:N|Rz\.?|n\.?)\s*(\d+))?$/,
} as const;

/**
 * BGE prefix by language
 */
export const BGE_PREFIX_BY_LANGUAGE: Record<Language, 'BGE' | 'ATF' | 'DTF'> = {
  de: 'BGE',
  fr: 'ATF',
  it: 'DTF',
  en: 'BGE', // English uses German prefix
};

/**
 * Consideration prefix by language
 */
export const CONSIDERATION_PREFIX_BY_LANGUAGE: Record<Language, string> = {
  de: 'E.',
  fr: 'consid.',
  it: 'consid.',
  en: 'consid.',
};

/**
 * Statute abbreviations in different languages
 */
export const STATUTE_TRANSLATIONS: Record<string, Record<Language, string>> = {
  // Code of Obligations
  OR: { de: 'OR', fr: 'CO', it: 'CO', en: 'CO' },
  CO: { de: 'OR', fr: 'CO', it: 'CO', en: 'CO' },

  // Civil Code
  ZGB: { de: 'ZGB', fr: 'CC', it: 'CC', en: 'CC' },
  CC: { de: 'ZGB', fr: 'CC', it: 'CC', en: 'CC' },

  // Criminal Code
  StGB: { de: 'StGB', fr: 'CP', it: 'CP', en: 'CC' },
  CP: { de: 'StGB', fr: 'CP', it: 'CP', en: 'CC' },

  // Federal Constitution
  BV: { de: 'BV', fr: 'Cst', it: 'Cost', en: 'FC' },
  Cst: { de: 'BV', fr: 'Cst', it: 'Cost', en: 'FC' },
  Cost: { de: 'BV', fr: 'Cst', it: 'Cost', en: 'FC' },

  // Civil Procedure Code
  ZPO: { de: 'ZPO', fr: 'CPC', it: 'CPC', en: 'CPC' },
  CPC: { de: 'ZPO', fr: 'CPC', it: 'CPC', en: 'CPC' },

  // Criminal Procedure Code
  StPO: { de: 'StPO', fr: 'CPP', it: 'CPP', en: 'CPP' },
  CPP: { de: 'StPO', fr: 'CPP', it: 'CPP', en: 'CPP' },
};

/**
 * Article/paragraph/letter terminology by language
 */
export const STATUTE_TERMINOLOGY: Record<
  Language,
  {
    article: string;
    paragraph: string;
    letter: string;
    number: string;
  }
> = {
  de: { article: 'Art.', paragraph: 'Abs.', letter: 'lit.', number: 'Ziff.' },
  fr: { article: 'art.', paragraph: 'al.', letter: 'let.', number: 'ch.' },
  it: { article: 'art.', paragraph: 'cpv.', letter: 'lett.', number: 'n.' },
  en: { article: 'Art.', paragraph: 'para.', letter: 'let.', number: 'no.' },
};
