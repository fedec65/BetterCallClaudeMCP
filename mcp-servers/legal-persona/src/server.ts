/**
 * Legal Persona MCP Server factory.
 *
 * Exported so the server can be wired into either a stdio transport
 * (see ./index.ts) or an HTTP transport (mcp-servers-http aggregator).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
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

export const SERVER_NAME = 'legal-persona';
export const SERVER_VERSION = '1.0.0';

export const tools: Tool[] = [
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
          description: "Client's position in the case",
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
- template: Reusable template with instructions`,
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
- comprehensive: Deep analysis with all compliance checks`,
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
 * Factory: build a fully-configured legal-persona MCP Server.
 *
 * Transport-agnostic — connect the returned Server to either
 * StdioServerTransport or StreamableHTTPServerTransport.
 */
export function createLegalPersonaServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

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
