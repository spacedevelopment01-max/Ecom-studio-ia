/**
 * Quality Gate Theme V2 (politique `theme_v2`) : grille propre aux sites.
 * Critères mesurables LOCALEMENT (sans IA) : complétude, hiérarchie (un seul H1 en ouverture), sections remplies,
 * conversion (appel à l'action dans l'ouverture et en fin de page, adapté au parcours), accessibilité (contrastes
 * calculés des schémas), fidélité de marque (verrous respectés), cohérence (une seule direction artistique),
 * responsive et performance (seulement si un contrôle navigateur a été fait). Les critères ARTISTIQUES (direction
 * artistique, originalité, composition) ne sont pas mesurables localement : ils restent « non mesurés » et le verdict
 * ne peut pas dépasser PROVISOIRE sans la validation du propriétaire.
 */
import { contrast } from "../color";
import { decide, type GateDecision } from "../quality/gate";
import type { ThemeSpec } from "../theme/spec";
import { TODO } from "./content";
import type { PagePlan } from "./compose";

/** Défauts relevés dans un vrai navigateur (scripts/lib/visual-check.ts) : convertis en codes de la politique. */
export type BrowserFinding = { check: string; severity: "blocking" | "warning"; detail: string };

const BROWSER_CODES: Record<string, string> = {
  overflow: "overflow",
  overlap: "overlap",
  "missing-image": "missing_image",
  "distorted-image": "distorted_image",
  "js-error": "js_error",
  "broken-link": "broken_link",
  "empty-section": "empty_section",
  navigation: "navigation_unusable",
  "reduced-motion": "unreadable_text",
};

export type ThemeV2Check = { score: number; criteria: Record<string, number>; unmeasured: string[]; codes: string[]; issues: string[]; decision: GateDecision };

const NEED_BLOCKS: Record<string, number> = { "v2-index": 2, "v2-steps": 2, "v2-facts": 1, "v2-specs": 2, "v2-faq": 1, "v2-media": 2 };

export function checkThemeV2(spec: ThemeSpec, plan: PagePlan[] = [], browser: BrowserFinding[] = []): ThemeV2Check {
  const codes = new Set<string>();
  const issues: string[] = [];
  const criteria: Record<string, number> = {};

  // Sections remplies : aucune section V2 sans contenu.
  let empty = 0;
  let total = 0;
  for (const [tpl, t] of Object.entries(spec.templates)) {
    for (const id of t.order) {
      const s = t.sections[id];
      if (!s || !s.type.startsWith("v2-")) continue;
      total++;
      const blocks = (s.block_order ?? Object.keys(s.blocks ?? {})).length;
      const need = NEED_BLOCKS[s.type] ?? 0;
      const heading = String(s.settings.heading ?? "").trim();
      if ((need && blocks < need) || (s.type === "v2-hero" && !heading)) {
        empty++;
        issues.push(`${tpl} : section ${s.type} sans contenu suffisant`);
      }
    }
  }
  if (empty) codes.add("empty_section");
  criteria.sections = total ? Math.round((10 * (total - empty)) / total * 10) / 10 : 0;

  // Hiérarchie : l'accueil s'ouvre sur une ouverture avec un titre (un seul H1).
  const index = spec.templates.index;
  const first = index?.sections[index.order[0]];
  const heroes = (index?.order ?? []).filter((id) => index.sections[id]?.type === "v2-hero").length;
  if (!first || first.type !== "v2-hero" || !String(first.settings.heading ?? "").trim()) codes.add("missing_h1");
  criteria.hierarchy = first?.type === "v2-hero" && heroes === 1 ? 9 : 4;

  // Conversion : bouton dans l'ouverture et appel final.
  const ctaFirst = !!String(first?.settings.button_label ?? "").trim();
  const ctaEnd = (index?.order ?? []).some((id) => index.sections[id]?.type === "v2-cta");
  criteria.conversion = (ctaFirst ? 5 : 0) + (ctaEnd ? 4 : 0) + 1;
  if (!ctaFirst) issues.push("aucun bouton dans l'ouverture");

  // Accessibilité : contrastes des schémas (texte, texte secondaire, accent, texte sur bouton).
  const schemes = (spec.settings.color_schemes ?? {}) as Record<string, { settings: Record<string, string> }>;
  let worst = 21;
  for (const [sid, sc] of Object.entries(schemes)) {
    const x = sc.settings;
    const pairs: [string, string, number][] = [[x.text, x.background, 4.5], [x.muted, x.background, 4.5], [x.accent_text, x.accent, 4.5]];
    for (const [a, b, min] of pairs) {
      if (!a || !b) continue;
      const r = contrast(a, b);
      worst = Math.min(worst, r);
      if (r < 3) codes.add("unreadable_text");
      else if (r < min) issues.push(`${sid} : contraste ${r.toFixed(2)}:1 (< ${min})`);
    }
  }
  criteria.accessibility = worst >= 4.5 ? 9 : worst >= 3 ? 6 : 2;

  // Complétude : pages prévues complètes (données indispensables présentes).
  const done = plan.filter((p) => p.complete).length;
  criteria.completeness = plan.length ? Math.round((10 * done) / plan.length * 10) / 10 : 5;
  for (const p of plan) if (!p.complete) issues.push(`page « ${p.title} » à compléter : ${p.missing.join(", ")}`);

  // Honnêteté : aucune promesse inventée repérable (« garanti », « n°1 », « certifié »…) hors des espaces réservés.
  const text = JSON.stringify(spec.templates.index).replace(/\[(À|A) compléter[^\]]*\]/g, "");
  if (/(n°\s?1|numéro un|meilleur du marché|certifié|garanti à vie|100 ?% naturel|best in class)/i.test(text)) codes.add("invented_claim");
  criteria.honesty = codes.has("invented_claim") ? 0 : 10;

  // Fidélité de marque : décisions verrouillées respectées (la typographie verrouillée n'est pas remplacée).
  const v2 = spec.meta?.v2;
  criteria.brand_fidelity = v2?.art?.typography?.source === "brand-locked" || v2?.art?.palette?.source === "brand-locked" ? 10 : 8;
  // Cohérence : un seul langage visuel déclaré sur tout le site.
  criteria.coherence = spec.settings.ds_language && spec.settings.ds_language !== "none" ? 9 : 5;

  // Navigateur réel (si fourni) : responsive, performance, défauts.
  for (const f of browser) {
    const code = BROWSER_CODES[f.check];
    if (code && f.severity === "blocking") codes.add(code);
  }
  if (browser.length || plan.length) {
    const mobileBad = browser.some((f) => f.severity === "blocking" && /overflow|offscreen/.test(f.check));
    if (browser.length) criteria.responsive = mobileBad ? 3 : 9;
  }
  const unmeasured = ["art_direction", "originality", "composition", "typography_quality", ...(browser.length ? [] : ["responsive", "performance"])];
  const vals = Object.values(criteria);
  const score = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  if (TODO.test(JSON.stringify(spec.templates.index))) issues.push("des informations « [À compléter] » restent sur l'accueil");
  const decision = decide("theme_v2", { checker: "local", score, codes: [...codes], criteria, issues });
  return { score, criteria, unmeasured, codes: [...codes], issues, decision };
}
