/**
 * Mission E (issue #137, 19 octobre) — trois catégories de projet, éligibilité des thèmes, recommandation lue depuis le
 * contrat du parcours amont, galerie de sections strictement contextuelle et refus des sections incompatibles par
 * toutes les voies (bibliothèque, commandes locales, opérations serveur, consignes IA).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { storeKindOf } from "../src/lib/theme/store-kind";
import { themeFits, themeKinds, themeFitReason, REFERENCE_THEMES } from "../src/lib/theme/theme-fit";
import { incompatibleSections, sectionFitReason, SECTION_FIT } from "../src/lib/theme/section-fit";
import { compatibleSectionTypes, sectionIncompatibility } from "../src/lib/theme/section-compat";
import { availableSectionTypes, type ThemeSpec } from "../src/lib/theme/spec";
import { applyOps } from "../src/lib/theme/ops";
import { localThemeCommand } from "../src/lib/engine/local";
import { themeReference } from "../src/lib/ai/tasks";
import { addable } from "../src/lib/theme/section-library";
import { DIRECTIONS } from "../src/lib/theme/directions";
import { sampleSpec } from "./fixtures";
import { runWithLang } from "../src/lib/i18n-server";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

describe("Catégories du projet (prestations de services / e-commerce / boutique spécialisée)", () => {
  it("classe d'après le modèle de vente et le catalogue, jamais d'après le nom du produit", () => {
    expect(storeKindOf({ business: "services", storeType: "mono", catalogSize: 0 })).toMatchObject({ kind: "services", confidence: "sure", source: "rules" });
    expect(storeKindOf({ business: "products", storeType: "mono", catalogSize: 0 })).toMatchObject({ kind: "specialty", confidence: "sure" });
    expect(storeKindOf({ business: "products", storeType: "multi", catalogSize: 30 })).toMatchObject({ kind: "catalog", confidence: "sure" });
    expect(storeKindOf({ business: "products", storeType: "niche", catalogSize: 3 })).toMatchObject({ kind: "specialty", confidence: "sure" });
  });
  it("pose une question simple en cas de vraie ambiguïté, et respecte la réponse du client", () => {
    const ambiguous = storeKindOf({ business: "products", storeType: "niche", catalogSize: 8 });
    expect(ambiguous.confidence).toBe("ask");
    expect(ambiguous.question?.fr).toMatch(/boutique spécialisée|e-commerce/);
    expect(storeKindOf({ business: "products", storeType: "niche", catalogSize: 8, override: "catalog" })).toMatchObject({ kind: "catalog", confidence: "sure", source: "client" });
    // Objectif « devis » sur un projet de produits : la catégorie n'est pas imposée, la question est posée.
    expect(storeKindOf({ business: "products", storeType: "mono", catalogSize: 0, objective: "quote" }).confidence).toBe("ask");
  });
  it("la recommandation du parcours amont prime sur les règles locales, pas sur le choix du client", () => {
    expect(storeKindOf({ business: "products", storeType: "niche", catalogSize: 8, prepared: "specialty" })).toMatchObject({ kind: "specialty", source: "preparation" });
    expect(storeKindOf({ business: "products", storeType: "niche", catalogSize: 8, prepared: "specialty", override: "catalog" })).toMatchObject({ kind: "catalog", source: "client" });
  });
});

describe("Éligibilité des thèmes par catégorie", () => {
  it("FRAISE → boutique spécialisée ; ORBE et ONDE (refonte de l'issue #158) → e-commerce ; Atelier Rive → prestations ; les 30 anciens thèmes retirés ne servent plus aucune catégorie", () => {
    expect(themeKinds("fraise")).toEqual(["specialty"]);
    expect(themeKinds("onde")).toEqual(["catalog"]);
    expect(themeKinds("orbe")).toEqual(["catalog"]);
    expect(themeKinds("rive")).toEqual(["services"]);
    for (const d of DIRECTIONS) if (!(REFERENCE_THEMES as readonly string[]).includes(d.id)) expect(themeKinds(d.id)).toEqual([]);
    expect(themeFits("fraise", "catalog")).toBe(false);
    expect(themeFitReason("rive", "specialty", "fr")).toMatch(/prestations de services/);
    expect(themeFitReason("vitrine", "specialty")).toMatch(/retiré du catalogue/);
  });
});

describe("Galerie « Sections » strictement contextuelle", () => {
  let vitrine: ThemeSpec;
  beforeAll(() => { vitrine = sampleSpec("vitrine"); });

  it("déclare la compatibilité par métadonnées explicites, pas par le nom", () => {
    expect(SECTION_FIT["cv-hero"]).toMatchObject({ kinds: ["catalog", "specialty"], themes: ["fraise", "sillon", "noctil", "traverse", "museau-club", "souple"], profiles: ["conversion"] });
    expect(SECTION_FIT["ed-opening"]).toMatchObject({ themes: ["orbe", "rive", "heuren", "alcove", "souple"] });
    expect(SECTION_FIT["services-list"]).toEqual({ kinds: ["services"] });
    expect(SECTION_FIT["faq"]).toBeUndefined(); // transversale : rendue dans le style du thème actif
    expect(SECTION_FIT["image-with-text"]).toBeUndefined();
    expect(SECTION_FIT["contact-form"]).toBeUndefined();
  });

  it("un thème du catalogue sans profil « conversion » ne propose aucune section cv-* ni ed-* ; un site de services n'a ni fiche ni offres", () => {
    const shop = compatibleSectionTypes(vitrine, "specialty");
    expect(shop.some((t) => t.startsWith("cv-"))).toBe(false);
    expect(shop.some((t) => t.startsWith("ed-"))).toBe(false);
    expect(shop).toContain("faq");
    expect(shop).toContain("featured-purchase");
    expect(shop).not.toContain("services-list");
    const services = compatibleSectionTypes(vitrine, "services");
    expect(services).toContain("services-list");
    expect(services).toContain("faq");
    for (const t of ["featured-purchase", "purchase-offers", "featured-product", "featured-collection", "comparison-table"]) expect(services, t).not.toContain(t);
    // Bandeau d'appel : « Contact et prise de rendez-vous » de la bibliothèque des services (issue #145).
    expect(services).toContain("cta-banner");
    // Les composants structurels ne sont jamais filtrés par la catégorie (ils se règlent, ne s'ajoutent pas).
    for (const t of availableSectionTypes(vitrine).filter((x) => !addable(x))) expect(sectionIncompatibility(vitrine, t, "services")).toBe("");
  });

  it("le profil « conversion » activé sur un thème ouvre les sections cv-* (rendu adapté), le thème importé n'est jamais filtré", () => {
    const withProfile = { ...vitrine, settings: { ...vitrine.settings, conversion_profile: "pop" } } as ThemeSpec;
    expect(compatibleSectionTypes(withProfile, "specialty")).toContain("cv-hero");
    expect(sectionFitReason("cv-hero", { kind: "services", theme: "fraise" })).toMatch(/prestations de services/);
    expect(sectionIncompatibility({ ...vitrine, imported: { name: "x" } as never }, "cv-hero", "services")).toBe("");
  });

  it("l'ajout manuel et par le serveur refuse une section incompatible, avec le motif (même règle que la galerie)", () => {
    const r = fr(() => applyOps(vitrine, [{ op: "add_section", template: "index", type: "cv-hero" }], { storeKind: "specialty" }));
    expect(r.applied).toEqual([]);
    expect(r.rejected[0]?.reason).toMatch(/incompatible/);
    const s = fr(() => applyOps(vitrine, [{ op: "add_section", template: "index", type: "services-list" }], { storeKind: "specialty" }));
    expect(s.rejected[0]?.reason).toMatch(/boutique spécialisée/);
    // Une section transversale compatible s'ajoute normalement.
    const ok = fr(() => applyOps(vitrine, [{ op: "add_section", template: "index", type: "faq" }], { storeKind: "specialty" }));
    expect(ok.applied.length).toBe(1);
    // Remplacement par un type incompatible : refusé aussi.
    const first = vitrine.templates.index.order[0];
    const rep = fr(() => applyOps(vitrine, [{ op: "replace_section", template: "index", section: first, type: "ed-opening" }], { storeKind: "specialty", targeted: new Set([`index:${first}`]) }));
    expect(rep.rejected[0]?.reason).toMatch(/incompatible/);
  });

  it("les commandes locales et les consignes données à l'IA ne voient que les sections compatibles", () => {
    const r = fr(() => localThemeCommand(vitrine, "ajoute une FAQ", null, "products", "specialty"));
    expect(r.ops.length).toBeGreaterThan(0); // FAQ : transversale
    // Candidat « tarifs » connu du moteur local (activité de services) mais catégorie « boutique spécialisée » : refusé.
    const svc = fr(() => localThemeCommand(vitrine, "ajoute les tarifs", null, "services", "specialty"));
    expect(svc.ops).toEqual([]);
    expect(svc.reply).toMatch(/pour cette activité/);
    const ref = themeReference(vitrine, true, "services");
    expect(ref).not.toMatch(/^- featured-purchase /m);
    expect(ref).not.toMatch(/^- cv-hero /m);
    expect(ref).toMatch(/^- faq /m);
    expect(ref).toMatch(/^- services-list /m);
  });

  it("après un changement de thème ou de catégorie, les sections devenues incompatibles sont identifiées, jamais supprimées", () => {
    const withProfile = { ...vitrine, settings: { ...vitrine.settings, conversion_profile: "pop" } } as ThemeSpec;
    const added = fr(() => applyOps(withProfile, [{ op: "add_section", template: "index", type: "cv-guarantee" }], { storeKind: "specialty" })).spec;
    expect(incompatibleSections(added, "specialty")).toEqual([]);
    // Le profil disparaît (autre thème) : la section existe toujours dans le thème, et elle est signalée.
    const switched = { ...added, settings: { ...added.settings, conversion_profile: "none" } } as ThemeSpec;
    const list = incompatibleSections(switched, "specialty");
    expect(list.map((x) => x.type)).toContain("cv-guarantee");
    expect(Object.values(switched.templates.index.sections).some((s) => s.type === "cv-guarantee")).toBe(true);
    // Catégorie « prestations » : la fiche produit à la une d'une boutique est signalée.
    const asServices = incompatibleSections(vitrine, "services");
    expect(asServices.some((x) => ["featured-purchase", "featured-product", "cta-banner", "featured-collection"].includes(x.type))).toBe(true);
  });
});
