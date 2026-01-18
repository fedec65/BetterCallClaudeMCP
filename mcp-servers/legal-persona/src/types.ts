import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export const LanguageSchema = z.enum(['de', 'fr', 'it', 'en']);
export type Language = z.infer<typeof LanguageSchema>;

export const JurisdictionSchema = z.enum(['federal', 'cantonal']);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

export const CantonSchema = z.enum(['ZH', 'BE', 'GE', 'BS', 'VD', 'TI']);
export type Canton = z.infer<typeof CantonSchema>;

export const LegalAreaSchema = z.enum([
  'contract',
  'corporate',
  'employment',
  'tort',
  'property',
  'family',
  'succession',
  'intellectual_property',
  'competition',
  'banking',
  'tax',
  'administrative',
  'criminal',
]);
export type LegalArea = z.infer<typeof LegalAreaSchema>;

// ============================================================================
// legal_strategy Types
// ============================================================================

export const ClientPositionSchema = z.enum(['plaintiff', 'defendant', 'appellant', 'respondent']);
export type ClientPosition = z.infer<typeof ClientPositionSchema>;

export const LegalStrategyInputSchema = z.object({
  case_facts: z.string().min(1, 'Case facts are required'),
  jurisdiction: JurisdictionSchema.default('federal'),
  canton: CantonSchema.optional(),
  legal_area: LegalAreaSchema,
  client_position: ClientPositionSchema,
  dispute_amount: z.number().optional(),
  deadline_pressure: z.enum(['urgent', 'normal', 'flexible']).default('normal'),
  language: LanguageSchema.default('de'),
});
export type LegalStrategyInput = z.infer<typeof LegalStrategyInputSchema>;

export const StrengthWeaknessSchema = z.object({
  point: z.string(),
  explanation: z.string(),
  relevance: z.enum(['high', 'medium', 'low']),
});
export type StrengthWeakness = z.infer<typeof StrengthWeaknessSchema>;

export const RiskSchema = z.object({
  description: z.string(),
  probability: z.enum(['high', 'medium', 'low']),
  impact: z.enum(['high', 'medium', 'low']),
  mitigation: z.string(),
});
export type Risk = z.infer<typeof RiskSchema>;

export const NextStepSchema = z.object({
  action: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  deadline: z.string().optional(),
});
export type NextStep = z.infer<typeof NextStepSchema>;

export const LegalStrategyOutputSchema = z.object({
  assessment: z.object({
    strengths: z.array(StrengthWeaknessSchema),
    weaknesses: z.array(StrengthWeaknessSchema),
    successLikelihood: z.enum(['very_high', 'high', 'medium', 'low', 'very_low']),
    confidenceLevel: z.enum(['high', 'medium', 'low']),
  }),
  strategy: z.object({
    primaryApproach: z.string(),
    alternativeApproaches: z.array(z.string()),
    keyArguments: z.array(z.string()),
    relevantPrecedents: z.array(z.string()),
    statutoryBasis: z.array(z.string()),
  }),
  settlement: z.object({
    recommended: z.boolean(),
    rationale: z.string(),
    suggestedRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    negotiationLeverage: z.enum(['strong', 'moderate', 'weak']),
  }),
  procedural: z.object({
    recommendedVenue: z.string(),
    estimatedDuration: z.string(),
    estimatedCosts: z.object({
      courtFees: z.string(),
      legalFees: z.string(),
      otherCosts: z.string().optional(),
    }),
    appealOptions: z.array(z.string()),
  }),
  risks: z.array(RiskSchema),
  nextSteps: z.array(NextStepSchema),
  language: LanguageSchema,
});
export type LegalStrategyOutput = z.infer<typeof LegalStrategyOutputSchema>;

// ============================================================================
// legal_draft Types
// ============================================================================

export const DocumentTypeSchema = z.enum([
  // Contracts
  'service_agreement',
  'employment_contract',
  'nda',
  'shareholders_agreement',
  'loan_agreement',
  'lease_agreement',
  // Litigation documents
  'klageschrift',         // Statement of claim
  'klageantwort',         // Statement of defense
  'berufung',             // Appeal
  'beschwerde',           // Constitutional complaint
  'replik',               // Reply
  'duplik',               // Rejoinder
  // Legal opinions
  'rechtsgutachten',      // Legal opinion
  'memorandum',           // Legal memo
  'legal_brief',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocumentFormatSchema = z.enum(['full', 'outline', 'template']);
export type DocumentFormat = z.infer<typeof DocumentFormatSchema>;

export const PartySchema = z.object({
  name: z.string(),
  role: z.string(),
  address: z.string().optional(),
  representative: z.string().optional(),
});
export type Party = z.infer<typeof PartySchema>;

export const LegalDraftInputSchema = z.object({
  document_type: DocumentTypeSchema,
  context: z.string().min(1, 'Context is required'),
  parties: z.array(PartySchema).min(1, 'At least one party is required'),
  jurisdiction: JurisdictionSchema.default('federal'),
  canton: CantonSchema.optional(),
  language: LanguageSchema.default('de'),
  format: DocumentFormatSchema.default('full'),
  include_comments: z.boolean().default(false),
});
export type LegalDraftInput = z.infer<typeof LegalDraftInputSchema>;

// Base schema without recursion for type inference
const BaseDocumentSectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  comments: z.string().optional(),
});

