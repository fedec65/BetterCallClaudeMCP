import {
  LegalHelpInput,
  LegalHelpOutput,
  LegalHelpInputSchema,
  CommandHelp,
  Language,
} from '../types.js';

const FRAMEWORK_VERSION = '2.1.0';

// Translations for title and description
const TRANSLATIONS: Record<Language, { title: string; description: string }> = {
  de: {
    title: 'BetterCallClaude - Rechtliche Intelligenz für Schweizer Recht',
    description: 'Framework für rechtliche Recherche, Strategieentwicklung und Dokumentenerstellung im Schweizer Rechtskontext.',
  },
  fr: {
    title: 'BetterCallClaude - Intelligence juridique pour le droit suisse',
    description: 'Framework pour la recherche juridique, le développement de stratégies et la rédaction de documents dans le contexte juridique suisse.',
  },
  it: {
    title: 'BetterCallClaude - Intelligenza giuridico per il diritto svizzero',
    description: 'Framework per la ricerca giuridica, lo sviluppo di strategie e la redazione di documenti nel contesto giuridico svizzero.',
  },
  en: {
    title: 'BetterCallClaude - Legal Intelligence for Swiss Law',
    description: 'Framework for legal research, strategy development, and document drafting in the Swiss legal context.',
  },
};

// All available commands
const COMMANDS: CommandHelp[] = [
  // Gateway command
  {
    command: '/legal',
    description: 'Gateway command - routes queries to appropriate agents based on content analysis',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Natural language legal query' },
      { name: 'agent', type: 'string', required: false, description: 'Specific agent to route to' },
      { name: 'workflow', type: 'string', required: false, description: 'Workflow to execute' },
      { name: 'jurisdiction', type: 'enum', required: false, description: 'federal or cantonal' },
      { name: 'language', type: 'enum', required: false, description: 'de, fr, it, en' },
    ],
    examples: [
      '/legal "I need precedents for Werkvertrag Mängelhaftung in Zurich"',
      '/legal "Draft a service agreement for software development"',
    ],
  },
  // Core commands
  {
    command: '/legal:research',
    description: 'Search Swiss legal sources for precedents and statutes',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Legal search query' },
      { name: 'jurisdiction', type: 'enum', required: false, description: 'federal, cantonal, all' },
      { name: 'canton', type: 'string', required: false, description: 'Canton code (ZH, GE, BE, etc.)' },
      { name: 'date_from', type: 'string', required: false, description: 'Filter from date (YYYY-MM-DD)' },
      { name: 'date_to', type: 'string', required: false, description: 'Filter to date' },
      { name: 'language', type: 'enum', required: false, description: 'de, fr, it, en' },
      { name: 'limit', type: 'number', required: false, description: '1-100, default 20' },
    ],
    examples: [
      '/legal:research "Werkvertrag Mängelhaftung" --jurisdiction=ZH',
      '/legal:research "Art. 97 OR" --date_from=2020-01-01',
    ],
  },
  {
    command: '/legal:draft',
    description: 'Draft legal documents with proper structure and terminology',
    parameters: [
      { name: 'document_type', type: 'string', required: true, description: 'Type of document (service_agreement, klageschrift, etc.)' },
      { name: 'case_facts', type: 'string', required: false, description: 'Case facts or context' },
      { name: 'clauses', type: 'array', required: false, description: 'Specific clauses to include' },
      { name: 'language', type: 'enum', required: false, description: 'de, fr, it, en' },
      { name: 'jurisdiction', type: 'enum', required: false, description: 'federal or cantonal' },
    ],
    examples: [
      '/legal:draft service_agreement --context="IT consulting services"',
      '/legal:draft klageschrift --case_facts="Contract breach by defendant"',
    ],
  },
  {
    command: '/legal:strategy',
    description: 'Develop comprehensive legal strategy for Swiss law cases',
    parameters: [
      { name: 'case_facts', type: 'string', required: true, description: 'Detailed case facts' },
      { name: 'dispute_amount', type: 'number', required: false, description: 'Amount in dispute (CHF)' },
      { name: 'jurisdiction', type: 'enum', required: false, description: 'federal or cantonal' },
      { name: 'canton', type: 'string', required: false, description: 'Canton code' },
      { name: 'strategy_type', type: 'enum', required: false, description: 'aggressive, defensive, settlement' },
    ],
    examples: [
      '/legal:strategy --case_facts="Client ordered machinery for CHF 500,000"',
      '/legal:strategy @case_brief.md --strategy_type=settlement',
    ],
  },
  // Document analysis
  {
    command: '/doc:analyze',
    description: 'Analyze legal documents for issues, risks, and compliance',
    parameters: [
      { name: 'document', type: 'string', required: true, description: 'Document content or path' },
      { name: 'analysis_type', type: 'enum', required: false, description: 'full, risks, compliance, gaps' },
      { name: 'frameworks', type: 'array', required: false, description: 'Compliance frameworks to check' },
    ],
    examples: [
      '/doc:analyze @contract.pdf --analysis_type=risks',
      '/doc:analyze @agreement.docx --frameworks=GDPR,nDSG',
    ],
  },
  // Citation commands
  {
    command: '/legal:validate',
    description: 'Validate Swiss legal citations for correctness',
    parameters: [
      { name: 'citation', type: 'string', required: true, description: 'Citation to validate' },
      { name: 'strict', type: 'boolean', required: false, description: 'Enable strict mode' },
      { name: 'citationType', type: 'enum', required: false, description: 'bge, statute, doctrine' },
    ],
    examples: [
      '/legal:validate "BGE 145 III 229"',
      '/legal:validate "Art. 97 OR" --strict',
    ],
  },
  {
    command: '/legal:format',
    description: 'Format Swiss legal citations to target language',
    parameters: [
      { name: 'citation', type: 'string', required: true, description: 'Citation to format' },
      { name: 'targetLanguage', type: 'enum', required: true, description: 'de, fr, it, en' },
      { name: 'style', type: 'enum', required: false, description: 'full, short, inline' },
    ],
    examples: [
      '/legal:format "BGE 145 III 229" --targetLanguage=fr',
      '/legal:format "Art. 97 OR" --targetLanguage=it --style=short',
    ],
  },
  {
    command: '/legal:convert',
    description: 'Convert Swiss legal citations between formats',
    parameters: [
      { name: 'citation', type: 'string', required: true, description: 'Citation to convert' },
      { name: 'toFormat', type: 'enum', required: true, description: 'bge, statute, doctrine' },
      { name: 'targetLanguage', type: 'enum', required: false, description: 'de, fr, it, en' },
    ],
    examples: [
      '/legal:convert "BGE 145 III 229" --toFormat=bge --targetLanguage=fr',
    ],
  },
  {
    command: '/legal:parse',
    description: 'Parse Swiss legal citations into structured components',
    parameters: [
      { name: 'citation', type: 'string', required: true, description: 'Citation to parse' },
      { name: 'citationType', type: 'enum', required: false, description: 'bge, statute, doctrine' },
    ],
    examples: [
      '/legal:parse "BGE 145 III 229 E. 4.2"',
      '/legal:parse "Art. 97 Abs. 1 OR"',
    ],
  },
  // Utility commands
  {
    command: '/legal:help',
    description: 'Show complete command reference',
    parameters: [
      { name: 'topic', type: 'string', required: false, description: 'Specific topic to get help on' },
      { name: 'language', type: 'enum', required: false, description: 'de, fr, it, en' },
    ],
    examples: [
      '/legal:help',
      '/legal:help citation --language=de',
    ],
  },
  {
    command: '/legal:version',
    description: 'Show BetterCallClaude version and status',
    parameters: [
      { name: 'format', type: 'enum', required: false, description: 'simple or detailed' },
    ],
    examples: [
      '/legal:version',
      '/legal:version --format=detailed',
    ],
  },
  {
    command: '/legal:federal',
    description: 'Force Federal Law Mode exclusively',
    parameters: [
      { name: 'action', type: 'enum', required: false, description: 'activate or status' },
      { name: 'language', type: 'enum', required: false, description: 'de, fr, it, en' },
    ],
    examples: [
      '/legal:federal',
      '/legal:federal --action=status',
    ],
  },
  {
    command: '/legal:cantonal',
    description: 'Force specific cantonal law mode',
    parameters: [
      { name: 'canton', type: 'enum', required: true, description: 'ZH, BE, GE, BS, VD, TI' },
      { name: 'action', type: 'enum', required: false, description: 'activate or status' },
      { name: 'language', type: 'enum', required: false, description: 'de, fr, it, en' },
    ],
    examples: [
      '/legal:cantonal ZH',
      '/legal:cantonal GE --language=fr',
    ],
  },
  {
    command: '/legal:routing',
    description: 'Configure jurisdiction routing settings',
    parameters: [
      { name: 'action', type: 'enum', required: false, description: 'status or configure' },
      { name: 'defaultJurisdiction', type: 'enum', required: false, description: 'federal or cantonal' },
      { name: 'defaultCanton', type: 'enum', required: false, description: 'Default canton code' },
      { name: 'autoDetect', type: 'boolean', required: false, description: 'Enable auto-detection' },
    ],
    examples: [
      '/legal:routing',
      '/legal:routing --action=configure --defaultJurisdiction=federal',
    ],
  },
];

