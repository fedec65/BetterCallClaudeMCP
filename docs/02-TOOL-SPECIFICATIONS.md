# BetterCallClaudeMCP - Tool Specifications

> **Version**: 1.0.0
> **Status**: Planning
> **Last Updated**: January 2026

---

## 1. Overview

This document specifies the 6 MCP tools that comprise the legal-core server. Each tool includes input parameters, output format, persona encoding strategy, and API integrations.

### Tool Inventory Summary

| Tool | Purpose | Persona | Primary APIs |
|------|---------|---------|--------------|
| `legal_gateway` | Intelligent routing | Auto-detection | Internal routing |
| `legal_research` | Search precedents/statutes | Legal Researcher | Fedlex, Bundesgericht, Entscheidsuche |
| `legal_citation` | Validate, format, parse citations | Citation Specialist | Internal validation |
| `legal_strategy` | Case assessment and risk | Case Strategist | Internal analysis |
| `legal_draft` | Generate legal documents | Legal Drafter | Internal generation |
| `legal_analyze` | Analyze existing documents | Document Analyst | Internal analysis |

---

## 2. Tool: `legal_gateway`

### 2.1 Purpose

Intelligent entry point that analyzes user queries and routes them to the appropriate specialized tool. Detects jurisdiction, language, and intent automatically.

### 2.2 Description (Persona Encoding)

```
As the Swiss Legal Gateway, analyze incoming legal queries and intelligently
route them to the appropriate specialized tool. Detect:
- Jurisdiction: federal vs. cantonal (ZH, BE, GE, BS, VD, TI)
- Language: German (DE), French (FR), Italian (IT), English (EN)
- Intent: research, citation, strategy, drafting, or analysis

Provide seamless routing with context preservation across tool calls.
```

### 2.3 Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Natural language legal query |
| `jurisdiction` | enum | No | auto | `federal`, `cantonal`, or `auto` |
| `canton` | string | No | - | Canton code if cantonal (ZH, BE, GE, BS, VD, TI) |
| `language` | enum | No | auto | `de`, `fr`, `it`, `en`, or `auto` |
| `force_tool` | enum | No | - | Force specific tool: `research`, `citation`, `strategy`, `draft`, `analyze` |

### 2.4 Output Schema

```json
{
  "success": true,
  "routing": {
    "detected_intent": "research",
    "detected_jurisdiction": "federal",
    "detected_language": "de",
    "routed_to": "legal_research"
  },
  "result": {
    // Nested result from routed tool
  },
  "metadata": {
    "requestId": "uuid",
    "timestamp": "ISO8601",
    "processingTime": 150
  }
}
```

### 2.5 Routing Logic

| Query Pattern | Detected Intent | Routed To |
|---------------|-----------------|-----------|
| "BGE", "ATF", "DTF", "precedent", "case law" | research | `legal_research` |
| "Art.", "validate citation", "format citation" | citation | `legal_citation` |
| "strategy", "risk", "chances", "settlement" | strategy | `legal_strategy` |
| "draft", "prepare", "write contract" | drafting | `legal_draft` |
| "analyze", "review document", "check contract" | analysis | `legal_analyze` |

### 2.6 API Integrations

- **None** - Internal routing only

---

## 3. Tool: `legal_research`

### 3.1 Purpose

Search Swiss federal and cantonal legal sources for precedents (BGE/ATF/DTF), statutes, and court decisions.

### 3.2 Description (Persona Encoding)

```
As a Swiss Legal Researcher with expertise in federal and cantonal law,
search for precedents (BGE/ATF/DTF), statutes, and legal doctrine. Apply
systematic and teleological interpretation methods. Provide citations in
proper Swiss format with multi-lingual awareness (DE/FR/IT/EN).

Expertise areas:
- Federal Supreme Court decisions (Bundesgericht/Tribunal fédéral/Tribunale federale)
- Cantonal court decisions (ZH, BE, GE, BS, VD, TI)
- Swiss statutes (OR/CO, ZGB/CC, StGB/CP)
- SPARQL queries against Fedlex linked data

Always cite sources with proper Swiss legal citation format.
```

