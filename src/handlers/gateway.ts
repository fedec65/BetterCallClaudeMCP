import type { LegalGatewayInput, LegalGatewayOutput, Language, Jurisdiction, LegalDomain } from '../types/index.js';

/**
 * Detect language from text using common word patterns
 */
function detectLanguage(text: string): Language {
  const germanIndicators = /\b(der|die|das|und|ist|ein|eine|für|mit|von|zu|des|auf|nicht|werden|wurde|kann|auch|oder)\b/gi;
  const frenchIndicators = /\b(le|la|les|de|du|des|et|est|un|une|pour|avec|qui|que|dans|sur|sont|cette|être|peut)\b/gi;
  const italianIndicators = /\b(il|la|le|di|del|della|e|è|un|una|per|con|che|sono|questa|nel|nella|essere|può)\b/gi;

  const germanMatches = (text.match(germanIndicators) || []).length;
  const frenchMatches = (text.match(frenchIndicators) || []).length;
  const italianMatches = (text.match(italianIndicators) || []).length;

  // If no clear matches, default to German (most common in Swiss legal)
  if (germanMatches === 0 && frenchMatches === 0 && italianMatches === 0) {
    return 'de';
  }

  if (germanMatches >= frenchMatches && germanMatches >= italianMatches) return 'de';
  if (frenchMatches >= germanMatches && frenchMatches >= italianMatches) return 'fr';
  if (italianMatches >= germanMatches && italianMatches >= frenchMatches) return 'it';

  return 'de'; // Default
}

/**
 * Detect legal intent from query
 */
function detectIntent(query: string): 'research' | 'citation' | 'strategy' | 'draft' | 'analyze' {
  const lowerQuery = query.toLowerCase();

  // Citation indicators
  const citationPatterns = [
    /bge\s*\d+/i,
    /atf\s*\d+/i,
    /dtf\s*\d+/i,
    /art\.\s*\d+/i,
    /\b(validate|format|parse|citation|zitat|référence|citazione)\b/i,
  ];
  if (citationPatterns.some(p => p.test(lowerQuery))) {
    return 'citation';
  }

  // Strategy indicators
  const strategyKeywords = [
    'strategy', 'strategie', 'stratégie', 'strategia',
    'risk', 'risiko', 'risque', 'rischio',
    'chance', 'erfolg', 'succès', 'successo',
    'case analysis', 'fallanalyse', 'analyse du cas',
    'litigation', 'prozess', 'procès', 'processo',
    'settlement', 'vergleich', 'règlement', 'transazione',
  ];
  if (strategyKeywords.some(k => lowerQuery.includes(k))) {
    return 'strategy';
  }

  // Draft indicators
  const draftKeywords = [
    'draft', 'entwurf', 'projet', 'bozza',
    'contract', 'vertrag', 'contrat', 'contratto',
    'write', 'schreiben', 'rédiger', 'scrivere',
    'prepare', 'vorbereiten', 'préparer', 'preparare',
    'brief', 'rechtsschrift', 'mémoire', 'memoria',
    'motion', 'antrag', 'requête', 'istanza',
  ];
  if (draftKeywords.some(k => lowerQuery.includes(k))) {
    return 'draft';
  }

  // Analyze indicators
  const analyzeKeywords = [
    'analyze', 'analysieren', 'analyser', 'analizzare',
    'review', 'prüfen', 'examiner', 'esaminare',
    'check', 'überprüfen', 'vérifier', 'verificare',
    'compliance', 'konformität', 'conformité', 'conformità',
    'issue', 'problem', 'problème', 'problema',
  ];
  if (analyzeKeywords.some(k => lowerQuery.includes(k))) {
    return 'analyze';
  }

  // Default to research
  return 'research';
}

/**
 * Detect jurisdiction from query
 */
function detectJurisdiction(query: string): { jurisdiction: Jurisdiction; canton?: string } {
  const lowerQuery = query.toLowerCase();

  // Check for canton mentions
  const cantonPatterns: Array<{ pattern: RegExp; canton: string }> = [
    { pattern: /\b(zürich|zurich|zh)\b/i, canton: 'ZH' },
    { pattern: /\b(bern|berne|be)\b/i, canton: 'BE' },
    { pattern: /\b(genève|geneva|genf|ge)\b/i, canton: 'GE' },
    { pattern: /\b(basel.stadt|bâle.ville|bs)\b/i, canton: 'BS' },
    { pattern: /\b(vaud|waadt|vd)\b/i, canton: 'VD' },
    { pattern: /\b(ticino|tessin|ti)\b/i, canton: 'TI' },
  ];

  for (const { pattern, canton } of cantonPatterns) {
    if (pattern.test(query)) {
      return { jurisdiction: 'cantonal', canton };
    }
  }

  // Check for cantonal indicators
  if (lowerQuery.includes('kantonal') || lowerQuery.includes('cantonal') || lowerQuery.includes('cantonale')) {
    return { jurisdiction: 'cantonal' };
  }

  // Default to federal
  return { jurisdiction: 'federal' };
}

/**
 * Detect legal domain from query
 */
