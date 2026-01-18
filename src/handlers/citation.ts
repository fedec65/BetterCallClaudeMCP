import type { LegalCitationInput, LegalCitationOutput, ParsedCitation, Language, CitationType } from '../types/index.js';
import { CITATION_LANGUAGE_MAP, STATUTE_ABBREVIATIONS } from '../types/common.js';
import { citationCache, LegalCache } from '../infrastructure/cache.js';

/**
 * BGE citation pattern: BGE 145 III 229 E. 4.2
 * - BGE/ATF/DTF: Federal Supreme Court indicator
 * - 145: Volume number
 * - III: Section (I, Ia, II, III, IV, V, VI)
 * - 229: Page number
 * - E. 4.2: Consideration (Erwägung/considérant/considerando)
 */
const BGE_PATTERN = /^(BGE|ATF|DTF)\s*(\d+)\s*(I|Ia|II|III|IV|V|VI)\s*(\d+)(?:\s*(E\.|consid\.)\s*(\d+(?:\.\d+)*))?$/i;

/**
 * Statute citation pattern: Art. 97 Abs. 1 OR
 * - Art./art.: Article indicator
 * - 97: Article number
 * - Abs./al./cpv.: Paragraph indicator
 * - 1: Paragraph number
 * - lit./let./lett.: Letter indicator
 * - OR/CO/ZGB/CC/StGB/CP: Statute abbreviation
 */
const STATUTE_PATTERN = /^(Art\.|art\.)\s*(\d+)\s*(?:(Abs\.|al\.|cpv\.)\s*(\d+))?\s*(?:(lit\.|let\.|lett\.)\s*([a-z]))?\s*(?:(Ziff\.|ch\.|n\.)\s*(\d+))?\s*([A-Z]{2,5})?$/i;

/**
 * Parse a BGE citation
 */
function parseBgeCitation(citation: string): ParsedCitation | null {
  const match = citation.match(BGE_PATTERN);
  if (!match || !match[2] || !match[3] || !match[4]) return null;

  return {
    type: 'bge',
    volume: parseInt(match[2], 10),
    section: match[3].toUpperCase(),
    page: parseInt(match[4], 10),
    consideration: match[6] || undefined,
  };
}

/**
 * Parse a statute citation
 */
function parseStatuteCitation(citation: string): ParsedCitation | null {
  const match = citation.match(STATUTE_PATTERN);
  if (!match || !match[2]) return null;

  return {
    type: 'statute',
    article: parseInt(match[2], 10),
    paragraph: match[4] ? parseInt(match[4], 10) : undefined,
    letter: match[6] || undefined,
    statute: match[9] || undefined,
  };
}

/**
 * Validate a citation
 */
