import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Tool definitions for BetterCallClaude
 * Each tool embeds persona behavior in its description
 */

export const LEGAL_GATEWAY_TOOL: Tool = {
  name: 'legal_gateway',
  description: `🎯 **Swiss Legal Intelligence Gateway** - Your entry point for all Swiss legal queries.

This intelligent routing tool analyzes your legal question and determines:
- The best specialized tool to handle your request
- Detected language (DE/FR/IT/EN)
- Jurisdiction (federal or cantonal)
- Relevant legal domain

**Use this when**: You have a general legal question and aren't sure which specialized tool to use.

**Examples**:
- "What are the requirements for forming a GmbH in Zürich?"
- "Rechercher la jurisprudence récente sur la responsabilité contractuelle"
- "Quali sono i termini di prescrizione nel diritto svizzero?"

The gateway routes to: legal_research, legal_citation, legal_strategy, legal_draft, or legal_analyze.`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Your legal question or request (any language)',
        minLength: 1,
        maxLength: 5000,
      },
      context: {
        type: 'string',
        description: 'Optional additional context or background information',
        maxLength: 10000,
      },
      lang: {
        type: 'string',
        enum: ['de', 'fr', 'it', 'en'],
        description: 'Preferred response language (auto-detected if not specified)',
      },
    },
    required: ['query'],
  },
};

export const LEGAL_RESEARCH_TOOL: Tool = {
  name: 'legal_research',
  description: `📚 **Swiss Legal Research** - Comprehensive precedent and statutory research.

As your **Legal Researcher**, I search Swiss legal sources including:
- **BGE/ATF/DTF**: Federal Supreme Court decisions
- **Cantonal Courts**: ZH, BE, GE, BS, VD, TI decisions
- **Fedlex**: Federal legislation and ordinances
- **Doctrine**: Academic commentary references

**Capabilities**:
- Multi-lingual search (DE/FR/IT)
- Date range filtering
- Source type filtering (statute, precedent, doctrine)
- Legal domain filtering
- Relevance scoring

**Use this when**: You need to find relevant case law, statutes, or legal authority.

**Citation Format**: Returns proper Swiss citations (BGE 145 III 229 E. 4.2)`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for legal research',
        minLength: 1,
        maxLength: 2000,
      },
      jurisdiction: {
        type: 'string',
        enum: ['federal', 'cantonal'],
        description: 'Filter by federal or cantonal jurisdiction',
      },
      canton: {
        type: 'string',
        enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'],
        description: 'Specific canton for cantonal law research',
      },
      dateFrom: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'Start date filter (YYYY-MM-DD)',
      },
      dateTo: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'End date filter (YYYY-MM-DD)',
      },
      sources: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['statute', 'precedent', 'doctrine', 'commentary'],
        },
        description: 'Filter by source types',
      },
      domain: {
        type: 'string',
        enum: ['civil', 'criminal', 'administrative', 'commercial', 'employment', 'family', 'corporate', 'tax', 'property', 'international'],
        description: 'Filter by legal domain',
      },
      maxResults: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: 'Maximum number of results to return',
      },
      lang: {
        type: 'string',
        enum: ['de', 'fr', 'it', 'en'],
        description: 'Preferred language for results',
      },
    },
    required: ['query'],
  },
};

