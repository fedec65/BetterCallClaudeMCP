/**
 * Legal Citations MCP Server Factory (HTTP)
 *
 * Creates a Server instance with all legal-citations tool handlers.
 * Imports validators/formatters/parsers from the existing source.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { CitationValidator } from '@legal-citations/validators/citation-validator.js';
import { CitationFormatter } from '@legal-citations/formatters/citation-formatter.js';
import { CitationParser } from '@legal-citations/parsers/citation-parser.js';
import type {
  Language,
  FormatOptions,
  CitationType,
  ParsedCitation,
} from '@legal-citations/types.js';

// --- Static data (copied from source, rarely changes) ---

const FEDLEX_BASE_URL = 'https://www.fedlex.admin.ch/eli';

const STATUTE_SR_MAPPING: Record<string, string> = {
  'ZGB': '210', 'CC': '210', 'CCS': '210',
  'OR': '220', 'CO': '220',
  'StGB': '311.0', 'CP': '311.0', 'CPS': '311.0',
  'BV': '101', 'Cst': '101', 'Cost': '101',
  'VwVG': '172.021', 'PA': '172.021',
  'BGG': '173.110', 'LTF': '173.110',
  'SchKG': '281.1', 'LP': '281.1',
  'ZPO': '272', 'CPC': '272',
  'StPO': '312.0', 'CPP': '312.0',
  'AVIG': '837.0', 'LACI': '837.0',
  'AHVG': '831.10', 'LAVS': '831.10',
  'IVG': '831.20', 'LAI': '831.20',
  'BVG': '831.40', 'LPP': '831.40',
  'UVG': '832.20', 'LAA': '832.20',
  'KVG': '832.10', 'LAMal': '832.10',
  'DSG': '235.1', 'LPD': '235.1',
  'IPRG': '291', 'LDIP': '291',
  'MWStG': '641.20', 'LTVA': '641.20',
  'DBG': '642.11', 'LIFD': '642.11',
};

const STATUTE_FULL_NAMES: Record<string, Record<Language, string>> = {
  'ZGB': { de: 'Schweizerisches Zivilgesetzbuch', fr: 'Code civil suisse', it: 'Codice civile svizzero', en: 'Swiss Civil Code' },
  'OR': { de: 'Obligationenrecht', fr: 'Code des obligations', it: 'Diritto delle obbligazioni', en: 'Code of Obligations' },
  'StGB': { de: 'Schweizerisches Strafgesetzbuch', fr: 'Code pénal suisse', it: 'Codice penale svizzero', en: 'Swiss Criminal Code' },
  'BV': { de: 'Bundesverfassung der Schweizerischen Eidgenossenschaft', fr: 'Constitution fédérale de la Confédération suisse', it: 'Costituzione federale della Confederazione Svizzera', en: 'Federal Constitution of the Swiss Confederation' },
  'BGG': { de: 'Bundesgerichtsgesetz', fr: 'Loi sur le Tribunal fédéral', it: 'Legge sul Tribunale federale', en: 'Federal Supreme Court Act' },
  'ZPO': { de: 'Schweizerische Zivilprozessordnung', fr: 'Code de procédure civile', it: 'Codice di diritto processuale civile svizzero', en: 'Swiss Civil Procedure Code' },
  'StPO': { de: 'Schweizerische Strafprozessordnung', fr: 'Code de procédure pénale suisse', it: 'Codice di diritto processuale penale svizzero', en: 'Swiss Criminal Procedure Code' },
};

const CITATION_PATTERNS: Array<{ regex: RegExp; type: CitationType }> = [
  { regex: /BGE\s+\d{1,3}\s+[IV]+\s+\d+/gi, type: 'bge' },
  { regex: /ATF\s+\d{1,3}\s+[IV]+\s+\d+/gi, type: 'atf' },
  { regex: /DTF\s+\d{1,3}\s+[IV]+\s+\d+/gi, type: 'dtf' },
  { regex: /Art\.\s*\d+[a-z]?\s*(Abs\.\s*\d+)?\s*(lit\.\s*[a-z])?\s*(Ziff\.\s*\d+)?\s*(ZGB|OR|StGB|BV|BGG|ZPO|StPO|SchKG|VwVG|AVIG|AHVG|IVG|BVG|UVG|KVG|DSG|IPRG|MWStG|DBG)/gi, type: 'statute' },
  { regex: /art\.\s*\d+[a-z]?\s*(al\.\s*\d+)?\s*(let\.\s*[a-z])?\s*(ch\.\s*\d+)?\s*(CC|CO|CP|Cst|LTF|CPC|CPP|LP|PA|LACI|LAVS|LAI|LPP|LAA|LAMal|LPD|LDIP|LTVA|LIFD)/gi, type: 'statute' },
  { regex: /art\.\s*\d+[a-z]?\s*(cpv\.\s*\d+)?\s*(lett\.\s*[a-z])?\s*(n\.\s*\d+)?\s*(CCS|CO|CPS|Cost)/gi, type: 'statute' },
  { regex: /[A-Z]{2,4}[-_]\d{4}[-_]\d+/g, type: 'cantonal' },
];

// --- Helper functions ---

function buildProvisionReference(
  statute: string, article: number, paragraph?: number, letter?: string, language: Language = 'de'
): string {
  const labels = {
    de: { art: 'Art.', abs: 'Abs.', lit: 'lit.' },
    fr: { art: 'art.', abs: 'al.', lit: 'let.' },
    it: { art: 'art.', abs: 'cpv.', lit: 'lett.' },
    en: { art: 'Art.', abs: 'para.', lit: 'lit.' },
  };
  const l = labels[language];
  let ref = `${l.art} ${article}`;
  if (paragraph) ref += ` ${l.abs} ${paragraph}`;
  if (letter) ref += ` ${l.lit} ${letter}`;
  ref += ` ${statute}`;
  return ref;
}

function extractCitationsFromText(text: string, includeTypes: string[], parser: CitationParser, validate: boolean) {
  const shouldIncludeAll = includeTypes.includes('all');
  const filtered = CITATION_PATTERNS.filter(p => shouldIncludeAll || includeTypes.includes(p.type));
  const results: any[] = [];
  for (const { regex, type } of filtered) {
    let match;
    const re = new RegExp(regex.source, regex.flags);
    while ((match = re.exec(text)) !== null) {
      const cit = match[0].trim();
      const pos = { start: match.index, end: match.index + cit.length };
      if (!results.some(e => e.citation === cit && e.position.start === pos.start)) {
        const entry: any = { citation: cit, type, position: pos };
        if (validate) { const p = parser.parse(cit); entry.parsed = p; entry.valid = p.isValid; }
        results.push(entry);
      }
    }
  }
  results.sort((a, b) => a.position.start - b.position.start);
  return results;
}

// --- Factory ---

export function createLegalCitationsServer(): Server {
  const server = new Server(
    { name: 'legal-citations', version: '1.1.0' },
    { capabilities: { tools: {} } }
  );

  const validator = new CitationValidator();
  const formatter = new CitationFormatter();
  const parser = new CitationParser();

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'validate_citation',
        description: 'Validate a Swiss legal citation (BGE/ATF/DTF or statutory). Returns validation result with normalized citation and error messages if invalid.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { citation: { type: 'string', description: 'The legal citation to validate (e.g., "BGE 147 IV 73", "Art. 97 OR")' } }, required: ['citation'] },
      },
      {
        name: 'format_citation',
        description: 'Format a Swiss legal citation to a specific language (DE/FR/IT/EN).',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { citation: { type: 'string' }, targetLanguage: { type: 'string', enum: ['de', 'fr', 'it', 'en'] }, fullStatuteName: { type: 'boolean', default: false } }, required: ['citation', 'targetLanguage'] },
      },
      {
        name: 'convert_citation',
        description: 'Convert a citation from one language to another. Auto-detects source language.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { citation: { type: 'string' }, targetLanguage: { type: 'string', enum: ['de', 'fr', 'it', 'en'] }, fullStatuteName: { type: 'boolean', default: false } }, required: ['citation', 'targetLanguage'] },
      },
      {
        name: 'parse_citation',
        description: 'Parse a Swiss legal citation and extract all components.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { citation: { type: 'string' } }, required: ['citation'] },
      },
      {
        name: 'get_provision_text',
        description: 'Retrieve the official text of a Swiss statutory provision from Fedlex.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { statute: { type: 'string' }, article: { type: 'number' }, paragraph: { type: 'number' }, letter: { type: 'string' }, language: { type: 'string', enum: ['de', 'fr', 'it'] }, asOfDate: { type: 'string' } }, required: ['statute', 'article'] },
      },
      {
        name: 'extract_citations',
        description: 'Extract all legal citations from a document or text.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { text: { type: 'string' }, includeTypes: { type: 'array', items: { type: 'string', enum: ['bge', 'atf', 'dtf', 'statute', 'cantonal', 'all'] } }, validateCitations: { type: 'boolean' } }, required: ['text'] },
      },
      {
        name: 'standardize_document_citations',
        description: 'Standardize all legal citations in a document to a consistent format and language.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { text: { type: 'string' }, targetLanguage: { type: 'string', enum: ['de', 'fr', 'it', 'en'] }, format: { type: 'string', enum: ['short', 'long', 'academic'] }, includeFullNames: { type: 'boolean' } }, required: ['text', 'targetLanguage'] },
      },
      {
        name: 'compare_citation_versions',
        description: 'Compare different versions of a statutory provision over time.',
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: { type: 'object', properties: { statute: { type: 'string' }, article: { type: 'number' }, paragraph: { type: 'number' }, dateFrom: { type: 'string' }, dateTo: { type: 'string' }, language: { type: 'string', enum: ['de', 'fr', 'it'] } }, required: ['statute', 'article'] },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'validate_citation': {
          const { citation } = args as { citation: string };
          if (!citation || typeof citation !== 'string') throw new McpError(ErrorCode.InvalidParams, 'Citation required');
          const result = validator.validate(citation);
          return { content: [{ type: 'text', text: JSON.stringify({ valid: result.valid, type: result.type, normalized: result.normalized, components: result.components, errors: result.errors, warnings: result.warnings }, null, 2) }] };
        }

        case 'format_citation': {
          const { citation, targetLanguage, fullStatuteName = false } = args as any;
          if (!citation) throw new McpError(ErrorCode.InvalidParams, 'Citation required');
          if (!['de', 'fr', 'it', 'en'].includes(targetLanguage)) throw new McpError(ErrorCode.InvalidParams, 'targetLanguage must be de/fr/it/en');
          const parsed = parser.parse(citation);
          if (!parsed.isValid) throw new McpError(ErrorCode.InvalidParams, `Invalid citation: ${citation}`);
          const formatted = formatter.format(parsed.type, parsed.components, targetLanguage as Language, { language: targetLanguage as Language, fullStatuteName });
          return { content: [{ type: 'text', text: JSON.stringify({ original: citation, formatted: formatted.citation, language: formatted.language, type: formatted.type, fullReference: formatted.fullReference }, null, 2) }] };
        }

        case 'convert_citation': {
          const { citation, targetLanguage, fullStatuteName = false } = args as any;
          if (!citation) throw new McpError(ErrorCode.InvalidParams, 'Citation required');
          if (!['de', 'fr', 'it', 'en'].includes(targetLanguage)) throw new McpError(ErrorCode.InvalidParams, 'targetLanguage must be de/fr/it/en');
          const parsed = parser.parse(citation);
          if (!parsed.isValid) throw new McpError(ErrorCode.InvalidParams, `Invalid citation: ${citation}`);
          const allTranslations = formatter.getAllTranslations(parsed.type, parsed.components);
          const formatted = formatter.format(parsed.type, parsed.components, targetLanguage as Language, { language: targetLanguage as Language, fullStatuteName });
          return { content: [{ type: 'text', text: JSON.stringify({ original: citation, sourceLanguage: parsed.language, targetLanguage, converted: formatted.citation, fullReference: formatted.fullReference, allTranslations }, null, 2) }] };
        }

        case 'parse_citation': {
          const { citation } = args as { citation: string };
          if (!citation) throw new McpError(ErrorCode.InvalidParams, 'Citation required');
          const parsed = parser.parse(citation);
          return { content: [{ type: 'text', text: JSON.stringify({ original: parsed.original, type: parsed.type, language: parsed.language, components: parsed.components, isValid: parsed.isValid, suggestions: parsed.suggestions }, null, 2) }] };
        }

        case 'get_provision_text': {
          const { statute, article, paragraph, letter, language = 'de', asOfDate } = args as any;
          if (!statute) throw new McpError(ErrorCode.InvalidParams, 'statute required');
          if (typeof article !== 'number') throw new McpError(ErrorCode.InvalidParams, 'article must be a number');
          const norm = statute.toUpperCase();
          const sr = STATUTE_SR_MAPPING[norm] || STATUTE_SR_MAPPING[statute];
          if (!sr) throw new McpError(ErrorCode.InvalidParams, `Unknown statute: ${statute}`);
          const lang = language === 'fr' ? 'fr' : language === 'it' ? 'it' : 'de';
          const url = `${FEDLEX_BASE_URL}/cc/${sr}/${lang}`;
          const ref = buildProvisionReference(norm, article, paragraph, letter, language as Language);
          const fullName = STATUTE_FULL_NAMES[norm]?.[language as Language] || norm;
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, provision: { statute: norm, srNumber: sr, article, paragraph, letter, formattedCitation: ref, fullStatuteName: fullName }, text: `[Provision text from Fedlex: SR ${sr}, Art. ${article}${paragraph ? ` Abs. ${paragraph}` : ''}${letter ? ` lit. ${letter}` : ''}]`, effectiveDate: asOfDate || new Date().toISOString().split('T')[0], language, fedlexUrl: url, metadata: { lastModified: new Date().toISOString(), version: 'current' } }, null, 2) }] };
        }

        case 'extract_citations': {
          const { text, includeTypes = ['all'], validateCitations = true } = args as any;
          if (!text) throw new McpError(ErrorCode.InvalidParams, 'text required');
          const extracted = extractCitationsFromText(text, includeTypes, parser, validateCitations);
          const stats = { total: extracted.length, byType: {} as Record<string, number>, validCount: extracted.filter((c: any) => c.valid !== false).length, invalidCount: extracted.filter((c: any) => c.valid === false).length };
          for (const c of extracted) stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, citations: extracted, statistics: stats, textLength: text.length }, null, 2) }] };
        }

        case 'standardize_document_citations': {
          const { text, targetLanguage, format = 'short', includeFullNames = false } = args as any;
          if (!text) throw new McpError(ErrorCode.InvalidParams, 'text required');
          if (!['de', 'fr', 'it', 'en'].includes(targetLanguage)) throw new McpError(ErrorCode.InvalidParams, 'targetLanguage must be de/fr/it/en');
          const citations = extractCitationsFromText(text, ['all'], parser, true);
          const replacements: any[] = [];
          for (const entry of citations) {
            if (!entry.valid || !entry.parsed) continue;
            const fmt = formatter.format(entry.parsed.type, entry.parsed.components, targetLanguage as Language, { language: targetLanguage as Language, fullStatuteName: includeFullNames });
            let std = fmt.citation;
            if (format === 'long' && fmt.fullReference) std = fmt.fullReference;
            else if (format === 'academic' && fmt.fullReference && fmt.citation !== fmt.fullReference) std = `${fmt.citation} (${fmt.fullReference})`;
            if (std !== entry.citation) replacements.push({ original: entry.citation, standardized: std, position: entry.position });
          }
          let result = text;
          for (const r of [...replacements].sort((a, b) => b.position.start - a.position.start)) {
            result = result.substring(0, r.position.start) + r.standardized + result.substring(r.position.end);
          }
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, originalText: text, standardizedText: result, targetLanguage, format, replacements, statistics: { totalCitations: citations.length, standardized: replacements.length, unchanged: citations.length - replacements.length } }, null, 2) }] };
        }

        case 'compare_citation_versions': {
          const { statute, article, paragraph, dateFrom, dateTo, language = 'de' } = args as any;
          if (!statute) throw new McpError(ErrorCode.InvalidParams, 'statute required');
          if (typeof article !== 'number') throw new McpError(ErrorCode.InvalidParams, 'article must be a number');
          const norm = statute.toUpperCase();
          const sr = STATUTE_SR_MAPPING[norm] || STATUTE_SR_MAPPING[statute];
          if (!sr) throw new McpError(ErrorCode.InvalidParams, `Unknown statute: ${statute}`);
          const from = dateFrom ? new Date(dateFrom) : new Date('2000-01-01');
          const to = dateTo ? new Date(dateTo) : new Date();
          const ref = buildProvisionReference(norm, article, paragraph, undefined, language as Language);
          return { content: [{ type: 'text', text: JSON.stringify({ success: true, provision: { statute: norm, srNumber: sr, article, paragraph, formattedCitation: ref }, dateRange: { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }, versions: [
            { effectiveDate: from.toISOString().split('T')[0], text: `[Historical version SR ${sr} Art. ${article}]`, changeType: 'initial', changeDescription: 'Original enactment' },
            { effectiveDate: to.toISOString().split('T')[0], text: `[Current version SR ${sr} Art. ${article}]`, changeType: 'current', changeDescription: 'Current version in force' },
          ], totalVersions: 2, hasChanges: true }, null, 2) }] };
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      throw new McpError(ErrorCode.InternalError, `Error in ${name}: ${msg}`);
    }
  });

  return server;
}
