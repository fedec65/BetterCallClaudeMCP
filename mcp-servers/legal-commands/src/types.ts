import { z } from 'zod';

// ============================================================================
// Common Types (shared across commands)
// ============================================================================

export const LanguageSchema = z.enum(['de', 'fr', 'it', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

export const JurisdictionSchema = z.enum(['federal', 'cantonal']);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

export const CantonSchema = z.enum(['ZH', 'BE', 'GE', 'BS', 'VD', 'TI']);
export type Canton = z.infer<typeof CantonSchema>;

// ============================================================================
// /legal:help Types
// ============================================================================

export const LegalHelpInputSchema = z.object({
  topic: z.string().optional().describe('Specific topic to get help on'),
  language: LanguageSchema.default('en').describe('Output language'),
});
export type LegalHelpInput = z.infer<typeof LegalHelpInputSchema>;

export const CommandHelpSchema = z.object({
  command: z.string(),
  description: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    description: z.string(),
  })),
  examples: z.array(z.string()),
});
export type CommandHelp = z.infer<typeof CommandHelpSchema>;

export const LegalHelpOutputSchema = z.object({
  version: z.string(),
  title: z.string(),
  description: z.string(),
  commands: z.array(CommandHelpSchema),
  agents: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  workflows: z.array(z.object({
    name: z.string(),
    description: z.string(),
    agents: z.array(z.string()),
  })),
  language: LanguageSchema,
});
export type LegalHelpOutput = z.infer<typeof LegalHelpOutputSchema>;

// ============================================================================
// /legal:version Types
// ============================================================================

export const LegalVersionInputSchema = z.object({
  format: z.enum(['simple', 'detailed']).default('simple').describe('Output format'),
});
export type LegalVersionInput = z.infer<typeof LegalVersionInputSchema>;

export const ServerInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  status: z.enum(['active', 'inactive', 'error']),
});
export type ServerInfo = z.infer<typeof ServerInfoSchema>;

export const LegalVersionOutputSchema = z.object({
  framework: z.string(),
  version: z.string(),
  buildDate: z.string(),
  servers: z.array(ServerInfoSchema),
  capabilities: z.array(z.string()),
});
export type LegalVersionOutput = z.infer<typeof LegalVersionOutputSchema>;

// ============================================================================
// /legal:federal Types
// ============================================================================

export const LegalFederalInputSchema = z.object({
  action: z.enum(['activate', 'status']).default('activate').describe('Action to perform'),
  language: LanguageSchema.default('de').describe('Output language'),
});
export type LegalFederalInput = z.infer<typeof LegalFederalInputSchema>;

export const LegalFederalOutputSchema = z.object({
  mode: z.literal('federal'),
  status: z.enum(['activated', 'already_active']),
  message: z.string(),
  applicableLaw: z.array(z.string()),
  primarySources: z.array(z.string()),
  language: LanguageSchema,
});
export type LegalFederalOutput = z.infer<typeof LegalFederalOutputSchema>;

// ============================================================================
// /legal:cantonal Types
// ============================================================================

export const LegalCantonalInputSchema = z.object({
  canton: CantonSchema.describe('Canton code to activate'),
  action: z.enum(['activate', 'status']).default('activate').describe('Action to perform'),
  language: LanguageSchema.default('de').describe('Output language'),
});
export type LegalCantonalInput = z.infer<typeof LegalCantonalInputSchema>;

export const LegalCantonalOutputSchema = z.object({
  mode: z.literal('cantonal'),
  canton: CantonSchema,
  cantonName: z.string(),
  status: z.enum(['activated', 'already_active']),
  message: z.string(),
  primaryLanguage: LanguageSchema,
  applicableLaw: z.array(z.string()),
  primarySources: z.array(z.string()),
  courtSystem: z.object({
    supreme: z.string(),
    firstInstance: z.string(),
    specialized: z.string().optional(),
  }),
  language: LanguageSchema,
});
export type LegalCantonalOutput = z.infer<typeof LegalCantonalOutputSchema>;

// ============================================================================
// /legal:routing Types
// ============================================================================

export const LegalRoutingInputSchema = z.object({
  action: z.enum(['status', 'configure']).default('status').describe('Action to perform'),
  defaultJurisdiction: JurisdictionSchema.optional().describe('Default jurisdiction'),
  defaultCanton: CantonSchema.optional().describe('Default canton for cantonal mode'),
  autoDetect: z.boolean().optional().describe('Enable auto-detection of jurisdiction'),
  language: LanguageSchema.default('de').describe('Output language'),
});
export type LegalRoutingInput = z.infer<typeof LegalRoutingInputSchema>;

