import {
  SwissPrecedentInput,
  SwissPrecedentOutput,
  SwissPrecedentInputSchema,
  PrecedentResult,
  Language,
  PrecedentSource,
} from '../types.js';

// Mock database of Swiss precedents for demonstration
// In production, this would connect to entscheidsuche.ch API or similar
const MOCK_PRECEDENTS: PrecedentResult[] = [
  {
    reference: 'BGE 145 III 229',
    court: 'Bundesgericht',
    date: '2019-05-15',
    title: 'Vertragshaftung - Schadenersatz wegen Nichterfüllung',
    summary: 'Das Bundesgericht präzisiert die Voraussetzungen der Vertragshaftung gemäss Art. 97 OR. Der Gläubiger muss den Schaden, die Vertragsverletzung und den Kausalzusammenhang beweisen.',
    relevance: 0.95,
    legalPrinciples: [
      'Vertragshaftung erfordert Pflichtverletzung',
      'Beweislast beim Gläubiger für Schaden und Kausalität',
      'Verschulden wird vermutet (Art. 97 Abs. 1 OR)',
    ],
    citedArticles: ['Art. 97 OR', 'Art. 99 OR', 'Art. 8 ZGB'],
    url: 'https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?highlight_docid=aza://145-III-229',
  },
  {
    reference: 'BGE 144 III 155',
    court: 'Bundesgericht',
    date: '2018-03-20',
    title: 'Schadensberechnung bei Vertragsverletzung',
    summary: 'Grundsätze zur Berechnung des Schadens bei vertraglicher Haftung. Der Schaden ist konkret zu berechnen unter Berücksichtigung des hypothetischen Vermögensstandes.',
    relevance: 0.88,
    legalPrinciples: [
      'Differenzmethode zur Schadensberechnung',
      'Konkrete Schadensberechnung hat Vorrang',
      'Richterliche Schadensschätzung nach Art. 42 Abs. 2 OR',
    ],
    citedArticles: ['Art. 97 OR', 'Art. 42 OR', 'Art. 43 OR'],
    url: 'https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?highlight_docid=aza://144-III-155',
  },
  {
    reference: 'BGE 143 III 290',
    court: 'Bundesgericht',
    date: '2017-06-12',
    title: 'Treu und Glauben im Vertragsrecht',
    summary: 'Auslegung von Verträgen nach dem Vertrauensprinzip. Massgebend ist der objektivierte Empfängerhorizont bei der Vertragsauslegung.',
    relevance: 0.82,
    legalPrinciples: [
      'Vertrauensprinzip bei Vertragsauslegung',
      'Objektiver Empfängerhorizont massgebend',
      'Wortlaut als Ausgangspunkt der Auslegung',
    ],
    citedArticles: ['Art. 2 ZGB', 'Art. 18 OR', 'Art. 1 OR'],
    url: 'https://www.bger.ch/ext/eurospider/live/de/php/aza/http/index.php?highlight_docid=aza://143-III-290',
  },
  {
    reference: 'BVGE 2020/VI/3',
    court: 'Bundesverwaltungsgericht',
    date: '2020-09-08',
    title: 'Verwaltungsrechtliche Haftung des Bundes',
    summary: 'Voraussetzungen der Staatshaftung nach Verantwortlichkeitsgesetz. Der Bund haftet für rechtswidrige Handlungen seiner Beamten.',
    relevance: 0.75,
    legalPrinciples: [
      'Kausalhaftung des Bundes',
      'Rechtswidrigkeit als Haftungsvoraussetzung',
      'Subsidiarität gegenüber anderen Rechtsbehelfen',
    ],
    citedArticles: ['Art. 3 VG', 'Art. 146 BV'],
    url: 'https://www.bvger.ch/bvger/de/home/rechtsprechung/entscheidsuche.html',
  },
  {
    reference: 'BGE 142 III 568',
    court: 'Bundesgericht',
    date: '2016-11-22',
    title: 'Verjährung vertraglicher Ansprüche',
    summary: 'Die Verjährungsfrist für vertragliche Schadenersatzansprüche beträgt zehn Jahre. Beginn der Verjährung mit Fälligkeit der Forderung.',
    relevance: 0.78,
    legalPrinciples: [
      'Zehnjährige Verjährungsfrist für Vertragsansprüche',
      'Verjährungsbeginn bei Fälligkeit',
      'Unterbrechung durch Anerkennung oder Betreibung',
    ],
    citedArticles: ['Art. 127 OR', 'Art. 130 OR', 'Art. 135 OR'],
  },
  {
    reference: 'OGer ZH, LB220045',
    court: 'Obergericht Zürich',
    date: '2022-08-15',
    title: 'Kaufvertrag - Gewährleistung für Mängel',
    summary: 'Kantonale Entscheidung zur Mängelgewährleistung beim Kaufvertrag. Rügepflicht und Beweislast des Käufers für versteckte Mängel.',
    relevance: 0.72,
    legalPrinciples: [
      'Unverzügliche Mängelrüge erforderlich',
      'Beweislast für Mängel beim Käufer',
      'Wahlrecht zwischen Wandelung und Minderung',
    ],
    citedArticles: ['Art. 197 OR', 'Art. 201 OR', 'Art. 205 OR'],
  },
  {
    reference: 'BGE 141 III 84',
    court: 'Bundesgericht',
    date: '2015-02-10',
    title: 'Ausservertragliche Haftung - Art. 41 OR',
    summary: 'Voraussetzungen der ausservertraglichen Haftung. Rechtswidrigkeit kann sich aus Verletzung absoluter Rechte oder Schutznormen ergeben.',
    relevance: 0.85,
    legalPrinciples: [
      'Widerrechtlichkeit bei Verletzung absoluter Rechte',
      'Schutzpflichten aus besonderen Verhältnissen',
      'Adäquater Kausalzusammenhang erforderlich',
    ],
    citedArticles: ['Art. 41 OR', 'Art. 42 OR', 'Art. 44 OR'],
  },
  {
    reference: 'ATF 145 III 229',
    court: 'Tribunal fédéral',
    date: '2019-05-15',
    title: 'Responsabilité contractuelle - Dommages-intérêts pour inexécution',
    summary: 'Le Tribunal fédéral précise les conditions de la responsabilité contractuelle selon l\'art. 97 CO. Le créancier doit prouver le dommage, la violation du contrat et le lien de causalité.',
    relevance: 0.95,
    legalPrinciples: [
      'La responsabilité contractuelle exige une violation d\'obligation',
      'Charge de la preuve au créancier pour le dommage et la causalité',
      'La faute est présumée (art. 97 al. 1 CO)',
    ],
    citedArticles: ['art. 97 CO', 'art. 99 CO', 'art. 8 CC'],
    url: 'https://www.bger.ch/ext/eurospider/live/fr/php/aza/http/index.php?highlight_docid=aza://145-III-229',
  },
];

