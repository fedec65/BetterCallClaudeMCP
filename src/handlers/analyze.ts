import type { LegalAnalyzeInput, LegalAnalyzeOutput, LegalIssue, Language } from '../types/index.js';

/**
 * Analyze document for legal issues
 */
function analyzeIssues(document: string, domain?: string, lang: Language = 'de'): LegalIssue[] {
  const issues: LegalIssue[] = [];
  const lowerDoc = document.toLowerCase();

  // Common contract issues
  if (lowerDoc.includes('contract') || lowerDoc.includes('vertrag') || lowerDoc.includes('contrat')) {
    // Vague terms
    if (lowerDoc.includes('reasonable') || lowerDoc.includes('angemessen') || lowerDoc.includes('raisonnable')) {
      issues.push({
        title: getLocalizedText('Vague terminology', lang),
        description: getLocalizedText('Document contains vague terms like "reasonable" that may lead to interpretation disputes', lang),
        severity: 'medium',
        relevantLaw: ['Art. 18 OR (Contract interpretation)', 'BGE 143 III 157 (Interpretation principles)'],
        recommendation: getLocalizedText('Define specific criteria or thresholds instead of vague terms', lang),
      });
    }

    // Missing liability cap
    if (!lowerDoc.includes('haftung') && !lowerDoc.includes('liability') && !lowerDoc.includes('responsabilit')) {
      issues.push({
        title: getLocalizedText('No liability provisions', lang),
        description: getLocalizedText('Document lacks explicit liability provisions', lang),
        severity: 'high',
        relevantLaw: ['Art. 97-109 OR (Contractual liability)', 'Art. 99 OR (Extent of liability)'],
        recommendation: getLocalizedText('Include liability limitations and exclusions clauses', lang),
      });
    }

    // Force majeure
    if (!lowerDoc.includes('force majeure') && !lowerDoc.includes('höhere gewalt') && !lowerDoc.includes('forza maggiore')) {
      issues.push({
        title: getLocalizedText('Missing force majeure clause', lang),
        description: getLocalizedText('No force majeure or unforeseeable circumstances clause found', lang),
        severity: 'medium',
        relevantLaw: ['Art. 119 OR (Impossibility)', 'BGE 145 III 106 (Force majeure)'],
        recommendation: getLocalizedText('Add force majeure clause for unforeseeable events', lang),
      });
    }
  }

  // Jurisdiction and governing law
  if (!lowerDoc.includes('governing law') && !lowerDoc.includes('anwendbares recht') && !lowerDoc.includes('droit applicable')) {
    issues.push({
      title: getLocalizedText('No governing law clause', lang),
      description: getLocalizedText('Document does not specify applicable law', lang),
      severity: 'high',
      relevantLaw: ['IPRG Art. 116 (Choice of law)', 'Rome I Regulation (EU context)'],
      recommendation: getLocalizedText('Include explicit choice of law provision', lang),
    });
  }

  // Dispute resolution
  if (!lowerDoc.includes('jurisdiction') && !lowerDoc.includes('gerichtsstand') && !lowerDoc.includes('for') &&
      !lowerDoc.includes('arbitration') && !lowerDoc.includes('schiedsgericht')) {
    issues.push({
      title: getLocalizedText('No dispute resolution clause', lang),
      description: getLocalizedText('Document lacks dispute resolution mechanism', lang),
      severity: 'medium',
      relevantLaw: ['Art. 17 ZPO (Choice of forum)', 'Art. 353 ff. ZPO (Arbitration)'],
      recommendation: getLocalizedText('Add jurisdiction clause or arbitration agreement', lang),
    });
  }

  // Domain-specific checks
  if (domain === 'employment') {
    if (!lowerDoc.includes('kündig') && !lowerDoc.includes('termination') && !lowerDoc.includes('résiliation')) {
      issues.push({
        title: getLocalizedText('Missing termination provisions', lang),
        description: getLocalizedText('Employment-related document lacks termination terms', lang),
        severity: 'high',
        relevantLaw: ['Art. 335-335c OR (Termination)', 'Art. 336 OR (Unfair dismissal)'],
        recommendation: getLocalizedText('Include notice periods and termination conditions per Art. 335c OR', lang),
      });
    }
  }

  if (domain === 'corporate') {
    if (lowerDoc.includes('director') || lowerDoc.includes('verwaltungsrat') || lowerDoc.includes('administrateur')) {
      if (!lowerDoc.includes('indemnification') && !lowerDoc.includes('freistellung') && !lowerDoc.includes('indemnisation')) {
        issues.push({
          title: getLocalizedText('No director indemnification', lang),
          description: getLocalizedText('Corporate document involving directors lacks indemnification provisions', lang),
          severity: 'medium',
          relevantLaw: ['Art. 752-760 OR (Director liability)', 'Art. 717 OR (Duty of care)'],
          recommendation: getLocalizedText('Consider adding D&O insurance or indemnification clause', lang),
        });
      }
    }
  }

  return issues;
}

