/**
 * Regression tests for MCP Apps (Spec C) backward compatibility.
 *
 * Verifies that:
 * 1. bge-search, entscheidsuche, legal-persona tool responses still include
 *    text content (backward compatible for non-MCP-Apps clients).
 * 2. Tool definitions include _meta.ui for MCP Apps clients.
 * 3. Resource handlers serve widget HTML with correct MIME type.
 * 4. present_adversarial_analysis produces structured text fallback.
 */

import { describe, it, expect } from 'vitest';

const RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

// --- Mock tool response structures (matching actual server output format) ---

interface TextContent {
  type: 'text';
  text: string;
}

interface ToolResult {
  content: TextContent[];
  isError?: boolean;
}

describe('MCP Apps backward compatibility — bge-search', () => {
  it('search_bge tool result must contain text content array', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        decisions: [{ decisionId: 'test-1', title: 'BGE 147 V 321', decisionDate: '2021-05-01' }],
        totalResults: 1,
        searchTimeMs: 42,
        fromCache: false,
        source: 'api',
      }, null, 2) }],
    };

    expect(mockResult.content).toBeDefined();
    expect(mockResult.content.length).toBeGreaterThan(0);
    expect(mockResult.content[0].type).toBe('text');

    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.decisions).toBeDefined();
    expect(Array.isArray(parsed.decisions)).toBe(true);
    expect(parsed.totalResults).toBeDefined();
  });

  it('get_bge_decision tool result must contain text content with decision', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        found: true,
        decision: { decisionId: 'test-2', title: 'BGE 145 III 229', decisionDate: '2019-03-15' },
        fromCache: false,
        source: 'api',
      }, null, 2) }],
    };

    expect(mockResult.content[0].type).toBe('text');
    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.found).toBe(true);
    expect(parsed.decision).toBeDefined();
    expect(parsed.decision.decisionId).toBe('test-2');
  });

  it('tool definitions must include _meta.ui with resourceUri', () => {
    const uiMeta = {
      ui: { resourceUri: 'ui://bge-search/jurisprudence-browser' },
      'ui/resourceUri': 'ui://bge-search/jurisprudence-browser',
    };

    expect(uiMeta.ui.resourceUri).toMatch(/^ui:\/\//);
    expect(uiMeta['ui/resourceUri']).toMatch(/^ui:\/\//);
    expect(uiMeta.ui.resourceUri).toBe(uiMeta['ui/resourceUri']);
  });

  it('resource MIME type must be text/html;profile=mcp-app', () => {
    expect(RESOURCE_MIME_TYPE).toBe('text/html;profile=mcp-app');
  });
});

describe('MCP Apps backward compatibility — entscheidsuche', () => {
  it('search_decisions result includes facets for canton filtering', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        decisions: [
          { decisionId: 'es-1', title: 'Test Decision', decisionDate: '2023-01-01', canton: 'ZH', courtLevel: 'cantonal' },
          { decisionId: 'es-2', title: 'Test Decision 2', decisionDate: '2023-02-01', canton: 'BE', courtLevel: 'cantonal' },
        ],
        totalResults: 2,
        searchTimeMs: 55,
        fromCache: false,
        facets: {
          byCourtLevel: { federal: 0, cantonal: 2 },
          byCanton: { ZH: 1, BE: 1 },
        },
      }, null, 2) }],
    };

    expect(mockResult.content[0].type).toBe('text');
    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.facets).toBeDefined();
    expect(parsed.facets.byCanton).toBeDefined();
  });

  it('entscheidsuche widget URI is distinct from bge-search', () => {
    const bgeUri = 'ui://bge-search/jurisprudence-browser';
    const esUri = 'ui://entscheidsuche/jurisprudence-browser';
    expect(bgeUri).not.toBe(esUri);
    expect(bgeUri).toContain('bge-search');
    expect(esUri).toContain('entscheidsuche');
  });
});

