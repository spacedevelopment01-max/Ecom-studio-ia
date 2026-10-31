/**
 * Vitrine interne des fondations SYNA (lot 0) : page de contrôle visuel, jamais montrée aux clients.
 * Ouverte en développement ; en production seulement si `SYNA_VITRINE=1` est posé volontairement.
 */
import { SYNA_ACCENTS, SYNA_MODES } from "./tokens";
import { SYNA_APPEARANCES, SYNA_DENSITIES, SYNA_PANELS, SYNA_TEXT_SIZES, sanitizeSynaPrefs, type SynaUiPrefs } from "./preferences";

export function synaVitrineEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.SYNA_VITRINE === "1";
}

export type SynaVitrineState = Partial<SynaUiPrefs> & { view?: "conversation" | "workspace"; lang?: "fr" | "en" };

/** Lit les paramètres d'adresse de la vitrine (`?mode=plein&appearance=dark…`) ; tout le reste est ignoré. */
export function parseSynaVitrineParams(params: Record<string, string | string[] | undefined>): SynaVitrineState {
  const one = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) as string | undefined;
  const prefs = sanitizeSynaPrefs({
    mode: one("mode"), appearance: one("appearance"), accent: one("accent"), density: one("density"), textSize: one("text"), panel: one("panel"),
    convoWidth: one("width") ? Number(one("width")) : undefined,
  });
  const view = one("view");
  const lang = one("lang");
  return { ...prefs, view: view === "conversation" || view === "workspace" ? view : undefined, lang: lang === "en" ? "en" : lang === "fr" ? "fr" : undefined };
}

export const SYNA_VITRINE_CHOICES = { mode: SYNA_MODES, appearance: SYNA_APPEARANCES, accent: SYNA_ACCENTS, density: SYNA_DENSITIES, textSize: SYNA_TEXT_SIZES, panel: SYNA_PANELS } as const;
