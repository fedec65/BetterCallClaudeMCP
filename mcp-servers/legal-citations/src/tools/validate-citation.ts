import type {
  ValidateCitationInput,
  ValidateCitationOutput,
  ValidationError,
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
 * Check if citation matches BGE pattern
 */
function matchBGEPattern(
  citation: string
): RegExpMatchArray | null {
  const normalized = normalizeWhitespace(citation);
  return normalized.match(CITATION_PATTERNS.BGE);
}

/**
 * Check if citation matches statute pattern
 */
function matchStatutePattern(
  citation: string
): RegExpMatchArray | null {
  const normalized = normalizeWhitespace(citation);
  return normalized.match(CITATION_PATTERNS.STATUTE);
}

/**
 * Validate BGE section code
 */
function isValidBGESection(section: string): boolean {
  const validSections = ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'];
  return validSections.includes(section);
}

/**
 * Normalize BGE citation to standard format
 */
function normalizeBGECitation(match: RegExpMatchArray): string {
  const prefix = match[1]!.toUpperCase();
  const volume = match[2];
  // Section should be uppercase (I, II, III, etc.) except for "Ia" special case
  const rawSection = match[3]!.toUpperCase();
  const section = rawSection === 'IA' ? 'Ia' : rawSection;
  const page = match[4];

  let result = `${prefix} ${volume} ${section} ${page}`;

  if (match[5] && match[6]) {
    const considPrefix = match[5].toLowerCase().includes('consid') ? 'consid.' : 'E.';
    result += ` ${considPrefix} ${match[6]}`;
  }

  return result;
}

/**
 * Normalize statute citation to standard format
 */
function normalizeStatuteCitation(match: RegExpMatchArray): string {
  let result = `Art. ${match[2]}`;

  if (match[3] && match[4]) {
    result += ` Abs. ${match[4]}`;
  }

  if (match[5] && match[6]) {
    result += ` lit. ${match[6].toLowerCase()}`;
  }

  if (match[7] && match[8]) {
    result += ` Ziff. ${match[8]}`;
  }

  if (match[9]) {
    result += ` ${match[9].toUpperCase()}`;
  }

  return result;
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
 * Generate suggestions for common citation errors
 */
function generateSuggestions(
  citation: string,
  _errors: ValidationError[]
): string[] {
  const suggestions: string[] = [];
  const normalized = normalizeWhitespace(citation);

  // Check for missing page number in BGE
  if (/^(BGE|ATF|DTF)\s+\d+\s+(I|Ia|II|III|IV|V|VI)$/i.test(normalized)) {
    suggestions.push(
      'BGE citation appears to be missing page number. Format: BGE [volume] [section] [page]'
    );
  }

  // Check for missing statute abbreviation
  if (/^Art\.\s+\d+$/i.test(normalized)) {
    suggestions.push(
      'Statute citation is missing the statute abbreviation. Example: Art. 97 OR'
    );
  }

  // Check for common spacing issues
  if (/BGE\d+/i.test(citation) || /Art\.\d+/i.test(citation)) {
    suggestions.push('Add spaces between components of the citation');
  }

  return suggestions;
}

/**
 * Validate a Swiss legal citation
 */
export function validateCitation(
  input: ValidateCitationInput
): ValidateCitationOutput {
  const errors: ValidationError[] = [];
  let citationType: CitationType | null = null;
  let normalized: string | undefined;

  // Normalize input
  const trimmed = input.citation.trim();
  const normalizedCitation = normalizeWhitespace(trimmed);

  // Check for empty citation
  if (!normalizedCitation) {
    errors.push({
      code: 'EMPTY_CITATION',
      message: 'Citation string is empty or contains only whitespace',
    });
    return {
      valid: false,
      citationType: null,
      errors,
      suggestions: ['Please provide a valid citation string'],
    };
  }

  // Use provided citationType hint or detect automatically
  const typeHint = input.citationType;
  citationType = typeHint || detectCitationType(normalizedCitation);

  // Validate based on detected or hinted type
  if (citationType === 'bge' || !citationType) {
    const bgeMatch = matchBGEPattern(normalizedCitation);

    if (bgeMatch) {
      citationType = 'bge';

      // Validate section - convert to uppercase for comparison
      const section = bgeMatch[3]!;
      const uppercaseSection = section.toUpperCase();
      // Handle special case for "Ia" -> "IA" needs to be "Ia"
      const normalizedSection = uppercaseSection === 'IA' ? 'Ia' : uppercaseSection;

      if (!isValidBGESection(normalizedSection)) {
        errors.push({
          code: 'INVALID_SECTION',
          message: `Invalid BGE section '${section}'. Valid sections: I, Ia, II, III, IV, V, VI`,
          position: normalizedCitation.indexOf(section),
        });
      } else {
        normalized = normalizeBGECitation(bgeMatch);
      }
    } else if (typeHint === 'bge' || citationType === 'bge') {
      // Detected as BGE (starts with BGE/ATF/DTF) but doesn't match full strict pattern
      // Try loose pattern to see if it's an invalid section specifically
      const looseMatch = normalizedCitation.match(CITATION_PATTERNS.BGE_LOOSE);
      if (looseMatch) {
        // It matches the loose pattern, so the section is invalid
        const section = looseMatch[3]!;
        errors.push({
          code: 'INVALID_SECTION',
          message: `Invalid BGE section '${section}'. Valid sections: I, Ia, II, III, IV, V, VI`,
          position: normalizedCitation.indexOf(section),
        });
      } else {
        // Doesn't match even loose pattern - format error
        errors.push({
          code: 'INVALID_BGE_FORMAT',
          message: 'Citation does not match BGE format: BGE/ATF/DTF [volume] [section] [page]',
        });
      }
    }
  }

  if (citationType === 'statute' || (!citationType && errors.length === 0)) {
    const statuteMatch = matchStatutePattern(normalizedCitation);

    if (statuteMatch) {
      citationType = 'statute';

      // Check for statute abbreviation
      if (!statuteMatch[9]) {
        errors.push({
          code: 'MISSING_STATUTE',
          message: 'Statute citation is missing the statute abbreviation (e.g., OR, ZGB, StGB)',
        });
      } else {
        normalized = normalizeStatuteCitation(statuteMatch);
      }
    } else if (typeHint === 'statute' || citationType === 'statute') {
      // Detected as statute (starts with Art.) but doesn't match full pattern
      errors.push({
        code: 'INVALID_STATUTE_FORMAT',
        message: 'Citation does not match statute format: Art. [number] [paragraph] [statute]',
      });
    }
  }

  // If still no type detected and no errors, it's unrecognized
  if (!citationType && errors.length === 0) {
    errors.push({
      code: 'UNRECOGNIZED_FORMAT',
      message: 'Citation format not recognized. Supported formats: BGE/ATF/DTF, Art. [statute]',
    });
  }

  // Generate suggestions for errors
  const suggestions =
    errors.length > 0 ? generateSuggestions(input.citation, errors) : undefined;

  return {
    valid: errors.length === 0,
    citationType,
    errors,
    normalized,
    suggestions,
  };
}