export const LegalRoutingOutputSchema = z.object({
  currentConfig: z.object({
    defaultJurisdiction: JurisdictionSchema,
    defaultCanton: CantonSchema.optional(),
    autoDetect: z.boolean(),
  }),
  status: z.enum(['configured', 'unchanged']),
  message: z.string(),
  availableAgents: z.array(z.object({
    name: z.string(),
    domain: z.string(),
    status: z.enum(['active', 'inactive']),
  })),
  language: LanguageSchema,
});
export type LegalRoutingOutput = z.infer<typeof LegalRoutingOutputSchema>;

// ============================================================================
// /doc:analyze Types
// ============================================================================

export const DocumentTypeSchema = z.enum([
  'contract',
  'brief',
  'opinion',
  'correspondence',
  'court_decision',
  'statute',
  'unknown',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocAnalyzeInputSchema = z.object({
  content: z.string().describe('Document content to analyze'),
  documentType: DocumentTypeSchema.optional().describe('Type of document (auto-detected if not provided)'),
  focus: z.array(z.enum([
    'legal_issues',
    'contractual_clauses',
    'risks',
    'deadlines',
    'parties',
    'jurisdiction',
    'citations',
  ])).optional().describe('Specific areas to focus analysis on'),
  language: LanguageSchema.default('de').describe('Output language'),
});
export type DocAnalyzeInput = z.infer<typeof DocAnalyzeInputSchema>;

export const LegalIssueSchema = z.object({
  issue: z.string(),
  relevantLaw: z.array(z.string()),
  severity: z.enum(['high', 'medium', 'low']),
  recommendation: z.string().optional(),
});
export type LegalIssue = z.infer<typeof LegalIssueSchema>;

export const DocAnalyzeOutputSchema = z.object({
  documentType: DocumentTypeSchema,
  detectedLanguage: LanguageSchema,
  summary: z.string(),
  legalIssues: z.array(LegalIssueSchema),
  identifiedParties: z.array(z.object({
    name: z.string(),
    role: z.string(),
  })),
  keyDates: z.array(z.object({
    date: z.string(),
    description: z.string(),
    isDeadline: z.boolean(),
  })),
  citedLaw: z.array(z.object({
    citation: z.string(),
    context: z.string(),
  })),
  jurisdiction: z.object({
    detected: JurisdictionSchema,
    canton: CantonSchema.optional(),
    confidence: z.number().min(0).max(1),
  }),
  recommendations: z.array(z.string()),
  language: LanguageSchema,
});
export type DocAnalyzeOutput = z.infer<typeof DocAnalyzeOutputSchema>;

// ============================================================================
// /swiss:precedent Types
// ============================================================================

export const PrecedentSourceSchema = z.enum([
  'bge',           // Bundesgericht (Federal Supreme Court)
  'bvge',          // Bundesverwaltungsgericht (Federal Administrative Court)
  'cantonal',      // Cantonal courts
  'all',           // All sources
]);
export type PrecedentSource = z.infer<typeof PrecedentSourceSchema>;

export const SwissPrecedentInputSchema = z.object({
  query: z.string().describe('Search query for precedent analysis'),
  sources: z.array(PrecedentSourceSchema).default(['bge']).describe('Sources to search'),
  legalArea: z.string().optional().describe('Specific legal area (e.g., "contract law", "tort law")'),
  dateFrom: z.string().optional().describe('Start date for search (YYYY-MM-DD)'),
  dateTo: z.string().optional().describe('End date for search (YYYY-MM-DD)'),
  maxResults: z.number().min(1).max(50).default(10).describe('Maximum number of results'),
  language: LanguageSchema.default('de').describe('Output language'),
});
export type SwissPrecedentInput = z.infer<typeof SwissPrecedentInputSchema>;

export const PrecedentResultSchema = z.object({
  reference: z.string(),
  court: z.string(),
  date: z.string(),
  title: z.string(),
  summary: z.string(),
  relevance: z.number().min(0).max(1),
  legalPrinciples: z.array(z.string()),
  citedArticles: z.array(z.string()),
  url: z.string().optional(),
});
export type PrecedentResult = z.infer<typeof PrecedentResultSchema>;

export const SwissPrecedentOutputSchema = z.object({
  query: z.string(),
  totalResults: z.number(),
  results: z.array(PrecedentResultSchema),
  suggestedSearches: z.array(z.string()),
  analysisNotes: z.string().optional(),
  language: LanguageSchema,
});
export type SwissPrecedentOutput = z.infer<typeof SwissPrecedentOutputSchema>;
