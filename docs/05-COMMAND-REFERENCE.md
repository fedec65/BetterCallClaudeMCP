# 05 - Command Reference

> Complete reference for all BetterCallClaude commands, agents, and workflows

## 1. Gateway Command

### `/legal` - Intelligent Routing

```typescript
// tools/gateway.ts
export const legalGatewayTool = {
  name: "legal_gateway",
  description: `Universal entry point for BetterCallClaude. Routes queries to appropriate agents.`,
  inputSchema: z.object({
    query: z.string().describe("Natural language legal query"),
    agent: z.string().optional().describe("Specific agent to route to"),
    workflow: z.string().optional().describe("Workflow to execute"),
    jurisdiction: z.enum(["federal", "cantonal"]).optional(),
    canton: z.string().optional(),
    language: z.enum(["de", "fr", "it", "en"]).default("de")
  })
};
```

**Examples:**
- `/legal "I need precedents for Werkvertrag Mängelhaftung in Zurich"`
- `/legal "Draft a service agreement for software development"`

---

## 2. Core Commands

### `/legal:research`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | required | Legal search query |
| `jurisdiction` | enum | "all" | federal, cantonal, all |
| `canton` | string | - | Canton code (ZH, GE, BE, etc.) |
| `date_from` | string | - | Filter from date (YYYY-MM-DD) |
| `date_to` | string | - | Filter to date |
| `language` | enum | "de" | de, fr, it, en |
| `limit` | number | 20 | 1-100 |

```typescript
export const legalResearchTool = {
  name: "legal_research",
  description: `Search Swiss legal sources for precedents and statutes.`,
  inputSchema: z.object({
    query: z.string(),
    jurisdiction: z.enum(["federal", "cantonal", "all"]).default("all"),
    canton: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    language: z.enum(["de", "fr", "it", "en"]).default("de"),
    limit: z.number().min(1).max(100).default(20)
  }),
  annotations: { readOnlyHint: true, idempotentHint: true }
};
```

### `/legal:draft`

| Parameter | Type | Description |
|-----------|------|-------------|
| `document_type` | string | service_agreement, employment_contract, nda, spa, sha, klageschrift, klageantwort, berufung, beschwerde, rechtsgutachten, memorandum |
| `case_facts` | string | Case facts or context |
| `clauses` | array | Specific clauses to include |
| `language` | enum | de, fr, it, en |
| `jurisdiction` | enum | federal, cantonal |
| `canton` | string | Canton code |

```typescript
export const legalDraftTool = {
  name: "legal_draft",
  inputSchema: z.object({
    document_type: z.string(),
    case_facts: z.string().optional(),
    clauses: z.array(z.string()).optional(),
    language: z.enum(["de", "fr", "it", "en"]).default("de"),
    jurisdiction: z.enum(["federal", "cantonal"]).default("federal"),
    canton: z.string().optional()
  }),
  annotations: { readOnlyHint: false, destructiveHint: false }
};
```

### `/legal:strategy`

| Parameter | Type | Description |
|-----------|------|-------------|
| `case_facts` | string | Case facts and circumstances |
| `dispute_amount` | number | Amount in dispute (CHF) |
| `jurisdiction` | enum | federal, cantonal |
| `canton` | string | Canton code |
| `strategy_type` | enum | aggressive, defensive, settlement |

```typescript
export const legalStrategyTool = {
  name: "legal_strategy",
  inputSchema: z.object({
    case_facts: z.string(),
    dispute_amount: z.number().optional(),
    jurisdiction: z.enum(["federal", "cantonal"]).optional(),
    canton: z.string().optional(),
    strategy_type: z.enum(["aggressive", "defensive", "settlement"]).optional()
  }),
  annotations: { readOnlyHint: true }
};
```

### `/legal:case`

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | enum | create, update, list, get, archive, delete |
| `case_id` | string | Case identifier |
| `name` | string | Case name |
| `description` | string | Case description |
| `status` | enum | active, pending, closed, archived |

### `/doc:analyze`

| Parameter | Type | Description |
|-----------|------|-------------|
| `document` | string | Document content or path |
| `analysis_type` | enum | full, risks, compliance, gaps |
| `frameworks` | array | Compliance frameworks to check |

---

## 3. Citation Commands

| Command | Tool | Description |
|---------|------|-------------|
| `/legal:validate` | `legal_citations_validate` | Validate Swiss citation |
| `/legal:format` | `legal_citations_format` | Format to target language |
| `/legal:convert` | `legal_citations_convert` | Convert between languages |
| `/legal:parse` | `legal_citations_parse` | Extract components |

---

## 4. Swiss-Specific Commands

### `/swiss:federal`

Force Federal Law Mode for queries that should exclusively use federal Swiss law.