// Search keywords mapped to relevant legal concepts
const LEGAL_CONCEPT_KEYWORDS: Record<string, string[]> = {
  'Art. 97 OR': ['vertragshaftung', 'schadenersatz', 'nichterfüllung', 'pflichtverletzung'],
  'art. 97 CO': ['responsabilité', 'dommages', 'inexécution', 'violation'],
  'Art. 2 ZGB': ['treu und glauben', 'rechtsmissbrauch', 'good faith'],
  'Art. 41 OR': ['haftung', 'delikt', 'widerrechtlich', 'ausservertraglich'],
  'vertragsrecht': ['vertrag', 'contract', 'contrat', 'contratto'],
  'haftung': ['liability', 'responsabilité', 'responsabilità', 'schaden', 'damage'],
};

// Suggested searches by topic
const SUGGESTED_SEARCHES_BY_TOPIC: Record<string, string[]> = {
  contract: [
    'Art. 97 OR Vertragshaftung',
    'Art. 18 OR Vertragsauslegung',
    'Art. 127 OR Verjährung',
    'BGE Vertragsverletzung',
  ],
  tort: [
    'Art. 41 OR ausservertragliche Haftung',
    'Art. 55 OR Geschäftsherrenhaftung',
    'Art. 58 OR Werkeigentümerhaftung',
    'BGE Widerrechtlichkeit',
  ],
  property: [
    'Art. 641 ZGB Eigentum',
    'Art. 679 ZGB Nachbarrecht',
    'Art. 937 ZGB Besitz',
    'BGE Sachenrecht',
  ],
  default: [
    'BGE Vertragsrecht aktuell',
    'Bundesgericht Haftung',
    'Art. 2 ZGB Treu und Glauben',
    'Schadenersatz Berechnung',
  ],
};

