# BetterCallClaudeMCP - Development Roadmap

> **Version**: 1.0.0
> **Status**: Planning
> **Last Updated**: January 2026

---

## 1. Executive Summary

This roadmap outlines the phased development approach for BetterCallClaudeMCP, transforming the existing BetterCallClaude framework into a portable MCP implementation for Claude Desktop and Claude Cowork.

### Release Strategy

| Version | Codename | Focus | Target |
|---------|----------|-------|--------|
| **v1.0.0** | Foundation | Core functionality, 6 tools | Q1 2026 |
| **v1.5.0** | Expansion | All 26 cantons, PDF generation | Q2 2026 |
| **v2.0.0** | Enterprise | Commercial databases, offline mode | Q3 2026 |

---

## 2. Phase 1: Foundation (v1.0.0)

### 2.1 Objectives

- Establish working MCP server infrastructure
- Implement all 6 core tools
- Integrate public Swiss legal APIs
- Support 6 major cantons (ZH, BE, GE, BS, VD, TI)
- Multi-lingual support (DE, FR, IT, EN)

### 2.2 Milestones

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1 TIMELINE                              │
├──────────────────┬──────────────────┬───────────────────────────┤
│   Milestone 1    │   Milestone 2    │      Milestone 3          │
│   Foundation     │   Tools          │      Integration          │
│   Week 1-2       │   Week 3-6       │      Week 7-8             │
└──────────────────┴──────────────────┴───────────────────────────┘
```

#### Milestone 1: Foundation (Week 1-2)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Project Setup | Initialize TypeScript project, configure build | `package.json`, `tsconfig.json` |
| MCP SDK Integration | Set up @modelcontextprotocol/sdk | Working MCP server shell |
| Shared Infrastructure | HTTP client, rate limiter, cache | `src/shared/` module |
| Build Pipeline | Configure tsup bundling | Executable distribution |

**Dependencies**: None (starting point)

**Exit Criteria**:
- [ ] `npm run build` produces working executable
- [ ] MCP Inspector connects successfully
- [ ] Basic tool registration works

#### Milestone 2: Core Tools (Week 3-6)

| Week | Tools | Focus |
|------|-------|-------|
| Week 3 | `legal_gateway` | Routing logic, intent detection |
| Week 4 | `legal_research` | Fedlex SPARQL, Entscheidsuche integration |
| Week 5 | `legal_citation` | Validation, formatting, parsing |
| Week 6 | `legal_strategy`, `legal_draft`, `legal_analyze` | Persona-based tools |

**Per-Tool Development Pattern**:
```
1. Schema definition (Zod)     [0.5 days]
2. API client implementation   [1-2 days]
3. Business logic              [1-2 days]
4. Unit tests                  [0.5 days]
5. Integration tests           [0.5 days]
```

**Dependencies**: Milestone 1 complete

**Exit Criteria**:
- [ ] All 6 tools respond correctly in MCP Inspector
- [ ] Unit test coverage >80%
- [ ] API integrations verified

#### Milestone 3: Integration & Release (Week 7-8)

| Task | Description | Deliverable |
|------|-------------|-------------|
| Claude Desktop Testing | Test in real environment | Verified config |
| Claude Cowork Testing | Test in team environment | Verified deployment |
| Documentation | User guide, installation | `README.md`, `/docs` |
| npm Publishing | Publish to npm registry | `bettercallclaude-mcp` package |
| GitHub Release | Create release with binaries | v1.0.0 release |

**Dependencies**: Milestone 2 complete

**Exit Criteria**:
- [ ] Works in Claude Desktop (macOS, Windows)
- [ ] Works in Claude Cowork
- [ ] `npx -y bettercallclaude-mcp` executes successfully
- [ ] Documentation complete

### 2.3 Technical Specifications

#### API Integrations (v1.0)

| API | Endpoint | Rate Limit | Implementation |
|-----|----------|------------|----------------|
| Fedlex SPARQL | `https://fedlex.data.admin.ch/sparqlendpoint` | 30/min | `FedlexClient` |
| Bundesgericht | `https://www.bger.ch/` | 20/min | `BundesgerichtClient` |
| Entscheidsuche | `https://entscheidsuche.ch/` | 30/min | `EntscheidsucheClient` |
| Cantonal Courts | Various | 20/min | `CantonalClient` |

#### Supported Cantons (v1.0)

| Canton | Code | Language | Court System |
|--------|------|----------|--------------|
| Zürich | ZH | DE | Obergericht, Handelsgericht |
| Bern | BE | DE/FR | Obergericht, Tribunal supérieur |
| Genève | GE | FR | Cour de justice |
| Basel-Stadt | BS | DE | Appellationsgericht |
| Vaud | VD | FR | Tribunal cantonal |
| Ticino | TI | IT | Tribunale d'appello |