```typescript
export const swissFederalTool = {
  name: "swiss_federal",
  description: `Force Federal Law Mode - exclusively search federal statutes (ZGB, OR, StGB, etc.) and BGE/ATF/DTF precedents`,
  inputSchema: z.object({
    query: z.string().describe("Legal query to analyze under federal law"),
    language: z.enum(["de", "fr", "it", "en"]).default("de")
  })
};
```

### `/swiss:precedent`

Swiss Precedent Analysis - deep analysis of BGE/ATF/DTF case law with citation chain tracking.

```typescript
export const swissPrecedentTool = {
  name: "swiss_precedent",
  description: `Analyze Swiss Federal Supreme Court precedents with citation chain tracking`,
  inputSchema: z.object({
    citation: z.string().describe("BGE/ATF/DTF citation (e.g., 'BGE 145 III 229')"),
    analysis_type: z.enum(["summary", "full", "citation_chain", "evolution"]).default("summary"),
    language: z.enum(["de", "fr", "it", "en"]).default("de"),
    include_related: z.boolean().default(true).describe("Include related precedents")
  })
};
```

### `/legal:version`

Display BetterCallClaude version and system status.

```typescript
export const legalVersionTool = {
  name: "legal_version",
  description: `Display BetterCallClaude framework version, status, and available capabilities`,
  inputSchema: z.object({
    verbose: z.boolean().default(false).describe("Show detailed configuration")
  })
};
```

**Example Output:**
```
BetterCallClaude v2.1.0
━━━━━━━━━━━━━━━━━━━━━━
Status: Active
MCP Servers: legal-core, legal-citations, entscheidsuche, bge-search
Agents: 14 available
Workflows: 5 available
Languages: DE, FR, IT, EN
Jurisdictions: Federal + 26 Cantons
```

---

## 5. Agent Commands (`--agent=`)

### Compliance Agent

```typescript
export const agentComplianceTool = {
  name: "agent_compliance",
  description: `FINMA, AML/KYC regulatory checks`,
  inputSchema: z.object({
    document: z.string(),
    frameworks: z.array(z.enum(["FINMA", "AML", "KYC", "GwG", "BEHG", "FIDLEG", "FINIG"])),
    action: z.enum(["assess", "review", "audit"]).default("assess")
  })
};
```

### Data Protection Agent

```typescript
export const agentDataProtectionTool = {
  name: "agent_data_protection",
  description: `GDPR and Swiss nDSG/FADP compliance`,
  inputSchema: z.object({
    document: z.string(),
    frameworks: z.array(z.enum(["GDPR", "nDSG", "FADP", "DSGVO"])).default(["nDSG", "GDPR"]),
    action: z.enum(["review", "audit", "dpia"]).default("review")
  })
};
```

### Risk Analyst Agent

```typescript
export const agentRiskAnalystTool = {
  name: "agent_risk_analyst",
  description: `Case outcome scoring and settlement calculations`,
  inputSchema: z.object({
    case_facts: z.string(),
    dispute_amount: z.number(),
    litigation_costs: z.number().optional(),
    timeline_months: z.number().optional()
  })
};
```

### Procedure Agent

```typescript
export const agentProcedureTool = {
  name: "agent_procedure",
  description: `ZPO/StPO deadlines and procedural rules`,
  inputSchema: z.object({
    query: z.string(),
    procedure_code: z.enum(["ZPO", "StPO", "VwVG", "BGG"]).default("ZPO"),
    canton: z.string().optional(),
    action: z.enum(["query", "calculate_deadline", "list_requirements"]).default("query")
  })
};
```

### Fiscal Expert Agent

```typescript
export const agentFiscalExpertTool = {
  name: "agent_fiscal_expert",
  description: `Tax law and double-taxation agreements`,
  inputSchema: z.object({
    tax_issue: z.string(),
    jurisdiction: z.string().optional(),
    tax_type: z.enum(["corporate", "individual", "vat", "withholding", "stamp"]).optional(),
    dta_countries: z.array(z.string()).optional()
  })
};
```

### Corporate Agent

```typescript
export const agentCorporateTool = {
  name: "agent_corporate",
  description: `M&A, contracts, and governance`,
  inputSchema: z.object({
    transaction_type: z.enum(["m&a", "governance", "contract", "restructuring"]).optional(),
    action: z.enum(["review", "draft", "advise", "due-diligence"]).default("advise"),
    documents: z.array(z.string()).optional(),
    company_type: z.enum(["AG", "GmbH", "Kollektivgesellschaft", "Einzelunternehmen"]).optional()
  })
};
```

### Real Estate Agent

