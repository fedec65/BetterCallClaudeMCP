# BetterCallClaudeMCP

> Model Context Protocol (MCP) servers for Swiss legal research.

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/fedec65/BetterCallClaudeMCP?sort=semver)](https://github.com/fedec65/BetterCallClaudeMCP/releases)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![Node](https://img.shields.io/badge/node-%3E%3D20-blue.svg)](https://nodejs.org)

This repository is the **single source of truth** for the Swiss-legal Model
Context Protocol (MCP) servers that power the
[BetterCallClaude](https://github.com/fedec65/bettercallclaude) plugin.
It contains:

- **Seven MCP servers** (see [Servers](#servers)), each a self-contained
  workspace package under `mcp-servers/`.
- A **single HTTP aggregator** (`mcp-servers-http/`) that exposes all seven
  servers over Streamable HTTP on a single Node.js Express process.
- A production deployment at
  **[`mcp.bettercallclaude.ch`](https://mcp.bettercallclaude.ch/health)**
  (Railway, auto-deployed from `main`).
- Releases are tagged on `main` and published under
  [GitHub Releases](https://github.com/fedec65/BetterCallClaudeMCP/releases).

> This repo is **MCP-only**. Slash commands, skills, agents, hooks, the
> `.mcp.json` config, and the Cowork plugin manifest live in
> [`fedec65/bettercallclaude`](https://github.com/fedec65/bettercallclaude).

## Servers

| Server | Tools | Purpose |
|---|---|---|
| [`bge-search`](mcp-servers/bge-search) | 3 | Swiss Federal Supreme Court (BGE/ATF/DTF) decision search |
| [`entscheidsuche`](mcp-servers/entscheidsuche) | 9 (stdio) / 8 (HTTP) | Federal + cantonal court decision search via [entscheidsuche.ch](https://entscheidsuche.ch). Includes hierarchy/facet discovery, case-number lookup and pagination. |
| [`fedlex-sparql`](mcp-servers/fedlex-sparql) | 5 | Swiss federal legislation via [Fedlex](https://fedlex.data.admin.ch). `get_article` returns the real article text (fetched from the consolidated HTML manifestation, with optional paragraph/Absatz filter) |
| [`legal-citations`](mcp-servers/legal-citations) | 8 | Validate, parse, format, convert and extract Swiss legal citations |
| [`onlinekommentar`](mcp-servers/onlinekommentar) | 4 | Scholarly commentaries from [onlinekommentar.ch](https://onlinekommentar.ch) |
| [`legal-persona`](mcp-servers/legal-persona) | 3 | Case strategy, Swiss-legal document drafting (15 doc types), and document analysis |
| [`tas-jurisprudence`](mcp-servers/tas-jurisprudence) | 4 | TAS/CAS (Court of Arbitration for Sport) decision search |

Every server ships **both** as a stdio MCP (for local use / testing) and as
an HTTP endpoint through the aggregator. See
[`docs/07-MCP-SERVERS-REFERENCE.md`](docs/07-MCP-SERVERS-REFERENCE.md) for the
full tool reference.

## Repository layout

```
mcp-servers/
├── bge-search/           # stdio MCP server + factory for HTTP wiring
├── entscheidsuche/       # ″
├── fedlex-sparql/        # ″
├── legal-citations/      # ″
├── legal-persona/        # ″
├── onlinekommentar/      # ″
├── tas-jurisprudence/    # ″
├── shared/               # database, HTTP, NLP and error utilities
└── integration-tests/    # cross-server tests

mcp-servers-http/         # Express app that mounts the 7 servers
                          # as /<server>/mcp HTTP Streamable endpoints.
                          # Dockerized and auto-deployed to Railway.

railway.toml              # Railway build config (Dockerfile builder)
```

Every `mcp-servers/*` directory is a self-contained npm package. The root
`package.json` wires them together as **npm workspaces** so you can
build/test all of them in one pass. Packages are published under the
`@bettercallclaude/*` scope internally.

## Production deployment

The HTTP aggregator is deployed to Railway and served at
`https://mcp.bettercallclaude.ch`. Health check:

```bash
curl -s https://mcp.bettercallclaude.ch/health
# {"status":"ok","servers":7,"serverNames":["bge-search","entscheidsuche",
#  "fedlex-sparql","legal-citations","onlinekommentar","legal-persona",
#  "tas-jurisprudence"], ...}
```

Each server is reachable at `https://mcp.bettercallclaude.ch/<server>/mcp`
using the MCP Streamable HTTP transport (protocol `2025-06-18`).

**Merges to `main` auto-redeploy** via the Railway ↔ GitHub integration
(Dockerfile build from `mcp-servers-http/Dockerfile`). `dev` is the
integration branch; PRs target `dev` and are promoted to `main` via a
separate merge PR.

## Development

Requires Node.js ≥ 20 and npm ≥ 10.

```bash
# Install dependencies for every workspace
npm install

# Build all servers + the HTTP aggregator
npm run build

# Run tests across all workspaces
npm test

# Typecheck everything
npm run typecheck
```

To work on a single server:

```bash
cd mcp-servers/bge-search
npm run build
npm test
```

To run the aggregator locally:

```bash
npm run build --workspaces
npm --workspace mcp-servers-http run start
# → listens on :3000, all 7 servers mounted at /<name>/mcp
```

### Docker (production parity)

```bash
docker build -f mcp-servers-http/Dockerfile -t bcc-mcp .
docker run --rm -p 3000:3000 bcc-mcp
curl -s localhost:3000/health
```

### Configuration (environment variables)

The shared configuration layer (`mcp-servers/shared/src/config/config.ts`) reads
these variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_TYPE` | `sqlite` | Database backend (`sqlite` or `postgres`). |
| `DB_DATABASE` | `$XDG_CACHE_HOME/bettercallclaude/bettercallclaude.db` (or `~/.cache/…`, `%LOCALAPPDATA%\…` on Windows) | SQLite file path, or database name for postgres. The default is an absolute path in the user cache dir — it is a regenerable scrape cache and never lands in your project working tree. |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` | — | Postgres connection settings (required when `DB_TYPE=postgres`). |
| `DB_POOL_SIZE` | `10` | Postgres pool size. |
| `DB_SSL` | `false` | Enable SSL for postgres (`true`). |

## Using the servers with Claude

### Option A — HTTP (recommended, no install required)

Point any MCP-capable client at the deployed Railway endpoints. This is how
the [`bettercallclaude`](https://github.com/fedec65/bettercallclaude) plugin
wires itself via its `.mcp.json`:

```json
{
  "mcpServers": {
    "bge-search":         { "type": "http", "url": "https://mcp.bettercallclaude.ch/bge-search/mcp" },
    "entscheidsuche":     { "type": "http", "url": "https://mcp.bettercallclaude.ch/entscheidsuche/mcp" },
    "fedlex-sparql":      { "type": "http", "url": "https://mcp.bettercallclaude.ch/fedlex-sparql/mcp" },
    "legal-citations":    { "type": "http", "url": "https://mcp.bettercallclaude.ch/legal-citations/mcp" },
    "onlinekommentar":    { "type": "http", "url": "https://mcp.bettercallclaude.ch/onlinekommentar/mcp" },
    "legal-persona":      { "type": "http", "url": "https://mcp.bettercallclaude.ch/legal-persona/mcp" },
    "tas-jurisprudence":  { "type": "http", "url": "https://mcp.bettercallclaude.ch/tas-jurisprudence/mcp" }
  }
}
```

Verify a server with a raw MCP call:

```bash
curl -s -X POST https://mcp.bettercallclaude.ch/bge-search/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-protocol-version: 2025-06-18" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Option B — stdio (local, hackable)

Build the workspaces, then point Claude Desktop
(`~/Library/Application Support/Claude/claude_desktop_config.json` on
macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows) at the
compiled entry points:

```json
{
  "mcpServers": {
    "bge-search": {
      "command": "node",
      "args": ["/absolute/path/to/BetterCallClaudeMCP/mcp-servers/bge-search/dist/index.js"]
    },
    "legal-persona": {
      "command": "node",
      "args": ["/absolute/path/to/BetterCallClaudeMCP/mcp-servers/legal-persona/dist/index.js"]
    }
    // …one entry per server you want
  }
}
```

### MCP Inspector

```bash
# stdio
npx @modelcontextprotocol/inspector \
  node ./mcp-servers/bge-search/dist/index.js

# HTTP
npx @modelcontextprotocol/inspector \
  --transport http \
  https://mcp.bettercallclaude.ch/bge-search/mcp
```

## Contributing

- Branch from `dev`, open a PR against `dev`.
- Keep changes scoped to a single workspace where possible.
- Run `npm run build && npm test` before pushing.
- A merge to `main` triggers a Railway redeploy. Smoke-test `/health`
  after promotion.

## License

[GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).

The AGPL extends the GPL's copyleft to network use: if you run a modified
version of this software as a network service (for example, hosting your
own `mcp-servers-http` aggregator), you must make the corresponding
modified source code available to users of that service under the same
licence.

Past commits released under MIT remain available under MIT terms for
anyone who obtained them before the relicence date; all commits from the
relicence commit forward are AGPL-3.0-or-later.