### 3.3 Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query (legal terms, concepts) |
| `jurisdiction` | enum | No | all | `federal`, `cantonal`, or `all` |
| `canton` | string | No | - | Canton code for cantonal search |
| `source` | enum | No | all | `bge`, `cantonal`, `statutes`, `all` |
| `language` | enum | No | de | `de`, `fr`, `it`, `en` |
| `date_from` | string | No | - | Filter from date (YYYY-MM-DD) |
| `date_to` | string | No | - | Filter to date (YYYY-MM-DD) |
| `chamber` | enum | No | - | BGE chamber: `I`, `II`, `III`, `IV`, `V` |
| `limit` | number | No | 20 | Max results (1-100) |

### 3.4 Output Schema

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
        "language": "de",
        "relevanceScore": 0.95,
        "sourceUrl": "https://..."
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
  "metadata": {
    "requestId": "uuid",
    "timestamp": "ISO8601",
    "tool": "legal_research",
    "cached": false,
    "language": "de",
    "processingTime": 234
  }
}
```

### 3.5 API Integrations

| API | Endpoint | Purpose | Rate Limit |
|-----|----------|---------|------------|
| Fedlex SPARQL | `https://fedlex.data.admin.ch/sparqlendpoint` | Federal legislation | 30 req/min |
| Bundesgericht | `https://www.bger.ch/` | Federal court decisions | 20 req/min |
| Entscheidsuche | `https://entscheidsuche.ch/` | Multi-source search | 30 req/min |
| Cantonal Courts | Various per canton | Cantonal decisions | 20 req/min |

### 3.6 Example Requests

**Request 1: BGE Search**
```json
{
  "query": "Vertragshaftung Art. 97 OR",
  "jurisdiction": "federal",
  "source": "bge",
  "language": "de",
  "limit": 10
}
```

**Request 2: Cantonal Search**
```json
{
  "query": "Mietrecht Kündigung",
  "jurisdiction": "cantonal",
  "canton": "ZH",
  "date_from": "2020-01-01",
  "language": "de"
}
```

---

## 4. Tool: `legal_citation`

### 4.1 Purpose

Validate, format, parse, and convert Swiss legal citations across languages.

### 4.2 Description (Persona Encoding)

```
As a Swiss Legal Citation Specialist, validate and format legal citations
according to Swiss standards. Support multi-lingual citation formats:
- German: BGE, Art., Abs., OR, ZGB
- French: ATF, art., al., CO, CC
- Italian: DTF, art., cpv., CO, CC

Operations:
- validate: Check if citation is correctly formatted
- format: Convert to specified language format
- parse: Extract components (volume, chamber, page, article, paragraph)
- convert: Transform between equivalent citations

Ensure citation accuracy >95% for professional legal work.
```

### 4.3 Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `operation` | enum | Yes | - | `validate`, `format`, `parse`, `convert` |
| `citation` | string | Yes | - | Citation to process |
| `target_language` | enum | No | de | Target language for format/convert |
| `strict_mode` | boolean | No | true | Strict validation rules |

### 4.4 Output Schema

**Validate Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "citation": "BGE 147 IV 73",
    "type": "bge",
    "warnings": []
  },
  "metadata": { ... }
}
```

**Parse Response:**
```json
{
  "success": true,
  "data": {
    "original": "Art. 97 Abs. 1 OR",
    "components": {
      "article": 97,
      "paragraph": 1,
      "letter": null,
      "statute": "OR",
      "statute_full": "Obligationenrecht"
    },
    "type": "statute"
  },
  "metadata": { ... }
}
```

**Format Response:**
```json
{
  "success": true,
  "data": {
    "original": "BGE 147 IV 73",
    "formatted": "ATF 147 IV 73",
    "source_language": "de",
    "target_language": "fr"
  },
  "metadata": { ... }
}
```

**Convert Response:**
```json
{
  "success": true,
  "data": {
    "original": "Art. 97 OR",
    "converted": "art. 97 CO",
    "source_language": "de",
    "target_language": "fr",
    "equivalents": {
      "de": "Art. 97 OR",
      "fr": "art. 97 CO",
      "it": "art. 97 CO"
    }
  },
  "metadata": { ... }
}
```

### 4.5 Citation Patterns

| Pattern | Type | Example |
|---------|------|---------|
| `BGE \d+ [IV]+ \d+` | Federal decision (DE) | BGE 147 IV 73 |
| `ATF \d+ [IV]+ \d+` | Federal decision (FR) | ATF 147 IV 73 |
| `DTF \d+ [IV]+ \d+` | Federal decision (IT) | DTF 147 IV 73 |
| `Art\. \d+ .*` | Statute article | Art. 97 OR |
| `art\. \d+ .*` | Statute article (FR/IT) | art. 97 CO |

### 4.6 API Integrations

- **None** - Internal validation and formatting logic

---

## 5. Tool: `legal_strategy`

### 5.1 Purpose

Provide case assessment, risk analysis, and strategic recommendations for Swiss legal matters.

### 5.2 Description (Persona Encoding)

```
As a Swiss Case Strategist with litigation expertise, provide comprehensive
case assessment and strategic planning. Analyze:
- Strengths and weaknesses of legal positions
- Likelihood of success (with probabilistic reasoning)
- Settlement value calculations
- Procedural options and timelines
- Risk factors and mitigation strategies

