#!/usr/bin/env node
/**
 * Legal Persona MCP Server — stdio entry point.
 *
 * The actual tool definitions + request handlers live in ./server.ts
 * (createLegalPersonaServer factory) so the same logic can be wrapped
 * in an HTTP transport by mcp-servers-http.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createLegalPersonaServer } from './server.js';

async function main(): Promise<void> {
  const server = createLegalPersonaServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

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