/**
 * Analyze document for risks
 */
function analyzeRisks(document: string, domain?: string): Array<{
  risk: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}> {
  const risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }> = [];

  const lowerDoc = document.toLowerCase();

  // Unlimited liability risk
  if (lowerDoc.includes('unlimited') || lowerDoc.includes('unbeschränkt') || lowerDoc.includes('illimité')) {
    risks.push({
      risk: 'Unlimited liability exposure',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Negotiate liability caps tied to contract value or insurance coverage',
    });
  }

  // Penalty clause risk
  if (lowerDoc.includes('penalty') || lowerDoc.includes('konventionalstrafe') || lowerDoc.includes('pénalité')) {
    risks.push({
      risk: 'Excessive penalty exposure',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: 'Review penalty amounts against Art. 163 OR; courts may reduce excessive penalties',
    });
  }

  // Warranty/guarantee risk
  if (lowerDoc.includes('guarantee') || lowerDoc.includes('garantie') || lowerDoc.includes('warranty')) {
    risks.push({
      risk: 'Broad warranty obligations',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: 'Define warranty scope, duration, and exclusions explicitly',
    });
  }

  // Confidentiality breach risk
  if (lowerDoc.includes('confidential') || lowerDoc.includes('vertraulich') || lowerDoc.includes('confidentiel')) {
    risks.push({
      risk: 'Confidentiality breach liability',
      likelihood: 'low',
      impact: 'high',
      mitigation: 'Implement data handling procedures and limit access to sensitive information',
    });
  }

  // Jurisdiction risk
  if (lowerDoc.includes('foreign') || lowerDoc.includes('ausländ') || lowerDoc.includes('étranger')) {
    risks.push({
      risk: 'Foreign jurisdiction complications',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: 'Specify Swiss courts or Swiss-seated arbitration for predictability',
    });
  }

  // Domain-specific risks
  if (domain === 'employment') {
    risks.push({
      risk: 'Employee protection law violations',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Ensure compliance with mandatory provisions of Art. 319-362 OR',
    });
  }

  if (domain === 'corporate') {
    risks.push({
      risk: 'Director personal liability',
      likelihood: 'low',
      impact: 'high',
      mitigation: 'Verify D&O insurance coverage and follow proper corporate governance',
    });
  }

  return risks;
}

/**
 * Analyze compliance status
 */
function analyzeCompliance(
  document: string,
  domain?: string,
  _jurisdiction?: string
): {
  compliant: boolean;
  areas: Array<{ area: string; status: 'compliant' | 'non-compliant' | 'needs-review'; notes: string }>;
} {
  const areas: Array<{ area: string; status: 'compliant' | 'non-compliant' | 'needs-review'; notes: string }> = [];
  const lowerDoc = document.toLowerCase();

  // Data protection compliance
  if (lowerDoc.includes('data') || lowerDoc.includes('daten') || lowerDoc.includes('données') ||
      lowerDoc.includes('personal') || lowerDoc.includes('personenbezogen')) {
    const hasPrivacyClause = lowerDoc.includes('privacy') || lowerDoc.includes('datenschutz') ||
                            lowerDoc.includes('protection des données');
    areas.push({
      area: 'Data Protection (DSG/GDPR)',
      status: hasPrivacyClause ? 'needs-review' : 'non-compliant',
      notes: hasPrivacyClause
        ? 'Data processing provisions found; verify compliance with new DSG and GDPR requirements'
        : 'Document handles personal data but lacks explicit data protection provisions',
    });
  }

  // Anti-money laundering (for financial documents)
  if (domain === 'corporate' || lowerDoc.includes('payment') || lowerDoc.includes('zahlung')) {
    areas.push({
      area: 'AML/KYC Compliance',
      status: 'needs-review',
      notes: 'Verify counterparty due diligence and transaction monitoring requirements',
    });
  }

  // Consumer protection (if applicable)
  if (lowerDoc.includes('consumer') || lowerDoc.includes('konsument') || lowerDoc.includes('consommateur')) {
    areas.push({
      area: 'Consumer Protection',
      status: 'needs-review',
      notes: 'Verify compliance with UWG and consumer protection provisions',
    });
  }

  // Employment law compliance
  if (domain === 'employment') {
    areas.push({
      area: 'Employment Law (Art. 319-362 OR)',
      status: 'needs-review',
      notes: 'Review against mandatory employee protection provisions',
    });
  }

  // General contractual compliance
  areas.push({
    area: 'General Contract Law (OR)',
    status: 'needs-review',
    notes: 'Verify validity requirements (Art. 1-40 OR) and content restrictions (Art. 19-20 OR)',
  });

  // Determine overall compliance
  const allCompliant = areas.every(a => a.status === 'compliant');

  return {
    compliant: allCompliant,
    areas,
  };
}