Apply Swiss legal reasoning: systematic interpretation, Bundesgericht
precedent analysis, and multi-jurisdictional awareness (federal vs. cantonal).

Deliver actionable strategic recommendations with cost-benefit analysis.
```

### 5.3 Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `case_facts` | string | Yes | - | Description of case facts |
| `jurisdiction` | enum | No | federal | `federal` or `cantonal` |
| `canton` | string | No | - | Canton if cantonal matter |
| `legal_area` | enum | No | - | `contract`, `tort`, `corporate`, `employment`, etc. |
| `client_position` | enum | No | - | `plaintiff`, `defendant` |
| `dispute_amount` | number | No | - | Amount in CHF if applicable |
| `deadline_pressure` | boolean | No | false | Time-sensitive matter |
| `language` | enum | No | de | Output language |

### 5.4 Output Schema

```json
{
  "success": true,
  "data": {
    "assessment": {
      "strengths": [
        "Clear contractual breach documented",
        "Supporting BGE precedent: BGE 145 III 229"
      ],
      "weaknesses": [
        "Potential contributory negligence argument",
        "Documentation gaps in damage calculation"
      ],
      "successLikelihood": {
        "estimate": 0.72,
        "confidence": "medium",
        "reasoning": "Strong facts but evidentiary challenges"
      }
    },
    "strategy": {
      "recommended": "pursue_litigation",
      "alternatives": ["settlement_negotiation", "mediation"],
      "reasoning": "Favorable precedent and clear liability"
    },
    "settlement": {
      "recommendedRange": {
        "low": 45000,
        "mid": 65000,
        "high": 85000,
        "currency": "CHF"
      },
      "factors": ["litigation_costs", "time_value", "precedent_strength"]
    },
    "procedural": {
      "recommendedVenue": "Bezirksgericht Zürich",
      "estimatedTimeline": "12-18 months",
      "keyDeadlines": ["Verjährung: 2025-06-15"],
      "estimatedCosts": {
        "courtFees": 8000,
        "legalFees": 25000,
        "currency": "CHF"
      }
    },
    "risks": [
      {
        "risk": "Adverse cost order if unsuccessful",
        "severity": "medium",
        "mitigation": "Strong initial position reduces risk"
      }
    ],
    "nextSteps": [
      "Gather additional documentation on damages",
      "Send formal demand letter (Mahnung)",
      "Prepare for conciliation proceeding (Schlichtung)"
    ]
  },
  "metadata": { ... }
}
```

### 5.5 API Integrations

- **Internal** - Uses `legal_research` for precedent lookup
- **Internal** - Applies risk calculation algorithms

---

## 6. Tool: `legal_draft`

### 6.1 Purpose

Generate Swiss legal documents including contracts, court submissions, and legal opinions.

### 6.2 Description (Persona Encoding)

```
As a Swiss Legal Drafter with expertise in contract drafting and court
submissions, generate professional legal documents. Capabilities:
- Contracts: Service agreements, employment contracts, NDAs, SHA/SPA
- Court submissions: Klageschrift, Klageantwort, Berufung, Beschwerde
- Legal opinions: Rechtsgutachten, Memoranda

