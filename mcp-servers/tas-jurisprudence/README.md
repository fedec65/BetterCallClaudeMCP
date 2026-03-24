# TAS/CAS Jurisprudence MCP Server

> Court of Arbitration for Sport (TAS/CAS) decision search and retrieval

## Overview

This MCP server provides tools to search and retrieve arbitration decisions from the Court of Arbitration for Sport (CAS/TAS). It enables Claude to research sports law precedents, anti-doping cases, and commercial sports disputes.

## Available Tools

### `cas_search`
Search CAS/TAS arbitration decisions by keywords, sport, year range, or procedure type.

**Parameters:**
- `query` (required): Search query for case content, parties, or keywords
- `sport` (optional): Filter by sport (e.g., "Football", "Cycling", "Athletics")
- `year_from` (optional): Filter decisions from this year (1984-2026)
- `year_to` (optional): Filter decisions until this year (1984-2026)
- `procedure_type` (optional): Filter by type - "Appeal", "Ordinary", "Anti-Doping", "Advisory"
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Results per page, max 25 (default: 10)

### `cas_get_award`
Retrieve detailed information about a specific CAS/TAS award.

**Parameters:**
- `case_number` (optional): CAS case number (e.g., "CAS 2023/A/9876")
- `url` (optional): Direct URL to the award page
- `include_full_text` (optional): Include full PDF text (default: false)

### `cas_recent`
Get the most recent CAS/TAS arbitration decisions.

**Parameters:**
- `limit` (optional): Maximum number of decisions (1-50, default: 10)

### `cas_by_sport`
Browse CAS/TAS decisions by sport category.

**Parameters:**
- `sport` (required): Sport to browse (e.g., "Football", "Cycling")
- `page` (optional): Page number (default: 1)

## Installation

```bash
# Navigate to server directory
cd mcp-servers/tas-jurisprudence

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm run dev
```

## Deployment

### Railway

This server is designed for Railway deployment with HTTP transport:

```bash
# From the tas-jurisprudence directory
railway up
```

**Configuration:**
- Set custom domain: `tas.bettercallclaude.ch`
- MCP endpoint: `https://tas.bettercallclaude.ch/tas-jurisprudence/mcp`

## Client Configuration

### Claude Desktop

For local stdio transport (not recommended for this server):
```json
{
  "mcpServers": {
    "tas-jurisprudence": {
      "command": "node",
      "args": ["/path/to/mcp-servers/tas-jurisprudence/dist/index.js"]
    }
  }
}
```

### Remote HTTP Transport

For Railway deployment:
```json
{
  "mcpServers": {
    "tas-jurisprudence": {
      "url": "https://tas.bettercallclaude.ch/tas-jurisprudence/mcp",
      "transport": "http"
    }
  }
}
```

## Technical Details

### Architecture
- **Transport**: Streamable HTTP (Express.js)
- **Scraping**: Playwright for JavaScript-rendered content
- **Caching**: In-memory LRU cache with configurable TTL
- **Rate Limiting**: 10-second crawl delay (respects robots.txt)

### Cache TTLs
- Search results: 10 minutes
- Award details: 30 minutes
- Recent decisions: 5 minutes
- Sport browse: 15 minutes

### Data Sources
- Main database: `jurisprudence.tas-cas.org` (JavaScript-rendered)
- Recent decisions: `tas-cas.org/en/jurisprudence/recent-decisions.html`
- PDF files: `tas-cas.org/files/decision/`

## Legal Notice

CAS awards are publicly accessible, but their content is subject to copyright. This server:
- Provides metadata and summaries by default
- Links to official PDF sources rather than redistributing content
- Respects robots.txt crawl-delay requirements
- Is intended for legitimate legal research purposes

For full award redistribution, CAS permission may be required.

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Clean build artifacts
npm run clean
```

## Troubleshooting

### No search results
- The CAS database requires JavaScript rendering
- Ensure Playwright/Chromium is properly installed
- Check rate limiter isn't blocking requests

### Memory issues in production
- Single browser instance is reused
- Pages are closed after each operation
- Implement periodic browser restart for long-running instances

### Rate limiting errors
- Default 10-second delay between requests
- Increase `CRAWL_DELAY_MS` if getting blocked
- Check CAS website status

## License

MIT License - BetterCallClaude Project

## Resources

- [CAS/TAS Official Website](https://www.tas-cas.org)
- [CAS Jurisprudence Database](https://jurisprudence.tas-cas.org)
- [MCP Specification](https://modelcontextprotocol.io)
# Railway Deploy
