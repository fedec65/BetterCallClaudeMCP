# BetterCallClaudeMCP - Architecture Specification

> **Version**: 1.0.0
> **Status**: Planning
> **Last Updated**: January 2026

---

## 1. Executive Summary

BetterCallClaudeMCP is a Model Context Protocol (MCP) implementation that ports the BetterCallClaude Swiss Legal Intelligence Framework from Claude Code terminal to Claude Desktop and Claude Cowork.

### Project Goals

| Goal | Description |
|------|-------------|
| **Portability** | Enable BetterCallClaude on Claude Desktop and Claude Cowork |
| **Simplicity** | Minimal tool count (5-7 tools) in a single MCP server |
| **No Authentication** | Leverage public Swiss legal APIs without API keys |
| **Multi-Platform** | Identical functionality across Desktop and Cowork |

---

## 2. High-Level Architecture

### 2.1 Mega-Server Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    LEGAL-CORE MCP SERVER                     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  legal_      │  │  legal_      │  │  legal_      │       │
│  │  research    │  │  citation    │  │  draft       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  legal_      │  │  legal_      │  │  legal_      │       │
│  │  strategy    │  │  analyze     │  │  gateway     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              SHARED INFRASTRUCTURE                   │    │
│  │  • HTTP Client (Axios + Rate Limiting)              │    │
│  │  • In-Memory LRU Cache                              │    │
│  │  • Multi-Lingual Support                            │    │
│  │  • Structured Error Handling                        │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │         PUBLIC SWISS LEGAL APIs          │
        │                                          │
        │  • Fedlex SPARQL Endpoint               │
        │  • Bundesgericht API                    │
        │  • Cantonal Court APIs (all 26 cantons)    │
        │  • Entscheidsuche.ch                    │
        └─────────────────────────────────────────┘
```

### 2.2 Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single Server** | Simplifies installation, reduces complexity |
| **5-7 Tools** | Optimal balance between functionality and usability |
| **Persona in Descriptions** | Tool descriptions encode expert behavior |
| **No API Keys** | All Swiss legal APIs are publicly accessible |
| **In-Memory Cache** | Performance optimization without persistence complexity |

---

## 3. Tool Architecture

### 3.1 Tool Inventory (6 Tools)

| Tool | Purpose | Persona Behavior |
|------|---------|------------------|
| `legal_gateway` | Intelligent routing to appropriate tool | Auto-detection |
| `legal_research` | Search precedents and statutes | Legal Researcher |
| `legal_citation` | Validate, format, parse citations | Citation Specialist |
| `legal_strategy` | Case assessment and risk analysis | Case Strategist |
| `legal_draft` | Generate legal documents | Legal Drafter |
| `legal_analyze` | Analyze existing documents | Document Analyst |

### 3.2 Persona Encoding Strategy

Persona behaviors are encoded directly into MCP tool descriptions:

```
Tool: legal_research
Description: "As a Swiss Legal Researcher with expertise in federal and
cantonal law, search for precedents (BGE/ATF/DTF), statutes, and legal
doctrine. Apply systematic and teleological interpretation methods.
Provide citations in proper Swiss format with multi-lingual awareness
(DE/FR/IT/EN)."
```

This approach:
- Embeds expert behavior without separate persona files
- Works identically in Desktop and Cowork
- Guides Claude's response style and depth

---

## 4. Data Flow Architecture

### 4.1 Request Flow

```
User Query
    │
    ▼
┌─────────────────┐
│  legal_gateway  │ ← Auto-detect jurisdiction, language, intent
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         ROUTING LOGIC                    │
│                                          │
│  • Jurisdiction: federal | cantonal      │
│  • Language: de | fr | it | en           │
│  • Intent: research | draft | analyze    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Specific Tool  │ ← legal_research, legal_draft, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Cache Check    │ ← LRU Cache (5-15 min TTL)
└────────┬────────┘
         │ (cache miss)
         ▼
