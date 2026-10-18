/** Contrat partagé carte / planche : aucune couleur inventée ou corrigée en silence.
 * Les seuils ne certifient pas l'harmonie : ils refusent des doublons évidents et
 * vérifient les associations réellement rendues. La qualité créative reste à relire.
 */
import { contrast, hexToRgb, luminance, onColor, sameColor } from "../color";

export const PALETTE_ROLES = ["primary", "secondary", "accent", "light", "dark"] as const;
export const CHROMATIC_ROLES = ["primary", "secondary", "accent"] as const;
export type DirectionPalette = Record<(typeof PALETTE_ROLES)[number], string>;

export function palettePresentation(p: DirectionPalette) {
  return { background: p.light, text: p.dark, heading: p.primary, surface: p.secondary,
    surfaceText: onColor(p.secondary, p.dark, p.light), button: p.accent,
    buttonText: onColor(p.accent, p.dark, p.light) };
}

/** Chroma OKLab : autorise des neutres teintés, sans transformer clair/sombre en accents. */
function chroma(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(v => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return Math.hypot(1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s);
}
export function directionPaletteIssues(p: DirectionPalette): string[] {
  if (PALETTE_ROLES.some(role => !/^#[a-f0-9]{6}$/i.test(p[role]))) return ["Palette : cinq codes HEX à six chiffres requis."];
  const issues: string[] = [];
  for (const [i, role] of CHROMATIC_ROLES.entries()) for (const other of CHROMATIC_ROLES.slice(i + 1)) {
    if (sameColor(p[role], p[other])) issues.push(`Rôles ${role}/${other} : couleurs indiscernables.`);
  }
  if (luminance(p.light) < 0.65 || chroma(p.light) > 0.06) issues.push("light : une base neutre claire, éventuellement teintée, est requise.");
  if (luminance(p.dark) > 0.12 || chroma(p.dark) > 0.06) issues.push("dark : une base neutre sombre, éventuellement teintée, est requise.");
  const view = palettePresentation(p);
  for (const [role, fg, bg] of [["texte/fond", view.text, view.background], ["titre/fond", view.heading, view.background], ["texte/surface", view.surfaceText, view.surface], ["texte/CTA", view.buttonText, view.button]] as const) {
    if (contrast(fg, bg) < 4.5) issues.push(`${role} : contraste ${contrast(fg, bg).toFixed(2)}:1 inférieur à 4.5:1.`);
  }
  return issues;
}
/** Les trois premiers rôles varient entre CHAQUE paire. Les deux neutres peuvent rester communs. */
export function directionSeriesPaletteIssues(identities: readonly { palette: DirectionPalette }[]) {
  const issues = identities.flatMap((d, i) => directionPaletteIssues(d.palette).map(issue => `Direction ${i + 1} — ${issue}`));
  for (const [i, d] of identities.entries()) for (const [offset, other] of identities.slice(i + 1).entries()) {
    for (const role of CHROMATIC_ROLES) if (sameColor(d.palette[role], other.palette[role])) issues.push(`Directions ${i + 1}/${i + offset + 2} — ${role} répété ou indiscernable : la palette complète doit varier.`);
  }
  return issues;
}
