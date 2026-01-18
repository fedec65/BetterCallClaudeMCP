/**
 * legal_analyze tool implementation
 *
 * Analyzes legal documents for issues, missing clauses, and compliance.
 * Supports multiple languages (de, fr, it, en) and various focus areas.
 */

import type {
  LegalAnalyzeInput,
  LegalAnalyzeOutput,
  LegalIssue,
  MissingClause,
  ComplianceCheck,
  Language,
  FocusArea,
} from '../types.js';

/**
 * Main function to analyze legal documents
 */
export async function legalAnalyze(input: LegalAnalyzeInput): Promise<LegalAnalyzeOutput> {
  const {
    document,
    document_type,
    analysis_depth = 'standard',
    focus_areas = ['general'],
    language = 'de',
    check_compliance = true,
  } = input;

  // Parse document to extract information
  const documentInfo = parseDocument(document, language);

  // Determine document type from content or input
  const detectedType = document_type || detectDocumentType(document, language);

  // Identify parties
  const parties = extractParties(document, language);

  // Extract key terms based on focus areas
  const keyTerms = extractKeyTerms(document, focus_areas, language);

  // Analyze for issues based on depth and focus areas
  const issues = analyzeIssues(document, detectedType, focus_areas, analysis_depth, language);

  // Identify missing clauses
  const missingClauses = identifyMissingClauses(document, detectedType, focus_areas, analysis_depth, language);

  // Perform compliance checks if enabled
  const compliance = check_compliance
    ? performComplianceChecks(document, detectedType, focus_areas, analysis_depth, language)
    : [];

  // Generate recommendations
  const recommendations = generateRecommendations(issues, missingClauses, compliance, language);

  // Calculate overall assessment
  const overallAssessment = calculateOverallAssessment(issues, missingClauses, compliance);

  return {
    summary: {
      documentType: formatDocumentType(detectedType, language),
      parties,
      effectiveDate: documentInfo.effectiveDate,
      keyTerms,
      overallAssessment,
    },
    issues,
    missingClauses,
    compliance,
    recommendations,
    metadata: {
      analysisDepth: analysis_depth,
      focusAreas: focus_areas,
      language,
      analyzedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Document Parsing Helpers
// ============================================================================

interface DocumentInfo {
  effectiveDate?: string;
  hasDateClause: boolean;
}

function parseDocument(document: string, _language: Language): DocumentInfo {
  // Try to extract effective date
  const datePatterns = [
    /(\d{1,2})\.\s*(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s*(\d{4})/i,
    /(\d{1,2})\.\s*(\d{1,2})\.?\s*(\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /tritt am\s+(.+?)\s+in Kraft/i,
    /effective\s+(?:as\s+of\s+)?(.+?)(?:\.|$)/i,
  ];

  let effectiveDate: string | undefined;
  for (const pattern of datePatterns) {
    const match = document.match(pattern);
    if (match) {
      effectiveDate = match[0];
      break;
    }
  }

  return {
    effectiveDate,
    hasDateClause: !!effectiveDate,
  };
}

function detectDocumentType(document: string, _language: Language): string {
  const lower = document.toLowerCase();

  // Contract types
  if (lower.includes('dienstleistungsvertrag') || lower.includes('service agreement') ||
      lower.includes('contrat de prestation') || lower.includes('contratto di servizio')) {
    return 'service_agreement';
  }
  if (lower.includes('arbeitsvertrag') || lower.includes('employment contract') ||
      lower.includes('contrat de travail') || lower.includes('contratto di lavoro')) {
    return 'employment_contract';
  }
  if (lower.includes('geheimhaltung') || lower.includes('nda') || lower.includes('non-disclosure') ||
      lower.includes('confidentialité') || lower.includes('riservatezza')) {
    return 'nda';
  }
  if (lower.includes('aktionärbindung') || lower.includes('shareholders') ||
      lower.includes('actionnaires') || lower.includes('azionisti')) {
    return 'shareholders_agreement';
  }
  if (lower.includes('mietvertrag') || lower.includes('lease') ||
      lower.includes('bail') || lower.includes('locazione')) {
    return 'lease_agreement';
  }
  if (lower.includes('darlehen') || lower.includes('loan') ||
      lower.includes('prêt') || lower.includes('prestito')) {
    return 'loan_agreement';
  }

  // Litigation documents
  if (lower.includes('klageschrift') || lower.includes('statement of claim')) {
    return 'klageschrift';
  }
  if (lower.includes('klageantwort') || lower.includes('defense')) {
    return 'klageantwort';
  }

  // Legal opinions
  if (lower.includes('rechtsgutachten') || lower.includes('legal opinion')) {
    return 'rechtsgutachten';
  }
  if (lower.includes('memorandum')) {
    return 'memorandum';
  }

  return 'contract';
}

function extractParties(document: string, language: Language): string[] {
  const parties: string[] = [];
  const lower = document.toLowerCase();

  // Pattern matching for party identification
  const partyPatterns: Record<Language, RegExp[]> = {
    de: [
      /zwischen\s+(.+?)\s*(?:\(nachfolgend|und)/gi,
      /(?:auftraggeber|auftragnehmer|arbeitgeber|arbeitnehmer|mieter|vermieter)[:\s]+([^\n,]+)/gi,
      /([A-Z][a-zäöü]+(?:\s+(?:AG|GmbH|SA|Sàrl|Ltd))?)/g,
    ],
    fr: [
      /entre\s+(.+?)\s*(?:\(ci-après|et)/gi,
      /(?:le mandant|le prestataire|l'employeur|l'employé)[:\s]+([^\n,]+)/gi,
      /([A-Z][a-zéèêëàâäôöùûü]+(?:\s+(?:SA|Sàrl|AG|GmbH|Ltd))?)/g,
    ],
    it: [
      /tra\s+(.+?)\s*(?:\(il|e)/gi,
      /(?:il cliente|il fornitore|il datore|il lavoratore)[:\s]+([^\n,]+)/gi,
      /([A-Z][a-zàèéìòù]+(?:\s+(?:SA|Sagl|AG|GmbH|Ltd))?)/g,
    ],
    en: [
      /between\s+(.+?)\s*(?:\("|\(the|and)/gi,
      /(?:client|provider|employer|employee)[:\s]+([^\n,]+)/gi,
      /([A-Z][a-z]+(?:\s+(?:Ltd|Inc|AG|GmbH|SA))?)/g,
    ],
  };

  const patterns = partyPatterns[language] || partyPatterns.de;

  for (const pattern of patterns) {
    const matches = document.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const party = match[1].trim().replace(/[,;]$/, '');
        if (party.length > 2 && !parties.includes(party) && !isCommonWord(party, lower)) {
          parties.push(party);
        }
      }
    }
    if (parties.length >= 2) break;
  }

  // Fallback: Look for company suffixes
  if (parties.length < 2) {
    const companyPattern = /([A-Z][a-zäöüàèéìòùéèêëàâäôöùûü]+(?:\s+[A-Z][a-zäöüàèéìòùéèêëàâäôöùûü]+)*\s+(?:AG|GmbH|SA|Sàrl|Sagl|Ltd|Inc))/g;
    const companyMatches = document.matchAll(companyPattern);
    for (const match of companyMatches) {
      if (!parties.includes(match[1])) {
        parties.push(match[1]);
      }
    }
  }

  return parties.slice(0, 4); // Return max 4 parties
}

function isCommonWord(word: string, _document: string): boolean {
  const commonWords = [
    'der', 'die', 'das', 'und', 'the', 'and', 'le', 'la', 'et', 'il', 'lo', 'e',
    'vertrag', 'contract', 'contrat', 'contratto',
    'gegenstand', 'subject', 'objet', 'oggetto',
  ];
  return commonWords.includes(word.toLowerCase());
}

function extractKeyTerms(document: string, focusAreas: FocusArea[], language: Language): string[] {
  const terms: string[] = [];
  const lower = document.toLowerCase();

  // Extract based on focus areas
  const termPatterns: Record<FocusArea, Record<Language, RegExp[]>> = {
    payment: {
      de: [/chf\s*[\d'.]+/gi, /vergütung[:\s]+([^\n.]+)/gi, /(\d+)\s*(?:pro stunde|monatlich)/gi],
      fr: [/chf\s*[\d'.]+/gi, /rémunération[:\s]+([^\n.]+)/gi, /(\d+)\s*(?:par heure|mensuel)/gi],
      it: [/chf\s*[\d'.]+/gi, /compenso[:\s]+([^\n.]+)/gi, /(\d+)\s*(?:all'ora|mensile)/gi],
      en: [/chf\s*[\d'.]+/gi, /compensation[:\s]+([^\n.]+)/gi, /(\d+)\s*(?:per hour|monthly)/gi],
    },
    termination: {
      de: [/kündigung[:\s]+([^\n.]+)/gi, /(\d+)\s*(?:tage|monate?)?\s*frist/gi],
      fr: [/résiliation[:\s]+([^\n.]+)/gi, /préavis[:\s]+([^\n.]+)/gi],
      it: [/disdetta[:\s]+([^\n.]+)/gi, /preavviso[:\s]+([^\n.]+)/gi],
      en: [/termination[:\s]+([^\n.]+)/gi, /(\d+)\s*(?:days?|months?)?\s*notice/gi],
    },
    liability: {
      de: [/haftung[:\s]+([^\n.]+)/gi, /beschränkt auf\s+([^\n.]+)/gi],
      fr: [/responsabilité[:\s]+([^\n.]+)/gi, /limitée à\s+([^\n.]+)/gi],
      it: [/responsabilità[:\s]+([^\n.]+)/gi, /limitata a\s+([^\n.]+)/gi],
      en: [/liability[:\s]+([^\n.]+)/gi, /limited to\s+([^\n.]+)/gi],
    },
    general: {
      de: [/gerichtsstand[:\s]+([^\n.]+)/gi, /anwendbares recht[:\s]+([^\n.]+)/gi],
      fr: [/for juridique[:\s]+([^\n.]+)/gi, /droit applicable[:\s]+([^\n.]+)/gi],
      it: [/foro[:\s]+([^\n.]+)/gi, /diritto applicabile[:\s]+([^\n.]+)/gi],
      en: [/jurisdiction[:\s]+([^\n.]+)/gi, /governing law[:\s]+([^\n.]+)/gi],
    },
    confidentiality: {
      de: [/vertraulich[^\n.]+/gi, /geheimhaltung[:\s]+([^\n.]+)/gi],
      fr: [/confidentiel[^\n.]+/gi, /confidentialité[:\s]+([^\n.]+)/gi],
      it: [/riservato[^\n.]+/gi, /riservatezza[:\s]+([^\n.]+)/gi],
      en: [/confidential[^\n.]+/gi, /confidentiality[:\s]+([^\n.]+)/gi],
    },
    ip: {
      de: [/geistiges eigentum[^\n.]+/gi, /urheberrecht[^\n.]+/gi],
      fr: [/propriété intellectuelle[^\n.]+/gi, /droits d'auteur[^\n.]+/gi],
      it: [/proprietà intellettuale[^\n.]+/gi, /diritti d'autore[^\n.]+/gi],
      en: [/intellectual property[^\n.]+/gi, /copyright[^\n.]+/gi],
    },
    employment: {
      de: [/arbeitszeit[:\s]+([^\n.]+)/gi, /ferien[:\s]+([^\n.]+)/gi, /lohn[:\s]+([^\n.]+)/gi],
      fr: [/temps de travail[:\s]+([^\n.]+)/gi, /vacances[:\s]+([^\n.]+)/gi, /salaire[:\s]+([^\n.]+)/gi],
      it: [/orario di lavoro[:\s]+([^\n.]+)/gi, /ferie[:\s]+([^\n.]+)/gi, /stipendio[:\s]+([^\n.]+)/gi],
      en: [/working hours[:\s]+([^\n.]+)/gi, /vacation[:\s]+([^\n.]+)/gi, /salary[:\s]+([^\n.]+)/gi],
    },
    dispute: {
      de: [/streitigkeit[^\n.]+/gi, /schiedsgericht[^\n.]+/gi],
      fr: [/litige[^\n.]+/gi, /arbitrage[^\n.]+/gi],
      it: [/controversia[^\n.]+/gi, /arbitrato[^\n.]+/gi],
      en: [/dispute[^\n.]+/gi, /arbitration[^\n.]+/gi],
    },
    compliance: {
      de: [],
      fr: [],
      it: [],
      en: [],
    },
    data_protection: {
      de: [/datenschutz[^\n.]+/gi, /personenbezogen[^\n.]+/gi],
      fr: [/protection des données[^\n.]+/gi, /données personnelles[^\n.]+/gi],
      it: [/protezione dei dati[^\n.]+/gi, /dati personali[^\n.]+/gi],
      en: [/data protection[^\n.]+/gi, /personal data[^\n.]+/gi],
    },
  };

  for (const area of focusAreas) {
    const patterns = termPatterns[area]?.[language] || [];
    for (const pattern of patterns) {
      const matches = lower.matchAll(pattern);
      for (const match of matches) {
        const term = (match[1] || match[0]).trim();
        if (term.length > 2 && !terms.includes(term)) {
          terms.push(term.substring(0, 100)); // Limit length
        }
      }
    }
  }

  // Always try to extract some basic terms
  if (terms.length === 0) {
    const basicPatterns = [/chf\s*[\d'.]+/gi, /\d+\s*(?:tage|monate|stunden|days|months|hours)/gi];
    for (const pattern of basicPatterns) {
      const matches = lower.matchAll(pattern);
      for (const match of matches) {
        terms.push(match[0].trim());
      }
    }
  }

  return terms.slice(0, 10);
}

// ============================================================================
// Issue Analysis
// ============================================================================

function analyzeIssues(
  document: string,
  documentType: string,
  focusAreas: FocusArea[],
  depth: 'quick' | 'standard' | 'comprehensive',
  language: Language
): LegalIssue[] {
  const issues: LegalIssue[] = [];
  const lower = document.toLowerCase();

  // Quick analysis: minimal issue detection
  if (depth === 'quick') {
    return detectCriticalIssues(document, documentType, language);
  }

  // Standard and comprehensive: full analysis
  if (focusAreas.includes('liability') || focusAreas.includes('general')) {
    issues.push(...analyzeLiabilityIssues(lower, language));
  }

  if (focusAreas.includes('termination') || focusAreas.includes('general')) {
    issues.push(...analyzeTerminationIssues(lower, language));
  }

  if (focusAreas.includes('confidentiality') || focusAreas.includes('general')) {
    issues.push(...analyzeConfidentialityIssues(lower, language));
  }

  if (focusAreas.includes('employment') &&
      (documentType === 'employment_contract' || documentType === 'employment')) {
    issues.push(...analyzeEmploymentIssues(lower, language));
  }

  if (focusAreas.includes('dispute') || focusAreas.includes('general')) {
    issues.push(...analyzeDisputeIssues(lower, language));
  }

  // Comprehensive: additional checks
  if (depth === 'comprehensive') {
    issues.push(...analyzeStructuralIssues(document, documentType, language));
  }

  return issues;
}

function detectCriticalIssues(document: string, _documentType: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];
  const lower = document.toLowerCase();

  // Total liability exclusion
  const liabilityExclusion = {
    de: /haftung\s+(?:wird\s+)?(?:vollständig\s+)?ausgeschlossen/i,
    fr: /responsabilité\s+(?:est\s+)?(?:totalement\s+)?exclue/i,
    it: /responsabilità\s+(?:è\s+)?(?:totalmente\s+)?esclusa/i,
    en: /liability\s+(?:is\s+)?(?:fully\s+)?excluded/i,
  };

  if (liabilityExclusion[language].test(lower)) {
    issues.push({
      title: { de: 'Vollständiger Haftungsausschluss', fr: 'Exclusion totale de responsabilité', it: 'Esclusione totale di responsabilità', en: 'Complete Liability Exclusion' }[language],
      description: { de: 'Vollständiger Haftungsausschluss ist nach Art. 100 OR bei Vorsatz und grober Fahrlässigkeit unwirksam.', fr: 'L\'exclusion totale de responsabilité est nulle en cas de dol ou de faute grave (art. 100 CO).', it: 'L\'esclusione totale della responsabilità è nulla in caso di dolo o colpa grave (art. 100 CO).', en: 'Complete liability exclusion is void for intentional or gross negligent acts under Art. 100 CO.' }[language],
      severity: 'critical',
      recommendation: { de: 'Haftungsklausel überarbeiten und Einschränkungen nur im zulässigen Rahmen vorsehen.', fr: 'Réviser la clause de responsabilité et prévoir des limitations dans les limites autorisées.', it: 'Rivedere la clausola di responsabilità e prevedere limitazioni entro i limiti consentiti.', en: 'Revise liability clause to include limitations only within permissible scope.' }[language],
      legalBasis: 'Art. 100 OR / CO',
    });
  }

  return issues;
}

function analyzeLiabilityIssues(document: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for broad liability limitation
  const liabilityLimitPatterns = {
    de: /haftung\s+(?:ist\s+)?(?:auf|beschränkt)/i,
    fr: /responsabilité\s+(?:est\s+)?limitée/i,
    it: /responsabilità\s+(?:è\s+)?limitata/i,
    en: /liability\s+(?:is\s+)?limited/i,
  };

  if (liabilityLimitPatterns[language].test(document)) {
    issues.push({
      title: { de: 'Haftungsbeschränkung', fr: 'Limitation de responsabilité', it: 'Limitazione di responsabilità', en: 'Liability Limitation' }[language],
      description: { de: 'Vertrag enthält Haftungsbeschränkungen. Prüfung erforderlich, ob die Grenzen von Art. 100 OR eingehalten sind.', fr: 'Le contrat contient des limitations de responsabilité. Vérifier la conformité avec l\'art. 100 CO.', it: 'Il contratto contiene limitazioni di responsabilità. Verificare la conformità con l\'art. 100 CO.', en: 'Contract contains liability limitations. Verify compliance with Art. 100 CO.' }[language],
      severity: 'major',
      recommendation: { de: 'Haftungsklausel auf Einhaltung der zwingenden Gesetzesbestimmungen prüfen.', fr: 'Vérifier que la clause respecte les dispositions légales impératives.', it: 'Verificare che la clausola rispetti le disposizioni legali imperative.', en: 'Review clause for compliance with mandatory legal provisions.' }[language],
      legalBasis: 'Art. 100 OR / CO',
    });
  }

  return issues;
}

function analyzeTerminationIssues(document: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for no termination option
  const noTermination = {
    de: /keine\s+kündigung|unkündbar/i,
    fr: /pas\s+de\s+résiliation|irrésiliable/i,
    it: /nessuna\s+disdetta|non\s+disdettabile/i,
    en: /no\s+termination|non-terminable/i,
  };

  if (noTermination[language].test(document)) {
    issues.push({
      title: { de: 'Keine Kündigungsmöglichkeit', fr: 'Pas de possibilité de résiliation', it: 'Nessuna possibilità di disdetta', en: 'No Termination Option' }[language],
      description: { de: 'Der Vertrag sieht keine Kündigungsmöglichkeit vor. Dies kann problematisch sein.', fr: 'Le contrat ne prévoit pas de possibilité de résiliation. Cela peut être problématique.', it: 'Il contratto non prevede possibilità di disdetta. Questo può essere problematico.', en: 'The contract does not provide for termination. This may be problematic.' }[language],
      severity: 'major',
      recommendation: { de: 'Kündigungsklausel hinzufügen mit angemessener Frist.', fr: 'Ajouter une clause de résiliation avec un préavis raisonnable.', it: 'Aggiungere una clausola di disdetta con preavviso ragionevole.', en: 'Add termination clause with reasonable notice period.' }[language],
    });
  }

  // Check for very short termination notice
  const shortNotice = {
    de: /(\d+)\s*tage?\s*(?:frist|kündigung)/i,
    fr: /préavis\s*(?:de\s+)?(\d+)\s*jours?/i,
    it: /preavviso\s*(?:di\s+)?(\d+)\s*giorni?/i,
    en: /(\d+)\s*days?\s*(?:notice|termination)/i,
  };

  const match = document.match(shortNotice[language]);
  if (match && parseInt(match[1]) < 7) {
    issues.push({
      title: { de: 'Sehr kurze Kündigungsfrist', fr: 'Préavis très court', it: 'Preavviso molto breve', en: 'Very Short Notice Period' }[language],
      description: { de: `Kündigungsfrist von ${match[1]} Tagen ist sehr kurz.`, fr: `Préavis de ${match[1]} jours est très court.`, it: `Preavviso di ${match[1]} giorni è molto breve.`, en: `Notice period of ${match[1]} days is very short.` }[language],
      severity: 'minor',
      recommendation: { de: 'Prüfen, ob die Frist angemessen ist für die Art des Vertrags.', fr: 'Vérifier si le préavis est approprié pour ce type de contrat.', it: 'Verificare se il preavviso è appropriato per questo tipo di contratto.', en: 'Verify if notice period is appropriate for this type of contract.' }[language],
    });
  }

  return issues;
}

function analyzeConfidentialityIssues(document: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for unlimited confidentiality term
  const unlimitedTerm = {
    de: /unbefristet|auf\s+unbestimmte\s+zeit.*geheimhaltung/i,
    fr: /durée\s+indéterminée.*confidentialité/i,
    it: /durata\s+indeterminata.*riservatezza/i,
    en: /indefinite.*confidentiality/i,
  };

  if (unlimitedTerm[language].test(document)) {
    issues.push({
      title: { de: 'Unbefristete Geheimhaltung', fr: 'Confidentialité illimitée', it: 'Riservatezza illimitata', en: 'Unlimited Confidentiality' }[language],
      description: { de: 'Geheimhaltungspflicht ist unbefristet. Dies kann die Durchsetzbarkeit beeinträchtigen.', fr: 'L\'obligation de confidentialité est illimitée. Cela peut affecter l\'applicabilité.', it: 'L\'obbligo di riservatezza è illimitato. Questo può influire sull\'applicabilità.', en: 'Confidentiality obligation is unlimited. This may affect enforceability.' }[language],
      severity: 'minor',
      recommendation: { de: 'Befristung der Geheimhaltungspflicht erwägen (z.B. 5 Jahre).', fr: 'Envisager une limitation dans le temps (p.ex. 5 ans).', it: 'Considerare una limitazione temporale (es. 5 anni).', en: 'Consider time-limiting the confidentiality obligation (e.g., 5 years).' }[language],
    });
  }

  // Check for missing exceptions
  const hasExceptions = {
    de: /ausnahme|ausgenommen|gilt\s+nicht\s+für/i,
    fr: /exception|ne\s+s'applique\s+pas/i,
    it: /eccezione|non\s+si\s+applica/i,
    en: /exception|does\s+not\s+apply/i,
  };

  const hasConfidentiality = {
    de: /geheimhaltung|vertraulich/i,
    fr: /confidentialité|confidentiel/i,
    it: /riservatezza|riservato/i,
    en: /confidentiality|confidential/i,
  };

  if (hasConfidentiality[language].test(document) && !hasExceptions[language].test(document)) {
    issues.push({
      title: { de: 'Fehlende Ausnahmen zur Geheimhaltung', fr: 'Exceptions manquantes à la confidentialité', it: 'Eccezioni mancanti alla riservatezza', en: 'Missing Confidentiality Exceptions' }[language],
      description: { de: 'Keine Standardausnahmen definiert (z.B. öffentlich bekannte Informationen).', fr: 'Pas d\'exceptions standard définies (p.ex. informations publiques).', it: 'Nessuna eccezione standard definita (es. informazioni pubbliche).', en: 'No standard exceptions defined (e.g., publicly known information).' }[language],
      severity: 'major',
      recommendation: { de: 'Standardausnahmen für öffentlich bekannte Informationen, unabhängige Entwicklung, etc. hinzufügen.', fr: 'Ajouter des exceptions standard pour les informations publiques, le développement indépendant, etc.', it: 'Aggiungere eccezioni standard per informazioni pubbliche, sviluppo indipendente, ecc.', en: 'Add standard exceptions for publicly known information, independent development, etc.' }[language],
    });
  }

  return issues;
}

function analyzeEmploymentIssues(document: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for minimum vacation days (CH: 4 weeks = 20 days)
  const vacationPattern = {
    de: /ferien[:\s]+(\d+)\s*tage/i,
    fr: /vacances[:\s]+(\d+)\s*jours/i,
    it: /ferie[:\s]+(\d+)\s*giorni/i,
    en: /vacation[:\s]+(\d+)\s*days/i,
  };

  const match = document.match(vacationPattern[language]);
  if (match && parseInt(match[1]) < 20) {
    issues.push({
      title: { de: 'Unzureichende Ferienansprüche', fr: 'Droits aux vacances insuffisants', it: 'Diritti alle ferie insufficienti', en: 'Insufficient Vacation Entitlement' }[language],
      description: { de: `${match[1]} Tage Ferien liegt unter dem gesetzlichen Minimum von 4 Wochen (Art. 329a OR).`, fr: `${match[1]} jours de vacances est inférieur au minimum légal de 4 semaines (art. 329a CO).`, it: `${match[1]} giorni di ferie è inferiore al minimo legale di 4 settimane (art. 329a CO).`, en: `${match[1]} days vacation is below the legal minimum of 4 weeks (Art. 329a CO).` }[language],
      severity: 'critical',
      recommendation: { de: 'Ferienanspruch auf mindestens 20 Tage (4 Wochen) erhöhen.', fr: 'Augmenter les vacances à au moins 20 jours (4 semaines).', it: 'Aumentare le ferie ad almeno 20 giorni (4 settimane).', en: 'Increase vacation entitlement to at least 20 days (4 weeks).' }[language],
      legalBasis: 'Art. 329a OR / CO',
    });
  }

  return issues;
}

function analyzeDisputeIssues(document: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for missing jurisdiction clause
  const hasJurisdiction = {
    de: /gerichtsstand|zuständig/i,
    fr: /for\s+juridique|compétent/i,
    it: /foro|competente/i,
    en: /jurisdiction|governing\s+law/i,
  };

  if (!hasJurisdiction[language].test(document)) {
    issues.push({
      title: { de: 'Fehlende Gerichtsstandsklausel', fr: 'Clause de for manquante', it: 'Clausola di foro mancante', en: 'Missing Jurisdiction Clause' }[language],
      description: { de: 'Kein Gerichtsstand vereinbart. Bei Streitigkeiten kann Unsicherheit entstehen.', fr: 'Pas de for juridique convenu. Peut créer de l\'incertitude en cas de litige.', it: 'Nessun foro concordato. Può creare incertezza in caso di controversia.', en: 'No jurisdiction agreed. May create uncertainty in case of dispute.' }[language],
      severity: 'major',
      recommendation: { de: 'Gerichtsstandsklausel hinzufügen mit gewünschtem Gerichtsort.', fr: 'Ajouter une clause de for avec le lieu souhaité.', it: 'Aggiungere una clausola di foro con la sede desiderata.', en: 'Add jurisdiction clause specifying desired venue.' }[language],
    });
  }

  return issues;
}

function analyzeStructuralIssues(document: string, _documentType: string, language: Language): LegalIssue[] {
  const issues: LegalIssue[] = [];

  // Check for missing signatures section
  const hasSignatures = {
    de: /unterschrift|signatur|ort.*datum/i,
    fr: /signature|lieu.*date/i,
    it: /firma|luogo.*data/i,
    en: /signature|place.*date/i,
  };

  if (!hasSignatures[language].test(document)) {
    issues.push({
      title: { de: 'Fehlende Unterschriftenklausel', fr: 'Clause de signature manquante', it: 'Clausola di firma mancante', en: 'Missing Signature Clause' }[language],
      description: { de: 'Dokument enthält keine Unterschriftenfelder.', fr: 'Le document ne contient pas de champs de signature.', it: 'Il documento non contiene campi per la firma.', en: 'Document does not contain signature fields.' }[language],
      severity: 'informational',
      recommendation: { de: 'Unterschriftenfelder mit Ort und Datum hinzufügen.', fr: 'Ajouter des champs de signature avec lieu et date.', it: 'Aggiungere campi per firma con luogo e data.', en: 'Add signature fields with place and date.' }[language],
    });
  }

  return issues;
}

// ============================================================================
// Missing Clauses
// ============================================================================

function identifyMissingClauses(
  document: string,
  documentType: string,
  focusAreas: FocusArea[],
  depth: 'quick' | 'standard' | 'comprehensive',
  language: Language
): MissingClause[] {
  if (depth === 'quick') {
    return [];
  }

  const missing: MissingClause[] = [];
  const lower = document.toLowerCase();

  // Standard missing clause checks based on document type
  if (documentType === 'nda' || documentType === 'geheimhaltungsvereinbarung') {
    missing.push(...checkNDAMissingClauses(lower, language));
  }

  if (documentType === 'employment_contract' || documentType === 'arbeitsvertrag') {
    missing.push(...checkEmploymentMissingClauses(lower, language));
  }

  if (documentType === 'service_agreement' || documentType === 'dienstleistungsvertrag') {
    missing.push(...checkServiceAgreementMissingClauses(lower, language));
  }

  // General missing clauses for all contracts
  if (focusAreas.includes('general') || focusAreas.includes('dispute')) {
    if (!hasClause(lower, ['gerichtsstand', 'for juridique', 'foro', 'jurisdiction'])) {
      missing.push({
        clause: { de: 'Gerichtsstandsklausel', fr: 'Clause de for', it: 'Clausola di foro', en: 'Jurisdiction Clause' }[language],
        importance: 'recommended',
        rationale: { de: 'Vermeidet Unsicherheit bei Streitigkeiten.', fr: 'Évite l\'incertitude en cas de litige.', it: 'Evita incertezze in caso di controversia.', en: 'Avoids uncertainty in case of disputes.' }[language],
      });
    }

    if (!hasClause(lower, ['anwendbares recht', 'droit applicable', 'diritto applicabile', 'governing law'])) {
      missing.push({
        clause: { de: 'Rechtswahlklausel', fr: 'Clause d\'élection de droit', it: 'Clausola di scelta del diritto', en: 'Choice of Law Clause' }[language],
        importance: 'recommended',
        rationale: { de: 'Klärt welches Recht anwendbar ist.', fr: 'Clarifie quel droit est applicable.', it: 'Chiarisce quale diritto è applicabile.', en: 'Clarifies which law applies.' }[language],
      });
    }
  }

  return missing;
}

function checkNDAMissingClauses(document: string, language: Language): MissingClause[] {
  const missing: MissingClause[] = [];

  if (!hasClause(document, ['ausnahme', 'exception', 'eccezione'])) {
    missing.push({
      clause: { de: 'Ausnahmenklausel', fr: 'Clause d\'exceptions', it: 'Clausola di eccezioni', en: 'Exceptions Clause' }[language],
      importance: 'required',
      rationale: { de: 'Standard-Ausnahmen für öffentlich bekannte Informationen fehlen.', fr: 'Exceptions standard pour informations publiques manquantes.', it: 'Mancano eccezioni standard per informazioni pubbliche.', en: 'Standard exceptions for public information missing.' }[language],
      suggestedLanguage: { de: 'Die Geheimhaltungspflicht gilt nicht für Informationen, die (a) öffentlich bekannt sind, (b) unabhängig entwickelt wurden, (c) rechtmässig von Dritten erhalten wurden.', fr: 'L\'obligation de confidentialité ne s\'applique pas aux informations qui (a) sont publiques, (b) ont été développées indépendamment, (c) ont été obtenues légalement de tiers.', it: 'L\'obbligo di riservatezza non si applica alle informazioni che (a) sono di dominio pubblico, (b) sono state sviluppate indipendentemente, (c) sono state ottenute legalmente da terzi.', en: 'The confidentiality obligation does not apply to information that is (a) publicly known, (b) independently developed, (c) lawfully obtained from third parties.' }[language],
    });
  }

  if (!hasClause(document, ['dauer', 'durée', 'durata', 'term', 'period'])) {
    missing.push({
      clause: { de: 'Laufzeitklausel', fr: 'Clause de durée', it: 'Clausola di durata', en: 'Term Clause' }[language],
      importance: 'recommended',
      rationale: { de: 'Befristung der Geheimhaltungspflicht fehlt.', fr: 'Limitation temporelle de la confidentialité manquante.', it: 'Manca la limitazione temporale della riservatezza.', en: 'Time limitation of confidentiality missing.' }[language],
    });
  }

  return missing;
}

function checkEmploymentMissingClauses(document: string, language: Language): MissingClause[] {
  const missing: MissingClause[] = [];

  if (!hasClause(document, ['überstunden', 'heures supplémentaires', 'ore straordinarie', 'overtime'])) {
    missing.push({
      clause: { de: 'Überstundenregelung', fr: 'Règlement des heures supplémentaires', it: 'Regolamento degli straordinari', en: 'Overtime Regulations' }[language],
      importance: 'recommended',
      rationale: { de: 'Regelung zur Kompensation von Überstunden fehlt.', fr: 'Règlement sur la compensation des heures supplémentaires manquant.', it: 'Manca il regolamento sulla compensazione degli straordinari.', en: 'Regulations on overtime compensation missing.' }[language],
    });
  }

  if (!hasClause(document, ['konkurrenzverbot', 'prohibition de concurrence', 'divieto di concorrenza', 'non-compete'])) {
    missing.push({
      clause: { de: 'Konkurrenzverbot', fr: 'Clause de non-concurrence', it: 'Clausola di non concorrenza', en: 'Non-Compete Clause' }[language],
      importance: 'optional',
      rationale: { de: 'Je nach Position kann ein Konkurrenzverbot sinnvoll sein.', fr: 'Selon le poste, une clause de non-concurrence peut être utile.', it: 'A seconda della posizione, una clausola di non concorrenza può essere utile.', en: 'Depending on position, a non-compete clause may be useful.' }[language],
    });
  }

  return missing;
}

function checkServiceAgreementMissingClauses(document: string, language: Language): MissingClause[] {
  const missing: MissingClause[] = [];

  if (!hasClause(document, ['gewährleistung', 'garantie', 'garanzia', 'warranty'])) {
    missing.push({
      clause: { de: 'Gewährleistungsklausel', fr: 'Clause de garantie', it: 'Clausola di garanzia', en: 'Warranty Clause' }[language],
      importance: 'recommended',
      rationale: { de: 'Regelung zu Mängeln und deren Behebung fehlt.', fr: 'Règlement sur les défauts et leur correction manquant.', it: 'Manca il regolamento sui difetti e la loro correzione.', en: 'Regulations on defects and their remedy missing.' }[language],
    });
  }

  return missing;
}

function hasClause(document: string, keywords: string[]): boolean {
  return keywords.some((kw) => document.includes(kw.toLowerCase()));
}

// ============================================================================
// Compliance Checks
// ============================================================================

function performComplianceChecks(
  document: string,
  documentType: string,
  focusAreas: FocusArea[],
  depth: 'quick' | 'standard' | 'comprehensive',
  language: Language
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const lower = document.toLowerCase();

  // Data protection compliance
  if (focusAreas.includes('data_protection') || focusAreas.includes('compliance')) {
    checks.push(checkDataProtection(lower, language));
  }

  // Employment law compliance
  if ((focusAreas.includes('employment') || focusAreas.includes('compliance')) &&
      (documentType === 'employment_contract' || lower.includes('arbeit'))) {
    checks.push(...checkEmploymentCompliance(lower, language, depth));
  }

  // General contract law compliance
  if (focusAreas.includes('general') || focusAreas.includes('compliance')) {
    checks.push(checkContractFormality(lower, documentType, language));
  }

  return checks;
}

function checkDataProtection(document: string, language: Language): ComplianceCheck {
  const hasDataTerms = ['datenschutz', 'personenbezogen', 'protection des données', 'données personnelles',
                        'protezione dei dati', 'dati personali', 'data protection', 'personal data']
                        .some((term) => document.includes(term));

  const hasDSGReference = document.includes('dsg') || document.includes('datenschutzgesetz') ||
                          document.includes('lpd') || document.includes('gdpr');

  if (!hasDataTerms) {
    return {
      regulation: { de: 'DSG/DSGVO', fr: 'LPD/RGPD', it: 'LPD/GDPR', en: 'DSG/GDPR' }[language],
      status: 'not_applicable',
      details: { de: 'Dokument scheint keine personenbezogenen Daten zu betreffen.', fr: 'Le document ne semble pas concerner de données personnelles.', it: 'Il documento non sembra riguardare dati personali.', en: 'Document does not appear to concern personal data.' }[language],
    };
  }

  if (hasDSGReference) {
    return {
      regulation: { de: 'DSG/DSGVO', fr: 'LPD/RGPD', it: 'LPD/GDPR', en: 'DSG/GDPR' }[language],
      status: 'compliant',
      details: { de: 'Datenschutzbestimmungen sind referenziert.', fr: 'Les dispositions de protection des données sont référencées.', it: 'Le disposizioni sulla protezione dei dati sono menzionate.', en: 'Data protection provisions are referenced.' }[language],
    };
  }

  return {
    regulation: { de: 'DSG/DSGVO', fr: 'LPD/RGPD', it: 'LPD/GDPR', en: 'DSG/GDPR' }[language],
    status: 'partially_compliant',
    details: { de: 'Datenschutz wird erwähnt, aber spezifische Bestimmungen fehlen.', fr: 'La protection des données est mentionnée mais les dispositions spécifiques manquent.', it: 'La protezione dei dati è menzionata ma mancano disposizioni specifiche.', en: 'Data protection is mentioned but specific provisions are missing.' }[language],
    requiredActions: [
      { de: 'Datenschutzklausel mit DSG-Referenz hinzufügen', fr: 'Ajouter une clause de protection des données avec référence LPD', it: 'Aggiungere una clausola sulla protezione dei dati con riferimento LPD', en: 'Add data protection clause with DSG reference' }[language],
    ],
  };
}

function checkEmploymentCompliance(document: string, language: Language, _depth: 'quick' | 'standard' | 'comprehensive'): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Check mandatory elements under OR
  const mandatoryElements = [
    { term: ['arbeitszeit', 'temps de travail', 'orario di lavoro', 'working'], name: { de: 'Arbeitszeit', fr: 'Temps de travail', it: 'Orario di lavoro', en: 'Working hours' } },
    { term: ['lohn', 'salaire', 'stipendio', 'salary', 'compensation'], name: { de: 'Lohn', fr: 'Salaire', it: 'Stipendio', en: 'Salary' } },
    { term: ['ferien', 'vacances', 'ferie', 'vacation'], name: { de: 'Ferien', fr: 'Vacances', it: 'Ferie', en: 'Vacation' } },
    { term: ['kündigung', 'résiliation', 'disdetta', 'termination', 'notice'], name: { de: 'Kündigung', fr: 'Résiliation', it: 'Disdetta', en: 'Termination' } },
  ];

  const missingElements: string[] = [];
  for (const element of mandatoryElements) {
    if (!element.term.some((t) => document.includes(t))) {
      missingElements.push(element.name[language]);
    }
  }

  if (missingElements.length === 0) {
    checks.push({
      regulation: { de: 'Art. 319 ff. OR', fr: 'Art. 319 ss CO', it: 'Art. 319 ss CO', en: 'Art. 319 ff. CO' }[language],
      status: 'compliant',
      details: { de: 'Wesentliche Arbeitsvertragselemente sind vorhanden.', fr: 'Les éléments essentiels du contrat de travail sont présents.', it: 'Gli elementi essenziali del contratto di lavoro sono presenti.', en: 'Essential employment contract elements are present.' }[language],
    });
  } else {
    checks.push({
      regulation: { de: 'Art. 319 ff. OR', fr: 'Art. 319 ss CO', it: 'Art. 319 ss CO', en: 'Art. 319 ff. CO' }[language],
      status: 'partially_compliant',
      details: { de: `Fehlende Elemente: ${missingElements.join(', ')}`, fr: `Éléments manquants: ${missingElements.join(', ')}`, it: `Elementi mancanti: ${missingElements.join(', ')}`, en: `Missing elements: ${missingElements.join(', ')}` }[language],
      requiredActions: missingElements.map((el) =>
        ({ de: `${el} hinzufügen`, fr: `Ajouter ${el}`, it: `Aggiungere ${el}`, en: `Add ${el}` }[language] as string)
      ),
    });
  }

  return checks;
}

function checkContractFormality(document: string, _documentType: string, language: Language): ComplianceCheck {
  const hasBasicStructure = document.split('\n').length > 5;
  const hasParties = ['zwischen', 'entre', 'tra', 'between'].some((t) => document.toLowerCase().includes(t));

  if (hasBasicStructure && hasParties) {
    return {
      regulation: { de: 'Art. 1 ff. OR', fr: 'Art. 1 ss CO', it: 'Art. 1 ss CO', en: 'Art. 1 ff. CO' }[language],
      status: 'compliant',
      details: { de: 'Grundlegende Vertragsstruktur ist vorhanden.', fr: 'Structure contractuelle de base présente.', it: 'Struttura contrattuale di base presente.', en: 'Basic contract structure is present.' }[language],
    };
  }

  return {
    regulation: { de: 'Art. 1 ff. OR', fr: 'Art. 1 ss CO', it: 'Art. 1 ss CO', en: 'Art. 1 ff. CO' }[language],
    status: 'partially_compliant',
    details: { de: 'Vertragsstruktur könnte verbessert werden.', fr: 'La structure du contrat pourrait être améliorée.', it: 'La struttura del contratto potrebbe essere migliorata.', en: 'Contract structure could be improved.' }[language],
  };
}

// ============================================================================
// Recommendations
// ============================================================================

function generateRecommendations(
  issues: LegalIssue[],
  missingClauses: MissingClause[],
  compliance: ComplianceCheck[],
  language: Language
): Array<{ priority: 'high' | 'medium' | 'low'; action: string; rationale: string }> {
  const recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; rationale: string }> = [];

  // High priority: Critical issues
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  for (const issue of criticalIssues) {
    recommendations.push({
      priority: 'high',
      action: issue.recommendation,
      rationale: issue.description,
    });
  }

  // High priority: Required missing clauses
  const requiredClauses = missingClauses.filter((m) => m.importance === 'required');
  for (const clause of requiredClauses) {
    recommendations.push({
      priority: 'high',
      action: { de: `${clause.clause} hinzufügen`, fr: `Ajouter ${clause.clause}`, it: `Aggiungere ${clause.clause}`, en: `Add ${clause.clause}` }[language],
      rationale: clause.rationale,
    });
  }

  // Medium priority: Major issues and non-compliant checks
  const majorIssues = issues.filter((i) => i.severity === 'major');
  for (const issue of majorIssues) {
    recommendations.push({
      priority: 'medium',
      action: issue.recommendation,
      rationale: issue.description,
    });
  }

  const nonCompliant = compliance.filter((c) => c.status === 'non_compliant' || c.status === 'partially_compliant');
  for (const check of nonCompliant) {
    if (check.requiredActions) {
      for (const action of check.requiredActions) {
        recommendations.push({
          priority: check.status === 'non_compliant' ? 'high' : 'medium',
          action,
          rationale: check.details,
        });
      }
    }
  }

  // Low priority: Recommended missing clauses and minor issues
  const recommendedClauses = missingClauses.filter((m) => m.importance === 'recommended');
  for (const clause of recommendedClauses) {
    recommendations.push({
      priority: 'low',
      action: { de: `${clause.clause} erwägen`, fr: `Envisager ${clause.clause}`, it: `Considerare ${clause.clause}`, en: `Consider ${clause.clause}` }[language],
      rationale: clause.rationale,
    });
  }

  const minorIssues = issues.filter((i) => i.severity === 'minor');
  for (const issue of minorIssues) {
    recommendations.push({
      priority: 'low',
      action: issue.recommendation,
      rationale: issue.description,
    });
  }

  return recommendations.slice(0, 10); // Limit to 10 recommendations
}

// ============================================================================
// Assessment
// ============================================================================

function calculateOverallAssessment(
  issues: LegalIssue[],
  missingClauses: MissingClause[],
  _compliance: ComplianceCheck[]
): 'acceptable' | 'needs_revision' | 'high_risk' | 'unacceptable' {
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const majorCount = issues.filter((i) => i.severity === 'major').length;
  const requiredMissing = missingClauses.filter((m) => m.importance === 'required').length;

  if (criticalCount >= 2 || (criticalCount >= 1 && majorCount >= 2)) {
    return 'unacceptable';
  }

  if (criticalCount >= 1 || requiredMissing >= 2 || majorCount >= 3) {
    return 'high_risk';
  }

  if (majorCount >= 1 || requiredMissing >= 1) {
    return 'needs_revision';
  }

  return 'acceptable';
}

// ============================================================================
// Helpers
// ============================================================================

function formatDocumentType(type: string, language: Language): string {
  const typeNames: Record<string, Record<Language, string>> = {
    service_agreement: { de: 'Dienstleistungsvertrag', fr: 'Contrat de prestation de services', it: 'Contratto di servizio', en: 'Service Agreement' },
    employment_contract: { de: 'Arbeitsvertrag', fr: 'Contrat de travail', it: 'Contratto di lavoro', en: 'Employment Contract' },
    nda: { de: 'Geheimhaltungsvereinbarung', fr: 'Accord de confidentialité', it: 'Accordo di riservatezza', en: 'Non-Disclosure Agreement' },
    shareholders_agreement: { de: 'Aktionärbindungsvertrag', fr: 'Convention d\'actionnaires', it: 'Patto parasociale', en: 'Shareholders Agreement' },
    lease_agreement: { de: 'Mietvertrag', fr: 'Contrat de bail', it: 'Contratto di locazione', en: 'Lease Agreement' },
    loan_agreement: { de: 'Darlehensvertrag', fr: 'Contrat de prêt', it: 'Contratto di mutuo', en: 'Loan Agreement' },
    contract: { de: 'Vertrag', fr: 'Contrat', it: 'Contratto', en: 'Contract' },
    klageschrift: { de: 'Klageschrift', fr: 'Demande', it: 'Atto di citazione', en: 'Statement of Claim' },
    klageantwort: { de: 'Klageantwort', fr: 'Réponse', it: 'Comparsa di risposta', en: 'Statement of Defense' },
    rechtsgutachten: { de: 'Rechtsgutachten', fr: 'Avis de droit', it: 'Parere legale', en: 'Legal Opinion' },
    memorandum: { de: 'Rechtsmemorandum', fr: 'Mémorandum juridique', it: 'Memorandum legale', en: 'Legal Memorandum' },
  };

  return typeNames[type]?.[language] || type;
}
