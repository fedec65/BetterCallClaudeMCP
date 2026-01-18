import type {
  LegalStrategyInput,
  LegalStrategyOutput,
  StrengthWeakness,
  Risk,
  NextStep,
  Language,
  LegalArea,
  Canton,
} from '../types.js';

// ============================================================================
// Legal Knowledge Base
// ============================================================================

interface StatutoryBasis {
  articles: string[];
  description: Record<Language, string>;
}

const STATUTORY_BASIS: Record<LegalArea, StatutoryBasis> = {
  contract: {
    articles: ['Art. 97 OR', 'Art. 107 OR', 'Art. 119 OR', 'Art. 82 OR'],
    description: {
      de: 'Vertragliche Haftung nach Obligationenrecht',
      fr: 'Responsabilité contractuelle selon Code des obligations',
      it: 'Responsabilità contrattuale secondo Codice delle obbligazioni',
      en: 'Contractual liability under Code of Obligations',
    },
  },
  employment: {
    articles: ['Art. 319 OR', 'Art. 335 OR', 'Art. 336 OR', 'Art. 337 OR', 'GlG'],
    description: {
      de: 'Arbeitsrecht nach OR und Gleichstellungsgesetz',
      fr: 'Droit du travail selon CO et loi sur l\'égalité',
      it: 'Diritto del lavoro secondo CO e legge sulla parità',
      en: 'Employment law under CO and Equality Act',
    },
  },
  corporate: {
    articles: ['Art. 716 OR', 'Art. 717 OR', 'Art. 754 OR', 'Art. 620 OR'],
    description: {
      de: 'Gesellschaftsrecht nach OR',
      fr: 'Droit des sociétés selon CO',
      it: 'Diritto societario secondo CO',
      en: 'Corporate law under CO',
    },
  },
  tort: {
    articles: ['Art. 41 OR', 'Art. 47 OR', 'Art. 49 OR', 'SVG'],
    description: {
      de: 'Ausservertragliche Haftung nach OR',
      fr: 'Responsabilité extracontractuelle selon CO',
      it: 'Responsabilità extracontrattuale secondo CO',
      en: 'Tort liability under CO',
    },
  },
  property: {
    articles: ['Art. 641 ZGB', 'Art. 675 ZGB', 'Art. 684 ZGB'],
    description: {
      de: 'Sachenrecht nach ZGB',
      fr: 'Droits réels selon CC',
      it: 'Diritti reali secondo CC',
      en: 'Property law under CC',
    },
  },
  family: {
    articles: ['Art. 111 ZGB', 'Art. 125 ZGB', 'Art. 163 ZGB', 'Art. 276 ZGB'],
    description: {
      de: 'Familienrecht nach ZGB',
      fr: 'Droit de la famille selon CC',
      it: 'Diritto di famiglia secondo CC',
      en: 'Family law under CC',
    },
  },
  succession: {
    articles: ['Art. 457 ZGB', 'Art. 470 ZGB', 'Art. 522 ZGB'],
    description: {
      de: 'Erbrecht nach ZGB',
      fr: 'Droit successoral selon CC',
      it: 'Diritto successorio secondo CC',
      en: 'Succession law under CC',
    },
  },
  intellectual_property: {
    articles: ['URG', 'MSchG', 'PatG', 'DesG'],
    description: {
      de: 'Immaterialgüterrecht',
      fr: 'Propriété intellectuelle',
      it: 'Proprietà intellettuale',
      en: 'Intellectual property law',
    },
  },
  competition: {
    articles: ['Art. 2 KG', 'Art. 5 KG', 'Art. 7 KG', 'UWG'],
    description: {
      de: 'Wettbewerbsrecht und UWG',
      fr: 'Droit de la concurrence et LCD',
      it: 'Diritto della concorrenza e LCSl',
      en: 'Competition law and unfair competition',
    },
  },
  banking: {
    articles: ['BankG', 'FINMAG', 'GwG', 'KAG'],
    description: {
      de: 'Banken- und Finanzmarktrecht',
      fr: 'Droit bancaire et des marchés financiers',
      it: 'Diritto bancario e dei mercati finanziari',
      en: 'Banking and financial markets law',
    },
  },
  tax: {
    articles: ['DBG', 'StHG', 'MWSTG', 'VStG'],
    description: {
      de: 'Steuerrecht',
      fr: 'Droit fiscal',
      it: 'Diritto fiscale',
      en: 'Tax law',
    },
  },
  administrative: {
    articles: ['VwVG', 'BGG', 'BV'],
    description: {
      de: 'Verwaltungsrecht',
      fr: 'Droit administratif',
      it: 'Diritto amministrativo',
      en: 'Administrative law',
    },
  },
  criminal: {
    articles: ['Art. 10 StGB', 'Art. 12 StGB', 'Art. 47 StGB', 'StPO'],
    description: {
      de: 'Strafrecht',
      fr: 'Droit pénal',
      it: 'Diritto penale',
      en: 'Criminal law',
    },
  },
};