Apply Swiss drafting conventions:
- Proper structure and numbering
- Swiss legal terminology (correct for DE/FR/IT)
- Standard clauses adapted to Swiss law
- Professional formatting

Always include appropriate disclaimers and recommend lawyer review.
```

### 6.3 Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `document_type` | enum | Yes | - | See document types below |
| `context` | string | Yes | - | Case facts or requirements |
| `parties` | array | No | - | Party information |
| `jurisdiction` | enum | No | federal | `federal` or `cantonal` |
| `canton` | string | No | ZH | Canton for cantonal matters |
| `language` | enum | No | de | `de`, `fr`, `it` |
| `format` | enum | No | markdown | `markdown`, `plain` |
| `include_comments` | boolean | No | false | Include drafting notes |

### 6.4 Document Types

| Type | Category | Description |
|------|----------|-------------|
| `service_agreement` | Contract | Dienstleistungsvertrag |
| `employment_contract` | Contract | Arbeitsvertrag |
| `nda` | Contract | Geheimhaltungsvereinbarung |
| `purchase_agreement` | Contract | Kaufvertrag |
| `lease_agreement` | Contract | Mietvertrag |
| `klageschrift` | Court | Statement of claim |
| `klageantwort` | Court | Statement of defense |
| `berufung` | Court | Appeal |
| `beschwerde` | Court | Complaint/appeal |
| `rechtsgutachten` | Opinion | Legal opinion |
| `memorandum` | Opinion | Legal memo |

### 6.5 Output Schema

```json
{
  "success": true,
  "data": {
    "document": {
      "type": "service_agreement",
      "title": "Dienstleistungsvertrag",
      "content": "...", // Full document text
      "sections": [
        {"title": "Parteien", "content": "..."},
        {"title": "Vertragsgegenstand", "content": "..."},
        {"title": "Vergütung", "content": "..."}
      ],
      "language": "de"
    },
    "metadata": {
      "wordCount": 1250,
      "generatedAt": "ISO8601",
      "disclaimer": "This document requires professional legal review."
    },
    "recommendations": [
      "Review Art. 394 ff. OR for applicable provisions",
      "Consider adding dispute resolution clause"
    ]
  },
  "metadata": { ... }
}
```

### 6.6 API Integrations

- **Internal** - Uses `legal_research` for relevant precedents
- **Internal** - Applies Swiss document templates

---

## 7. Tool: `legal_analyze`

### 7.1 Purpose

Analyze existing legal documents for issues, risks, and improvement opportunities.

### 7.2 Description (Persona Encoding)

```
As a Swiss Document Analyst with expertise in contract review and legal
due diligence, analyze legal documents for:
- Legal issues and potential problems
- Missing standard clauses
- Ambiguous or problematic language
- Compliance with Swiss law requirements
- Risk assessment and recommendations

Apply thorough Swiss legal analysis:
- Check against mandatory law (zwingendes Recht)
- Identify deviations from standard practice
- Flag unusual or problematic provisions
- Suggest improvements with Swiss legal context

