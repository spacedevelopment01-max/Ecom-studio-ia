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

describe("couleurs d'UN élément désigné (titre, bouton)", () => {
  it("titre désigné, « rouge sur fond jaune » : texte rouge et fond jaune de ce titre seulement", async () => {
    const { serviceSpec } = await import("./fixtures");
    const { compileTheme } = await import("@/lib/theme/compile");
    const { renderPage } = await import("@/lib/theme/render");
    const { exportWordPress } = await import("@/lib/cms-v2/adapters/wordpress");
    const { unzipSync, strFromU8 } = await import("fflate");
    const spec = serviceSpec("atelier");
    const id = spec.templates.index.order[0];
    const heading = String(spec.templates.index.sections[id].settings.heading ?? "");
    const sel = { template: "index", section: id, kind: "Titre", path: "section:nth-child(1) > div:nth-child(1) > h1:nth-child(2)", role: "heading", text: `${heading} et la suite` };
    const r = fr(() => localThemeCommand(spec, "met en rouge sur fond jaune", sel));
    expect(r.ops).toEqual([expect.objectContaining({ op: "element_style", path: sel.path, color: "#B42318", background: "#F2C94C" })]);
    expect(r.reply).toMatch(/uniquement/);
    const out = fr(() => applyOps(spec, r.ops));
    expect(out.rejected).toEqual([]);
    // Rien d'autre ne bouge : schémas de couleurs identiques.
    expect(out.spec.settings.color_schemes).toEqual(spec.settings.color_schemes);
    // Thème : feuille dédiée, chargée dans le <head>, visant ce seul élément.
    const files = compileTheme(out.spec);
    const css = files.get("snippets/es-element-styles.liquid")!;
    expect(css).toContain(`#shopify-section-${id} > ${sel.path}`);
    expect(css).toContain(`[id^="shopify-section-"][id$="__${id}"] > ${sel.path}`);
    expect(css).toMatch(/color:#B42318!important/);
    expect(css).toMatch(/background-color:#F2C94C!important/);
    expect(files.get("layout/theme.liquid")).toContain("{% render 'es-element-styles' %}");
    const html = (await renderPage({ spec: out.spec, base: "/p", files, cart: [] }, "/", new URLSearchParams())).html;
    expect(html).toContain('id="es-element-styles"');
    // Export WordPress : même feuille ciblée que dans le studio (les sections y gardent l'identifiant du studio).
    if (heading) {
      const { zip } = await exportWordPress(out.spec, () => null);
      const files = unzipSync(new Uint8Array(zip));
      const design = strFromU8(Object.entries(files).find(([f]) => f.endsWith("assets/css/es-design.css"))![1]);
      expect(design).toContain(`#shopify-section-${id} > ${sel.path}`);
      expect(design).toMatch(/color:#B42318!important/);
      expect(design).toMatch(/background-color:#F2C94C!important/);
      const front = strFromU8(Object.entries(files).find(([f]) => f.endsWith("templates/front-page.html"))![1]);
      expect(front).toContain(`"sectionId":"${id}"`);
    }
  });

  it("bouton désigné : lui seul change (fond), texte lisible ; « tous les boutons » reste global", () => {
    const spec = sampleSpec();
    const id = spec.templates.index.order[0];
    const sel = { template: "index", section: id, kind: "Bouton", path: "section:nth-child(1) > div:nth-child(1) > a:nth-child(3)", role: "button", text: "Découvrir" };
    const r = fr(() => localThemeCommand(spec, "mets ce bouton en rouge", sel));
    expect(r.ops).toEqual([expect.objectContaining({ op: "element_style", role: "button", background: "#B42318" })]);
    const out = fr(() => applyOps(spec, r.ops));
    expect(out.spec.elementStyles?.[0]).toMatchObject({ background: "#B42318", color: "#FFFFFF" });
    expect(out.spec.settings.color_schemes).toEqual(spec.settings.color_schemes);
    const all = fr(() => localThemeCommand(spec, "mets tous les boutons en rouge", sel));
    expect(all.ops[0]).toMatchObject({ op: "set_scheme_color" });
  });

  it("chemin d'élément refusé s'il n'est pas un simple chemin de balises", () => {
    const spec = sampleSpec();
    const id = spec.templates.index.order[0];
    const out = applyOps(spec, [{ op: "element_style", template: "index", section: id, path: "h1{} body{display:none", color: "#B42318" }]);
    expect(out.rejected).toHaveLength(1);
  });
});
