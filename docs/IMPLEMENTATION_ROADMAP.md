# BetterCallClaude Implementation Roadmap

> Gap Analysis & Work Plan to Achieve Cheatsheet v2.1.0 Parity

**Document Version**: 1.0.0
**Created**: January 2026
**Reference**: BetterCallClaude-Cheatsheet v2.1.0

---

## Executive Summary

The current implementation provides **6 MCP tools** in a single consolidated server. The full specification requires **3 separate MCP server namespaces**, **15+ slash commands**, **14 specialized agents**, and **workflow orchestration capabilities**.

### Current State vs Target State

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| MCP Server Namespaces | 1 | 3 | 2 missing |
| MCP Tools | 6 | 8+ | 2+ missing |
| Slash Commands | 6 | 15+ | 9+ missing |
| Specialized Agents | 0 | 14 | 14 missing |
| Workflows | 0 | 4+ | 4+ missing |
| Adversarial System | 0 | 1 | 1 missing |

---

## Phase 1: MCP Server Restructuring

### 1.1 Create Separate MCP Server Namespaces

The cheatsheet specifies 3 distinct MCP server namespaces. Currently all tools are in one server.

#### entscheidsuche MCP Server

**Location**: `mcp-servers/entscheidsuche/`

| Tool | Description | Priority |
|------|-------------|----------|
| `entscheidsuche:search` | Search court decisions across Swiss courts | P0 |
| `entscheidsuche:get_document` | Retrieve full decision document by ID | P0 |

**Parameters for `entscheidsuche:search`**:
```typescript
{
  query: string;           // Search query
  courts?: string[];       // Filter by court codes
  dateFrom?: string;       // Start date (YYYY-MM-DD)
  dateTo?: string;         // End date (YYYY-MM-DD)
  canton?: string;         // Canton code (ZH, BE, GE, etc.)
  legalDomain?: string;    // civil, criminal, administrative, etc.
  language?: 'de' | 'fr' | 'it';
  limit?: number;          // Max results (default: 20)
}
```

**Parameters for `entscheidsuche:get_document`**:
```typescript
{
  documentId: string;      // Decision identifier
  format?: 'full' | 'summary' | 'citations';
}
```

**Work Required**:
- [ ] Create new TypeScript project structure
- [ ] Implement API client for entscheidsuche.ch
- [ ] Build search tool with filtering
- [ ] Build document retrieval tool
- [ ] Add caching layer for responses
- [ ] Write unit tests

---

#### bge-search MCP Server

**Location**: `mcp-servers/bge-search/`

| Tool | Description | Priority |
|------|-------------|----------|
| `bge-search:search` | Search Federal Supreme Court (BGE) decisions | P0 |
| `bge-search:get_bge` | Retrieve specific BGE by citation | P0 |

**Parameters for `bge-search:search`**:
```typescript
{
  query: string;           // Search query
  volume?: number;         // BGE volume number
  section?: 'I' | 'Ia' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  yearFrom?: number;       // Start year
  yearTo?: number;         // End year
  legalDomain?: string;    // Filter by legal domain
  language?: 'de' | 'fr' | 'it';
  limit?: number;
}
```

**Parameters for `bge-search:get_bge`**:
```typescript
{
  citation: string;        // e.g., "BGE 145 III 229"
  includeConsiderations?: boolean;
  language?: 'de' | 'fr' | 'it';
}
```

**Work Required**:
- [ ] Create new TypeScript project structure
- [ ] Implement bger.ch API client
- [ ] Build BGE-specific search with volume/section filtering
- [ ] Build citation-based retrieval
- [ ] Parse and structure BGE content
- [ ] Add caching layer
- [ ] Write unit tests

---

#### legal-citations MCP Server (Refactor)

**Location**: `mcp-servers/legal-citations/` (refactor from current)

Currently implemented as single `legal_citation` tool. Need to split into 4 separate tools:

| Tool | Description | Status |
|------|-------------|--------|
| `legal-citations:validate_citation` | Validate citation format | Partial |
| `legal-citations:format_citation` | Format citation to language | Partial |
| `legal-citations:convert_citation` | Convert between citation formats | Missing |
| `legal-citations:parse_citation` | Parse citation into components | Partial |

