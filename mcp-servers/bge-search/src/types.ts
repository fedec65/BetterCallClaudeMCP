import { z } from 'zod';

/**
 * BGE Section codes
 * I = Verfassungsrecht (Constitutional Law)
 * Ia = Internationales Recht, Grundrechte (International Law, Fundamental Rights)
 * II = Zivilrecht (Civil Law)
 * III = Schuld- und Sachenrecht (Obligations and Property)
 * IV = Sozialversicherungsrecht (Social Insurance)
 * V = Verwaltungsrecht (Administrative Law)
 * VI = Strafrecht (Criminal Law)
 */
export const BGESectionSchema = z.enum(['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI']);
export type BGESection = z.infer<typeof BGESectionSchema>;

/**
 * Supported languages for BGE decisions
 */
export const LanguageSchema = z.enum(['de', 'fr', 'it']);
export type Language = z.infer<typeof LanguageSchema>;

/**
 * Legal domains for BGE search filtering
 */
export const LegalDomainSchema = z.enum([
  'civil',
  'criminal',
  'administrative',
  'constitutional',
  'social',
  'tax',
]);
export type LegalDomain = z.infer<typeof LegalDomainSchema>;

/**
 * Input schema for bge-search:search tool
 */
export const SearchInputSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  volume: z.number().int().positive().optional(),
  section: BGESectionSchema.optional(),
  yearFrom: z.number().int().min(1875).max(2100).optional(),
  yearTo: z.number().int().min(1875).max(2100).optional(),
  legalDomain: LegalDomainSchema.optional(),
  language: LanguageSchema.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

/**
 * BGE citation pattern: BGE [volume] [section] [page]
 * Examples: "BGE 145 III 229", "ATF 140 II 315", "DTF 138 I 1"
 */
export const BGECitationSchema = z
  .string()
  .regex(
    /^(BGE|ATF|DTF)\s+\d+\s+(I|Ia|II|III|IV|V|VI)\s+\d+$/,
    'Invalid BGE citation format. Expected: "BGE [volume] [section] [page]" (e.g., "BGE 145 III 229")'
  );

/**
 * Input schema for bge-search:get_bge tool
 */
export const GetBGEInputSchema = z.object({
  citation: BGECitationSchema,
  includeConsiderations: z.boolean().default(true),
  language: LanguageSchema.optional(),
});
export type GetBGEInput = z.infer<typeof GetBGEInputSchema>;

/**
 * Search result item
 */
export interface SearchResultItem {
  citation: string;
  title: string;
  date: string;
  section: BGESection;
  volume: number;
  page: number;
  summary?: string;
  language: Language;
  url?: string;
}

/**
 * Search output
 */
export interface SearchOutput {
  query: string;
  filters: {
    volume?: number;
    section?: BGESection;
    yearFrom?: number;
    yearTo?: number;
    legalDomain?: LegalDomain;
    language?: Language;
  };
  results: SearchResultItem[];
  totalCount: number;
}

/**
 * Consideration (Erwägung) in a BGE decision
 */
export interface Consideration {
  number: string;
  title?: string;
  content: string;
}

/**
 * BGE document output
 */
export interface BGEDocumentOutput {
  citation: string;
  volume: number;
  section: BGESection;
  page: number;
  title: string;
  date: string;
  language: Language;
  regeste?: string;
  sachverhalt?: string;
  considerations?: Consideration[];
  dispositiv?: string;
  url?: string;
}