### 2.4 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API availability | Low | High | Graceful degradation, retry logic |
| Rate limiting | Medium | Medium | Bottleneck implementation |
| Multi-lingual complexity | Medium | Medium | Comprehensive test suite |
| MCP SDK changes | Low | High | Pin SDK version, monitor updates |

---

## 3. Phase 2: Expansion (v1.5.0)

### 3.1 Objectives

- Expand to all 26 Swiss cantons
- Add PDF document generation
- Implement advanced caching strategies
- Performance optimizations

### 3.2 Milestones

#### Milestone 4: Full Cantonal Coverage (Week 9-12)

| Task | Description |
|------|-------------|
| Cantonal API Research | Document all 26 cantonal court APIs |
| Client Implementation | Create clients for remaining 20 cantons |
| Language Detection | Enhanced auto-detection for cantonal languages |
| Cantonal Precedent Search | Unified search across all cantons |

**New Cantons**:
```
LU, UR, SZ, OW, NW, GL, ZG, FR, SO, BL, SH, AR, AI, SG, GR, AG, TG, VS, NE, JU
```

#### Milestone 5: Document Generation (Week 13-14)

| Feature | Description |
|---------|-------------|
| PDF Generation | Generate legal documents as PDF |
| Template System | Reusable document templates |
| Citation Formatting | Proper Swiss legal citation in documents |
| Multi-lingual Output | Documents in DE/FR/IT |

**Technical Approach**:
- Use `@react-pdf/renderer` or `pdfkit` for PDF generation
- Template engine for document structure
- Maintain legal formatting standards

#### Milestone 6: Performance Optimization (Week 15-16)

| Optimization | Description |
|--------------|-------------|
| Cache Warming | Pre-populate common queries |
| Query Optimization | SPARQL query efficiency |
| Response Compression | Reduce payload sizes |
| Parallel API Calls | Concurrent requests where appropriate |

### 3.3 v1.5 Feature Summary

| Feature | v1.0 | v1.5 |
|---------|------|------|
| Cantons Supported | 6 | 26 |
| PDF Generation | ❌ | ✅ |
| Template System | ❌ | ✅ |
| Cache Warming | ❌ | ✅ |
| Query Optimization | Basic | Advanced |

---

## 4. Phase 3: Enterprise (v2.0.0)

### 4.1 Objectives

- Integrate commercial legal databases (Swisslex, Weblaw)
- Implement optional local LLM support
- Add offline caching mode
- Enterprise security features

### 4.2 Milestones

#### Milestone 7: Commercial Database Integration (Week 17-20)

| Database | Description | Auth Required |
|----------|-------------|---------------|
| Swisslex | Premium legal database | API Key |
| Weblaw | Legal information service | API Key |

**Note**: Commercial integrations are optional and require user-provided credentials.

#### Milestone 8: Offline Mode (Week 21-22)

| Feature | Description |
|---------|-------------|
| Local Cache Persistence | SQLite-based cache |
| Offline Detection | Auto-switch to cached data |
| Cache Sync | Periodic sync when online |
| Cache Management | UI for cache control |

#### Milestone 9: Enterprise Features (Week 23-24)

| Feature | Description |
|---------|-------------|
| Audit Logging | Track all API calls |
| Usage Analytics | Anonymized usage metrics |
| Multi-User Support | Team configurations |
| Advanced Security | Encryption at rest |

### 4.3 v2.0 Feature Summary

| Feature | v1.0 | v1.5 | v2.0 |
|---------|------|------|------|
| Public APIs | ✅ | ✅ | ✅ |
| Commercial DBs | ❌ | ❌ | ✅ |
| Offline Mode | ❌ | ❌ | ✅ |
| Local LLM | ❌ | ❌ | ✅ |
| Audit Logging | ❌ | ❌ | ✅ |

---

## 5. Testing Strategy

### 5.1 Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E ╲           < 10% - Claude Desktop/Cowork
                 ╱──────╲
                ╱        ╲
               ╱Integration╲        ~ 30% - API + MCP Protocol
              ╱────────────╲
             ╱              ╲
            ╱  Unit Tests    ╲      > 60% - Business Logic
           ╱──────────────────╲