**New Tool: `legal-citations:convert_citation`**:
```typescript
{
  citation: string;        // Input citation
  fromFormat: 'bge' | 'statute' | 'doctrine';
  toFormat: 'bge' | 'statute' | 'doctrine';
  targetLanguage?: 'de' | 'fr' | 'it' | 'en';
}
```

**Work Required**:
- [ ] Split current citation.ts into 4 separate tools
- [ ] Implement `convert_citation` logic
- [ ] Add doctrine citation support
- [ ] Improve BGE/ATF/DTF equivalence mapping
- [ ] Add statute cross-reference tables
- [ ] Write unit tests for each tool

---

## Phase 2: Missing Slash Commands

### 2.1 Utility Commands

| Command | Description | Work Required |
|---------|-------------|---------------|
| `/legal:help` | Show command reference | Implement help handler with command catalog |
| `/legal:version` | Show framework version | Version info from package.json + changelog |
| `/legal:validate` | Validate legal document | New validation handler |
| `/legal:format` | Format legal document | New formatting handler |

### 2.2 Jurisdiction Commands

| Command | Description | Work Required |
|---------|-------------|---------------|
| `/legal:federal` | Force federal law mode | Mode switching in gateway |
| `/legal:cantonal` | Force cantonal law mode with canton param | Mode switching + canton validation |
| `/swiss:federal` | Swiss federal law search | Dedicated federal law handler |
| `/swiss:precedent` | Swiss precedent analysis | New precedent analyzer |

### 2.3 Case Management Commands

| Command | Description | Work Required |
|---------|-------------|---------------|
| `/legal:case` | Case management functions | New case management handler |
| `/doc:analyze` | Document analysis | Already implemented, verify completeness |

**Implementation Pattern for Commands**:
```typescript
// src/commands/legal-help.ts
export const legalHelpCommand: CommandDefinition = {
  name: 'legal:help',
  description: 'Show complete BetterCallClaude command reference',
  handler: async (args) => {
    return formatHelpOutput(COMMAND_CATALOG);
  }
};
```

---

## Phase 3: Specialized Agents

### 3.1 Agent Architecture

Each agent needs:
1. **Persona Definition**: Expertise, behavior, output style
2. **Tool Access**: Which MCP tools the agent can use
3. **Prompt Template**: System prompt with domain knowledge
4. **Output Schema**: Structured output format

### 3.2 Agent Specifications

#### Research Agents

| Agent | Domain | Tools Access | Priority |
|-------|--------|--------------|----------|
| `researcher` | Precedent & statutory research | entscheidsuche, bge-search, legal-citations | P0 |
| `citation` | Citation specialist | legal-citations:* | P1 |
| `cantonal-law` | Cantonal law expert | entscheidsuche, cantonal sources | P1 |

**researcher Agent Specification**:
```typescript
{
  name: 'researcher',
  persona: 'Swiss legal research specialist with deep knowledge of BGE precedents',
  capabilities: [
    'precedent_search',
    'statutory_research',
    'citation_verification',
    'comparative_analysis'
  ],
  tools: ['entscheidsuche:search', 'bge-search:search', 'legal-citations:validate'],
  outputFormat: {
    findings: 'structured',
    citations: 'verified',
    confidence: 'scored'
  }
}
```

#### Strategy & Analysis Agents

| Agent | Domain | Tools Access | Priority |
|-------|--------|--------------|----------|
| `strategist` | Litigation strategy | All research tools + strategy | P0 |
| `risk-analyst` | Risk assessment | strategy, research tools | P1 |
| `procedure` | Procedural specialist (ZPO/StPO) | procedure rules database | P2 |

**strategist Agent Specification**:
```typescript
{
  name: 'strategist',
  persona: 'Experienced Swiss litigation strategist',
  capabilities: [
    'case_assessment',
    'risk_analysis',
    'strategy_development',
    'settlement_evaluation'
  ],
  tools: ['legal_strategy', 'entscheidsuche:search', 'bge-search:search'],
  outputFormat: {
    swot: 'structured',
    options: 'ranked',
    recommendation: 'justified'
  }
}
```

#### Drafting Agents

| Agent | Domain | Tools Access | Priority |
|-------|--------|--------------|----------|
| `drafter` | Document generation | legal_draft, legal-citations | P0 |
| `translator` | Legal translation | draft, translation DB | P2 |

#### Compliance Agents