const VENUE_BY_CANTON: Record<Canton, Record<Language, string>> = {
  ZH: {
    de: 'Bezirksgericht / Handelsgericht Zürich',
    fr: 'Tribunal de district / Tribunal de commerce de Zurich',
    it: 'Tribunale distrettuale / Tribunale commerciale di Zurigo',
    en: 'District Court / Commercial Court Zürich',
  },
  BE: {
    de: 'Regionalgericht Bern',
    fr: 'Tribunal régional de Berne',
    it: 'Tribunale regionale di Berna',
    en: 'Regional Court Bern',
  },
  GE: {
    de: 'Tribunal de première instance Genève',
    fr: 'Tribunal de première instance de Genève',
    it: 'Tribunale di prima istanza di Ginevra',
    en: 'Court of First Instance Geneva',
  },
  BS: {
    de: 'Zivilgericht Basel-Stadt',
    fr: 'Tribunal civil de Bâle-Ville',
    it: 'Tribunale civile di Basilea Città',
    en: 'Civil Court Basel-Stadt',
  },
  VD: {
    de: 'Tribunal civil Vaud',
    fr: 'Tribunal civil du canton de Vaud',
    it: 'Tribunale civile del Canton Vaud',
    en: 'Civil Court Vaud',
  },
  TI: {
    de: 'Pretore Ticino',
    fr: 'Préteur du Tessin',
    it: 'Pretore del Cantone Ticino',
    en: 'Magistrate Ticino',
  },
};

// ============================================================================
// Language-specific statute conversion
// ============================================================================

function convertStatuteReferences(articles: string[], language: Language): string[] {
  if (language === 'de') {
    return articles; // German is the base language
  }

  // Convert German abbreviations to French/Italian equivalents
  return articles.map(article => {
    let converted = article;
    if (language === 'fr' || language === 'it') {
      // Code of Obligations: OR -> CO
      converted = converted.replace(/\bOR\b/g, 'CO');
      // Civil Code: ZGB -> CC
      converted = converted.replace(/\bZGB\b/g, 'CC');
      // Equality Act: GlG -> LEg (FR) / LPar (IT)
      if (language === 'fr') {
        converted = converted.replace(/\bGlG\b/g, 'LEg');
      } else if (language === 'it') {
        converted = converted.replace(/\bGlG\b/g, 'LPar');
      }
      // Unfair Competition Act: UWG -> LCD (FR) / LCSl (IT)
      if (language === 'fr') {
        converted = converted.replace(/\bUWG\b/g, 'LCD');
      } else if (language === 'it') {
        converted = converted.replace(/\bUWG\b/g, 'LCSl');
      }
    }
    // English: keep German abbreviations with explanations or use original
    return converted;
  });
}

// ============================================================================
// Analysis Helpers
// ============================================================================

