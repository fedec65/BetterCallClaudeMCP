# /doc:analyze - Legal Document Analysis

Analyze legal documents to extract structured information including document type, parties, citations, dates, jurisdiction, and potential legal issues.

## Usage

```
/doc:analyze <content> [options]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `content` | string | **Yes** | - | The document text to analyze |
| `documentType` | enum | No | auto-detect | Document type: `contract`, `brief`, `opinion`, `correspondence`, `court_decision`, `statute`, `unknown` |
| `language` | enum | No | `de` | Output language: `de`, `fr`, `it`, `en` |

## Examples

```
# Analyze a contract (auto-detect type)
/doc:analyze "Kaufvertrag zwischen Herr Max Müller und Frau Anna Schmidt..."

# Analyze with explicit document type
/doc:analyze "..." --documentType contract

# Analyze in French
/doc:analyze "Contrat de vente entre..." --language fr

# Analyze a legal brief
/doc:analyze "Mémoire de recours devant le Tribunal fédéral..." --documentType brief
```

## Output

Returns comprehensive document analysis:

- **documentType**: Detected or specified document type
- **detectedLanguage**: Language detected in content (`de`, `fr`, `it`, `en`)
- **summary**: Auto-generated summary of the document
- **legalIssues**: Array of identified legal issues
  - `issue`: Description of the issue
  - `relevantLaw`: Applicable legal provisions
  - `severity`: `high`, `medium`, or `low`
  - `recommendation`: Suggested action (optional)
- **identifiedParties**: Extracted parties
  - `name`: Party name
  - `role`: Party role (e.g., "Verkäufer", "Käufer")
- **keyDates**: Important dates found
  - `date`: Date string
  - `description`: Context of the date
  - `isDeadline`: Boolean indicating if it's a deadline
- **citedLaw**: Legal citations found
  - `citation`: Citation text (e.g., "Art. 97 OR")
  - `context`: Surrounding text
- **jurisdiction**: Detected jurisdiction
  - `detected`: `federal` or `cantonal`
  - `canton`: Canton code if cantonal (optional)
  - `confidence`: Confidence score (0-1)
- **recommendations**: Action recommendations
- **language**: Output language used

## Document Types

| Type | Description | Detection Patterns |
|------|-------------|-------------------|
| `contract` | Contracts and agreements | "Vertrag", "Contrat", role definitions |
| `brief` | Legal briefs and motions | "Beschwerde", "Mémoire", "Recours" |
| `opinion` | Legal opinions | "Gutachten", "Avis de droit" |
| `correspondence` | Legal correspondence | Salutations, letter format |
| `court_decision` | Court decisions | "Urteil", "Arrêt", BGE references |
| `statute` | Laws and regulations | "Gesetz", "Loi", "Verordnung" |
| `unknown` | Unclassified documents | Default when no patterns match |

## Detected Patterns

### Legal Citations
- German: `Art. 123 Abs. 2 OR`, `Art. 216 ff. ZGB`
- French: `art. 123 al. 2 CO`, `art. 216 ss CC`
- Italian: `art. 123 cpv. 2 CO`, `art. 216 segg. CC`
- BGE references: `BGE 145 III 229`, `ATF 145 III 229`, `DTF 145 III 229`

### Legal Issues Detected
- Missing notarization for real estate transactions
- Missing jurisdiction clauses in contracts
- Form requirements violations

## When to Use

- Initial review of incoming legal documents
- Extract key information from contracts
- Identify potential legal issues requiring attention
- Verify jurisdiction and applicable law
- Build document summaries for case files
- Deadline tracking and date extraction

## Related Commands

- `/swiss:precedent` - Search for relevant precedents
- `/legal:federal` - Force federal law analysis
- `/legal:cantonal` - Force cantonal law analysis

## MCP Tool

This command uses the `legal-commands:doc_analyze` MCP tool.