| Agent | Domain | Tools Access | Priority |
|-------|--------|--------------|----------|
| `compliance` | FINMA, AML/KYC | compliance rules DB | P1 |
| `data-protection` | GDPR, nDSG | data protection rules | P1 |

#### Specialized Domain Agents

| Agent | Domain | Tools Access | Priority |
|-------|--------|--------------|----------|
| `fiscal-expert` | Tax law, DTAs | tax law DB | P2 |
| `corporate` | M&A, governance | corporate law DB | P1 |
| `real-estate` | Property law | real estate rules | P2 |

#### Orchestration Agent

| Agent | Domain | Tools Access | Priority |
|-------|--------|--------------|----------|
| `orchestrator` | Multi-agent coordination | All agents | P0 |

---

## Phase 4: Workflow Orchestration

### 4.1 Workflow Engine

**Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│                  Workflow Orchestrator                   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐            │
│  │ Agent 1 │ →  │ Agent 2 │ →  │ Agent 3 │ → Output   │
│  └─────────┘    └─────────┘    └─────────┘            │
│       ↓              ↓              ↓                  │
│  [Context]      [Context]      [Context]               │
│  Handoff        Handoff        Handoff                 │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Predefined Workflows

#### Due Diligence Workflow
```typescript
{
  name: 'due-diligence',
  agents: ['researcher', 'corporate', 'risk-analyst'],
  flow: [
    { agent: 'researcher', task: 'legal_background_check' },
    { agent: 'corporate', task: 'corporate_structure_analysis' },
    { agent: 'risk-analyst', task: 'risk_assessment' }
  ],
  contextPassing: 'sequential',
  outputMerge: 'comprehensive_report'
}
```

#### Litigation Prep Workflow
```typescript
{
  name: 'litigation-prep',
  agents: ['strategist', 'researcher', 'drafter'],
  flow: [
    { agent: 'strategist', task: 'case_strategy' },
    { agent: 'researcher', task: 'precedent_research' },
    { agent: 'drafter', task: 'brief_preparation' }
  ],
  contextPassing: 'sequential',
  outputMerge: 'litigation_package'
}
```

#### Contract Lifecycle Workflow
```typescript
{
  name: 'contract-lifecycle',
  agents: ['drafter', 'data-protection', 'compliance'],
  flow: [
    { agent: 'drafter', task: 'draft_contract' },
    { agent: 'data-protection', task: 'privacy_review' },
    { agent: 'compliance', task: 'regulatory_check' }
  ],
  contextPassing: 'sequential',
  outputMerge: 'reviewed_contract'
}
```

#### Real Estate Closing Workflow
```typescript
{
  name: 'real-estate-closing',
  agents: ['real-estate', 'fiscal-expert', 'drafter'],
  flow: [
    { agent: 'real-estate', task: 'property_analysis' },
    { agent: 'fiscal-expert', task: 'tax_implications' },
    { agent: 'drafter', task: 'closing_documents' }
  ],
  contextPassing: 'sequential',
  outputMerge: 'closing_package'
}
```

### 4.3 Workflow Implementation

**Work Required**:
- [ ] Create WorkflowEngine class
- [ ] Implement context passing between agents
- [ ] Build workflow definition parser
- [ ] Create workflow execution tracker
- [ ] Implement error recovery
- [ ] Add workflow templates
- [ ] Write integration tests

---

## Phase 5: Adversarial Workflow System

### 5.1 Three-Agent Debate System

The adversarial workflow uses three specialized agents for rigorous legal analysis:

```
┌──────────────────────────────────────────────────────────┐
│              Adversarial Analysis Workflow                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│    ┌─────────────┐         ┌─────────────┐              │
│    │  Advocate   │ ←─────→ │  Adversary  │              │
│    │   Agent     │ DEBATE  │   Agent     │              │
│    └──────┬──────┘         └──────┬──────┘              │
│           │                       │                      │
│           └───────────┬───────────┘                      │
│                       ↓                                  │
│              ┌─────────────────┐                         │
│              │  Judicial Agent │                         │
│              │   (Evaluates)   │                         │
│              └────────┬────────┘                         │
│                       ↓                                  │
│              ┌─────────────────┐                         │
│              │  Final Opinion  │                         │
│              └─────────────────┘                         │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Agent Specifications

#### AdvocateAgent
```typescript
{
  name: 'advocate',
  role: 'Argues FOR the client position',
  behavior: [
    'Build strongest possible case',
    'Cite supporting precedents',
    'Identify favorable interpretations',
    'Propose winning arguments'
  ],
  outputFormat: 'advocacy_brief'
}
```

#### AdversaryAgent
```typescript
{
  name: 'adversary',
  role: 'Argues AGAINST the client position',
  behavior: [
    'Attack weak points',
    'Cite contrary precedents',
    'Identify unfavorable interpretations',
    'Expose vulnerabilities'
  ],
  outputFormat: 'opposition_brief'
}
```

#### JudicialAgent
```typescript
{
  name: 'judicial',
  role: 'Evaluates both positions neutrally',
  behavior: [
    'Weigh arguments objectively',
    'Apply Swiss legal methodology',
    'Identify strongest points from each side',
    'Render balanced assessment'
  ],
  outputFormat: 'judicial_opinion'
}
```

### 5.3 Adversarial Workflow Process

```typescript
{
  name: 'adversarial',
  phases: [
    {
      name: 'opening',
      advocate: 'present_case',
      adversary: 'present_opposition'
    },
    {
      name: 'rebuttal',
      advocate: 'respond_to_opposition',
      adversary: 'respond_to_case'
    },
    {
      name: 'closing',
      advocate: 'final_arguments',
      adversary: 'final_arguments'
    },
    {
      name: 'judgment',
      judicial: 'evaluate_and_decide'
    }
  ],
  output: {
    advocateStrength: 'percentage',
    adversaryStrength: 'percentage',
    likelyOutcome: 'assessment',
    keyFactors: 'list',
    recommendation: 'structured'
  }
}
```

**Work Required**:
- [ ] Implement AdvocateAgent with pro-client bias
- [ ] Implement AdversaryAgent with counter-argument focus
- [ ] Implement JudicialAgent with neutral evaluation
- [ ] Build debate round management
- [ ] Create argument tracking and comparison
- [ ] Implement final opinion synthesis
- [ ] Write comprehensive tests

---

## Phase 6: Integration & Testing

### 6.1 Integration Tasks

| Task | Description | Priority |
|------|-------------|----------|
| Gateway Routing | Update gateway to route to all new tools/agents | P0 |
| Context Sharing | Implement context passing between components | P0 |
| Session Management | Maintain state across multi-step workflows | P1 |
| Error Handling | Comprehensive error handling across all components | P1 |
| Logging | Structured logging for debugging and audit | P1 |

### 6.2 Testing Requirements

| Test Type | Coverage | Priority |
|-----------|----------|----------|
| Unit Tests | All handlers and tools | P0 |
| Integration Tests | Cross-component workflows | P0 |
| E2E Tests | Full workflow execution | P1 |
| Performance Tests | Response time and throughput | P2 |

---

## Implementation Timeline

### Sprint 1: MCP Server Restructuring (2 weeks)
- Create entscheidsuche MCP server
- Create bge-search MCP server
- Refactor legal-citations into 4 tools
- Unit tests for all new tools

### Sprint 2: Missing Commands (1 week)
- Implement utility commands (/help, /version)
- Implement jurisdiction commands (/federal, /cantonal)
- Implement case management commands
- Integration tests

### Sprint 3: Core Agents (2 weeks)
- Implement researcher agent
- Implement strategist agent
- Implement drafter agent
- Implement orchestrator agent
- Agent unit tests

### Sprint 4: Specialized Agents (2 weeks)
- Implement compliance agents
- Implement domain-specific agents
- Implement citation agent
- Agent integration tests

### Sprint 5: Workflow Engine (2 weeks)
- Build workflow orchestration engine
- Implement predefined workflows
- Context passing and state management
- Workflow tests

### Sprint 6: Adversarial System (2 weeks)
- Implement Advocate/Adversary/Judicial agents
- Build debate management
- Implement opinion synthesis
- Adversarial workflow tests

### Sprint 7: Integration & Polish (1 week)
- End-to-end testing
- Performance optimization
- Documentation updates
- Bug fixes

**Total Estimated Duration**: 12 weeks

---

## File Structure (Target)

```
bettercallclaude/
├── mcp-servers/
│   ├── legal-core/              # Main gateway server (existing)
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   ├── tools/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── entscheidsuche/          # NEW: Court decision search
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── tools/
│   │   │   │   ├── search.ts
│   │   │   │   └── get-document.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── bge-search/              # NEW: Federal Supreme Court
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── tools/
│   │   │   │   ├── search.ts
│   │   │   │   └── get-bge.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── legal-citations/         # REFACTORED: Citation tools
│       ├── src/
│       │   ├── tools/
│       │   │   ├── validate.ts
│       │   │   ├── format.ts
│       │   │   ├── convert.ts
│       │   │   └── parse.ts
│       │   └── index.ts
│       └── package.json
│
├── agents/                       # NEW: Agent definitions
│   ├── researcher/
│   ├── strategist/
│   ├── drafter/
│   ├── compliance/
│   ├── advocate/
│   ├── adversary/
│   ├── judicial/
│   └── orchestrator/
│
├── workflows/                    # NEW: Workflow definitions
│   ├── due-diligence.ts
│   ├── litigation-prep.ts
│   ├── contract-lifecycle.ts
│   ├── real-estate-closing.ts
│   └── adversarial.ts
│
├── .claude/
│   └── commands/                 # Slash command definitions
│       ├── legal.md
│       ├── legal-research.md
│       ├── legal-draft.md
│       ├── legal-strategy.md
│       ├── legal-help.md
│       ├── legal-version.md
│       ├── legal-federal.md
│       ├── legal-cantonal.md
│       ├── swiss-federal.md
│       ├── swiss-precedent.md
│       └── doc-analyze.md
│
└── docs/
    ├── 01-ARCHITECTURE-SPECIFICATION.md
    ├── 02-TOOL-SPECIFICATIONS.md
    ├── 03-DEVELOPMENT-ROADMAP.md
    ├── 04-API-INTEGRATION-GUIDE.md
    ├── 05-COMMAND-REFERENCE.md
    ├── 06-CONFIGURATION-GUIDE.md
    └── IMPLEMENTATION_ROADMAP.md  # This document
