# /legal:federal - Force Federal Law Mode

Activate Federal Law Mode for the current session, focusing analysis on Swiss federal law (Bundesrecht).

## Usage

```
/legal:federal [--action activate|status]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `action` | enum | No | `activate` | Action to perform: `activate` or `status` |
| `language` | enum | No | `de` | Output language: `de`, `fr`, `it`, `en` |

## Examples

```
# Activate federal law mode
/legal:federal

# Check current federal mode status
/legal:federal --action status

# Activate in French
/legal:federal --language fr
```

## Output

Returns federal law mode configuration:

- **mode**: Always `federal`
- **status**: `activated` or `already_active`
- **message**: Confirmation message
- **applicableLaw**: List of applicable federal statutes
  - ZGB (Civil Code)
  - OR (Code of Obligations)
  - StGB (Criminal Code)
  - StPO (Criminal Procedure)
  - ZPO (Civil Procedure)
  - BV (Federal Constitution)
- **primarySources**: Primary legal sources
  - Bundesgericht (Federal Supreme Court)
  - SR (Systematic Collection of Federal Law)
  - BBl (Federal Gazette)

## When to Use

- Analyzing matters of federal jurisdiction
- Researching BGE (Federal Supreme Court decisions)
- Drafting documents governed by federal law
- When cantonal variations are not relevant

## Related Commands

- `/legal:cantonal` - Switch to cantonal law mode
- `/legal:routing` - Configure routing behavior

## MCP Tool

This command uses the `legal-commands:legal_federal` MCP tool.
