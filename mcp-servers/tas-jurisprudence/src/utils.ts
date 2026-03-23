/**
 * TAS/CAS Jurisprudence MCP Server - Utility Functions
 * Helpers for case number parsing, normalization, and general utilities
 */

import type { ParsedCaseNumber } from './types.js';

/**
 * Normalize a CAS case number to standard format
 * Input formats accepted:
 * - "CAS 2023/A/9876"
 * - "2023/A/9876"
 * - "TAS 2023/A/9876"
 * - "cas 2023 a 9876"
 *
 * Output format: "CAS YYYY/T/NNNN"
 */
export function normalizeCaseNumber(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid case number: input must be a non-empty string');
  }

  // Clean and uppercase
  let cleaned = input.trim().toUpperCase();

  // Remove CAS/TAS prefix if present
  cleaned = cleaned.replace(/^(CAS|TAS)\s*/i, '');

  // Normalize separators - handle various formats like "2023/A/9876", "2023 A 9876", "2023-A-9876"
  cleaned = cleaned.replace(/[\s\-_]/g, '/');

  // Extract components using regex
  // Format: YYYY/T/NNNN or YYYY/TT/NNNN (where T is type, TT can be AD for Anti-Doping)
  const match = cleaned.match(/^(\d{4})\/?([AO]|AD|ADV)\/?(\d+)$/i);

  if (!match) {
    throw new Error(`Invalid case number format: "${input}". Expected format: YYYY/T/NNNN (e.g., 2023/A/9876)`);
  }

  const [, year, type, number] = match;

  // Validate type
  const validTypes = ['A', 'O', 'AD', 'ADV'] as const;
  const normalizedType = type.toUpperCase();

  if (!validTypes.includes(normalizedType as typeof validTypes[number])) {
    throw new Error(`Invalid case type: "${type}". Must be A (Appeal), O (Ordinary), AD (Anti-Doping), or ADV (Advisory)`);
  }

  // Pad number to at least 4 digits
  const paddedNumber = number.padStart(4, '0');

  return `CAS ${year}/${normalizedType}/${paddedNumber}`;
}

/**
 * Parse a CAS case number into its components
 */
export function parseCaseNumber(caseNumber: string): ParsedCaseNumber {
  const normalized = normalizeCaseNumber(caseNumber);

  // Extract from normalized format "CAS YYYY/T/NNNN"
  const match = normalized.match(/^CAS (\d{4})\/([AO]|AD|ADV)\/(\d+)$/);

  if (!match) {
    throw new Error(`Failed to parse normalized case number: ${normalized}`);
  }

  const [, yearStr, typeStr, numberStr] = match;

  const typeMap: Record<string, 'A' | 'O' | 'AD' | 'ADV'> = {
    'A': 'A',
    'O': 'O',
    'AD': 'AD',
    'ADV': 'ADV'
  };

  return {
    year: parseInt(yearStr, 10),
    type: typeMap[typeStr],
    number: parseInt(numberStr, 10),
    original: caseNumber,
    normalized
  };
}

/**
 * Generate PDF URL from case number
 * Format: https://www.tas-cas.org/files/decision/CAS-YYYY-T-NNNN.pdf
 */
export function generatePdfUrl(caseNumber: string): string {
  const parsed = parseCaseNumber(caseNumber);
  const paddedNumber = String(parsed.number).padStart(4, '0');
  return `https://www.tas-cas.org/files/decision/CAS-${parsed.year}-${parsed.type}-${paddedNumber}.pdf`;
}

/**
 * Extract PDF URL from HTML content
 */
export function extractPdfUrl(html: string): string | null {
  // Look for PDF links in the HTML
  const patterns = [
    /href="([^"]+\.pdf)"/i,
    /href='([^']+\.pdf)'/i,
    /"(https?:\/\/[^"]+\.pdf)"/i,
    /'(https?:\/\/[^']+\.pdf)'/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Delay execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a cache key from prefix and parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${prefix}:${sortedParams}`;
}

/**
 * Safely truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Clean and normalize text content (remove extra whitespace, etc.)
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Extract year from date string
 */
export function extractYearFromDate(dateStr: string): number | null {
  if (!dateStr) return null;

  // Try to extract 4-digit year
  const match = dateStr.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Format date to ISO format (YYYY-MM-DD)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';

  // Handle various date formats
  const datePatterns = [
    /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i  // DD Month YYYY
  ];

  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Return original if no pattern matched
  return dateStr;
}

/**
 * Check if a URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}
