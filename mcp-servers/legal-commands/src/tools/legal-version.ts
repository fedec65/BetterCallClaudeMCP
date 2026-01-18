import {
  LegalVersionInput,
  LegalVersionOutput,
  LegalVersionInputSchema,
  ServerInfo,
} from '../types.js';

const FRAMEWORK_NAME = 'BetterCallClaude';
const FRAMEWORK_VERSION = '2.1.0';
const BUILD_DATE = '2026-01-18';

// MCP Server information
const SERVERS: ServerInfo[] = [
  { name: 'legal-commands', version: '1.0.0', status: 'active' },
  { name: 'legal-citations', version: '1.0.0', status: 'active' },
  { name: 'legal-persona', version: '1.0.0', status: 'active' },
  { name: 'entscheidsuche', version: '1.0.0', status: 'active' },
  { name: 'bge-search', version: '1.0.0', status: 'active' },
];

// Framework capabilities
const CAPABILITIES = [
  'legal-research',
  'case-strategy',
  'document-drafting',
  'document-analysis',
  'citation-management',
  'multi-lingual',
  'multi-jurisdictional',
  'agent-orchestration',
  'workflow-automation',
];

/**
 * Returns version and status information for BetterCallClaude
 */
export function legalVersion(input: Partial<LegalVersionInput>): LegalVersionOutput {
  const validatedInput = LegalVersionInputSchema.parse(input);
  const { format } = validatedInput;

  // In detailed mode, return all information
  // In simple mode, still return all fields but could limit items
  const servers = format === 'detailed' ? SERVERS : SERVERS;
  const capabilities = format === 'detailed' ? CAPABILITIES : CAPABILITIES;

  return {
    framework: FRAMEWORK_NAME,
    version: FRAMEWORK_VERSION,
    buildDate: BUILD_DATE,
    servers,
    capabilities,
  };
}
