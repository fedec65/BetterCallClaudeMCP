import { z } from 'zod';

// Supported languages
export const LanguageSchema = z.enum(['de', 'fr', 'it', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

// Supported jurisdictions
export const JurisdictionSchema = z.enum(['federal', 'cantonal']);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

// Supported cantons (v1.0 scope)
export const CantonSchema = z.enum(['ZH', 'BE', 'GE', 'BS', 'VD', 'TI']);
export type Canton = z.infer<typeof CantonSchema>;

// Legal domains
export const LegalDomainSchema = z.enum([
  'civil',
  'criminal',
  'administrative',
  'commercial',
  'employment',
  'family',
  'corporate',
  'tax',
  'property',
  'international'
]);
export type LegalDomain = z.infer<typeof LegalDomainSchema>;

// Source types for research
export const SourceTypeSchema = z.enum([
  'statute',
  'precedent',
  'doctrine',
  'commentary'
]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

// Citation types
export const CitationTypeSchema = z.enum([
  'bge',      // Federal Supreme Court
  'statute',  // Statutory reference
  'doctrine'  // Academic/Commentary
]);
export type CitationType = z.infer<typeof CitationTypeSchema>;

// Error codes as per specification
export const ErrorCodeSchema = z.enum([
  'INVALID_INPUT',
  'INVALID_CITATION',
  'JURISDICTION_UNSUPPORTED',
  'QUERY_TOO_BROAD',
  'RATE_LIMIT_EXCEEDED',
  'API_TIMEOUT',
  'API_UNAVAILABLE',
  'INTERNAL_ERROR'
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

// Standard metadata for all responses
export const ResponseMetadataSchema = z.object({
  requestId: z.string().uuid(),
  timestamp: z.string().datetime(),
  tool: z.string(),
  cached: z.boolean(),
  language: LanguageSchema,
  jurisdiction: JurisdictionSchema.optional(),
  canton: CantonSchema.optional(),
  processingTime: z.number().int().positive()
});
export type ResponseMetadata = z.infer<typeof ResponseMetadataSchema>;

// Standard error response
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    retryAfter: z.number().optional(),
    retryable: z.boolean(),
    details: z.record(z.unknown()).optional()
  }),
  metadata: ResponseMetadataSchema
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Standard success response wrapper
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    metadata: ResponseMetadataSchema
  });
}

// Multi-lingual citation mapping
export const CITATION_LANGUAGE_MAP = {
  bge: { de: 'BGE', fr: 'ATF', it: 'DTF' },
  article: { de: 'Art.', fr: 'art.', it: 'art.' },
  paragraph: { de: 'Abs.', fr: 'al.', it: 'cpv.' },
  letter: { de: 'lit.', fr: 'let.', it: 'lett.' },
  number: { de: 'Ziff.', fr: 'ch.', it: 'n.' },
  consideration: { de: 'E.', fr: 'consid.', it: 'consid.' }
} as const;

// Statute abbreviations in different languages
export const STATUTE_ABBREVIATIONS = {
  civilCode: { de: 'ZGB', fr: 'CC', it: 'CC' },
  codeOfObligations: { de: 'OR', fr: 'CO', it: 'CO' },
  criminalCode: { de: 'StGB', fr: 'CP', it: 'CP' },
  civilProcedure: { de: 'ZPO', fr: 'CPC', it: 'CPC' },
  criminalProcedure: { de: 'StPO', fr: 'CPP', it: 'CPP' },
  constitution: { de: 'BV', fr: 'Cst.', it: 'Cost.' }
} as const;

// Canton primary languages
export const CANTON_LANGUAGES: Record<Canton, Language> = {
  ZH: 'de',
  BE: 'de', // Bilingual, but German primary
  GE: 'fr',
  BS: 'de',
  VD: 'fr',
  TI: 'it'
};

// Canton full names
export const CANTON_NAMES: Record<Canton, Record<Language, string>> = {
  ZH: { de: 'Zürich', fr: 'Zurich', it: 'Zurigo', en: 'Zurich' },
  BE: { de: 'Bern', fr: 'Berne', it: 'Berna', en: 'Bern' },
  GE: { de: 'Genf', fr: 'Genève', it: 'Ginevra', en: 'Geneva' },
  BS: { de: 'Basel-Stadt', fr: 'Bâle-Ville', it: 'Basilea Città', en: 'Basel-City' },
  VD: { de: 'Waadt', fr: 'Vaud', it: 'Vaud', en: 'Vaud' },
  TI: { de: 'Tessin', fr: 'Tessin', it: 'Ticino', en: 'Ticino' }
};