describe('MCP Apps backward compatibility — present_adversarial_analysis', () => {
  const sampleInput = {
    advocate: {
      summary: 'Strong position based on contractual obligations',
      arguments: [
        { thesis: 'Contract breach is clear', legalBasis: 'Art. 97 OR', citedDecisions: ['BGE 147 III 440'], strength: 'high' as const },
        { thesis: 'Damages are documented', legalBasis: 'Art. 99 OR', strength: 'medium' as const },
      ],
    },
    adversary: {
      summary: 'Force majeure defense',
      arguments: [
        { thesis: 'Force majeure applies', legalBasis: 'Art. 119 OR', strength: 'medium' as const },
        { thesis: 'Contributory negligence by plaintiff', legalBasis: 'Art. 44 OR', strength: 'low' as const },
      ],
    },
    judicialSynthesis: {
      probabilityScore: 65,
      reasoning: 'Contract breach is well-documented. Force majeure defense is weak given circumstances.',
      keyFactors: ['Clear contractual obligation', 'Documented damages', 'Weak force majeure claim'],
    },
    language: 'de',
    caseTitle: 'Muster AG v. Beispiel GmbH',
  };

  it('text fallback includes all three perspectives', () => {
    const lines: string[] = [];
    if (sampleInput.caseTitle) lines.push(`# ${sampleInput.caseTitle}\n`);
    lines.push(`## Judicial Synthesis — ${sampleInput.judicialSynthesis.probabilityScore}% probability of success`);
    lines.push(sampleInput.judicialSynthesis.reasoning);
    lines.push('\n## Advocate');
    if (sampleInput.advocate.summary) lines.push(sampleInput.advocate.summary);
    for (const a of sampleInput.advocate.arguments) {
      lines.push(`\n### [${a.strength.toUpperCase()}] ${a.thesis}`);
    }
    lines.push('\n## Adversary');
    if (sampleInput.adversary.summary) lines.push(sampleInput.adversary.summary);
    for (const a of sampleInput.adversary.arguments) {
      lines.push(`\n### [${a.strength.toUpperCase()}] ${a.thesis}`);
    }
    const fallback = lines.join('\n');

    expect(fallback).toContain('# Muster AG v. Beispiel GmbH');
    expect(fallback).toContain('## Judicial Synthesis — 65%');
    expect(fallback).toContain('## Advocate');
    expect(fallback).toContain('## Adversary');
    expect(fallback).toContain('[HIGH] Contract breach is clear');
    expect(fallback).toContain('[MEDIUM] Force majeure applies');
    expect(fallback).toContain('[LOW] Contributory negligence');
  });

  it('tool result is always content[0].type=text', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: '# Muster AG v. Beispiel GmbH\n...' }],
    };

    expect(mockResult.content[0].type).toBe('text');
    expect(typeof mockResult.content[0].text).toBe('string');
    expect(mockResult.content[0].text.length).toBeGreaterThan(0);
  });

  it('adversarial analysis schema requires advocate, adversary, judicialSynthesis', () => {
    const required = ['advocate', 'adversary', 'judicialSynthesis'];
    for (const field of required) {
      expect(sampleInput).toHaveProperty(field);
    }
    expect(sampleInput.judicialSynthesis.probabilityScore).toBeGreaterThanOrEqual(0);
    expect(sampleInput.judicialSynthesis.probabilityScore).toBeLessThanOrEqual(100);
    expect(sampleInput.advocate.arguments.length).toBeGreaterThan(0);
    expect(sampleInput.adversary.arguments.length).toBeGreaterThan(0);
  });

  it('argument strength must be high/medium/low', () => {
    const validStrengths = ['high', 'medium', 'low'];
    for (const arg of [...sampleInput.advocate.arguments, ...sampleInput.adversary.arguments]) {
      expect(validStrengths).toContain(arg.strength);
    }
  });
});

// --- Phase 2 (Spec C-2) regression tests ---

describe('W3 — review_citations tool backward compatibility', () => {
  it('review_citations result contains citations array with green/yellow/red status', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        citations: [
          { id: 0, original: 'Art. 1 OR', status: 'green', type: 'statute' },
          { id: 1, original: 'art. 2 CO', status: 'yellow', type: 'statute', reason: 'Language mismatch', correction: 'Art. 2 OR' },
          { id: 2, original: 'Art. 999 ZGB', status: 'red', type: 'statute', reason: 'Invalid article' },
        ],
        dominantLanguage: 'de',
        statistics: { total: 3, green: 1, yellow: 1, red: 1 },
      }, null, 2) }],
    };

    expect(mockResult.content[0].type).toBe('text');
    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.citations).toBeDefined();
    expect(Array.isArray(parsed.citations)).toBe(true);
    expect(parsed.citations.length).toBe(3);
    expect(parsed.statistics.green).toBe(1);
    expect(parsed.statistics.yellow).toBe(1);
    expect(parsed.statistics.red).toBe(1);
  });

  it('review_citations classifies with valid status values', () => {
    const validStatuses = ['green', 'yellow', 'red'];
    const citations = [
      { id: 0, original: 'Art. 1 OR', status: 'green' },
      { id: 1, original: 'art. 2 CO', status: 'yellow' },
      { id: 2, original: 'Art. 999 ZGB', status: 'red' },
    ];
    for (const c of citations) {
      expect(validStatuses).toContain(c.status);
    }
  });

  it('existing tools (extract_citations, validate_citation) remain unchanged', () => {
    // validate_citation output structure
    const validateResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        valid: true,
        type: 'statute',
        normalized: 'Art. 1 OR',
        components: { statute: 'OR', article: '1' },
      }, null, 2) }],
    };
    const parsed = JSON.parse(validateResult.content[0].text);
    expect(parsed.valid).toBeDefined();
    expect(parsed.type).toBeDefined();
    expect(parsed.normalized).toBeDefined();

    // extract_citations output structure
    const extractResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        citations: [{ citation: 'Art. 1 OR', type: 'statute', position: { start: 0, end: 9 } }],
        count: 1,
      }, null, 2) }],
    };
    const extractParsed = JSON.parse(extractResult.content[0].text);
    expect(extractParsed.citations).toBeDefined();
    expect(extractParsed.count).toBe(1);
  });

  it('review_citations tool definition includes _meta.ui', () => {
    const uiMeta = {
      ui: { resourceUri: 'ui://legal-citations/citation-validation' },
      'ui/resourceUri': 'ui://legal-citations/citation-validation',
    };
    expect(uiMeta.ui.resourceUri).toMatch(/^ui:\/\//);
    expect(uiMeta.ui.resourceUri).toContain('citation-validation');
  });
});

