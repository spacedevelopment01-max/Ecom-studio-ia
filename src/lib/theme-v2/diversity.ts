/**
 * Mesure de diversité (anti-templates) entre thèmes : changer seulement les couleurs ne compte pas.
 * Distance structurelle et visuelle de 0 (identiques) à 1 (rien en commun), sur :
 * langage visuel, en-tête (disposition, forme), ouverture (composition), suite des sections de l'accueil (types et
 * variantes), appel final, pied de page, typographies, rayons, palette (teinte d'accent), pages du site.
 */
import { hsl } from "../color";
import type { ThemeSpec } from "../theme/spec";

export type Signature = {
  language: string;
  header: string;
  hero: string;
  sections: string[];
  cta: string;
  footer: string;
  fonts: string;
  radius: string;
  accentHue: number;
  pages: string[];
};

export function signatureOf(spec: ThemeSpec): Signature {
  const idx = spec.templates.index;
  const secs = idx.order.map((id) => idx.sections[id]).filter(Boolean);
  const header = spec.groups.header.order.map((id) => spec.groups.header.sections[id]).find((s) => s?.type === "header");
  const footer = spec.groups.footer.order.map((id) => spec.groups.footer.sections[id]).find((s) => s?.type === "footer");
  const hero = secs[0];
  const cta = [...secs].reverse().find((s) => /cta/.test(s.type));
  const schemes = (spec.settings.color_schemes ?? {}) as Record<string, { settings: Record<string, string> }>;
  const accent = schemes["scheme-1"]?.settings.accent ?? "#000000";
  return {
    language: String(spec.settings.ds_language ?? spec.direction),
    header: `${header?.settings.layout ?? ""}/${header?.settings.shape ?? ""}`,
    hero: `${hero?.type}:${hero?.settings.layout ?? ""}`,
    sections: secs.map((s) => `${s.type}:${s.settings.layout ?? ""}`),
    cta: `${cta?.type ?? ""}:${cta?.settings.layout ?? ""}`,
    footer: String(footer?.settings.style ?? ""),
    fonts: `${spec.settings.type_heading_font}/${spec.settings.type_body_font}`,
    radius: `${spec.settings.button_radius}/${spec.settings.card_radius}`,
    accentHue: Math.round(hsl(accent)[0]),
    pages: spec.store.pages.map((p) => p.template_suffix || "page").sort(),
  };
}

const jaccard = (a: string[], b: string[]) => {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 1;
};

/** Distance entre deux thèmes (0 = même gabarit, 1 = rien en commun). Les couleurs ne pèsent que 5 %. */
export function themeDistance(a: Signature, b: Signature): number {
  const same = (x: string, y: string) => (x === y ? 1 : 0);
  const hueGap = Math.min(Math.abs(a.accentHue - b.accentHue), 360 - Math.abs(a.accentHue - b.accentHue)) / 180;
  const similarity =
    0.12 * same(a.language, b.language) +
    0.1 * same(a.header, b.header) +
    0.16 * same(a.hero, b.hero) +
    0.25 * jaccard(a.sections, b.sections) +
    0.06 * same(a.cta, b.cta) +
    0.08 * same(a.footer, b.footer) +
    0.1 * same(a.fonts, b.fonts) +
    0.03 * same(a.radius, b.radius) +
    0.05 * (1 - hueGap) +
    0.05 * jaccard(a.pages, b.pages);
  return Math.round((1 - similarity) * 100) / 100;
}

/** Distances deux à deux et minimum : sous 0,35, deux thèmes sont considérés comme le même gabarit. */
export function diversityReport(specs: Record<string, ThemeSpec>) {
  const sigs = Object.fromEntries(Object.entries(specs).map(([k, s]) => [k, signatureOf(s)]));
  const keys = Object.keys(sigs);
  const pairs: { a: string; b: string; distance: number }[] = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) pairs.push({ a: keys[i], b: keys[j], distance: themeDistance(sigs[keys[i]], sigs[keys[j]]) });
  const min = pairs.length ? Math.min(...pairs.map((p) => p.distance)) : 1;
  const mean = pairs.length ? Math.round((pairs.reduce((s, p) => s + p.distance, 0) / pairs.length) * 100) / 100 : 1;
  return { signatures: sigs, pairs, min, mean, sameTemplate: pairs.filter((p) => p.distance < 0.35) };
}