export const LEGAL_CITATION_TOOL: Tool = {
  name: 'legal_citation',
  description: `📖 **Swiss Legal Citation Handler** - Validate, parse, and format Swiss legal citations.

**Supported Citation Types**:
- **BGE/ATF/DTF**: Federal Supreme Court (e.g., BGE 145 III 229 E. 4.2)
- **Statutes**: Article references (e.g., Art. 97 Abs. 1 OR)
- **Doctrine**: Academic citations with margin numbers

**Actions**:
- **validate**: Check if a citation is valid and properly formatted
- **format**: Convert citations between languages (DE ↔ FR ↔ IT)
- **parse**: Extract structured components (volume, section, page, consideration)

**Multi-lingual Mapping**:
- German: BGE, Art., Abs., lit., E.
- French: ATF, art., al., let., consid.
- Italian: DTF, art., cpv., lett., consid.

**Use this when**: You need to verify, format, or parse Swiss legal citations.`,
  inputSchema: {
    type: 'object',
    properties: {
      citation: {
        type: 'string',
        description: 'The citation to validate, format, or parse',
        minLength: 1,
        maxLength: 500,
      },
      action: {
        type: 'string',
        enum: ['validate', 'format', 'parse'],
        description: 'Action to perform on the citation',
      },
      targetLang: {
        type: 'string',
        enum: ['de', 'fr', 'it', 'en'],
        description: 'Target language for formatting',
      },
      strict: {
        type: 'boolean',
        default: true,
        description: 'Enable strict validation mode',
      },
    },
    required: ['citation', 'action'],
  },
};

export const LEGAL_STRATEGY_TOOL: Tool = {
  name: 'legal_strategy',
  description: `⚖️ **Swiss Case Strategy Advisor** - Strategic analysis and litigation planning.

As your **Case Strategist**, I provide:
- **SWOT Analysis**: Strengths, weaknesses, opportunities, threats
- **Success Likelihood**: Evidence-based probability assessment
- **Strategic Options**: Multiple approaches with pros/cons
- **Key Precedents**: Relevant BGE supporting each position
- **Procedural Guidance**: Timelines, forums, procedural requirements
- **Settlement Analysis**: When applicable, settlement considerations

**Client Positions Supported**:
- Plaintiff / Kläger / demandeur / attore
- Defendant / Beklagter / défendeur / convenuto
- Appellant / Beschwerdeführer / recourant / ricorrente
- Respondent / Beschwerdegegner / intimé / controparte

**Use this when**: You need strategic advice on case positioning and litigation approach.

⚠️ **Disclaimer**: Analysis requires professional lawyer review.`,
  inputSchema: {
    type: 'object',
    properties: {
      caseDescription: {
        type: 'string',
        description: 'Detailed description of the legal case',
        minLength: 10,
        maxLength: 10000,
      },
      clientPosition: {
        type: 'string',
        enum: ['plaintiff', 'defendant', 'appellant', 'respondent'],
        description: 'Client role in the proceeding',
      },
      jurisdiction: {
        type: 'string',
        enum: ['federal', 'cantonal'],
        description: 'Applicable jurisdiction',
      },
      canton: {
        type: 'string',
        enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'],
        description: 'Relevant canton if cantonal jurisdiction',
      },
      domain: {
        type: 'string',
        enum: ['civil', 'criminal', 'administrative', 'commercial', 'employment', 'family', 'corporate', 'tax', 'property', 'international'],
        description: 'Legal domain of the case',
      },
      objectives: {
        type: 'array',
        items: { type: 'string' },
        description: 'Client objectives and desired outcomes',
      },
      constraints: {
        type: 'array',
        items: { type: 'string' },
        description: 'Budget, time, or other constraints',
      },
      lang: {
        type: 'string',
        enum: ['de', 'fr', 'it', 'en'],
        description: 'Preferred language for analysis',
      },
    },
    required: ['caseDescription', 'clientPosition'],
  },
};

