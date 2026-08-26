/**
 * BetterCallClaude MCP HTTP Service
 *
 * Hosts all 8 Swiss legal intelligence MCP servers behind
 * StreamableHTTPServerTransport in stateless mode.
 *
 * Endpoints:
 *   POST /bge-search/mcp
 *   POST /entscheidsuche/mcp
 *   POST /fedlex-sparql/mcp
 *   POST /legal-citations/mcp
 *   POST /onlinekommentar/mcp
 *   POST /legal-persona/mcp
 *   POST /tas-jurisprudence/mcp
 *   POST /workflows-ch/mcp
 *   GET  /health
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Server factories
import { createBgeSearchServer } from './servers/bge-search.js';
import { createEntscheidsucheServer } from './servers/entscheidsuche.js';
import { createFedlexSparqlServer } from './servers/fedlex-sparql.js';
import { createLegalCitationsServer } from './servers/legal-citations.js';
import { createOnlinekommentarServer } from './servers/onlinekommentar.js';
import { createLegalPersonaHttpServer } from './servers/legal-persona.js';
import { createTasJurisprudenceServer } from './servers/tas-jurisprudence.js';
import { createWorkflowsChServer } from './servers/workflows-ch.js';

// --- App setup ---

const app = express();

app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'mcp-session-id',
    'Last-Event-ID',
    'mcp-protocol-version',
  ],
  exposedHeaders: [
    'mcp-session-id',
    'mcp-protocol-version',
  ],
}));

app.use(rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Try again in a minute.' },
}));

// --- Health check ---

const SERVER_NAMES = [
  'bge-search',
  'entscheidsuche',
  'fedlex-sparql',
  'legal-citations',
  'onlinekommentar',
  'legal-persona',
  'tas-jurisprudence',
  'workflows-ch',
];

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    servers: SERVER_NAMES.length,
    serverNames: SERVER_NAMES,
    timestamp: new Date().toISOString(),
  });
});

// --- MCP route handler ---

type ServerFactory = () => Server;

/**
 * Handle a stateless MCP request: create a fresh Server + Transport,
 * process the JSON-RPC message, then tear down.
 */
async function handleMcpRequest(
  factory: ServerFactory,
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const server = factory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
}

/**
 * Return 405 Method Not Allowed for GET/DELETE on MCP endpoints.
 * Stateless mode does not support SSE streams or session deletion.
 */
function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed. Use POST for MCP requests.',
    },
    id: null,
  });
}

// --- Register MCP routes ---

const routes: Array<[string, ServerFactory]> = [
  ['/bge-search/mcp', createBgeSearchServer],
  ['/entscheidsuche/mcp', createEntscheidsucheServer],
  ['/fedlex-sparql/mcp', createFedlexSparqlServer],
  ['/legal-citations/mcp', createLegalCitationsServer],
  ['/onlinekommentar/mcp', createOnlinekommentarServer],
  ['/legal-persona/mcp', createLegalPersonaHttpServer],
  ['/tas-jurisprudence/mcp', createTasJurisprudenceServer],
  ['/workflows-ch/mcp', createWorkflowsChServer],
];

for (const [path, factory] of routes) {
  app.post(path, (req: Request, res: Response) => {
    handleMcpRequest(factory, req, res).catch(() => {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    });
  });
  app.get(path, methodNotAllowed);
  app.delete(path, methodNotAllowed);
}

// --- Start ---

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`BetterCallClaude MCP HTTP service listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  for (const [path] of routes) {
    console.log(`  POST http://localhost:${PORT}${path}`);
  }
});
