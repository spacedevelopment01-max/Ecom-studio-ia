/**
 * SYNA — réglages d'affichage de l'interface de travail (mission #282, lot 0 : structure seulement).
 *
 * Priorité : réglage du projet > réglage du compte > valeur par défaut. Les valeurs inconnues ou hors bornes sont
 * ignorées (jamais d'erreur, jamais de réglage qui casse l'ergonomie). Ce module est pur : il ne lit ni n'écrit
 * aucun stockage, aucune base, aucune API. Le branchement sur le compte et la bascule réelle relèvent du lot 1 bis,
 * après validation du propriétaire.
 *
 * Le mode ne concerne que le Studio : il ne change jamais le site, le thème ni les exports du client.
 */
import { SYNA_ACCENTS, SYNA_DEFAULT_ACCENT, SYNA_MODES, type SynaAccent, type SynaMode } from "./tokens";

export const SYNA_APPEARANCES = ["auto", "light", "dark"] as const;
export type SynaAppearance = (typeof SYNA_APPEARANCES)[number];
export const SYNA_DENSITIES = ["comfortable", "compact"] as const;
export type SynaDensity = (typeof SYNA_DENSITIES)[number];
export const SYNA_TEXT_SIZES = ["normal", "large"] as const;
export type SynaTextSize = (typeof SYNA_TEXT_SIZES)[number];
export const SYNA_PANELS = ["pinned", "collapsed"] as const;
export type SynaPanel = (typeof SYNA_PANELS)[number];

/** Largeur de la conversation : bornes et pas (en pixels CSS). */
export const SYNA_CONVO_WIDTH = { min: 360, max: 560, step: 20 } as const;
const DEFAULT_WIDTH: Record<SynaMode, number> = { encre: 440, plein: 420 };

export type SynaUiPrefs = {
  mode: SynaMode;
  appearance: SynaAppearance;
  /** `null` : le bleu par défaut du mode (bleu d'encre pour Encre, cobalt pour Plein cadre). */
  accent: SynaAccent | null;
  /** `null` : la largeur par défaut du mode. */
  convoWidth: number | null;
  density: SynaDensity;
  textSize: SynaTextSize;
  panel: SynaPanel;
};

/** Réglage partiel tel qu'il serait stocké (compte ou projet) : tout est facultatif et peut être invalide. */
export type SynaUiPrefsInput = Partial<Record<keyof SynaUiPrefs, unknown>>;

export const SYNA_DEFAULT_PREFS: Readonly<SynaUiPrefs> = Object.freeze({
  mode: "encre",
  appearance: "auto",
  accent: null,
  convoWidth: null,
  density: "comfortable",
  textSize: "normal",
  panel: "pinned",
});

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | undefined => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined);

function width(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const { min, max, step } = SYNA_CONVO_WIDTH;
  return Math.min(max, Math.max(min, Math.round(v / step) * step));
}

/** Ne garde que les réglages valides (les largeurs sont ramenées dans les bornes, au pas de 20 px). */
export function sanitizeSynaPrefs(input: unknown): Partial<SynaUiPrefs> {
  if (!input || typeof input !== "object") return {};
  const i = input as SynaUiPrefsInput, out: Partial<SynaUiPrefs> = {};
  const mode = oneOf(SYNA_MODES, i.mode); if (mode) out.mode = mode;
  const appearance = oneOf(SYNA_APPEARANCES, i.appearance); if (appearance) out.appearance = appearance;
  if (i.accent === null) out.accent = null; else { const a = oneOf(SYNA_ACCENTS, i.accent); if (a) out.accent = a; }
  const w = width(i.convoWidth); if (w !== undefined) out.convoWidth = w;
  const density = oneOf(SYNA_DENSITIES, i.density); if (density) out.density = density;
  const textSize = oneOf(SYNA_TEXT_SIZES, i.textSize); if (textSize) out.textSize = textSize;
  const panel = oneOf(SYNA_PANELS, i.panel); if (panel) out.panel = panel;
  return out;
}

export type ResolvedSynaPrefs = SynaUiPrefs & { accent: SynaAccent; convoWidth: number; source: Record<keyof SynaUiPrefs, "project" | "account" | "default"> };

/** Réglages effectifs : projet > compte > défaut, champ par champ, avec l'origine de chaque valeur. */
export function resolveSynaPrefs(account?: unknown, project?: unknown): ResolvedSynaPrefs {
  const a = sanitizeSynaPrefs(account), p = sanitizeSynaPrefs(project);
  const keys = Object.keys(SYNA_DEFAULT_PREFS) as (keyof SynaUiPrefs)[];
  const merged = { ...SYNA_DEFAULT_PREFS } as SynaUiPrefs;
  const source = {} as ResolvedSynaPrefs["source"];
  for (const k of keys) {
    if (p[k] !== undefined) { (merged as Record<string, unknown>)[k] = p[k]; source[k] = "project"; }
    else if (a[k] !== undefined) { (merged as Record<string, unknown>)[k] = a[k]; source[k] = "account"; }
    else source[k] = "default";
  }
  return {
    ...merged,
    accent: merged.accent ?? SYNA_DEFAULT_ACCENT[merged.mode],
    convoWidth: merged.convoWidth ?? DEFAULT_WIDTH[merged.mode],
    source,
  };
}

/** « Rétablir les réglages par défaut » du compte : les exceptions des projets ne sont pas touchées. */
export function resetAccountSynaPrefs(): Partial<SynaUiPrefs> {
  return {};
}

/** Attributs à poser sur le conteneur `.syna-ui` (lus par `syna.css`). */
export function synaScopeAttributes(prefs: ResolvedSynaPrefs): Record<string, string> {
  return {
    "data-syna-mode": prefs.mode,
    "data-syna-scheme": prefs.appearance,
    "data-syna-accent": prefs.accent,
    "data-syna-density": prefs.density,
    "data-syna-text": prefs.textSize,
    "data-syna-panel": prefs.panel,
  };
}