function analyzeFactsForStrengths(
  facts: string,
  legalArea: LegalArea,
  clientPosition: string,
  language: Language
): StrengthWeakness[] {
  const strengths: StrengthWeakness[] = [];
  const factsLower = facts.toLowerCase();

  // Contract-specific strength indicators
  if (legalArea === 'contract') {
    if (factsLower.includes('written') || factsLower.includes('schriftlich') || factsLower.includes('écrit')) {
      strengths.push({
        point: language === 'de' ? 'Schriftlicher Vertrag vorhanden' :
               language === 'fr' ? 'Contrat écrit existant' :
               language === 'it' ? 'Contratto scritto esistente' : 'Written contract exists',
        explanation: language === 'de' ? 'Beweislage durch Schriftlichkeit gestärkt' :
                    language === 'fr' ? 'Preuve renforcée par l\'écrit' :
                    language === 'it' ? 'Prova rafforzata dalla forma scritta' : 'Evidence strengthened by written form',
        relevance: 'high',
      });
    }
    if (factsLower.includes('documented') || factsLower.includes('dokumentiert') || factsLower.includes('damage')) {
      strengths.push({
        point: language === 'de' ? 'Dokumentierter Schaden' :
               language === 'fr' ? 'Dommage documenté' :
               language === 'it' ? 'Danno documentato' : 'Documented damages',
        explanation: language === 'de' ? 'Schadensnachweis erleichtert Anspruchsdurchsetzung' :
                    language === 'fr' ? 'La preuve du dommage facilite l\'exécution' :
                    language === 'it' ? 'La prova del danno facilita l\'esecuzione' : 'Damage evidence facilitates claim enforcement',
        relevance: 'high',
      });
    }
    if (factsLower.includes('clear breach') || factsLower.includes('vertragsverletzung')) {
      strengths.push({
        point: language === 'de' ? 'Eindeutige Vertragsverletzung' :
               language === 'fr' ? 'Violation contractuelle évidente' :
               language === 'it' ? 'Violazione contrattuale evidente' : 'Clear breach of contract',
        explanation: language === 'de' ? 'Haftungsvoraussetzungen erfüllt' :
                    language === 'fr' ? 'Conditions de responsabilité remplies' :
                    language === 'it' ? 'Condizioni di responsabilità soddisfatte' : 'Liability requirements met',
        relevance: 'high',
      });
    }
  }

  // Employment-specific strength indicators
  if (legalArea === 'employment') {
    if (factsLower.includes('years of service') || factsLower.includes('dienstjahre')) {
      strengths.push({
        point: language === 'de' ? 'Langjähriges Arbeitsverhältnis' :
               language === 'fr' ? 'Relation de travail de longue durée' :
               language === 'it' ? 'Rapporto di lavoro di lunga durata' : 'Long-term employment relationship',
        explanation: language === 'de' ? 'Erhöhter Kündigungsschutz und längere Fristen' :
                    language === 'fr' ? 'Protection accrue contre le licenciement' :
                    language === 'it' ? 'Maggiore protezione contro il licenziamento' : 'Enhanced protection and longer notice periods',
        relevance: 'high',
      });
    }
    if (factsLower.includes('without notice') || factsLower.includes('fristlos') || factsLower.includes('sans préavis')) {
      if (clientPosition === 'plaintiff') {
        strengths.push({
          point: language === 'de' ? 'Fristlose Kündigung anfechtbar' :
                 language === 'fr' ? 'Licenciement immédiat contestable' :
                 language === 'it' ? 'Licenziamento immediato contestabile' : 'Summary dismissal contestable',
          explanation: language === 'de' ? 'Hohe Anforderungen an wichtigen Grund (Art. 337 OR)' :
                      language === 'fr' ? 'Exigences élevées pour justes motifs (art. 337 CO)' :
                      language === 'it' ? 'Requisiti elevati per giusta causa (art. 337 CO)' : 'High threshold for just cause (Art. 337 CO)',
          relevance: 'high',
        });
      }
    }
  }

  // Force majeure for defendant
  if (clientPosition === 'defendant' && (factsLower.includes('force majeure') || factsLower.includes('höhere gewalt'))) {
    strengths.push({
      point: language === 'de' ? 'Höhere Gewalt als Entlastungsgrund' :
             language === 'fr' ? 'Force majeure comme motif d\'exonération' :
             language === 'it' ? 'Forza maggiore come motivo di esonero' : 'Force majeure as defense',
      explanation: language === 'de' ? 'Unmöglichkeit der Leistung nach Art. 119 OR' :
                  language === 'fr' ? 'Impossibilité d\'exécution selon art. 119 CO' :
                  language === 'it' ? 'Impossibilità di adempimento secondo art. 119 CO' : 'Impossibility under Art. 119 CO',
      relevance: 'high',
    });
  }

  // General strengths if none found
  if (strengths.length === 0) {
    strengths.push({
      point: language === 'de' ? 'Rechtliche Grundlage vorhanden' :
             language === 'fr' ? 'Base juridique existante' :
             language === 'it' ? 'Base giuridica esistente' : 'Legal basis exists',
      explanation: language === 'de' ? 'Anspruch grundsätzlich prüfenswert' :
                  language === 'fr' ? 'Prétention fondamentalement examinable' :
                  language === 'it' ? 'Pretesa fondamentalmente esaminabile' : 'Claim fundamentally worth examining',
      relevance: 'medium',
    });
  }

  return strengths;
}

