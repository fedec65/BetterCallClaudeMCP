# TAS/CAS Jurisprudence MCP Server

MCP server for TAS/CAS (Court of Arbitration for Sport) jurisprudence research and retrieval.

## Overview

This server provides access to the public CAS/TAS arbitration decisions database, enabling AI assistants to search, retrieve, and analyze sports arbitration jurisprudence.

**Deployment**: `https://mcp.bettercallclaude.ch/tas-jurisprudence/mcp`

## Available Tools

### 1. `cas_search`

Search CAS/TAS arbitration decisions by keywords, sport, year range, and procedure type.

**Parameters**:
- `query` (required): Search terms (keywords, case number, party names)
- `sport` (optional): Filter by sport discipline (e.g., "Football", "Cycling")
- `year_from` (optional): Filter decisions from this year (1984-2026)
- `year_to` (optional): Filter decisions up to this year (1984-2026)
- `procedure_type` (optional): Filter by type - "Appeal", "Ordinary", "Anti-Doping", "Advisory"
- `page` (optional): Page number for pagination (default: 1)
- `page_size` (optional): Results per page 1-25 (default: 10)

**Example**:
```json
{
  "query": "doping",
  "sport": "Cycling",
  "year_from": 2020,
  "procedure_type": "Anti-Doping",
  "page_size": 15
}
```

### 2. `cas_get_award`

Retrieve detailed information about a specific CAS award including parties, arbitrators, and operative part.

**Parameters**:
- `case_number` (optional): CAS case number (e.g., "CAS 2023/A/9876")
- `url` (optional): Direct URL to the CAS award page
- `include_full_text` (optional): Include full text extraction from PDF (default: false, slower)

**Note**: Either `case_number` or `url` is required.

**Example**:
```json
{
  "case_number": "CAS 2023/A/9876",
  "include_full_text": false
}
```

### 3. `cas_recent`

Get the most recent CAS/TAS arbitration decisions published on the CAS website.

**Parameters**:
- `limit` (optional): Maximum number of recent decisions to return 1-50 (default: 10)

**Example**:
```json
{
  "limit": 20
}
```

### 4. `cas_by_sport`

Browse CAS arbitration decisions filtered by sport discipline with pagination.

**Parameters**:
- `sport` (required): Sport discipline to browse (e.g., "Football", "Cycling", "Athletics")
- `page` (optional): Page number for pagination (default: 1)
- `procedure_type` (optional): Filter by procedure type within sport

**Example**:
```json
{
  "sport": "Football",
  "page": 2
}
```

## Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "tas-jurisprudence": {
      "url": "https://mcp.bettercallclaude.ch/tas-jurisprudence/mcp",
      "transport": "http"
    }
  }
}
```

### Claude Code

Configure via MCP settings:

```json
{
  "mcp": {
    "servers": {
      "tas-jurisprudence": {
        "type": "http",
        "url": "https://mcp.bettercallclaude.ch/tas-jurisprudence/mcp"
      }
    }
  }
}
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Playwright (for browser automation)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Build TypeScript
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Run tests once
npm run test:run
```

### Local Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Deployment

### Railway

The server is configured for Railway deployment with nixpacks builder.

```bash
# Deploy via Railway CLI
railway up

# Or connect GitHub repo for automatic deployments
```

### Docker

```bash
# Build image
docker build -t tas-jurisprudence .

# Run container
docker run -p 3000:3000 tas-jurisprudence
```

## Architecture

```
src/
├── index.ts              # HTTP server entry point
├── server.ts             # MCP server setup
├── tools/                # MCP tool implementations
│   ├── cas-search.ts
│   ├── cas-get-award.ts
│   ├── cas-recent.ts
│   └── cas-by-sport.ts
├── scraper/              # Web scraping layer
│   ├── playwright-client.ts
│   ├── jurisprudence-scraper.ts
│   └── recent-decisions-scraper.ts
├── infrastructure/       # Supporting services
│   ├── cache.ts
│   ├── rate-limiter.ts
│   └── http-client.ts
├── types.ts              # Zod schemas & TypeScript types
└── utils.ts              # Helper functions
```

## Rate Limiting

The server respects the CAS website's robots.txt crawl-delay of 10 seconds between requests. This ensures:

- Ethical web scraping practices
- Avoidance of IP blocking
- Sustainable long-term access

## Caching

| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Search Results | 10 min | Query results |
| Award Details | 30 min | Specific award metadata |
| Recent Decisions | 5 min | Latest awards (fresher data) |

## Legal Notice

**Important**: CAS arbitration awards are publicly accessible but subject to copyright restrictions:

- This server provides **metadata only** by default (parties, dates, operative part)
- Full text extraction is optional and should be used for research purposes only
- Awards cannot be redistributed without CAS consent
- Users must comply with CAS terms of use

## Data Sources

- **Main Database**: [jurisprudence.tas-cas.org](https://jurisprudence.tas-cas.org/)
- **Recent Decisions**: [tas-cas.org/jurisprudence/recent-decisions](https://www.tas-cas.org/en/jurisprudence/recent-decisions.html)
- **PDF Archive**: `https://www.tas-cas.org/files/decision/`

## License

MIT License - See LICENSE file for details.

## Contributing

Part of the [BetterCallClaude](https://github.com/fedec65/BetterCallClaude) Swiss Legal Intelligence Framework.