```typescript
export const agentRealEstateTool = {
  name: "agent_real_estate",
  description: `Property transactions and Grundbuch matters`,
  inputSchema: z.object({
    property_type: z.enum(["residential", "commercial", "land", "mixed"]).optional(),
    canton: z.string(),
    action: z.enum(["draft-agreement", "review", "lex-koller-check", "grundbuch-query"]),
    foreign_buyer: z.boolean().optional()
  })
};
```

### Translator Agent

```typescript
export const agentTranslatorTool = {
  name: "agent_translator",
  description: `Legal translations DE/FR/IT/EN`,
  inputSchema: z.object({
    text: z.string(),
    source_lang: z.enum(["de", "fr", "it", "en"]),
    target_lang: z.enum(["de", "fr", "it", "en"]),
    domain: z.enum(["contract", "court", "statutory", "general"]).default("general")
  })
};
```

### Cantonal Law Agent

```typescript
export const agentCantonalLawTool = {
  name: "agent_cantonal_law",
  description: `Specialist for all 26 Swiss cantons`,
  inputSchema: z.object({
    canton: z.enum(["ZH", "BE", "LU", "UR", "SZ", "OW", "NW", "GL", "ZG", "FR",
                    "SO", "BS", "BL", "SH", "AR", "AI", "SG", "GR", "AG", "TG",
                    "TI", "VD", "VS", "NE", "GE", "JU"]),
    query: z.string()
  })
};
```

### Citation Agent

```typescript
export const agentCitationTool = {
  name: "agent_citation",
  description: `Swiss legal citation specialist for validation, formatting, and conversion`,
  inputSchema: z.object({
    citation: z.string().describe("Citation to process (BGE/ATF/DTF, Art. references)"),
    action: z.enum(["validate", "format", "parse", "convert"]).default("validate"),
    target_language: z.enum(["de", "fr", "it", "en"]).optional(),
    output_format: z.enum(["full", "short", "inline"]).default("full")
  })
};
```

### Researcher Agent

```typescript
export const agentResearcherTool = {
  name: "agent_researcher",
  description: `Swiss legal researcher for precedent analysis and statutory research`,
  inputSchema: z.object({
    query: z.string().describe("Legal research query"),
    sources: z.array(z.enum(["bge", "cantonal", "doctrine", "statutes"])).default(["bge", "statutes"]),
    jurisdiction: z.enum(["federal", "cantonal", "all"]).default("all"),
    canton: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    language: z.enum(["de", "fr", "it", "en"]).default("de"),
    limit: z.number().min(1).max(100).default(20)
  })
};
```

### Strategist Agent

```typescript
export const agentStrategistTool = {
  name: "agent_strategist",
  description: `Litigation strategist for case assessment and risk analysis`,
  inputSchema: z.object({
    case_facts: z.string().describe("Case facts and circumstances"),
    strategy_type: z.enum(["aggressive", "defensive", "settlement", "balanced"]).optional(),
    dispute_amount: z.number().optional(),
    jurisdiction: z.enum(["federal", "cantonal"]).optional(),
    canton: z.string().optional(),
    timeline_months: z.number().optional()
  })
};
```

### Drafter Agent

```typescript
export const agentDrafterTool = {
  name: "agent_drafter",
  description: `Legal document drafter for Swiss contracts and court filings`,
  inputSchema: z.object({
    document_type: z.enum([
      "service_agreement", "employment_contract", "nda", "spa", "sha",
      "klageschrift", "klageantwort", "berufung", "beschwerde",
      "rechtsgutachten", "memorandum"
    ]),
    case_facts: z.string().optional(),
    clauses: z.array(z.string()).optional(),
    language: z.enum(["de", "fr", "it", "en"]).default("de"),
    jurisdiction: z.enum(["federal", "cantonal"]).default("federal"),
    canton: z.string().optional()
  })
};
```

### Advocate Agent

```typescript
export const agentAdvocateTool = {
  name: "agent_advocate",
  description: `Advocate agent for adversarial analysis - argues in favor of a position`,
  inputSchema: z.object({
    position: z.string().describe("Position or claim to advocate for"),
    case_facts: z.string().describe("Case facts and context"),
    legal_basis: z.array(z.string()).optional().describe("Supporting legal provisions"),
    strength: z.enum(["aggressive", "moderate", "conservative"]).default("moderate")
  })
};
```

### Adversary Agent

```typescript
export const agentAdversaryTool = {
  name: "agent_adversary",
  description: `Adversary agent for adversarial analysis - challenges and critiques positions`,
  inputSchema: z.object({
    position: z.string().describe("Position or claim to challenge"),
    case_facts: z.string().describe("Case facts and context"),
    counterarguments: z.array(z.string()).optional().describe("Specific points to attack"),
    intensity: z.enum(["thorough", "focused", "devil_advocate"]).default("thorough")
  })
};
```

