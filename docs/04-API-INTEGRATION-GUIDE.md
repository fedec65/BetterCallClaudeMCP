# BetterCallClaudeMCP - API Integration Guide

> **Version**: 1.0.0
> **Status**: Planning
> **Last Updated**: January 2026

---

## 1. Executive Summary

This document provides comprehensive integration guidelines for the public Swiss legal APIs used by BetterCallClaudeMCP. All APIs are publicly accessible and do not require authentication, making integration straightforward while maintaining professional-grade rate limiting and error handling.

### API Overview

| API | Endpoint | Purpose | Rate Limit | Auth |
|-----|----------|---------|------------|------|
| **Fedlex SPARQL** | `https://fedlex.data.admin.ch/sparqlendpoint` | Federal legislation | 30/min | None |
| **Bundesgericht** | `https://www.bger.ch/` | Federal court decisions | 20/min | None |
| **Entscheidsuche** | `https://entscheidsuche.ch/` | Court decision search | 30/min | None |
| **Cantonal Courts** | Various per canton | Cantonal decisions | 20/min | None |

---

## 2. Fedlex SPARQL Endpoint

### 2.1 Overview

Fedlex is the official publication platform for Swiss federal law. The SPARQL endpoint provides programmatic access to the Swiss Federal Linked Data Service (LINDAS).

**Endpoint**: `https://fedlex.data.admin.ch/sparqlendpoint`

**Documentation**:
- https://fedlex.data.admin.ch/
- https://lindas.admin.ch/

### 2.2 Connection Details

| Parameter | Value |
|-----------|-------|
| Method | POST |
| Content-Type | `application/x-www-form-urlencoded` |
| Accept | `application/sparql-results+json` |
| Timeout | 30 seconds (recommended) |
| Max Retries | 3 |

### 2.3 Request Format

```
POST /sparqlendpoint HTTP/1.1
Host: fedlex.data.admin.ch
Content-Type: application/x-www-form-urlencoded
Accept: application/sparql-results+json
User-Agent: BetterCallClaude/1.0.0 (Swiss Legal Intelligence)

query=SELECT...
```

### 2.4 SPARQL Query Patterns

#### Search Federal Acts by SR Number

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?act ?title ?srNumber
WHERE {
  ?act a jolux:Act ;
       jolux:classifiedByTaxonomyEntry ?entry ;
       skos:prefLabel ?title .
  ?entry skos:notation ?srNumber .
  FILTER(STRSTARTS(STR(?srNumber), "220"))
}
LIMIT 20
```

#### Search by Title Text

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?act ?title
WHERE {
  ?act a jolux:Act ;
       skos:prefLabel ?title .
  FILTER(CONTAINS(LCASE(STR(?title)), LCASE("obligationenrecht")))
  FILTER(LANG(?title) = "de")
}
LIMIT 20
```

#### Get Specific Article

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX eli: <http://data.europa.eu/eli/ontology#>

SELECT ?article ?text
WHERE {
  ?article eli:is_part_of ?act ;
           eli:article_number "97" ;
           eli:has_text_content ?text .
  ?act jolux:classifiedByTaxonomyEntry ?entry .
  FILTER(CONTAINS(STR(?entry), "220"))
}
```

### 2.5 Response Format

```json
{
  "head": {
    "vars": ["act", "title", "srNumber"]
  },
  "results": {
    "bindings": [
      {
        "act": {
          "type": "uri",
          "value": "https://fedlex.data.admin.ch/eli/cc/27/317_321_377"
        },
        "title": {
          "type": "literal",
          "value": "Obligationenrecht",
          "xml:lang": "de"
        },
        "srNumber": {
          "type": "literal",
          "value": "220"
        }
      }
    ]
  }
}
```

### 2.6 Multi-Lingual Support

Fedlex provides content in all official Swiss languages. Use language filters in SPARQL:

| Language | Filter |
|----------|--------|
| German | `FILTER(LANG(?title) = "de")` |
| French | `FILTER(LANG(?title) = "fr")` |
| Italian | `FILTER(LANG(?title) = "it")` |
| Romansh | `FILTER(LANG(?title) = "rm")` |

### 2.7 Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Process results |
| 400 | Bad Request (invalid SPARQL) | Fix query syntax |
| 429 | Rate Limited | Wait and retry with backoff |
| 500 | Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Retry later |

---

## 3. Bundesgericht API

### 3.1 Overview

The Swiss Federal Supreme Court (Bundesgericht/Tribunal fédéral/Tribunale federale) provides access to its decisions through its website.

**Base URL**: `https://www.bger.ch/`

