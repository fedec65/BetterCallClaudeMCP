/**
 * Legal Persona MCP Server Factory (HTTP)
 *
 * Thin wrapper over the shared createLegalPersonaServer factory.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createLegalPersonaServer } from '@legal-persona/server.js';

export function createLegalPersonaHttpServer(): Server {
  return createLegalPersonaServer();
}
