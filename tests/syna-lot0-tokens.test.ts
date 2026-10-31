/** SYNA lot 0 (#282) : couleurs de syna.css identiques aux jetons, et contraste AA de tous les couples utilisés. */
import { describe, expect, it } from "vitest";
import { SYNA_ACCENTS, SYNA_ACCENT_SETS, SYNA_DEFAULT_ACCENT, SYNA_MODES, SYNA_PALETTES, SYNA_SCHEMES, contrastChecks, contrastRatio } from "@/lib/syna-ui/tokens";
import { SYNA_CSS, customProps, readCss } from "./syna-lot0-css";

const kebab = (k: string) => k.replace(/([A-Z0-9])/g, (m) => "-" + m.toLowerCase()).replace(/-(\d)/, "$1");
const sheet = readCss(SYNA_CSS);
/** Schéma visé par un sélecteur : sombre explicite, ou « auto » sous le thème sombre du Studio ou de l'appareil. */
const schemeOf = (sel: string, atRules: string[]): "light" | "dark" =>
  sel.includes('data-syna-scheme="dark"') || (sel.includes('data-syna-scheme="auto"') && (sel.includes(':root[data-theme="dark"]') || atRules.some((a) => a.includes("prefers-color-scheme: dark")))) ? "dark" : "light";

describe("contraste", () => {
  it("calcule le rapport WCAG", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(() => contrastRatio("bleu", "#FFFFFF")).toThrow();
  });
  it("tous les couples texte / fond atteignent 4,5:1 et les contours 3:1 (2 modes × 2 schémas × 3 bleus)", () => {
    const checks = contrastChecks();
    expect(checks.length).toBeGreaterThanOrEqual(2 * 2 * 3 * 25);
    const failures = checks.filter((c) => c.ratio < c.min).map((c) => `${c.mode}/${c.scheme}/${c.accent} ${c.fg} sur ${c.bg} : ${c.ratio.toFixed(2)}`);
    expect(failures).toEqual([]);
  });
});

describe("syna.css reprend exactement les jetons", () => {
  const paletteRules = sheet.rules.filter((r) => customProps(r.body)["--sy-paper"]);
  const accentRules = sheet.rules.filter((r) => r.selectors.some((s) => s.includes("data-syna-accent=")));

  it("chaque palette (mode × schéma) a ses valeurs, y compris le réglage « comme le Studio »", () => {
    const seen = new Set<string>();
    for (const rule of paletteRules) for (const sel of rule.selectors) {
      const mode = sel.includes('data-syna-mode="plein"') ? "plein" : "encre";
      const scheme = schemeOf(sel, rule.atRules);
      const props = customProps(rule.body);
      const expected = { ...SYNA_PALETTES[mode][scheme], ...SYNA_ACCENT_SETS[SYNA_DEFAULT_ACCENT[mode]][scheme] } as Record<string, string>;
      for (const [k, v] of Object.entries(expected)) expect(props[`--sy-${kebab(k)}`], `${sel} ${k}`).toBe(v);
      seen.add(`${mode}/${scheme}/${sel.includes("auto") ? (rule.atRules.length ? "media" : "theme") : "explicit"}`);
    }
    for (const m of SYNA_MODES) {
      expect(seen.has(`${m}/light/explicit`)).toBe(true);
      expect(seen.has(`${m}/dark/explicit`)).toBe(true);
      expect(seen.has(`${m}/dark/theme`)).toBe(true);
      expect(seen.has(`${m}/dark/media`)).toBe(true);
    }
  });

  it("les trois bleus ont leurs valeurs claires et sombres", () => {
    const seen = new Set<string>();
    for (const rule of accentRules) for (const sel of rule.selectors) {
      const accent = /data-syna-accent="(\w+)"/.exec(sel)![1] as (typeof SYNA_ACCENTS)[number];
      const scheme = schemeOf(sel, rule.atRules);
      const props = customProps(rule.body);
      for (const [k, v] of Object.entries(SYNA_ACCENT_SETS[accent][scheme])) expect(props[`--sy-${kebab(k)}`], `${sel} ${k}`).toBe(v);
      seen.add(`${accent}/${scheme}`);
    }
    for (const a of SYNA_ACCENTS) for (const s of SYNA_SCHEMES) expect(seen.has(`${a}/${s}`), `${a}/${s}`).toBe(true);
  });
});
