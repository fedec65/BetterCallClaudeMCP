/**
 * TAS/CAS Jurisprudence MCP Server - Public API (re-export shim)
 *
 * The previous Angular SPA scraper (Jina Reader + Playwright fallback) has
 * been replaced by a thin client over jurisprudence.tas-cas.org's public
 * JSON API. The historical module name is preserved here so the existing
 * `src/tools/*` import sites continue to work without changes.
 */

export {
  searchCasDecisions,
  getAwardDetails,
  getRecentDecisions
} from '../api/tas-api-client.js';
