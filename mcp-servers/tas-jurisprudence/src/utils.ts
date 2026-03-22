/**
 * TAS/CAS Jurisprudence MCP Server - Utility Functions
 * Case number parsing, delays, and helper functions
 */

import { CAS_CONSTANTS, ParsedCaseNumber } from './types.js';

/**
 * Normalize case number to standard format
 * Input formats: "CAS 2023/A/9876", "2023/A/9876", "CAS 2023 A 9876", "2023/ADD/62"
 * Output format: "CAS 2023/A/9876"
 * Note: ADD (Anti-Doping) is normalized to AD
 */
export function normalizeCaseNumber(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Case number is required');
  }

  // Remove extra whitespace
  let normalized = input.trim().toUpperCase();

  // Remove "CAS" prefix if present (will be added back)
  normalized = normalized.replace(/^CAS\s*/i, '');

  // Replace various separators with standard format
  // "2023/A/9876" or "2023 A 9876" or "2023-A-9876"
  // Accept: A (Appeal), O (Ordinary), AD/ADD (Anti-Doping), G (Advisory), M (Mediation)
  const match = normalized.match(/(\d{4})\s*[-\/\s]?\s*([AO]|AD|ADD|G|M)\s*[-\/\s]?\s*(\d+)/i);

  if (!match) {
    throw new Error(`Invalid case number format: ${input}. Expected format: "CAS 2023/A/9876" or "2023/A/9876"`);
  }

  const [, year, type, number] = match;
  // Normalize ADD to AD for consistency
  const normalizedType = type.toUpperCase() === 'ADD' ? 'AD' : type.toUpperCase();
  return `CAS ${year}/${normalizedType}/${number}`;
}

/**
 * Parse case number into components
 * "CAS 2023/A/9876" → { year: 2023, type: "A", number: 9876, full_number: "CAS 2023/A/9876" }
 */
export function parseCaseNumber(caseNumber: string): ParsedCaseNumber {
  const normalized = normalizeCaseNumber(caseNumber);

  const match = normalized.match(/CAS (\d{4})\/([AO]|AD|G|M)\/(\d+)/i);

  if (!match) {
    throw new Error(`Failed to parse case number: ${caseNumber}`);
  }

  return {
    year: parseInt(match[1], 10),
    type: match[2].toUpperCase() as 'A' | 'O' | 'AD' | 'G' | 'M',
    number: parseInt(match[3], 10),
    full_number: normalized
  };
}

/**
 * Generate PDF URL from case number
 * Format: https://www.tas-cas.org/files/decision/CAS-{year}-{type}-{number}.pdf
 */
export function generatePdfUrl(caseNumber: string): string {
  const parsed = parseCaseNumber(caseNumber);
  return `${CAS_CONSTANTS.PDF_BASE_URL}/CAS-${parsed.year}-${parsed.type}-${parsed.number}.pdf`;
}

/**
 * Extract PDF URL from HTML content
 */
export function extractPdfUrl(html: string): string | null {
  // Look for PDF links in various formats
  const patterns = [
    /href="([^"]+\.pdf)"/gi,
    /src="([^"]+\.pdf)"/gi,
    /location\.href=['"]([^'"]+\.pdf)['"]/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      // Convert relative URL to absolute
      let url = match[1];
      if (url.startsWith('/')) {
        url = `https://www.tas-cas.org${url}`;
      } else if (!url.startsWith('http')) {
        url = `https://www.tas-cas.org/${url}`;
      }
      return url;
    }
  }

  return null;
}

/**
 * Promise-based delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate cache key from prefix and parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');

  return `${prefix}:${sortedParams}`;
}

/**
 * Check if a URL is a valid CAS URL
 */
export function isValidCasUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('tas-cas.org') ||
      parsed.hostname === 'jurisprudence.tas-cas.org'
    );
  } catch {
    return false;
  }
}

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '\n')
    .trim();
}

/**
 * Extract year from date string (various formats)
 */
export function extractYear(dateStr: string): number | null {
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Map procedure type code to full name
 */
export function getProcedureTypeName(code: string): string {
  const mapping: Record<string, string> = {
    'A': 'Appeal',
    'O': 'Ordinary',
    'AD': 'Anti-Doping',
    'G': 'Advisory',
    'M': 'Mediation'
  };
  return mapping[code.toUpperCase()] || code;
}

/**
 * Map procedure type name to code
 */
export function getProcedureTypeCode(name: string): string {
  const mapping: Record<string, string> = {
    'appeal': 'A',
    'ordinary': 'O',
    'anti-doping': 'AD',
    'antidoping': 'AD',
    'advisory': 'G',
    'mediation': 'M'
  };
  return mapping[name.toLowerCase()] || name;
}

/**
 * Sanitize search query for URL
 */
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 200); // Limit query length
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        const backoffMs = initialDelayMs * Math.pow(2, i);
        await delay(backoffMs);
      }
    }
  }

  throw lastError;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Parse CAS date format (e.g., "15 January 2023")
 */
export function parseCasDate(dateStr: string): Date | null {
  try {
    // Try parsing various date formats
    const formats = [
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
      /(\d{4})-(\d{2})-(\d{2})/,
      /(\d{2})\.(\d{2})\.(\d{4})/
    ];

    for (const pattern of formats) {
      const match = dateStr.match(pattern);
      if (match) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}
