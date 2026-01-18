# BetterCallClaudeMCP

> **Swiss Legal Intelligence Framework for Claude Desktop & Claude Cowork**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/fedec65/BetterCallClaudeMCP)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

---

## 📋 Overview

BetterCallClaudeMCP is a Model Context Protocol (MCP) implementation that brings the BetterCallClaude Swiss Legal Intelligence Framework to Claude Desktop and Claude Cowork. It provides Swiss lawyers with powerful legal research, citation management, case strategy, and document drafting capabilities.

### Key Features

| Feature | Description |
|---------|-------------|
| 🔍 **Legal Research** | Search Swiss federal and cantonal court decisions |
| 📝 **Citation Management** | Validate, format, and parse Swiss legal citations |
| ⚖️ **Case Strategy** | Risk assessment and litigation planning |
| 📄 **Document Drafting** | Generate legal documents with proper formatting |
| 🌍 **Multi-Lingual** | Full support for DE, FR, IT, EN |
| 🏛️ **Multi-Jurisdictional** | Federal law + 6 major cantons (ZH, BE, GE, BS, VD, TI) |

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

## 🛠️ Available Tools

### 1. `legal_gateway`

**Intelligent routing to appropriate legal function**

The gateway automatically detects query intent, jurisdiction, and language to route requests appropriately.

```
Example: "Search for BGE on contractual liability under Art. 97 OR"
→ Routes to legal_research with federal jurisdiction, German language
```

### 2. `legal_research`

**Search Swiss legal precedents and statutes**

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Search query |
| `jurisdiction` | enum | `federal`, `cantonal`, or canton code |
| `date_from` | string | Filter from date (YYYY-MM-DD) |
| `date_to` | string | Filter to date (YYYY-MM-DD) |
| `language` | enum | `de`, `fr`, `it`, `en` |

**Example Request:**
```json
{
  "query": "Werkvertrag Mängelhaftung",
  "jurisdiction": "federal",
  "language": "de"
}
```

### 3. `legal_citation`

**Validate, format, and parse Swiss legal citations**

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | enum | `validate`, `format`, `parse` |
| `citation` | string | The citation to process |
| `target_language` | enum | Target language for formatting |

**Supported Citation Formats:**
- BGE/ATF/DTF (Federal Supreme Court)
- Art. X Abs. Y [Statute] (Statutory references)
- Cantonal court decisions

**Example Request:**
```json
{
  "action": "format",
  "citation": "BGE 147 IV 73",
  "target_language": "fr"
}
```

**Example Response:**
```json
{
  "original": "BGE 147 IV 73",
  "formatted": "ATF 147 IV 73",
  "language": "fr"
}
```

### 4. `legal_strategy`

**Case assessment and risk analysis**

| Parameter | Type | Description |
|-----------|------|-------------|
| `case_facts` | string | Description of case circumstances |
| `dispute_amount` | number | Amount in dispute (CHF) |
| `jurisdiction` | enum | Applicable jurisdiction |

**Output includes:**
- Strengths and weaknesses analysis
- Success probability assessment
- Settlement range recommendation
- Procedural options

### 5. `legal_draft`

**Generate legal documents**

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_type` | string | Type of document to generate |
| `case_facts` | string | Relevant facts for the document |
| `language` | enum | Output language |
| `jurisdiction` | enum | Applicable jurisdiction |

**Supported Document Types:**
- Contracts: `service_agreement`, `employment_contract`, `nda`
- Court Filings: `klageschrift`, `klageantwort`, `berufung`
- Opinions: `rechtsgutachten`, `memorandum`

### 6. `legal_analyze`

**Analyze existing legal documents**

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_content` | string | Document text to analyze |
| `analysis_type` | enum | `risks`, `compliance`, `summary` |

---

## 🌍 Multi-Lingual Support

BetterCallClaudeMCP fully supports Switzerland's official languages plus English.

### Language Detection

The system automatically detects input language based on:
1. Explicit `language` parameter
2. Citation format (BGE → German, ATF → French, DTF → Italian)
3. Query text analysis

### Citation Language Mapping

| German | French | Italian | Description |
|--------|--------|---------|-------------|
| BGE | ATF | DTF | Federal Supreme Court |
| Art. | art. | art. | Article |
| Abs. | al. | cpv. | Paragraph |
| OR | CO | CO | Code of Obligations |
| ZGB | CC | CC | Civil Code |

---

## 🏛️ Jurisdiction Support

### Federal Law (Default)

- Federal statutes (BV, ZGB, OR, StGB, etc.)
- Bundesgericht decisions (BGE/ATF/DTF)
- Federal administrative law

### Cantonal Law (v1.0)

| Canton | Code | Languages | Specializations |
|--------|------|-----------|-----------------|
| Zürich | ZH | DE | Corporate, Litigation |
| Bern | BE | DE/FR | Administrative, Public Law |
| Genève | GE | FR | International Arbitration |
| Basel-Stadt | BS | DE | Life Sciences, Cross-border |
| Vaud | VD | FR | Real Estate, Tourism |
| Ticino | TI | IT | Cross-border (Italy) |

---

## 📊 API Sources

BetterCallClaudeMCP integrates with public Swiss legal APIs:

| API | Purpose | Rate Limit |
|-----|---------|------------|
| [Fedlex SPARQL](https://fedlex.data.admin.ch/sparqlendpoint) | Federal legislation | 30/min |
| [Bundesgericht](https://www.bger.ch/) | Federal court decisions | 20/min |
| [Entscheidsuche](https://entscheidsuche.ch/) | Court decision search | 30/min |
| Cantonal Courts | Cantonal decisions | 20/min |

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
│   ├── clients/
│   │   ├── fedlex.ts         # Fedlex SPARQL client
│   │   ├── bundesgericht.ts  # Federal court client
│   │   ├── entscheidsuche.ts # Decision search client
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
| [Architecture Specification](docs/01-ARCHITECTURE-SPECIFICATION.md) | System design and patterns |
| [Tool Specifications](docs/02-TOOL-SPECIFICATIONS.md) | Detailed tool documentation |
| [Development Roadmap](docs/03-DEVELOPMENT-ROADMAP.md) | Timeline and milestones |
| [API Integration Guide](docs/04-API-INTEGRATION-GUIDE.md) | External API documentation |

---

## 🗺️ Roadmap

### v1.0.0 - Foundation (Q1 2026)
- ✅ Core MCP server infrastructure
- ✅ 6 primary tools
- ✅ Public API integration
- ✅ 6 major cantons support
- ✅ Multi-lingual (DE/FR/IT/EN)

### v1.5.0 - Expansion (Q2 2026)
- 📋 All 26 cantons
- 📋 PDF document generation
- 📋 Advanced caching
- 📋 Performance optimization

### v2.0.0 - Enterprise (Q3 2026)
- 📋 Commercial database integration (Swisslex, Weblaw)
- 📋 Offline caching mode
- 📋 Enterprise security features

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

*BetterCallClaudeMCP v1.0.0 - Swiss Legal Intelligence Framework*
