# BetterCallClaudeMCP

> **Swiss Legal Intelligence Framework for Claude Desktop & Claude Cowork**

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/fedec65/BetterCallClaudeMCP)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Cantons](https://img.shields.io/badge/cantons-26-red.svg)](#jurisdiction-support)

---

## 📋 Overview

BetterCallClaudeMCP is a Model Context Protocol (MCP) implementation that brings the BetterCallClaude Swiss Legal Intelligence Framework to Claude Desktop and Claude Cowork. It provides Swiss lawyers with powerful legal research, citation management, case strategy, document drafting, and multi-agent workflow capabilities.

### Key Features

| Feature | Description |
|---------|-------------|
| 🔍 **Legal Research** | Search Swiss federal and cantonal court decisions |
| 📝 **Citation Management** | Validate, format, and parse Swiss legal citations |
| ⚖️ **Case Strategy** | Risk assessment and litigation planning |
| 📄 **Document Drafting** | Generate legal documents with proper formatting |
| 🤖 **17 Specialized Agents** | Domain-specific legal expertise |
| 🔄 **5 Multi-Agent Workflows** | Complex legal task orchestration |
| 🌍 **Multi-Lingual** | Full support for DE, FR, IT, EN |
| 🏛️ **26 Swiss Cantons** | Complete cantonal coverage |

---

## 🚀 Quick Start

### Installation

```bash
# Install via npm (recommended)
npx -y bettercallclaude-mcp

# Or install globally
npm install -g bettercallclaude-mcp
```

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "legal-core": {
      "command": "npx",
      "args": ["-y", "bettercallclaude-mcp"]
    }
  }
}
```

### Claude Cowork Configuration

```json
{
  "mcpServers": {
    "legal-core": {
      "command": "npx",
      "args": ["-y", "bettercallclaude-mcp"]
    }
  }
}
```

### Claude Code Configuration

```bash
# Add the MCP server
claude mcp add legal-core -- npx -y bettercallclaude-mcp
```

---

## 🎯 Core Commands

BetterCallClaudeMCP provides intuitive slash commands for legal work:

| Command | Purpose | Example |
|---------|---------|---------|
| `/legal [query]` | Intelligent gateway - routes to appropriate agent | `/legal Art. 97 OR liability` |
| `/legal:research` | Search Swiss legal sources | `/legal:research BGE contractual liability` |
| `/legal:draft` | Draft legal documents | `/legal:draft employment contract` |
| `/legal:strategy` | Case strategy & risk analysis | `/legal:strategy commercial dispute` |
| `/doc:analyze` | Analyze documents for legal issues | `/doc:analyze @contract.pdf` |
| `/legal:federal` | Force Federal Law mode | `/legal:federal pension law` |
| `/legal:cantonal [code]` | Force cantonal law mode | `/legal:cantonal ZH property` |
| `/legal:help` | Show command reference | `/legal:help` |
| `/legal:version` | Show version information | `/legal:version` |

### Command Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `--lang` | `de`, `fr`, `it`, `en` | Output language |
| `--jurisdiction` | `federal`, canton codes | Legal jurisdiction |
| `--agent` | Agent name | Force specific agent |
| `--workflow` | Workflow name | Execute multi-agent workflow |
| `--format` | `brief`, `detailed`, `memo` | Output format |

---

## 🤖 Specialized Legal Agents

BetterCallClaudeMCP includes 17 specialized agents with domain-specific expertise:

### Research & Analysis Agents

| Agent | Command | Domain |
|-------|---------|--------|
| **Researcher** | `--agent=researcher` | Precedent analysis, statutory research, BGE/ATF/DTF search |
| **Strategist** | `--agent=strategist` | Litigation strategy, case assessment, success probability |
| **Risk Analyst** | `--agent=risk-analyst` | Case outcome scoring, risk matrices, settlement valuation |
| **Citation Specialist** | `--agent=citation` | Citation validation, formatting, cross-reference verification |

### Drafting & Compliance Agents

| Agent | Command | Domain |
|-------|---------|--------|
| **Drafter** | `--agent=drafter` | Contracts, briefs, legal opinions, memoranda |
| **Compliance Officer** | `--agent=compliance` | FINMA regulations, AML/KYC, banking compliance |
| **Data Protection** | `--agent=data-protection` | GDPR, nDSG, privacy impact assessments |

### Specialized Practice Agents

| Agent | Command | Domain |
|-------|---------|--------|
| **Fiscal Expert** | `--agent=fiscal-expert` | Swiss tax law, DTAs, transfer pricing |
| **Corporate** | `--agent=corporate` | M&A, governance, corporate restructuring |
| **Real Estate** | `--agent=real-estate` | Property transactions, Grundbuch, construction law |
| **Procedure Specialist** | `--agent=procedure` | ZPO/StPO deadlines, procedural requirements |
| **Cantonal Law Expert** | `--agent=cantonal-law` | All 26 Swiss cantons, cantonal specifics |

### Support Agents

| Agent | Command | Domain |
|-------|---------|--------|
| **Translator** | `--agent=translator` | Legal translations DE/FR/IT/EN with terminology precision |

### Adversarial Analysis Agents

| Agent | Command | Role |
|-------|---------|------|
| **Advocate** | `--agent=advocate` | Argues FOR a position |
| **Adversary** | `--agent=adversary` | Argues AGAINST a position |
| **Judicial** | `--agent=judicial` | Evaluates arguments impartially |

### Orchestration

| Agent | Command | Function |
|-------|---------|----------|
| **Orchestrator** | `--agent=orchestrator` | Coordinates multi-agent workflows |

---

## 🔄 Multi-Agent Workflows

Complex legal tasks can leverage coordinated multi-agent workflows:

| Workflow | Command | Agent Chain | Use Case |
|----------|---------|-------------|----------|
| **Due Diligence** | `--workflow=due-diligence` | researcher → corporate → risk-analyst | M&A transactions, corporate acquisitions |
| **Litigation Prep** | `--workflow=litigation-prep` | strategist → researcher → drafter | Case preparation, court filings |
| **Adversarial** | `--workflow=adversarial` | advocate → adversary → judicial | Argument stress-testing, position evaluation |
| **Contract Lifecycle** | `--workflow=contract-lifecycle` | drafter → data-protection → compliance | Contract creation with compliance review |
| **Real Estate Closing** | `--workflow=real-estate-closing` | real-estate → fiscal-expert → drafter | Property transactions with tax optimization |

### Workflow Example

```bash
# Execute due diligence workflow for an M&A transaction
/legal "Analyze target company Acme AG for acquisition" --workflow=due-diligence