/**
 * Generate summary of document
 */
function generateSummary(document: string, lang: Language): string {
  const wordCount = document.split(/\s+/).length;
  const lowerDoc = document.toLowerCase();

  // Detect document type
  let docType = 'legal document';
  if (lowerDoc.includes('contract') || lowerDoc.includes('vertrag') || lowerDoc.includes('contrat')) {
    docType = 'contract';
  } else if (lowerDoc.includes('agreement') || lowerDoc.includes('vereinbarung') || lowerDoc.includes('accord')) {
    docType = 'agreement';
  } else if (lowerDoc.includes('brief') || lowerDoc.includes('rechtsschrift') || lowerDoc.includes('mémoire')) {
    docType = 'legal brief';
  }

  const summaryTemplates: Record<Language, string> = {
    de: `Dieses Dokument ist ein ${docType} mit etwa ${wordCount} Wörtern. Es wurde auf rechtliche Probleme, Risiken und Compliance analysiert.`,
    fr: `Ce document est un ${docType} d'environ ${wordCount} mots. Il a été analysé pour les problèmes juridiques, les risques et la conformité.`,
    it: `Questo documento è un ${docType} di circa ${wordCount} parole. È stato analizzato per problemi legali, rischi e conformità.`,
    en: `This document is a ${docType} with approximately ${wordCount} words. It has been analyzed for legal issues, risks, and compliance.`,
  };

  return summaryTemplates[lang];
}

/**
 * Detect document type
 */