export const LEGAL_DRAFT_TOOL: Tool = {
  name: 'legal_draft',
  description: `📝 **Swiss Legal Document Drafter** - Generate professional legal documents.

As your **Legal Drafter**, I create:
- **Contracts**: Commercial agreements, employment contracts
- **Briefs**: Legal submissions and pleadings
- **Motions**: Procedural requests
- **Opinions**: Legal analyses and memoranda
- **Letters**: Professional correspondence
- **Complaints/Responses**: Litigation documents

**Swiss Law Compliance**:
- Proper citation format (Art. X Abs. Y OR)
- Jurisdiction-appropriate language
- Required formalities and boilerplate
- Professional Swiss legal style

**Formality Levels**:
- Formal: Court submissions, official documents
- Standard: Business contracts, professional correspondence
- Informal: Internal memos, preliminary analyses

**Use this when**: You need to draft or structure a legal document.

⚠️ **Note**: All drafts require professional review before use.`,
  inputSchema: {
    type: 'object',
    properties: {
      documentType: {
        type: 'string',
        enum: ['contract', 'brief', 'motion', 'opinion', 'memorandum', 'letter', 'agreement', 'complaint', 'response'],
        description: 'Type of legal document to draft',
      },
      subject: {
        type: 'string',
        description: 'Subject or title of the document',
        minLength: 1,
        maxLength: 500,
      },
      content: {
        type: 'string',
        description: 'Content instructions or outline for drafting',
        maxLength: 20000,
      },
      parties: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            address: { type: 'string' },
          },
          required: ['name', 'role'],
        },
        description: 'Parties involved in the document',
      },
      jurisdiction: {
        type: 'string',
        enum: ['federal', 'cantonal'],
        description: 'Applicable jurisdiction',
      },
      canton: {
        type: 'string',
        enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'],
        description: 'Relevant canton',
      },
      lang: {
        type: 'string',
        enum: ['de', 'fr', 'it', 'en'],
        description: 'Document language',
      },
      formality: {
        type: 'string',
        enum: ['formal', 'standard', 'informal'],
        default: 'formal',
        description: 'Formality level of the document',
      },
      includeBoilerplate: {
        type: 'boolean',
        default: true,
        description: 'Include standard boilerplate clauses',
      },
    },
    required: ['documentType', 'subject'],
  },
};

export const LEGAL_ANALYZE_TOOL: Tool = {
  name: 'legal_analyze',
  description: `🔍 **Swiss Legal Document Analyzer** - Comprehensive document analysis.

As your **Legal Analyst**, I examine documents for:
- **Issues**: Legal problems, gaps, ambiguities
- **Risks**: Potential liabilities and exposures
- **Compliance**: Regulatory adherence check
- **Summary**: Executive overview of key points

**Analysis Types**:
- **issues**: Identify legal problems and gaps
- **risks**: Risk assessment with likelihood/impact
- **compliance**: Check against applicable regulations
- **summary**: Condensed overview of document
- **full**: Comprehensive analysis (all of the above)

**Supported Domains**:
Civil, Criminal, Administrative, Commercial, Employment, Family, Corporate, Tax, Property, International

**Output Includes**:
- Severity ratings (low/medium/high/critical)
- Relevant law citations
- Specific recommendations
- Risk mitigation strategies

**Use this when**: You need to analyze a document for legal issues, risks, or compliance.`,
  inputSchema: {
    type: 'object',
    properties: {
      document: {
        type: 'string',
        description: 'Document text to analyze',
        minLength: 1,
        maxLength: 50000,
      },
      analysisType: {
        type: 'string',
        enum: ['issues', 'risks', 'compliance', 'summary', 'full'],
        default: 'full',
        description: 'Type of analysis to perform',
      },
      domain: {
        type: 'string',
        enum: ['civil', 'criminal', 'administrative', 'commercial', 'employment', 'family', 'corporate', 'tax', 'property', 'international'],
        description: 'Legal domain context',
      },
      jurisdiction: {
        type: 'string',
        enum: ['federal', 'cantonal'],
        description: 'Applicable jurisdiction',
      },
      canton: {
        type: 'string',
        enum: ['ZH', 'BE', 'GE', 'BS', 'VD', 'TI'],
        description: 'Relevant canton',
      },
      lang: {
        type: 'string',
        enum: ['de', 'fr', 'it', 'en'],
        description: 'Preferred language for analysis',
      },
      focusAreas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific areas to focus on in the analysis',
      },
    },
    required: ['document'],
  },
};

/**
 * All tool definitions for the MCP server
 */
export const ALL_TOOLS: Tool[] = [
  LEGAL_GATEWAY_TOOL,
  LEGAL_RESEARCH_TOOL,
  LEGAL_CITATION_TOOL,
  LEGAL_STRATEGY_TOOL,
  LEGAL_DRAFT_TOOL,
  LEGAL_ANALYZE_TOOL,
];