# Output: Sequential analysis from researcher (legal standing, contracts),
# corporate (governance, structure), and risk-analyst (risk assessment, valuation)
```

---

## 🛠️ MCP Tools

### Core Tools (6)

| Tool | Purpose | Persona Behavior |
|------|---------|------------------|
| `legal_gateway` | Intelligent routing to appropriate function | Auto-detection of intent, jurisdiction, language |
| `legal_research` | Search precedents and statutes | Legal Researcher with systematic methodology |
| `legal_citation` | Validate, format, parse citations | Citation Specialist with multi-lingual awareness |
| `legal_strategy` | Case assessment and risk analysis | Case Strategist with Swiss procedural expertise |
| `legal_draft` | Generate legal documents | Legal Drafter with proper formatting |
| `legal_analyze` | Analyze existing documents | Document Analyst with issue spotting |

### Tool Parameters

#### `legal_research`

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search query |
| `jurisdiction` | enum | `federal`, `cantonal`, or canton code |
| `date_from` | string | Filter from date (YYYY-MM-DD) |
| `date_to` | string | Filter to date (YYYY-MM-DD) |
| `language` | enum | `de`, `fr`, `it`, `en` |

#### `legal_citation`

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | enum | `validate`, `format`, `parse` |
| `citation` | string | The citation to process |
| `target_language` | enum | Target language for formatting |

#### `legal_strategy`

| Parameter | Type | Description |
|-----------|------|-------------|
| `case_facts` | string | Description of case circumstances |
| `dispute_amount` | number | Amount in dispute (CHF) |
| `jurisdiction` | enum | Applicable jurisdiction |

#### `legal_draft`

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_type` | string | Type of document to generate |
| `case_facts` | string | Relevant facts for the document |
| `language` | enum | Output language |
| `jurisdiction` | enum | Applicable jurisdiction |

