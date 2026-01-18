import {
  DocAnalyzeInput,
  DocAnalyzeOutput,
  DocAnalyzeInputSchema,
  DocumentType,
  Language,
  LegalIssue,
  Jurisdiction,
  Canton,
} from '../types.js';

// Document type detection patterns
// Note: Patterns are weighted - need multiple matches or strong indicators
const DOCUMENT_TYPE_PATTERNS: Record<DocumentType, { patterns: RegExp[]; minMatches: number }> = {
  contract: {
    patterns: [
      /\bkaufvertrag\b/i,
      /\bmietvertrag\b/i,
      /\barbeitsvertrag\b/i,
      /\bvertrag\b/i,
      /\bcontrat\b/i,
      /\bcontratto\b/i,
      /zwischen.*und/i,
      /entre.*et/i,
      /tra.*e/i,
      /verkäufer.*käufer/i,
      /vendeur.*acheteur/i,
      /nachfolgend\s*["„]/i,
      /ci-après\s*["«]/i,
    ],
    minMatches: 2,
  },
  brief: {
    patterns: [
      /\bmémoire\s+de\s+recours\b/i,
      /\brecours\b/i,
      /\bmémoire\b/i,
      /\bbeschwerde\b/i,
      /\brechtsschrift\b/i,
      /\bricorso\b/i,
      /\brecourant\b/i,
      /\bintimé\b/i,
      /devant.*tribunal/i,
    ],
    minMatches: 2,
  },
  opinion: {
    patterns: [
      /\bgutachten\b/i,
      /\bavis\s+de\s+droit\b/i,
      /\bparere\b/i,
      /\brechtsgutachten\b/i,
    ],
    minMatches: 1,
  },
  correspondence: {
    patterns: [
      /sehr\s+geehrte/i,
      /cher\s+monsieur/i,
      /chère\s+madame/i,
      /dear\s+sir/i,
      /egregio/i,
    ],
    minMatches: 1,
  },
  court_decision: {
    patterns: [
      /\burteil\b/i,
      /\barrêt\b/i,
      /\bsentenza\b/i,
      /\bjudgment\b/i,
      /\bentscheid\b/i,
      /bge\s+\d+/i,
      /atf\s+\d+/i,
    ],
    minMatches: 1,
  },
  statute: {
    patterns: [
      /\bgesetz\b/i,
      /\bloi\b/i,
      /\blegge\b/i,
      /\bverordnung\b/i,
      /\bordonnance\b/i,
      /\bordinanza\b/i,
    ],
    minMatches: 1,
  },
  unknown: {
    patterns: [],
    minMatches: 0,
  },
};

// Language detection patterns
const LANGUAGE_PATTERNS: Record<Language, RegExp[]> = {
  de: [
    /\b(der|die|das|und|ist|sind|werden|wurde|hat|haben|nicht|mit|von|auf|für|bei|nach)\b/gi,
    /\b(verkäufer|käufer|vertrag|recht|gesetz|artikel|absatz)\b/gi,
  ],
  fr: [
    /\b(le|la|les|et|est|sont|été|pas|avec|pour|dans|par|sur|que)\b/gi,
    /\b(contrat|droit|loi|article|alinéa|recours|tribunal)\b/gi,
  ],
  it: [
    /\b(il|la|lo|gli|le|e|è|sono|stato|non|con|per|di|da|che)\b/gi,
    /\b(contratto|diritto|legge|articolo|capoverso|ricorso|tribunale)\b/gi,
  ],
  en: [
    /\b(the|and|is|are|was|were|have|has|not|with|for|from|that|this)\b/gi,
    /\b(contract|law|act|article|section|clause|agreement)\b/gi,
  ],
};

// Swiss legal citation patterns
const LEGAL_CITATION_PATTERNS = [
  // German: Art. 123 Abs. 2 OR, Art. 216 ff. OR
  /Art\.\s*\d+(?:\s*(?:Abs\.|Ziff\.|lit\.|ff\.)\s*\d*[a-z]?)*\s*(?:ZGB|OR|StGB|StPO|ZPO|BV|SchKG|UWG|DSG|IPRG|MSchG|URG)/gi,
  // French: art. 123 al. 2 CO, art. 216 ss CO
  /art\.\s*\d+(?:\s*(?:al\.|ch\.|let\.|ss\.?)\s*\d*[a-z]?)*\s*(?:CC|CO|CP|CPP|CPC|Cst|LP|LCD|LPD|LDIP|LPM|LDA)/gi,
  // Italian: art. 123 cpv. 2 CO, art. 216 segg. CO
  /art\.\s*\d+(?:\s*(?:cpv\.|n\.|lett\.|segg\.?)\s*\d*[a-z]?)*\s*(?:CC|CO|CP|CPP|CPC|Cost|LEF|LCSl|LPD|LDIP|LPM|LDA)/gi,
  // BGE/ATF/DTF citations
  /BGE\s+\d+\s+[IVa]+\s+\d+/gi,
  /ATF\s+\d+\s+[IVa]+\s+\d+/gi,
  /DTF\s+\d+\s+[IVa]+\s+\d+/gi,
  // LTF references
  /art\.\s*\d+\s*LTF/gi,
];

// Date patterns
const DATE_PATTERNS = [
  // German: 31. März 2024
  /(\d{1,2})\.\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/gi,
  // French: 31 mars 2024
  /(\d{1,2})\s*(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s*(\d{4})/gi,
  // Italian: 31 marzo 2024
  /(\d{1,2})\s*(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s*(\d{4})/gi,
  // ISO format: 2024-03-31
  /\d{4}-\d{2}-\d{2}/g,
  // European format: 31.03.2024
  /\d{1,2}\.\d{1,2}\.\d{4}/g,
];

// Party identification patterns
const PARTY_PATTERNS = [
  // German
  /(?:Herr|Frau|Firma)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)/g,
  // French
  /(?:Monsieur|Madame|Société)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)*)/g,
  // Role indicators
  /\(nachfolgend\s*["„]([^"„"]+)["„"]\)/gi,
  /\(ci-après\s*["«]([^"»]+)["»]\)/gi,
];

// Canton detection
const CANTON_PATTERNS: Record<Canton, RegExp[]> = {
  ZH: [/zürich/i, /zurich/i, /\bZH\b/],
  BE: [/bern/i, /berne/i, /\bBE\b/],
  GE: [/genève/i, /genf/i, /geneva/i, /\bGE\b/],
  BS: [/basel-stadt/i, /basel\s*stadt/i, /\bBS\b/],
  VD: [/vaud/i, /waadt/i, /\bVD\b/],
  TI: [/ticino/i, /tessin/i, /\bTI\b/],
};

/**
 * Detects the document type based on content patterns
 * Uses weighted matching - requires minimum number of pattern matches
 */
function detectDocumentType(content: string): DocumentType {
  let bestMatch: DocumentType = 'unknown';
  let bestScore = 0;

  for (const [type, config] of Object.entries(DOCUMENT_TYPE_PATTERNS)) {
    if (type === 'unknown') continue;

    let matchCount = 0;
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        matchCount++;
      }
    }

    // Only consider if minimum matches are met
    if (matchCount >= config.minMatches && matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = type as DocumentType;
    }
  }

  return bestMatch;
}

/**
 * Detects the primary language of the content
 */
function detectLanguage(content: string): Language {
  const scores: Record<Language, number> = { de: 0, fr: 0, it: 0, en: 0 };

  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        scores[lang as Language] += matches.length;
      }
    }
  }

  // Find language with highest score
  let maxScore = 0;
  let detectedLang: Language = 'en'; // Default to English

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang as Language;
    }
  }

  return detectedLang;
}