function analyzeFactsForWeaknesses(
  facts: string,
  _legalArea: LegalArea,
  _clientPosition: string,
  language: Language
): StrengthWeakness[] {
  const weaknesses: StrengthWeakness[] = [];
  const factsLower = facts.toLowerCase();

  // Evidence weakness indicators
  if (factsLower.includes('oral') || factsLower.includes('mündlich') || factsLower.includes('verbal') || factsLower.includes('no written')) {
    weaknesses.push({
      point: language === 'de' ? 'Fehlende schriftliche Beweise' :
             language === 'fr' ? 'Absence de preuves écrites' :
             language === 'it' ? 'Mancanza di prove scritte' : 'Lack of written evidence',
      explanation: language === 'de' ? 'Beweislast liegt beim Anspruchsteller' :
                  language === 'fr' ? 'Charge de la preuve incombe au demandeur' :
                  language === 'it' ? 'Onere della prova incombe al richiedente' : 'Burden of proof on claimant',
      relevance: 'high',
    });
  }

  if (factsLower.includes('denies') || factsLower.includes('bestreitet') || factsLower.includes('conteste')) {
    weaknesses.push({
      point: language === 'de' ? 'Gegenseite bestreitet Sachverhalt' :
             language === 'fr' ? 'Partie adverse conteste les faits' :
             language === 'it' ? 'Controparte contesta i fatti' : 'Counterparty denies facts',
      explanation: language === 'de' ? 'Streitiger Sachverhalt erfordert Beweisführung' :
                  language === 'fr' ? 'Faits contestés nécessitent administration des preuves' :
                  language === 'it' ? 'Fatti contestati richiedono assunzione delle prove' : 'Disputed facts require evidence',
      relevance: 'medium',
    });
  }

  if (factsLower.includes('weak evidence') || factsLower.includes('schwache beweis')) {
    weaknesses.push({
      point: language === 'de' ? 'Schwache Beweislage' :
             language === 'fr' ? 'Preuves faibles' :
             language === 'it' ? 'Prove deboli' : 'Weak evidence',
      explanation: language === 'de' ? 'Risiko der Beweislosigkeit' :
                  language === 'fr' ? 'Risque d\'insuffisance de preuves' :
                  language === 'it' ? 'Rischio di insufficienza probatoria' : 'Risk of insufficient evidence',
      relevance: 'high',
    });
  }

  if (factsLower.includes('ambiguous') || factsLower.includes('unklar') || factsLower.includes('ambigu')) {
    weaknesses.push({
      point: language === 'de' ? 'Unklare Vertragsterme' :
             language === 'fr' ? 'Termes contractuels ambigus' :
             language === 'it' ? 'Termini contrattuali ambigui' : 'Ambiguous contract terms',
      explanation: language === 'de' ? 'Auslegungsfragen zu erwarten' :
                  language === 'fr' ? 'Questions d\'interprétation attendues' :
                  language === 'it' ? 'Questioni di interpretazione attese' : 'Interpretation questions expected',
      relevance: 'medium',
    });
  }

  // Add default weakness if none found
  if (weaknesses.length === 0) {
    weaknesses.push({
      point: language === 'de' ? 'Prozessrisiko vorhanden' :
             language === 'fr' ? 'Risque procédural existant' :
             language === 'it' ? 'Rischio processuale esistente' : 'Litigation risk exists',
      explanation: language === 'de' ? 'Ausgang gerichtlicher Verfahren nie garantiert' :
                  language === 'fr' ? 'Issue des procédures jamais garantie' :
                  language === 'it' ? 'Esito delle procedure mai garantito' : 'Outcome never guaranteed',
      relevance: 'low',
    });
  }

  return weaknesses;
}

function determineSuccessLikelihood(
  strengths: StrengthWeakness[],
  weaknesses: StrengthWeakness[]
): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' {
  const strengthScore = strengths.reduce((acc, s) =>
    acc + (s.relevance === 'high' ? 3 : s.relevance === 'medium' ? 2 : 1), 0);
  const weaknessScore = weaknesses.reduce((acc, w) =>
    acc + (w.relevance === 'high' ? 3 : w.relevance === 'medium' ? 2 : 1), 0);

  const netScore = strengthScore - weaknessScore;

  if (netScore >= 6) return 'very_high';
  if (netScore >= 3) return 'high';
  if (netScore >= 0) return 'medium';
  if (netScore >= -3) return 'low';
  return 'very_low';
}