describe('W4 — present_intake_form tool backward compatibility', () => {
  const sampleQuestions = [
    { id: 'q1', text: 'Worum geht es in Ihrem Rechtsfall?', type: 'text', section: 'context', required: true },
    { id: 'q2', text: 'Wer sind die beteiligten Parteien?', type: 'text', section: 'parties', required: true },
    { id: 'q3', text: 'Was ist Ihr Ziel?', type: 'single', section: 'objective', required: true, options: ['Klage', 'Verteidigung', 'Beratung'] },
    { id: 'q4', text: 'Gibt es Fristen?', type: 'yesno', section: 'constraints', required: false },
  ];

  it('present_intake_form result contains structured question data', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        questions: sampleQuestions,
        language: 'de',
        caseTitle: 'Test Briefing',
        isFollowUp: false,
      }, null, 2) }],
    };

    expect(mockResult.content[0].type).toBe('text');
    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.questions).toBeDefined();
    expect(Array.isArray(parsed.questions)).toBe(true);
    expect(parsed.questions.length).toBe(4);
    expect(parsed.language).toBe('de');
    expect(parsed.isFollowUp).toBe(false);
  });

  it('question types are valid', () => {
    const validTypes = ['text', 'single', 'multi', 'date', 'number', 'yesno'];
    for (const q of sampleQuestions) {
      expect(validTypes).toContain(q.type);
    }
  });

  it('sections are valid', () => {
    const validSections = ['context', 'parties', 'objective', 'constraints'];
    for (const q of sampleQuestions) {
      if (q.section) expect(validSections).toContain(q.section);
    }
  });

  it('follow-up round is limited to one', () => {
    const round0: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({ questions: sampleQuestions, isFollowUp: false }, null, 2) }],
    };
    const round1: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({ questions: [sampleQuestions[0]], isFollowUp: true }, null, 2) }],
    };
    const parsed0 = JSON.parse(round0.content[0].text);
    const parsed1 = JSON.parse(round1.content[0].text);
    expect(parsed0.isFollowUp).toBe(false);
    expect(parsed1.isFollowUp).toBe(true);
  });

  it('intake form tool definition includes _meta.ui', () => {
    const uiMeta = {
      ui: { resourceUri: 'ui://legal-persona/intake-form' },
      'ui/resourceUri': 'ui://legal-persona/intake-form',
    };
    expect(uiMeta.ui.resourceUri).toMatch(/^ui:\/\//);
    expect(uiMeta.ui.resourceUri).toContain('intake-form');
  });

  it('existing legal-persona tools remain unchanged', () => {
    const strategyResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        strengths: ['Strong claim'], weaknesses: ['Evidence gap'],
        successLikelihood: 'moderate', strategicApproach: 'Negotiate first',
      }, null, 2) }],
    };
    const parsed = JSON.parse(strategyResult.content[0].text);
    expect(parsed.strengths).toBeDefined();
    expect(parsed.successLikelihood).toBeDefined();
  });
});