#### `legal_analyze`

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_content` | string | Document text to analyze |
| `analysis_type` | enum | `risks`, `compliance`, `summary` |

---

## 🌍 Multi-Lingual Support

BetterCallClaudeMCP fully supports Switzerland's official languages plus English.

### Language Detection

The system automatically detects input language based on:
1. Explicit `--lang` parameter
2. Citation format (BGE → German, ATF → French, DTF → Italian)
3. Query text analysis

### Citation Language Mapping

| German | French | Italian | Description |
|--------|--------|---------|-------------|
| BGE | ATF | DTF | Federal Supreme Court |
| Art. | art. | art. | Article |
| Abs. | al. | cpv. | Paragraph |
| lit. | let. | lett. | Letter |
| OR | CO | CO | Code of Obligations |
| ZGB | CC | CC | Civil Code |
| StGB | CP | CP | Criminal Code |
| ZPO | CPC | CPC | Civil Procedure Code |
| StPO | CPP | CPP | Criminal Procedure Code |

---

## 🏛️ Jurisdiction Support

### Federal Law (Default)

- Federal statutes (BV, ZGB, OR, StGB, etc.)
- Bundesgericht decisions (BGE/ATF/DTF)
- Federal administrative law

### All 26 Swiss Cantons

| Canton | Code | Languages | Key Areas |
|--------|------|-----------|-----------|
| Zürich | ZH | DE | Corporate, M&A, Banking |
| Bern | BE | DE/FR | Administrative, Public Law |
| Luzern | LU | DE | Tax, Corporate |
| Uri | UR | DE | Energy, Infrastructure |
| Schwyz | SZ | DE | Tax Planning, Holding |
| Obwalden | OW | DE | Tax, SME |
| Nidwalden | NW | DE | Tax Optimization |
| Glarus | GL | DE | Industrial |
| Zug | ZG | DE | Crypto, Fintech, Holding |
| Fribourg | FR | FR/DE | Agriculture, Education |
| Solothurn | SO | DE | Industry, Manufacturing |
| Basel-Stadt | BS | DE | Pharma, Life Sciences |
| Basel-Landschaft | BL | DE | Pharma, Cross-border |
| Schaffhausen | SH | DE | Industry, Cross-border |
| Appenzell Ausserrhoden | AR | DE | SME, Tourism |
| Appenzell Innerrhoden | AI | DE | Traditional Industries |
| St. Gallen | SG | DE | Textiles, Banking |
| Graubünden | GR | DE/RM/IT | Tourism, Energy |
| Aargau | AG | DE | Industry, Energy |
| Thurgau | TG | DE | Agriculture, Industry |
| Ticino | TI | IT | Cross-border (Italy), Finance |
| Vaud | VD | FR | MedTech, Olympics |
| Valais | VS | FR/DE | Energy, Tourism |
| Neuchâtel | NE | FR | Watchmaking, MedTech |
| Genève | GE | FR | Arbitration, Commodities, Int'l |
| Jura | JU | FR | Watchmaking, Industry |

---

## 📊 API Sources

BetterCallClaudeMCP integrates with public Swiss legal APIs:

| API | Purpose | Rate Limit |
|-----|---------|------------|
| [Fedlex SPARQL](https://fedlex.data.admin.ch/sparqlendpoint) | Federal legislation | 30/min |
| [Bundesgericht](https://www.bger.ch/) | Federal court decisions | 20/min |
| [Entscheidsuche](https://entscheidsuche.ch/) | Court decision search | 30/min |
| [BGE-Search MCP](./mcp-servers/bge-search/) | Targeted Federal Supreme Court search | 20/min |
| Cantonal Courts | All 26 cantonal court systems | 20/min |

**Note**: All APIs are publicly accessible and do not require authentication.

---

## ⚡ Performance

### Caching

- **Type**: In-memory LRU cache
- **Research TTL**: 15 minutes
- **Citations TTL**: 5 minutes
- **Max Entries**: 1000

### Rate Limiting

Built-in rate limiting prevents API overload:
- Automatic request queuing
- Exponential backoff on errors
- Graceful degradation

### Response Times

| Operation | Cached | Uncached |
|-----------|--------|----------|
| Citation validation | < 100ms | < 1s |
| Simple search | < 500ms | < 3s |
| Complex research | < 1s | < 10s |
| Workflow execution | N/A | < 30s |

---

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Build from Source

```bash
# Clone repository
git clone https://github.com/fedec65/BetterCallClaudeMCP.git
cd BetterCallClaudeMCP

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/index.js
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node ./dist/index.js
```

---

## 📁 Project Structure

```
bettercallclaude-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/
│   │   ├── gateway.ts        # Intelligent routing
│   │   ├── research.ts       # Legal research
│   │   ├── citation.ts       # Citation management
│   │   ├── strategy.ts       # Case strategy
│   │   ├── draft.ts          # Document drafting
│   │   └── analyze.ts        # Document analysis
│   ├── agents/
│   │   ├── researcher.ts     # Research agent
│   │   ├── strategist.ts     # Strategy agent
│   │   ├── drafter.ts        # Drafting agent
│   │   ├── compliance.ts     # Compliance agent
│   │   ├── data-protection.ts # Data protection agent
│   │   ├── fiscal-expert.ts  # Tax law agent
│   │   ├── corporate.ts      # Corporate law agent
│   │   ├── real-estate.ts    # Real estate agent
│   │   ├── procedure.ts      # Procedure specialist
│   │   ├── translator.ts     # Translation agent
│   │   ├── cantonal-law.ts   # Cantonal law expert
│   │   ├── risk-analyst.ts   # Risk analysis agent
│   │   ├── citation.ts       # Citation specialist
│   │   ├── advocate.ts       # Adversarial (pro)
│   │   ├── adversary.ts      # Adversarial (contra)
│   │   ├── judicial.ts       # Adversarial (judge)
│   │   └── orchestrator.ts   # Workflow orchestrator
│   ├── workflows/
│   │   ├── due-diligence.ts
│   │   ├── litigation-prep.ts
│   │   ├── adversarial.ts
│   │   ├── contract-lifecycle.ts
│   │   └── real-estate-closing.ts
│   ├── clients/
│   │   ├── fedlex.ts         # Fedlex SPARQL client
│   │   ├── bundesgericht.ts  # Federal court client
│   │   ├── entscheidsuche.ts # Decision search client
│   │   ├── bge-search.ts     # BGE search client
│   │   └── cantonal.ts       # Cantonal courts client
│   └── shared/
│       ├── cache.ts          # LRU cache
│       ├── rate-limiter.ts   # Bottleneck rate limiting
│       └── types.ts          # TypeScript types
├── dist/                     # Compiled output
├── docs/                     # Documentation
├── package.json
└── tsconfig.json
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture Specification](docs/01-ARCHITECTURE-SPECIFICATION.md) | System design, agents, workflows |
| [Tool Specifications](docs/02-TOOL-SPECIFICATIONS.md) | Detailed tool documentation |
| [Development Roadmap](docs/03-DEVELOPMENT-ROADMAP.md) | Timeline and milestones |
| [API Integration Guide](docs/04-API-INTEGRATION-GUIDE.md) | External API documentation |
| [Command Reference](docs/05-COMMAND-REFERENCE.md) | Complete command & parameter reference |
| [Configuration Guide](docs/06-CONFIGURATION-GUIDE.md) | Claude Code/Desktop configuration |

