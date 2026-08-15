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

This server is not deployed standalone. It is mounted as a route on the shared HTTP aggregator in [`mcp-servers-http/`](../../mcp-servers-http/) and deployed alongside the other 6 servers as a single Railway service (`bettercallclaude-mcp`).

Production endpoint:

```
https://mcp.bettercallclaude.ch/tas-jurisprudence/mcp
```

To modify this server's behaviour in production: open a PR here, merge to `main`, Railway auto-redeploys the aggregator. See the top-level [README](../../README.md) for the full deploy pipeline.

## Client Configuration

### Claude Desktop

For local stdio transport (development only):
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

### Remote HTTP Transport (recommended)

Uses the shared aggregator:
```json
{
  "mcpServers": {
    "tas-jurisprudence": {
      "type": "http",
      "url": "https://mcp.bettercallclaude.ch/tas-jurisprudence/mcp"
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
- New-site recent-decisions index: 30 minutes

### Data Sources
- Categorized database (JSON API): `jurisprudence.tas-cas.org` — awards up to April 2024; the API has not received new awards since (migration to the relaunched website pending)
- Recent decisions, not yet categorized: `tas-cas.org/{en,fr,es}/jurisprudence/recent-decisions` and `tas-cas.org/en/add/jurisprudence` — scraped HTML pages merged into `cas_recent`, and used as fallback by `cas_get_award` and unfiltered `cas_search`. These awards expose metadata + `pdf_url` only: **no decision date or sport is available** for them.
- PDF files: linked directly from both sources

Sport and procedure-type filters only cover the categorized database; filtered `cas_search` queries never fall back to the recent-decisions pages.

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

