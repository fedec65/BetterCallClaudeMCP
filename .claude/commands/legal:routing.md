# /legal:routing - Routing Configuration

Display or configure routing settings for the BetterCallClaude framework, including default jurisdiction, auto-detection, and available agents.

## Usage

```
/legal:routing [--action status|configure] [options]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `action` | enum | No | `status` | Action: `status` (show config) or `configure` (update config) |
| `defaultJurisdiction` | enum | No | `federal` | Default jurisdiction: `federal` or `cantonal` |
| `defaultCanton` | enum | No | - | Default canton when cantonal: `ZH`, `BE`, `GE`, `BS`, `VD`, `TI` |
| `autoDetect` | boolean | No | `true` | Enable automatic jurisdiction detection |
| `language` | enum | No | `de` | Output language: `de`, `fr`, `it`, `en` |

## Examples

```
# Show current routing configuration
/legal:routing

# Configure default to federal law with auto-detection
/legal:routing --action configure --defaultJurisdiction federal --autoDetect true

# Set default to Zürich cantonal law
/legal:routing --action configure --defaultJurisdiction cantonal --defaultCanton ZH

# Disable auto-detection
/legal:routing --action configure --autoDetect false
```

## Output

Returns routing configuration:

- **currentConfig**: Current configuration settings
  - `defaultJurisdiction`: `federal` or `cantonal`
  - `defaultCanton`: Canton code if cantonal (optional)
  - `autoDetect`: Boolean for auto-detection status
- **status**: `configured` or `unchanged`
- **message**: Status message in requested language
- **availableAgents**: List of available agents
  - `name`: Agent identifier
  - `domain`: Agent specialization
  - `status`: `active` or `inactive`
- **language**: Output language used

## Available Agents

| Agent | Domain |
|-------|--------|
| `researcher` | Precedent & statutory research |
| `strategist` | Litigation strategy and case assessment |
| `drafter` | Legal document generation |
| `compliance` | FINMA, AML/KYC regulatory checks |
| `data-protection` | GDPR and Swiss nDSG/FADP compliance |
| `fiscal-expert` | Tax law and double-taxation agreements |
| `corporate` | M&A, contracts, and governance |
| `real-estate` | Property transactions and Grundbuch matters |
| `translator` | Legal translations DE/FR/IT/EN |
| `cantonal-law` | Specialist for all 26 Swiss cantons |
| `procedure` | ZPO/StPO deadlines and procedural rules |
| `risk-analyst` | Case outcome scoring and settlement calculations |
| `orchestrator` | Multi-agent workflow coordination |

## When to Use

- Check current framework configuration
- Change default jurisdiction settings
- Enable/disable automatic jurisdiction detection
- View available specialized agents
- Configure routing before batch operations

## Related Commands

- `/legal:federal` - Force federal law mode
- `/legal:cantonal` - Force cantonal law mode
- `/legal:help` - Full command reference

## MCP Tool

This command uses the `legal-commands:legal_routing` MCP tool.