---

## 🗺️ Roadmap

### v2.1.0 - Current Release (January 2026)
- ✅ Core MCP server infrastructure
- ✅ 6 primary MCP tools
- ✅ 17 specialized legal agents
- ✅ 5 multi-agent workflows
- ✅ All 26 Swiss cantons
- ✅ Multi-lingual support (DE/FR/IT/EN)
- ✅ BGE-Search MCP integration
- ✅ Adversarial analysis system

### v2.5.0 - Enhanced Workflows (Q2 2026)
- 📋 Additional workflow templates
- 📋 Custom workflow builder
- 📋 Workflow state persistence
- 📋 Enhanced agent collaboration

### v3.0.0 - Enterprise (Q3 2026)
- 📋 Commercial database integration (Swisslex, Weblaw)
- 📋 PDF document generation
- 📋 Offline caching mode
- 📋 Enterprise security features
- 📋 Multi-tenant support

---

## ⚠️ Disclaimer

**IMPORTANT**: BetterCallClaudeMCP is a legal research and analysis tool.

- All outputs require professional lawyer review
- Does not constitute legal advice
- May contain errors or omissions
- Verify against official sources
- Lawyers maintain full professional responsibility

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📞 Support

- **Documentation**: [/docs](docs/)
- **Issues**: [GitHub Issues](https://github.com/fedec65/BetterCallClaudeMCP/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fedec65/BetterCallClaudeMCP/discussions)

---

**Built for the Swiss legal community with ❤️**

*BetterCallClaudeMCP v2.1.0 - Swiss Legal Intelligence Framework*
