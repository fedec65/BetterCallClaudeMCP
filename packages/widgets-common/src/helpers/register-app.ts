/**
 * Helpers for declaring MCP Apps UI resources and linking them to tools
 * using the raw Server API (not McpServer).
 *
 * Reusable by all servers in the monorepo.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

export interface AppResourceDef {
  name: string;
  uri: string;
  description: string;
  getHtml: () => string;
}

/**
 * Add `_meta.ui` to a tool definition so hosts know to render the widget.
 */
export function withUiMeta(
  toolDef: Record<string, unknown>,
  resourceUri: string,
  opts?: { visibility?: Array<'model' | 'app'> },
): Record<string, unknown> {
  return {
    ...toolDef,
    _meta: {
      ...(toolDef._meta as Record<string, unknown> | undefined),
      ui: {
        resourceUri,
        ...(opts?.visibility ? { visibility: opts.visibility } : {}),
      },
      'ui/resourceUri': resourceUri,
    },
  };
}

/**
 * Register resource handlers on a raw Server for the given app resources.
 * The server must declare `resources: {}` in capabilities.
 */
export function registerAppResources(
  server: Server,
  resources: AppResourceDef[],
): void {
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: RESOURCE_MIME_TYPE,
    })),
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const resource = resources.find((r) => r.uri === uri);
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: RESOURCE_MIME_TYPE,
          text: resource.getHtml(),
        },
      ],
    };
  });
}
