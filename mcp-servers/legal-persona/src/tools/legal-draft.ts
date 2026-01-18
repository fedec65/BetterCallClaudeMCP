/**
 * legal_draft tool implementation
 * Generates Swiss legal documents including contracts, litigation documents, and legal opinions
 */

import type {
  LegalDraftInput,
  LegalDraftOutput,
  DocumentSection,
  DocumentType,
  Language,
  Canton,
} from '../types.js';

/**
 * Main function to generate legal documents
 */
export async function legalDraft(input: LegalDraftInput): Promise<LegalDraftOutput> {
  const {
    document_type,
    context,
    parties,
    jurisdiction,
    canton,
    language,
    format,
    include_comments,
  } = input;

  // Generate document title
  const title = generateTitle(document_type, parties, language);

  // Generate preamble
  const preamble = generatePreamble(document_type, parties, context, language);

  // Generate sections based on document type and format
  const sections = generateSections(
    document_type,
    context,
    parties,
    jurisdiction,
    canton,
    language,
    format,
    include_comments
  );

  // Generate signatures for contracts
  const signatures = isContractType(document_type)
    ? generateSignatures(parties, language)
    : undefined;

  // Generate warnings for litigation documents
  const warnings = generateWarnings(document_type, language);

  return {
    documentType: document_type,
    title,
    preamble,
    sections,
    signatures,
    metadata: {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      jurisdiction,
      canton,
      language,
    },
    warnings,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function isContractType(docType: DocumentType): boolean {
  const contractTypes: DocumentType[] = [
    'service_agreement',
    'employment_contract',
    'nda',
    'shareholders_agreement',
    'loan_agreement',
    'lease_agreement',
  ];
  return contractTypes.includes(docType);
}

function isLitigationType(docType: DocumentType): boolean {
  const litigationTypes: DocumentType[] = [
    'klageschrift',
    'klageantwort',
    'berufung',
    'beschwerde',
    'replik',
    'duplik',
  ];
  return litigationTypes.includes(docType);
}

function generateTitle(
  docType: DocumentType,
  parties: LegalDraftInput['parties'],
  language: Language
): string {
  const titles: Record<DocumentType, Record<Language, string>> = {
    service_agreement: {
      de: 'Dienstleistungsvertrag',
      fr: 'Contrat de services',
      it: 'Contratto di servizi',
      en: 'Service Agreement',
    },
    employment_contract: {
      de: 'Arbeitsvertrag',
      fr: 'Contrat de travail',
      it: 'Contratto di lavoro',
      en: 'Employment Contract',
    },
    nda: {
      de: 'Geheimhaltungsvereinbarung',
      fr: 'Accord de confidentialité',
      it: 'Accordo di riservatezza',
      en: 'Non-Disclosure Agreement',
    },
    shareholders_agreement: {
      de: 'Aktionärbindungsvertrag',
      fr: 'Convention d\'actionnaires',
      it: 'Patto parasociale',
      en: 'Shareholders Agreement',
    },
    loan_agreement: {
      de: 'Darlehensvertrag',
      fr: 'Contrat de prêt',
      it: 'Contratto di mutuo',
      en: 'Loan Agreement',
    },
    lease_agreement: {
      de: 'Mietvertrag',
      fr: 'Contrat de bail',
      it: 'Contratto di locazione',
      en: 'Lease Agreement',
    },
    klageschrift: {
      de: 'Klageschrift',
      fr: 'Demande en justice',
      it: 'Petizione',
      en: 'Statement of Claim',
    },
    klageantwort: {
      de: 'Klageantwort',
      fr: 'Réponse à la demande',
      it: 'Risposta alla petizione',
      en: 'Statement of Defense',
    },
    berufung: {
      de: 'Berufung',
      fr: 'Appel',
      it: 'Appello',
      en: 'Appeal',
    },
    beschwerde: {
      de: 'Beschwerde',
      fr: 'Recours',
      it: 'Ricorso',
      en: 'Complaint',
    },
    replik: {
      de: 'Replik',
      fr: 'Réplique',
      it: 'Replica',
      en: 'Reply',
    },
    duplik: {
      de: 'Duplik',
      fr: 'Duplique',
      it: 'Duplica',
      en: 'Rejoinder',
    },
    rechtsgutachten: {
      de: 'Rechtsgutachten',
      fr: 'Avis de droit',
      it: 'Parere legale',
      en: 'Legal Opinion',
    },
    memorandum: {
      de: 'Rechtsmemorandum',
      fr: 'Mémorandum juridique',
      it: 'Memorandum legale',
      en: 'Legal Memorandum',
    },
    legal_brief: {
      de: 'Rechtliche Stellungnahme',
      fr: 'Note juridique',
      it: 'Nota legale',
      en: 'Legal Brief',
    },
  };

  const baseTitle = titles[docType][language];
  if (parties.length >= 2) {
    return `${baseTitle} - ${parties[0].name} / ${parties[1].name}`;
  }
  return baseTitle;
}

function generatePreamble(
  docType: DocumentType,
  parties: LegalDraftInput['parties'],
  _context: string,
  language: Language
): string {
  if (isContractType(docType)) {
    const between = {
      de: 'zwischen',
      fr: 'entre',
      it: 'tra',
      en: 'between',
    };
    const and = {
      de: 'und',
      fr: 'et',
      it: 'e',
      en: 'and',
    };

    const partyList = parties
      .map((p) => {
        const address = p.address ? `, ${p.address}` : '';
        return `${p.name}${address} (${p.role})`;
      })
      .join(` ${and[language]} `);

    return `${between[language]} ${partyList}`;
  }

  if (isLitigationType(docType)) {
    const inRe = {
      de: 'In Sachen',
      fr: 'En la cause',
      it: 'Nella causa',
      en: 'In the matter of',
    };
    const vs = {
      de: 'gegen',
      fr: 'contre',
      it: 'contro',
      en: 'v.',
    };

    if (parties.length >= 2) {
      return `${inRe[language]} ${parties[0].name} (${parties[0].role}) ${vs[language]} ${parties[1].name} (${parties[1].role})`;
    }
  }

  return '';
}

function generateSections(
  docType: DocumentType,
  context: string,
  parties: LegalDraftInput['parties'],
  jurisdiction: 'federal' | 'cantonal',
  canton: Canton | undefined,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  if (isContractType(docType)) {
    return generateContractSections(docType, context, parties, language, format, includeComments);
  }
  if (isLitigationType(docType)) {
    return generateLitigationSections(docType, context, parties, jurisdiction, canton, language, format, includeComments);
  }
  return generateOpinionSections(docType, context, language, format, includeComments);
}

// ============================================================================
// Contract Section Generators
// ============================================================================

function generateContractSections(
  docType: DocumentType,
  context: string,
  parties: LegalDraftInput['parties'],
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const sections: DocumentSection[] = [];

  // Common contract sections
  const commonSections = getCommonContractSections(language, format, includeComments);

  switch (docType) {
    case 'service_agreement':
      sections.push(...getServiceAgreementSections(context, language, format, includeComments));
      break;
    case 'employment_contract':
      sections.push(...getEmploymentContractSections(context, language, format, includeComments));
      break;
    case 'nda':
      sections.push(...getNDASections(context, language, format, includeComments));
      break;
    case 'shareholders_agreement':
      sections.push(...getShareholdersAgreementSections(context, parties, language, format, includeComments));
      break;
    case 'loan_agreement':
      sections.push(...getLoanAgreementSections(context, language, format, includeComments));
      break;
    case 'lease_agreement':
      sections.push(...getLeaseAgreementSections(context, language, format, includeComments));
      break;
  }

  // Add common sections
  sections.push(...commonSections);

  return sections;
}

function getCommonContractSections(
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const sections: DocumentSection[] = [];

  // Governing law
  const governingLawTitle = {
    de: 'Anwendbares Recht',
    fr: 'Droit applicable',
    it: 'Diritto applicabile',
    en: 'Governing Law',
  };

  const governingLawContent = format === 'outline'
    ? '[Schweizer Recht]'
    : format === 'template'
    ? 'Dieser Vertrag untersteht schweizerischem Recht, unter Ausschluss des Kollisionsrechts.'
    : {
        de: 'Dieser Vertrag untersteht schweizerischem Recht, unter Ausschluss des Kollisionsrechts.',
        fr: 'Le présent contrat est soumis au droit suisse, à l\'exclusion des règles de conflit de lois.',
        it: 'Il presente contratto è soggetto al diritto svizzero, con esclusione delle norme di conflitto.',
        en: 'This agreement shall be governed by Swiss law, excluding conflict of laws rules.',
      }[language];

  sections.push({
    title: governingLawTitle[language],
    content: governingLawContent,
    comments: includeComments
      ? {
          de: 'Rechtswahl gemäss Art. 116 IPRG. Bei internationalen Verträgen empfehlenswert.',
          fr: 'Choix du droit selon art. 116 LDIP. Recommandé pour les contrats internationaux.',
          it: 'Scelta del diritto secondo art. 116 LDIP. Raccomandato per contratti internazionali.',
          en: 'Choice of law pursuant to Art. 116 PILA. Recommended for international contracts.',
        }[language]
      : undefined,
  });

  // Jurisdiction clause
  const jurisdictionTitle = {
    de: 'Gerichtsstand',
    fr: 'For juridique',
    it: 'Foro competente',
    en: 'Jurisdiction',
  };

  const jurisdictionContent = format === 'outline'
    ? '[Gerichtsstand]'
    : format === 'template'
    ? 'Ausschliesslicher Gerichtsstand ist ___[Ort]___.'
    : {
        de: 'Ausschliesslicher Gerichtsstand ist Zürich, Schweiz.',
        fr: 'Le for exclusif est Genève, Suisse.',
        it: 'Il foro esclusivo è Lugano, Svizzera.',
        en: 'The exclusive place of jurisdiction shall be Zurich, Switzerland.',
      }[language];

  sections.push({
    title: jurisdictionTitle[language],
    content: jurisdictionContent,
    comments: includeComments
      ? {
          de: 'Gerichtsstandsklausel nach Art. 17 ZPO. Prorogation zulässig bei vermögensrechtlichen Streitigkeiten.',
          fr: 'Clause de for selon art. 17 CPC. Prorogation admise pour les litiges patrimoniaux.',
          it: 'Clausola di foro secondo art. 17 CPC. Proroga ammessa per controversie patrimoniali.',
          en: 'Jurisdiction clause per Art. 17 CPC. Prorogation permitted in property law disputes.',
        }[language]
      : undefined,
  });

  return sections;
}

function getServiceAgreementSections(
  context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';
  const isTemplate = format === 'template';

  return [
    {
      title: { de: 'Gegenstand', fr: 'Objet', it: 'Oggetto', en: 'Subject Matter' }[language],
      content: isOutline
        ? '[Beschreibung der Leistungen]'
        : isTemplate
        ? 'Der Dienstleister erbringt folgende Leistungen: ___[Beschreibung]___'
        : {
            de: `Der Dienstleister erbringt die folgenden Leistungen gemäss den Vorgaben des Auftraggebers: ${context}`,
            fr: `Le prestataire fournit les services suivants conformément aux instructions du client: ${context}`,
            it: `Il fornitore presta i seguenti servizi secondo le istruzioni del cliente: ${context}`,
            en: `The service provider shall provide the following services in accordance with the client's instructions: ${context}`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 394 ff. OR Auftragsrecht', fr: 'Art. 394 ss CO Mandat', it: 'Art. 394 ss CO Mandato', en: 'Art. 394 ff. CO Agency law' }[language]
        : undefined,
    },
    {
      title: { de: 'Vergütung', fr: 'Rémunération', it: 'Compenso', en: 'Compensation' }[language],
      content: isOutline
        ? '[Vergütungsregelung]'
        : isTemplate
        ? 'Die Vergütung beträgt CHF ___[Betrag]___ pro ___[Zeiteinheit]___.'
        : {
            de: 'Die Vergütung erfolgt nach Aufwand gemäss den vereinbarten Stundensätzen oder als Pauschale.',
            fr: 'La rémunération est calculée selon le temps consacré aux tarifs convenus ou sous forme forfaitaire.',
            it: 'Il compenso è calcolato secondo il tempo impiegato alle tariffe concordate o in forma forfettaria.',
            en: 'Compensation shall be based on time spent at the agreed hourly rates or as a fixed fee.',
          }[language],
      comments: includeComments
        ? { de: 'Art. 394 Abs. 3 OR', fr: 'Art. 394 al. 3 CO', it: 'Art. 394 cpv. 3 CO', en: 'Art. 394(3) CO' }[language]
        : undefined,
    },
    {
      title: { de: 'Leistungserbringung', fr: 'Exécution des services', it: 'Esecuzione dei servizi', en: 'Performance of Services' }[language],
      content: isOutline
        ? '[Modalitäten der Leistungserbringung]'
        : {
            de: 'Die Leistungen werden sorgfältig und nach den Regeln der Kunst erbracht.',
            fr: 'Les services sont fournis avec soin et selon les règles de l\'art.',
            it: 'I servizi sono prestati con diligenza e secondo le regole dell\'arte.',
            en: 'Services shall be performed diligently and in accordance with professional standards.',
          }[language],
    },
    {
      title: { de: 'Kündigung', fr: 'Résiliation', it: 'Disdetta', en: 'Termination' }[language],
      content: isOutline
        ? '[Kündigungsregelung]'
        : isTemplate
        ? 'Der Vertrag kann mit einer Frist von ___[Frist]___ Tagen gekündigt werden.'
        : {
            de: 'Dieser Vertrag kann von jeder Partei mit einer Frist von 30 Tagen schriftlich gekündigt werden.',
            fr: 'Le présent contrat peut être résilié par chaque partie moyennant un préavis écrit de 30 jours.',
            it: 'Il presente contratto può essere disdetto da ciascuna parte con un preavviso scritto di 30 giorni.',
            en: 'This agreement may be terminated by either party upon 30 days\' written notice.',
          }[language],
      comments: includeComments
        ? { de: 'Art. 404 OR jederzeitige Kündigung', fr: 'Art. 404 CO résiliation en tout temps', it: 'Art. 404 CO disdetta in ogni tempo', en: 'Art. 404 CO termination at any time' }[language]
        : undefined,
    },
  ];
}

function getEmploymentContractSections(
  context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';
  const isTemplate = format === 'template';

  return [
    {
      title: { de: 'Tätigkeit', fr: 'Activité', it: 'Attività', en: 'Position' }[language],
      content: isOutline
        ? '[Stellenbeschreibung]'
        : isTemplate
        ? 'Der Arbeitnehmer wird als ___[Funktion]___ angestellt.'
        : {
            de: `Der Arbeitnehmer wird für folgende Tätigkeit eingestellt: ${context}`,
            fr: `L'employé est engagé pour l'activité suivante: ${context}`,
            it: `Il lavoratore è assunto per la seguente attività: ${context}`,
            en: `The employee is hired for the following position: ${context}`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 319 ff. OR Arbeitsvertrag', fr: 'Art. 319 ss CO Contrat de travail', it: 'Art. 319 ss CO Contratto di lavoro', en: 'Art. 319 ff. CO Employment contract' }[language]
        : undefined,
    },
    {
      title: { de: 'Lohn', fr: 'Salaire', it: 'Salario', en: 'Salary' }[language],
      content: isOutline
        ? '[Lohnregelung]'
        : isTemplate
        ? 'Der Bruttolohn beträgt CHF ___[Betrag]___ pro ___[Monat/Jahr]___.'
        : {
            de: 'Der Bruttolohn wird monatlich ausbezahlt. Die Auszahlung erfolgt spätestens am letzten Arbeitstag des Monats.',
            fr: 'Le salaire brut est versé mensuellement. Le paiement intervient au plus tard le dernier jour ouvrable du mois.',
            it: 'Il salario lordo è versato mensilmente. Il pagamento avviene al più tardi l\'ultimo giorno lavorativo del mese.',
            en: 'The gross salary is paid monthly. Payment is made no later than the last working day of the month.',
          }[language],
      comments: includeComments
        ? { de: 'Art. 322 ff. OR Entlöhnung', fr: 'Art. 322 ss CO Rémunération', it: 'Art. 322 ss CO Retribuzione', en: 'Art. 322 ff. CO Remuneration' }[language]
        : undefined,
    },
    {
      title: { de: 'Arbeitszeit', fr: 'Temps de travail', it: 'Orario di lavoro', en: 'Working Hours' }[language],
      content: isOutline
        ? '[Arbeitszeitregelung]'
        : isTemplate
        ? 'Die wöchentliche Arbeitszeit beträgt ___[Stunden]___ Stunden.'
        : {
            de: 'Die regelmässige wöchentliche Arbeitszeit beträgt 42 Stunden.',
            fr: 'La durée hebdomadaire de travail est de 42 heures.',
            it: 'L\'orario di lavoro settimanale è di 42 ore.',
            en: 'The regular weekly working hours are 42 hours.',
          }[language],
    },
    {
      title: { de: 'Ferien', fr: 'Vacances', it: 'Vacanze', en: 'Vacation' }[language],
      content: isOutline
        ? '[Ferienanspruch]'
        : {
            de: 'Der Ferienanspruch beträgt mindestens 4 Wochen pro Jahr (5 Wochen bis zum vollendeten 20. Altersjahr).',
            fr: 'Le droit aux vacances est d\'au moins 4 semaines par an (5 semaines jusqu\'à l\'âge de 20 ans révolus).',
            it: 'Il diritto alle vacanze è di almeno 4 settimane all\'anno (5 settimane fino al compimento dei 20 anni).',
            en: 'Vacation entitlement is at least 4 weeks per year (5 weeks until age 20).',
          }[language],
      comments: includeComments
        ? { de: 'Art. 329a OR Mindestferien', fr: 'Art. 329a CO Vacances minimales', it: 'Art. 329a CO Vacanze minime', en: 'Art. 329a CO Minimum vacation' }[language]
        : undefined,
    },
    {
      title: { de: 'Kündigung', fr: 'Résiliation', it: 'Disdetta', en: 'Termination' }[language],
      content: isOutline
        ? '[Kündigungsfristen]'
        : isTemplate
        ? 'Die Kündigungsfrist beträgt ___[Frist]___ auf Ende eines Monats.'
        : {
            de: 'Die Kündigungsfrist beträgt während der Probezeit 7 Tage, danach einen Monat auf Ende eines Monats.',
            fr: 'Le délai de congé est de 7 jours pendant la période d\'essai, puis d\'un mois pour la fin d\'un mois.',
            it: 'Il termine di disdetta è di 7 giorni durante il periodo di prova, poi di un mese per la fine di un mese.',
            en: 'The notice period is 7 days during the probationary period, thereafter one month to the end of a month.',
          }[language],
      comments: includeComments
        ? { de: 'Art. 335c OR Kündigungsfristen', fr: 'Art. 335c CO Délais de congé', it: 'Art. 335c CO Termini di disdetta', en: 'Art. 335c CO Notice periods' }[language]
        : undefined,
    },
  ];
}

function getNDASections(
  _context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';

  return [
    {
      title: { de: 'Vertrauliche Informationen', fr: 'Informations confidentielles', it: 'Informazioni riservate', en: 'Confidential Information' }[language],
      content: isOutline
        ? '[Definition vertraulicher Informationen]'
        : {
            de: 'Als vertrauliche Informationen gelten alle nicht öffentlich zugänglichen Informationen, die im Rahmen dieser Vereinbarung offengelegt werden.',
            fr: 'Sont considérées comme informations confidentielles toutes les informations non accessibles au public qui sont divulguées dans le cadre du présent accord.',
            it: 'Sono considerate informazioni riservate tutte le informazioni non accessibili al pubblico che vengono divulgate nell\'ambito del presente accordo.',
            en: 'Confidential information means all non-public information disclosed under this agreement.',
          }[language],
    },
    {
      title: { de: 'Geheimhaltungspflicht', fr: 'Obligation de confidentialité', it: 'Obbligo di riservatezza', en: 'Confidentiality Obligation' }[language],
      content: isOutline
        ? '[Geheimhaltungsverpflichtung]'
        : {
            de: 'Die empfangende Partei verpflichtet sich, die vertraulichen Informationen geheim zu halten und nicht an Dritte weiterzugeben.',
            fr: 'La partie réceptrice s\'engage à garder les informations confidentielles secrètes et à ne pas les divulguer à des tiers.',
            it: 'La parte ricevente si impegna a mantenere segrete le informazioni riservate e a non divulgarle a terzi.',
            en: 'The receiving party undertakes to keep the confidential information secret and not to disclose it to third parties.',
          }[language],
      comments: includeComments
        ? { de: 'Vertragsstrafe bei Verletzung empfohlen', fr: 'Pénalité contractuelle en cas de violation recommandée', it: 'Penale contrattuale in caso di violazione raccomandata', en: 'Contractual penalty for breach recommended' }[language]
        : undefined,
    },
    {
      title: { de: 'Dauer', fr: 'Durée', it: 'Durata', en: 'Duration' }[language],
      content: isOutline
        ? '[Dauer der Geheimhaltungspflicht]'
        : {
            de: 'Die Geheimhaltungspflicht gilt für die Dauer von fünf Jahren nach Beendigung dieser Vereinbarung.',
            fr: 'L\'obligation de confidentialité est valable pour une durée de cinq ans après la fin du présent accord.',
            it: 'L\'obbligo di riservatezza è valido per una durata di cinque anni dopo la cessazione del presente accordo.',
            en: 'The confidentiality obligation shall remain in effect for five years after termination of this agreement.',
          }[language],
    },
    {
      title: { de: 'Ausnahmen', fr: 'Exceptions', it: 'Eccezioni', en: 'Exceptions' }[language],
      content: {
        de: 'Die Geheimhaltungspflicht gilt nicht für Informationen, die öffentlich bekannt sind oder werden, oder die der empfangenden Partei bereits bekannt waren.',
        fr: 'L\'obligation de confidentialité ne s\'applique pas aux informations qui sont ou deviennent publiques, ou qui étaient déjà connues de la partie réceptrice.',
        it: 'L\'obbligo di riservatezza non si applica alle informazioni che sono o diventano pubbliche, o che erano già note alla parte ricevente.',
        en: 'The confidentiality obligation does not apply to information that is or becomes public, or that was already known to the receiving party.',
      }[language],
    },
  ];
}

function getShareholdersAgreementSections(
  _context: string,
  parties: LegalDraftInput['parties'],
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';

  return [
    {
      title: { de: 'Gesellschaft', fr: 'Société', it: 'Società', en: 'Company' }[language],
      content: isOutline
        ? '[Angaben zur Gesellschaft]'
        : {
            de: 'Die Parteien sind Aktionäre der Gesellschaft und regeln mit dieser Vereinbarung ihre Rechte und Pflichten.',
            fr: 'Les parties sont actionnaires de la société et règlent par le présent accord leurs droits et obligations.',
            it: 'Le parti sono azionisti della società e regolano con il presente accordo i loro diritti e obblighi.',
            en: 'The parties are shareholders of the company and regulate their rights and obligations through this agreement.',
          }[language],
    },
    {
      title: { de: 'Stimmrechte und Beschlussfassung', fr: 'Droits de vote et prise de décisions', it: 'Diritti di voto e processo decisionale', en: 'Voting Rights and Decision Making' }[language],
      content: isOutline
        ? '[Stimmrechtsregelung]'
        : {
            de: `Die Beschlussfassung erfolgt nach den gesetzlichen Bestimmungen und den Statuten. Bei ${parties.length} Aktionären sind besondere Mehrheitserfordernisse zu beachten.`,
            fr: `Les décisions sont prises conformément aux dispositions légales et aux statuts. Avec ${parties.length} actionnaires, des règles de majorité particulières doivent être respectées.`,
            it: `Le decisioni sono prese conformemente alle disposizioni legali e agli statuti. Con ${parties.length} azionisti, devono essere rispettate regole di maggioranza particolari.`,
            en: `Decisions shall be made in accordance with statutory provisions and the articles of association. With ${parties.length} shareholders, special majority requirements apply.`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 703 ff. OR Generalversammlung', fr: 'Art. 703 ss CO Assemblée générale', it: 'Art. 703 ss CO Assemblea generale', en: 'Art. 703 ff. CO General meeting' }[language]
        : undefined,
    },
    {
      title: { de: 'Übertragungsbeschränkungen', fr: 'Restrictions de transfert', it: 'Restrizioni al trasferimento', en: 'Transfer Restrictions' }[language],
      content: {
        de: 'Die Übertragung von Aktien bedarf der Zustimmung der anderen Aktionäre. Es besteht ein Vorkaufsrecht.',
        fr: 'Le transfert d\'actions nécessite l\'accord des autres actionnaires. Un droit de préemption existe.',
        it: 'Il trasferimento di azioni richiede il consenso degli altri azionisti. Esiste un diritto di prelazione.',
        en: 'Transfer of shares requires consent of other shareholders. A right of first refusal exists.',
      }[language],
    },
    {
      title: { de: 'Wettbewerbsverbot', fr: 'Clause de non-concurrence', it: 'Divieto di concorrenza', en: 'Non-Compete' }[language],
      content: {
        de: 'Die Aktionäre verpflichten sich, während der Dauer ihrer Beteiligung keine konkurrierende Tätigkeit auszuüben.',
        fr: 'Les actionnaires s\'engagent à ne pas exercer d\'activité concurrente pendant la durée de leur participation.',
        it: 'Gli azionisti si impegnano a non esercitare attività concorrenti durante la durata della loro partecipazione.',
        en: 'Shareholders undertake not to engage in competing activities during their participation.',
      }[language],
    },
  ];
}

function getLoanAgreementSections(
  context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';
  const isTemplate = format === 'template';

  return [
    {
      title: { de: 'Darlehenssumme', fr: 'Montant du prêt', it: 'Importo del mutuo', en: 'Loan Amount' }[language],
      content: isOutline
        ? '[Darlehensbetrag]'
        : isTemplate
        ? 'Der Darlehensgeber gewährt dem Darlehensnehmer ein Darlehen in Höhe von CHF ___[Betrag]___.'
        : {
            de: `Der Darlehensgeber gewährt dem Darlehensnehmer ein Darlehen gemäss folgenden Bedingungen: ${context}`,
            fr: `Le prêteur accorde à l'emprunteur un prêt selon les conditions suivantes: ${context}`,
            it: `Il mutuante concede al mutuatario un mutuo alle seguenti condizioni: ${context}`,
            en: `The lender grants the borrower a loan under the following conditions: ${context}`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 312 ff. OR Darlehen', fr: 'Art. 312 ss CO Prêt', it: 'Art. 312 ss CO Mutuo', en: 'Art. 312 ff. CO Loan' }[language]
        : undefined,
    },
    {
      title: { de: 'Zinsen', fr: 'Intérêts', it: 'Interessi', en: 'Interest' }[language],
      content: isOutline
        ? '[Zinsregelung]'
        : isTemplate
        ? 'Das Darlehen ist mit ___[Zinssatz]___% pro Jahr zu verzinsen.'
        : {
            de: 'Das Darlehen ist zum vereinbarten Zinssatz zu verzinsen. Die Zinsen sind jährlich nachträglich fällig.',
            fr: 'Le prêt porte intérêt au taux convenu. Les intérêts sont exigibles annuellement à terme échu.',
            it: 'Il mutuo è fruttifero al tasso convenuto. Gli interessi sono esigibili annualmente a termine scaduto.',
            en: 'The loan bears interest at the agreed rate. Interest is payable annually in arrears.',
          }[language],
    },
    {
      title: { de: 'Rückzahlung', fr: 'Remboursement', it: 'Rimborso', en: 'Repayment' }[language],
      content: isOutline
        ? '[Rückzahlungsmodalitäten]'
        : {
            de: 'Die Rückzahlung erfolgt gemäss dem vereinbarten Tilgungsplan oder auf Kündigung.',
            fr: 'Le remboursement s\'effectue selon le plan d\'amortissement convenu ou sur dénonciation.',
            it: 'Il rimborso avviene secondo il piano di ammortamento convenuto o su denuncia.',
            en: 'Repayment shall be made according to the agreed amortization schedule or upon notice.',
          }[language],
    },
  ];
}

function getLeaseAgreementSections(
  context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';
  const isTemplate = format === 'template';

  return [
    {
      title: { de: 'Mietobjekt', fr: 'Objet loué', it: 'Oggetto locato', en: 'Leased Property' }[language],
      content: isOutline
        ? '[Beschreibung des Mietobjekts]'
        : isTemplate
        ? 'Der Vermieter vermietet dem Mieter das folgende Objekt: ___[Adresse/Beschreibung]___'
        : {
            de: `Der Vermieter vermietet dem Mieter das folgende Objekt: ${context}`,
            fr: `Le bailleur loue au locataire l'objet suivant: ${context}`,
            it: `Il locatore loca al conduttore il seguente oggetto: ${context}`,
            en: `The landlord leases to the tenant the following property: ${context}`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 253 ff. OR Mietvertrag', fr: 'Art. 253 ss CO Contrat de bail', it: 'Art. 253 ss CO Contratto di locazione', en: 'Art. 253 ff. CO Lease agreement' }[language]
        : undefined,
    },
    {
      title: { de: 'Mietzins', fr: 'Loyer', it: 'Pigione', en: 'Rent' }[language],
      content: isOutline
        ? '[Mietzinsregelung]'
        : isTemplate
        ? 'Der monatliche Mietzins beträgt CHF ___[Betrag]___ (exkl./inkl. Nebenkosten).'
        : {
            de: 'Der monatliche Mietzins ist im Voraus auf den Ersten eines jeden Monats zu bezahlen.',
            fr: 'Le loyer mensuel est payable d\'avance le premier de chaque mois.',
            it: 'La pigione mensile è pagabile in anticipo il primo di ogni mese.',
            en: 'Monthly rent is payable in advance on the first day of each month.',
          }[language],
    },
    {
      title: { de: 'Mietdauer', fr: 'Durée du bail', it: 'Durata della locazione', en: 'Lease Term' }[language],
      content: {
        de: 'Das Mietverhältnis beginnt am vereinbarten Datum und läuft auf unbestimmte Zeit.',
        fr: 'Le bail commence à la date convenue et est conclu pour une durée indéterminée.',
        it: 'La locazione inizia alla data convenuta ed è stipulata per una durata indeterminata.',
        en: 'The lease commences on the agreed date and runs for an indefinite period.',
      }[language],
    },
  ];
}

// ============================================================================
// Litigation Section Generators
// ============================================================================

function generateLitigationSections(
  docType: DocumentType,
  context: string,
  parties: LegalDraftInput['parties'],
  jurisdiction: 'federal' | 'cantonal',
  canton: Canton | undefined,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const courtRef = getCourtReference(jurisdiction, canton, language);

  switch (docType) {
    case 'klageschrift':
      return getKlageschriftSections(context, parties, courtRef, language, format, includeComments);
    case 'klageantwort':
      return getKlageantwortSections(context, parties, language, format, includeComments);
    case 'berufung':
      return getBerufungSections(context, parties, courtRef, language, format, includeComments);
    case 'beschwerde':
      return getBeschwerdeSections(context, language, format, includeComments);
    case 'replik':
      return getReplikSections(context, language, format, includeComments);
    case 'duplik':
      return getDuplikSections(context, language, format, includeComments);
    default:
      return [];
  }
}

function getCourtReference(
  jurisdiction: 'federal' | 'cantonal',
  canton: Canton | undefined,
  language: Language
): string {
  if (jurisdiction === 'federal') {
    return {
      de: 'Bundesgericht',
      fr: 'Tribunal fédéral',
      it: 'Tribunale federale',
      en: 'Federal Supreme Court',
    }[language];
  }

  const cantonCourts: Record<Canton, Record<Language, string>> = {
    ZH: {
      de: 'Bezirksgericht Zürich',
      fr: 'Tribunal de district de Zurich',
      it: 'Tribunale distrettuale di Zurigo',
      en: 'District Court of Zurich',
    },
    BE: {
      de: 'Regionalgericht Bern-Mittelland',
      fr: 'Tribunal régional Berne-Mittelland',
      it: 'Tribunale regionale Berna-Mittelland',
      en: 'Regional Court Bern-Mittelland',
    },
    GE: {
      de: 'Tribunal de première instance de Genève',
      fr: 'Tribunal de première instance de Genève',
      it: 'Tribunale di prima istanza di Ginevra',
      en: 'Court of First Instance of Geneva',
    },
    BS: {
      de: 'Zivilgericht Basel-Stadt',
      fr: 'Tribunal civil de Bâle-Ville',
      it: 'Tribunale civile di Basilea Città',
      en: 'Civil Court of Basel-Stadt',
    },
    VD: {
      de: 'Tribunal civil de l\'arrondissement de Lausanne',
      fr: 'Tribunal civil de l\'arrondissement de Lausanne',
      it: 'Tribunale civile del distretto di Losanna',
      en: 'Civil Court of the District of Lausanne',
    },
    TI: {
      de: 'Pretura del Distretto di Lugano',
      fr: 'Pretura del Distretto di Lugano',
      it: 'Pretura del Distretto di Lugano',
      en: 'Magistrate Court of Lugano District',
    },
  };

  return canton ? cantonCourts[canton][language] : {
    de: 'zuständiges Gericht',
    fr: 'tribunal compétent',
    it: 'tribunale competente',
    en: 'competent court',
  }[language];
}

function getKlageschriftSections(
  context: string,
  parties: LegalDraftInput['parties'],
  courtRef: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';

  return [
    {
      title: { de: 'Rechtsbegehren', fr: 'Conclusions', it: 'Conclusioni', en: 'Claims' }[language],
      content: isOutline
        ? '[Anträge an das Gericht]'
        : {
            de: `An das ${courtRef}:\n\n1. Die Beklagte sei zu verpflichten, der Klägerin [Betrag] CHF zu bezahlen.\n2. Unter Kosten- und Entschädigungsfolgen zu Lasten der Beklagten.`,
            fr: `Au ${courtRef}:\n\n1. Condamner la défenderesse à payer à la demanderesse [montant] CHF.\n2. Les frais et dépens étant mis à la charge de la défenderesse.`,
            it: `Al ${courtRef}:\n\n1. La convenuta sia condannata a pagare all'attore [importo] CHF.\n2. Con spese e ripetibili a carico della convenuta.`,
            en: `To the ${courtRef}:\n\n1. The defendant shall be ordered to pay the plaintiff [amount] CHF.\n2. Costs and expenses to be borne by the defendant.`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 221 ZPO Klageschrift', fr: 'Art. 221 CPC Demande', it: 'Art. 221 CPC Petizione', en: 'Art. 221 CPC Statement of claim' }[language]
        : undefined,
    },
    {
      title: { de: 'Sachverhalt', fr: 'Faits', it: 'Fatti', en: 'Facts' }[language],
      content: isOutline
        ? '[Sachverhaltsdarstellung]'
        : {
            de: `I. Parteien\n\nDie Klägerin ${parties[0]?.name || '[Klägerin]'} und die Beklagte ${parties[1]?.name || '[Beklagte]'} stehen in folgendem Rechtsverhältnis:\n\nII. Sachverhalt\n\n${context}`,
            fr: `I. Parties\n\nLa demanderesse ${parties[0]?.name || '[Demanderesse]'} et la défenderesse ${parties[1]?.name || '[Défenderesse]'} sont liées par la relation juridique suivante:\n\nII. Faits\n\n${context}`,
            it: `I. Parti\n\nL'attore ${parties[0]?.name || '[Attore]'} e la convenuta ${parties[1]?.name || '[Convenuta]'} sono legati dal seguente rapporto giuridico:\n\nII. Fatti\n\n${context}`,
            en: `I. Parties\n\nThe plaintiff ${parties[0]?.name || '[Plaintiff]'} and the defendant ${parties[1]?.name || '[Defendant]'} are in the following legal relationship:\n\nII. Facts\n\n${context}`,
          }[language],
    },
    {
      title: { de: 'Rechtliche Begründung', fr: 'Motivation en droit', it: 'Motivazione giuridica', en: 'Legal Arguments' }[language],
      content: {
        de: 'Die Klage stützt sich auf die folgenden rechtlichen Grundlagen:\n\n- Art. 97 OR (Vertragsverletzung)\n- Art. 107 OR (Verzug)',
        fr: 'La demande se fonde sur les bases juridiques suivantes:\n\n- Art. 97 CO (Violation du contrat)\n- Art. 107 CO (Demeure)',
        it: 'La domanda si fonda sulle seguenti basi giuridiche:\n\n- Art. 97 CO (Violazione del contratto)\n- Art. 107 CO (Mora)',
        en: 'The claim is based on the following legal grounds:\n\n- Art. 97 CO (Breach of contract)\n- Art. 107 CO (Default)',
      }[language],
      comments: includeComments
        ? { de: 'Substantiierungspflicht beachten', fr: 'Respecter l\'obligation de motivation', it: 'Rispettare l\'obbligo di motivazione', en: 'Observe duty to substantiate' }[language]
        : undefined,
    },
    {
      title: { de: 'Beweismittel', fr: 'Moyens de preuve', it: 'Mezzi di prova', en: 'Evidence' }[language],
      content: {
        de: 'Zum Beweis werden angeboten:\n\n- Beilage 1: Vertrag vom [Datum]\n- Beilage 2: Korrespondenz\n- Parteibefragung',
        fr: 'En preuve:\n\n- Pièce 1: Contrat du [date]\n- Pièce 2: Correspondance\n- Interrogatoire des parties',
        it: 'A prova:\n\n- Allegato 1: Contratto del [data]\n- Allegato 2: Corrispondenza\n- Interrogatorio delle parti',
        en: 'As evidence:\n\n- Exhibit 1: Contract dated [date]\n- Exhibit 2: Correspondence\n- Party examination',
      }[language],
    },
  ];
}

function getKlageantwortSections(
  context: string,
  _parties: LegalDraftInput['parties'],
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';

  return [
    {
      title: { de: 'Anträge', fr: 'Conclusions', it: 'Conclusioni', en: 'Motions' }[language],
      content: isOutline
        ? '[Abweisungsanträge]'
        : {
            de: '1. Die Klage sei vollumfänglich abzuweisen.\n2. Unter Kosten- und Entschädigungsfolgen zu Lasten der Klägerin.',
            fr: '1. Rejeter intégralement la demande.\n2. Les frais et dépens étant mis à la charge de la demanderesse.',
            it: '1. Respingere integralmente la domanda.\n2. Con spese e ripetibili a carico dell\'attore.',
            en: '1. The claim shall be dismissed in its entirety.\n2. Costs and expenses to be borne by the plaintiff.',
          }[language],
      comments: includeComments
        ? { de: 'Art. 222 ZPO Klageantwort', fr: 'Art. 222 CPC Réponse', it: 'Art. 222 CPC Risposta', en: 'Art. 222 CPC Answer' }[language]
        : undefined,
    },
    {
      title: { de: 'Bestrittener Sachverhalt', fr: 'Faits contestés', it: 'Fatti contestati', en: 'Disputed Facts' }[language],
      content: {
        de: `Der von der Klägerin dargestellte Sachverhalt wird wie folgt bestritten:\n\n${context}`,
        fr: `Les faits présentés par la demanderesse sont contestés comme suit:\n\n${context}`,
        it: `I fatti presentati dall'attore sono contestati come segue:\n\n${context}`,
        en: `The facts presented by the plaintiff are disputed as follows:\n\n${context}`,
      }[language],
    },
    {
      title: { de: 'Rechtliche Einwände', fr: 'Objections juridiques', it: 'Eccezioni giuridiche', en: 'Legal Objections' }[language],
      content: {
        de: 'Aus rechtlicher Sicht ist die Klage aus folgenden Gründen abzuweisen:',
        fr: 'D\'un point de vue juridique, la demande doit être rejetée pour les raisons suivantes:',
        it: 'Dal punto di vista giuridico, la domanda deve essere respinta per i seguenti motivi:',
        en: 'From a legal perspective, the claim must be dismissed for the following reasons:',
      }[language],
    },
  ];
}

function getBerufungSections(
  context: string,
  _parties: LegalDraftInput['parties'],
  courtRef: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';

  return [
    {
      title: { de: 'Berufungsanträge', fr: 'Conclusions d\'appel', it: 'Conclusioni d\'appello', en: 'Appeal Claims' }[language],
      content: isOutline
        ? '[Berufungsbegehren]'
        : {
            de: `An das ${courtRef}:\n\n1. Das Urteil der Vorinstanz sei aufzuheben.\n2. Die Klage sei gutzuheissen (eventualiter: Die Sache sei zur Neubeurteilung an die Vorinstanz zurückzuweisen).`,
            fr: `Au ${courtRef}:\n\n1. Annuler le jugement de première instance.\n2. Admettre la demande (subsidiairement: Renvoyer la cause à l\'instance précédente pour nouvelle décision).`,
            it: `Al ${courtRef}:\n\n1. Annullare la sentenza di prima istanza.\n2. Accogliere la domanda (in subordine: Rinviare la causa all\'istanza precedente per nuova decisione).`,
            en: `To the ${courtRef}:\n\n1. The judgment of the lower court shall be set aside.\n2. The claim shall be granted (alternatively: The case shall be remanded to the lower court for new decision).`,
          }[language],
      comments: includeComments
        ? { de: 'Art. 308 ff. ZPO Berufung', fr: 'Art. 308 ss CPC Appel', it: 'Art. 308 ss CPC Appello', en: 'Art. 308 ff. CPC Appeal' }[language]
        : undefined,
    },
    {
      title: { de: 'Angefochtenes Urteil', fr: 'Jugement attaqué', it: 'Sentenza impugnata', en: 'Contested Judgment' }[language],
      content: {
        de: `Angefochten wird das Urteil vom [Datum], mit welchem die Vorinstanz [Entscheid].\n\n${context}`,
        fr: `Est attaqué le jugement du [date], par lequel l\'instance précédente [décision].\n\n${context}`,
        it: `È impugnata la sentenza del [data], con cui l\'istanza precedente [decisione].\n\n${context}`,
        en: `The judgment of [date] is contested, by which the lower court [decision].\n\n${context}`,
      }[language],
    },
    {
      title: { de: 'Berufungsgründe', fr: 'Motifs d\'appel', it: 'Motivi d\'appello', en: 'Grounds for Appeal' }[language],
      content: {
        de: 'Das angefochtene Urteil beruht auf folgenden Rechtsfehlern:\n\n1. Unrichtige Rechtsanwendung\n2. Offensichtlich unrichtige Sachverhaltsfeststellung',
        fr: 'Le jugement attaqué est entaché des vices de droit suivants:\n\n1. Application erronée du droit\n2. Constatation manifestement inexacte des faits',
        it: 'La sentenza impugnata è viziata dai seguenti errori di diritto:\n\n1. Errata applicazione del diritto\n2. Accertamento manifestamente inesatto dei fatti',
        en: 'The contested judgment is based on the following legal errors:\n\n1. Incorrect application of law\n2. Manifestly incorrect finding of facts',
      }[language],
    },
  ];
}

function getBeschwerdeSections(
  context: string,
  language: Language,
  _format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  return [
    {
      title: { de: 'Beschwerdebegehren', fr: 'Conclusions du recours', it: 'Conclusioni del ricorso', en: 'Complaint Claims' }[language],
      content: {
        de: `1. Der angefochtene Entscheid sei aufzuheben.\n2. Die Sache sei zur Neubeurteilung zurückzuweisen.\n\n${context}`,
        fr: `1. Annuler la décision attaquée.\n2. Renvoyer la cause pour nouvelle décision.\n\n${context}`,
        it: `1. Annullare la decisione impugnata.\n2. Rinviare la causa per nuova decisione.\n\n${context}`,
        en: `1. The contested decision shall be set aside.\n2. The case shall be remanded for new decision.\n\n${context}`,
      }[language],
      comments: includeComments
        ? { de: 'Art. 319 ff. ZPO Beschwerde', fr: 'Art. 319 ss CPC Recours', it: 'Art. 319 ss CPC Reclamo', en: 'Art. 319 ff. CPC Complaint' }[language]
        : undefined,
    },
  ];
}

function getReplikSections(
  context: string,
  language: Language,
  _format: 'full' | 'outline' | 'template',
  _includeComments: boolean
): DocumentSection[] {
  return [
    {
      title: { de: 'Replik', fr: 'Réplique', it: 'Replica', en: 'Reply' }[language],
      content: {
        de: `In Erwiderung auf die Klageantwort hält die Klägerin an ihren Rechtsbegehren fest und führt ergänzend aus:\n\n${context}`,
        fr: `En réponse à la réponse de la défenderesse, la demanderesse maintient ses conclusions et expose en complément:\n\n${context}`,
        it: `In risposta alla risposta della convenuta, l'attore mantiene le sue conclusioni e aggiunge:\n\n${context}`,
        en: `In response to the statement of defense, the plaintiff maintains its claims and adds:\n\n${context}`,
      }[language],
    },
  ];
}

function getDuplikSections(
  context: string,
  language: Language,
  _format: 'full' | 'outline' | 'template',
  _includeComments: boolean
): DocumentSection[] {
  return [
    {
      title: { de: 'Duplik', fr: 'Duplique', it: 'Duplica', en: 'Rejoinder' }[language],
      content: {
        de: `In Erwiderung auf die Replik hält die Beklagte an ihren Anträgen fest:\n\n${context}`,
        fr: `En réponse à la réplique, la défenderesse maintient ses conclusions:\n\n${context}`,
        it: `In risposta alla replica, la convenuta mantiene le sue conclusioni:\n\n${context}`,
        en: `In response to the reply, the defendant maintains its motions:\n\n${context}`,
      }[language],
    },
  ];
}

// ============================================================================
// Opinion Section Generators
// ============================================================================

function generateOpinionSections(
  docType: DocumentType,
  context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  switch (docType) {
    case 'rechtsgutachten':
      return getRechtsgutachtenSections(context, language, format, includeComments);
    case 'memorandum':
      return getMemorandumSections(context, language, format, includeComments);
    case 'legal_brief':
      return getLegalBriefSections(context, language, format, includeComments);
    default:
      return [];
  }
}

function getRechtsgutachtenSections(
  context: string,
  language: Language,
  format: 'full' | 'outline' | 'template',
  includeComments: boolean
): DocumentSection[] {
  const isOutline = format === 'outline';

  return [
    {
      title: { de: 'Fragestellung', fr: 'Question posée', it: 'Questione', en: 'Question Presented' }[language],
      content: isOutline
        ? '[Zu beantwortende Rechtsfrage]'
        : {
            de: `Dem Unterzeichneten wurde die folgende Frage zur rechtlichen Beurteilung unterbreitet:\n\n${context}`,
            fr: `La question suivante a été soumise au soussigné pour avis juridique:\n\n${context}`,
            it: `La seguente questione è stata sottoposta al sottoscritto per parere legale:\n\n${context}`,
            en: `The following question has been submitted to the undersigned for legal opinion:\n\n${context}`,
          }[language],
    },
    {
      title: { de: 'Kurze Antwort', fr: 'Réponse brève', it: 'Risposta breve', en: 'Brief Answer' }[language],
      content: {
        de: 'Nach eingehender Prüfung der Sach- und Rechtslage gelangt der Unterzeichnete zu folgendem Ergebnis:',
        fr: 'Après examen approfondi des faits et du droit, le soussigné parvient à la conclusion suivante:',
        it: 'Dopo un esame approfondito dei fatti e del diritto, il sottoscritto giunge alla seguente conclusione:',
        en: 'After thorough examination of the facts and law, the undersigned reaches the following conclusion:',
      }[language],
    },
    {
      title: { de: 'Sachverhalt', fr: 'Faits', it: 'Fatti', en: 'Statement of Facts' }[language],
      content: {
        de: 'Der Beurteilung liegt folgender Sachverhalt zugrunde:',
        fr: 'L\'avis se fonde sur les faits suivants:',
        it: 'Il parere si basa sui seguenti fatti:',
        en: 'The opinion is based on the following facts:',
      }[language],
    },
    {
      title: { de: 'Rechtliche Würdigung', fr: 'Appréciation juridique', it: 'Valutazione giuridica', en: 'Legal Analysis' }[language],
      content: {
        de: 'Die rechtliche Würdigung des Sachverhalts ergibt Folgendes:',
        fr: 'L\'appréciation juridique des faits conduit aux conclusions suivantes:',
        it: 'La valutazione giuridica dei fatti porta alle seguenti conclusioni:',
        en: 'The legal analysis of the facts leads to the following conclusions:',
      }[language],
      comments: includeComments
        ? { de: 'Gutachtensstil: Frage - Regel - Anwendung - Ergebnis', fr: 'Style d\'avis: Question - Règle - Application - Résultat', it: 'Stile del parere: Questione - Regola - Applicazione - Risultato', en: 'Opinion style: Issue - Rule - Application - Conclusion' }[language]
        : undefined,
    },
    {
      title: { de: 'Ergebnis', fr: 'Conclusion', it: 'Conclusione', en: 'Conclusion' }[language],
      content: {
        de: 'Zusammenfassend ist festzuhalten:',
        fr: 'En résumé, il convient de retenir:',
        it: 'In sintesi, si deve ritenere:',
        en: 'In summary, it should be noted:',
      }[language],
    },
  ];
}

function getMemorandumSections(
  context: string,
  language: Language,
  _format: 'full' | 'outline' | 'template',
  _includeComments: boolean
): DocumentSection[] {
  return [
    {
      title: { de: 'Zusammenfassung', fr: 'Résumé', it: 'Riassunto', en: 'Executive Summary' }[language],
      content: {
        de: `Dieses Memorandum befasst sich mit der folgenden Thematik: ${context}`,
        fr: `Ce mémorandum traite de la thématique suivante: ${context}`,
        it: `Questo memorandum tratta la seguente tematica: ${context}`,
        en: `This memorandum addresses the following topic: ${context}`,
      }[language],
    },
    {
      title: { de: 'Hintergrund', fr: 'Contexte', it: 'Contesto', en: 'Background' }[language],
      content: {
        de: 'Zum besseren Verständnis wird zunächst der relevante Kontext dargestellt.',
        fr: 'Pour une meilleure compréhension, le contexte pertinent est d\'abord présenté.',
        it: 'Per una migliore comprensione, viene prima presentato il contesto rilevante.',
        en: 'For better understanding, the relevant context is first presented.',
      }[language],
    },
    {
      title: { de: 'Analyse', fr: 'Analyse', it: 'Analisi', en: 'Analysis' }[language],
      content: {
        de: 'Die rechtliche Analyse führt zu folgenden Erkenntnissen:',
        fr: 'L\'analyse juridique conduit aux conclusions suivantes:',
        it: 'L\'analisi giuridica porta alle seguenti conclusioni:',
        en: 'The legal analysis leads to the following findings:',
      }[language],
    },
    {
      title: { de: 'Empfehlungen', fr: 'Recommandations', it: 'Raccomandazioni', en: 'Recommendations' }[language],
      content: {
        de: 'Basierend auf der Analyse werden folgende Massnahmen empfohlen:',
        fr: 'Sur la base de l\'analyse, les mesures suivantes sont recommandées:',
        it: 'Sulla base dell\'analisi, si raccomandano le seguenti misure:',
        en: 'Based on the analysis, the following measures are recommended:',
      }[language],
    },
  ];
}

function getLegalBriefSections(
  context: string,
  language: Language,
  _format: 'full' | 'outline' | 'template',
  _includeComments: boolean
): DocumentSection[] {
  return [
    {
      title: { de: 'Einleitung', fr: 'Introduction', it: 'Introduzione', en: 'Introduction' }[language],
      content: {
        de: `Diese Stellungnahme behandelt: ${context}`,
        fr: `Cet avis traite de: ${context}`,
        it: `Questa nota tratta: ${context}`,
        en: `This brief addresses: ${context}`,
      }[language],
    },
    {
      title: { de: 'Rechtslage', fr: 'Situation juridique', it: 'Situazione giuridica', en: 'Legal Situation' }[language],
      content: {
        de: 'Die massgeblichen Rechtsgrundlagen sind:',
        fr: 'Les bases juridiques pertinentes sont:',
        it: 'Le basi giuridiche rilevanti sono:',
        en: 'The relevant legal bases are:',
      }[language],
    },
    {
      title: { de: 'Schlussfolgerung', fr: 'Conclusion', it: 'Conclusione', en: 'Conclusion' }[language],
      content: {
        de: 'Abschliessend ist festzuhalten:',
        fr: 'En conclusion, il convient de retenir:',
        it: 'In conclusione, si deve ritenere:',
        en: 'In conclusion, it should be noted:',
      }[language],
    },
  ];
}

// ============================================================================
// Signature and Warning Generators
// ============================================================================

function generateSignatures(
  parties: LegalDraftInput['parties'],
  language: Language
): LegalDraftOutput['signatures'] {
  return parties.map((party) => ({
    party: party.name,
    signatureLine: {
      de: '_____________________',
      fr: '_____________________',
      it: '_____________________',
      en: '_____________________',
    }[language],
    dateLine: {
      de: 'Ort, Datum: _____________________',
      fr: 'Lieu, date: _____________________',
      it: 'Luogo, data: _____________________',
      en: 'Place, Date: _____________________',
    }[language],
  }));
}

function generateWarnings(
  docType: DocumentType,
  language: Language
): string[] | undefined {
  const warnings: string[] = [];

  // Always add professional review warning
  warnings.push({
    de: 'HINWEIS: Dieses Dokument wurde automatisch generiert und muss von einem qualifizierten Rechtsanwalt überprüft werden.',
    fr: 'AVERTISSEMENT: Ce document a été généré automatiquement et doit être révisé par un avocat qualifié.',
    it: 'AVVERTENZA: Questo documento è stato generato automaticamente e deve essere revisionato da un avvocato qualificato.',
    en: 'NOTICE: This document was automatically generated and must be reviewed by a qualified lawyer.',
  }[language]);

  // Additional warnings for litigation documents
  if (isLitigationType(docType)) {
    warnings.push({
      de: 'Fristen und Formvorschriften sind zwingend zu beachten (ZPO).',
      fr: 'Les délais et exigences formelles doivent impérativement être respectés (CPC).',
      it: 'I termini e i requisiti formali devono essere imperativamente rispettati (CPC).',
      en: 'Deadlines and formal requirements must be strictly observed (CPC).',
    }[language]);
  }

  return warnings.length > 0 ? warnings : undefined;
}
