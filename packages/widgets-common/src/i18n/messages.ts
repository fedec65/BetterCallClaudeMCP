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

  // --- W3: Citation Validation Panel ---
  'citation.title': {
    de: 'Zitierungsprüfung',
    fr: 'Validation des citations',
    it: 'Validazione delle citazioni',
    en: 'Citation validation',
  },
  'citation.summary': {
    de: 'Zusammenfassung',
    fr: 'Résumé',
    it: 'Riepilogo',
    en: 'Summary',
  },
  'citation.found': {
    de: 'Zitierungen gefunden',
    fr: 'Citations trouvées',
    it: 'Citazioni trovate',
    en: 'Citations found',
  },
  'citation.valid': {
    de: 'Gültig',
    fr: 'Valide',
    it: 'Valida',
    en: 'Valid',
  },
  'citation.warning': {
    de: 'Warnung',
    fr: 'Avertissement',
    it: 'Avviso',
    en: 'Warning',
  },
  'citation.invalid': {
    de: 'Ungültig',
    fr: 'Invalide',
    it: 'Non valida',
    en: 'Invalid',
  },
  'citation.original': {
    de: 'Original',
    fr: 'Original',
    it: 'Originale',
    en: 'Original',
  },
  'citation.context': {
    de: 'Kontext',
    fr: 'Contexte',
    it: 'Contesto',
    en: 'Context',
  },
  'citation.correction': {
    de: 'Vorgeschlagene Korrektur',
    fr: 'Correction proposée',
    it: 'Correzione proposta',
    en: 'Suggested correction',
  },
  'citation.reason': {
    de: 'Grund',
    fr: 'Raison',
    it: 'Motivo',
    en: 'Reason',
  },
  'citation.applyCorrection': {
    de: 'Korrektur anwenden',
    fr: 'Appliquer la correction',
    it: 'Applica correzione',
    en: 'Apply correction',
  },
  'citation.applyAll': {
    de: 'Alle Korrekturen anwenden',
    fr: 'Appliquer toutes les corrections',
    it: 'Applica tutte le correzioni',
    en: 'Apply all corrections',
  },
  'citation.ignore': {
    de: 'Ignorieren',
    fr: 'Ignorer',
    it: 'Ignora',
    en: 'Ignore',
  },
  'citation.convertAll': {
    de: 'Alle konvertieren nach',
    fr: 'Tout convertir en',
    it: 'Converti tutto in',
    en: 'Convert all to',
  },
  'citation.dominantLang': {
    de: 'Erkannte Dokumentsprache',
    fr: 'Langue du document détectée',
    it: 'Lingua del documento rilevata',
    en: 'Detected document language',
  },
  'citation.processing': {
    de: 'Verarbeitung…',
    fr: 'Traitement…',
    it: 'Elaborazione…',
    en: 'Processing…',
  },
  'citation.chunk': {
    de: 'Block',
    fr: 'Bloc',
    it: 'Blocco',
    en: 'Chunk',
  },
  'citation.ignored': {
    de: 'Ignoriert',
    fr: 'Ignoré',
    it: 'Ignorato',
    en: 'Ignored',
  },
  'citation.corrected': {
    de: 'Korrigiert',
    fr: 'Corrigé',
    it: 'Corretto',
    en: 'Corrected',
  },
  'citation.finalize': {
    de: 'Abschliessen und an Modell senden',
    fr: 'Finaliser et envoyer au modèle',
    it: 'Finalizza e invia al modello',
    en: 'Finalize and send to model',
  },

  // --- W4: Intake Form ---
  'intake.title': {
    de: 'Briefing-Aufnahme',
    fr: 'Formulaire d\'accueil',
    it: 'Modulo di accoglienza',
    en: 'Briefing intake',
  },
  'intake.section.context': {
    de: 'Kontext der Angelegenheit',
    fr: 'Contexte de l\'affaire',
    it: 'Contesto della pratica',
    en: 'Case context',
  },
  'intake.section.parties': {
    de: 'Parteien',
    fr: 'Parties',
    it: 'Parti',
    en: 'Parties',
  },
  'intake.section.objective': {
    de: 'Ziel und Lieferergebnis',
    fr: 'Objectif et livrable',
    it: 'Obiettivo e deliverable',
    en: 'Objective and deliverable',
  },
  'intake.section.constraints': {
    de: 'Einschränkungen und Fristen',
    fr: 'Contraintes et délais',
    it: 'Vincoli e scadenze',
    en: 'Constraints and deadlines',
  },
  'intake.required': {
    de: 'Pflichtfeld',
    fr: 'Champ obligatoire',
    it: 'Campo obbligatorio',
    en: 'Required',
  },
  'intake.submit': {
    de: 'Absenden',
    fr: 'Envoyer',
    it: 'Invia',
    en: 'Submit',
  },
  'intake.followUp': {
    de: 'Zusätzliche Fragen',
    fr: 'Questions complémentaires',
    it: 'Domande aggiuntive',
    en: 'Follow-up questions',
  },
  'intake.progress': {
    de: 'Fortschritt',
    fr: 'Progression',
    it: 'Avanzamento',
    en: 'Progress',
  },
  'intake.yes': {
    de: 'Ja',
    fr: 'Oui',
    it: 'Sì',
    en: 'Yes',
  },
  'intake.no': {
    de: 'Nein',
    fr: 'Non',
    it: 'No',
    en: 'No',
  },

  // --- W5: Deadline Calculator (Fristen) ---
  'fristen.title': {
    de: 'Fristenrechner',
    fr: 'Calculateur de délais',
    it: 'Calcolatore dei termini',
    en: 'Deadline calculator',
  },
  'fristen.procedure': {
    de: 'Verfahrensart / Akt',
    fr: 'Type de procédure / acte',
    it: 'Tipo di procedura / atto',
    en: 'Procedure type / act',
  },
  'fristen.notificationDate': {
    de: 'Zustellungsdatum',
    fr: 'Date de notification',
    it: 'Data di notifica',
    en: 'Notification date',
  },
  'fristen.canton': {
    de: 'Kanton',
    fr: 'Canton',
    it: 'Cantone',
    en: 'Canton',
  },
  'fristen.calculate': {
    de: 'Berechnen',
    fr: 'Calculer',
    it: 'Calcola',
    en: 'Calculate',
  },
  'fristen.deadline': {
    de: 'Frist',
    fr: 'Délai',
    it: 'Termine',
    en: 'Deadline',
  },
  'fristen.rule': {
    de: 'Angewandte Regel',
    fr: 'Règle appliquée',
    it: 'Regola applicata',
    en: 'Applied rule',
  },
  'fristen.computation': {
    de: 'Berechnungsschritte',
    fr: 'Étapes du calcul',
    it: 'Passaggi del calcolo',
    en: 'Computation steps',
  },
  'fristen.holiday': {
    de: 'Feiertag',
    fr: 'Jour férié',
    it: 'Giorno festivo',
    en: 'Public holiday',
  },
  'fristen.suspension': {
    de: 'Gerichtsferien',
    fr: 'Suspension (féries judiciaires)',
    it: 'Sospensione feriale',
    en: 'Judicial recess',
  },
  'fristen.insertInMemo': {
    de: 'In das Memo einfügen',
    fr: 'Insérer dans le mémo',
    it: 'Inserisci nel memo',
    en: 'Insert into memo',
  },
  'fristen.disclaimer': {
    de: 'Dieser Rechner ist ein Hilfsmittel. Er ersetzt keine professionelle Fristenkontrolle. Eine Überprüfung durch eine Fachperson ist zwingend erforderlich.',
    fr: 'Ce calculateur est un outil auxiliaire. Il ne remplace pas un contrôle professionnel des délais. Une vérification par un spécialiste est impérative.',
    it: 'Questo calcolatore è uno strumento ausiliario. Non sostituisce il controllo professionale dei termini. La verifica da parte di un professionista è obbligatoria.',
    en: 'This calculator is an auxiliary tool. It does not replace professional deadline control. Verification by a qualified professional is mandatory.',
  },
  'fristen.outOfScope': {
    de: 'Ausserhalb des Berechnungsbereichs',
    fr: 'Hors du périmètre de calcul',
    it: 'Al di fuori del perimetro di calcolo',
    en: 'Outside calculation scope',
  },
  'fristen.lastVerified': {
    de: 'Letzte Überprüfung der Feiertagsdaten',
    fr: 'Dernière vérification des jours fériés',
    it: 'Ultima verifica dei giorni festivi',
    en: 'Last holiday data verification',
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
