import type {
  ParseCitationInput,
  ParseCitationOutput,
  ParsedBGECitation,
  ParsedStatuteCitation,
  Language,
  BGESection,
  CitationType,
} from '../types.js';
import { CITATION_PATTERNS } from '../types.js';

/**
 * Normalize whitespace in citation string
 */
function normalizeWhitespace(citation: string): string {
  return citation.replace(/\s+/g, ' ').trim();
}

/**
 * Detect language from BGE prefix
 */
function languageFromBGEPrefix(prefix: string): Language {
  const upper = prefix.toUpperCase();
  if (upper === 'ATF') return 'fr';
  if (upper === 'DTF') return 'it';
  return 'de'; // BGE is German
}

/**
 * Detect language from statute citation
 */
function detectStatuteLanguage(citation: string): Language {
  // Check for French patterns (al. = alinéa, let. = lettre, ch. = chiffre)
  if (/\bal\.\s/i.test(citation) || /\blet\.\s/i.test(citation) || /\bch\.\s/i.test(citation)) {
    return 'fr';
  }
  // Check for Italian patterns (cpv. = capoverso, lett. = lettera, n. = numero)
  if (/\bcpv\.\s/i.test(citation) || /\blett\.\s/i.test(citation)) {
    return 'it';
  }
  // Default to German
  return 'de';
}

/**
 * Normalize section to proper case (I, Ia, II, III, IV, V, VI)
 */
function normalizeSection(section: string): BGESection {
  const upper = section.toUpperCase();
  // Special case for Ia
  if (upper === 'IA') return 'Ia';
  return upper as BGESection;
}

/**
 * Check if section is valid
 */
function isValidSection(section: string): boolean {
  const validSections = ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'];
  const normalized = section.toUpperCase() === 'IA' ? 'Ia' : section.toUpperCase();
  return validSections.includes(normalized);
}

/**
 * Normalize statute abbreviation to proper case
 * Swiss statutes have specific case patterns: StGB, ZGB, OR, CO, BV, ZPO, StPO
 */
function normalizeStatuteAbbreviation(statute: string): string {
  const upper = statute.toUpperCase();

  // Map of known Swiss statute abbreviations with proper case
  const statuteMap: Record<string, string> = {
    // German abbreviations
    'OR': 'OR',
    'ZGB': 'ZGB',
    'STGB': 'StGB',
    'BV': 'BV',
    'ZPO': 'ZPO',
    'STPO': 'StPO',
    'UWG': 'UWG',
    'DSG': 'DSG',
    'SCHKG': 'SchKG',
    'IPRG': 'IPRG',
    'BGG': 'BGG',
    'VWG': 'VwG',
    // French abbreviations
    'CO': 'CO',
    'CC': 'CC',
    'CP': 'CP',
    'CST': 'Cst',
    'CPC': 'CPC',
    'CPP': 'CPP',
    'LP': 'LP',
    'LDIP': 'LDIP',
    'LTF': 'LTF',
    // Italian abbreviations (same as French for most)
  };

  return statuteMap[upper] || upper;
}

/**
 * Parse a BGE citation
 */
function parseBGE(citation: string): { parsed: ParsedBGECitation; normalized: string } | { error: string } {
  const normalized = normalizeWhitespace(citation);
  const match = normalized.match(CITATION_PATTERNS.BGE);

  if (!match) {
    // Check if it's a BGE-like pattern with invalid section
    const looseMatch = normalized.match(CITATION_PATTERNS.BGE_LOOSE);
    if (looseMatch) {
      const section = looseMatch[3]!;
      if (!isValidSection(section)) {
        return { error: `Invalid BGE section '${section}'. Valid sections: I, Ia, II, III, IV, V, VI` };
      }
    }
    return { error: 'Invalid BGE citation format' };
  }

  const prefix = match[1]!.toUpperCase() as 'BGE' | 'ATF' | 'DTF';
  const volume = parseInt(match[2]!, 10);
  const section = normalizeSection(match[3]!);
  const page = parseInt(match[4]!, 10);
  const consideration = match[6] || undefined;
  const language = languageFromBGEPrefix(prefix);

  // Build normalized string
  let normalizedStr = `${prefix} ${volume} ${section} ${page}`;
  if (consideration) {
    const considPrefix = prefix === 'BGE' ? 'E.' : 'consid.';
    normalizedStr += ` ${considPrefix} ${consideration}`;
  }

  const parsed: ParsedBGECitation = {
    type: 'bge',
    prefix,
    volume,
    section,
    page,
    language,
  };

  if (consideration) {
    parsed.consideration = consideration;
  }

  return { parsed, normalized: normalizedStr };
}

