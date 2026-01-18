#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  LegalStrategyInputSchema,
  LegalDraftInputSchema,
  LegalAnalyzeInputSchema,
} from './types.js';
import { legalStrategy } from './tools/legal-strategy.js';
import { legalDraft } from './tools/legal-draft.js';
import { legalAnalyze } from './tools/legal-analyze.js';

const SERVER_NAME = 'legal-persona';
const SERVER_VERSION = '1.0.0';

/**
 * Tool definitions for the legal-persona MCP server
 */
const tools: Tool[] = [
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

Supports federal and cantonal jurisdictions across all major Swiss legal areas.

Parameters:
- case_facts: Detailed description of the case (required)
- jurisdiction: 'federal' or 'cantonal' (default: federal)
- canton: ZH, BE, GE, BS, VD, TI (optional, for cantonal cases)
- legal_area: contract, corporate, employment, tort, property, etc. (required)
- client_position: plaintiff, defendant, appellant, respondent (required)
- dispute_amount: Financial value in CHF (optional)
- deadline_pressure: urgent, normal, flexible (default: normal)
- language: de, fr, it, en (default: de)

Example:
{
  "case_facts": "Client ordered machinery for CHF 500,000. Delivered late by 3 months causing production delays.",
  "legal_area": "contract",
  "client_position": "plaintiff",
  "dispute_amount": 150000,
  "language": "de"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        case_facts: {
          type: 'string',
          description: 'Detailed description of the case facts',
        },
        jurisdiction: {
          type: 'string',
          enum: ['federal', 'cantonal'],
          description: 'Jurisdiction level (default: federal)',
          default: 'federal',
        },
        canton: {
          type: 'string',
          enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'],
          description: 'Canton for cantonal jurisdiction cases',
        },
        legal_area: {
          type: 'string',
          enum: [
            'contract', 'corporate', 'employment', 'tort', 'property',
            'family', 'succession', 'intellectual_property', 'competition',
            'banking', 'tax', 'administrative', 'criminal',
          ],
          description: 'Area of law',
        },
        client_position: {
          type: 'string',
          enum: ['plaintiff', 'defendant', 'appellant', 'respondent'],
          description: 'Client\'s position in the case',
        },
        dispute_amount: {
          type: 'number',
          description: 'Amount in dispute in CHF',
        },
        deadline_pressure: {
          type: 'string',
          enum: ['urgent', 'normal', 'flexible'],
          description: 'Timeline urgency (default: normal)',
          default: 'normal',
        },
        language: {
          type: 'string',
          enum: ['de', 'fr', 'it', 'en'],
          description: 'Output language (default: de)',
          default: 'de',
        },
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
- template: Reusable template with instructions

Parameters:
- document_type: Type of document to draft (required)
- context: Description of the situation/requirements (required)
- parties: Array of party objects with name and role (required)
- jurisdiction: 'federal' or 'cantonal' (default: federal)
- canton: ZH, BE, GE, BS, VD, TI (optional)
- language: de, fr, it, en (default: de)
- format: full, outline, template (default: full)
- include_comments: Add explanatory comments (default: false)

Example:
{
  "document_type": "service_agreement",
  "context": "IT consulting services for 12 months at CHF 200/hour",
  "parties": [
    {"name": "TechCorp AG", "role": "Auftraggeber"},
    {"name": "ConsultCo GmbH", "role": "Auftragnehmer"}
  ],
  "language": "de"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: [
            'service_agreement', 'employment_contract', 'nda',
            'shareholders_agreement', 'loan_agreement', 'lease_agreement',
            'klageschrift', 'klageantwort', 'berufung', 'beschwerde',
            'replik', 'duplik', 'rechtsgutachten', 'memorandum', 'legal_brief',
          ],
          description: 'Type of document to draft',
        },
        context: {
          type: 'string',
          description: 'Description of the situation and requirements',
        },
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
        jurisdiction: {
          type: 'string',
          enum: ['federal', 'cantonal'],
          description: 'Jurisdiction level (default: federal)',
          default: 'federal',
        },
        canton: {
          type: 'string',
          enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'],
          description: 'Canton for cantonal jurisdiction',
        },
        language: {
          type: 'string',
          enum: ['de', 'fr', 'it', 'en'],
          description: 'Output language (default: de)',
          default: 'de',
        },
        format: {
          type: 'string',
          enum: ['full', 'outline', 'template'],
          description: 'Output format (default: full)',
          default: 'full',
        },
        include_comments: {
          type: 'boolean',
          description: 'Include explanatory comments (default: false)',
          default: false,
        },
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
- comprehensive: Deep analysis with all compliance checks

Focus areas: liability, termination, payment, ip, confidentiality, dispute, compliance, data_protection, employment, general

Parameters:
- document: Full text of the document to analyze (required)
- document_type: Expected document type (optional, auto-detected)
- analysis_depth: quick, standard, comprehensive (default: standard)
- focus_areas: Array of areas to focus on (default: ['general'])
- language: de, fr, it, en (default: de)
- check_compliance: Run compliance checks (default: true)

Example:
{
  "document": "DIENSTLEISTUNGSVERTRAG\\n\\nzwischen...",
  "analysis_depth": "comprehensive",
  "focus_areas": ["liability", "termination", "payment"],
  "language": "de"
}`,
    inputSchema: {
      type: 'object',
      properties: {
        document: {
          type: 'string',
          description: 'Full text of the document to analyze',
        },
        document_type: {
          type: 'string',
          enum: [
            'service_agreement', 'employment_contract', 'nda',
            'shareholders_agreement', 'loan_agreement', 'lease_agreement',
            'klageschrift', 'klageantwort', 'berufung', 'beschwerde',
            'replik', 'duplik', 'rechtsgutachten', 'memorandum', 'legal_brief',
          ],
          description: 'Expected document type (auto-detected if not specified)',
        },
        analysis_depth: {
          type: 'string',
          enum: ['quick', 'standard', 'comprehensive'],
          description: 'Depth of analysis (default: standard)',
          default: 'standard',
        },
        focus_areas: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'liability', 'termination', 'payment', 'ip', 'confidentiality',
              'dispute', 'compliance', 'data_protection', 'employment', 'general',
            ],
          },
          description: 'Areas to focus on (default: ["general"])',
          default: ['general'],
        },
        language: {
          type: 'string',
          enum: ['de', 'fr', 'it', 'en'],
          description: 'Output language (default: de)',
          default: 'de',
        },
        check_compliance: {
          type: 'boolean',
          description: 'Run compliance checks (default: true)',
          default: true,
        },
      },
      required: ['document'],
    },
  },
];

/**
 * Creates and configures the MCP server
 */
function createServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  // Handle tool listing requests
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Handle tool call requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'legal-persona:legal_strategy': {
          const input = LegalStrategyInputSchema.parse(args);
          const result = legalStrategy(input);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'legal-persona:legal_draft': {
          const input = LegalDraftInputSchema.parse(args);
          const result = legalDraft(input);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'legal-persona:legal_analyze': {
          const input = LegalAnalyzeInputSchema.parse(args);
          const result = legalAnalyze(input);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${errorMessage}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
