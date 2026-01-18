#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  ValidateCitationInputSchema,
  ParseCitationInputSchema,
  FormatCitationInputSchema,
  ConvertCitationInputSchema,
} from './types.js';
import { validateCitation } from './tools/validate-citation.js';
import { parseCitation } from './tools/parse-citation.js';
import { formatCitation } from './tools/format-citation.js';
import { convertCitation } from './tools/convert-citation.js';

const SERVER_NAME = 'legal-citations';
const SERVER_VERSION = '1.0.0';

/**
 * Tool definitions for the legal-citations MCP server
 */
const tools: Tool[] = [
  {
    name: 'legal-citations:validate_citation',
    description: `Validates Swiss legal citations for correctness and completeness.

Supports:
- BGE/ATF/DTF citations (Federal Supreme Court decisions)
- Statute citations (Art. X OR/CO, Art. Y ZGB/CC, etc.)
- Doctrine citations (author references)

Returns validation result with errors, warnings, and suggestions.

Examples:
- "BGE 145 III 229" → valid BGE citation
- "ATF 140 II 315 consid. 4.2" → valid ATF citation with consideration
- "Art. 97 OR" → valid statute citation
- "Art. 8 Abs. 1 lit. a ZGB" → valid statute with paragraph and letter`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'The citation string to validate',
        },
        strict: {
          type: 'boolean',
          description: 'Enable strict validation mode (default: false)',
          default: false,
        },
        citationType: {
          type: 'string',
          enum: ['bge', 'statute', 'doctrine'],
          description: 'Expected citation type (auto-detected if not specified)',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'legal-citations:parse_citation',
    description: `Parses Swiss legal citations into structured components.

Extracts all components from citations:
- BGE: prefix, volume, section, page, consideration
- Statute: article, paragraph, letter, number, statute abbreviation

Supports multi-language input (DE/FR/IT/EN).

Examples:
- "BGE 145 III 229 E. 4.2" → { type: "bge", volume: 145, section: "III", page: 229, consideration: "4.2" }
- "Art. 97 Abs. 1 OR" → { type: "statute", article: 97, paragraph: 1, statute: "OR" }`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'The citation string to parse',
        },
        citationType: {
          type: 'string',
          enum: ['bge', 'statute', 'doctrine'],
          description: 'Expected citation type (auto-detected if not specified)',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'legal-citations:format_citation',
    description: `Formats Swiss legal citations to a specific language and style.

Languages supported:
- de (German): BGE, Art., Abs., lit., Ziff., E.
- fr (French): ATF, art., al., let., ch., consid.
- it (Italian): DTF, art., cpv., lett., n., consid.
- en (English): BGE, Art., para., let., no., consideration

Styles:
- full: Complete citation with all components
- short: Abbreviated form (omits paragraph/letter for statutes, consideration for BGE)
- inline: Minimal form for inline text references

Examples:
- "BGE 145 III 229" → "ATF 145 III 229" (French)
- "Art. 97 Abs. 1 OR" → "art. 97 al. 1 CO" (French)`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'The citation string to format',
        },
        targetLanguage: {
          type: 'string',
          enum: ['de', 'fr', 'it', 'en'],
          description: 'Target language for the formatted citation',
        },
        style: {
          type: 'string',
          enum: ['full', 'short', 'inline'],
          description: 'Output style (default: full)',
          default: 'full',
        },
      },
      required: ['citation', 'targetLanguage'],
    },
  },
  {
    name: 'legal-citations:convert_citation',
    description: `Converts Swiss legal citations between formats and languages.

Conversion capabilities:
- BGE ↔ ATF ↔ DTF (language variants of Federal Supreme Court decisions)
- German ↔ French ↔ Italian statute terminology
- Consideration prefixes (E. ↔ consid.)

Examples:
- "BGE 145 III 229" + toFormat: "bge" + targetLanguage: "fr" → "ATF 145 III 229"
- "Art. 97 OR" + toFormat: "statute" + targetLanguage: "fr" → "art. 97 CO"
- "Art. 97 Abs. 1 lit. a OR" + targetLanguage: "it" → "art. 97 cpv. 1 lett. a CO"`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'The citation string to convert',
        },
        fromFormat: {
          type: 'string',
          enum: ['bge', 'statute', 'doctrine'],
          description: 'Source format (auto-detected if not specified)',
        },
        toFormat: {
          type: 'string',
          enum: ['bge', 'statute', 'doctrine'],
          description: 'Target format for conversion',
        },
        targetLanguage: {
          type: 'string',
          enum: ['de', 'fr', 'it', 'en'],
          description: 'Target language (default: de)',
          default: 'de',
        },
      },
      required: ['citation', 'toFormat'],
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
        case 'legal-citations:validate_citation': {
          const input = ValidateCitationInputSchema.parse(args);
          const result = validateCitation(input);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'legal-citations:parse_citation': {
          const input = ParseCitationInputSchema.parse(args);
          const result = parseCitation(input);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'legal-citations:format_citation': {
          const input = FormatCitationInputSchema.parse(args);
          const result = formatCitation(input);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        case 'legal-citations:convert_citation': {
          const input = ConvertCitationInputSchema.parse(args);
          const result = convertCitation(input);
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
