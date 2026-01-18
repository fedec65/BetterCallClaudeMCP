import type { LegalDraftInput, LegalDraftOutput, Language } from '../types/index.js';

/**
 * Document templates and boilerplate
 */
const DOCUMENT_TEMPLATES: Record<string, { sections: string[]; boilerplate: Record<Language, string[]> }> = {
  contract: {
    sections: ['Parties', 'Recitals', 'Definitions', 'Main Obligations', 'Payment Terms', 'Duration', 'Termination', 'Liability', 'Dispute Resolution', 'Final Provisions'],
    boilerplate: {
      de: [
        'Dieser Vertrag untersteht schweizerischem Recht.',
        'Gerichtsstand ist [Ort], Schweiz.',
        'Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.',
      ],
      fr: [
        'Le présent contrat est soumis au droit suisse.',
        'Le for juridique est [Lieu], Suisse.',
        'Toute modification du présent contrat doit être faite par écrit.',
      ],
      it: [
        'Il presente contratto è soggetto al diritto svizzero.',
        'Il foro competente è [Luogo], Svizzera.',
        'Le modifiche al presente contratto devono essere effettuate per iscritto.',
      ],
      en: [
        'This contract is governed by Swiss law.',
        'The place of jurisdiction is [Location], Switzerland.',
        'Any amendments to this contract must be made in writing.',
      ],
    },
  },
  brief: {
    sections: ['Introduction', 'Facts', 'Legal Questions', 'Arguments', 'Evidence', 'Conclusion', 'Requests'],
    boilerplate: {
      de: ['Mit vorzüglicher Hochachtung'],
      fr: ['Veuillez agréer, Madame, Monsieur, l\'expression de notre haute considération.'],
      it: ['Con i migliori saluti'],
      en: ['Respectfully submitted'],
    },
  },
  motion: {
    sections: ['Petitioner Information', 'Request', 'Facts', 'Legal Basis', 'Conclusion'],
    boilerplate: {
      de: ['Antrag auf [Massnahme] gemäss Art. [X] ZPO'],
      fr: ['Requête en [mesure] selon l\'art. [X] CPC'],
      it: ['Istanza di [misura] ai sensi dell\'art. [X] CPC'],
      en: ['Motion for [measure] pursuant to Art. [X] CPC'],
    },
  },
  opinion: {
    sections: ['Executive Summary', 'Question Presented', 'Facts', 'Analysis', 'Conclusion', 'Recommendations'],
    boilerplate: {
      de: ['Dieses Gutachten wurde nach bestem Wissen und Gewissen erstellt.'],
      fr: ['Le présent avis a été rédigé en toute conscience.'],
      it: ['Il presente parere è stato redatto in scienza e coscienza.'],
      en: ['This opinion has been prepared to the best of our knowledge.'],
    },
  },
  memorandum: {
    sections: ['To', 'From', 'Date', 'Re', 'Summary', 'Analysis', 'Conclusion'],
    boilerplate: {
      de: ['Vertraulich - Anwaltsgeheimnis'],
      fr: ['Confidentiel - Secret professionnel'],
      it: ['Confidenziale - Segreto professionale'],
      en: ['Confidential - Attorney-Client Privilege'],
    },
  },
  letter: {
    sections: ['Sender', 'Recipient', 'Date', 'Subject', 'Body', 'Closing'],
    boilerplate: {
      de: ['Mit freundlichen Grüssen'],
      fr: ['Meilleures salutations'],
      it: ['Cordiali saluti'],
      en: ['Best regards'],
    },
  },
  agreement: {
    sections: ['Parties', 'Background', 'Terms', 'Conditions', 'Representations', 'Signatures'],
    boilerplate: {
      de: ['Die Parteien vereinbaren hiermit Folgendes:'],
      fr: ['Les parties conviennent de ce qui suit:'],
      it: ['Le parti convengono quanto segue:'],
      en: ['The parties hereby agree as follows:'],
    },
  },
  complaint: {
    sections: ['Court', 'Parties', 'Subject Matter', 'Facts', 'Legal Claims', 'Evidence Offered', 'Requests'],
    boilerplate: {
      de: ['Rechtsbegehren:', '1. [Hauptantrag]', '2. Unter Kosten- und Entschädigungsfolgen zulasten der Gegenpartei.'],
      fr: ['Conclusions:', '1. [Conclusion principale]', '2. Sous suite de frais et dépens à charge de la partie adverse.'],
      it: ['Conclusioni:', '1. [Conclusione principale]', '2. Con protesta di spese e ripetibili a carico della controparte.'],
      en: ['Relief Requested:', '1. [Primary relief]', '2. With costs and fees to be borne by the opposing party.'],
    },
  },
  response: {
    sections: ['Court', 'Case Reference', 'Respondent', 'Response to Claims', 'Facts', 'Defenses', 'Counter-Evidence', 'Requests'],
    boilerplate: {
      de: ['Rechtsbegehren:', '1. Die Klage sei vollumfänglich abzuweisen.', '2. Unter Kosten- und Entschädigungsfolgen zulasten der Klägerschaft.'],
      fr: ['Conclusions:', '1. La demande doit être entièrement rejetée.', '2. Sous suite de frais et dépens à charge de la partie demanderesse.'],
      it: ['Conclusioni:', '1. L\'azione deve essere interamente respinta.', '2. Con protesta di spese e ripetibili a carico della parte attrice.'],
      en: ['Relief Requested:', '1. The complaint should be dismissed in its entirety.', '2. With costs and fees to be borne by the plaintiff.'],
    },
  },
};