// Recursive DocumentSection type
export interface DocumentSection {
  title: string;
  content: string;
  comments?: string;
  subsections?: DocumentSection[];
}

// Full schema with recursive subsections
export const DocumentSectionSchema: z.ZodType<DocumentSection> = BaseDocumentSectionSchema.extend({
  subsections: z.lazy(() => z.array(DocumentSectionSchema)).optional(),
});

export const LegalDraftOutputSchema = z.object({
  documentType: DocumentTypeSchema,
  title: z.string(),
  preamble: z.string().optional(),
  sections: z.array(DocumentSectionSchema),
  signatures: z.array(z.object({
    party: z.string(),
    signatureLine: z.string(),
    dateLine: z.string(),
  })).optional(),
  annexes: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).optional(),
  metadata: z.object({
    version: z.string(),
    generatedAt: z.string(),
    jurisdiction: JurisdictionSchema,
    canton: CantonSchema.optional(),
    language: LanguageSchema,
  }),
  warnings: z.array(z.string()).optional(),
});
export type LegalDraftOutput = z.infer<typeof LegalDraftOutputSchema>;

// ============================================================================
// legal_analyze Types
// ============================================================================

export const AnalysisDepthSchema = z.enum(['quick', 'standard', 'comprehensive']);
export type AnalysisDepth = z.infer<typeof AnalysisDepthSchema>;

export const FocusAreaSchema = z.enum([
  'liability',
  'termination',
  'payment',
  'ip',
  'confidentiality',
  'dispute',
  'compliance',
  'data_protection',
  'employment',
  'general',
]);
export type FocusArea = z.infer<typeof FocusAreaSchema>;

export const LegalAnalyzeInputSchema = z.object({
  document: z.string().min(1, 'Document content is required'),
  document_type: DocumentTypeSchema.optional(),
  analysis_depth: AnalysisDepthSchema.default('standard'),
  focus_areas: z.array(FocusAreaSchema).default(['general']),
  language: LanguageSchema.default('de'),
  check_compliance: z.boolean().default(true),
});
export type LegalAnalyzeInput = z.infer<typeof LegalAnalyzeInputSchema>;

export const IssueSeveritySchema = z.enum(['critical', 'major', 'minor', 'informational']);
export type IssueSeverity = z.infer<typeof IssueSeveritySchema>;

export const LegalIssueSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: IssueSeveritySchema,
  location: z.string().optional(),
  recommendation: z.string(),
  legalBasis: z.string().optional(),
});
export type LegalIssue = z.infer<typeof LegalIssueSchema>;

export const MissingClauseSchema = z.object({
  clause: z.string(),
  importance: z.enum(['required', 'recommended', 'optional']),
  rationale: z.string(),
  suggestedLanguage: z.string().optional(),
});
export type MissingClause = z.infer<typeof MissingClauseSchema>;

export const ComplianceCheckSchema = z.object({
  regulation: z.string(),
  status: z.enum(['compliant', 'non_compliant', 'partially_compliant', 'not_applicable']),
  details: z.string(),
  requiredActions: z.array(z.string()).optional(),
});
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

export const LegalAnalyzeOutputSchema = z.object({
  summary: z.object({
    documentType: z.string(),
    parties: z.array(z.string()),
    effectiveDate: z.string().optional(),
    keyTerms: z.array(z.string()),
    overallAssessment: z.enum(['acceptable', 'needs_revision', 'high_risk', 'unacceptable']),
  }),
  issues: z.array(LegalIssueSchema),
  missingClauses: z.array(MissingClauseSchema),
  compliance: z.array(ComplianceCheckSchema),
  recommendations: z.array(z.object({
    priority: z.enum(['high', 'medium', 'low']),
    action: z.string(),
    rationale: z.string(),
  })),
  metadata: z.object({
    analysisDepth: AnalysisDepthSchema,
    focusAreas: z.array(FocusAreaSchema),
    language: LanguageSchema,
    analyzedAt: z.string(),
  }),
});
export type LegalAnalyzeOutput = z.infer<typeof LegalAnalyzeOutputSchema>;