### 3.2 Search Endpoints

#### Decision Search

| Parameter | Description | Example |
|-----------|-------------|---------|
| `query` | Search terms | `Werkvertrag Mängelhaftung` |
| `lang` | Language | `de`, `fr`, `it` |
| `date_from` | Start date | `2020-01-01` |
| `date_to` | End date | `2024-12-31` |
| `collection` | Decision type | `bge` (published), `weitere` (other) |

### 3.3 BGE Citation Format

Understanding the BGE (Bundesgerichtsentscheid) citation format is critical:

```
BGE [Volume] [Section] [Page]
```

| Component | Description | Example |
|-----------|-------------|---------|
| Volume | Year-based volume number | 147 |
| Section | Court chamber/subject area | IV (Criminal) |
| Page | Starting page | 73 |

**Section Codes**:

| Code | Subject Area (DE) | Subject Area (FR) | Subject Area (IT) |
|------|-------------------|-------------------|-------------------|
| I | Verfassungsrecht | Droit constitutionnel | Diritto costituzionale |
| Ia | Grundrechte | Droits fondamentaux | Diritti fondamentali |
| II | Zivilrecht | Droit civil | Diritto civile |
| III | Schuld-/Sachenrecht | Obligations/Droits réels | Obbligazioni/Diritti reali |
| IV | Strafrecht | Droit pénal | Diritto penale |
| V | Sozialversicherung | Assurances sociales | Assicurazioni sociali |

### 3.4 Response Structure

```json
{
  "decisions": [
    {
      "citation": "BGE 147 IV 73",
      "date": "2021-03-15",
      "title": "Strafrecht; Betrug",
      "summary": "...",
      "chamber": "IV",
      "language": "de",
      "keywords": ["Betrug", "Täuschung", "Vermögensschaden"],
      "url": "https://www.bger.ch/ext/eurospider/live/de/php/clir/http/index.php?..."
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

### 3.5 Language Equivalents

| German (BGE) | French (ATF) | Italian (DTF) |
|--------------|--------------|---------------|
| BGE 147 IV 73 | ATF 147 IV 73 | DTF 147 IV 73 |
| E. 4.2 | consid. 4.2 | consid. 4.2 |
| Erwägung | considérant | considerando |

---

## 4. Entscheidsuche API

### 4.1 Overview

Entscheidsuche.ch is a comprehensive Swiss court decision search engine covering federal and cantonal courts.

**Base URL**: `https://entscheidsuche.ch/`

**Documentation**: https://entscheidsuche.ch/docs

### 4.2 Search Parameters

| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `q` | string | Search query | Yes |
| `court` | string | Court filter | No |
| `canton` | string | Canton code | No |
| `date_from` | string | Start date (YYYY-MM-DD) | No |
| `date_to` | string | End date (YYYY-MM-DD) | No |
| `sort` | string | Sort order | No |
| `limit` | integer | Results per page (max 100) | No |
| `offset` | integer | Pagination offset | No |

### 4.3 Court Identifiers

#### Federal Courts

| Identifier | Court (DE) | Court (FR) |
|------------|------------|------------|
| `bger` | Bundesgericht | Tribunal fédéral |
| `bvger` | Bundesverwaltungsgericht | Tribunal administratif fédéral |
| `bstger` | Bundesstrafgericht | Tribunal pénal fédéral |
| `bpatger` | Bundespatentgericht | Tribunal fédéral des brevets |