function generateKeyArguments(
  facts: string,
  legalArea: LegalArea,
  clientPosition: string,
  language: Language
): string[] {
  const arguments_: string[] = [];
  const factsLower = facts.toLowerCase();

  if (legalArea === 'contract') {
    if (clientPosition === 'plaintiff') {
      arguments_.push(
        language === 'de' ? 'Vertragliche Pflichten wurden verletzt' :
        language === 'fr' ? 'Les obligations contractuelles ont été violées' :
        language === 'it' ? 'Gli obblighi contrattuali sono stati violati' : 'Contractual obligations were breached'
      );
      arguments_.push(
        language === 'de' ? 'Kausalzusammenhang zwischen Pflichtverletzung und Schaden' :
        language === 'fr' ? 'Lien de causalité entre violation et dommage' :
        language === 'it' ? 'Nesso causale tra violazione e danno' : 'Causal link between breach and damage'
      );
    }
    if (clientPosition === 'defendant' && (factsLower.includes('force majeure') || factsLower.includes('höhere gewalt'))) {
      arguments_.push(
        language === 'de' ? 'Höhere Gewalt entlastet von Haftung (Art. 119 OR)' :
        language === 'fr' ? 'Force majeure exonère de responsabilité (art. 119 CO)' :
        language === 'it' ? 'Forza maggiore esonera dalla responsabilità (art. 119 CO)' : 'Force majeure exempts from liability (Art. 119 CO)'
      );
      arguments_.push(
        language === 'de' ? 'Unmöglichkeit der Leistungserbringung' :
        language === 'fr' ? 'Impossibilité d\'exécution' :
        language === 'it' ? 'Impossibilità di adempimento' : 'Impossibility of performance'
      );
    }
  }

  if (legalArea === 'tort') {
    if (clientPosition === 'plaintiff') {
      arguments_.push(
        language === 'de' ? 'Widerrechtliche Handlung nachgewiesen' :
        language === 'fr' ? 'Acte illicite établi' :
        language === 'it' ? 'Atto illecito dimostrato' : 'Unlawful act established'
      );
      arguments_.push(
        language === 'de' ? 'Schaden dokumentiert und beziffert (Art. 41 OR)' :
        language === 'fr' ? 'Dommage documenté et chiffré (art. 41 CO)' :
        language === 'it' ? 'Danno documentato e quantificato (art. 41 CO)' : 'Damage documented and quantified (Art. 41 CO)'
      );
      if (factsLower.includes('pain') || factsLower.includes('suffering') || factsLower.includes('injury')) {
        arguments_.push(
          language === 'de' ? 'Genugtuungsanspruch für immaterielle Schäden (Art. 47 OR)' :
          language === 'fr' ? 'Indemnité pour tort moral (art. 47 CO)' :
          language === 'it' ? 'Riparazione per danno morale (art. 47 CO)' : 'Compensation for moral damages (Art. 47 CO)'
        );
      }
    }
  }

  if (legalArea === 'employment') {
    if (factsLower.includes('termination') || factsLower.includes('kündigung') || factsLower.includes('licenciement')) {
      arguments_.push(
        language === 'de' ? 'Kündigungsfristen nach Art. 335c OR einzuhalten' :
        language === 'fr' ? 'Délais de congé selon art. 335c CO à respecter' :
        language === 'it' ? 'Termini di disdetta secondo art. 335c CO da rispettare' : 'Notice periods per Art. 335c CO apply'
      );
    }
    if (factsLower.includes('discrimination') || factsLower.includes('salary') || factsLower.includes('equal')) {
      arguments_.push(
        language === 'de' ? 'Gleichstellungsgesetz (GlG) garantiert Lohngleichheit' :
        language === 'fr' ? 'Loi sur l\'égalité (LEg) garantit l\'égalité salariale' :
        language === 'it' ? 'Legge sulla parità (LPar) garantisce parità salariale' : 'Equality Act (GlG) guarantees equal pay'
      );
    }
  }

  if (arguments_.length === 0) {
    arguments_.push(
      language === 'de' ? 'Rechtliche Grundlage im anwendbaren Recht gegeben' :
      language === 'fr' ? 'Base juridique dans le droit applicable' :
      language === 'it' ? 'Base giuridica nel diritto applicabile' : 'Legal basis in applicable law'
    );
  }

  return arguments_;
}