// All available agents
const AGENTS = [
  { name: 'researcher', description: 'Precedent & statutory research specialist' },
  { name: 'strategist', description: 'Litigation strategy and case assessment' },
  { name: 'drafter', description: 'Legal document generation' },
  { name: 'compliance', description: 'FINMA, AML/KYC regulatory checks' },
  { name: 'data-protection', description: 'GDPR and Swiss nDSG/FADP compliance' },
  { name: 'fiscal-expert', description: 'Tax law and double-taxation agreements' },
  { name: 'corporate', description: 'M&A, contracts, and governance' },
  { name: 'real-estate', description: 'Property transactions and Grundbuch matters' },
  { name: 'translator', description: 'Legal translations DE/FR/IT/EN' },
  { name: 'cantonal-law', description: 'Specialist for all 26 Swiss cantons' },
  { name: 'procedure', description: 'ZPO/StPO deadlines and procedural rules' },
  { name: 'risk-analyst', description: 'Case outcome scoring and settlement calculations' },
  { name: 'orchestrator', description: 'Multi-agent workflow coordination' },
];

// All available workflows
const WORKFLOWS = [
  {
    name: 'due-diligence',
    description: 'M&A analysis workflow',
    agents: ['researcher', 'corporate', 'risk-analyst'],
  },
  {
    name: 'litigation-prep',
    description: 'Case preparation workflow',
    agents: ['strategist', 'researcher', 'drafter'],
  },
  {
    name: 'adversarial',
    description: 'Three-agent debate analysis',
    agents: ['advocate', 'adversary', 'judicial'],
  },
];

