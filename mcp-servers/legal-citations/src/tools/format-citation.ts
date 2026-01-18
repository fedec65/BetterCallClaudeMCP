import type {
  FormatCitationInput,
  FormatCitationOutput,
  Language,
} from '../types.js';
import {
  BGE_PREFIX_BY_LANGUAGE,
  CONSIDERATION_PREFIX_BY_LANGUAGE,
  STATUTE_TRANSLATIONS,
  STATUTE_TERMINOLOGY,
} from '../types.js';
import { parseCitation } from './parse-citation.js';

/**
 * Translate a statute abbreviation to the target language
 */
function translateStatute(statute: string, targetLanguage: Language): string {
  const upper = statute.toUpperCase();

  // Check if we have a translation mapping
  for (const [key, translations] of Object.entries(STATUTE_TRANSLATIONS)) {
    if (key.toUpperCase() === upper ||
        Object.values(translations).some(t => t.toUpperCase() === upper)) {
      return translations[targetLanguage];
    }
  }

  // Return original if no translation found
  return statute;
}

/**
 * Format a BGE citation to the target language and style
 */
function formatBGECitation(
  parsed: {
    prefix: 'BGE' | 'ATF' | 'DTF';
    volume: number;
    section: string;
    page: number;
    consideration?: string;
  },
  targetLanguage: Language,
  style: 'full' | 'short' | 'inline'
): string {
  const targetPrefix = BGE_PREFIX_BY_LANGUAGE[targetLanguage];
  const section = parsed.section;

  switch (style) {
    case 'inline':
      // Inline style: just volume section page (no prefix)
      return `${parsed.volume} ${section} ${parsed.page}`;

    case 'short':
      // Short style: prefix volume section page (no consideration)
      return `${targetPrefix} ${parsed.volume} ${section} ${parsed.page}`;

    case 'full':
    default:
      // Full style: everything including consideration if present
      let result = `${targetPrefix} ${parsed.volume} ${section} ${parsed.page}`;
      if (parsed.consideration) {
        const considPrefix = CONSIDERATION_PREFIX_BY_LANGUAGE[targetLanguage];
        result += ` ${considPrefix} ${parsed.consideration}`;
      }
      return result;
  }
}

/**
 * Format a statute citation to the target language and style
 */
function formatStatuteCitation(
  parsed: {
    article: number;
    paragraph?: number;
    letter?: string;
    number?: number;
    statute: string;
  },
  targetLanguage: Language,
  style: 'full' | 'short' | 'inline'
): string {
  const terminology = STATUTE_TERMINOLOGY[targetLanguage];
  const translatedStatute = translateStatute(parsed.statute, targetLanguage);

  switch (style) {
    case 'inline':
      // Inline style: just article number and statute
      return `${parsed.article} ${translatedStatute}`;

    case 'short':
      // Short style: article and statute only (omits paragraph/letter/number)
      return `${terminology.article} ${parsed.article} ${translatedStatute}`;

    case 'full':
    default:
      // Full style: all components
      let result = `${terminology.article} ${parsed.article}`;

      if (parsed.paragraph !== undefined) {
        result += ` ${terminology.paragraph} ${parsed.paragraph}`;
      }

      if (parsed.letter !== undefined) {
        result += ` ${terminology.letter} ${parsed.letter}`;
      }

      if (parsed.number !== undefined) {
        result += ` ${terminology.number} ${parsed.number}`;
      }

      result += ` ${translatedStatute}`;
      return result;
  }
}

/**
 * Format a Swiss legal citation to a specific language and style
 */
export function formatCitation(input: FormatCitationInput): FormatCitationOutput {
  const { citation, targetLanguage, style = 'full' } = input;

  // Check for empty citation
  if (!citation || !citation.trim()) {
    return {
      success: false,
      formatted: null,
      original: citation,
      targetLanguage,
      style,
      error: 'Citation string is empty',
    };
  }

  // Parse the citation first
  const parseResult = parseCitation({ citation });

  if (!parseResult.success || !parseResult.parsed) {
    return {
      success: false,
      formatted: null,
      original: citation,
      targetLanguage,
      style,
      error: parseResult.error || 'Failed to parse citation',
    };
  }

  const parsed = parseResult.parsed;

  // Format based on citation type
  if (parsed.type === 'bge') {
    const formatted = formatBGECitation(
      {
        prefix: parsed.prefix,
        volume: parsed.volume,
        section: parsed.section,
        page: parsed.page,
        consideration: parsed.consideration,
      },
      targetLanguage,
      style
    );

    return {
      success: true,
      formatted,
      original: citation,
      targetLanguage,
      style,
    };
  }

  if (parsed.type === 'statute') {
    const formatted = formatStatuteCitation(
      {
        article: parsed.article,
        paragraph: parsed.paragraph,
        letter: parsed.letter,
        number: parsed.number,
        statute: parsed.statute,
      },
      targetLanguage,
      style
    );

    return {
      success: true,
      formatted,
      original: citation,
      targetLanguage,
      style,
    };
  }

  // Unsupported citation type
  return {
    success: false,
    formatted: null,
    original: citation,
    targetLanguage,
    style,
    error: 'Unsupported citation type for formatting',
  };
}