#### Cantonal Courts (v1.0 Supported)

| Canton | Identifier | Court |
|--------|------------|-------|
| ZH | `zh_oger` | Obergericht Zürich |
| ZH | `zh_hger` | Handelsgericht Zürich |
| BE | `be_oger` | Obergericht Bern |
| GE | `ge_cj` | Cour de justice Genève |
| BS | `bs_ager` | Appellationsgericht Basel-Stadt |
| VD | `vd_tc` | Tribunal cantonal Vaud |
| TI | `ti_ta` | Tribunale d'appello Ticino |

### 4.4 Response Format

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "bger_147_IV_73",
        "court": "bger",
        "citation": "BGE 147 IV 73",
        "date": "2021-03-15",
        "title": "Strafrecht; Betrug",
        "summary": "...",
        "language": "de",
        "url": "https://entscheidsuche.ch/decision/bger_147_IV_73",
        "relevance_score": 0.95
      }
    ],
    "total": 156,
    "offset": 0,
    "limit": 20
  }
}
```

### 4.5 Full Document Retrieval

```
GET /decision/{document_id}
```

Returns the complete decision text including:
- Full reasoning (Erwägungen/considérants)
- Dispositif (ruling)
- Party information (anonymized)
- Related decisions

---

## 5. Cantonal Court APIs

### 5.1 Overview

Each canton operates its own court system with varying levels of API access. BetterCallClaudeMCP v1.0 supports the six major cantons.

### 5.2 Zürich (ZH)

**Portal**: https://gerichte.zh.ch/

| Court | URL | Description |
|-------|-----|-------------|
| Obergericht | gerichte-zh.ch/obergericht | Supreme cantonal court |
| Handelsgericht | gerichte-zh.ch/handelsgericht | Commercial court |
| Bezirksgerichte | Various | District courts |

**Language**: German
**Specializations**: Corporate law, commercial litigation

### 5.3 Bern (BE)

**Portal**: https://www.justice.be.ch/

| Court | URL | Description |
|-------|-----|-------------|
| Obergericht | justice.be.ch | Supreme cantonal court |
| Verwaltungsgericht | justice.be.ch | Administrative court |

**Languages**: German, French (bilingual canton)
**Specializations**: Administrative law, public law

### 5.4 Genève (GE)

**Portal**: https://justice.ge.ch/

| Court | URL | Description |
|-------|-----|-------------|
| Cour de justice | justice.ge.ch | Supreme cantonal court |
| Tribunal de première instance | justice.ge.ch | First instance court |

**Language**: French
**Specializations**: International arbitration, banking

### 5.5 Basel-Stadt (BS)

**Portal**: https://www.gerichte.bs.ch/

| Court | URL | Description |
|-------|-----|-------------|
| Appellationsgericht | gerichte.bs.ch | Supreme cantonal court |
| Zivilgericht | gerichte.bs.ch | Civil court |

**Language**: German
**Specializations**: Life sciences, cross-border commerce

### 5.6 Vaud (VD)

**Portal**: https://www.vd.ch/tribunaux/

| Court | URL | Description |
|-------|-----|-------------|
| Tribunal cantonal | vd.ch/tribunaux | Supreme cantonal court |

**Language**: French
**Specializations**: Real estate, tourism law

### 5.7 Ticino (TI)

**Portal**: https://www.ti.ch/giustizia/

| Court | URL | Description |
|-------|-----|-------------|
| Tribunale d'appello | ti.ch/giustizia | Supreme cantonal court |
| Preture | ti.ch/giustizia | District courts |

**Language**: Italian
**Specializations**: Cross-border (Italy), banking

---

## 6. Rate Limiting Strategy

### 6.1 Implementation Approach

BetterCallClaudeMCP uses Bottleneck for rate limiting with the following configuration:

| API | Requests/Min | Reservoir | Reservoir Refresh |
|-----|--------------|-----------|-------------------|
| Fedlex SPARQL | 30 | 30 | 60 seconds |
| Bundesgericht | 20 | 20 | 60 seconds |
| Entscheidsuche | 30 | 30 | 60 seconds |
| Cantonal APIs | 20 | 20 | 60 seconds |

### 6.2 Rate Limiter Configuration

```
Rate Limiter Settings:
├── maxConcurrent: 5 (parallel requests)
├── minTime: 2000ms (minimum between requests)
├── reservoir: [per API limit]
├── reservoirRefreshAmount: [per API limit]
└── reservoirRefreshInterval: 60000ms
```

### 6.3 Backoff Strategy

When rate limits are hit:

1. **Attempt 1**: Immediate retry after rate limit window
2. **Attempt 2**: Wait 1 second
3. **Attempt 3**: Wait 2 seconds
4. **Attempt 4**: Wait 4 seconds
5. **Final**: Return error with retry hint

---

## 7. Error Handling

### 7.1 Standard Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "retryAfter": 60,
    "retryable": true,
    "details": {
      "endpoint": "/decisions/search",
      "limit": 20,
      "window": "60s"
    }
  },
  "metadata": {
    "requestId": "uuid-v4",
    "timestamp": "2026-01-15T10:30:00Z",
    "tool": "legal_research"
  }
}
```

