# BetterCallClaudeMCP

> Model Context Protocol (MCP) servers for Swiss legal research.

[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/node-%3E%3D18-blue.svg)](https://nodejs.org)

This repository contains the standalone MCP servers that power the
[BetterCallClaude](https://github.com/fedec65/bettercallclaude) Swiss legal
intelligence plugin. Each server is a separate, independently-installable
package.

> This repo is **MCP-only**. Slash commands, skills, agents, hooks, and the
> Cowork plugin manifest live in
> [`fedec65/bettercallclaude`](https://github.com/fedec65/bettercallclaude).

## Servers

| Server | Transport | Purpose |
|---|---|---|
| [`bge-search`](mcp-servers/bge-search) | stdio | Swiss Federal Supreme Court (BGE/ATF/DTF) decision search |
| [`entscheidsuche`](mcp-servers/entscheidsuche) | stdio | Federal + cantonal court decision search via entscheidsuche.ch |
| [`legal-citations`](mcp-servers/legal-citations) | stdio | Validate, parse, format, and convert Swiss legal citations |
| [`legal-persona`](mcp-servers/legal-persona) | stdio | Case strategy, drafting, and document analysis tools |
| [`tas-jurisprudence`](mcp-servers/tas-jurisprudence) | HTTP (Streamable) | TAS/CAS (Court of Arbitration for Sport) decision search |

See [`docs/07-MCP-SERVERS-REFERENCE.md`](docs/07-MCP-SERVERS-REFERENCE.md) for
the full tool reference.

## Repository layout

```
mcp-servers/
├── bge-search/          # stdio MCP server
├── entscheidsuche/      # stdio MCP server
├── legal-citations/     # stdio MCP server
├── legal-persona/       # stdio MCP server
└── tas-jurisprudence/   # HTTP MCP server (Railway-deployable)
```

Each directory is a self-contained npm package with its own `package.json`,
tests, and build. The root `package.json` wires them together as npm
workspaces so you can build/test all of them in one pass.

## Development

Requires Node.js ≥ 18 and npm ≥ 10.

```bash
# Install dependencies for every server
npm install

# Build all servers
npm run build

# Run tests across all servers
npm test

# Typecheck all servers
npm run typecheck
```

To work on a single server:

```bash
cd mcp-servers/bge-search
npm run build
npm test
```

## Using the servers with Claude

Point your MCP-capable client at a built server's entry point. Example for
Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`
on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "bge-search": {
      "command": "node",
      "args": ["/absolute/path/to/BetterCallClaudeMCP/mcp-servers/bge-search/dist/index.js"]
    },
    "entscheidsuche": {
      "command": "node",
      "args": ["/absolute/path/to/BetterCallClaudeMCP/mcp-servers/entscheidsuche/dist/index.js"]
    },
    "legal-citations": {
      "command": "node",
      "args": ["/absolute/path/to/BetterCallClaudeMCP/mcp-servers/legal-citations/dist/index.js"]
    },
    "legal-persona": {
      "command": "node",
      "args": ["/absolute/path/to/BetterCallClaudeMCP/mcp-servers/legal-persona/dist/index.js"]
    }
  }
}
```

`tas-jurisprudence` exposes a Streamable HTTP endpoint and is intended to be
deployed as a service (see
[`mcp-servers/tas-jurisprudence/README.md`](mcp-servers/tas-jurisprudence/README.md)).

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector \
  node ./mcp-servers/bge-search/dist/index.js
```

## License

MIT
