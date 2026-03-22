/**
 * TAS/CAS Jurisprudence MCP Server - HTTP Server Entry Point
 * Express server with Streamable HTTP transport for MCP
 */

import express from 'express';
import cors from 'cors';
import { createMcpServer } from './server.js';
import { closeBrowser } from './scraper/playwright-client.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'tas-jurisprudence',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * MCP endpoint - handles all MCP protocol requests
 * Route: /tas-jurisprudence/mcp
 */
app.post('/tas-jurisprudence/mcp', async (req, res) => {
  try {
    const server = createMcpServer();

    // Import StreamableHTTPServerTransport dynamically
    const { StreamableHTTPServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Stateless mode
    });

    // Connect server to transport
    await server.connect(transport);

    // Handle the incoming request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * Handle GET requests for SSE (optional, for future streaming support)
 */
app.get('/tas-jurisprudence/mcp', async (_req, res) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'Use POST for MCP requests'
  });
});

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    await closeBrowser();
    console.log('Browser closed');
  } catch (error) {
    console.error('Error closing browser:', error);
  }

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`TAS/CAS Jurisprudence MCP Server running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/tas-jurisprudence/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