/**
 * Generate section content based on document type and input
 */
function generateSectionContent(
  section: string,
  _documentType: string,
  input: LegalDraftInput,
  lang: Language
): string {
  const { subject, content, parties } = input;

  // Handle special sections
  switch (section.toLowerCase()) {
    case 'parties':
      if (parties && parties.length > 0) {
        return parties.map((p, i) => {
          const roleLabels: Record<Language, string> = {
            de: `${i + 1}. ${p.name}\n   Rolle: ${p.role}${p.address ? `\n   Adresse: ${p.address}` : ''}`,
            fr: `${i + 1}. ${p.name}\n   Qualité: ${p.role}${p.address ? `\n   Adresse: ${p.address}` : ''}`,
            it: `${i + 1}. ${p.name}\n   Qualità: ${p.role}${p.address ? `\n   Indirizzo: ${p.address}` : ''}`,
            en: `${i + 1}. ${p.name}\n   Role: ${p.role}${p.address ? `\n   Address: ${p.address}` : ''}`,
          };
          return roleLabels[lang];
        }).join('\n\n');
      }
      return getPlaceholder('parties', lang);

    case 'date':
      return new Date().toLocaleDateString(lang === 'de' ? 'de-CH' : lang === 'fr' ? 'fr-CH' : lang === 'it' ? 'it-CH' : 'en-GB');

    case 're':
    case 'subject':
    case 'subject matter':
      return subject;

    case 'body':
    case 'analysis':
    case 'terms':
    case 'main obligations':
      return content || getPlaceholder('content', lang);

    default:
      return getPlaceholder(section, lang);
  }
}

/**
 * Get placeholder text for a section
 */
function getPlaceholder(section: string, lang: Language): string {
  const placeholders: Record<Language, string> = {
    de: `[${section} - Bitte ergänzen]`,
    fr: `[${section} - À compléter]`,
    it: `[${section} - Da completare]`,
    en: `[${section} - To be completed]`,
  };
  return placeholders[lang];
}

/**
 * Generate document title based on type and subject
 */
function generateTitle(documentType: string, subject: string, lang: Language): string {
  const typeLabels: Record<string, Record<Language, string>> = {
    contract: { de: 'Vertrag', fr: 'Contrat', it: 'Contratto', en: 'Contract' },
    brief: { de: 'Rechtsschrift', fr: 'Mémoire', it: 'Memoria', en: 'Legal Brief' },
    motion: { de: 'Antrag', fr: 'Requête', it: 'Istanza', en: 'Motion' },
    opinion: { de: 'Rechtsgutachten', fr: 'Avis de droit', it: 'Parere legale', en: 'Legal Opinion' },
    memorandum: { de: 'Memorandum', fr: 'Mémorandum', it: 'Memorandum', en: 'Memorandum' },
    letter: { de: 'Schreiben', fr: 'Lettre', it: 'Lettera', en: 'Letter' },
    agreement: { de: 'Vereinbarung', fr: 'Accord', it: 'Accordo', en: 'Agreement' },
    complaint: { de: 'Klage', fr: 'Demande', it: 'Azione', en: 'Complaint' },
    response: { de: 'Klageantwort', fr: 'Réponse', it: 'Risposta', en: 'Response' },
  };

  const typeLabel = typeLabels[documentType]?.[lang] || documentType;
  return `${typeLabel}: ${subject}`;
}

/**
 * Extract citations from content
 */
function extractCitations(content: string): string[] {
  const citations: string[] = [];

  // BGE citations
  const bgeMatches = content.match(/BGE\s*\d+\s*(I|Ia|II|III|IV|V|VI)\s*\d+/gi) || [];
  citations.push(...bgeMatches);

  // Article citations
  const articleMatches = content.match(/Art\.\s*\d+(?:\s*Abs\.\s*\d+)?(?:\s*lit\.\s*[a-z])?\s*[A-Z]{2,5}/gi) || [];
  citations.push(...articleMatches);

  return [...new Set(citations)]; // Remove duplicates
}

/**
 * Generate warnings based on document content
 */
