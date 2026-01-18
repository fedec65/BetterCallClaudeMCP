import { z } from 'zod';

// Swiss court codes
export const SWISS_COURTS = [
  'BGer', // Bundesgericht (Federal Supreme Court)
  'BVGer', // Bundesverwaltungsgericht (Federal Administrative Court)
  'BStGer', // Bundesstrafgericht (Federal Criminal Court)
  'BPatGer', // Bundespatentgericht (Federal Patent Court)
  // Cantonal courts
  'ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR',
  'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG',
  'TI', 'VD', 'VS', 'NE', 'GE', 'JU',
] as const;

export type SwissCourt = (typeof SWISS_COURTS)[number];

// Legal domains
export const LEGAL_DOMAINS = [
  'civil', // Zivilrecht
  'criminal', // Strafrecht
  'administrative', // Verwaltungsrecht
  'constitutional', // Verfassungsrecht
  'social', // Sozialversicherungsrecht
  'tax', // Steuerrecht
] as const;

export type LegalDomain = (typeof LEGAL_DOMAINS)[number];

// Languages
export const LANGUAGES = ['de', 'fr', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

// Search input schema
export const SearchInputSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  courts: z.array(z.enum(SWISS_COURTS as unknown as [string, ...string[]])).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format').optional(),
  canton: z.string().length(2).optional(),
  legalDomain: z.enum(LEGAL_DOMAINS as unknown as [string, ...string[]]).optional(),
  language: z.enum(LANGUAGES as unknown as [string, ...string[]]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type SearchInput = z.infer<typeof SearchInputSchema>;

// Search result item
export interface SearchResultItem {
  id: string;
  title: string;
  court: string;
  date: string;
  reference: string;
  summary?: string;
  legalDomain?: string;
  language: Language;
  url?: string;
}

// Search output
export interface SearchOutput {
  results: SearchResultItem[];
  totalCount: number;
  query: string;
  filters: {
    courts?: string[];
    dateFrom?: string;
    dateTo?: string;
    canton?: string;
    legalDomain?: string;
    language?: string;
  };
}

// Get document input schema
export const GetDocumentInputSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  format: z.enum(['full', 'summary', 'citations']).default('full'),
});

export type GetDocumentInput = z.infer<typeof GetDocumentInputSchema>;

// Citation reference in a document
export interface CitationReference {
  citation: string;
  type: 'bge' | 'statute' | 'other';
  context?: string;
}

// Document output
export interface DocumentOutput {
  id: string;
  title: string;
  court: string;
  date: string;
  reference: string;
  language: Language;
  content: string;
  summary?: string;
  citations?: CitationReference[];
  metadata: {
    legalDomain?: string;
    judges?: string[];
    parties?: string;
    procedureType?: string;
  };
  url?: string;
}
