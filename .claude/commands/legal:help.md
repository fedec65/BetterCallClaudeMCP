# /legal:help - BetterCallClaude Command Reference

Display comprehensive help and command reference for the BetterCallClaude Swiss Legal Intelligence Framework.

## Usage

```
/legal:help [topic]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `topic` | string | No | - | Specific topic to get help on (e.g., "commands", "agents", "workflows") |
| `language` | enum | No | `en` | Output language: `de`, `fr`, `it`, `en` |

## Examples

```
# Show full command reference
/legal:help

# Get help on specific topic
/legal:help commands

# Get help in German
/legal:help --language de
```

## Output

Returns structured help information including:

- **version**: Current framework version
- **title**: Framework title
- **description**: Framework overview
- **commands**: Array of available commands with parameters and examples
- **agents**: List of specialized legal agents
- **workflows**: Pre-configured multi-agent workflows

## Related Commands

- `/legal:version` - Check framework version and status
- `/legal:routing` - Configure command routing

## MCP Tool

This command uses the `legal-commands:legal_help` MCP tool.