function detectDocumentType(document: string): string {
  const lowerDoc = document.toLowerCase();

  if (lowerDoc.includes('employment') || lowerDoc.includes('arbeitsvertrag') || lowerDoc.includes('contrat de travail')) {
    return 'Employment Contract';
  }
  if (lowerDoc.includes('shareholders') || lowerDoc.includes('aktionärbindungsvertrag') || lowerDoc.includes('pacte d\'actionnaires')) {
    return 'Shareholders Agreement';
  }
  if (lowerDoc.includes('sale') || lowerDoc.includes('kaufvertrag') || lowerDoc.includes('contrat de vente')) {
    return 'Sales Contract';
  }
  if (lowerDoc.includes('lease') || lowerDoc.includes('mietvertrag') || lowerDoc.includes('bail')) {
    return 'Lease Agreement';
  }
  if (lowerDoc.includes('nda') || lowerDoc.includes('confidentiality') || lowerDoc.includes('geheimhaltung')) {
    return 'Non-Disclosure Agreement';
  }
  if (lowerDoc.includes('service') || lowerDoc.includes('dienstleistung') || lowerDoc.includes('prestations')) {
    return 'Service Agreement';
  }
  if (lowerDoc.includes('loan') || lowerDoc.includes('darlehen') || lowerDoc.includes('prêt')) {
    return 'Loan Agreement';
  }

  return 'Legal Document';
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(issues: LegalIssue[], _risks: unknown[], lang: Language): string[] {
  const recommendations: string[] = [];

  // Priority recommendations based on severity
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');

  if (criticalIssues.length > 0) {
    recommendations.push(getLocalizedText(
      `Address ${criticalIssues.length} critical issue(s) immediately before proceeding`,
      lang
    ));
  }

  if (highIssues.length > 0) {
    recommendations.push(getLocalizedText(
      `Review and resolve ${highIssues.length} high-priority issue(s)`,
      lang
    ));
  }

  // General recommendations
  recommendations.push(getLocalizedText('Have a qualified Swiss lawyer review the document', lang));
  recommendations.push(getLocalizedText('Verify all cross-references and citations are accurate', lang));

  if (issues.some(i => i.title.includes('liability') || i.title.includes('Haftung'))) {
    recommendations.push(getLocalizedText('Consider appropriate insurance coverage for identified risks', lang));
  }

  return recommendations;
}

/**
 * Get localized text
 */
function getLocalizedText(text: string, _lang: Language): string {
  // In production, this would use a proper i18n system
  // For now, return English text as-is
  return text;
}

/**
 * Handle the legal_analyze tool
 * Performs comprehensive legal document analysis
 */
export async function handleLegalAnalyze(
  input: LegalAnalyzeInput,
  _requestId: string
): Promise<LegalAnalyzeOutput> {
  const {
    document,
    analysisType = 'full',
    domain,
    jurisdiction,
    lang = 'de',
  } = input;

  // Detect language from document if not specified
  const detectedLanguage = lang || detectLanguage(document);

  // Detect document type
  const documentType = detectDocumentType(document);

  // Perform analyses based on type
  let issues: LegalIssue[] = [];
  let risks: Array<{
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }> = [];
  let complianceStatus: {
    compliant: boolean;
    areas: Array<{ area: string; status: 'compliant' | 'non-compliant' | 'needs-review'; notes: string }>;
  } | undefined;

  if (analysisType === 'full' || analysisType === 'issues') {
    issues = analyzeIssues(document, domain, detectedLanguage);
  }

  if (analysisType === 'full' || analysisType === 'risks') {
    risks = analyzeRisks(document, domain);
  }

  if (analysisType === 'full' || analysisType === 'compliance') {
    complianceStatus = analyzeCompliance(document, domain, jurisdiction);
  }

  // Generate summary
  const summary = generateSummary(document, detectedLanguage);

  // Generate recommendations
  const recommendations = generateRecommendations(issues, risks, detectedLanguage);

  // Extract citations
  const citations = extractDocumentCitations(document);

  return {
    summary,
    documentType,
    detectedLanguage,
    issues,
    risks,
    complianceStatus,
    recommendations,
    citations,
  };
}

/**
 * Detect language from document text
 */
function detectLanguage(text: string): Language {
  const germanIndicators = /\b(der|die|das|und|ist|ein|eine|für|mit|von)\b/gi;
  const frenchIndicators = /\b(le|la|les|de|du|des|et|est|un|une|pour|avec)\b/gi;
  const italianIndicators = /\b(il|la|le|di|del|della|e|è|un|una|per|con)\b/gi;

  const germanMatches = (text.match(germanIndicators) || []).length;
  const frenchMatches = (text.match(frenchIndicators) || []).length;
  const italianMatches = (text.match(italianIndicators) || []).length;

  if (frenchMatches > germanMatches && frenchMatches > italianMatches) return 'fr';
  if (italianMatches > germanMatches && italianMatches > frenchMatches) return 'it';
  return 'de';
}

/**
 * Extract citations from document
 */
function extractDocumentCitations(document: string): string[] {
  const citations: string[] = [];

  // BGE citations
  const bgeMatches = document.match(/BGE\s*\d+\s*(I|Ia|II|III|IV|V|VI)\s*\d+/gi) || [];
  citations.push(...bgeMatches);

  // ATF citations
  const atfMatches = document.match(/ATF\s*\d+\s*(I|Ia|II|III|IV|V|VI)\s*\d+/gi) || [];
  citations.push(...atfMatches);

  // Article citations
  const articleMatches = document.match(/Art\.\s*\d+(?:\s*(?:Abs\.|al\.|cpv\.)\s*\d+)?(?:\s*(?:lit\.|let\.|lett\.)\s*[a-z])?\s*[A-Z]{2,5}/gi) || [];
  citations.push(...articleMatches);

  return [...new Set(citations)]; // Remove duplicates
}