Provide structured analysis with prioritized recommendations.
```

### 7.3 Input Schema

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `document` | string | Yes | - | Document content to analyze |
| `document_type` | enum | No | auto | Expected document type |
| `analysis_depth` | enum | No | standard | `quick`, `standard`, `comprehensive` |
| `focus_areas` | array | No | all | Specific areas to focus on |
| `language` | enum | No | auto | Document language |
| `check_compliance` | boolean | No | true | Check legal compliance |

### 7.4 Focus Areas

| Area | Description |
|------|-------------|
| `liability` | Liability clauses and limitations |
| `termination` | Termination provisions |
| `payment` | Payment terms and conditions |
| `ip` | Intellectual property provisions |
| `confidentiality` | Confidentiality and NDA aspects |
| `dispute` | Dispute resolution clauses |
| `compliance` | Regulatory compliance |

### 7.5 Output Schema

```json
{
  "success": true,
  "data": {
    "summary": {
      "documentType": "service_agreement",
      "language": "de",
      "overallRisk": "medium",
      "issueCount": 5,
      "wordCount": 2450
    },
    "issues": [
      {
        "id": 1,
        "severity": "high",
        "category": "liability",
        "title": "Unlimited liability clause",
        "description": "No limitation of liability for indirect damages",
        "location": "Section 8.2",
        "recommendation": "Add standard liability cap per Art. 100 OR",
        "relevantLaw": "Art. 100 OR"
      },
      {
        "id": 2,
        "severity": "medium",
        "category": "termination",
        "title": "Missing notice period",
        "description": "No termination notice period specified",
        "location": "Section 12",
        "recommendation": "Add 30-day notice period minimum"
      }
    ],
    "missingClauses": [
      "Force majeure clause",
      "Governing law clause",
      "Severability clause"
    ],
    "compliance": {
      "mandatoryLaw": {
        "compliant": true,
        "notes": "No conflicts with zwingendes Recht detected"
      },
      "standardPractice": {
        "deviations": ["Unusual payment terms", "Non-standard warranty period"]
      }
    },
    "recommendations": [
      {
        "priority": "high",
        "action": "Add liability limitation clause",
        "rationale": "Standard Swiss practice, protects both parties"
      }
    ]
  },
  "metadata": { ... }
}
```

### 7.6 API Integrations

- **Internal** - Uses `legal_research` for relevant law lookup
- **Internal** - Applies document analysis algorithms

---

## 8. Error Handling

### 8.1 Standard Error Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `INVALID_INPUT` | Malformed input parameters | No |
| `INVALID_CITATION` | Citation format not recognized | No |
| `JURISDICTION_UNSUPPORTED` | Canton not in supported list | No |
| `QUERY_TOO_BROAD` | Search query needs more specificity | No |
| `RATE_LIMIT_EXCEEDED` | API rate limit reached | Yes |
| `API_TIMEOUT` | External API timeout | Yes |
| `API_UNAVAILABLE` | External service unavailable | Yes |
| `INTERNAL_ERROR` | Unexpected internal error | Yes |

### 8.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CITATION",
    "message": "Citation format not recognized",
    "details": {
      "provided": "BGE 147",
      "expected": "BGE [volume] [chamber] [page]"
    },
    "retryable": false
  },
  "metadata": {
    "requestId": "uuid",
    "timestamp": "ISO8601",
    "tool": "legal_citation"
  }
}
```

---

## 9. Caching Strategy

### 9.1 Cache Configuration per Tool

| Tool | Cache Enabled | TTL | Max Entries |
|------|---------------|-----|-------------|
| `legal_gateway` | No | - | - |
| `legal_research` | Yes | 15 min | 500 |
| `legal_citation` | Yes | 5 min | 200 |
| `legal_strategy` | No | - | - |
| `legal_draft` | No | - | - |
| `legal_analyze` | No | - | - |

### 9.2 Cache Key Generation

```
cache_key = hash(tool_name + sorted(params))
```

---

## 10. Multi-Lingual Support

### 10.1 Language Detection Priority

1. Explicit `language` parameter
2. Citation format detection (BGE→DE, ATF→FR, DTF→IT)
3. Query text analysis
4. Default to German (de)

### 10.2 Response Language

- Output language matches detected/specified input language
- Legal terms use proper terminology for target language
- Citations formatted according to language conventions

---

## 11. Security Considerations

### 11.1 Input Validation

| Tool | Validation Rules |
|------|------------------|
| All | Query length < 10,000 characters |
| All | No script injection in parameters |
| `legal_citation` | Citation pattern matching |
| `legal_research` | Canton whitelist validation |
| `legal_analyze` | Document size < 500KB |

### 11.2 Output Sanitization

- All outputs sanitized for safe display
- No sensitive data logged
- Professional disclaimers included in all substantive outputs

---

## Appendix A: Tool Capability Matrix

| Capability | gateway | research | citation | strategy | draft | analyze |
|------------|---------|----------|----------|----------|-------|---------|
| Multi-lingual | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Jurisdiction-aware | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| External API calls | - | ✓ | - | - | - | - |
| Caching | - | ✓ | ✓ | - | - | - |
| Generates documents | - | - | - | - | ✓ | - |
| Requires document input | - | - | - | - | - | ✓ |

---

**Document Status**: Ready for Review
**Next Document**: Development Roadmap

