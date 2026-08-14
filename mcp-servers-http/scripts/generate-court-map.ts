/**
 * Generate a court map for the HTTP EntscheidSuche client from the official
 * Facetten_alle.json file published at https://entscheidsuche.ch/docs/.
 */
import fs from 'node:fs';
import path from 'node:path';

interface FacetNode {
  de?: string;
  fr?: string;
  it?: string;
  gerichte?: Record<string, FacetCourt>;
}

interface FacetCourt {
  de?: string;
  fr?: string;
  it?: string;
  kammern?: Record<string, unknown>;
}

async function main() {
  const url = 'https://entscheidsuche.ch/docs/Facetten_alle.json';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch facets: ${response.status}`);
  }

  const facets = (await response.json()) as Record<string, FacetNode>;
  const entries: Array<{ key: string; name: string; canton?: string; level: 'federal' | 'cantonal' }> = [];

  for (const [cantonId, canton] of Object.entries(facets)) {
    const level = cantonId === 'CH' ? 'federal' : 'cantonal';
    for (const [courtId, court] of Object.entries(canton.gerichte || {})) {
      entries.push({
        key: courtId,
        name: court.de || courtId,
        canton: cantonId === 'CH' ? undefined : cantonId,
        level,
      });
    }
  }

  entries.sort((a, b) => a.key.localeCompare(b.key));

  const lines = entries
    .map(({ key, name, canton, level }) => {
      const safeName = name.replace(/'/g, "\\'");
      const cantonPart = canton ? `, canton: '${canton}'` : '';
      return `  '${key}': { name: '${safeName}'${cantonPart}, level: '${level}' as const },`;
    })
    .join('\n');

  const output = `/**
 * Auto-generated court map from https://entscheidsuche.ch/docs/Facetten_alle.json
 * Do not edit by hand. Regenerate with: npx tsx scripts/generate-court-map.ts
 */

export interface CourtInfo {
  name: string;
  canton?: string;
  level: 'federal' | 'cantonal';
}

export const COURT_MAP: Record<string, CourtInfo> = {
${lines}
};
`;

  const outPath = path.resolve(process.cwd(), 'src/lib/entscheidsuche-courts.ts');
  fs.writeFileSync(outPath, output);
  console.log(`Generated ${entries.length} court entries in ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