function validateCitation(citation: string, strict: boolean): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check BGE format
  if (BGE_PATTERN.test(citation)) {
    const parsed = parseBgeCitation(citation);
    if (parsed) {
      if (strict && parsed.volume && (parsed.volume < 1 || parsed.volume > 200)) {
        errors.push(`BGE volume ${parsed.volume} is outside expected range (1-200)`);
      }
      if (strict && parsed.page && parsed.page < 1) {
        errors.push('Page number must be positive');
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // Check statute format
  if (STATUTE_PATTERN.test(citation)) {
    const parsed = parseStatuteCitation(citation);
    if (parsed) {
      if (strict && parsed.article && parsed.article < 1) {
        errors.push('Article number must be positive');
      }
      if (strict && parsed.statute) {
        const validStatutes = ['OR', 'CO', 'ZGB', 'CC', 'StGB', 'CP', 'StPO', 'CPP', 'ZPO', 'CPC', 'BV', 'Cst', 'Cost'];
        if (!validStatutes.includes(parsed.statute.toUpperCase())) {
          errors.push(`Unknown statute abbreviation: ${parsed.statute}`);
        }
      }
    }
    return { valid: errors.length === 0, errors };
  }

  errors.push('Citation format not recognized. Expected BGE/ATF/DTF or Art. format.');
  return { valid: false, errors };
}

/**
 * Format a BGE citation to a target language
 */
function formatBgeCitation(parsed: ParsedCitation, targetLang: Language): string {
  const prefix = CITATION_LANGUAGE_MAP.bge[targetLang === 'en' ? 'de' : targetLang];
  let result = `${prefix} ${parsed.volume} ${parsed.section} ${parsed.page}`;

  if (parsed.consideration) {
    const considLabel = CITATION_LANGUAGE_MAP.consideration[targetLang === 'en' ? 'de' : targetLang];
    result += ` ${considLabel} ${parsed.consideration}`;
  }

  return result;
}

/**
 * Format a statute citation to a target language
 */
function formatStatuteCitation(parsed: ParsedCitation, targetLang: Language): string {
  const articleLabel = CITATION_LANGUAGE_MAP.article[targetLang === 'en' ? 'de' : targetLang];
  let result = `${articleLabel} ${parsed.article}`;

  if (parsed.paragraph) {
    const paragraphLabel = CITATION_LANGUAGE_MAP.paragraph[targetLang === 'en' ? 'de' : targetLang];
    result += ` ${paragraphLabel} ${parsed.paragraph}`;
  }

  if (parsed.letter) {
    const letterLabel = CITATION_LANGUAGE_MAP.letter[targetLang === 'en' ? 'de' : targetLang];
    result += ` ${letterLabel} ${parsed.letter}`;
  }

  if (parsed.statute) {
    // Translate statute abbreviation if possible
    const translatedStatute = translateStatute(parsed.statute, targetLang);
    result += ` ${translatedStatute}`;
  }

  return result;
}

/**
 * Translate statute abbreviation to target language
 */
function translateStatute(statute: string, targetLang: Language): string {
  const langKey = targetLang === 'en' ? 'de' : targetLang;

  // Map common abbreviations
  const upper = statute.toUpperCase();
  for (const [_key, translations] of Object.entries(STATUTE_ABBREVIATIONS)) {
    const values = Object.values(translations);
    if (values.some(v => v.toUpperCase() === upper)) {
      return translations[langKey as keyof typeof translations];
    }
  }

  return statute; // Return original if no translation found
}

/**
 * Normalize a citation to a standard format
 */
function normalizeCitation(citation: string): string {
  // Normalize spacing
  let normalized = citation.trim().replace(/\s+/g, ' ');

  // Normalize BGE variants
  normalized = normalized.replace(/^(BGE|ATF|DTF)/i, 'BGE');

  // Normalize article prefix
  normalized = normalized.replace(/^art\./i, 'Art.');

  // Normalize paragraph indicators
  normalized = normalized.replace(/\b(abs\.|al\.|cpv\.)/i, 'Abs.');

  // Normalize letter indicators
  normalized = normalized.replace(/\b(lit\.|let\.|lett\.)/i, 'lit.');

  return normalized;
}

/**
 * Handle the legal_citation tool
 * Validates, parses, and formats Swiss legal citations
 */
export async function handleLegalCitation(
  input: LegalCitationInput,
  _requestId: string
): Promise<LegalCitationOutput> {
  const { citation, action, targetLang: _targetLang, strict = true } = input;

  // Check cache for parsing results
  const cacheKey = LegalCache.generateKey('citation', { citation, action });
  const cached = citationCache.get(cacheKey);
  if (cached) {
    return cached as LegalCitationOutput;
  }

  // Normalize the citation first
  const normalized = normalizeCitation(citation);

  // Parse the citation
  let parsed: ParsedCitation | undefined;
  let citationType: CitationType | undefined;

  if (BGE_PATTERN.test(normalized)) {
    parsed = parseBgeCitation(normalized) || undefined;
    citationType = 'bge';
  } else if (STATUTE_PATTERN.test(normalized)) {
    parsed = parseStatuteCitation(normalized) || undefined;
    citationType = 'statute';
  }

  // Validate
  const validation = validateCitation(normalized, strict);

  // Build result based on action
  const result: LegalCitationOutput = {
    valid: validation.valid,
    normalized,
    parsed,
    errors: validation.errors.length > 0 ? validation.errors : undefined,
  };

  // Format to different languages if requested
  if (action === 'format' && parsed && citationType) {
    const languages: Language[] = ['de', 'fr', 'it'];
    const formatted: Partial<Record<Language, string>> = {};

    for (const lang of languages) {
      if (citationType === 'bge') {
        formatted[lang] = formatBgeCitation(parsed, lang);
      } else if (citationType === 'statute') {
        formatted[lang] = formatStatuteCitation(parsed, lang);
      }
    }

    result.formatted = formatted;
  }

  // Generate suggestions for invalid citations
  if (!validation.valid) {
    const suggestions: string[] = [];

    if (citation.toLowerCase().includes('bge') || citation.toLowerCase().includes('atf')) {
      suggestions.push('BGE format: BGE 145 III 229 E. 4.2');
    }

    if (citation.toLowerCase().includes('art')) {
      suggestions.push('Article format: Art. 97 Abs. 1 OR');
    }

    if (suggestions.length === 0) {
      suggestions.push('Supported formats: BGE 145 III 229 E. 4.2 or Art. 97 Abs. 1 OR');
    }

    result.suggestions = suggestions;
  }

  // Cache the result
  citationCache.set(cacheKey, result);

  return result;
}