function generateWarnings(documentType: string, input: LegalDraftInput, lang: Language): string[] {
  const warnings: string[] = [];

  // Missing parties warning for contracts
  if (['contract', 'agreement'].includes(documentType) && (!input.parties || input.parties.length === 0)) {
    const warningText: Record<Language, string> = {
      de: 'Parteien müssen vor Verwendung ergänzt werden',
      fr: 'Les parties doivent être ajoutées avant utilisation',
      it: 'Le parti devono essere aggiunte prima dell\'uso',
      en: 'Parties must be added before use',
    };
    warnings.push(warningText[lang]);
  }

  // Placeholder warning
  const placeholderWarning: Record<Language, string> = {
    de: 'Dokument enthält Platzhalter [in eckigen Klammern], die ergänzt werden müssen',
    fr: 'Le document contient des espaces réservés [entre crochets] à compléter',
    it: 'Il documento contiene segnaposto [tra parentesi quadre] da completare',
    en: 'Document contains placeholders [in square brackets] that must be completed',
  };
  warnings.push(placeholderWarning[lang]);

  // Professional review warning
  const reviewWarning: Record<Language, string> = {
    de: 'Anwaltliche Überprüfung vor Verwendung erforderlich',
    fr: 'Révision par un avocat requise avant utilisation',
    it: 'Revisione da parte di un avvocato richiesta prima dell\'uso',
    en: 'Professional lawyer review required before use',
  };
  warnings.push(reviewWarning[lang]);

  return warnings;
}

/**
 * Handle the legal_draft tool
 * Generates legal document drafts with Swiss law compliance
 */
export async function handleLegalDraft(
  input: LegalDraftInput,
  _requestId: string
): Promise<LegalDraftOutput> {
  const {
    documentType,
    subject,
    content: _content,
    parties: _parties,
    jurisdiction: _jurisdiction,
    canton: _canton,
    lang = 'de',
    formality: _formality = 'formal',
    includeBoilerplate = true,
  } = input;

  // Get template for document type
  const template = DOCUMENT_TEMPLATES[documentType];
  if (!template) {
    throw new Error(`Unknown document type: ${documentType}`);
  }

  // Generate title
  const title = generateTitle(documentType, subject, lang);

  // Build sections
  const sections: Array<{ heading: string; content: string }> = [];

  for (const sectionName of template.sections) {
    const sectionContent = generateSectionContent(sectionName, documentType, input, lang);
    sections.push({
      heading: sectionName,
      content: sectionContent,
    });
  }

  // Add boilerplate if requested
  if (includeBoilerplate && template.boilerplate[lang]) {
    const boilerplateContent = template.boilerplate[lang].join('\n');
    sections.push({
      heading: getBoilerplateHeading(lang),
      content: boilerplateContent,
    });
  }

  // Assemble full document
  const documentParts: string[] = [];

  // Header
  documentParts.push(`${'='.repeat(60)}`);
  documentParts.push(title.toUpperCase());
  documentParts.push(`${'='.repeat(60)}`);
  documentParts.push('');

  // Sections
  for (const section of sections) {
    documentParts.push(`## ${section.heading}`);
    documentParts.push('');
    documentParts.push(section.content);
    documentParts.push('');
  }

  const document = documentParts.join('\n');

  // Extract citations from generated content
  const citations = extractCitations(document);

  // Generate warnings
  const warnings = generateWarnings(documentType, input, lang);

  // Generate review notes
  const reviewNotes = generateReviewNotes(documentType, lang);

  return {
    document,
    documentType,
    title,
    sections,
    citations,
    warnings,
    reviewNotes,
  };
}

function getBoilerplateHeading(lang: Language): string {
  const headings: Record<Language, string> = {
    de: 'Schlussbestimmungen',
    fr: 'Dispositions finales',
    it: 'Disposizioni finali',
    en: 'Final Provisions',
  };
  return headings[lang];
}

function generateReviewNotes(documentType: string, lang: Language): string[] {
  const notes: string[] = [];

  const generalNotes: Record<Language, string[]> = {
    de: [
      'Alle Platzhalter mit konkreten Informationen ersetzen',
      'Rechtschreibung und Formatierung prüfen',
      'Juristische Terminologie auf Konsistenz prüfen',
    ],
    fr: [
      'Remplacer tous les espaces réservés par des informations concrètes',
      'Vérifier l\'orthographe et le formatage',
      'Vérifier la cohérence de la terminologie juridique',
    ],
    it: [
      'Sostituire tutti i segnaposto con informazioni concrete',
      'Controllare ortografia e formattazione',
      'Verificare la coerenza della terminologia giuridica',
    ],
    en: [
      'Replace all placeholders with concrete information',
      'Check spelling and formatting',
      'Verify legal terminology consistency',
    ],
  };

  notes.push(...generalNotes[lang]);

  // Document-specific notes
  if (['contract', 'agreement'].includes(documentType)) {
    const contractNotes: Record<Language, string> = {
      de: 'Haftungsbeschränkungen und Gewährleistungsausschlüsse prüfen',
      fr: 'Vérifier les limitations de responsabilité et exclusions de garantie',
      it: 'Verificare le limitazioni di responsabilità e le esclusioni di garanzia',
      en: 'Review liability limitations and warranty exclusions',
    };
    notes.push(contractNotes[lang]);
  }

  if (['complaint', 'brief', 'response'].includes(documentType)) {
    const litigationNotes: Record<Language, string> = {
      de: 'Fristablauf und Zuständigkeit vor Einreichung prüfen',
      fr: 'Vérifier les délais et la compétence avant le dépôt',
      it: 'Verificare i termini e la competenza prima del deposito',
      en: 'Verify deadlines and jurisdiction before filing',
    };
    notes.push(litigationNotes[lang]);
  }

  return notes;
}
