/**
 * TAS/CAS Jurisprudence MCP Server Factory (HTTP)
 *
 * Thin wrapper over the shared createMcpServer factory in the
 * tas-jurisprudence package.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMcpServer } from '@tas-jurisprudence/server.js';

export function createTasJurisprudenceServer(): Server {
  return createMcpServer();
}
