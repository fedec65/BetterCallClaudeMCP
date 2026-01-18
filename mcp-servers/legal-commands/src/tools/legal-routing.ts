import {
  LegalRoutingInput,
  LegalRoutingOutput,
  LegalRoutingInputSchema,
  Language,
  Jurisdiction,
  Canton,
} from '../types.js';

// Default routing configuration
let currentConfig = {
  defaultJurisdiction: 'federal' as Jurisdiction,
  defaultCanton: undefined as Canton | undefined,
  autoDetect: true,
};

// Available agents with their domains
const AVAILABLE_AGENTS: Array<{ name: string; domain: string; status: 'active' | 'inactive' }> = [
  { name: 'researcher', domain: 'Precedent & statutory research', status: 'active' },
  { name: 'strategist', domain: 'Litigation strategy and case assessment', status: 'active' },
  { name: 'drafter', domain: 'Legal document generation', status: 'active' },
  { name: 'compliance', domain: 'FINMA, AML/KYC regulatory checks', status: 'active' },
  { name: 'data-protection', domain: 'GDPR and Swiss nDSG/FADP compliance', status: 'active' },
  { name: 'fiscal-expert', domain: 'Tax law and double-taxation agreements', status: 'active' },
  { name: 'corporate', domain: 'M&A, contracts, and governance', status: 'active' },
  { name: 'real-estate', domain: 'Property transactions and Grundbuch matters', status: 'active' },
  { name: 'translator', domain: 'Legal translations DE/FR/IT/EN', status: 'active' },
  { name: 'cantonal-law', domain: 'Specialist for all 26 Swiss cantons', status: 'active' },
  { name: 'procedure', domain: 'ZPO/StPO deadlines and procedural rules', status: 'active' },
  { name: 'risk-analyst', domain: 'Case outcome scoring and settlement calculations', status: 'active' },
  { name: 'orchestrator', domain: 'Multi-agent workflow coordination', status: 'active' },
];

// Translations for messages
const MESSAGES: Record<Language, { status: string; configured: string }> = {
  de: {
    status: 'Aktuelle Routing-Konfiguration wird angezeigt. Auto-Erkennung ist aktiviert, Standard-Jurisdiktion ist konfiguriert.',
    configured: 'Routing-Konfiguration wurde erfolgreich aktualisiert. Änderungen sind sofort wirksam.',
  },
  fr: {
    status: 'Configuration de routage actuelle affichée. La détection automatique est activée, la juridiction par défaut est configurée.',
    configured: 'La configuration de routage a été mise à jour avec succès. Les changements sont effectifs immédiatement.',
  },
  it: {
    status: 'Configurazione di routing attuale visualizzata. Il rilevamento automatico è attivato, la giurisdizione predefinita è configurata.',
    configured: 'La configurazione di routing è stata aggiornata con successo. Le modifiche sono immediatamente effettive.',
  },
  en: {
    status: 'Current routing configuration displayed. Auto-detection is enabled, default jurisdiction is configured.',
    configured: 'Routing configuration has been successfully updated. Changes are effective immediately.',
  },
};

/**
 * Displays or configures routing settings for BetterCallClaude
 */
export function legalRouting(input: Partial<LegalRoutingInput>): LegalRoutingOutput {
  const validatedInput = LegalRoutingInputSchema.parse(input);
  const { action, defaultJurisdiction, defaultCanton, autoDetect, language } = validatedInput;

  const messages = MESSAGES[language];

  if (action === 'configure') {
    // Update configuration with provided values
    if (defaultJurisdiction !== undefined) {
      currentConfig.defaultJurisdiction = defaultJurisdiction;
    }
    if (defaultCanton !== undefined) {
      currentConfig.defaultCanton = defaultCanton;
    }
    if (autoDetect !== undefined) {
      currentConfig.autoDetect = autoDetect;
    }

    return {
      currentConfig: { ...currentConfig },
      status: 'configured',
      message: messages.configured,
      availableAgents: AVAILABLE_AGENTS,
      language,
    };
  }

  // Status action (default)
  return {
    currentConfig: { ...currentConfig },
    status: 'unchanged',
    message: messages.status,
    availableAgents: AVAILABLE_AGENTS,
    language,
  };
}
