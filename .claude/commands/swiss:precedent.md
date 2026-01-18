# /swiss:precedent - Swiss Precedent Analysis

Search and analyze Swiss court decisions including BGE (Federal Supreme Court), BVGer (Federal Administrative Court), and cantonal court decisions.

## Usage

```
/swiss:precedent <query> [options]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | **Yes** | - | Search query for precedent analysis |
| `sources` | enum | No | `all` | Sources to search: `bge`, `bvge`, `cantonal`, `all` |
| `legalArea` | string | No | - | Filter by legal area (e.g., "contract", "tort", "criminal") |
| `dateFrom` | string | No | - | Start date filter (ISO format: YYYY-MM-DD) |
| `dateTo` | string | No | - | End date filter (ISO format: YYYY-MM-DD) |
| `maxResults` | number | No | `10` | Maximum number of results (1-50) |
| `language` | enum | No | `de` | Output language: `de`, `fr`, `it`, `en` |

## Examples

```
# Basic precedent search
/swiss:precedent "Art. 97 OR contractual liability"

# Search only BGE decisions
/swiss:precedent "Vertragshaftung" --sources bge

# Filter by legal area and date range
/swiss:precedent "Schadenersatz" --legalArea tort --dateFrom 2020-01-01

# Search cantonal decisions in French
/swiss:precedent "responsabilité contractuelle" --sources cantonal --language fr

# Limit results
/swiss:precedent "Haftung aus Vertrag" --maxResults 5
```

## Output

Returns comprehensive precedent analysis:

- **query**: Original search query
- **totalResults**: Number of matching decisions found
- **results**: Array of court decisions
  - `reference`: Case citation (e.g., "BGE 145 III 229")
  - `court`: Court name
  - `date`: Decision date
  - `title`: Case title/summary heading
  - `summary`: Brief summary of the decision
  - `relevance`: Relevance score (0-1)
  - `legalPrinciples`: Array of key legal principles established
  - `citedArticles`: Array of cited statutory provisions
  - `url`: Link to full decision (if available)
- **suggestedSearches**: Related search suggestions
- **analysisNotes**: Additional analysis context
- **language**: Output language used

## Sources

| Source | Description | Coverage |
|--------|-------------|----------|
| `bge` | Bundesgericht (Federal Supreme Court) | BGE/ATF/DTF decisions |
| `bvge` | Bundesverwaltungsgericht (Federal Administrative Court) | Administrative law decisions |
| `cantonal` | Cantonal courts | ZH, BE, GE, BS, VD, TI |
| `all` | All available sources | Comprehensive search |

## Citation Formats

Results include citations in the appropriate format:

- **German**: BGE 145 III 229 E. 4.2
- **French**: ATF 145 III 229 consid. 4.2
- **Italian**: DTF 145 III 229 consid. 4.2

## Relevance Scoring

Results are ranked by relevance (0-1 scale):

| Score | Interpretation |
|-------|----------------|
| 0.9-1.0 | Highly relevant - direct precedent |
| 0.7-0.9 | Very relevant - related legal principles |
| 0.5-0.7 | Moderately relevant - analogous situations |
| < 0.5 | Tangentially relevant - background context |

## When to Use

- Research relevant precedents for legal arguments
- Verify current state of case law on a topic
- Find supporting or distinguishing cases
- Identify established legal principles
- Research evolution of jurisprudence over time
- Prepare for litigation strategy

## Related Commands

- `/doc:analyze` - Analyze documents for citations and issues
- `/legal:federal` - Focus on federal law context
- `/legal:cantonal` - Focus on cantonal law context
- `/legal:research` - Comprehensive legal research

## MCP Tool

This command uses the `legal-commands:swiss_precedent` MCP tool.