```

### 5.2 Test Categories

#### Unit Tests

| Category | Focus | Framework |
|----------|-------|-----------|
| Tool Schemas | Input validation | Vitest + Zod |
| Citation Parser | Format recognition | Vitest |
| Language Detection | Multi-lingual | Vitest |
| Cache Logic | LRU behavior | Vitest |

#### Integration Tests

| Category | Focus | Framework |
|----------|-------|-----------|
| API Clients | External API calls | Vitest + MSW |
| MCP Protocol | Tool registration | MCP Inspector |
| Rate Limiting | Bottleneck behavior | Vitest |

#### E2E Tests

| Category | Focus | Method |
|----------|-------|--------|
| Claude Desktop | Real environment | Manual + Checklist |
| Claude Cowork | Team environment | Manual + Checklist |
| npm Install | Package distribution | CI/CD |

### 5.3 Quality Gates

| Gate | Criteria | Automated |
|------|----------|-----------|
| PR Merge | Tests pass, lint clean | ✅ |
| Release | Coverage >80%, E2E pass | ✅ |
| npm Publish | All gates + manual review | Partial |

---

## 6. Dependency Management

### 6.1 Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | ^1.x | MCP protocol implementation |
| `axios` | ^1.x | HTTP client |
| `bottleneck` | ^2.x | Rate limiting |
| `p-retry` | ^6.x | Retry logic |
| `lru-cache` | ^10.x | In-memory caching |
| `zod` | ^3.x | Schema validation |

### 6.2 Development Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | Type safety |
| `tsup` | Bundling |
| `vitest` | Testing |
| `eslint` | Linting |
| `prettier` | Formatting |

### 6.3 Dependency Graph

```
legal-core
├── @modelcontextprotocol/sdk
│   └── (MCP protocol handling)
├── axios
│   └── (HTTP requests)
├── bottleneck
│   └── (Rate limiting)
├── p-retry
│   └── (Retry logic)
├── lru-cache
│   └── (Caching)
└── zod
    └── (Validation)
```

---

## 7. Distribution Strategy

### 7.1 npm Package

**Package Name**: `bettercallclaude-mcp`

**Installation**:
```bash
# One-time execution
npx -y bettercallclaude-mcp

# Global installation
npm install -g bettercallclaude-mcp
```

**Package Contents**:
```
bettercallclaude-mcp/
├── dist/
│   └── index.js       # Bundled executable
├── package.json
├── README.md
└── LICENSE
```

### 7.2 GitHub Releases

**Release Artifacts**:
- Source code (zip, tar.gz)
- Pre-built binaries (macOS, Windows, Linux)
- Changelog

**Binary Distribution**:
```
bettercallclaude-mcp-v1.0.0-darwin-x64
bettercallclaude-mcp-v1.0.0-darwin-arm64
bettercallclaude-mcp-v1.0.0-win32-x64
bettercallclaude-mcp-v1.0.0-linux-x64
```

### 7.3 Configuration Templates

**Claude Desktop** (`claude_desktop_config.json`):
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

**Claude Cowork**:
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

---

## 8. Success Criteria

### 8.1 v1.0 Release Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Tool Response Time | <3s (cached), <10s (uncached) | Performance tests |
| Test Coverage | >80% | Coverage report |
| Citation Accuracy | >95% | Validation tests |
| Documentation | Complete | Manual review |
| Platform Support | Desktop + Cowork | E2E testing |

### 8.2 Metrics Tracking

| Metric | Tool | Frequency |
|--------|------|-----------|
| npm Downloads | npm stats | Weekly |
| GitHub Stars | GitHub API | Weekly |
| Issue Resolution | GitHub Issues | Ongoing |
| User Feedback | GitHub Discussions | Ongoing |

### 8.3 User Acceptance Criteria

| Criterion | Description |
|-----------|-------------|
| Installation | `npx` works without errors |
| First Query | Legal research returns results |
| Citation Validation | Recognizes Swiss citations |
| Multi-lingual | Responds in requested language |
| Documentation | Clear installation guide |

---

## 9. Risk Management

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| API Deprecation | Low | High | Monitor API changes, abstraction layer | Tech Lead |
| MCP Breaking Changes | Low | High | Pin versions, monitor releases | Tech Lead |
| Performance Issues | Medium | Medium | Profiling, optimization sprints | Dev Team |
| Multi-lingual Bugs | Medium | Medium | Comprehensive test suite | QA |

### 9.2 Project Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| Scope Creep | Medium | Medium | Strict phase boundaries | PM |
| Resource Constraints | Medium | Medium | Prioritization, MVP focus | PM |
| External Dependencies | Low | High | Fallback strategies | Tech Lead |

### 9.3 Contingency Plans

| Scenario | Response |
|----------|----------|
| API becomes unavailable | Implement cached fallback, notify users |
| MCP SDK breaking change | Maintain compatibility layer, delay upgrade |
| Performance degradation | Emergency patch with optimization |
| Security vulnerability | Immediate patch release |

---

## 10. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| MCP | Model Context Protocol |
| BGE | Bundesgerichtsentscheid (Federal Supreme Court decision) |
| ATF | Arrêt du Tribunal fédéral (French equivalent) |
| DTF | Decisione del Tribunale federale (Italian equivalent) |
| SPARQL | Query language for RDF data |

### B. References

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [Fedlex API Documentation](https://fedlex.data.admin.ch/)
- [Entscheidsuche.ch](https://entscheidsuche.ch/)
- [BetterCallClaude GitHub](https://github.com/fedec65/BetterCallClaude)

### C. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2026 | Initial roadmap |

---

**Document Status**: Ready for Review
**Next Document**: Project README