┌─────────────────┐
│  API Request    │ ← Rate-limited (Bottleneck)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Response       │ ← Standardized JSON format
└─────────────────┘
```

### 4.2 Caching Strategy

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Cache Type** | In-Memory LRU | Simple, no persistence needed |
| **TTL (Research)** | 15 minutes | Legal data changes infrequently |
| **TTL (Citations)** | 5 minutes | Format preferences may vary |
| **Max Entries** | 1000 | Balance memory usage |
| **Cache Key** | `tool:params_hash` | Unique per query |

### 4.3 Rate Limiting

| API | Requests/Min | Rationale |
|-----|--------------|-----------|
| Fedlex SPARQL | 30 | Respectful usage |
| Bundesgericht | 20 | Conservative default |
| Cantonal APIs | 20 | Per-canton limit |
| Entscheidsuche | 30 | Documented limit |

---

## 5. External API Integration

### 5.1 Public APIs (No Authentication Required)

| API | Endpoint | Purpose |
|-----|----------|---------|
| **Fedlex SPARQL** | `https://fedlex.data.admin.ch/sparqlendpoint` | Federal legislation |
| **Bundesgericht** | `https://www.bger.ch/` | Federal court decisions |
| **Entscheidsuche** | `https://entscheidsuche.ch/` | Court decision search |
| **BGE-Search** | bge-search MCP server | Targeted Federal Supreme Court search |
| **Cantonal Courts** | Various per canton | Cantonal decisions (all 26 cantons) |

### 5.2 API Client Architecture

```
┌─────────────────────────────────────────┐
│           BaseAPIClient                  │
│  • Axios HTTP client                    │
│  • Bottleneck rate limiter              │
│  • p-retry with exponential backoff     │
│  • Request/response interceptors        │
│  • NO API KEY REQUIRED                  │
└─────────────────────────────────────────┘
              ▲
              │ extends
    ┌─────────┼─────────┐
    │         │         │
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│Fedlex  │ │BGericht│ │Cantonal│
│Client  │ │Client  │ │Client  │
└────────┘ └────────┘ └────────┘
```

---

## 6. Multi-Lingual Support

### 6.1 Language Detection

```
Input Analysis
    │
    ├─ Explicit parameter: `--lang=fr`
    │
    ├─ Citation format detection:
    │   • "BGE" → German
    │   • "ATF" → French
    │   • "DTF" → Italian
    │
    └─ Query text analysis:
        • Legal terminology patterns
        • Statute abbreviations (OR/CO, ZGB/CC)
```

### 6.2 Response Language Rules

| Priority | Rule |
|----------|------|
| 1 | Explicit `lang` parameter |
| 2 | Detected from query content |
| 3 | Default to German (de) |

### 6.3 Citation Language Mapping

| German | French | Italian | Description |
|--------|--------|---------|-------------|
| BGE | ATF | DTF | Federal Supreme Court |
| Art. | art. | art. | Article |
| Abs. | al. | cpv. | Paragraph |
| OR | CO | CO | Code of Obligations |
| ZGB | CC | CC | Civil Code |

---

## 7. Error Handling

### 7.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "API rate limit reached for Bundesgericht",
    "retryAfter": 60,
    "retryable": true,
    "details": {
      "endpoint": "/decisions/search",
      "limit": 20,
      "window": "60s"
    }
  },
  "metadata": {
    "requestId": "uuid",
    "timestamp": "ISO8601",
    "tool": "legal_research"
  }
}
```

### 7.2 Error Categories

| Code | Description | Retryable |
|------|-------------|-----------|
| `RATE_LIMIT_EXCEEDED` | API rate limit hit | Yes (with delay) |
| `API_TIMEOUT` | Request timed out | Yes |
| `API_UNAVAILABLE` | Service unreachable | Yes |
| `INVALID_CITATION` | Citation format error | No |
| `JURISDICTION_UNSUPPORTED` | Unknown canton | No |
| `QUERY_TOO_BROAD` | Need more specific query | No |

### 7.3 Retry Strategy

```
Attempt 1 → Fail → Wait 1s
Attempt 2 → Fail → Wait 2s
Attempt 3 → Fail → Wait 4s
Attempt 4 → Return error with retry hints
```

---

## 8. Response Format

### 8.1 Standard Success Response

```json
{
  "success": true,
  "data": {
    // Tool-specific response data
  },
  "metadata": {
    "requestId": "uuid",
    "timestamp": "ISO8601",
    "tool": "legal_research",
    "cached": false,
    "language": "de",
    "jurisdiction": "federal",
    "processingTime": 234
  }
}
```

### 8.2 Research Response Example

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "citation": "BGE 147 IV 73",
        "title": "Strafrecht; Betrug",
        "summary": "...",
        "date": "2021-03-15",
        "chamber": "IV",
        "relevanceScore": 0.95
      }
    ],
    "totalResults": 42,
    "query": "Betrug Täuschung",
    "filters": {
      "jurisdiction": "federal",
      "dateFrom": null,
      "dateTo": null
    }
  },
  "metadata": { ... }
}
```

