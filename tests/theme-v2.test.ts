/**
 * Theme Engine V2 (phase 10A) — moteur local de création de sites : intention du site, direction artistique,
 * design system (contrastes), planificateur de pages (pages incomplètes signalées), composition (aucune section vide,
 * aucun contenu inventé), retouches locales ciblées, Quality Gate (jamais FINAL en local), diversité entre projets,
 * export Shopify (Theme Check officiel), branchement par défaut de buildShop, aucune dépense d'IA.
 * Les contrôles visuels réels se font dans un navigateur (scripts/theme-v2-bench.ts), pas ici.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Theme Engine V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject, listThemeVersions, currentTheme } = await import("@/lib/projects");
  const { run, one } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { websiteIntent } = await import("@/lib/theme-v2/intent");
  const { artDirection, LANGUAGES } = await import("@/lib/theme-v2/art-direction");
  const { colorSchemesV2, designSettings } = await import("@/lib/theme-v2/design-system");
  const { composeThemeV2, buildShopV2 } = await import("@/lib/theme-v2/engine");
  const { checkThemeV2 } = await import("@/lib/theme-v2/quality");
  const { diversityReport, signatureOf, themeDistance } = await import("@/lib/theme-v2/diversity");
  const { v2ThemeCommand, isV2, TYPE_PAIRINGS } = await import("@/lib/theme-v2/local-edit");
  const { applyOps, validateSpec } = await import("@/lib/theme/ops");
  const { contrast } = await import("@/lib/color");
  const { buildShop } = await import("@/lib/engine/shop");
  const { exportThemeZip } = await import("@/lib/theme/compile");
  const { libraryLoader } = await import("@/lib/theme/loader");
  const { POLICIES } = await import("@/lib/quality/policies");
  const { seedThemeScenario, THEME_SCENARIOS } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`theme2-${Date.now()}@test.fr`, "motdepasse-test", "T");
  const ids: Record<string, string> = {};
  for (const s of THEME_SCENARIOS) ids[s] = await seedThemeScenario(u.id, s);
  const results: Record<string, Awaited<ReturnType<typeof composeThemeV2>>> = {};
  for (const s of THEME_SCENARIOS) results[s] = await fr(() => composeThemeV2(ids[s]));
  const aiCalls = () => one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls WHERE user_id = ?", u.id)!.n;

  it("intention : type de site et conversion déduits du métier (jamais du nom du client)", () => {
    const site = Object.fromEntries(THEME_SCENARIOS.map((s) => [s, results[s].intent.site]));
    expect(site).toEqual({ artisan: "services_trade", cosmetic: "shop_mono", hightech: "shop_mono", restaurant: "restaurant", saas: "saas" });
    expect(results.artisan.intent.conversion).toBe("quote");
    expect(results.saas.intent.conversion).toBe("demo");
    expect(results.cosmetic.intent.conversion).toBe("buy");
  });

  it("direction artistique : un langage visuel différent par projet, choisi par type de site et traits", () => {
    const langs = THEME_SCENARIOS.map((s) => results[s].art.language);
    expect(new Set(langs).size).toBe(5);
    for (const s of THEME_SCENARIOS) expect(LANGUAGES.map((l) => l.id)).toContain(results[s].art.language);
    // Langage imposé : respecté.
    const p = loadProject(ids.cosmetic);
    expect(fr(() => artDirection(p, websiteIntent(p), { language: "precision" })).language).toBe("precision");
  });

  it("verrous de marque : palette et typographies validées reprises telles quelles", () => {
    const p = loadProject(ids.cosmetic);
    const brand = { ...p.brand!, validated: ["palette", "fonts"], palette: { ...p.brand!.palette, accent: "#1F6F5C" }, fonts: { heading: "playfair_display_n6", body: "jost_n4" } } as typeof p.brand;
    const locked = { ...p, brand } as typeof p;
    const a = fr(() => artDirection(locked, websiteIntent(locked)));
    expect(a.palette.source).toBe("brand-locked");
    expect(a.typography.source).toBe("brand-locked");
    expect(a.typography.heading).toBe("playfair_display_n6");
    // La retouche « change la typographie » refuse de remplacer une typographie validée.
    const spec = structuredClone(results.cosmetic.spec);
    spec.meta!.v2!.art = { ...spec.meta!.v2!.art, typography: { ...a.typography } };
    const cmd = fr(() => v2ThemeCommand(spec, "Change la typographie", null))!;
    expect(cmd.ops).toEqual([]);
  });

  it("design system : contrastes des 4 schémas (texte ≥ 7:1, secondaire ≥ 4,5:1, bouton ≥ 4,5:1)", () => {
    for (const s of THEME_SCENARIOS) {
      const schemes = colorSchemesV2(results[s].art);
      for (const [id, { settings: x }] of Object.entries(schemes)) {
        expect(contrast(x.text, x.background), `${s} ${id} texte`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(x.muted, x.background), `${s} ${id} secondaire`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(x.accent_text, x.accent), `${s} ${id} bouton`).toBeGreaterThanOrEqual(4.5);
      }
      const d = designSettings(results[s].art);
      expect(d.ds_language).toBe(results[s].art.language);
      expect(results[s].spec.settings.ds_language).toBe(results[s].art.language);
    }
  });

  it("planificateur : pages adaptées au type de site, pages incomplètes signalées honnêtement", () => {
    const keys = (s: string) => results[s].plan.map((p) => p.key);
    expect(keys("artisan")).toContain("services");
    expect(keys("restaurant")).toContain("menu");
    expect(keys("saas")).toEqual(expect.arrayContaining(["features", "pricing"]));
    for (const s of THEME_SCENARIOS) {
      for (const p of results[s].plan) {
        expect(p.complete).toBe(p.missing.length === 0);
        if (p.template.startsWith("page.")) expect(results[s].spec.templates[p.template], `${s} ${p.template}`).toBeTruthy();
      }
    }
    // Restaurant sans carte confirmée, SaaS sans tarifs : signalés, jamais inventés.
    expect(results.restaurant.content.todo.join(" ")).toMatch(/carte/);
    expect(results.saas.content.todo.join(" ")).toMatch(/tarifs/);
  });

  it("composition : spécification valide, accueil ouvert par un seul héros, aucune section V2 vide", () => {
    for (const s of THEME_SCENARIOS) {
      const r = results[s];
      expect(validateSpec(r.spec), s).toEqual([]);
      const idx = r.spec.templates.index;
      expect(idx.sections[idx.order[0]].type).toBe("v2-hero");
      expect(idx.order.filter((id) => idx.sections[id].type === "v2-hero")).toHaveLength(1);
      const q = checkThemeV2(r.spec, r.plan);
      expect(q.codes, s).not.toContain("empty_section");
      expect(q.codes, s).not.toContain("invented_claim");
      expect(r.spec.meta?.engine).toBe("v2");
    }
    // Deux projets différents n'ont pas la même suite de sections (plus de gabarit commun high-tech / SaaS).
    const seq = (s: string) => results[s].spec.templates.index.order.map((id) => results[s].spec.templates.index.sections[id].type).join(">");
    expect(seq("hightech")).not.toBe(seq("saas"));
  });

  it("contenu : uniquement des faits confirmés (un fait déduit d'une photo n'est jamais affirmé)", () => {
    const cos = JSON.stringify({ t: results.cosmetic.spec.templates, d: results.cosmetic.spec.store.product.description_html });
    expect(cos).not.toMatch(/gel fluide/i);
    expect(cos).toMatch(/30 ml/);
    // Aucune note sans vrais avis sur la fiche produit.
    const main = Object.values(results.cosmetic.spec.templates.product.sections).find((x) => x.type === "main-product")!;
    expect(Object.values(main.blocks ?? {}).map((b) => b.type)).not.toContain("rating");
    // Sébastien Blanc : ni « Lorem », ni avis inventés ; l'ouverture nomme le métier et la ville.
    const sb = JSON.stringify(results.artisan.spec.templates.index);
    expect(sb).not.toMatch(/lorem|ipsum/i);
    expect(sb).not.toMatch(/"type":"(testimonials|reviews)"/);
    const hero = results.artisan.spec.templates.index.sections[results.artisan.spec.templates.index.order[0]];
    expect(`${hero.settings.heading} ${hero.settings.heading_em}`).toMatch(/Mâcon/);
    // Le SaaS n'a ni panier ni lien « Boutique ».
    expect(results.saas.spec.settings.cart_type).toBe("none");
    expect(JSON.stringify(results.saas.spec.store.menus)).not.toMatch(/Boutique/);
  });

  it("retouches locales ciblées : animations, disposition d'une section, ajout de FAQ — jamais tout le site", () => {
    const spec = results.artisan.spec;
    expect(isV2(spec)).toBe(true);
    const off = fr(() => v2ThemeCommand(spec, "Supprime les animations", null))!;
    expect(off.ops).toEqual([{ op: "set_global", key: "motion_enabled", value: false }]);
    const lay = fr(() => v2ThemeCommand(spec, "Change la disposition des prestations", null))!;
    expect(lay.ops).toHaveLength(1);
    expect(lay.ops[0]).toMatchObject({ op: "set_setting", key: "layout" });
    const { spec: after } = applyOps(spec, lay.ops);
    // Une seule section change ; le reste du site est identique.
    const changed = Object.keys(spec.templates.index.sections).filter((k) => JSON.stringify(spec.templates.index.sections[k]) !== JSON.stringify(after.templates.index.sections[k]));
    expect(changed).toHaveLength(1);
    const typo = fr(() => v2ThemeCommand(spec, "Change la typographie", null))!;
    expect(TYPE_PAIRINGS.map((p) => p.heading)).toContain(typo.ops[0] && (typo.ops[0] as { value: string }).value);
    const faq = fr(() => v2ThemeCommand(spec, "Ajoute une FAQ", null))!;
    expect(faq.ops[0]).toMatchObject({ op: "add_section", type: "v2-faq" });
    expect(JSON.stringify(faq.ops)).toMatch(/À compléter/);
    const { spec: withFaq } = applyOps(spec, faq.ops);
    expect(validateSpec(withFaq)).toEqual([]);
    // Un thème V1 n'est pas concerné.
    const v1 = structuredClone(spec);
    delete v1.meta;
    v1.settings.ds_language = "none";
    expect(v2ThemeCommand(v1, "Supprime les animations", null)).toBeNull();
  });

  it("Quality Gate theme_v2 : critères artistiques non mesurés, jamais FINAL sans le propriétaire", () => {
    expect(POLICIES.theme_v2).toBeTruthy();
    for (const s of THEME_SCENARIOS) {
      const q = checkThemeV2(results[s].spec, results[s].plan);
      expect(q.unmeasured).toEqual(expect.arrayContaining(["art_direction", "originality", "composition"]));
      expect(["PROVISIONAL", "RETRY", "REJECTED"]).toContain(q.decision.verdict);
    }
    // Un défaut bloquant relevé dans le navigateur empêche la validation.
    const bad = checkThemeV2(results.cosmetic.spec, results.cosmetic.plan, [{ check: "overflow", severity: "blocking", detail: "x" }]);
    expect(bad.codes).toContain("overflow");
    expect(bad.criteria.responsive).toBeLessThan(5);
  });

  it("diversité anti-gabarits : distance minimale > 0,35 entre les 5 projets ; changer les couleurs ne suffit pas", () => {
    const rep = diversityReport(Object.fromEntries(THEME_SCENARIOS.map((s) => [s, results[s].spec])));
    expect(rep.sameTemplate).toEqual([]);
    expect(rep.min).toBeGreaterThan(0.35);
    const a = signatureOf(results.cosmetic.spec);
    expect(themeDistance(a, { ...a, accentHue: (a.accentHue + 180) % 360 })).toBeLessThanOrEqual(0.05);
  });

  it("idempotence : même projet, même thème", async () => {
    const again = await fr(() => composeThemeV2(ids.restaurant));
    expect(JSON.stringify(again.spec.templates)).toBe(JSON.stringify(results.restaurant.spec.templates));
    expect(again.spec.settings.color_schemes).toEqual(results.restaurant.spec.settings.color_schemes);
  });

  it("export Shopify : ZIP réel avec sections V2, feuille de style et réglages — Theme Check sans erreur", async () => {
    const { check } = await import("@shopify/theme-check-node");
    const { unzipSync } = await import("fflate");
    const spec = results.artisan.spec;
    const { zip } = await exportThemeZip(spec, libraryLoader);
    const entries = unzipSync(new Uint8Array(zip));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "v2-export-"));
    for (const [p, data] of Object.entries(entries)) {
      fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
      fs.writeFileSync(path.join(dir, p), data);
    }
    for (const t of Object.values(spec.templates)) for (const id of t.order) expect(entries[`sections/${t.sections[id].type}.liquid`], t.sections[id].type).toBeTruthy();
    expect(entries["assets/theme-v2.css"]).toBeTruthy();
    expect(Buffer.from(entries["config/settings_data.json"]).toString()).toContain('"ds_language": "craft"');
    for (const pg of spec.store.pages) if (pg.template_suffix) expect(entries[`templates/page.${pg.template_suffix}.json`]).toBeTruthy();
    const offenses = await check(dir);
    expect(offenses.filter((o) => o.severity === 0).map((o) => `${o.check} ${o.uri}`)).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120_000);

  it("exports WordPress / PrestaShop / kits (CMS Engine V2) : le contenu et la composition des sections V2 sont repris", async () => {
    const { exportKit } = await import("@/lib/theme/platforms");
    const { exportWordPress } = await import("@/lib/cms-v2/adapters/wordpress");
    const { exportPrestaShop } = await import("@/lib/cms-v2/adapters/prestashop");
    const { unzipSync, strFromU8 } = await import("fflate");
    const spec = results.artisan.spec;
    const hero = spec.templates.index.sections[spec.templates.index.order[0]];
    const wp = unzipSync(new Uint8Array((await fr(() => exportWordPress(spec, libraryLoader))).zip));
    const front = strFromU8(wp[Object.keys(wp).find((n) => n.endsWith("templates/front-page.html"))!]);
    expect(front).toContain('"type":"v2-hero"');
    expect(front).toContain(String(hero.settings.heading));
    expect(Object.keys(wp).some((n) => n.endsWith("inc/sections/v2-hero.liquid"))).toBe(true);
    const ps = unzipSync(new Uint8Array((await fr(() => exportPrestaShop(spec, libraryLoader))).zip));
    const home = strFromU8(ps["templates/es/home.tpl"]);
    expect(home).toContain("v2-hero");
    expect(home).toContain(String(hero.settings.heading));
    const kit = unzipSync(new Uint8Array((await exportKit(spec, libraryLoader, "wix")).zip));
    expect(Object.values(kit).map((d) => strFromU8(d)).join("\n")).toContain(String(hero.settings.heading));
  }, 60_000);

  it("buildShop : V2 par défaut, version enregistrée avec son contrôle ; V1 conservé sur demande", async () => {
    const before = listThemeVersions(ids.hightech).length;
    await fr(() => buildShop(null, ids.hightech));
    const cur = currentTheme(ids.hightech)!;
    expect(cur.spec.meta?.engine).toBe("v2");
    expect(listThemeVersions(ids.hightech).length).toBe(before + 1);
    const v = await fr(() => buildShopV2(null, ids.hightech, { language: "craft" }));
    expect(v.language).toBe("craft");
    expect(v.quality.decision.verdict).not.toBe("FINAL");
    run("UPDATE projects SET settings_json = ? WHERE id = ?", JSON.stringify({ language: "fr", themeEngine: "v1" }), ids.saas);
    await fr(() => buildShop(null, ids.saas));
    expect(currentTheme(ids.saas)!.spec.meta?.engine).not.toBe("v2");
  }, 120_000);

  it("aucune dépense d'IA : tout le moteur V2 est local", () => {
    expect(aiCalls()).toBe(0);
  });
});
