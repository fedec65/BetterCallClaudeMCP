import { z } from 'zod';
import {
  LanguageSchema,
  JurisdictionSchema,
  CantonSchema,
  LegalDomainSchema,
  SourceTypeSchema,
  CitationTypeSchema
} from './common.js';

// ============================================
// legal_gateway Tool Schemas
// ============================================

export const LegalGatewayInputSchema = z.object({
  query: z.string().min(1).max(5000).describe('User legal query or request'),
  context: z.string().max(10000).optional().describe('Additional context or background'),
  lang: LanguageSchema.optional().describe('Preferred language for response')
});
export type LegalGatewayInput = z.infer<typeof LegalGatewayInputSchema>;

export const LegalGatewayOutputSchema = z.object({
  detectedIntent: z.enum(['research', 'citation', 'strategy', 'draft', 'analyze']),
  detectedLanguage: LanguageSchema,
  detectedJurisdiction: JurisdictionSchema,
  detectedCanton: CantonSchema.optional(),
  detectedDomain: LegalDomainSchema.optional(),
  confidence: z.number().min(0).max(1),
  suggestedTool: z.string(),
  suggestedParameters: z.record(z.unknown()),
  reasoning: z.string()
});
export type LegalGatewayOutput = z.infer<typeof LegalGatewayOutputSchema>;

// ============================================
// legal_research Tool Schemas
// ============================================

export const LegalResearchInputSchema = z.object({
  query: z.string().min(1).max(2000).describe('Search query for legal research'),
  jurisdiction: JurisdictionSchema.optional().describe('Filter by federal or cantonal'),
  canton: CantonSchema.optional().describe('Specific canton for cantonal law'),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date (YYYY-MM-DD)'),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('End date (YYYY-MM-DD)'),
  sources: z.array(SourceTypeSchema).optional().describe('Filter by source types'),
  domain: LegalDomainSchema.optional().describe('Filter by legal domain'),
  maxResults: z.number().int().min(1).max(50).default(10).describe('Maximum results to return'),
  lang: LanguageSchema.optional().describe('Preferred language')
});
export type LegalResearchInput = z.infer<typeof LegalResearchInputSchema>;

export const ResearchResultSchema = z.object({
  citation: z.string(),
  title: z.string(),
  summary: z.string(),
  date: z.string(),
  court: z.string().optional(),
  chamber: z.string().optional(),
  relevanceScore: z.number().min(0).max(1),
  sourceUrl: z.string().url().optional(),
  language: LanguageSchema
});
export type ResearchResult = z.infer<typeof ResearchResultSchema>;

export const LegalResearchOutputSchema = z.object({
  results: z.array(ResearchResultSchema),
  totalResults: z.number().int().nonnegative(),
  query: z.string(),
  filters: z.object({
    jurisdiction: JurisdictionSchema.optional(),
    canton: CantonSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    domain: LegalDomainSchema.optional()
  }),
  suggestions: z.array(z.string()).optional()
});
export type LegalResearchOutput = z.infer<typeof LegalResearchOutputSchema>;

// ============================================
// legal_citation Tool Schemas
// ============================================

export const LegalCitationInputSchema = z.object({
  citation: z.string().min(1).max(500).describe('Citation to validate, format, or parse'),
  action: z.enum(['validate', 'format', 'parse']).describe('Action to perform'),
  targetLang: LanguageSchema.optional().describe('Target language for formatting'),
  strict: z.boolean().default(true).describe('Strict validation mode')
});
export type LegalCitationInput = z.infer<typeof LegalCitationInputSchema>;

export const ParsedCitationSchema = z.object({
  type: CitationTypeSchema,
  volume: z.number().optional(),
  section: z.string().optional(),
  page: z.number().optional(),
  consideration: z.string().optional(),
  article: z.number().optional(),
  paragraph: z.number().optional(),
  letter: z.string().optional(),
  statute: z.string().optional(),
  year: z.number().optional(),
  author: z.string().optional(),
  title: z.string().optional()
});
export type ParsedCitation = z.infer<typeof ParsedCitationSchema>;

export const LegalCitationOutputSchema = z.object({
  valid: z.boolean(),
  normalized: z.string(),
  parsed: ParsedCitationSchema.optional(),
  formatted: z.record(LanguageSchema, z.string()).optional(),
  errors: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional()
});
export type LegalCitationOutput = z.infer<typeof LegalCitationOutputSchema>;

// ============================================
// legal_strategy Tool Schemas
// ============================================