// Translations for analysis notes
const ANALYSIS_NOTES_TEMPLATES: Record<Language, { noResults: string; limitedResults: string; manyResults: string }> = {
  de: {
    noResults: 'Keine Präzedenzfälle gefunden. Versuchen Sie eine breitere Suche oder andere Suchbegriffe.',
    limitedResults: 'Begrenzte Ergebnisse gefunden. Weitere Recherche in spezialisierten Datenbanken empfohlen.',
    manyResults: 'Umfangreiche Rechtsprechung vorhanden. Ergebnisse nach Relevanz sortiert.',
  },
  fr: {
    noResults: 'Aucun précédent trouvé. Essayez une recherche plus large ou d\'autres termes.',
    limitedResults: 'Résultats limités trouvés. Recherche supplémentaire dans des bases de données spécialisées recommandée.',
    manyResults: 'Jurisprudence abondante disponible. Résultats triés par pertinence.',
  },
  it: {
    noResults: 'Nessun precedente trovato. Provare una ricerca più ampia o altri termini.',
    limitedResults: 'Risultati limitati trovati. Si raccomanda ulteriore ricerca in banche dati specializzate.',
    manyResults: 'Ampia giurisprudenza disponibile. Risultati ordinati per rilevanza.',
  },
  en: {
    noResults: 'No precedents found. Try a broader search or different search terms.',
    limitedResults: 'Limited results found. Further research in specialized databases recommended.',
    manyResults: 'Extensive case law available. Results sorted by relevance.',
  },
};

/**
 * Calculate relevance score based on query matching
 */
function calculateRelevance(query: string, precedent: PrecedentResult): number {
  const queryLower = query.toLowerCase();
  let score = precedent.relevance;

  // Boost for direct reference match
  if (queryLower.includes(precedent.reference.toLowerCase())) {
    return 1.0;
  }

  // Boost for matching cited articles
  for (const article of precedent.citedArticles) {
    if (queryLower.includes(article.toLowerCase())) {
      score = Math.min(1.0, score + 0.1);
    }
  }

  // Boost for matching legal principles keywords
  for (const principle of precedent.legalPrinciples) {
    const principleWords = principle.toLowerCase().split(/\s+/);
    for (const word of principleWords) {
      if (word.length > 4 && queryLower.includes(word)) {
        score = Math.min(1.0, score + 0.05);
      }
    }
  }

  // Check for concept keywords
  for (const [concept, keywords] of Object.entries(LEGAL_CONCEPT_KEYWORDS)) {
    if (queryLower.includes(concept.toLowerCase())) {
      for (const keyword of keywords) {
        if (
          precedent.title.toLowerCase().includes(keyword) ||
          precedent.summary.toLowerCase().includes(keyword)
        ) {
          score = Math.min(1.0, score + 0.05);
        }
      }
    }
  }

  return Math.round(score * 100) / 100;
}

/**
 * Filter precedents by source
 */
function filterBySource(precedents: PrecedentResult[], sources: PrecedentSource[]): PrecedentResult[] {
  if (sources.includes('all')) {
    return precedents;
  }

  return precedents.filter((p) => {
    if (sources.includes('bge') && (p.reference.startsWith('BGE') || p.reference.startsWith('ATF') || p.reference.startsWith('DTF'))) {
      return true;
    }
    if (sources.includes('bvge') && p.reference.startsWith('BVGE')) {
      return true;
    }
    if (sources.includes('cantonal') && (p.reference.includes('OGer') || p.reference.includes('KGer') || p.court.includes('cantonal'))) {
      return true;
    }
    return false;
  });
}

