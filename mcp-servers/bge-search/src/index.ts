#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SearchInputSchema, GetBGEInputSchema } from './types.js';
import { searchBGE } from './tools/search.js';
import { getBGE } from './tools/get-bge.js';

const SERVER_NAME = 'bge-search';
const SERVER_VERSION = '1.0.0';

/**
 * Tool definitions for the bge-search MCP server
 */
const tools: Tool[] = [
  {
    name: 'bge-search:search',
    description: `Search published BGE (Bundesgerichtsentscheide) decisions from the Swiss Federal Supreme Court.

Searches the official collection of Federal Supreme Court decisions with filtering options.

Parameters:
- query (required): Search query text (legal terms, article references, etc.)
- volume (optional): BGE volume number (e.g., 145)
- section (optional): BGE section code:
  - I: Constitutional Law (Verfassungsrecht)
  - Ia: International Law, Fundamental Rights
  - II: Civil Law (Zivilrecht)
  - III: Obligations and Property (Schuld- und Sachenrecht)
  - IV: Social Insurance (Sozialversicherungsrecht)
  - V: Administrative Law (Verwaltungsrecht)
  - VI: Criminal Law (Strafrecht)
- yearFrom (optional): Start year filter (1875-2100)
- yearTo (optional): End year filter (1875-2100)
- legalDomain (optional): Filter by legal domain (civil, criminal, administrative, constitutional, social, tax)
- language (optional): Filter by language (de, fr, it)
- limit (optional): Maximum results to return (1-100, default: 20)

Returns search results with BGE citation, title, date, section, summary, and URL.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (required)',
        },
        volume: {
          type: 'number',
          description: 'BGE volume number (e.g., 145)',
        },
        section: {
          type: 'string',
          enum: ['I', 'Ia', 'II', 'III', 'IV', 'V', 'VI'],
          description: 'BGE section code',
        },
        yearFrom: {
          type: 'number',
          minimum: 1875,
          maximum: 2100,
          description: 'Start year filter',
        },
        yearTo: {
          type: 'number',
          minimum: 1875,
          maximum: 2100,
          description: 'End year filter',
        },
        legalDomain: {
          type: 'string',
          enum: ['civil', 'criminal', 'administrative', 'constitutional', 'social', 'tax'],
          description: 'Legal domain filter',
        },
        language: {
          type: 'string',
          enum: ['de', 'fr', 'it'],
          description: 'Language filter',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 20,
          description: 'Maximum results (1-100)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'bge-search:get_bge',
    description: `Retrieve a specific BGE decision by its citation.

Fetches the complete BGE decision document including regeste, facts, considerations, and dispositiv.

Citation formats accepted:
- German: "BGE 145 III 229"
- French: "ATF 140 II 315"
- Italian: "DTF 138 I 1"

Parameters:
- citation (required): BGE citation in format "BGE/ATF/DTF [volume] [section] [page]"
- includeConsiderations (optional): Include full considerations text (default: true)
- language (optional): Preferred language for response (de, fr, it)

Returns BGE document with:
- Citation and metadata (volume, section, page, date)
- Title and regeste (legal summary)
- Sachverhalt (facts of the case)
- Considerations (Erwägungen) with numbered sections
- Dispositiv (judgment/order)
- URL to official source`,
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          pattern: '^(BGE|ATF|DTF)\\s+\\d+\\s+(I|Ia|II|III|IV|V|VI)\\s+\\d+$',
          description: 'BGE citation (e.g., "BGE 145 III 229")',
        },
        includeConsiderations: {
          type: 'boolean',
          default: true,
          description: 'Include full considerations text',
        },
        language: {
          type: 'string',
          enum: ['de', 'fr', 'it'],
          description: 'Preferred language',
        },
      },
      required: ['citation'],
    },
  },
];

/**
 * Create and configure the MCP server
 */
function createServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'bge-search:search': {
          const input = SearchInputSchema.parse(args);
          const result = await searchBGE(input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'bge-search:get_bge': {
          const input = GetBGEInputSchema.parse(args);
          const result = await getBGE(input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
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
