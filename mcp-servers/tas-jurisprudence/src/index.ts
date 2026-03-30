/**
 * TAS/CAS Jurisprudence MCP Server - HTTP Entry Point
 * Express server with Streamable HTTP transport for remote deployment
 */

import express, { type Request, type Response } from 'express';
import { createMcpServer } from './server.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware to parse JSON bodies
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'tas-jurisprudence',
    version: '1.0.3',
    timestamp: new Date().toISOString()
  });
});

/**
 * Root endpoint - service info
 */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'TAS/CAS Jurisprudence MCP Server',
    version: '1.0.3',
    description: 'Court of Arbitration for Sport decision search and retrieval',
    mcp_endpoint: '/tas-jurisprudence/mcp',
    tools: [
      'cas_search - Search CAS decisions by keywords, sport, year',
      'cas_get_award - Get detailed award information',
      'cas_recent - Get recent decisions',
      'cas_by_sport - Browse by sport category'
    ],
    documentation: 'https://bettercallclaude.ch/docs/tas-jurisprudence'
  });
});

/**
 * MCP endpoint - handles all MCP protocol communication
 * Uses Streamable HTTP transport pattern
 */
app.post('/tas-jurisprudence/mcp', async (req: Request, res: Response) => {
  try {
    // Create MCP server instance
    createMcpServer();

    // Get the MCP request from body
    const mcpRequest = req.body;
    
    // For initialize request, handle specially
    if (mcpRequest.method === 'initialize') {
      const result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'tas-jurisprudence',
          version: '1.0.2'
        }
      };
      
      res.json({
        jsonrpc: '2.0',
        id: mcpRequest.id,
        result
      });
      return;
    }
    
    // For tools/list request
    if (mcpRequest.method === 'tools/list') {
      const { TOOL_DEFINITIONS } = await import('./types.js');
      res.json({
        jsonrpc: '2.0',
        id: mcpRequest.id,
        result: {
          tools: TOOL_DEFINITIONS.map(def => ({
            name: def.name,
            description: def.description,
            inputSchema: def.inputSchema
          }))
        }
      });
      return;
    }
    
    // For tools/call request
    if (mcpRequest.method === 'tools/call') {
      const { name, arguments: args } = mcpRequest.params;
      
      // Import tools
      const { casSearch } = await import('./tools/cas-search.js');
      const { casGetAward } = await import('./tools/cas-get-award.js');
      const { casRecent } = await import('./tools/cas-recent.js');
      const { casBySport } = await import('./tools/cas-by-sport.js');
      
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
          res.status(400).json({
            jsonrpc: '2.0',
            id: mcpRequest.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`
            }
          });
          return;
      }
      
      res.json({
        jsonrpc: '2.0',
        id: mcpRequest.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      });
      return;
    }
    
    // Unknown method
    res.status(400).json({
      jsonrpc: '2.0',
      id: mcpRequest.id,
      error: {
        code: -32601,
        message: `Unknown method: ${mcpRequest.method}`
      }
    });
    
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error'
      }
    });
  }
});

/**
 * SSE endpoint for streaming responses (optional, for future use)
 */
app.get('/tas-jurisprudence/sse', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);
  
  res.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`TAS/CAS Jurisprudence MCP Server running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/tas-jurisprudence/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Debug: Check Playwright browser availability at startup
  const fs = require('fs');
  const expectedBrowserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    '/ms-playwright/chromium-1091/chrome-linux/chrome';
  console.log(`[Startup] Expected browser path: ${expectedBrowserPath}`);
  console.log(`[Startup] Browser exists: ${fs.existsSync(expectedBrowserPath)}`);

  // List available browsers in /ms-playwright if it exists
  if (fs.existsSync('/ms-playwright')) {
    const browsers = fs.readdirSync('/ms-playwright');
    console.log(`[Startup] Available browsers in /ms-playwright: ${browsers.join(', ')}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});