### 7.2 Error Codes

| Code | Description | Retryable | User Action |
|------|-------------|-----------|-------------|
| `RATE_LIMIT_EXCEEDED` | API rate limit hit | Yes | Wait for retryAfter |
| `API_TIMEOUT` | Request timed out | Yes | Retry |
| `API_UNAVAILABLE` | Service unreachable | Yes | Retry later |
| `INVALID_QUERY` | Malformed query | No | Fix query syntax |
| `INVALID_CITATION` | Citation format error | No | Correct citation format |
| `JURISDICTION_UNSUPPORTED` | Unknown canton | No | Use supported canton |
| `QUERY_TOO_BROAD` | Too many results | No | Add more specific terms |
| `NO_RESULTS` | No matches found | No | Broaden search |
| `SPARQL_SYNTAX_ERROR` | Invalid SPARQL | No | Fix SPARQL query |

### 7.3 Graceful Degradation

When an API is unavailable:

1. **Cache Check**: Return cached results if available and fresh
2. **Fallback Sources**: Try alternative data sources
3. **Partial Results**: Return available data with degradation notice
4. **User Notification**: Clear message about limited functionality

---

## 8. Caching Strategy

### 8.1 Cache Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Type | In-Memory LRU | Simple, no persistence needed |
| Max Entries | 1000 | Balance memory usage |
| TTL (Research) | 15 minutes | Legal data changes infrequently |
| TTL (Citations) | 5 minutes | Format preferences may vary |

### 8.2 Cache Key Structure

```
{tool}:{hash(params)}
```

Examples:
- `legal_research:a1b2c3d4` (research query hash)
- `legal_citation:validate:e5f6g7h8` (citation hash)
- `bge_search:i9j0k1l2` (BGE search hash)

### 8.3 Cache Invalidation

- **Time-based**: Automatic expiration after TTL
- **Manual**: On API update notifications (if available)
- **Size-based**: LRU eviction when max entries reached

---

## 9. Data Transformation

### 9.1 Citation Normalization

Input citations are normalized to a standard format:

| Input | Normalized |
|-------|------------|
| `BGE147IV73` | `BGE 147 IV 73` |
| `ATF 147 IV 73` | `BGE 147 IV 73` (internal) |
| `Art.97OR` | `Art. 97 OR` |
| `art. 97 al. 1 CO` | `Art. 97 Abs. 1 OR` (German) |

### 9.2 Multi-Lingual Mapping