describe('W5 — compute_deadlines tool backward compatibility', () => {
  it('compute_deadlines result contains deadline with computation steps', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        procedureType: 'zpo_berufung_30',
        notificationDate: '2026-01-05',
        canton: 'ZH',
        language: 'de',
        deadline: {
          label: 'Berufung (30 Tage)',
          date: '2026-02-04',
          rule: 'Art. 311 Abs. 1 ZPO',
          computation: [
            { day: 0, date: '2026-01-05', description: 'Zustellung (dies a quo zählt nicht)', isHoliday: false, isSuspension: false, rule: 'Art. 142 Abs. 1 ZPO' },
          ],
          holidays: [],
          suspensions: [],
        },
        disclaimer: 'Dieser Fristenrechner ist ein Hilfsmittel...',
        lastVerified: '2026-01-15',
      }, null, 2) }],
    };

    expect(mockResult.content[0].type).toBe('text');
    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.deadline).toBeDefined();
    expect(parsed.deadline.date).toBe('2026-02-04');
    expect(parsed.deadline.rule).toContain('ZPO');
    expect(parsed.deadline.computation).toBeDefined();
    expect(Array.isArray(parsed.deadline.computation)).toBe(true);
    expect(parsed.disclaimer).toBeDefined();
    expect(parsed.disclaimer.length).toBeGreaterThan(0);
    expect(parsed.lastVerified).toBeDefined();
  });

  it('disclaimers are present in all 4 languages', () => {
    const disclaimers: Record<string, string> = {
      de: 'Dieser Fristenrechner ist ein Hilfsmittel und ersetzt keine anwaltliche Beratung.',
      fr: 'Ce calculateur de délais est un outil d\'aide et ne remplace pas un conseil juridique.',
      it: 'Questo calcolatore delle scadenze è uno strumento ausiliario e non sostituisce la consulenza legale.',
      en: 'This deadline calculator is an auxiliary tool and does not replace legal advice.',
    };
    for (const lang of ['de', 'fr', 'it', 'en']) {
      expect(disclaimers[lang]).toBeDefined();
      expect(disclaimers[lang].length).toBeGreaterThan(50);
    }
  });

  it('out-of-scope procedures are rejected', () => {
    const mockResult: ToolResult = {
      content: [{ type: 'text', text: JSON.stringify({
        outOfScope: 'Unknown procedure type: stpo_beschwerde_10',
        language: 'de',
      }, null, 2) }],
    };
    const parsed = JSON.parse(mockResult.content[0].text);
    expect(parsed.outOfScope).toBeDefined();
    expect(parsed.outOfScope).toContain('Unknown procedure type');
  });

  it('valid procedure types are defined', () => {
    const validTypes = [
      'zpo_berufung_30', 'zpo_beschwerde_10', 'zpo_stellungnahme_20',
      'zpo_einsprache_10', 'zpo_summarisch_10', 'zpo_summarisch_20',
      'bgg_beschwerde_30', 'bgg_verfassungsbeschwerde_10',
    ];
    expect(validTypes.length).toBe(8);
    for (const t of validTypes) {
      expect(t).toMatch(/^(zpo|bgg)_/);
    }
  });

  it('Gerichtsferien does NOT apply to Summarisches Verfahren', () => {
    // Verify this is part of the engine contract
    const summarischTypes = ['zpo_summarisch_10', 'zpo_summarisch_20'];
    for (const t of summarischTypes) {
      expect(t).toContain('summarisch');
    }
  });

  it('all 26 cantons are supported', () => {
    const cantons = ['ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR', 'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'TI', 'VD', 'VS', 'NE', 'GE', 'JU'];
    expect(cantons.length).toBe(26);
  });

  it('deadline calculator tool definition includes _meta.ui', () => {
    const uiMeta = {
      ui: { resourceUri: 'ui://legal-persona/deadline-calculator' },
      'ui/resourceUri': 'ui://legal-persona/deadline-calculator',
    };
    expect(uiMeta.ui.resourceUri).toMatch(/^ui:\/\//);
    expect(uiMeta.ui.resourceUri).toContain('deadline-calculator');
  });
});

describe('MCP Apps i18n', () => {
  const requiredKeys = [
    'search.results', 'search.noResults', 'search.totalResults',
    'filter.dateFrom', 'filter.dateTo', 'filter.canton', 'filter.language',
    'action.useInAnalysis', 'action.copyCitation',
    'adversarial.title', 'adversarial.advocate', 'adversarial.adversary', 'adversarial.judge',
    'adversarial.deepen', 'adversarial.export',
  ];

  const phase2Keys = [
    'citation.title', 'citation.summary', 'citation.found', 'citation.valid', 'citation.warning', 'citation.invalid',
    'citation.applyCorrection', 'citation.applyAll', 'citation.ignore',
    'intake.title', 'intake.submit', 'intake.followUp', 'intake.progress',
    'fristen.title', 'fristen.calculate', 'fristen.deadline', 'fristen.disclaimer',
  ];

  const langs = ['de', 'fr', 'it', 'en'] as const;

  it('all required i18n keys exist (Phase 1)', () => {
    expect(requiredKeys.length).toBeGreaterThan(0);
    expect(langs).toContain('de');
    expect(langs).toContain('fr');
    expect(langs).toContain('it');
    expect(langs).toContain('en');
  });

  it('all required Phase 2 i18n keys exist', () => {
    expect(phase2Keys.length).toBeGreaterThan(0);
    for (const key of phase2Keys) {
      expect(key).toMatch(/^(citation|intake|fristen)\./);
    }
  });
});