---

## 9. Security Considerations

### 9.1 No Sensitive Data Handling

| Aspect | Approach |
|--------|----------|
| **API Keys** | Not required (public APIs) |
| **User Data** | Not stored or logged |
| **Cache Data** | In-memory only, ephemeral |
| **Network** | HTTPS for all API calls |

### 9.2 Input Validation

| Input | Validation |
|-------|------------|
| Citations | Regex pattern matching |
| Queries | Length limits, sanitization |
| Cantons | All 26 Swiss cantons |
| Languages | Whitelist (de,fr,it,en) |

---

## 10. Platform Compatibility

### 10.1 Claude Desktop

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "legal-core": {
      "command": "npx",
      "args": ["-y", "bettercallclaude-mcp"]
    }
  }
}
```

### 10.2 Claude Cowork

```json
// Cowork MCP configuration
{
  "mcpServers": {
    "legal-core": {
      "command": "npx",
      "args": ["-y", "bettercallclaude-mcp"]
    }
  }
}
```

### 10.3 Claude Code (Development)

```bash
# For development/testing
claude mcp add legal-core -- node ./dist/index.js
```

---

## 11. Dependencies

### 11.1 Runtime Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | MCP protocol implementation | ^1.x |
| `axios` | HTTP client | ^1.x |
| `bottleneck` | Rate limiting | ^2.x |
| `p-retry` | Retry logic | ^6.x |
| `lru-cache` | In-memory caching | ^10.x |
| `zod` | Schema validation | ^3.x |

### 11.2 Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `tsup` | Bundling |
| `vitest` | Testing |
| `eslint` | Linting |

---

## 12. Constraints and Limitations

### 12.1 Known Constraints

| Constraint | Implication |
|------------|-------------|
| **No Offline Mode** | Requires internet connection |
| **Public APIs Only** | No premium legal database access |
| **26 Cantons** | Full cantonal coverage |
| **Real-Time Only** | No persistent storage |

### 12.2 Future Considerations

| Feature | Status |
|---------|--------|
| Swisslex integration | Requires API key handling |
| Offline caching | Not planned |
| Document generation (PDF) | Planned v1.5 |

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| **Tool Response Time** | < 3 seconds (cached), < 10s (uncached) |
| **Cache Hit Rate** | > 40% |
| **Error Rate** | < 5% |
| **Citation Accuracy** | > 95% |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **BGE** | Bundesgerichtsentscheid (Federal Supreme Court decision, German) |
| **ATF** | Arrêt du Tribunal fédéral (Federal Supreme Court decision, French) |
| **DTF** | Decisione del Tribunale federale (Federal Supreme Court decision, Italian) |
| **OR** | Obligationenrecht (Code of Obligations, German) |
| **CO** | Code des obligations (Code of Obligations, French/Italian) |
| **ZGB** | Zivilgesetzbuch (Civil Code, German) |
| **CC** | Code civil (Civil Code, French/Italian) |
| **MCP** | Model Context Protocol |

---

**Document Status**: Ready for Review
**Next Document**: Tool Specifications