function generateRisks(
  facts: string,
  disputeAmount: number | undefined,
  language: Language
): Risk[] {
  const risks: Risk[] = [];
  const factsLower = facts.toLowerCase();

  // Cost risk for low-value disputes
  if (disputeAmount !== undefined && disputeAmount < 10000) {
    risks.push({
      description: language === 'de' ? 'Kostenrisiko übersteigt möglicherweise Streitwert' :
                   language === 'fr' ? 'Risque de frais peut dépasser la valeur litigieuse' :
                   language === 'it' ? 'Rischio di costi può superare il valore litigioso' : 'Cost risk may exceed dispute value',
      probability: 'high',
      impact: 'high',
      mitigation: language === 'de' ? 'Schlichtungsversuch oder vereinfachtes Verfahren prüfen' :
                  language === 'fr' ? 'Examiner conciliation ou procédure simplifiée' :
                  language === 'it' ? 'Esaminare conciliazione o procedura semplificata' : 'Consider mediation or simplified procedure',
    });
  }

  // Evidence risk
  if (factsLower.includes('oral') || factsLower.includes('weak evidence') || factsLower.includes('no written')) {
    risks.push({
      description: language === 'de' ? 'Beweisrisiko durch mangelnde Dokumentation' :
                   language === 'fr' ? 'Risque probatoire par manque de documentation' :
                   language === 'it' ? 'Rischio probatorio per mancanza di documentazione' : 'Evidence risk due to lack of documentation',
      probability: 'medium',
      impact: 'high',
      mitigation: language === 'de' ? 'Beweise sichern, Zeugen identifizieren' :
                  language === 'fr' ? 'Sécuriser preuves, identifier témoins' :
                  language === 'it' ? 'Assicurare prove, identificare testimoni' : 'Secure evidence, identify witnesses',
    });
  }

  // General litigation risk
  risks.push({
    description: language === 'de' ? 'Allgemeines Prozessrisiko' :
                 language === 'fr' ? 'Risque procédural général' :
                 language === 'it' ? 'Rischio processuale generale' : 'General litigation risk',
    probability: 'medium',
    impact: 'medium',
    mitigation: language === 'de' ? 'Sorgfältige Vorbereitung und realistische Einschätzung' :
                language === 'fr' ? 'Préparation soigneuse et évaluation réaliste' :
                language === 'it' ? 'Preparazione accurata e valutazione realistica' : 'Careful preparation and realistic assessment',
  });

  return risks;
}

function generateNextSteps(
  _facts: string,
  deadlinePressure: 'urgent' | 'normal' | 'flexible',
  clientPosition: string,
  language: Language
): NextStep[] {
  const steps: NextStep[] = [];
  const isUrgent = deadlinePressure === 'urgent';

  // Evidence gathering
  steps.push({
    action: language === 'de' ? 'Beweismittel sichern und dokumentieren' :
            language === 'fr' ? 'Sécuriser et documenter les preuves' :
            language === 'it' ? 'Assicurare e documentare le prove' : 'Secure and document evidence',
    priority: isUrgent ? 'high' : 'high',
    deadline: isUrgent ? '7 Tage' : '14 Tage',
  });

  // Legal analysis
  steps.push({
    action: language === 'de' ? 'Detaillierte Rechtslage analysieren' :
            language === 'fr' ? 'Analyser la situation juridique en détail' :
            language === 'it' ? 'Analizzare la situazione giuridica in dettaglio' : 'Analyze legal situation in detail',
    priority: 'high',
  });

  // Settlement consideration
  if (clientPosition === 'plaintiff') {
    steps.push({
      action: language === 'de' ? 'Vergleichsmöglichkeiten prüfen' :
              language === 'fr' ? 'Examiner les possibilités de transaction' :
              language === 'it' ? 'Esaminare le possibilità di transazione' : 'Evaluate settlement options',
      priority: 'medium',
    });
  }

  // Procedural preparation
  steps.push({
    action: language === 'de' ? 'Prozessuale Schritte vorbereiten' :
            language === 'fr' ? 'Préparer les démarches procédurales' :
            language === 'it' ? 'Preparare le misure procedurali' : 'Prepare procedural steps',
    priority: isUrgent ? 'high' : 'medium',
  });

  return steps;
}