export const LegalStrategyInputSchema = z.object({
  caseDescription: z.string().min(10).max(10000).describe('Description of the legal case'),
  clientPosition: z.enum(['plaintiff', 'defendant', 'appellant', 'respondent']).describe('Client role'),
  jurisdiction: JurisdictionSchema.optional(),
  canton: CantonSchema.optional(),
  domain: LegalDomainSchema.optional(),
  objectives: z.array(z.string()).optional().describe('Client objectives'),
  constraints: z.array(z.string()).optional().describe('Budget, time, or other constraints'),
  lang: LanguageSchema.optional()
});
export type LegalStrategyInput = z.infer<typeof LegalStrategyInputSchema>;

export const StrategicOptionSchema = z.object({
  name: z.string(),
  description: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  estimatedSuccessRate: z.number().min(0).max(1),
  timeframe: z.string(),
  costLevel: z.enum(['low', 'medium', 'high']),
  risks: z.array(z.string())
});
export type StrategicOption = z.infer<typeof StrategicOptionSchema>;

export const LegalStrategyOutputSchema = z.object({
  caseAssessment: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string())
  }),
  overallSuccessLikelihood: z.number().min(0).max(1),
  strategicOptions: z.array(StrategicOptionSchema),
  recommendedApproach: z.string(),
  keyPrecedents: z.array(z.string()),
  proceduralConsiderations: z.array(z.string()),
  settlementAnalysis: z.object({
    advisable: z.boolean(),
    estimatedValue: z.string().optional(),
    timing: z.string().optional()
  }).optional(),
  disclaimer: z.string()
});
export type LegalStrategyOutput = z.infer<typeof LegalStrategyOutputSchema>;

// ============================================
// legal_draft Tool Schemas
// ============================================

export const LegalDraftInputSchema = z.object({
  documentType: z.enum([
    'contract',
    'brief',
    'motion',
    'opinion',
    'memorandum',
    'letter',
    'agreement',
    'complaint',
    'response'
  ]).describe('Type of legal document'),
  subject: z.string().min(1).max(500).describe('Subject or title of document'),
  content: z.string().max(20000).optional().describe('Content or instructions for drafting'),
  parties: z.array(z.object({
    name: z.string(),
    role: z.string(),
    address: z.string().optional()
  })).optional(),
  jurisdiction: JurisdictionSchema.optional(),
  canton: CantonSchema.optional(),
  lang: LanguageSchema.optional(),
  formality: z.enum(['formal', 'standard', 'informal']).default('formal'),
  includeBoilerplate: z.boolean().default(true)
});
export type LegalDraftInput = z.infer<typeof LegalDraftInputSchema>;

export const LegalDraftOutputSchema = z.object({
  document: z.string(),
  documentType: z.string(),
  title: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string()
  })),
  citations: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  reviewNotes: z.array(z.string()).optional()
});
export type LegalDraftOutput = z.infer<typeof LegalDraftOutputSchema>;

// ============================================
// legal_analyze Tool Schemas
// ============================================

export const LegalAnalyzeInputSchema = z.object({
  document: z.string().min(1).max(50000).describe('Document text to analyze'),
  analysisType: z.enum([
    'issues',
    'risks',
    'compliance',
    'summary',
    'full'
  ]).default('full').describe('Type of analysis'),
  domain: LegalDomainSchema.optional(),
  jurisdiction: JurisdictionSchema.optional(),
  canton: CantonSchema.optional(),
  lang: LanguageSchema.optional(),
  focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on')
});
export type LegalAnalyzeInput = z.infer<typeof LegalAnalyzeInputSchema>;

export const LegalIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  relevantLaw: z.array(z.string()),
  recommendation: z.string()
});
export type LegalIssue = z.infer<typeof LegalIssueSchema>;

export const LegalAnalyzeOutputSchema = z.object({
  summary: z.string(),
  documentType: z.string(),
  detectedLanguage: LanguageSchema,
  issues: z.array(LegalIssueSchema),
  risks: z.array(z.object({
    risk: z.string(),
    likelihood: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high']),
    mitigation: z.string()
  })),
  complianceStatus: z.object({
    compliant: z.boolean(),
    areas: z.array(z.object({
      area: z.string(),
      status: z.enum(['compliant', 'non-compliant', 'needs-review']),
      notes: z.string()
    }))
  }).optional(),
  recommendations: z.array(z.string()),
  citations: z.array(z.string())
});
export type LegalAnalyzeOutput = z.infer<typeof LegalAnalyzeOutputSchema>;
