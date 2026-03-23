/**
 * TAS/CAS Jurisprudence MCP Server - Server Setup
 * MCP server with tool registration and handlers
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_DEFINITIONS } from './types.js';
import { casSearch } from './tools/cas-search.js';
import { casGetAward } from './tools/cas-get-award.js';
import { casRecent } from './tools/cas-recent.js';
import { casBySport } from './tools/cas-by-sport.js';

/**
 * Create and configure the MCP server
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'tas-jurisprudence',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * Handler: List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS.map(def => ({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations
      })) as Tool[]
    };
  });

  /**
   * Handler: Execute tool calls
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'cas_search':
          result = await casSearch(args);
          break;

        case 'cas_get_award':
          result = await casGetAward(args);
          break;

        case 'cas_recent':
          result = await casRecent(args);
          break;

        case 'cas_by_sport':
          result = await casBySport(args);
          break;

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters: ${error.message}`
        );
      }

      // Handle other errors
      const message = error instanceof Error ? error.message : String(error);
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${message}`
      );
    }
  });

  return server;
}
