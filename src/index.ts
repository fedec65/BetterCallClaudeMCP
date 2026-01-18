#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';

import { ALL_TOOLS } from './tools/index.js';
import {
  LegalGatewayInputSchema,
  LegalResearchInputSchema,
  LegalCitationInputSchema,
  LegalStrategyInputSchema,
  LegalDraftInputSchema,
  LegalAnalyzeInputSchema,
  type Language,
  type ResponseMetadata,
} from './types/index.js';

// Tool handlers (to be implemented)
import { handleLegalGateway } from './handlers/gateway.js';
import { handleLegalResearch } from './handlers/research.js';
import { handleLegalCitation } from './handlers/citation.js';
import { handleLegalStrategy } from './handlers/strategy.js';
import { handleLegalDraft } from './handlers/draft.js';
import { handleLegalAnalyze } from './handlers/analyze.js';

/**
 * BetterCallClaude MCP Server
 * Swiss Legal Intelligence Framework
 */
class BetterCallClaudeServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'bettercallclaude-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: ALL_TOOLS };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      const requestId = uuidv4();

      try {
        let result: unknown;

        switch (name) {
          case 'legal_gateway': {
            const input = LegalGatewayInputSchema.parse(args);
            result = await handleLegalGateway(input, requestId);
            break;
          }

          case 'legal_research': {
            const input = LegalResearchInputSchema.parse(args);
            result = await handleLegalResearch(input, requestId);
            break;
          }

          case 'legal_citation': {
            const input = LegalCitationInputSchema.parse(args);
            result = await handleLegalCitation(input, requestId);
            break;
          }

          case 'legal_strategy': {
            const input = LegalStrategyInputSchema.parse(args);
            result = await handleLegalStrategy(input, requestId);
            break;
          }

          case 'legal_draft': {
            const input = LegalDraftInputSchema.parse(args);
            result = await handleLegalDraft(input, requestId);
            break;
          }

          case 'legal_analyze': {
            const input = LegalAnalyzeInputSchema.parse(args);
            result = await handleLegalAnalyze(input, requestId);
            break;
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }

        // Add metadata to successful response
        const metadata = this.createMetadata(requestId, name, startTime);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  data: result,
                  metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        // Handle Zod validation errors
        if (error instanceof Error && error.name === 'ZodError') {
          const metadata = this.createMetadata(requestId, name, startTime);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: {
                      code: 'INVALID_INPUT',
                      message: 'Invalid input parameters',
                      details: JSON.parse(error.message),
                      retryable: false,
                    },
                    metadata,
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Handle other errors
        const metadata = this.createMetadata(requestId, name, startTime);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: {
                    code: 'INTERNAL_ERROR',
                    message: errorMessage,
                    retryable: false,
                  },
                  metadata,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private createMetadata(
    requestId: string,
    tool: string,
    startTime: number,
    language: Language = 'de',
    cached: boolean = false
  ): ResponseMetadata {
    return {
      requestId,
      timestamp: new Date().toISOString(),
      tool,
      cached,
      language,
      processingTime: Date.now() - startTime,
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[BetterCallClaude MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('BetterCallClaude MCP server running on stdio');
  }
}

// Start the server
const server = new BetterCallClaudeServer();
server.run().catch(console.error);
