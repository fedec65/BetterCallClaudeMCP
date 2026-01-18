# /legal:version - BetterCallClaude Version & Status

Display version information and status of the BetterCallClaude framework and its MCP servers.

## Usage

```
/legal:version [--format simple|detailed]
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | enum | No | `simple` | Output format: `simple` (version only) or `detailed` (full status) |

## Examples

```
# Quick version check
/legal:version

# Detailed status with all servers
/legal:version --format detailed
```

## Output

Returns version and status information:

- **framework**: Framework name ("BetterCallClaude")
- **version**: Current version (e.g., "1.0.0")
- **buildDate**: Build date
- **servers**: Array of MCP server statuses
  - `name`: Server name
  - `version`: Server version
  - `status`: `active`, `inactive`, or `error`
- **capabilities**: List of available capabilities

## Server Status Values

| Status | Description |
|--------|-------------|
| `active` | Server is running and responsive |
| `inactive` | Server is not currently running |
| `error` | Server encountered an error |

## Related Commands

- `/legal:help` - Full command reference
- `/legal:routing` - Configure routing behavior

## MCP Tool

This command uses the `legal-commands:legal_version` MCP tool.
