/**
 * Legal Persona MCP Server Factory (HTTP)
 *
 * Extends the shared createLegalPersonaServer with:
 * - present_adversarial_analysis tool (W2 dashboard widget)
 * - MCP Apps resource handlers for the adversarial dashboard
 *
 * Backward compatible: non-MCP-Apps clients receive structured text fallback.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  LegalStrategyInputSchema,
  LegalDraftInputSchema,
  LegalAnalyzeInputSchema,
} from '@legal-persona/types.js';
import { legalStrategy } from '@legal-persona/tools/legal-strategy.js';
import { legalDraft } from '@legal-persona/tools/legal-draft.js';
import { legalAnalyze } from '@legal-persona/tools/legal-analyze.js';
import { adversarialDashboardHtml } from '../lib/embedded-widgets.js';

const SERVER_NAME = 'legal-persona';
const SERVER_VERSION = '1.1.0';

const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';
const WIDGET_URI = 'ui://legal-persona/adversarial-dashboard';

// --- Adversarial Analysis input schema (JSON Schema) ---

const presentAdversarialAnalysisSchema = {
  type: 'object' as const,
  properties: {
    advocate: {
      type: 'object' as const,
      description: 'Advocate perspective with arguments',
      properties: {
        summary: { type: 'string' as const, description: 'Advocate position summary' },
        arguments: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              thesis: { type: 'string' as const, description: 'Argument thesis' },
              legalBasis: { type: 'string' as const, description: 'Legal/statutory basis' },
              citedDecisions: { type: 'array' as const, items: { type: 'string' as const }, description: 'Cited court decisions' },
              strength: { type: 'string' as const, enum: ['high', 'medium', 'low'], description: 'Estimated strength' },
            },
            required: ['thesis', 'strength'] as const,
          },
        },
      },
      required: ['arguments'] as const,
    },
    adversary: {
      type: 'object' as const,
      description: 'Adversary perspective with arguments',
      properties: {
        summary: { type: 'string' as const, description: 'Adversary position summary' },
        arguments: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              thesis: { type: 'string' as const, description: 'Counter-argument thesis' },
              legalBasis: { type: 'string' as const, description: 'Legal/statutory basis' },
              citedDecisions: { type: 'array' as const, items: { type: 'string' as const }, description: 'Cited court decisions' },
              strength: { type: 'string' as const, enum: ['high', 'medium', 'low'], description: 'Estimated strength' },
            },
            required: ['thesis', 'strength'] as const,
          },
        },
      },
      required: ['arguments'] as const,
    },
    judicialSynthesis: {
      type: 'object' as const,
      description: 'Judicial synthesis with probability assessment',
      properties: {
        probabilityScore: { type: 'number' as const, minimum: 0, maximum: 100, description: 'Success probability (0-100)' },
        reasoning: { type: 'string' as const, description: 'Judicial reasoning' },
        keyFactors: { type: 'array' as const, items: { type: 'string' as const }, description: 'Key deciding factors' },
      },
      required: ['probabilityScore', 'reasoning'] as const,
    },
    language: {
      type: 'string' as const,
      enum: ['de', 'fr', 'it', 'en'],
      description: 'Display language (default: de)',
    },
    caseTitle: {
      type: 'string' as const,
      description: 'Case title for the dashboard header',
    },
  },
  required: ['advocate', 'adversary', 'judicialSynthesis'] as const,
};

// --- Text fallback for non-MCP-Apps clients ---

interface AdversarialArg {
  thesis: string;
  legalBasis?: string;
  citedDecisions?: string[];
  strength: string;
}

interface AdversarialPerspective {
  summary?: string;
  arguments: AdversarialArg[];
}

interface AdversarialInput {
  advocate: AdversarialPerspective;
  adversary: AdversarialPerspective;
  judicialSynthesis: {
    probabilityScore: number;
    reasoning: string;
    keyFactors?: string[];
  };
  language?: string;
  caseTitle?: string;
}

function formatTextFallback(input: AdversarialInput): string {
  const lines: string[] = [];
  if (input.caseTitle) lines.push(`# ${input.caseTitle}\n`);
  lines.push(`## Judicial Synthesis — ${input.judicialSynthesis.probabilityScore}% probability of success`);
  lines.push(input.judicialSynthesis.reasoning);
  if (input.judicialSynthesis.keyFactors?.length) {
    lines.push('\nKey factors:');
    for (const f of input.judicialSynthesis.keyFactors) lines.push(`  • ${f}`);
  }
  lines.push('\n## Advocate');
  if (input.advocate.summary) lines.push(input.advocate.summary);
  for (const a of input.advocate.arguments) {
    lines.push(`\n### [${a.strength.toUpperCase()}] ${a.thesis}`);
    if (a.legalBasis) lines.push(`  Legal basis: ${a.legalBasis}`);
    if (a.citedDecisions?.length) lines.push(`  Cited: ${a.citedDecisions.join(', ')}`);
  }
  lines.push('\n## Adversary');
  if (input.adversary.summary) lines.push(input.adversary.summary);
  for (const a of input.adversary.arguments) {
    lines.push(`\n### [${a.strength.toUpperCase()}] ${a.thesis}`);
    if (a.legalBasis) lines.push(`  Legal basis: ${a.legalBasis}`);
    if (a.citedDecisions?.length) lines.push(`  Cited: ${a.citedDecisions.join(', ')}`);
  }
  return lines.join('\n');
}

// --- Existing tools from base server ---

const baseTools: Tool[] = [
  {
    name: 'legal-persona:legal_strategy',
    description: `Develops comprehensive legal strategy for Swiss law cases.

Analyzes case facts and provides:
- Strength and weakness assessment
- Success likelihood evaluation
- Strategic approach recommendations
- Settlement analysis
- Procedural guidance
- Risk assessment
- Next steps

Supports federal and cantonal jurisdictions across all major Swiss legal areas.`,
    inputSchema: {
      type: 'object',
      properties: {
        case_facts: { type: 'string', description: 'Detailed description of the case facts' },
        jurisdiction: { type: 'string', enum: ['federal', 'cantonal'], description: 'Jurisdiction level (default: federal)', default: 'federal' },
        canton: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'], description: 'Canton for cantonal jurisdiction cases' },
        legal_area: { type: 'string', enum: ['contract', 'corporate', 'employment', 'tort', 'property', 'family', 'succession', 'intellectual_property', 'competition', 'banking', 'tax', 'administrative', 'criminal'], description: 'Area of law' },
        client_position: { type: 'string', enum: ['plaintiff', 'defendant', 'appellant', 'respondent'], description: "Client's position in the case" },
        dispute_amount: { type: 'number', description: 'Amount in dispute in CHF' },
        deadline_pressure: { type: 'string', enum: ['urgent', 'normal', 'flexible'], description: 'Timeline urgency (default: normal)', default: 'normal' },
        language: { type: 'string', enum: ['de', 'fr', 'it', 'en'], description: 'Output language (default: de)', default: 'de' },
      },
      required: ['case_facts', 'legal_area', 'client_position'],
    },
  },
  {
    name: 'legal-persona:legal_draft',
    description: `Drafts Swiss legal documents with proper structure and terminology.

Supports document types:
- Contracts: service_agreement, employment_contract, nda, shareholders_agreement, loan_agreement, lease_agreement
- Litigation: klageschrift, klageantwort, berufung, beschwerde, replik, duplik
- Opinions: rechtsgutachten, memorandum, legal_brief

Output formats:
- full: Complete document with all sections
- outline: Document structure with placeholders
- template: Reusable template with instructions`,
    inputSchema: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: ['service_agreement', 'employment_contract', 'nda', 'shareholders_agreement', 'loan_agreement', 'lease_agreement', 'klageschrift', 'klageantwort', 'berufung', 'beschwerde', 'replik', 'duplik', 'rechtsgutachten', 'memorandum', 'legal_brief'],
          description: 'Type of document to draft',
        },
        context: { type: 'string', description: 'Description of the situation and requirements' },
        parties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Party name' },
              role: { type: 'string', description: 'Party role' },
              address: { type: 'string', description: 'Party address' },
              representative: { type: 'string', description: 'Legal representative' },
            },
            required: ['name', 'role'],
          },
          description: 'Parties involved in the document',
        },
        jurisdiction: { type: 'string', enum: ['federal', 'cantonal'], description: 'Jurisdiction level (default: federal)', default: 'federal' },
        canton: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'], description: 'Canton for cantonal jurisdiction' },
        language: { type: 'string', enum: ['de', 'fr', 'it', 'en'], description: 'Output language (default: de)', default: 'de' },
        format: { type: 'string', enum: ['full', 'outline', 'template'], description: 'Output format (default: full)', default: 'full' },
        include_comments: { type: 'boolean', description: 'Include explanatory comments (default: false)', default: false },
      },
      required: ['document_type', 'context', 'parties'],
    },
  },
  {
    name: 'legal-persona:legal_analyze',
    description: `Analyzes legal documents for issues, risks, and compliance.

Analysis capabilities:
- Document type identification
- Party extraction
- Issue detection with severity levels
- Missing clause identification
- Compliance checking (OR, ZGB, DSG, etc.)
- Recommendations with priorities

Analysis depths:
- quick: Basic structure and obvious issues
- standard: Comprehensive clause-by-clause review
- comprehensive: Deep analysis with all compliance checks`,
    inputSchema: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'Full text of the document to analyze' },
        document_type: {
          type: 'string',
          enum: ['service_agreement', 'employment_contract', 'nda', 'shareholders_agreement', 'loan_agreement', 'lease_agreement', 'klageschrift', 'klageantwort', 'berufung', 'beschwerde', 'replik', 'duplik', 'rechtsgutachten', 'memorandum', 'legal_brief'],
          description: 'Expected document type (auto-detected if not specified)',
        },
        analysis_depth: { type: 'string', enum: ['quick', 'standard', 'comprehensive'], description: 'Depth of analysis (default: standard)', default: 'standard' },
        focus_areas: {
          type: 'array',
          items: { type: 'string', enum: ['liability', 'termination', 'payment', 'ip', 'confidentiality', 'dispute', 'compliance', 'data_protection', 'employment', 'general'] },
          description: 'Areas to focus on (default: ["general"])',
          default: ['general'],
        },
        language: { type: 'string', enum: ['de', 'fr', 'it', 'en'], description: 'Output language (default: de)', default: 'de' },
        check_compliance: { type: 'boolean', description: 'Run compliance checks (default: true)', default: true },
      },
      required: ['document'],
    },
  },
];

export function createLegalPersonaHttpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {} } }
  );

  // --- UI Resource handlers (MCP Apps) ---

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: WIDGET_URI,
        name: 'Adversarial Analysis Dashboard',
        description: 'Interactive three-column dashboard for adversarial legal analysis with expandable arguments and probability gauge.',
        mimeType: RESOURCE_MIME_TYPE,
      },
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === WIDGET_URI) {
      return {
        contents: [
          {
            uri: WIDGET_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: adversarialDashboardHtml,
          },
        ],
      };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  // --- Tool definitions ---

  const uiMeta = {
    ui: { resourceUri: WIDGET_URI },
    'ui/resourceUri': WIDGET_URI,
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...baseTools,
      {
        name: 'legal-persona:present_adversarial_analysis',
        description: `Present an adversarial analysis as an interactive dashboard.

Input: the synthesis produced by the adversarial-analysis skill (advocate/adversary perspectives + judicial synthesis with probability score).
Output: interactive dashboard widget (MCP Apps) or structured text fallback.

The dashboard shows three columns (Advocate / Adversary / Judge) with expandable arguments, cited decisions, and strength indicators.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: uiMeta,
        inputSchema: presentAdversarialAnalysisSchema,
      },
    ],
  }));

  // --- Tool call handler ---

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'legal-persona:legal_strategy': {
          const input = LegalStrategyInputSchema.parse(args);
          const result = legalStrategy(input);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'legal-persona:legal_draft': {
          const input = LegalDraftInputSchema.parse(args);
          const result = legalDraft(input);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'legal-persona:legal_analyze': {
          const input = LegalAnalyzeInputSchema.parse(args);
          const result = legalAnalyze(input);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'legal-persona:present_adversarial_analysis': {
          const input = args as unknown as AdversarialInput;
          const textFallback = formatTextFallback(input);
          return {
            content: [{ type: 'text', text: textFallback }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${errorMessage}` }], isError: true };
    }
  });

  return server;
}
