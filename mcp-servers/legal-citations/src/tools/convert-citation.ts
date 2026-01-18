import type {
  ConvertCitationInput,
  ConvertCitationOutput,
  Language,
  CitationType,
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
    if (
      key.toUpperCase() === upper ||
      Object.values(translations).some((t) => t.toUpperCase() === upper)
    ) {
      return translations[targetLanguage];
    }
  }

  // Return original if no translation found
  return statute;
}

/**
 * Convert a BGE citation to the target language
 */
function convertBGECitation(
  parsed: {
    prefix: 'BGE' | 'ATF' | 'DTF';
    volume: number;
    section: string;
    page: number;
    consideration?: string;
  },
  targetLanguage: Language
): string {
  const targetPrefix = BGE_PREFIX_BY_LANGUAGE[targetLanguage];
  const section = parsed.section;

  let result = `${targetPrefix} ${parsed.volume} ${section} ${parsed.page}`;

  if (parsed.consideration) {
    const considPrefix = CONSIDERATION_PREFIX_BY_LANGUAGE[targetLanguage];
    result += ` ${considPrefix} ${parsed.consideration}`;
  }

  return result;
}

/**
 * Convert a statute citation to the target language
 */
function convertStatuteCitation(
  parsed: {
    article: number;
    paragraph?: number;
    letter?: string;
    number?: number;
    statute: string;
  },
  targetLanguage: Language
): string {
  const terminology = STATUTE_TERMINOLOGY[targetLanguage];
  const translatedStatute = translateStatute(parsed.statute, targetLanguage);

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

/**
 * Convert a Swiss legal citation between formats and languages
 */
export function convertCitation(input: ConvertCitationInput): ConvertCitationOutput {
  const { citation, fromFormat, toFormat, targetLanguage = 'de' } = input;

  // Check for empty citation
  if (!citation || !citation.trim()) {
    return {
      success: false,
      converted: null,
      original: citation,
      fromFormat: fromFormat || 'bge',
      toFormat,
      targetLanguage,
      error: 'Citation string is empty',
    };
  }

  // Parse the citation first
  const parseResult = parseCitation({ citation, citationType: fromFormat });

  if (!parseResult.success || !parseResult.parsed) {
    return {
      success: false,
      converted: null,
      original: citation,
      fromFormat: fromFormat || 'bge',
      toFormat,
      targetLanguage,
      error: parseResult.error || 'Failed to parse citation',
    };
  }

  const parsed = parseResult.parsed;
  const detectedFormat = parsed.type as CitationType;

  // Doctrine format is not yet supported
  if (toFormat === 'doctrine') {
    return {
      success: false,
      converted: null,
      original: citation,
      fromFormat: detectedFormat,
      toFormat,
      targetLanguage,
      error: 'Conversion to doctrine format is not yet supported',
    };
  }

  // Check for format mismatch (cannot convert between different types)
  if (detectedFormat !== toFormat) {
    return {
      success: false,
      converted: null,
      original: citation,
      fromFormat: detectedFormat,
      toFormat,
      targetLanguage,
      error: `Cannot convert from '${detectedFormat}' to '${toFormat}'. Citation type must match target format.`,
    };
  }

  // Convert based on citation type
  if (parsed.type === 'bge') {
    const converted = convertBGECitation(
      {
        prefix: parsed.prefix,
        volume: parsed.volume,
        section: parsed.section,
        page: parsed.page,
        consideration: parsed.consideration,
      },
      targetLanguage
    );

    return {
      success: true,
      converted,
      original: citation,
      fromFormat: 'bge',
      toFormat: 'bge',
      targetLanguage,
    };
  }

  if (parsed.type === 'statute') {
    const converted = convertStatuteCitation(
      {
        article: parsed.article,
        paragraph: parsed.paragraph,
        letter: parsed.letter,
        number: parsed.number,
        statute: parsed.statute,
      },
      targetLanguage
    );

    return {
      success: true,
      converted,
      original: citation,
      fromFormat: 'statute',
      toFormat: 'statute',
      targetLanguage,
    };
  }

  // Unsupported citation type
  return {
    success: false,
    converted: null,
    original: citation,
    fromFormat: detectedFormat,
    toFormat,
    targetLanguage,
    error: 'Unsupported citation type for conversion',
  };
}