| German | French | Italian |
|--------|--------|---------|
| BGE | ATF | DTF |
| Art. | art. | art. |
| Abs. | al. | cpv. |
| lit. | let. | lett. |
| OR | CO | CO |
| ZGB | CC | CC |
| StGB | CP | CP |

### 9.3 Date Normalization

All dates normalized to ISO 8601 format:

| Input | Normalized |
|-------|------------|
| `15.03.2024` | `2024-03-15` |
| `15/03/2024` | `2024-03-15` |
| `March 15, 2024` | `2024-03-15` |

---

## 10. Security Considerations

### 10.1 No Authentication Required

All APIs are publicly accessible. No API keys or tokens are stored.

### 10.2 Request Security

| Measure | Implementation |
|---------|----------------|
| HTTPS | All API calls use HTTPS |
| Input Validation | All user input sanitized |
| Query Limits | Maximum query length enforced |
| Timeout | All requests have timeout limits |

### 10.3 Data Privacy

| Aspect | Approach |
|--------|----------|
| User Data | Not stored or logged |
| Cache Data | In-memory only, ephemeral |
| Query Logging | No query logging |
| Anonymization | No personal data in queries |

---

## 11. Performance Optimization

### 11.1 Request Optimization

| Technique | Benefit |
|-----------|---------|
| Connection Reuse | Reduced latency |
| Request Batching | Fewer round trips |
| Parallel Requests | Faster multi-source queries |
| Response Compression | Reduced bandwidth |

### 11.2 Response Targets

| Metric | Target |
|--------|--------|
| Cached Response | < 100ms |
| Simple Query | < 3 seconds |
| Complex Query | < 10 seconds |
| Multi-Source | < 15 seconds |

### 11.3 Cache Hit Targets

| Operation | Target Cache Hit Rate |
|-----------|----------------------|
| Citation Validation | > 60% |
| Research Queries | > 40% |
| Document Retrieval | > 50% |

---

## 12. Testing Strategy

### 12.1 API Integration Tests

| Test Type | Description | Coverage |
|-----------|-------------|----------|
| Connection | Verify API reachability | All endpoints |
| Authentication | Confirm no auth required | All APIs |
| Rate Limiting | Test throttling behavior | All APIs |
| Error Handling | Verify error responses | All error codes |
| Response Format | Validate JSON structure | All endpoints |

### 12.2 Mock Data

For development and testing without API calls:

- Sample BGE decisions (10+ cases)
- Sample cantonal decisions (per canton)
- Sample SPARQL responses
- Error response examples

### 12.3 Test Coverage Requirements

| Area | Target |
|------|--------|
| API Client | > 80% |
| Response Parsing | > 90% |
| Error Handling | > 85% |
| Cache Logic | > 90% |

---

## 13. Monitoring and Observability

### 13.1 Metrics to Track

| Metric | Description |
|--------|-------------|
| Request Count | Total API requests per endpoint |
| Error Rate | Percentage of failed requests |
| Latency | Response time distribution |
| Cache Hit Rate | Percentage of cache hits |
| Rate Limit Events | Count of rate limit triggers |

### 13.2 Health Checks

| Check | Frequency | Timeout |
|-------|-----------|---------|
| Fedlex SPARQL | 5 minutes | 5 seconds |
| Bundesgericht | 5 minutes | 5 seconds |
| Entscheidsuche | 5 minutes | 5 seconds |
| Cantonal APIs | 15 minutes | 10 seconds |

### 13.3 Alerting Thresholds

| Condition | Severity |
|-----------|----------|
| API unavailable > 5 min | High |
| Error rate > 10% | Medium |
| Latency p95 > 10s | Medium |
| Cache hit rate < 20% | Low |

---

## 14. Future Considerations

### 14.1 v1.5 Expansion (Q2 2026)

- Additional 20 cantonal APIs
- Enhanced SPARQL queries
- Document generation APIs

### 14.2 v2.0 Enterprise (Q3 2026)

- Commercial database integration (Swisslex, Weblaw)
- API key management for premium sources
- Enhanced caching with persistence

