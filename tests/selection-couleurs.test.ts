/**
 * Ce qui est sélectionné dans l'aperçu est bien la cible : « mets en rouge sur fond jaune » sur un titre ne repeint
 * jamais la section ni tout le site ; sur une section, seule cette section change (schéma de couleurs dédié).
 */
import { describe, expect, it } from "vitest";
import { applyOps } from "@/lib/theme/ops";
import { localThemeCommand } from "@/lib/engine/local";
import { runWithLang } from "@/lib/i18n-server";
import { sampleSpec } from "./fixtures";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

describe("couleurs : la sélection est respectée", () => {
  const spec = sampleSpec();
  const index = spec.templates.index;
  const [first, second] = index.order;
  const schemes = () => spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>;

  it("titre sélectionné : rien n'est repeint, la réponse le dit", () => {
    const r = fr(() => localThemeCommand(spec, "met en rouge sur fond jaune", { template: "index", section: first, kind: "Titre" }));
    expect(r.ops).toHaveLength(0);
    expect(r.reply).toMatch(/Rien n'a été modifié/);
    expect(r.reply).toMatch(/Toute la section/);
  });

  it("section sélectionnée : seule cette section change (texte rouge, fond jaune)", () => {
    const r = fr(() => localThemeCommand(spec, "met en rouge sur fond jaune", { template: "index", section: first, kind: "Section" }));
    expect(r.ops).toEqual([{ op: "section_colors", template: "index", section: first, colors: { background: expect.any(String), text: "#B42318" } }]);
    const before = JSON.stringify(schemes());
    const out = fr(() => applyOps(spec, r.ops));
    expect(out.rejected).toEqual([]);
    const s1 = out.spec.templates.index.sections[first];
    const s2 = out.spec.templates.index.sections[second];
    const all = out.spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>;
    expect(s1.settings.color_scheme).toBe(`es-${first}`.replace(/[^\w-]/g, "-").slice(0, 40));
    expect(all[s1.settings.color_scheme as string].settings.text).toBe("#B42318");
    // Les schémas existants (partagés par les autres sections) ne bougent pas.
    for (const [k, v] of Object.entries(JSON.parse(before))) expect(all[k]).toEqual(v);
    expect(s2.settings.color_scheme).toBe(spec.templates.index.sections[second].settings.color_scheme);
  });

  it("section en une seule couleur : le fond ; texte lisible garanti", () => {
    const r = fr(() => localThemeCommand(spec, "mets la section en noir", { template: "index", section: first, kind: "Section" }));
    const out = fr(() => applyOps(spec, r.ops));
    const sc = (out.spec.settings.color_schemes as any)[out.spec.templates.index.sections[first].settings.color_scheme as string].settings;
    expect(sc.background).toBe("#111111");
    expect(sc.text).toBe("#FFFFFF");
  });

  it("sans sélection : le fond principal, annoncé comme global", () => {
    const r = fr(() => localThemeCommand(spec, "fond beige", null));
    expect(r.ops[0]).toMatchObject({ op: "set_scheme_color", scheme: "scheme-1", key: "background" });
    expect(r.reply).toMatch(/toutes les sections/);
  });

  it("couleurs à accent ou en deux mots reconnues (doré, crème, bleu nuit)", () => {
    const sel = { template: "index", section: first, kind: "Section" };
    expect(fr(() => localThemeCommand(spec, "fond doré", sel)).ops[0]).toMatchObject({ colors: { background: "#B8913A" } });
    expect(fr(() => localThemeCommand(spec, "texte bleu nuit sur fond crème", sel)).ops[0]).toMatchObject({ colors: { background: "#F3EBDD", text: "#1E2A4A" } });
  });
});
