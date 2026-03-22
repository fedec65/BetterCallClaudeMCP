/**
 * TAS/CAS Jurisprudence MCP Server - Server Setup
 * MCP server configuration and tool registration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool
} from '@modelcontextprotocol/sdk/types.js';
import {
  CAS_SEARCH_TOOL,
  casSearch
} from './tools/cas-search.js';
import {
  CAS_GET_AWARD_TOOL,
  casGetAward
} from './tools/cas-get-award.js';
import {
  CAS_RECENT_TOOL,
  casRecent
} from './tools/cas-recent.js';
import {
  CAS_BY_SPORT_TOOL,
  casBySport
} from './tools/cas-by-sport.js';

/**
 * All available tools
 */
const TOOLS: Tool[] = [
  CAS_SEARCH_TOOL,
  CAS_GET_AWARD_TOOL,
  CAS_RECENT_TOOL,
  CAS_BY_SPORT_TOOL
];

/**
 * Tool handlers mapping
 */
const TOOL_HANDLERS: Record<string, (input: unknown) => Promise<unknown>> = {
  cas_search: casSearch,
  cas_get_award: casGetAward,
  cas_recent: casRecent,
  cas_by_sport: casBySport
};

/**
 * Create and configure MCP server
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'tas-jurisprudence',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args);

      // Format result as MCP tool response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error occurred';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: true,
              message: errorMessage
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  });

  return server;
}
