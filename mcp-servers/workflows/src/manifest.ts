import type { AgentManifestEntry } from './validate.js';

/**
 * The 16 chainable stage agents of the Swiss plugin (bettercallclaude/agents/*.md).
 * Excluded by design: orchestrator (the workflow engine itself), summarizer
 * (auto-appended post-processor), briefing (pre-execution), prompt-engineer (meta),
 * chronology-builder (internal worker of the legal-chronology skill).
 */
export const AGENTS_MANIFEST: AgentManifestEntry[] = [
  {
    agent_id: 'researcher',
    display_name: 'Swiss Legal Researcher',
    input_types: ['raw_query', 'case_facts'],
    output_types: ['research_memo', 'citations'],
    mcp_servers: ['bge-search', 'entscheidsuche', 'fedlex-sparql'],
    is_terminal: false
  },
  {
    agent_id: 'strategist',
    display_name: 'Swiss Case Strategist',
    input_types: ['research_memo', 'case_facts'],
    output_types: ['strategy_memo', 'risk_assessment'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'risk',
    display_name: 'Risk Analyst',
    input_types: [
      'research_memo', 'strategy_memo', 'case_facts',
      'corporate_analysis', 'realestate_analysis', 'fiscal_analysis',
      'compliance_report'
    ],
    output_types: ['risk_assessment'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'drafter',
    display_name: 'Swiss Legal Drafter',
    input_types: [
      'research_memo', 'strategy_memo', 'risk_assessment', 'compliance_report',
      'case_facts', 'judicial_synthesis', 'corporate_analysis',
      'realestate_analysis', 'citations'
    ],
    output_types: ['draft_document'],
    mcp_servers: ['legal-citations'],
    is_terminal: true
  },
  {
    agent_id: 'compliance',
    display_name: 'Compliance Officer',
    input_types: [
      'case_facts', 'document_set', 'research_memo', 'draft_document',
      'corporate_analysis', 'realestate_analysis', 'fiscal_analysis'
    ],
    output_types: ['compliance_report', 'draft_document'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'corporate',
    display_name: 'Corporate Law Agent',
    input_types: ['case_facts', 'research_memo', 'compliance_report'],
    output_types: ['corporate_analysis'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'realestate',
    display_name: 'Real Estate Law Agent',
    input_types: ['case_facts', 'research_memo'],
    output_types: ['realestate_analysis'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'citation',
    display_name: 'Citation Specialist',
    input_types: ['draft_document', 'citations', 'research_memo'],
    output_types: ['citations', 'draft_document'],
    mcp_servers: ['legal-citations'],
    is_terminal: false
  },
  {
    agent_id: 'fiscal',
    display_name: 'Fiscal Legal Expert',
    input_types: ['case_facts', 'research_memo'],
    output_types: ['fiscal_analysis'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'advocate',
    display_name: 'Swiss Legal Advocate',
    input_types: ['case_facts', 'research_memo'],
    output_types: ['arguments_for'],
    mcp_servers: ['bge-search'],
    is_terminal: false
  },
  {
    agent_id: 'adversary',
    display_name: 'Swiss Legal Adversary',
    input_types: ['case_facts', 'research_memo', 'arguments_for'],
    output_types: ['arguments_against'],
    mcp_servers: ['bge-search'],
    is_terminal: false
  },
  {
    agent_id: 'judicial',
    display_name: 'Swiss Judicial Analyst',
    input_types: ['arguments_for', 'arguments_against'],
    output_types: ['judicial_synthesis', 'risk_assessment'],
    mcp_servers: ['bge-search'],
    is_terminal: true
  },
  {
    agent_id: 'translator',
    display_name: 'Legal Translator',
    input_types: ['draft_document', 'research_memo', 'citations'],
    output_types: ['translation'],
    mcp_servers: ['fedlex-sparql'],
    is_terminal: true
  },
  {
    agent_id: 'cantonal',
    display_name: 'Cantonal Law Expert',
    input_types: ['raw_query', 'case_facts', 'research_memo'],
    output_types: ['cantonal_analysis'],
    mcp_servers: ['bge-search'],
    is_terminal: false
  },
  {
    agent_id: 'procedure',
    display_name: 'Procedure Specialist',
    input_types: ['case_facts', 'research_memo', 'strategy_memo'],
    output_types: ['procedure_analysis'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  },
  {
    agent_id: 'data-protection',
    display_name: 'Data Protection Specialist',
    input_types: ['case_facts', 'document_set', 'research_memo'],
    output_types: ['dataprotection_analysis'],
    mcp_servers: ['entscheidsuche'],
    is_terminal: false
  }
];