---

## Appendix A: SPARQL Query Templates

### A.1 Search Federal Acts

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT DISTINCT ?act ?title ?srNumber
WHERE {
  ?act a jolux:Act ;
       skos:prefLabel ?title ;
       jolux:classifiedByTaxonomyEntry ?entry .
  ?entry skos:notation ?srNumber .
  FILTER(LANG(?title) = "{LANGUAGE}")
  FILTER(CONTAINS(LCASE(STR(?title)), LCASE("{SEARCH_TERM}")))
}
ORDER BY ?srNumber
LIMIT {LIMIT}
OFFSET {OFFSET}
```

### A.2 Get Act by SR Number

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX eli: <http://data.europa.eu/eli/ontology#>

SELECT ?act ?title ?dateDocument ?inForce
WHERE {
  ?act a jolux:Act ;
       skos:prefLabel ?title ;
       jolux:classifiedByTaxonomyEntry ?entry ;
       eli:date_document ?dateDocument .
  ?entry skos:notation "{SR_NUMBER}" .
  OPTIONAL { ?act eli:in_force ?inForce }
  FILTER(LANG(?title) = "{LANGUAGE}")
}
```

### A.3 Get Article Content

```sparql
PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX eli: <http://data.europa.eu/eli/ontology#>

SELECT ?article ?articleNumber ?text
WHERE {
  ?act jolux:classifiedByTaxonomyEntry ?entry .
  ?entry skos:notation "{SR_NUMBER}" .
  ?article eli:is_part_of ?act ;
           eli:article_number ?articleNumber .
  OPTIONAL { ?article eli:has_text_content ?text }
  FILTER(?articleNumber = "{ARTICLE_NUMBER}")
}
```

---

## Appendix B: Response Examples

### B.1 Successful Research Response

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "citation": "BGE 147 IV 73",
        "title": "Strafrecht; Betrug",
        "summary": "Anforderungen an die Täuschungshandlung...",
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
  "metadata": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-01-15T10:30:00Z",
    "tool": "legal_research",
    "cached": false,
    "language": "de",
    "jurisdiction": "federal",
    "processingTime": 234
  }
}
```

### B.2 Citation Validation Response

```json
{
  "success": true,
  "data": {
    "valid": true,
    "citation": "BGE 147 IV 73",
    "components": {
      "type": "bge",
      "volume": 147,
      "section": "IV",
      "page": 73,
      "consideration": null
    },
    "normalized": "BGE 147 IV 73",
    "translations": {
      "de": "BGE 147 IV 73",
      "fr": "ATF 147 IV 73",
      "it": "DTF 147 IV 73"
    }
  },
  "metadata": {
    "requestId": "550e8400-e29b-41d4-a716-446655440001",
    "timestamp": "2026-01-15T10:30:01Z",
    "tool": "legal_citation",
    "cached": true,
    "processingTime": 12
  }
}
```

---

## Appendix C: Useful Resources

### Official Documentation

| Resource | URL |
|----------|-----|
| Fedlex Portal | https://fedlex.data.admin.ch/ |
| LINDAS Documentation | https://lindas.admin.ch/ |
| Bundesgericht | https://www.bger.ch/ |
| Entscheidsuche | https://entscheidsuche.ch/ |

### Swiss Legal Reference

| Resource | Description |
|----------|-------------|
| SR (Systematische Rechtssammlung) | Official compilation of federal law |
| AS (Amtliche Sammlung) | Official gazette |
| BBl (Bundesblatt) | Federal gazette |

### Technical Resources

| Resource | URL |
|----------|-----|
| SPARQL Specification | https://www.w3.org/TR/sparql11-query/ |
| MCP Specification | https://modelcontextprotocol.io/specification |
| Bottleneck (Rate Limiting) | https://github.com/SGrondin/bottleneck |

---

**Document Status**: Ready for Review
**Next Steps**: Implementation Phase