function detectDomain(query: string): LegalDomain | undefined {
  const lowerQuery = query.toLowerCase();

  const domainKeywords: Array<{ domain: LegalDomain; keywords: string[] }> = [
    { domain: 'civil', keywords: ['civil', 'zivil', 'privat', 'zgb', 'cc'] },
    { domain: 'criminal', keywords: ['criminal', 'straf', 'pénal', 'penale', 'stgb', 'cp'] },
    { domain: 'administrative', keywords: ['administrative', 'verwaltung', 'administratif', 'amministrativ'] },
    { domain: 'commercial', keywords: ['commercial', 'handels', 'commercial', 'commerciale', 'or', 'co'] },
    { domain: 'employment', keywords: ['employment', 'arbeit', 'travail', 'lavoro', 'arbeitsrecht'] },
    { domain: 'family', keywords: ['family', 'familie', 'famille', 'famiglia', 'ehe', 'divorce'] },
    { domain: 'corporate', keywords: ['corporate', 'gesellschaft', 'société', 'società', 'gmbh', 'ag', 'sa'] },
    { domain: 'tax', keywords: ['tax', 'steuer', 'fiscal', 'fiscale', 'impôt', 'imposta'] },
    { domain: 'property', keywords: ['property', 'sachen', 'propriété', 'proprietà', 'immobilien', 'grundstück'] },
    { domain: 'international', keywords: ['international', 'ipr', 'lugano', 'rom'] },
  ];

  for (const { domain, keywords } of domainKeywords) {
    if (keywords.some(k => lowerQuery.includes(k))) {
      return domain;
    }
  }

  return undefined;
}

/**
 * Map intent to suggested tool
 */
function getSuggestedTool(intent: string): string {
  const mapping: Record<string, string> = {
    research: 'legal_research',
    citation: 'legal_citation',
    strategy: 'legal_strategy',
    draft: 'legal_draft',
    analyze: 'legal_analyze',
  };
  return mapping[intent] ?? 'legal_research';
}

/**
 * Handle the legal_gateway tool
 * Analyzes query and routes to appropriate specialized tool
 */
export async function handleLegalGateway(
  input: LegalGatewayInput,
  _requestId: string
): Promise<LegalGatewayOutput> {
  const { query, context, lang } = input;
  const fullText = context ? `${query} ${context}` : query;

  // Detect language
  const detectedLanguage = lang ?? detectLanguage(fullText);

  // Detect intent
  const detectedIntent = detectIntent(fullText);

  // Detect jurisdiction
  const { jurisdiction, canton } = detectJurisdiction(fullText);

  // Detect domain
  const detectedDomain = detectDomain(fullText);

  // Determine suggested tool
  const suggestedTool = getSuggestedTool(detectedIntent);

  // Build suggested parameters
  const suggestedParameters: Record<string, unknown> = {
    lang: detectedLanguage,
  };

  if (jurisdiction === 'cantonal') {
    suggestedParameters.jurisdiction = 'cantonal';
    if (canton) {
      suggestedParameters.canton = canton;
    }
  }

  if (detectedDomain) {
    suggestedParameters.domain = detectedDomain;
  }

  // Add tool-specific parameters
  switch (suggestedTool) {
    case 'legal_research':
      suggestedParameters.query = query;
      suggestedParameters.maxResults = 10;
      break;
    case 'legal_citation':
      suggestedParameters.citation = query;
      suggestedParameters.action = 'validate';
      break;
    case 'legal_strategy':
      suggestedParameters.caseDescription = query;
      suggestedParameters.clientPosition = 'plaintiff'; // Default, user should specify
      break;
    case 'legal_draft':
      suggestedParameters.subject = query;
      suggestedParameters.documentType = 'memorandum'; // Default, user should specify
      break;
    case 'legal_analyze':
      suggestedParameters.document = query;
      suggestedParameters.analysisType = 'full';
      break;
  }

  // Calculate confidence based on signal strength
  const signals: boolean[] = [
    detectedIntent !== 'research', // Non-default intent
    jurisdiction === 'cantonal', // Specific jurisdiction
    !!canton, // Specific canton
    !!detectedDomain, // Specific domain
  ];
  const confidence = 0.5 + (signals.filter(Boolean).length * 0.1);

  // Generate reasoning
  const reasoning = generateReasoning(
    detectedLanguage,
    detectedIntent,
    jurisdiction,
    canton,
    detectedDomain
  );

  return {
    detectedIntent,
    detectedLanguage,
    detectedJurisdiction: jurisdiction,
    detectedCanton: canton as LegalGatewayOutput['detectedCanton'],
    detectedDomain,
    confidence: Math.min(confidence, 0.95),
    suggestedTool,
    suggestedParameters,
    reasoning,
  };
}

function generateReasoning(
  language: Language,
  intent: string,
  jurisdiction: Jurisdiction,
  canton: string | undefined,
  domain: LegalDomain | undefined
): string {
  const parts: string[] = [];

  // Language
  const langNames: Record<Language, string> = {
    de: 'German',
    fr: 'French',
    it: 'Italian',
    en: 'English',
  };
  parts.push(`Detected language: ${langNames[language]}`);

  // Intent
  parts.push(`Identified intent: ${intent}`);

  // Jurisdiction
  if (jurisdiction === 'cantonal' && canton) {
    parts.push(`Jurisdiction: Cantonal (${canton})`);
  } else if (jurisdiction === 'cantonal') {
    parts.push('Jurisdiction: Cantonal (unspecified canton)');
  } else {
    parts.push('Jurisdiction: Federal');
  }

  // Domain
  if (domain) {
    parts.push(`Legal domain: ${domain}`);
  }

  return parts.join('. ') + '.';
}
