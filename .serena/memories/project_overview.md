# BetterCallClaudeMCP - Project Overview

## Purpose
Swiss Legal Intelligence Framework - MCP implementation that brings BetterCallClaude capabilities to Claude Desktop and Claude Cowork.

## Version
**Current**: v2.1.0 (January 2026)

## Core Components

### MCP Tools (6)
| Tool | Purpose |
|------|---------|
| legal_gateway | Intelligent routing to appropriate agent |
| legal_research | Search precedents and statutes |
| legal_citation | Validate, format, parse citations |
| legal_strategy | Case assessment and risk analysis |
| legal_draft | Generate legal documents |
| legal_analyze | Analyze existing documents |

### Agents (17)
- **Research**: researcher, strategist, risk-analyst
- **Drafting**: drafter, compliance, data-protection
- **Specialized**: fiscal-expert, corporate, real-estate, procedure
- **Support**: translator, cantonal-law, citation
- **Adversarial**: advocate, adversary, judicial
- **Orchestration**: orchestrator

### Workflows (5)
- due-diligence
- litigation-prep
- adversarial
- contract-lifecycle
- real-estate-closing

## Key Features
- Multi-lingual: DE/FR/IT/EN
- Citation formats: BGE/ATF/DTF
- 26 Swiss canton coverage
- No API keys required (public Swiss legal APIs)

## Project Structure
```
bettercallclaude/
├── mcp-servers/
│   ├── legal-core/          # Main intelligence server
│   ├── legal-citations/     # Citation tools
│   ├── entscheidsuche/      # Court decision search
│   └── bge-search/          # Federal Supreme Court
├── .claude/commands/        # Slash commands
└── docs/                    # Documentation
```

## Platform Support
- Claude Desktop ✅
- Claude Cowork ✅
- Claude Code ✅

## Entry Point
`/legal [query]` → Intelligent routing to appropriate agent/workflow
