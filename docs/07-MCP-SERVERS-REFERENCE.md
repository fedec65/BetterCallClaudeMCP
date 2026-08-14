# MCP Servers Reference

Tool inventory for the five MCP servers in this repository. Each section lists
the server's tool names as they are registered with the MCP client plus a
one-line description of each tool. Consult the individual tool source files in
`mcp-servers/<server>/src/tools/` for full input schemas and behaviour.

## 1. `bge-search` (stdio)

Swiss Federal Supreme Court (Bundesgericht) decision search.

| Tool | Description |
|---|---|
| `bge-search:search` | Search BGE/ATF/DTF decisions with optional filters (volume, section, year range, legal domain, language). |
| `bge-search:get_bge` | Retrieve a specific BGE decision by citation (e.g. `BGE 147 IV 73`). |

## 2. `entscheidsuche` (stdio + HTTP)

Swiss federal + cantonal court decision search via entscheidsuche.ch.

| Tool | Description |
|---|---|
| `search_decisions` | Full-text search across federal and cantonal court decisions. Supports Lucene syntax (phrases, booleans, wildcards), all 26 cantons, hierarchy filters, pagination, and aggregations. |
| `search_canton` | Search specific canton(s) with per-canton aggregation. |
| `search_by_case_number` | Look up a decision by case number, docket number or BGE citation (e.g. `BGE 142 III 1`). |
| `get_decision_details` | Fetch the full text of a decision by its entscheidsuche document ID. |
| `list_hierarchy` | Discover available court/chamber hierarchy IDs with hit counts. |
| `list_facets` | Browse the hierarchical facet tree (canton → court → chamber) with localized labels. |
| `analyze_precedent_success_rate` | Analyze historical success rates for a claim type in a legal area. |
| `find_similar_cases` | Find analogous decisions based on a fact pattern or existing decision. |
| `get_legal_provision_interpretation` | Retrieve BGE interpretations of a statutory provision. |
| `get_related_decisions` | Find related decisions via citation graph (stdio only; requires database). |

## 3. `legal-citations` (stdio)

Swiss legal citation validation, parsing, formatting, and conversion.

| Tool | Description |
|---|---|
| `legal-citations:validate_citation` | Validate a BGE, statute, or doctrine citation. |
| `legal-citations:parse_citation` | Parse a citation string into structured components. |
| `legal-citations:format_citation` | Format a citation in a target language (DE/FR/IT/EN) and style (full/short/inline). |
| `legal-citations:convert_citation` | Convert citations between language variants (BGE ↔ ATF ↔ DTF, Art. ↔ art., etc.). |

## 4. `legal-persona` (stdio)

Persona-based legal analysis tools (strategy, drafting, document analysis).

| Tool | Description |
|---|---|
| `legal_strategy` | Produce a case-strategy assessment (strengths, risks, success likelihood, next steps). |
| `legal_draft` | Draft Swiss legal documents (contracts, briefs, memoranda). |
| `legal_analyze` | Analyze a legal document for parties, citations, dates, jurisdiction, and issues. |

## 5. `tas-jurisprudence` (HTTP / Streamable)

TAS/CAS (Court of Arbitration for Sport) jurisprudence search. Unlike the other
four servers, this one runs as an HTTP service (Express + Streamable MCP
transport) and is intended to be deployed remotely — see
[`mcp-servers/tas-jurisprudence/README.md`](../mcp-servers/tas-jurisprudence/README.md).

| Tool | Description |
|---|---|
| `cas_search` | Search CAS decisions by keywords, sport, or year. |
| `cas_get_award` | Retrieve a specific CAS award by reference. |
| `cas_recent` | List recently published CAS decisions. |
| `cas_by_sport` | Browse CAS decisions filtered by sport. |

The MCP endpoint is `POST /tas-jurisprudence/mcp`. A liveness probe is
available at `GET /health`.