// Topic keywords for filtering
const TOPIC_KEYWORDS: Record<string, string[]> = {
  citation: ['validate', 'format', 'convert', 'parse'],
  research: ['research', 'legal'],
  draft: ['draft'],
  strategy: ['strategy'],
  compliance: ['compliance', 'data-protection'],
  routing: ['federal', 'cantonal', 'routing'],
  utility: ['help', 'version'],
};

function filterByTopic(items: CommandHelp[], topic: string | undefined): CommandHelp[] {
  if (!topic) return items;

  const keywords = TOPIC_KEYWORDS[topic.toLowerCase()] || [topic.toLowerCase()];
  return items.filter(item =>
    keywords.some(kw => item.command.toLowerCase().includes(kw))
  );
}

function filterAgentsByTopic(agents: typeof AGENTS, topic: string | undefined): typeof AGENTS {
  if (!topic) return agents;

  const keywords = TOPIC_KEYWORDS[topic.toLowerCase()] || [topic.toLowerCase()];
  return agents.filter(agent =>
    keywords.some(kw =>
      agent.name.toLowerCase().includes(kw) ||
      agent.description.toLowerCase().includes(kw)
    )
  );
}

/**
 * Returns help information for BetterCallClaude commands
 */
export function legalHelp(input: Partial<LegalHelpInput>): LegalHelpOutput {
  const validatedInput = LegalHelpInputSchema.parse(input);
  const { topic, language } = validatedInput;

  const translation = TRANSLATIONS[language];
  const filteredCommands = filterByTopic(COMMANDS, topic);
  const filteredAgents = filterAgentsByTopic(AGENTS, topic);

  return {
    version: FRAMEWORK_VERSION,
    title: translation.title,
    description: translation.description,
    commands: filteredCommands,
    agents: filteredAgents,
    workflows: WORKFLOWS,
    language,
  };
}