function determineVenue(
  jurisdiction: 'federal' | 'cantonal',
  canton: Canton | undefined,
  legalArea: LegalArea,
  language: Language
): string {
  if (jurisdiction === 'cantonal' && canton) {
    const baseVenue = VENUE_BY_CANTON[canton][language];
    if (canton === 'ZH' && (legalArea === 'contract' || legalArea === 'corporate')) {
      return `Handelsgericht Zürich / ${baseVenue}`;
    }
    return baseVenue;
  }

  return language === 'de' ? 'Zuständiges erstinstanzliches Gericht' :
         language === 'fr' ? 'Tribunal de première instance compétent' :
         language === 'it' ? 'Tribunale di prima istanza competente' : 'Competent court of first instance';
}

function estimateDuration(
  legalArea: LegalArea,
  disputeAmount: number | undefined,
  language: Language
): string {
  let months = 12; // Default

  if (disputeAmount && disputeAmount < 30000) {
    months = 6;
  } else if (disputeAmount && disputeAmount > 500000) {
    months = 24;
  }

  if (legalArea === 'employment') {
    months = Math.min(months, 9);
  }

  return language === 'de' ? `${months} - ${months + 6} Monate (geschätzt)` :
         language === 'fr' ? `${months} - ${months + 6} mois (estimé)` :
         language === 'it' ? `${months} - ${months + 6} mesi (stimato)` : `${months} - ${months + 6} months (estimated)`;
}

function estimateCosts(
  disputeAmount: number | undefined,
  language: Language
): { courtFees: string; legalFees: string; otherCosts?: string } {
  const amount = disputeAmount || 50000;

  // Simplified Swiss court fee calculation
  let courtFee: number;
  if (amount <= 10000) {
    courtFee = 800;
  } else if (amount <= 50000) {
    courtFee = 2500;
  } else if (amount <= 100000) {
    courtFee = 5000;
  } else if (amount <= 500000) {
    courtFee = 15000;
  } else {
    courtFee = 30000;
  }

  const legalFee = Math.max(3000, amount * 0.1);

  return {
    courtFees: `CHF ${courtFee.toLocaleString()} - ${(courtFee * 1.5).toLocaleString()}`,
    legalFees: `CHF ${legalFee.toLocaleString()} - ${(legalFee * 2).toLocaleString()}`,
    otherCosts: language === 'de' ? 'Gutachten, Übersetzungen nach Bedarf' :
                language === 'fr' ? 'Expertises, traductions selon besoins' :
                language === 'it' ? 'Perizie, traduzioni secondo necessità' : 'Expert opinions, translations as needed',
  };
}

function generateAppealOptions(
  jurisdiction: 'federal' | 'cantonal',
  canton: Canton | undefined,
  language: Language
): string[] {
  const options: string[] = [];

  if (jurisdiction === 'cantonal' || canton) {
    options.push(
      language === 'de' ? 'Berufung ans Obergericht / kantonale Rechtsmittelinstanz' :
      language === 'fr' ? 'Appel à la cour cantonale' :
      language === 'it' ? 'Appello alla corte cantonale' : 'Appeal to cantonal appellate court'
    );
  }

  options.push(
    language === 'de' ? 'Beschwerde in Zivilsachen ans Bundesgericht (BGer)' :
    language === 'fr' ? 'Recours en matière civile au Tribunal fédéral' :
    language === 'it' ? 'Ricorso in materia civile al Tribunale federale' : 'Appeal to Federal Supreme Court (BGer)'
  );

  return options;
}