/**
 * Parse a statute citation
 */
function parseStatute(citation: string): { parsed: ParsedStatuteCitation; normalized: string } | { error: string } {
  const normalized = normalizeWhitespace(citation);
  const match = normalized.match(CITATION_PATTERNS.STATUTE);

  if (!match) {
    return { error: 'Invalid statute citation format' };
  }

  const article = parseInt(match[2]!, 10);
  const statute = match[9];

  if (!statute) {
    return { error: 'Statute citation is missing the statute abbreviation' };
  }

  const language = detectStatuteLanguage(citation);

  const parsed: ParsedStatuteCitation = {
    type: 'statute',
    article,
    statute: normalizeStatuteAbbreviation(statute),
    language,
  };

  // Build normalized string
  let normalizedStr = `Art. ${article}`;

  // Add paragraph if present
  if (match[3] && match[4]) {
    parsed.paragraph = parseInt(match[4], 10);
    normalizedStr += ` Abs. ${parsed.paragraph}`;
  }

  // Add letter if present
  if (match[5] && match[6]) {
    parsed.letter = match[6].toLowerCase();
    normalizedStr += ` lit. ${parsed.letter}`;
  }

  // Add number if present
  if (match[7] && match[8]) {
    parsed.number = parseInt(match[8], 10);
    normalizedStr += ` Ziff. ${parsed.number}`;
  }

  normalizedStr += ` ${normalizeStatuteAbbreviation(statute)}`;

  return { parsed, normalized: normalizedStr };
}

/**
 * Detect citation type from string
 */
function detectCitationType(citation: string): CitationType | null {
  const normalized = normalizeWhitespace(citation);

  // Check for BGE pattern first
  if (/^(BGE|ATF|DTF)/i.test(normalized)) {
    return 'bge';
  }

  // Check for statute pattern
  if (/^(Art\.|art\.)/i.test(normalized)) {
    return 'statute';
  }

  // Check for doctrine pattern (simplified)
  if (CITATION_PATTERNS.DOCTRINE.test(normalized)) {
    return 'doctrine';
  }

  return null;
}

/**
 * Parse a Swiss legal citation into its components
 */
export function parseCitation(input: ParseCitationInput): ParseCitationOutput {
  const trimmed = input.citation.trim();

  // Check for empty citation
  if (!trimmed) {
    return {
      success: false,
      parsed: null,
      original: input.citation,
      normalized: null,
      error: 'Citation string is empty',
    };
  }

  // Detect or use provided citation type
  const typeHint = input.citationType;
  const detectedType = detectCitationType(trimmed);
  const citationType = typeHint || detectedType;

  // Check for type hint conflict
  if (typeHint && detectedType && typeHint !== detectedType) {
    return {
      success: false,
      parsed: null,
      original: input.citation,
      normalized: null,
      error: `Citation type hint '${typeHint}' does not match detected type '${detectedType}'`,
    };
  }

  // Parse based on type
  if (citationType === 'bge') {
    const result = parseBGE(trimmed);
    if ('error' in result) {
      return {
        success: false,
        parsed: null,
        original: input.citation,
        normalized: null,
        error: result.error,
      };
    }
    return {
      success: true,
      parsed: result.parsed,
      original: input.citation,
      normalized: result.normalized,
    };
  }

  if (citationType === 'statute') {
    const result = parseStatute(trimmed);
    if ('error' in result) {
      return {
        success: false,
        parsed: null,
        original: input.citation,
        normalized: null,
        error: result.error,
      };
    }
    return {
      success: true,
      parsed: result.parsed,
      original: input.citation,
      normalized: result.normalized,
    };
  }

  // Unrecognized format
  return {
    success: false,
    parsed: null,
    original: input.citation,
    normalized: null,
    error: 'Unrecognized citation format',
  };
}