/**
 * Extracts legal citations from content
 */
function extractLegalCitations(content: string): Array<{ citation: string; context: string }> {
  const citations: Array<{ citation: string; context: string }> = [];
  const seen = new Set<string>();

  for (const pattern of LEGAL_CITATION_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const citation = match[0].trim();
      if (!seen.has(citation.toLowerCase())) {
        seen.add(citation.toLowerCase());
        // Extract surrounding context (50 chars before and after)
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + citation.length + 50);
        const context = content.slice(start, end).trim().replace(/\s+/g, ' ');
        citations.push({ citation, context });
      }
    }
  }

  return citations;
}

/**
 * Extracts dates from content
 */
function extractDates(content: string): Array<{ date: string; description: string; isDeadline: boolean }> {
  const dates: Array<{ date: string; description: string; isDeadline: boolean }> = [];
  const seen = new Set<string>();

  // Deadline keywords
  const deadlineKeywords = [
    /spätestens/i, /bis/i, /frist/i, /deadline/i,
    /délai/i, /au\s+plus\s+tard/i,
    /termine/i, /entro/i,
  ];

  for (const pattern of DATE_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const date = match[0].trim();
      if (!seen.has(date)) {
        seen.add(date);
        // Get context around the date
        const start = Math.max(0, match.index - 100);
        const end = Math.min(content.length, match.index + date.length + 50);
        const context = content.slice(start, end);

        // Check if this is a deadline
        const isDeadline = deadlineKeywords.some((kw) => kw.test(context));

        dates.push({
          date,
          description: context.trim().replace(/\s+/g, ' ').slice(0, 100),
          isDeadline,
        });
      }
    }
  }

  return dates;
}

