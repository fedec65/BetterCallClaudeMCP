# 06 - Configuration Guide

> Complete configuration reference for BetterCallClaude across all Anthropic products

## MCP Compatibility Matrix

| Product | MCP Support | Transport | Configuration |
|---------|-------------|-----------|---------------|
| **Claude Code** | ✅ Full | stdio + HTTP | `claude mcp add` or `.mcp.json` |
| **Claude Desktop** | ✅ Full | stdio + HTTP | `claude_desktop_config.json` |
| **Claude Cowork** | ✅ Full | MCP via connectors | Built-in + custom |
| **Claude.ai (Web)** | ✅ Remote only | HTTP | Integrations settings (Pro+) |

---

## 1. Claude Code Configuration

### Quick Setup

```bash
# Add all BetterCallClaude MCP servers
claude mcp add legal-core -- node ./mcp-servers/legal-core/dist/index.js
claude mcp add legal-citations -- node ./mcp-servers/legal-citations/dist/index.js
claude mcp add entscheidsuche -- node ./mcp-servers/entscheidsuche/dist/index.js
claude mcp add bge-search -- node ./mcp-servers/bge-search/dist/index.js

# Verify installation
claude mcp list
```

### Project-Level Configuration (`.mcp.json`)

Place in project root:

```json
{
  "mcpServers": {
    "legal-core": {
      "command": "node",
      "args": ["./mcp-servers/legal-core/dist/index.js"],
      "env": {
        "ENTSCHEIDSUCHE_API_KEY": "${ENTSCHEIDSUCHE_API_KEY}",
        "BGE_API_KEY": "${BGE_API_KEY}",
        "LOG_LEVEL": "info"
      }
    },
    "legal-citations": {
      "command": "node",
      "args": ["./mcp-servers/legal-citations/dist/index.js"]
    },
    "entscheidsuche": {
      "command": "node",
      "args": ["./mcp-servers/entscheidsuche/dist/index.js"],
      "env": {
        "ENTSCHEIDSUCHE_API_KEY": "${ENTSCHEIDSUCHE_API_KEY}"
      }
    },
    "bge-search": {
      "command": "node",
      "args": ["./mcp-servers/bge-search/dist/index.js"],
      "env": {
        "BGE_API_KEY": "${BGE_API_KEY}"
      }
    }
  }
}
```

---

## 2. Claude Desktop Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "legal-core": {
      "command": "node",
      "args": ["/Users/you/Dev/BetterCallClaude/mcp-servers/legal-core/dist/index.js"],
      "env": {
        "ENTSCHEIDSUCHE_API_KEY": "your-api-key",
        "BGE_API_KEY": "your-api-key"
      }
    },
    "legal-citations": {
      "command": "node",
      "args": ["/Users/you/Dev/BetterCallClaude/mcp-servers/legal-citations/dist/index.js"]
    },
    "entscheidsuche": {
      "command": "node",
      "args": ["/Users/you/Dev/BetterCallClaude/mcp-servers/entscheidsuche/dist/index.js"],
      "env": {
        "ENTSCHEIDSUCHE_API_KEY": "your-api-key"
      }
    },
    "bge-search": {
      "command": "node",
      "args": ["/Users/you/Dev/BetterCallClaude/mcp-servers/bge-search/dist/index.js"],
      "env": {
        "BGE_API_KEY": "your-api-key"
      }
    }
  }
}
```

**Windows path:** `%APPDATA%\Claude\claude_desktop_config.json`

---

## 3. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENTSCHEIDSUCHE_API_KEY` | Yes | API key for entscheidsuche.ch |
| `BGE_API_KEY` | Yes | API key for BGE search |
| `LOG_LEVEL` | No | Logging level (debug, info, warn, error) |
| `CACHE_TTL` | No | Cache time-to-live in seconds |

### Setting Environment Variables

**macOS/Linux:**
```bash
export ENTSCHEIDSUCHE_API_KEY="your-key"
export BGE_API_KEY="your-key"
```

**Or use `.env` file:**
```
ENTSCHEIDSUCHE_API_KEY=your-key
BGE_API_KEY=your-key
LOG_LEVEL=info
```

---

## 4. MCP Server Endpoints

### `legal-core` Server

Primary server exposing all core functionality:

| Tool | Description |
|------|-------------|
| `legal_gateway` | Intelligent routing |
| `legal_research` | Legal source search |
| `legal_draft` | Document drafting |
| `legal_strategy` | Case strategy |
| `legal_case_manage` | Case management |
| `legal_doc_analyze` | Document analysis |
| `agent_*` | All agent tools |
| `workflow_*` | All workflow tools |

### `legal-citations` Server

| Tool | Description |
|------|-------------|
| `legal_citations_validate` | Validate citations |
| `legal_citations_format` | Format to language |
| `legal_citations_convert` | Convert between languages |
| `legal_citations_parse` | Parse components |

### `entscheidsuche` Server

| Tool | Description |
|------|-------------|
| `entscheidsuche_search` | Search court decisions |
| `entscheidsuche_get_document` | Get full decision text |

### `bge-search` Server

| Tool | Description |
|------|-------------|
| `bge_search_search` | Search Federal Supreme Court |
| `bge_search_get_bge` | Get specific BGE decision |

---

## 5. Testing & Debugging

### MCP Inspector

```bash
# Test individual server
npx @modelcontextprotocol/inspector node ./mcp-servers/legal-core/dist/index.js

# Opens web interface at http://localhost:5173
```

### Verify Tools

```bash
# List all registered tools
claude mcp list

# Test specific tool call
echo '{"query": "Art. 97 OR"}' | claude mcp call legal-core legal_research
```

### Debug Logging

```bash
# Enable verbose logging
LOG_LEVEL=debug node ./mcp-servers/legal-core/dist/index.js
```

---

## 6. Build & Development

### Building MCP Servers

```bash
cd mcp-servers/legal-core
npm install
npm run build

# Output in dist/index.js
```

### Development Mode

```bash
npm run dev  # Watch mode with hot reload
```

### Project Structure

```
mcp-servers/
├── legal-core/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── tools/            # Tool implementations
│   │   ├── agents/           # Agent implementations
│   │   ├── workflows/        # Workflow definitions
│   │   └── prompts/          # Prompt templates
│   ├── package.json
│   └── tsconfig.json
├── legal-citations/
├── entscheidsuche/
└── bge-search/
```

---

## 7. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Server not starting | Check Node.js version (≥18 required) |
| API key errors | Verify environment variables are set |
| Tool not found | Run `claude mcp list` to verify registration |
| Timeout errors | Increase timeout in configuration |

### Logs Location

- **Claude Code:** `~/.claude/logs/`
- **Claude Desktop:** `~/Library/Logs/Claude/` (macOS)

---

## 8. Security Considerations

- Store API keys in environment variables, never in code
- Use `.env` files for local development (add to `.gitignore`)
- Rotate API keys periodically
- Enable audit logging in production
- Consider using privacy mode for sensitive matters:

```bash
/legal:research "privileged communication" --privacy-mode
```
