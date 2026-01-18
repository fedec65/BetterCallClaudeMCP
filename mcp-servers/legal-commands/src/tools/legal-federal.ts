import {
  LegalFederalInput,
  LegalFederalOutput,
  LegalFederalInputSchema,
  Language,
} from '../types.js';

// Federal statutes (core Swiss federal law)
const APPLICABLE_LAW = [
  'BV',    // Bundesverfassung / Constitution fédérale
  'ZGB',   // Zivilgesetzbuch / Code civil
  'OR',    // Obligationenrecht / Code des obligations
  'StGB',  // Strafgesetzbuch / Code pénal
  'ZPO',   // Zivilprozessordnung / Code de procédure civile
  'StPO',  // Strafprozessordnung / Code de procédure pénale
  'SchKG', // Schuldbetreibungs- und Konkursgesetz
  'UWG',   // Bundesgesetz gegen den unlauteren Wettbewerb
  'DSG',   // Datenschutzgesetz
  'IPRG',  // Bundesgesetz über das Internationale Privatrecht
];

// Primary sources for federal law
const PRIMARY_SOURCES = [
  'Bundesgericht (BGE/ATF/DTF)',
  'Bundesblatt (BBl)',
  'Systematische Sammlung des Bundesrechts (SR)',
  'fedlex.admin.ch',
];

// Translations for activation messages
const MESSAGES: Record<Language, { activated: string; status: string }> = {
  de: {
    activated: 'Bundesrecht-Modus aktiviert. Alle Analysen und Recherchen werden auf Bundesebene durchgeführt.',
    status: 'Bundesrecht-Modus ist aktiv. Bundesgesetze und BGE-Rechtsprechung werden angewendet.',
  },
  fr: {
    activated: 'Mode droit fédéral activé. Toutes les analyses et recherches seront effectuées au niveau fédéral.',
    status: 'Le mode droit fédéral est actif. Le droit fédéral et la jurisprudence ATF sont appliqués.',
  },
  it: {
    activated: 'Modalità diritto federale attivata. Tutte le analisi e le ricerche saranno effettuate a livello federale.',
    status: 'La modalità diritto federale è attiva. Il diritto federale e la giurisprudenza DTF sono applicati.',
  },
  en: {
    activated: 'Federal Law Mode activated. All analyses and research will be conducted at the federal level.',
    status: 'Federal Law Mode is active. Federal statutes and BGE jurisprudence are applied.',
  },
};

/**
 * Activates or returns status of Federal Law Mode
 */
export function legalFederal(input: Partial<LegalFederalInput>): LegalFederalOutput {
  const validatedInput = LegalFederalInputSchema.parse(input);
  const { action, language } = validatedInput;

  const messages = MESSAGES[language];
  const status = action === 'activate' ? 'activated' : 'already_active';
  const message = action === 'activate' ? messages.activated : messages.status;

  return {
    mode: 'federal',
    status,
    message,
    applicableLaw: APPLICABLE_LAW,
    primarySources: PRIMARY_SOURCES,
    language,
  };
}
