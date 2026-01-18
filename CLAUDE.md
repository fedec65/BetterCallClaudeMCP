# CLAUDE.md - BetterCallClaude

> **Swiss Legal Intelligence Framework** | v2.1.0 | January 2026

## Quick Reference

**Entry Point**: `/legal [query]` → Intelligent routing to appropriate agent/workflow

### Core Commands
| Command | Purpose |
|---------|---------|
| `/legal [query]` | Gateway - routes to appropriate agent |
| `/legal:research` | Search Swiss legal sources |
| `/legal:draft` | Draft legal documents |
| `/legal:strategy` | Case strategy & risk analysis |
| `/doc:analyze` | Analyze documents for legal issues |

### Agents (`--agent=`)
| Agent | Domain |
|-------|--------|
| `researcher` | Precedent & statutory research |
| `strategist` | Litigation strategy |
| `drafter` | Document generation |
| `compliance` | FINMA, AML/KYC |
| `data-protection` | GDPR, nDSG |
| `fiscal-expert` | Tax law, DTAs |
| `corporate` | M&A, governance |
| `orchestrator` | Multi-agent workflows |

### Workflows (`--workflow`)
| Workflow | Agents |
|----------|--------|
| `due-diligence` | researcher → corporate → risk-analyst |
| `litigation-prep` | strategist → researcher → drafter |
| `adversarial` | advocate → adversary → judicial |

## Project Structure

```
bettercallclaude/
├── mcp-servers/
│   ├── legal-core/          # Main intelligence server
│   ├── legal-citations/     # Citation tools
│   ├── entscheidsuche/      # Court decision search
│   └── bge-search/          # Federal Supreme Court
├── .claude/commands/        # Slash commands
└── docs/                    # Detailed documentation
```

## Quick Start

```bash
# Add MCP servers
claude mcp add legal-core -- node ./mcp-servers/legal-core/dist/index.js

# Test
npx @modelcontextprotocol/inspector node ./mcp-servers/legal-core/dist/index.js
```

## Documentation

| Document | Content |
|----------|---------|
| [01-ARCHITECTURE-SPECIFICATION](docs/01-ARCHITECTURE-SPECIFICATION.md) | System architecture, agents, workflows |
| [02-TOOL-SPECIFICATIONS](docs/02-TOOL-SPECIFICATIONS.md) | All MCP tool implementations |
| [03-DEVELOPMENT-ROADMAP](docs/03-DEVELOPMENT-ROADMAP.md) | Development phases & milestones |
| [04-API-INTEGRATION-GUIDE](docs/04-API-INTEGRATION-GUIDE.md) | API endpoints & integration |
| [05-COMMAND-REFERENCE](docs/05-COMMAND-REFERENCE.md) | Complete command & parameter reference |
| [06-CONFIGURATION-GUIDE](docs/06-CONFIGURATION-GUIDE.md) | Claude Code/Desktop configuration |

## Resources

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [Swiss Federal Court](https://www.bger.ch)
- [Entscheidsuche.ch](https://entscheidsuche.ch)