/**
 * Extracts parties from content
 */
function extractParties(content: string): Array<{ name: string; role: string }> {
  const parties: Array<{ name: string; role: string }> = [];
  const seen = new Set<string>();

  // Extract parties with roles
  const rolePatterns = [
    { pattern: /(?:Herr|Frau)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß]+)*)[^(]*\(nachfolgend\s*["„]([^"„"]+)["„"]\)/gi, nameGroup: 1, roleGroup: 2 },
    { pattern: /(?:Monsieur|Madame)\s+([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)*)[^(]*\(ci-après\s*["«]([^"»]+)["»]\)/gi, nameGroup: 1, roleGroup: 2 },
    { pattern: /(?:Recourant|Intimé|Appelant|Demandeur|Défendeur):\s*([A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+(?:\s+[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜÇ][a-zàâäéèêëïîôùûüç]+)*)/gi, nameGroup: 1, roleGroup: 0 },
  ];

  for (const { pattern, nameGroup, roleGroup } of rolePatterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      const name = match[nameGroup]?.trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const role = roleGroup > 0 ? match[roleGroup]?.trim() || 'Party' : match[0].split(':')[0].trim();
        parties.push({ name, role });
      }
    }
  }

  return parties;
}

/**
 * Detects jurisdiction from content
 */
function detectJurisdiction(content: string): { detected: Jurisdiction; canton?: Canton; confidence: number } {
  // Check for federal indicators
  const federalPatterns = [
    /bundesrecht/i, /droit\s+fédéral/i, /diritto\s+federale/i,
    /BGE/i, /ATF/i, /DTF/i,
    /bundesgericht/i, /tribunal\s+fédéral/i, /tribunale\s+federale/i,
    /\b(ZGB|OR|StGB|StPO|ZPO|BV)\b/i,
    /\b(CC|CO|CP|CPP|CPC|Cst)\b/i,
  ];

  let federalScore = 0;
  for (const pattern of federalPatterns) {
    if (pattern.test(content)) {
      federalScore++;
    }
  }

  // Check for cantonal indicators
  let cantonalScore = 0;
  let detectedCanton: Canton | undefined;

  for (const [canton, patterns] of Object.entries(CANTON_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        cantonalScore++;
        detectedCanton = canton as Canton;
        break;
      }
    }
    if (detectedCanton) break;
  }

  // Determine jurisdiction
  const totalScore = federalScore + cantonalScore;
  const confidence = totalScore > 0 ? Math.min(1, totalScore / 5) : 0.5;

  if (federalScore > cantonalScore) {
    return { detected: 'federal', canton: detectedCanton, confidence };
  } else if (cantonalScore > 0) {
    return { detected: 'cantonal', canton: detectedCanton, confidence };
  }

  return { detected: 'federal', confidence: 0.5 };
}

/**
 * Generates a summary of the document
 */
function generateSummary(
  content: string,
  documentType: DocumentType,
  parties: Array<{ name: string; role: string }>,
  language: Language
): string {
  const summaries: Record<Language, Record<DocumentType, (parties: string[]) => string>> = {
    de: {
      contract: (p) => `Vertrag zwischen ${p.join(' und ')}. Enthält Bestimmungen zu den vertraglichen Pflichten und Rechten der Parteien.`,
      brief: () => 'Rechtsschrift an ein Gericht. Enthält rechtliche Argumentation und Anträge.',
      opinion: () => 'Rechtsgutachten mit Analyse der relevanten Rechtsfragen und Empfehlungen.',
      correspondence: () => 'Rechtliche Korrespondenz mit Informationen oder Anfragen.',
      court_decision: () => 'Gerichtsentscheid mit rechtlicher Würdigung und Dispositiv.',
      statute: () => 'Gesetzestext mit normativen Bestimmungen.',
      unknown: () => 'Dokument mit rechtlich relevantem Inhalt.',
    },
    fr: {
      contract: (p) => `Contrat entre ${p.join(' et ')}. Contient des dispositions relatives aux droits et obligations des parties.`,
      brief: () => 'Écriture juridique adressée à un tribunal. Contient une argumentation juridique et des conclusions.',
      opinion: () => 'Avis de droit avec analyse des questions juridiques pertinentes et recommandations.',
      correspondence: () => 'Correspondance juridique avec informations ou demandes.',
      court_decision: () => 'Décision judiciaire avec appréciation juridique et dispositif.',
      statute: () => 'Texte législatif avec dispositions normatives.',
      unknown: () => 'Document à contenu juridiquement pertinent.',
    },
    it: {
      contract: (p) => `Contratto tra ${p.join(' e ')}. Contiene disposizioni sui diritti e obblighi delle parti.`,
      brief: () => 'Scritto giuridico indirizzato a un tribunale. Contiene argomentazione giuridica e conclusioni.',
      opinion: () => 'Parere legale con analisi delle questioni giuridiche rilevanti e raccomandazioni.',
      correspondence: () => 'Corrispondenza legale con informazioni o richieste.',
      court_decision: () => 'Decisione giudiziaria con valutazione giuridica e dispositivo.',
      statute: () => 'Testo legislativo con disposizioni normative.',
      unknown: () => 'Documento con contenuto giuridicamente rilevante.',
    },
    en: {
      contract: (p) => `Contract between ${p.join(' and ')}. Contains provisions regarding the rights and obligations of the parties.`,
      brief: () => 'Legal brief submitted to a court. Contains legal argumentation and motions.',
      opinion: () => 'Legal opinion with analysis of relevant legal questions and recommendations.',
      correspondence: () => 'Legal correspondence with information or requests.',
      court_decision: () => 'Court decision with legal assessment and ruling.',
      statute: () => 'Legislative text with normative provisions.',
      unknown: () => 'Document with legally relevant content.',
    },
  };

  const partyNames = parties.map((p) => p.name);
  return summaries[language][documentType](partyNames);
}

/**
 * Identifies potential legal issues in the document
 */
function identifyLegalIssues(
  content: string,
  documentType: DocumentType,
  language: Language
): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for missing formality requirements
  if (documentType === 'contract') {
    // Check for notarization requirement mentions (real estate)
    if (/grundstück|immobil|liegenschaft|immeuble|immobilier|immobile/i.test(content)) {
      if (!/notari|öffentlich\s+beurkund|forme\s+authentique|atto\s+pubblico/i.test(content)) {
        issues.push({
          issue: language === 'de' ? 'Formerfordernis bei Grundstückgeschäften' :
                 language === 'fr' ? 'Exigence de forme pour les affaires immobilières' :
                 language === 'it' ? 'Requisito di forma per gli affari immobiliari' :
                 'Form requirement for real estate transactions',
          relevantLaw: ['Art. 216 OR', 'Art. 657 ZGB'],
          severity: 'high' as const,
          recommendation: language === 'de' ? 'Öffentliche Beurkundung prüfen' :
                         language === 'fr' ? 'Vérifier la forme authentique' :
                         language === 'it' ? 'Verificare la forma autentica' :
                         'Verify notarization requirement',
        });
      }
    }
  }

  // Check for jurisdiction clause
  if (documentType === 'contract' && !/gerichtsstand|for\s+juridique|foro/i.test(content)) {
    issues.push({
      issue: language === 'de' ? 'Fehlende Gerichtsstandsklausel' :
             language === 'fr' ? 'Clause de for manquante' :
             language === 'it' ? 'Clausola di foro mancante' :
             'Missing jurisdiction clause',
      relevantLaw: ['Art. 17 ZPO'],
      severity: 'medium' as const,
    });
  }

  return issues;
}

/**
 * Analyzes a legal document and extracts structured information
 */
export function docAnalyze(input: Partial<DocAnalyzeInput>): DocAnalyzeOutput {
  const validatedInput = DocAnalyzeInputSchema.parse(input);
  const { content, documentType: providedType, language } = validatedInput;

  // Detect document type if not provided
  const documentType = providedType || detectDocumentType(content);

  // Detect language of content
  const detectedLanguage = detectLanguage(content);

  // Extract legal citations
  const citedLaw = extractLegalCitations(content);

  // Extract dates
  const keyDates = extractDates(content);

  // Extract parties
  const identifiedParties = extractParties(content);

  // Detect jurisdiction
  const jurisdiction = detectJurisdiction(content);

  // Generate summary
  const summary = generateSummary(content, documentType, identifiedParties, language);

  // Identify legal issues
  const legalIssues = identifyLegalIssues(content, documentType, language);

  // Generate recommendations based on analysis
  const recommendations: string[] = [];
  if (legalIssues.length > 0) {
    for (const issue of legalIssues) {
      if (issue.recommendation) {
        recommendations.push(issue.recommendation);
      }
    }
  }

  return {
    documentType,
    detectedLanguage,
    summary,
    legalIssues,
    identifiedParties,
    keyDates,
    citedLaw,
    jurisdiction,
    recommendations,
    language,
  };
}