```

---

## Priority Matrix

### P0 - Critical (Must Have)
- entscheidsuche MCP server
- bge-search MCP server
- researcher agent
- strategist agent
- drafter agent
- orchestrator agent
- Workflow engine core

### P1 - Important (Should Have)
- legal-citations refactor
- /legal:help, /legal:version commands
- compliance agent
- data-protection agent
- corporate agent
- Adversarial workflow

### P2 - Nice to Have (Could Have)
- fiscal-expert agent
- real-estate agent
- translator agent
- procedure agent
- cantonal-law agent
- Advanced workflow templates

---

## Success Criteria

### Functional Completeness
- [ ] All 8 MCP tools operational
- [ ] All 15+ slash commands working
- [ ] All 14 agents implemented
- [ ] All 4+ workflows functional
- [ ] Adversarial system complete

### Quality Metrics
- [ ] >90% test coverage
- [ ] <2s average response time
- [ ] Zero critical bugs
- [ ] Documentation complete

### Integration Success
- [ ] Works in Claude Desktop
- [ ] Works in Claude Cowork
- [ ] MCP Inspector validation passes
- [ ] All commands route correctly

---

## Appendix: Current Implementation Status

### Implemented (6 tools in legal-core)

| Tool | Status | Notes |
|------|--------|-------|
| `legal_gateway` | ✅ Complete | Routes to handlers |
| `legal_research` | ✅ Complete | Swiss legal research |
| `legal_citation` | ⚠️ Partial | Needs split into 4 tools |
| `legal_strategy` | ✅ Complete | SWOT and strategy |
| `legal_draft` | ✅ Complete | Document generation |
| `legal_analyze` | ✅ Complete | Document analysis |

### Files Modified/Created

| File | Lines | Status |
|------|-------|--------|
| `src/handlers/gateway.ts` | ~150 | Complete |
| `src/handlers/research.ts` | ~300 | Complete |
| `src/handlers/citation.ts` | 263 | Needs refactor |
| `src/handlers/strategy.ts` | 438 | Complete |
| `src/handlers/draft.ts` | 389 | Complete |
| `src/handlers/analyze.ts` | ~200 | Complete |
| `src/types/index.ts` | ~500 | Complete |
| `src/infrastructure/cache.ts` | ~100 | Complete |

---

*This document serves as the comprehensive implementation roadmap to bring BetterCallClaude MCP to full parity with the Cheatsheet v2.1.0 specification.*
