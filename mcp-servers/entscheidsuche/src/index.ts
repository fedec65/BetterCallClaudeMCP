#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SearchInputSchema, GetDocumentInputSchema } from './types.js';
import { searchDecisions } from './tools/search.js';
import { getDocument } from './tools/get-document.js';

const SERVER_NAME = 'entscheidsuche';
const SERVER_VERSION = '1.0.0';

/**
 * Tool definitions for the entscheidsuche MCP server
 */
const tools: Tool[] = [
  {
    name: 'entscheidsuche:search',
    description: `Search Swiss court decisions via entscheidsuche.ch API.

Searches across Swiss federal and cantonal court decisions with powerful filtering options.

Parameters:
- query (required): Search query text (legal terms, case numbers, etc.)
- courts (optional): Filter by court codes (BGer, BVGer, BStGer, BPatGer, or cantonal codes like ZH, BE, GE, etc.)
- dateFrom (optional): Start date filter (YYYY-MM-DD format)
- dateTo (optional): End date filter (YYYY-MM-DD format)
- canton (optional): Filter by canton code (2-letter code)
- legalDomain (optional): Filter by legal domain (civil, criminal, administrative, constitutional, social, tax)
- language (optional): Filter by language (de, fr, it)
- limit (optional): Maximum results to return (1-100, default: 20)

Returns search results with case metadata including title, court, date, reference, summary, and URL.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (required)',
        },
        courts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Court codes to filter by (e.g., ["BGer", "ZH"])',
        },
        dateFrom: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'Start date (YYYY-MM-DD)',
        },
        dateTo: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'End date (YYYY-MM-DD)',
        },
        canton: {
          type: 'string',
          minLength: 2,
          maxLength: 2,
          description: 'Canton code (e.g., "ZH")',
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
    name: 'entscheidsuche:get_document',
    description: `Retrieve a specific Swiss court decision document by ID.

Fetches the full text, summary, or citations of a court decision from entscheidsuche.ch.

Parameters:
- documentId (required): The unique document identifier
- format (optional): Content format to retrieve:
  - "full": Complete decision text with all metadata (default)
  - "summary": Brief summary only
  - "citations": Extracted legal citations only

Returns document with:
- Full text content (for "full" format)
- Summary of the decision
- Extracted citations (statutes, BGE references, doctrine)
- Metadata (court, date, judges, parties, legal domain, procedure type)`,
    inputSchema: {
      type: 'object',
      properties: {
        documentId: {
          type: 'string',
          description: 'Document ID (required)',
        },
        format: {
          type: 'string',
          enum: ['full', 'summary', 'citations'],
          default: 'full',
          description: 'Content format to retrieve',
        },
      },
      required: ['documentId'],
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
        case 'entscheidsuche:search': {
          const input = SearchInputSchema.parse(args);
          const result = await searchDecisions(input);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'entscheidsuche:get_document': {
          const input = GetDocumentInputSchema.parse(args);
          const result = await getDocument(input);
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
