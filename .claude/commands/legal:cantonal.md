# /legal:cantonal - Force Cantonal Law Mode

Activate Cantonal Law Mode for the current session, focusing analysis on a specific Swiss canton's law.

## Usage

```
/legal:cantonal <canton> [--action activate|status]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `canton` | enum | **Yes** | - | Canton code: `ZH`, `BE`, `GE`, `BS`, `VD`, `TI` |
| `action` | enum | No | `activate` | Action to perform: `activate` or `status` |
| `language` | enum | No | `de` | Output language: `de`, `fr`, `it`, `en` |

## Supported Cantons

| Code | Canton | Primary Language |
|------|--------|------------------|
| `ZH` | Zürich | German |
| `BE` | Bern/Berne | German/French |
| `GE` | Genève | French |
| `BS` | Basel-Stadt | German |
| `VD` | Vaud | French |
| `TI` | Ticino | Italian |

## Examples

```
# Activate Zürich cantonal law
/legal:cantonal ZH

# Activate Geneva cantonal law in French
/legal:cantonal GE --language fr

# Check current status for Ticino
/legal:cantonal TI --action status
```

## Output

Returns cantonal law mode configuration:

- **mode**: Always `cantonal`
- **canton**: Canton code (e.g., `ZH`)
- **cantonName**: Full canton name (e.g., `Zürich`)
- **status**: `activated` or `already_active`
- **message**: Confirmation message
- **primaryLanguage**: Canton's primary legal language
- **applicableLaw**: List of applicable cantonal laws
- **primarySources**: Primary legal sources for that canton
- **courtSystem**: Canton's court structure
  - `supreme`: Supreme court name
  - `firstInstance`: First instance court name
  - `specialized`: Specialized courts (if any)

## When to Use

- Analyzing matters of cantonal jurisdiction
- Researching cantonal court decisions
- Drafting documents governed by cantonal law
- Tax law (cantonal tax codes)
- Administrative law (cantonal procedures)
- Construction and planning law

## Related Commands

- `/legal:federal` - Switch to federal law mode
- `/legal:routing` - Configure routing behavior

## MCP Tool

This command uses the `legal-commands:legal_cantonal` MCP tool.
