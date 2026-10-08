/**
 * Polices dans le navigateur (éditeur visuel) : même résolution que le serveur (`media/fonts.ts › font`) — famille
 * inconnue → Inter, italique si chargée, sinon graisse disponible la plus proche — et mêmes alias (« Famille@600 »).
 * La chaîne « font » produite est identique à celle du rendu serveur : aperçu et export emploient la même police.
 */
export type FontCatalog = Record<string, { kind: string; weights: { weight: number; alias: string; file: string }[]; italic: { alias: string; file: string } | null }>;

export function resolveFont(cat: FontCatalog, family: string, weight: number, italic: boolean): { alias: string; file: string } | null {
  const def = cat[family] ?? cat.Inter;
  if (!def) return null;
  if (italic && def.italic) return def.italic;
  const w = def.weights.slice().sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0];
  return w ? { alias: w.alias, file: w.file } : null;
}

export const fontString = (cat: FontCatalog, family: string, weight: number, size: number, italic: boolean) => {
  const r = resolveFont(cat, family, weight, italic);
  return `${size}px "${r?.alias ?? "Inter@400"}"`;
};

/** Polices utilisées par un document (à charger avant le premier rendu). */
export function docFonts(cat: FontCatalog, layers: { kind: string; font?: { family: string; weight: number; italic: boolean } }[]) {
  const out = new Map<string, string>();
  for (const l of layers) {
    if (!l.font) continue;
    const r = resolveFont(cat, l.font.family, l.font.weight, l.font.italic);
    if (r) out.set(r.alias, r.file);
  }
  return out;
}