/**
 * Filter precedents by legal area
 */
function filterByLegalArea(precedents: PrecedentResult[], legalArea: string): PrecedentResult[] {
  const areaLower = legalArea.toLowerCase();

  const areaKeywords: Record<string, string[]> = {
    'contract law': ['vertrag', 'contract', 'contrat', 'OR', 'CO', 'obligationen'],
    'tort law': ['delikt', 'tort', 'haftung', 'liability', 'Art. 41', 'widerrechtlich'],
    'property law': ['eigentum', 'property', 'sachenrecht', 'ZGB', 'CC'],
    'family law': ['familie', 'family', 'ehe', 'scheidung', 'divorce'],
    'criminal law': ['strafrecht', 'criminal', 'pénal', 'StGB', 'CP'],
    'administrative law': ['verwaltung', 'administrative', 'administratif', 'VG'],
  };

  const keywords = areaKeywords[areaLower] || [areaLower];

  return precedents.filter((p) => {
    const searchText = `${p.title} ${p.summary} ${p.citedArticles.join(' ')}`.toLowerCase();
    return keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
  });
}

/**
 * Filter precedents by date range
 */
function filterByDateRange(
  precedents: PrecedentResult[],
  dateFrom?: string,
  dateTo?: string
): PrecedentResult[] {
  return precedents.filter((p) => {
    const precedentDate = new Date(p.date);

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      if (precedentDate < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      if (precedentDate > toDate) return false;
    }

    return true;
  });
}

/**
 * Get suggested searches based on query content
 */
function getSuggestedSearches(query: string): string[] {
  const queryLower = query.toLowerCase();

  if (queryLower.includes('vertrag') || queryLower.includes('contract') || queryLower.includes('97')) {
    return SUGGESTED_SEARCHES_BY_TOPIC.contract;
  }

  if (queryLower.includes('haftung') || queryLower.includes('tort') || queryLower.includes('41')) {
    return SUGGESTED_SEARCHES_BY_TOPIC.tort;
  }

  if (queryLower.includes('eigentum') || queryLower.includes('property') || queryLower.includes('zgb')) {
    return SUGGESTED_SEARCHES_BY_TOPIC.property;
  }

  return SUGGESTED_SEARCHES_BY_TOPIC.default;
}

/**
 * Search and analyze Swiss legal precedents
 */
export function swissPrecedent(input: Partial<SwissPrecedentInput>): SwissPrecedentOutput {
  const validatedInput = SwissPrecedentInputSchema.parse(input);
  const { query, sources, legalArea, dateFrom, dateTo, maxResults, language } = validatedInput;

  const notes = ANALYSIS_NOTES_TEMPLATES[language];

  // Start with all mock precedents
  let results = [...MOCK_PRECEDENTS];

  // Filter by source
  results = filterBySource(results, sources);

  // Filter by legal area if specified
  if (legalArea) {
    results = filterByLegalArea(results, legalArea);
  }

  // Filter by date range if specified
  results = filterByDateRange(results, dateFrom, dateTo);

  // Calculate relevance scores based on query
  results = results.map((p) => ({
    ...p,
    relevance: calculateRelevance(query, p),
  }));

  // Filter out very low relevance results (unless query is very specific)
  const queryContainsBGE = /BGE|ATF|DTF|Art\.\s*\d+/.test(query);
  if (!queryContainsBGE) {
    results = results.filter((r) => r.relevance >= 0.5);
  }

  // Sort by relevance (highest first)
  results.sort((a, b) => b.relevance - a.relevance);

  // Limit results
  results = results.slice(0, maxResults);

  // Determine analysis notes
  let analysisNotes: string | undefined;
  if (results.length === 0) {
    analysisNotes = notes.noResults;
  } else if (results.length < 3) {
    analysisNotes = notes.limitedResults;
  } else if (results.length >= 5) {
    analysisNotes = notes.manyResults;
  }

  // Get suggested searches
  const suggestedSearches = getSuggestedSearches(query);

  return {
    query,
    totalResults: results.length,
    results,
    suggestedSearches,
    analysisNotes,
    language,
  };
}