### Judicial Agent

```typescript
export const agentJudicialTool = {
  name: "agent_judicial",
  description: `Judicial agent for adversarial analysis - evaluates arguments impartially`,
  inputSchema: z.object({
    advocate_position: z.string().describe("Position from advocate agent"),
    adversary_position: z.string().describe("Position from adversary agent"),
    case_facts: z.string().describe("Original case facts"),
    evaluation_criteria: z.array(z.string()).optional().describe("Specific criteria to evaluate"),
    output_format: z.enum(["summary", "detailed", "ruling"]).default("detailed")
  })
};
```

### Orchestrator Agent

```typescript
export const agentOrchestratorTool = {
  name: "agent_orchestrator",
  description: `Multi-agent workflow coordination`,
  inputSchema: z.object({
    workflow: z.string(),
    input: z.string().optional(),
    checkpoints: z.boolean().default(true),
    mode: z.enum(["cautious", "balanced", "autonomous"]).default("cautious")
  })
};
```

---

## 5. Workflows (`--workflow`)

### Due Diligence

```typescript
export const workflowDueDiligenceTool = {
  name: "workflow_due_diligence",
  description: `M&A analysis: researcher → corporate → risk-analyst`,
  inputSchema: z.object({
    documents: z.array(z.string()),
    target_company: z.string().optional(),
    transaction_value: z.number().optional(),
    checkpoints: z.boolean().default(true)
  })
};
```

### Litigation Prep

```typescript
export const workflowLitigationPrepTool = {
  name: "workflow_litigation_prep",
  description: `Case preparation: strategist → researcher → drafter`,
  inputSchema: z.object({
    case_facts: z.string(),
    filing_type: z.enum(["klageschrift", "klageantwort", "berufung"]).optional(),
    jurisdiction: z.string().optional(),
    checkpoints: z.boolean().default(true)
  })
};
```

### Adversarial Analysis

```typescript
export const workflowAdversarialTool = {
  name: "workflow_adversarial",
  description: `Three-agent debate: advocate → adversary → judicial`,
  inputSchema: z.object({
    query: z.string(),
    document: z.string().optional(),
    depth: z.enum(["summary", "standard", "comprehensive"]).default("standard")
  })
};
```

### Contract Lifecycle

```typescript
export const workflowContractLifecycleTool = {
  name: "workflow_contract_lifecycle",
  description: `Full contract workflow: drafter → researcher → compliance → risk-analyst`,
  inputSchema: z.object({
    contract_type: z.enum(["kaufvertrag", "mietvertrag", "arbeitsvertrag", "werkvertrag", "dienstleistungsvertrag", "gesellschaftsvertrag", "other"]),
    parties: z.array(z.object({
      name: z.string(),
      role: z.enum(["party_a", "party_b", "guarantor", "other"])
    })),
    key_terms: z.string().optional(),
    review_scope: z.enum(["drafting", "review", "negotiation", "full_lifecycle"]).default("full_lifecycle"),
    jurisdiction: z.string().optional(),
    language: z.enum(["de", "fr", "it", "en"]).default("de"),
    checkpoints: z.boolean().default(true)
  })
};
```

### Real Estate Closing

```typescript
export const workflowRealEstateClosingTool = {
  name: "workflow_real_estate_closing",
  description: `Property transaction: researcher → corporate → compliance → drafter`,
  inputSchema: z.object({
    transaction_type: z.enum(["kauf", "verkauf", "miete", "stockwerkeigentum", "baurecht", "dienstbarkeit"]),
    property_details: z.object({
      canton: z.string(),
      municipality: z.string().optional(),
      property_type: z.enum(["wohnliegenschaften", "geschaeftsliegenschaften", "landwirtschaft", "bauland", "other"]).optional(),
      grundbuch_nummer: z.string().optional()
    }),
    parties: z.array(z.object({
      name: z.string(),
      role: z.enum(["kaeufer", "verkaeufer", "hypothekar", "other"]),
      nationality: z.string().optional()
    })),
    lex_koller_check: z.boolean().default(true),
    financing_review: z.boolean().default(false),
    checkpoints: z.boolean().default(true)
  })
};
```

---

## 6. Usage Examples

```bash
# Research with filters
/legal:research "Werkvertrag Mängelhaftung" --jurisdiction=ZH --date_from=2020-01-01

# Document references
/legal:strategy @case_brief.md
/doc:analyze @contract.docx

# Workflows with checkpoints
/legal --agent=orchestrator --workflow "Due Diligence" --mode=cautious

# Chain workflows
/legal --workflow strategist,researcher,drafter @case.txt --checkpoints
```
