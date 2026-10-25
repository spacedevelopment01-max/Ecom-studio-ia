/**
 * Catalogue proposé (mission #190) : seuls les thèmes refaits d'après les maquettes de Thomas. Tout ce qui PROPOSE un
 * thème (galerie, IA, commandes locales, recommandation, moteur local) ne connaît qu'eux ; les trente anciens thèmes et
 * les deux thèmes créés avant les maquettes (ORBE, ALCÔVE) restent lisibles pour les projets qui les utilisent
 * (composition, rendu), ne sont jamais proposés, et aucun filtre vide ne réintroduit l'ancien catalogue en repli.
 */
import { describe, expect, it } from "vitest";
import { ACTIVE_DIRECTIONS, DIRECTIONS, directionCards, isRetiredDirection } from "../src/lib/theme/directions";
import { ACTIVE_THEMES, themeKinds, themeFitReason, retiredThemeReason } from "../src/lib/theme/theme-fit";
import { themeAllowed, planForTheme, themeStatus } from "../src/lib/theme/theme-access";
import { DIRECTION_LIST } from "../src/lib/ai/prompts";
import { localBrand, localThemeCommand, SECTOR_DIRECTION } from "../src/lib/engine/local";
import { emptyProduct, emptyServiceProfile } from "../src/lib/project-types";
import { sectionIncompatibility } from "../src/lib/theme/section-compat";
import { sampleSpec } from "./fixtures";
import { runWithLang } from "../src/lib/i18n-server";

const fr = <T,>(f: () => T) => runWithLang({ ui: "fr", content: "fr" }, f);

describe("Catalogue proposé : thèmes sur maquettes, anciens lisibles", () => {
  it("quinze thèmes sur maquettes proposés ; ORBE, ALCÔVE et les trente anciens sont « retirés », jamais inconnus", () => {
    expect([...ACTIVE_THEMES]).toEqual(["fraise", "onde", "rive", "sillon", "noctil", "traverse", "heuren", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"]);
    expect(ACTIVE_DIRECTIONS.map((d) => d.id)).toEqual(["fraise", "onde", "rive", "sillon", "noctil", "traverse", "heuren", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"]);
    expect(DIRECTIONS.length).toBe(47);
    for (const d of DIRECTIONS) {
      const active = (ACTIVE_THEMES as readonly string[]).includes(d.id);
      expect(themeStatus(d.id)).toBe(active ? "active" : "retired");
      expect(isRetiredDirection(d.id)).toBe(!active);
      if (!active) { expect(themeFitReason(d.id, "specialty")).toBe(retiredThemeReason("fr", d.id)); expect(planForTheme(d.id)).toBeNull(); expect(themeAllowed("dominer", d.id)).toBe(false); }
      // Plus de familles : un thème proposé convient à toute catégorie de projet.
      else for (const k of ["services", "catalog", "specialty"] as const) expect(themeFitReason(d.id, k)).toBe("");
    }
    expect(themeStatus("inexistant")).toBe("unknown");
    expect(isRetiredDirection("inexistant")).toBe(false);
  });

  it("galerie : seuls les actifs, plus le thème installé d'un projet existant s'il est retiré (signalé), jamais un autre ancien thème", () => {
    expect(directionCards("fr").map((c) => c.id)).toEqual(["fraise", "onde", "rive", "sillon", "noctil", "traverse", "heuren", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"]);
    expect(directionCards("en", ["jardin", "signal"]).map((c) => c.id)).toEqual(["jardin", "signal", "fraise", "onde", "rive", "sillon", "noctil", "traverse", "heuren", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"]);
    expect(directionCards("fr", ["jardin"]).find((c) => c.id === "jardin")?.retired).toBe(true);
    // ORBE (créé avant les maquettes) : listé seulement pour le projet qui l'utilise, signalé « retiré ».
    expect(directionCards("fr", ["orbe"]).find((c) => c.id === "orbe")?.retired).toBe(true);
    expect(directionCards("fr").some((c) => c.id === "orbe" || c.id === "alcove")).toBe(false);
    expect(directionCards("fr", ["fraise"]).map((c) => c.id)).toEqual(["fraise", "onde", "rive", "sillon", "noctil", "traverse", "heuren", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"]);
  });

  it("IA et commandes locales : seuls les thèmes actifs sont connus ; « passe en thème Vitrine » ne change rien", () => {
    expect(DIRECTION_LIST.split("\n").map((l) => l.split(" ")[0])).toEqual(["fraise", "onde", "rive", "sillon", "noctil", "traverse", "heuren", "museau-club", "souple", "table-saison", "atelier-nuance", "parenthese", "phase", "maison-horizon", "aplat"]);
    const spec = sampleSpec("fraise");
    const r = fr(() => localThemeCommand(spec, "passe en thème Vitrine", null));
    expect(JSON.stringify(r).includes("Vitrine")).toBe(false);
    const ok = fr(() => localThemeCommand(spec, "passe en thème Onde", null));
    expect(ok.reply).toMatch(/ONDE|Onde/);
  });

  it("moteur local : la direction par défaut est un thème proposé (services → Rive, plusieurs produits → SOUPLE, un produit → FRAISE ou ONDE)", () => {
    for (const id of Object.values(SECTOR_DIRECTION)) expect((ACTIVE_THEMES as readonly string[]).includes(id)).toBe(true);
    const product = { ...emptyProduct(), name: "Casque", sector: "hightech" as const };
    expect(localBrand(product, "Test", { business: "products" } as never).brand.direction).toBe("onde");
    expect(localBrand({ ...product, sector: "maison" as const }, "Test", { business: "products" } as never).brand.direction).toBe("fraise");
    expect(localBrand({ ...product, sector: "maison" as const }, "Test", { business: "products", storeType: "multi" } as never).brand.direction).toBe("souple");
    expect(localBrand({ ...product, sector: "services" as never }, "Test", { business: "services", services: { ...emptyServiceProfile(), services: [{ key: "a", name: "Conseil", description: "" }] } } as never).brand.direction).toBe("rive");
  });

  it("compatibilité de lecture : un projet composé dans un ancien thème se compose et se lit encore ; ses sections de référence ne sont plus proposées ailleurs", () => {
    const legacy = sampleSpec("vitrine");
    expect(legacy.direction).toBe("vitrine");
    expect(legacy.templates.index.order.length).toBeGreaterThan(3);
    // Les sections « ref-* » ne sont plus déclarées pour Vitrine / Jardin (retirés) : un projet FRAISE ne les reçoit pas non plus.
    expect(fr(() => sectionIncompatibility(sampleSpec("fraise"), "ref-hero", "specialty", "fr"))).not.toBe("");
    // Bibliothèques par famille (issue #141) : « ref-hero » n'est plus proposée non plus en e-commerce (l'ouverture d'ORBE
    // est « ed-opening ») ; sans catégorie (lecture d'un projet enregistré), elle reste rendue par ORBE.
    expect(fr(() => sectionIncompatibility(sampleSpec("orbe"), "ref-hero", "catalog", "fr"))).not.toBe("");
    expect(fr(() => sectionIncompatibility(sampleSpec("orbe"), "ref-hero", null, "fr"))).toBe("");
  });
});