function determineSettlementRecommendation(
  successLikelihood: 'very_high' | 'high' | 'medium' | 'low' | 'very_low',
  disputeAmount: number | undefined,
  weaknesses: StrengthWeakness[]
): { recommended: boolean; rationale: string; leverage: 'strong' | 'moderate' | 'weak' } {
  const hasHighWeakness = weaknesses.some(w => w.relevance === 'high');

  if (successLikelihood === 'low' || successLikelihood === 'very_low' || hasHighWeakness) {
    return {
      recommended: true,
      rationale: 'Weak position suggests settlement is advisable',
      leverage: 'weak',
    };
  }

  if (successLikelihood === 'medium') {
    return {
      recommended: true,
      rationale: 'Balanced case - settlement could save time and costs',
      leverage: 'moderate',
    };
  }

  if (disputeAmount && disputeAmount < 10000) {
    return {
      recommended: true,
      rationale: 'Low dispute value makes litigation cost-ineffective',
      leverage: 'moderate',
    };
  }

  return {
    recommended: false,
    rationale: 'Strong position - litigation may yield better results',
    leverage: 'strong',
  };
}

// ============================================================================
// Main Function
// ============================================================================

export function legalStrategy(input: LegalStrategyInput): LegalStrategyOutput {
  const {
    case_facts,
    jurisdiction,
    canton,
    legal_area,
    client_position,
    dispute_amount,
    deadline_pressure,
    language,
  } = input;

  // Analyze strengths and weaknesses
  const strengths = analyzeFactsForStrengths(case_facts, legal_area, client_position, language);
  const weaknesses = analyzeFactsForWeaknesses(case_facts, legal_area, client_position, language);
  const successLikelihood = determineSuccessLikelihood(strengths, weaknesses);

  // Get statutory basis
  const statutoryBasis = STATUTORY_BASIS[legal_area];
  let articles = [...statutoryBasis.articles];

  // Add force majeure article if relevant
  if (case_facts.toLowerCase().includes('force majeure') || case_facts.toLowerCase().includes('höhere gewalt')) {
    if (!articles.includes('Art. 119 OR')) {
      articles.push('Art. 119 OR');
    }
  }

  // Generate key arguments
  const keyArguments = generateKeyArguments(case_facts, legal_area, client_position, language);

  // Settlement recommendation
  const settlementData = determineSettlementRecommendation(successLikelihood, dispute_amount, weaknesses);

  // Generate risks
  const risks = generateRisks(case_facts, dispute_amount, language);

  // Generate next steps
  const nextSteps = generateNextSteps(case_facts, deadline_pressure, client_position, language);

  // Venue and procedural info
  const venue = determineVenue(jurisdiction, canton, legal_area, language);
  const duration = estimateDuration(legal_area, dispute_amount, language);
  const costs = estimateCosts(dispute_amount, language);
  const appealOptions = generateAppealOptions(jurisdiction, canton, language);

  return {
    assessment: {
      strengths,
      weaknesses,
      successLikelihood,
      confidenceLevel: 'medium',
    },
    strategy: {
      primaryApproach: language === 'de' ? `Durchsetzung der Ansprüche nach ${legal_area === 'contract' ? 'Vertragsrecht' : legal_area}` :
                       language === 'fr' ? `Exécution des prétentions selon le droit ${legal_area === 'contract' ? 'des contrats' : legal_area}` :
                       language === 'it' ? `Esecuzione delle pretese secondo il diritto ${legal_area === 'contract' ? 'contrattuale' : legal_area}` :
                       `Enforcement of claims under ${legal_area} law`,
      alternativeApproaches: [
        language === 'de' ? 'Aussergerichtliche Einigung' :
        language === 'fr' ? 'Règlement amiable' :
        language === 'it' ? 'Accordo extragiudiziale' : 'Out-of-court settlement',
        language === 'de' ? 'Mediation' :
        language === 'fr' ? 'Médiation' :
        language === 'it' ? 'Mediazione' : 'Mediation',
      ],
      keyArguments,
      relevantPrecedents: [
        language === 'de' ? 'BGE einschlägig zu prüfen' :
        language === 'fr' ? 'ATF pertinents à examiner' :
        language === 'it' ? 'DTF pertinenti da esaminare' : 'Relevant BGE to be examined',
      ],
      statutoryBasis: convertStatuteReferences(articles, language),
    },
    settlement: {
      recommended: settlementData.recommended,
      rationale: settlementData.rationale,
      suggestedRange: dispute_amount ? {
        min: Math.round(dispute_amount * 0.5),
        max: Math.round(dispute_amount * 0.8),
      } : undefined,
      negotiationLeverage: settlementData.leverage,
    },
    procedural: {
      recommendedVenue: venue,
      estimatedDuration: duration,
      estimatedCosts: costs,
      appealOptions,
    },
    risks,
    nextSteps,
    language,
  };
}
