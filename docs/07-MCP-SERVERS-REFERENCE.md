# 07 - MCP Servers Reference

> Detailed specifications for all BetterCallClaude MCP servers

## Overview

BetterCallClaude is built on four MCP servers:

| Server | Purpose | Tools |
|--------|---------|-------|
| `legal-core` | Main intelligence & routing | 6 core tools + 12 agents + 5 workflows |
| `legal-citations` | Citation handling | 4 tools |
| `entscheidsuche` | Swiss court decisions | 2 tools |
| `bge-search` | Federal Supreme Court | 2 tools |

---

## 1. `entscheidsuche` MCP Server

Swiss federal and cantonal court decision search via entscheidsuche.ch API.

### `entscheidsuche_search`

Search Swiss court decisions.

```typescript
export const entscheidsuche_search = {
  name: "entscheidsuche_search",
  description: "Search Swiss federal and cantonal court decisions via entscheidsuche.ch API",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    jurisdiction: z.enum(["federal", "cantonal", "all"]).default("all"),
    canton: z.string().optional().describe("Canton code (ZH, GE, BE, etc.)"),
    date_from: z.string().optional().describe("Filter from date (YYYY-MM-DD)"),
    date_to: z.string().optional().describe("Filter to date (YYYY-MM-DD)"),
    limit: z.number().min(1).max(100).default(20)
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  }
};
```

**Example:**
```bash
/legal:research "Mietrecht Kündigung" --jurisdiction=cantonal --canton=ZH
```

### `entscheidsuche_get_document`

Retrieve full text of a court decision.

```typescript
export const entscheidsuche_get_document = {
  name: "entscheidsuche_get_document",
  description: "Retrieve the full text of a court decision by ID",
  inputSchema: z.object({
    document_id: z.string().describe("Unique document identifier from search results")
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true
  }
};
```

---

## 2. `bge-search` MCP Server

Direct access to Federal Supreme Court (Bundesgericht) database.

### `bge_search_search`

Search Federal Supreme Court decisions.

```typescript
export const bge_search_search = {
  name: "bge_search_search",
  description: "Search Federal Supreme Court (Bundesgericht) decisions",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    chamber: z.enum(["I", "II", "III", "IV", "V"]).optional().describe("Court chamber"),
    subject_area: z.enum(["civil", "criminal", "public", "social"]).optional(),
    date_from: z.string().optional().describe("Filter from date (YYYY-MM-DD)"),
    date_to: z.string().optional().describe("Filter to date (YYYY-MM-DD)"),
    limit: z.number().default(20)
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true
  }
};
```

**Court Chambers:**
| Chamber | Subject Area |
|---------|--------------|
| I | Public law |
| II | Civil law |
| III | Criminal law |
| IV | Social insurance |
| V | Administrative law |

### `bge_search_get_bge`

Retrieve a specific BGE/ATF/DTF decision by citation.

```typescript
export const bge_search_get_bge = {
  name: "bge_search_get_bge",
  description: "Retrieve a specific BGE/ATF/DTF decision by citation",
  inputSchema: z.object({
    citation: z.string().describe("BGE citation (e.g., 'BGE 147 IV 73', 'ATF 147 IV 73')")
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true
  }
};
```

**Citation Formats:**
- German: `BGE 147 IV 73`
- French: `ATF 147 IV 73`
- Italian: `DTF 147 IV 73`

---

## 3. `legal-citations` MCP Server

Swiss legal citation validation, formatting, and conversion.

### `legal_citations_validate`

Validate a Swiss legal citation.

```typescript
export const legal_citations_validate = {
  name: "legal_citations_validate",
  description: "Validate a Swiss legal citation (BGE/ATF/DTF or statutory)",
  inputSchema: z.object({
    citation: z.string().describe("Citation to validate (e.g., 'BGE 147 IV 73', 'Art. 97 OR')")
  }),
  returns: z.object({
    valid: z.boolean(),
    type: z.enum(["case_law", "statutory", "unknown"]),
    errors: z.array(z.string()).optional()
  })
};
```

### `legal_citations_format`

Format citation to target language.

```typescript
export const legal_citations_format = {
  name: "legal_citations_format",
  description: "Format a citation to target language (DE/FR/IT/EN)",
  inputSchema: z.object({
    citation: z.string().describe("Citation to format"),
    lang: z.enum(["de", "fr", "it", "en"]).describe("Target language")
  }),
  returns: z.object({
    formatted: z.string(),
    original: z.string()
  })
};
```

### `legal_citations_convert`

Convert citation between languages with translations.

```typescript
export const legal_citations_convert = {
  name: "legal_citations_convert",
  description: "Convert a citation between languages with statutory code translations",
  inputSchema: z.object({
    citation: z.string().describe("Citation to convert (e.g., 'Art. 97 OR')"),
    lang: z.enum(["de", "fr", "it", "en"]).describe("Target language")
  }),
  returns: z.object({
    converted: z.string(),
    original: z.string(),
    code_mapping: z.object({
      original_code: z.string(),
      translated_code: z.string()
    }).optional()
  })
};
```

**Code Translations:**
| German | French | Italian | English |
|--------|--------|---------|---------|
| OR | CO | CO | CO |
| ZGB | CC | CC | CC |
| StGB | CP | CP | SCC |
| SchKG | LP | LEF | DEBA |
| BGG | LTF | LTF | FSCA |
| ZPO | CPC | CPC | CPC |
| StPO | CPP | CPP | CrimPC |

### `legal_citations_parse`

Parse citation and extract components.

```typescript
export const legal_citations_parse = {
  name: "legal_citations_parse",
  description: "Parse a citation and extract its structural components",
  inputSchema: z.object({
    citation: z.string().describe("Citation to parse (e.g., 'Art. 97 Abs. 1 lit. a OR')")
  }),
  returns: z.object({
    type: z.enum(["case_law", "statutory"]),
    components: z.object({
      // For case law
      reporter: z.string().optional(),      // BGE, ATF, DTF
      volume: z.number().optional(),
      section: z.string().optional(),       // I, II, III, IV, V
      page: z.number().optional(),
      
      // For statutory
      article: z.number().optional(),
      paragraph: z.number().optional(),     // Abs.
      litera: z.string().optional(),        // lit.
      code: z.string().optional()           // OR, ZGB, etc.
    })
  })
};
```

---

## 4. Tool Annotations

All tools include MCP annotations for client handling:

| Annotation | Description |
|------------|-------------|
| `readOnlyHint` | Tool only reads data, no modifications |
| `destructiveHint` | Tool may cause irreversible changes |
| `idempotentHint` | Safe to retry without side effects |
| `openWorldHint` | Tool interacts with external services |

---

## 5. Error Handling

All tools return standardized error responses:

```typescript
interface ToolError {
  code: string;           // ERROR_CODE
  message: string;        // Human-readable message
  details?: object;       // Additional context
  retryable: boolean;     // Whether retry may succeed
}
```

**Common Error Codes:**
| Code | Description |
|------|-------------|
| `INVALID_CITATION` | Citation format not recognized |
| `NOT_FOUND` | Document/case not found |
| `API_ERROR` | External API failure |
| `RATE_LIMITED` | Too many requests |
| `UNAUTHORIZED` | Invalid API key |

---

## 6. Rate Limits

| Server | Requests/min | Requests/day |
|--------|--------------|--------------|
| `entscheidsuche` | 60 | 10,000 |
| `bge-search` | 30 | 5,000 |
| `legal-citations` | 120 | Unlimited |
| `legal-core` | 120 | Unlimited |

Implement exponential backoff for rate-limited requests.
