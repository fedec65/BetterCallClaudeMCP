/**
 * Legal Persona MCP Server Factory (HTTP)
 *
 * Extends the shared createLegalPersonaServer with:
 * - present_adversarial_analysis tool (W2 dashboard widget)
 * - MCP Apps resource handlers for the adversarial dashboard
 *
 * Backward compatible: non-MCP-Apps clients receive structured text fallback.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  LegalStrategyInputSchema,
  LegalDraftInputSchema,
  LegalAnalyzeInputSchema,
} from '@legal-persona/types.js';
import { legalStrategy } from '@legal-persona/tools/legal-strategy.js';
import { legalDraft } from '@legal-persona/tools/legal-draft.js';
import { legalAnalyze } from '@legal-persona/tools/legal-analyze.js';
import { adversarialDashboardHtml, intakeFormHtml, deadlineCalculatorHtml } from '../lib/embedded-widgets.js';

const SERVER_NAME = 'legal-persona';
const SERVER_VERSION = '1.2.0';

const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';
const WIDGET_URI = 'ui://legal-persona/adversarial-dashboard';
const INTAKE_WIDGET_URI = 'ui://legal-persona/intake-form';
const DEADLINE_WIDGET_URI = 'ui://legal-persona/deadline-calculator';

// --- Adversarial Analysis input schema (JSON Schema) ---

const presentAdversarialAnalysisSchema = {
  type: 'object' as const,
  properties: {
    advocate: {
      type: 'object' as const,
      description: 'Advocate perspective with arguments',
      properties: {
        summary: { type: 'string' as const, description: 'Advocate position summary' },
        arguments: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              thesis: { type: 'string' as const, description: 'Argument thesis' },
              legalBasis: { type: 'string' as const, description: 'Legal/statutory basis' },
              citedDecisions: { type: 'array' as const, items: { type: 'string' as const }, description: 'Cited court decisions' },
              strength: { type: 'string' as const, enum: ['high', 'medium', 'low'], description: 'Estimated strength' },
            },
            required: ['thesis', 'strength'] as const,
          },
        },
      },
      required: ['arguments'] as const,
    },
    adversary: {
      type: 'object' as const,
      description: 'Adversary perspective with arguments',
      properties: {
        summary: { type: 'string' as const, description: 'Adversary position summary' },
        arguments: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              thesis: { type: 'string' as const, description: 'Counter-argument thesis' },
              legalBasis: { type: 'string' as const, description: 'Legal/statutory basis' },
              citedDecisions: { type: 'array' as const, items: { type: 'string' as const }, description: 'Cited court decisions' },
              strength: { type: 'string' as const, enum: ['high', 'medium', 'low'], description: 'Estimated strength' },
            },
            required: ['thesis', 'strength'] as const,
          },
        },
      },
      required: ['arguments'] as const,
    },
    judicialSynthesis: {
      type: 'object' as const,
      description: 'Judicial synthesis with probability assessment',
      properties: {
        probabilityScore: { type: 'number' as const, minimum: 0, maximum: 100, description: 'Success probability (0-100)' },
        reasoning: { type: 'string' as const, description: 'Judicial reasoning' },
        keyFactors: { type: 'array' as const, items: { type: 'string' as const }, description: 'Key deciding factors' },
      },
      required: ['probabilityScore', 'reasoning'] as const,
    },
    language: {
      type: 'string' as const,
      enum: ['de', 'fr', 'it', 'en'],
      description: 'Display language (default: de)',
    },
    caseTitle: {
      type: 'string' as const,
      description: 'Case title for the dashboard header',
    },
  },
  required: ['advocate', 'adversary', 'judicialSynthesis'] as const,
};

// --- Text fallback for non-MCP-Apps clients ---

interface AdversarialArg {
  thesis: string;
  legalBasis?: string;
  citedDecisions?: string[];
  strength: string;
}

interface AdversarialPerspective {
  summary?: string;
  arguments: AdversarialArg[];
}

interface AdversarialInput {
  advocate: AdversarialPerspective;
  adversary: AdversarialPerspective;
  judicialSynthesis: {
    probabilityScore: number;
    reasoning: string;
    keyFactors?: string[];
  };
  language?: string;
  caseTitle?: string;
}

function formatTextFallback(input: AdversarialInput): string {
  const lines: string[] = [];
  if (input.caseTitle) lines.push(`# ${input.caseTitle}\n`);
  lines.push(`## Judicial Synthesis — ${input.judicialSynthesis.probabilityScore}% probability of success`);
  lines.push(input.judicialSynthesis.reasoning);
  if (input.judicialSynthesis.keyFactors?.length) {
    lines.push('\nKey factors:');
    for (const f of input.judicialSynthesis.keyFactors) lines.push(`  • ${f}`);
  }
  lines.push('\n## Advocate');
  if (input.advocate.summary) lines.push(input.advocate.summary);
  for (const a of input.advocate.arguments) {
    lines.push(`\n### [${a.strength.toUpperCase()}] ${a.thesis}`);
    if (a.legalBasis) lines.push(`  Legal basis: ${a.legalBasis}`);
    if (a.citedDecisions?.length) lines.push(`  Cited: ${a.citedDecisions.join(', ')}`);
  }
  lines.push('\n## Adversary');
  if (input.adversary.summary) lines.push(input.adversary.summary);
  for (const a of input.adversary.arguments) {
    lines.push(`\n### [${a.strength.toUpperCase()}] ${a.thesis}`);
    if (a.legalBasis) lines.push(`  Legal basis: ${a.legalBasis}`);
    if (a.citedDecisions?.length) lines.push(`  Cited: ${a.citedDecisions.join(', ')}`);
  }
  return lines.join('\n');
}

// --- Deadline Calculation Engine (ZPO + BGG) ---

// Easter computation (Anonymous Gregorian algorithm)
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Federal holidays (apply everywhere)
function federalHolidays(year: number): Array<{ date: Date; name: string }> {
  const easter = easterSunday(year);
  return [
    { date: new Date(year, 0, 1), name: 'Neujahr' },
    { date: addDays(easter, -2), name: 'Karfreitag' },
    { date: addDays(easter, 1), name: 'Ostermontag' },
    { date: addDays(easter, 39), name: 'Auffahrt' },
    { date: addDays(easter, 50), name: 'Pfingstmontag' },
    { date: new Date(year, 7, 1), name: 'Bundesfeiertag' },
    { date: new Date(year, 11, 25), name: 'Weihnachten' },
  ];
}

// Cantonal holidays — conservative set per canton
const CANTONAL_HOLIDAYS: Record<string, Array<{ month: number; day: number; name: string } | { easter_offset: number; name: string }>> = {
  ZH: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 5, day: 1, name: 'Tag der Arbeit' }, { month: 12, day: 26, name: 'Stephanstag' }],
  BE: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 12, day: 26, name: 'Stephanstag' }],
  LU: [{ month: 3, day: 19, name: 'Josefstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  UR: [{ month: 3, day: 19, name: 'Josefstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  SZ: [{ month: 3, day: 19, name: 'Josefstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  OW: [{ month: 3, day: 19, name: 'Josefstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 9, day: 25, name: 'Bruder Klaus' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  NW: [{ month: 3, day: 19, name: 'Josefstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  GL: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 4, day: 3, name: 'Näfelser Fahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 26, name: 'Stephanstag' }],
  ZG: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  FR: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { easter_offset: 60, name: 'Fête-Dieu' }, { month: 8, day: 15, name: 'Assomption' }, { month: 11, day: 1, name: 'Toussaint' }, { month: 12, day: 8, name: 'Immaculée Conception' }],
  SO: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 26, name: 'Stephanstag' }],
  BS: [{ month: 5, day: 1, name: 'Tag der Arbeit' }, { month: 12, day: 26, name: 'Stephanstag' }],
  BL: [{ month: 5, day: 1, name: 'Tag der Arbeit' }, { month: 12, day: 26, name: 'Stephanstag' }],
  SH: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 5, day: 1, name: 'Tag der Arbeit' }, { month: 12, day: 26, name: 'Stephanstag' }],
  AR: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 12, day: 26, name: 'Stephanstag' }],
  AI: [{ easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  SG: [{ month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 26, name: 'Stephanstag' }],
  GR: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 12, day: 26, name: 'Stephanstag' }],
  AG: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }, { month: 12, day: 26, name: 'Stephanstag' }],
  TG: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 5, day: 1, name: 'Tag der Arbeit' }, { month: 12, day: 26, name: 'Stephanstag' }],
  TI: [{ month: 1, day: 6, name: 'Epifania' }, { month: 3, day: 19, name: 'San Giuseppe' }, { month: 5, day: 1, name: 'Festa del Lavoro' }, { easter_offset: 60, name: 'Corpus Domini' }, { month: 6, day: 29, name: 'SS. Pietro e Paolo' }, { month: 8, day: 15, name: 'Assunzione' }, { month: 11, day: 1, name: 'Ognissanti' }, { month: 12, day: 8, name: 'Immacolata' }, { month: 12, day: 26, name: 'S. Stefano' }],
  VD: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 12, day: 26, name: 'Stephanstag' }],
  VS: [{ month: 3, day: 19, name: 'Josefstag' }, { easter_offset: 60, name: 'Fronleichnam' }, { month: 8, day: 15, name: 'Mariä Himmelfahrt' }, { month: 11, day: 1, name: 'Allerheiligen' }, { month: 12, day: 8, name: 'Mariä Empfängnis' }],
  NE: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { month: 3, day: 1, name: 'Instauration de la République' }, { month: 12, day: 26, name: 'Stephanstag' }],
  GE: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { easter_offset: 49, name: 'Jeûne genevois' }, { month: 9, day: 11, name: 'Jeûne genevois' }, { month: 12, day: 26, name: 'Stephanstag' }, { month: 12, day: 31, name: 'Restauration de la République' }],
  JU: [{ month: 1, day: 2, name: 'Berchtoldstag' }, { easter_offset: 60, name: 'Fête-Dieu' }, { month: 6, day: 23, name: 'Commémoration du plébiscite' }, { month: 8, day: 15, name: 'Assomption' }, { month: 11, day: 1, name: 'Toussaint' }],
};

const HOLIDAY_DATA_LAST_VERIFIED = '2026-01-15';

function getHolidaysForCanton(canton: string, year: number): Array<{ date: Date; name: string }> {
  const holidays = [...federalHolidays(year)];
  const cantonal = CANTONAL_HOLIDAYS[canton.toUpperCase()] || [];
  const easter = easterSunday(year);
  for (const h of cantonal) {
    if ('easter_offset' in h) {
      holidays.push({ date: addDays(easter, h.easter_offset), name: h.name });
    } else {
      holidays.push({ date: new Date(year, h.month - 1, h.day), name: h.name });
    }
  }
  return holidays;
}

function isHoliday(d: Date, holidays: Array<{ date: Date; name: string }>): string | undefined {
  for (const h of holidays) {
    if (sameDay(d, h.date)) return h.name;
  }
  return undefined;
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

// Gerichtsferien periods (Art. 145 ZPO / Art. 46 BGG)
function gerichtsferien(year: number): Array<{ start: Date; end: Date; name: string }> {
  const easter = easterSunday(year);
  return [
    { start: addDays(easter, -7), end: addDays(easter, 7), name: 'Osterferien' },
    { start: new Date(year, 6, 15), end: new Date(year, 7, 15), name: 'Sommerferien' },
    { start: new Date(year, 11, 18), end: new Date(year + 1, 0, 2), name: 'Winterferien' },
  ];
}

function isInGerichtsferien(d: Date, periods: Array<{ start: Date; end: Date }>): string | undefined {
  for (const p of periods) {
    if (d >= p.start && d <= p.end) return (p as any).name;
  }
  return undefined;
}

// Advance to next business day (skip weekends + holidays)
function nextBusinessDay(d: Date, holidays: Array<{ date: Date; name: string }>): Date {
  let current = new Date(d);
  while (isWeekend(current) || isHoliday(current, holidays)) {
    current = addDays(current, 1);
  }
  return current;
}

interface ComputationStep {
  day: number;
  date: string;
  description: string;
  isHoliday: boolean;
  isSuspension: boolean;
  rule: string;
}

interface DeadlineResult {
  label: string;
  date: string;
  rule: string;
  computation: ComputationStep[];
  holidays: string[];
  suspensions: string[];
}

type ProcedureType = 'zpo_berufung_30' | 'zpo_beschwerde_10' | 'zpo_stellungnahme_20' | 'zpo_einsprache_10' | 'zpo_summarisch_10' | 'zpo_summarisch_20' | 'bgg_beschwerde_30' | 'bgg_verfassungsbeschwerde_10';

const PROCEDURE_CONFIG: Record<ProcedureType, { days: number; label: string; rule: string; isSummarisch: boolean }> = {
  'zpo_berufung_30': { days: 30, label: 'Berufung (30 Tage)', rule: 'Art. 311 Abs. 1 ZPO', isSummarisch: false },
  'zpo_beschwerde_10': { days: 10, label: 'Beschwerde (10 Tage)', rule: 'Art. 321 Abs. 1 ZPO', isSummarisch: false },
  'zpo_stellungnahme_20': { days: 20, label: 'Stellungnahme (20 Tage)', rule: 'Art. 253 ZPO', isSummarisch: false },
  'zpo_einsprache_10': { days: 10, label: 'Einsprache (10 Tage)', rule: 'Art. 238 Abs. 1 ZPO', isSummarisch: false },
  'zpo_summarisch_10': { days: 10, label: 'Summarisches Verfahren (10 Tage)', rule: 'Art. 252 ZPO', isSummarisch: true },
  'zpo_summarisch_20': { days: 20, label: 'Summarisches Verfahren (20 Tage)', rule: 'Art. 252 ZPO', isSummarisch: true },
  'bgg_beschwerde_30': { days: 30, label: 'BGG Beschwerde (30 Tage)', rule: 'Art. 100 Abs. 1 BGG', isSummarisch: false },
  'bgg_verfassungsbeschwerde_10': { days: 10, label: 'Subsidiäre Verfassungsbeschwerde (10 Tage)', rule: 'Art. 117 i.V.m. Art. 100 BGG', isSummarisch: false },
};

const VALID_CANTONS = ['ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR', 'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'TI', 'VD', 'VS', 'NE', 'GE', 'JU'];

function computeDeadline(
  procedureType: ProcedureType,
  notificationDate: Date,
  canton: string,
): { deadline: DeadlineResult; outOfScope?: string } {
  const config = PROCEDURE_CONFIG[procedureType];
  if (!config) {
    return { deadline: { label: '', date: '', rule: '', computation: [], holidays: [], suspensions: [] }, outOfScope: `Unknown procedure type: ${procedureType}` };
  }

  const year = notificationDate.getFullYear();
  // Get holidays for current year and next (deadlines might cross year boundary)
  const holidays = [...getHolidaysForCanton(canton, year), ...getHolidaysForCanton(canton, year + 1)];
  const gfPeriods = config.isSummarisch ? [] : [...gerichtsferien(year), ...gerichtsferien(year + 1)];

  const steps: ComputationStep[] = [];
  const encounteredHolidays: string[] = [];
  const encounteredSuspensions: string[] = [];

  // Step 0: Dies a quo — notification day does not count (Art. 142 Abs. 1 ZPO)
  steps.push({
    day: 0,
    date: dateStr(notificationDate),
    description: 'Zustellung (dies a quo zählt nicht)',
    isHoliday: false,
    isSuspension: false,
    rule: 'Art. 142 Abs. 1 ZPO',
  });

  // Count days from day after notification
  let current = addDays(notificationDate, 1);
  let daysRemaining = config.days;

  while (daysRemaining > 0) {
    // Check Gerichtsferien suspension
    const gfName = isInGerichtsferien(current, gfPeriods);
    if (gfName) {
      if (!encounteredSuspensions.includes(gfName)) encounteredSuspensions.push(gfName);
      steps.push({
        day: config.days - daysRemaining,
        date: dateStr(current),
        description: `Gerichtsferien (${gfName}) — Frist steht still`,
        isHoliday: false,
        isSuspension: true,
        rule: config.rule.includes('BGG') ? 'Art. 46 Abs. 1 BGG' : 'Art. 145 Abs. 1 ZPO',
      });
      current = addDays(current, 1);
      continue;
    }

    daysRemaining--;

    const holidayName = isHoliday(current, holidays);
    if (holidayName && !encounteredHolidays.includes(`${dateStr(current)} ${holidayName}`)) {
      encounteredHolidays.push(`${dateStr(current)} ${holidayName}`);
    }

    if (daysRemaining === 0 || daysRemaining % 5 === 0 || daysRemaining <= 3) {
      steps.push({
        day: config.days - daysRemaining,
        date: dateStr(current),
        description: daysRemaining === 0 ? 'Fristablauf (vor Wochenend-/Feiertagskorrektur)' : `Tag ${config.days - daysRemaining}`,
        isHoliday: !!holidayName,
        isSuspension: false,
        rule: 'Art. 142 ZPO',
      });
    }

    current = addDays(current, 1);
  }

  // The deadline day is the last day counted (current - 1 after the loop)
  let deadlineDate = addDays(current, -1);

  // Weekend/holiday correction (Art. 142 Abs. 3 ZPO)
  if (isWeekend(deadlineDate) || isHoliday(deadlineDate, holidays)) {
    const beforeAdj = dateStr(deadlineDate);
    deadlineDate = nextBusinessDay(deadlineDate, holidays);
    steps.push({
      day: config.days,
      date: dateStr(deadlineDate),
      description: `Korrektur: ${beforeAdj} fällt auf Wochenende/Feiertag → nächster Werktag`,
      isHoliday: false,
      isSuspension: false,
      rule: 'Art. 142 Abs. 3 ZPO',
    });
  }

  return {
    deadline: {
      label: config.label,
      date: dateStr(deadlineDate),
      rule: config.rule,
      computation: steps,
      holidays: encounteredHolidays,
      suspensions: encounteredSuspensions,
    },
  };
}

// --- Existing tools from base server ---

const baseTools: Tool[] = [
  {
    name: 'legal-persona:legal_strategy',
    description: `Develops comprehensive legal strategy for Swiss law cases.

Analyzes case facts and provides:
- Strength and weakness assessment
- Success likelihood evaluation
- Strategic approach recommendations
- Settlement analysis
- Procedural guidance
- Risk assessment
- Next steps

Supports federal and cantonal jurisdictions across all major Swiss legal areas.`,
    inputSchema: {
      type: 'object',
      properties: {
        case_facts: { type: 'string', description: 'Detailed description of the case facts' },
        jurisdiction: { type: 'string', enum: ['federal', 'cantonal'], description: 'Jurisdiction level (default: federal)', default: 'federal' },
        canton: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'], description: 'Canton for cantonal jurisdiction cases' },
        legal_area: { type: 'string', enum: ['contract', 'corporate', 'employment', 'tort', 'property', 'family', 'succession', 'intellectual_property', 'competition', 'banking', 'tax', 'administrative', 'criminal'], description: 'Area of law' },
        client_position: { type: 'string', enum: ['plaintiff', 'defendant', 'appellant', 'respondent'], description: "Client's position in the case" },
        dispute_amount: { type: 'number', description: 'Amount in dispute in CHF' },
        deadline_pressure: { type: 'string', enum: ['urgent', 'normal', 'flexible'], description: 'Timeline urgency (default: normal)', default: 'normal' },
        language: { type: 'string', enum: ['de', 'fr', 'it', 'en'], description: 'Output language (default: de)', default: 'de' },
      },
      required: ['case_facts', 'legal_area', 'client_position'],
    },
  },
  {
    name: 'legal-persona:legal_draft',
    description: `Drafts Swiss legal documents with proper structure and terminology.

Supports document types:
- Contracts: service_agreement, employment_contract, nda, shareholders_agreement, loan_agreement, lease_agreement
- Litigation: klageschrift, klageantwort, berufung, beschwerde, replik, duplik
- Opinions: rechtsgutachten, memorandum, legal_brief

Output formats:
- full: Complete document with all sections
- outline: Document structure with placeholders
- template: Reusable template with instructions`,
    inputSchema: {
      type: 'object',
      properties: {
        document_type: {
          type: 'string',
          enum: ['service_agreement', 'employment_contract', 'nda', 'shareholders_agreement', 'loan_agreement', 'lease_agreement', 'klageschrift', 'klageantwort', 'berufung', 'beschwerde', 'replik', 'duplik', 'rechtsgutachten', 'memorandum', 'legal_brief'],
          description: 'Type of document to draft',
        },
        context: { type: 'string', description: 'Description of the situation and requirements' },
        parties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Party name' },
              role: { type: 'string', description: 'Party role' },
              address: { type: 'string', description: 'Party address' },
              representative: { type: 'string', description: 'Legal representative' },
            },
            required: ['name', 'role'],
          },
          description: 'Parties involved in the document',
        },
        jurisdiction: { type: 'string', enum: ['federal', 'cantonal'], description: 'Jurisdiction level (default: federal)', default: 'federal' },
        canton: { type: 'string', enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'], description: 'Canton for cantonal jurisdiction' },
        language: { type: 'string', enum: ['de', 'fr', 'it', 'en'], description: 'Output language (default: de)', default: 'de' },
        format: { type: 'string', enum: ['full', 'outline', 'template'], description: 'Output format (default: full)', default: 'full' },
        include_comments: { type: 'boolean', description: 'Include explanatory comments (default: false)', default: false },
      },
      required: ['document_type', 'context', 'parties'],
    },
  },
  {
    name: 'legal-persona:legal_analyze',
    description: `Analyzes legal documents for issues, risks, and compliance.

Analysis capabilities:
- Document type identification
- Party extraction
- Issue detection with severity levels
- Missing clause identification
- Compliance checking (OR, ZGB, DSG, etc.)
- Recommendations with priorities

Analysis depths:
- quick: Basic structure and obvious issues
- standard: Comprehensive clause-by-clause review
- comprehensive: Deep analysis with all compliance checks`,
    inputSchema: {
      type: 'object',
      properties: {
        document: { type: 'string', description: 'Full text of the document to analyze' },
        document_type: {
          type: 'string',
          enum: ['service_agreement', 'employment_contract', 'nda', 'shareholders_agreement', 'loan_agreement', 'lease_agreement', 'klageschrift', 'klageantwort', 'berufung', 'beschwerde', 'replik', 'duplik', 'rechtsgutachten', 'memorandum', 'legal_brief'],
          description: 'Expected document type (auto-detected if not specified)',
        },
        analysis_depth: { type: 'string', enum: ['quick', 'standard', 'comprehensive'], description: 'Depth of analysis (default: standard)', default: 'standard' },
        focus_areas: {
          type: 'array',
          items: { type: 'string', enum: ['liability', 'termination', 'payment', 'ip', 'confidentiality', 'dispute', 'compliance', 'data_protection', 'employment', 'general'] },
          description: 'Areas to focus on (default: ["general"])',
          default: ['general'],
        },
        language: { type: 'string', enum: ['de', 'fr', 'it', 'en'], description: 'Output language (default: de)', default: 'de' },
        check_compliance: { type: 'boolean', description: 'Run compliance checks (default: true)', default: true },
      },
      required: ['document'],
    },
  },
];

export function createLegalPersonaHttpServer(): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {} } }
  );

  // --- UI Resource handlers (MCP Apps) ---

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: WIDGET_URI,
        name: 'Adversarial Analysis Dashboard',
        description: 'Interactive three-column dashboard for adversarial legal analysis with expandable arguments and probability gauge.',
        mimeType: RESOURCE_MIME_TYPE,
      },
      {
        uri: INTAKE_WIDGET_URI,
        name: 'Briefing Intake Form',
        description: 'Structured intake form for legal briefing — renders questions as a form with sections, progress indicator, and follow-up support.',
        mimeType: RESOURCE_MIME_TYPE,
      },
      {
        uri: DEADLINE_WIDGET_URI,
        name: 'Deadline Calculator',
        description: 'Interactive deadline calculator for ZPO/BGG procedures with step-by-step computation, holidays, and judicial recess handling.',
        mimeType: RESOURCE_MIME_TYPE,
      },
    ],
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: [],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === WIDGET_URI) {
      return {
        contents: [{ uri: WIDGET_URI, mimeType: RESOURCE_MIME_TYPE, text: adversarialDashboardHtml }],
      };
    }
    if (request.params.uri === INTAKE_WIDGET_URI) {
      return {
        contents: [{ uri: INTAKE_WIDGET_URI, mimeType: RESOURCE_MIME_TYPE, text: intakeFormHtml }],
      };
    }
    if (request.params.uri === DEADLINE_WIDGET_URI) {
      return {
        contents: [{ uri: DEADLINE_WIDGET_URI, mimeType: RESOURCE_MIME_TYPE, text: deadlineCalculatorHtml }],
      };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  // --- Tool definitions ---

  const adversarialUiMeta = {
    ui: { resourceUri: WIDGET_URI },
    'ui/resourceUri': WIDGET_URI,
  };

  const intakeUiMeta = {
    ui: { resourceUri: INTAKE_WIDGET_URI },
    'ui/resourceUri': INTAKE_WIDGET_URI,
  };

  const deadlineUiMeta = {
    ui: { resourceUri: DEADLINE_WIDGET_URI },
    'ui/resourceUri': DEADLINE_WIDGET_URI,
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      ...baseTools,
      {
        name: 'legal-persona:present_adversarial_analysis',
        description: `Present an adversarial analysis as an interactive dashboard.

Input: the synthesis produced by the adversarial-analysis skill (advocate/adversary perspectives + judicial synthesis with probability score).
Output: interactive dashboard widget (MCP Apps) or structured text fallback.

The dashboard shows three columns (Advocate / Adversary / Judge) with expandable arguments, cited decisions, and strength indicators.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: adversarialUiMeta,
        inputSchema: presentAdversarialAnalysisSchema,
      },
      {
        name: 'legal-persona:present_intake_form',
        description: `Present a structured intake form for a legal briefing.

Input: array of questions (from the legal-intake skill) with type, options, sections, and language.
Output: interactive form widget (MCP Apps) or structured text fallback.

The form renders questions grouped by section (context, parties, objective, constraints) with a progress indicator. Supports one follow-up round.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: intakeUiMeta,
        inputSchema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              description: 'Questions to render in the form',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Unique question identifier' },
                  text: { type: 'string', description: 'Question text (in conversation language)' },
                  type: {
                    type: 'string',
                    enum: ['text', 'single', 'multi', 'date', 'number', 'yesno'],
                    description: 'Input type',
                  },
                  options: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Options for single/multi choice',
                  },
                  required: { type: 'boolean', description: 'Whether the field is mandatory' },
                  hint: { type: 'string', description: 'Placeholder or example' },
                  section: {
                    type: 'string',
                    enum: ['context', 'parties', 'objective', 'constraints'],
                    description: 'Form section grouping',
                  },
                },
                required: ['id', 'text', 'type'],
              },
            },
            language: {
              type: 'string',
              enum: ['de', 'fr', 'it', 'en'],
              description: 'Form display language',
            },
            caseTitle: {
              type: 'string',
              description: 'Case title for the form header',
            },
            isFollowUp: {
              type: 'boolean',
              description: 'Whether this is a follow-up round (max 1)',
            },
          },
          required: ['questions'],
        },
      },
      {
        name: 'legal-persona:compute_deadlines',
        description: `Compute Swiss procedural deadlines (ZPO/BGG).

Input: procedure type, notification date, canton, language.
Output: deadline date with step-by-step computation including holidays, judicial recess (Gerichtsferien) suspensions, and weekend adjustments.

Scope v1: ZPO (Art. 142-149) and BGG (Art. 46, 100-101). StPO/VwVG not supported.
Includes a mandatory disclaimer: this is an auxiliary tool, not legal advice.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        _meta: deadlineUiMeta,
        inputSchema: {
          type: 'object',
          properties: {
            procedureType: {
              type: 'string',
              enum: Object.keys(PROCEDURE_CONFIG),
              description: 'Type of procedure/deadline to compute',
            },
            notificationDate: {
              type: 'string',
              description: 'Date of notification (ISO format YYYY-MM-DD)',
            },
            canton: {
              type: 'string',
              enum: VALID_CANTONS,
              description: 'Canton for cantonal holiday calculation',
            },
            language: {
              type: 'string',
              enum: ['de', 'fr', 'it', 'en'],
              description: 'Output language (default: de)',
            },
          },
          required: ['procedureType', 'notificationDate', 'canton'],
        },
      },
    ],
  }));

  // --- Tool call handler ---

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'legal-persona:legal_strategy': {
          const input = LegalStrategyInputSchema.parse(args);
          const result = legalStrategy(input);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'legal-persona:legal_draft': {
          const input = LegalDraftInputSchema.parse(args);
          const result = legalDraft(input);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'legal-persona:legal_analyze': {
          const input = LegalAnalyzeInputSchema.parse(args);
          const result = legalAnalyze(input);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'legal-persona:present_adversarial_analysis': {
          const input = args as unknown as AdversarialInput;
          const textFallback = formatTextFallback(input);
          return {
            content: [{ type: 'text', text: textFallback }],
          };
        }

        case 'legal-persona:present_intake_form': {
          const { questions, language = 'de', caseTitle, isFollowUp = false } = args as {
            questions: Array<{ id: string; text: string; type: string; options?: string[]; required?: boolean; hint?: string; section?: string }>;
            language?: string;
            caseTitle?: string;
            isFollowUp?: boolean;
          };

          if (!questions || !Array.isArray(questions) || questions.length === 0) {
            throw new Error('questions array is required and must not be empty');
          }

          // Build structured text fallback
          const sectionLabels: Record<string, string> = {
            context: language === 'de' ? 'Kontext' : language === 'fr' ? 'Contexte' : language === 'it' ? 'Contesto' : 'Context',
            parties: language === 'de' ? 'Parteien' : language === 'fr' ? 'Parties' : language === 'it' ? 'Parti' : 'Parties',
            objective: language === 'de' ? 'Ziel und Lieferobjekte' : language === 'fr' ? 'Objectif et livrables' : language === 'it' ? 'Obiettivo e risultati' : 'Objective & Deliverables',
            constraints: language === 'de' ? 'Rahmenbedingungen' : language === 'fr' ? 'Contraintes' : language === 'it' ? 'Vincoli' : 'Constraints',
          };
          const lines: string[] = [];
          if (caseTitle) lines.push(`# ${caseTitle}\n`);
          lines.push(isFollowUp ? '## Follow-up Questions\n' : '## Intake Form\n');

          // Group by section
          const bySection: Record<string, typeof questions> = {};
          for (const q of questions) {
            const s = q.section || 'context';
            if (!bySection[s]) bySection[s] = [];
            bySection[s].push(q);
          }

          for (const section of ['context', 'parties', 'objective', 'constraints']) {
            const qs = bySection[section];
            if (!qs?.length) continue;
            lines.push(`### ${sectionLabels[section] || section}\n`);
            for (const q of qs) {
              const marker = q.required ? ' *' : '';
              lines.push(`**${q.text}**${marker}`);
              if (q.hint) lines.push(`  _${q.hint}_`);
              if (q.options?.length) {
                for (const opt of q.options) {
                  lines.push(`  - [ ] ${opt}`);
                }
              }
              lines.push('');
            }
          }

          // Also pass the structured data as JSON for widget rendering
          const resultData = { questions, language, caseTitle, isFollowUp };

          return {
            content: [
              { type: 'text', text: JSON.stringify(resultData, null, 2) },
            ],
          };
        }

        case 'legal-persona:compute_deadlines': {
          const { procedureType, notificationDate, canton, language = 'de' } = args as {
            procedureType: string;
            notificationDate: string;
            canton: string;
            language?: string;
          };

          if (!procedureType || !(procedureType in PROCEDURE_CONFIG)) {
            throw new Error(`Invalid procedure type. Valid types: ${Object.keys(PROCEDURE_CONFIG).join(', ')}`);
          }
          if (!notificationDate || !/^\d{4}-\d{2}-\d{2}$/.test(notificationDate)) {
            throw new Error('notificationDate must be in ISO format YYYY-MM-DD');
          }
          if (!canton || !VALID_CANTONS.includes(canton.toUpperCase())) {
            throw new Error(`Invalid canton. Valid cantons: ${VALID_CANTONS.join(', ')}`);
          }

          const notifDate = new Date(notificationDate + 'T00:00:00');
          const { deadline, outOfScope } = computeDeadline(procedureType as ProcedureType, notifDate, canton.toUpperCase());

          if (outOfScope) {
            return {
              content: [{ type: 'text', text: JSON.stringify({ outOfScope, language }, null, 2) }],
            };
          }

          // Disclaimers per language
          const disclaimers: Record<string, string> = {
            de: 'Dieser Fristenrechner ist ein Hilfsmittel und ersetzt keine anwaltliche Beratung. Die Berechnung erfolgt nach bestem Wissen auf Grundlage von ZPO und BGG; eine Gewähr für die Richtigkeit wird nicht übernommen. Die Einhaltung von Fristen liegt in der alleinigen Verantwortung der verfahrensbeteiligten Partei bzw. ihres Rechtsvertreters. BetterCallClaude ist kein Fristenverwaltungssystem.',
            fr: 'Ce calculateur de délais est un outil d\'aide et ne remplace pas un conseil juridique. Le calcul est effectué au mieux sur la base du CPC et de la LTF ; aucune garantie d\'exactitude n\'est donnée. Le respect des délais incombe exclusivement à la partie ou à son représentant. BetterCallClaude n\'est pas un système de gestion des délais.',
            it: 'Questo calcolatore delle scadenze è uno strumento ausiliario e non sostituisce la consulenza legale. Il calcolo viene effettuato con la massima diligenza sulla base del CPC e della LTF; non si assume alcuna garanzia di correttezza. Il rispetto dei termini è di esclusiva responsabilità della parte o del suo rappresentante legale. BetterCallClaude non è un sistema di gestione delle scadenze.',
            en: 'This deadline calculator is an auxiliary tool and does not replace legal advice. The calculation is performed to the best of our knowledge based on ZPO and BGG; no guarantee of correctness is given. Compliance with deadlines is the sole responsibility of the party or their legal representative. BetterCallClaude is not a deadline management system.',
          };

          const result = {
            procedureType,
            notificationDate,
            canton: canton.toUpperCase(),
            language,
            deadline,
            disclaimer: disclaimers[language] || disclaimers['de'],
            lastVerified: HOLIDAY_DATA_LAST_VERIFIED,
          };

          // Text fallback
          let fallback = `${disclaimers[language] || disclaimers['de']}\n\n`;
          fallback += `Fristenberechnung / Calcul des délais\n`;
          fallback += `=====================================\n\n`;
          fallback += `Verfahren: ${deadline.label}\n`;
          fallback += `Zustellung: ${notificationDate}\n`;
          fallback += `Kanton: ${canton.toUpperCase()}\n`;
          fallback += `Fristablauf: ${deadline.date}\n`;
          fallback += `Regel: ${deadline.rule}\n\n`;

          if (deadline.computation.length > 0) {
            fallback += `Berechnung:\n`;
            for (const step of deadline.computation) {
              const markers = [];
              if (step.isHoliday) markers.push('🔴 Feiertag');
              if (step.isSuspension) markers.push('⏸ Stillstand');
              fallback += `  ${step.date} — ${step.description}${markers.length ? ` [${markers.join(', ')}]` : ''} (${step.rule})\n`;
            }
          }

          if (deadline.holidays.length > 0) {
            fallback += `\nFeiertage im Zeitraum: ${deadline.holidays.join(', ')}\n`;
          }
          if (deadline.suspensions.length > 0) {
            fallback += `Gerichtsferien: ${deadline.suspensions.join(', ')}\n`;
          }

          fallback += `\nDatenstand Feiertage: ${HOLIDAY_DATA_LAST_VERIFIED}`;

          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `Error: ${errorMessage}` }], isError: true };
    }
  });

  return server;
}
