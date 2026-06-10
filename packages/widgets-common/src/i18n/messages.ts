/**
 * i18n messages for MCP Apps widgets.
 * All UI labels in DE/FR/IT/EN — no hardcoded strings in templates.
 */

export type Lang = 'de' | 'fr' | 'it' | 'en';

const messages = {
  // --- W1: Jurisprudence Browser ---
  'search.results': {
    de: 'Suchergebnisse',
    fr: 'Résultats de recherche',
    it: 'Risultati della ricerca',
    en: 'Search results',
  },
  'search.noResults': {
    de: 'Keine Ergebnisse gefunden',
    fr: 'Aucun résultat trouvé',
    it: 'Nessun risultato trovato',
    en: 'No results found',
  },
  'search.totalResults': {
    de: 'Ergebnisse',
    fr: 'résultats',
    it: 'risultati',
    en: 'results',
  },
  'search.searchTime': {
    de: 'Suchzeit',
    fr: 'Temps de recherche',
    it: 'Tempo di ricerca',
    en: 'Search time',
  },
  'search.page': {
    de: 'Seite',
    fr: 'Page',
    it: 'Pagina',
    en: 'Page',
  },
  'search.of': {
    de: 'von',
    fr: 'de',
    it: 'di',
    en: 'of',
  },
  'search.previous': {
    de: 'Zurück',
    fr: 'Précédent',
    it: 'Precedente',
    en: 'Previous',
  },
  'search.next': {
    de: 'Weiter',
    fr: 'Suivant',
    it: 'Successivo',
    en: 'Next',
  },

  // Filters
  'filter.dateFrom': {
    de: 'Datum von',
    fr: 'Date depuis',
    it: 'Data da',
    en: 'Date from',
  },
  'filter.dateTo': {
    de: 'Datum bis',
    fr: 'Date jusqu\'à',
    it: 'Data fino a',
    en: 'Date to',
  },
  'filter.chamber': {
    de: 'Kammer',
    fr: 'Chambre',
    it: 'Camera',
    en: 'Chamber',
  },
  'filter.language': {
    de: 'Sprache',
    fr: 'Langue',
    it: 'Lingua',
    en: 'Language',
  },
  'filter.canton': {
    de: 'Kanton',
    fr: 'Canton',
    it: 'Cantone',
    en: 'Canton',
  },
  'filter.sort': {
    de: 'Sortierung',
    fr: 'Tri',
    it: 'Ordinamento',
    en: 'Sort',
  },
  'filter.sortRelevance': {
    de: 'Relevanz',
    fr: 'Pertinence',
    it: 'Rilevanza',
    en: 'Relevance',
  },
  'filter.sortDate': {
    de: 'Datum',
    fr: 'Date',
    it: 'Data',
    en: 'Date',
  },
  'filter.all': {
    de: 'Alle',
    fr: 'Tous',
    it: 'Tutti',
    en: 'All',
  },
  'filter.apply': {
    de: 'Anwenden',
    fr: 'Appliquer',
    it: 'Applica',
    en: 'Apply',
  },
  'filter.reset': {
    de: 'Zurücksetzen',
    fr: 'Réinitialiser',
    it: 'Ripristina',
    en: 'Reset',
  },

  // Decision detail
  'detail.title': {
    de: 'Entscheiddetails',
    fr: 'Détails de la décision',
    it: 'Dettagli della decisione',
    en: 'Decision details',
  },
  'detail.date': {
    de: 'Datum',
    fr: 'Date',
    it: 'Data',
    en: 'Date',
  },
  'detail.court': {
    de: 'Gericht',
    fr: 'Tribunal',
    it: 'Tribunale',
    en: 'Court',
  },
  'detail.chamber': {
    de: 'Kammer',
    fr: 'Chambre',
    it: 'Camera',
    en: 'Chamber',
  },
  'detail.legalAreas': {
    de: 'Rechtsgebiete',
    fr: 'Domaines juridiques',
    it: 'Aree giuridiche',
    en: 'Legal areas',
  },
  'detail.summary': {
    de: 'Zusammenfassung',
    fr: 'Résumé',
    it: 'Riassunto',
    en: 'Summary',
  },
  'detail.fullText': {
    de: 'Volltext',
    fr: 'Texte intégral',
    it: 'Testo integrale',
    en: 'Full text',
  },
  'detail.loading': {
    de: 'Wird geladen…',
    fr: 'Chargement…',
    it: 'Caricamento…',
    en: 'Loading…',
  },
  'detail.back': {
    de: 'Zurück zur Liste',
    fr: 'Retour à la liste',
    it: 'Torna alla lista',
    en: 'Back to list',
  },

  // Actions
  'action.useInAnalysis': {
    de: 'In Analyse verwenden',
    fr: 'Utiliser dans l\'analyse',
    it: 'Usa nell\'analisi',
    en: 'Use in analysis',
  },
  'action.copyCitation': {
    de: 'Zitat kopieren',
    fr: 'Copier la citation',
    it: 'Copia citazione',
    en: 'Copy citation',
  },
  'action.copied': {
    de: 'Kopiert!',
    fr: 'Copié !',
    it: 'Copiato!',
    en: 'Copied!',
  },

  // --- W2: Adversarial Dashboard ---
  'adversarial.title': {
    de: 'Analyse der Gegenpositionen',
    fr: 'Analyse contradictoire',
    it: 'Analisi avversariale',
    en: 'Adversarial analysis',
  },
  'adversarial.advocate': {
    de: 'Anwalt',
    fr: 'Avocat',
    it: 'Avvocato',
    en: 'Advocate',
  },
  'adversarial.adversary': {
    de: 'Gegenpartei',
    fr: 'Partie adverse',
    it: 'Controparte',
    en: 'Adversary',
  },
  'adversarial.judge': {
    de: 'Richter',
    fr: 'Juge',
    it: 'Giudice',
    en: 'Judge',
  },
  'adversarial.probability': {
    de: 'Erfolgswahrscheinlichkeit',
    fr: 'Probabilité de succès',
    it: 'Probabilità di successo',
    en: 'Probability of success',
  },
  'adversarial.argument': {
    de: 'Argument',
    fr: 'Argument',
    it: 'Argomento',
    en: 'Argument',
  },
  'adversarial.legalBasis': {
    de: 'Rechtsgrundlage',
    fr: 'Base juridique',
    it: 'Base giuridica',
    en: 'Legal basis',
  },
  'adversarial.strength': {
    de: 'Stärke',
    fr: 'Force',
    it: 'Forza',
    en: 'Strength',
  },
  'adversarial.deepen': {
    de: 'Vertiefen',
    fr: 'Approfondir',
    it: 'Approfondisci',
    en: 'Deepen',
  },
  'adversarial.export': {
    de: 'Exportieren',
    fr: 'Exporter',
    it: 'Esporta',
    en: 'Export',
  },
  'adversarial.judicialSynthesis': {
    de: 'Richterliche Synthese',
    fr: 'Synthèse judiciaire',
    it: 'Sintesi giudiziaria',
    en: 'Judicial synthesis',
  },
  'adversarial.strengthHigh': {
    de: 'Stark',
    fr: 'Fort',
    it: 'Forte',
    en: 'Strong',
  },
  'adversarial.strengthMedium': {
    de: 'Mittel',
    fr: 'Moyen',
    it: 'Medio',
    en: 'Medium',
  },
  'adversarial.strengthLow': {
    de: 'Schwach',
    fr: 'Faible',
    it: 'Debole',
    en: 'Weak',
  },

  // Common
  'common.error': {
    de: 'Fehler',
    fr: 'Erreur',
    it: 'Errore',
    en: 'Error',
  },
  'common.close': {
    de: 'Schliessen',
    fr: 'Fermer',
    it: 'Chiudi',
    en: 'Close',
  },
} as const;

export type MessageKey = keyof typeof messages;

export function t(key: MessageKey, lang: Lang): string {
  const entry = messages[key];
  return entry?.[lang] ?? entry?.['en'] ?? key;
}

export function detectLang(queryLang?: string): Lang {
  if (queryLang && ['de', 'fr', 'it', 'en'].includes(queryLang)) {
    return queryLang as Lang;
  }
  return 'en';
}
