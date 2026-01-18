import {
  LegalCantonalInput,
  LegalCantonalOutput,
  LegalCantonalInputSchema,
  Canton,
  Language,
} from '../types.js';

// Canton configuration data
interface CantonConfig {
  name: string;
  primaryLanguage: Language;
  applicableLaw: string[];
  primarySources: string[];
  courtSystem: {
    supreme: string;
    firstInstance: string;
    specialized?: string;
  };
}

const CANTON_CONFIG: Record<Canton, CantonConfig> = {
  ZH: {
    name: 'Zürich',
    primaryLanguage: 'de',
    applicableLaw: [
      'KV ZH (Kantonsverfassung)',
      'GOG ZH (Gerichtsorganisationsgesetz)',
      'EG ZGB (Einführungsgesetz zum ZGB)',
      'PBG ZH (Planungs- und Baugesetz)',
      'StG ZH (Steuergesetz)',
    ],
    primarySources: [
      'Obergericht Zürich',
      'Verwaltungsgericht Zürich',
      'Baurekursgericht',
      'zhlex.zh.ch',
    ],
    courtSystem: {
      supreme: 'Obergericht des Kantons Zürich',
      firstInstance: 'Bezirksgerichte',
      specialized: 'Handelsgericht Zürich',
    },
  },
  BE: {
    name: 'Bern / Berne',
    primaryLanguage: 'de',
    applicableLaw: [
      'KV BE (Kantonsverfassung)',
      'GSOG (Gesetz über die Organisation der Gerichtsbehörden)',
      'EG ZGB BE',
      'BauG (Baugesetz)',
      'StG BE (Steuergesetz)',
    ],
    primarySources: [
      'Obergericht Bern / Cour suprême',
      'Verwaltungsgericht / Tribunal administratif',
      'belex.sites.be.ch',
    ],
    courtSystem: {
      supreme: 'Obergericht / Cour suprême du canton de Berne',
      firstInstance: 'Regionalgerichte / Tribunaux régionaux',
    },
  },
  GE: {
    name: 'Genève',
    primaryLanguage: 'fr',
    applicableLaw: [
      'Cst-GE (Constitution)',
      'LOJ (Loi sur l\'organisation judiciaire)',
      'LaCC (Loi d\'application du CC)',
      'LCI (Loi sur les constructions)',
      'LIPP (Loi sur l\'imposition des personnes physiques)',
    ],
    primarySources: [
      'Cour de justice de Genève',
      'Chambre administrative',
      'ge.ch/legislation',
    ],
    courtSystem: {
      supreme: 'Cour de justice',
      firstInstance: 'Tribunal de première instance',
      specialized: 'Tribunal des prud\'hommes',
    },
  },
  BS: {
    name: 'Basel-Stadt',
    primaryLanguage: 'de',
    applicableLaw: [
      'KV BS (Kantonsverfassung)',
      'GOG BS (Gerichtsorganisationsgesetz)',
      'EG ZGB BS',
      'BPG (Bau- und Planungsgesetz)',
      'StG BS (Steuergesetz)',
    ],
    primarySources: [
      'Appellationsgericht Basel-Stadt',
      'Verwaltungsgericht',
      'gesetzessammlung.bs.ch',
    ],
    courtSystem: {
      supreme: 'Appellationsgericht des Kantons Basel-Stadt',
      firstInstance: 'Zivilgericht / Strafgericht',
    },
  },
  VD: {
    name: 'Vaud',
    primaryLanguage: 'fr',
    applicableLaw: [
      'Cst-VD (Constitution)',
      'LOJV (Loi d\'organisation judiciaire)',
      'CDPJ (Code de droit privé judiciaire)',
      'LATC (Loi sur l\'aménagement du territoire)',
      'LI (Loi sur les impôts)',
    ],
    primarySources: [
      'Tribunal cantonal',
      'Cour de droit administratif et public',
      'prestations.vd.ch/pub/blv-publication',
    ],
    courtSystem: {
      supreme: 'Tribunal cantonal',
      firstInstance: 'Tribunaux d\'arrondissement',
    },
  },
  TI: {
    name: 'Ticino',
    primaryLanguage: 'it',
    applicableLaw: [
      'Cost. TI (Costituzione)',
      'LOG (Legge sull\'organizzazione giudiziaria)',
      'LAC (Legge di applicazione del CC)',
      'LE (Legge edilizia)',
      'LT (Legge tributaria)',
    ],
    primarySources: [
      'Tribunale d\'appello',
      'Tribunale amministrativo',
      'www4.ti.ch/can/legislazione',
    ],
    courtSystem: {
      supreme: 'Tribunale d\'appello del Cantone Ticino',
      firstInstance: 'Preture',
    },
  },
};

// Translations for activation messages
const MESSAGES: Record<Language, { activated: (canton: string) => string; status: (canton: string) => string }> = {
  de: {
    activated: (canton) => `Kantonales Recht (${canton}) aktiviert. Analysen und Recherchen werden auf kantonaler Ebene durchgeführt.`,
    status: (canton) => `Kantonaler Modus (${canton}) ist aktiv. Kantonales Recht wird angewendet.`,
  },
  fr: {
    activated: (canton) => `Droit cantonal (${canton}) activé. Les analyses et recherches seront effectuées au niveau cantonal.`,
    status: (canton) => `Le mode cantonal (${canton}) est actif. Le droit cantonal est appliqué.`,
  },
  it: {
    activated: (canton) => `Diritto cantonale (${canton}) attivato. Le analisi e le ricerche saranno effettuate a livello cantonale.`,
    status: (canton) => `La modalità cantonale (${canton}) è attiva. Il diritto cantonale è applicato.`,
  },
  en: {
    activated: (canton) => `Cantonal Law (${canton}) activated. Analyses and research will be conducted at cantonal level.`,
    status: (canton) => `Cantonal mode (${canton}) is active. Cantonal law is applied.`,
  },
};

/**
 * Activates or returns status of Cantonal Law Mode for a specific canton
 */
export function legalCantonal(input: Partial<LegalCantonalInput>): LegalCantonalOutput {
  const validatedInput = LegalCantonalInputSchema.parse(input);
  const { canton, action, language } = validatedInput;

  const config = CANTON_CONFIG[canton];
  const messages = MESSAGES[language];
  const status = action === 'activate' ? 'activated' : 'already_active';
  const message = action === 'activate'
    ? messages.activated(config.name)
    : messages.status(config.name);

  return {
    mode: 'cantonal',
    canton,
    cantonName: config.name,
    status,
    message,
    primaryLanguage: config.primaryLanguage,
    applicableLaw: config.applicableLaw,
    primarySources: config.primarySources,
    courtSystem: config.courtSystem,
    language,
  };
}
