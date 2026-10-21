/**
 * Garde-fou (retour de Thomas du 19 octobre, 15 h 07, commentaire 6270476740) : la démonstration FRAISE GUMMIES du studio
 * est TOUJOURS la composition complète de la référence Lumora (lot 2C), jamais une version réduite par le parcours
 * « thème du catalogue » (qui masque toute section sans contenu).
 *
 * ONDE AUDIO n'est plus la référence Pawish : Thomas a demandé sa refonte en thème E-commerce (issue #158, décision du
 * 21 octobre, 12 h 58). Sa nouvelle composition est figée ici de la même façon (liste ordonnée, aucune section masquée,
 * aucun retour des sections de l'ancienne composition).
 *
 * Le test fige la liste ordonnée des sections de l'accueil et de la fiche, vérifie qu'aucune n'est masquée, que le bon
 * thème est chargé, que les pages existent et que le rendu par la vraie route d'aperçu contient bien ces sections.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/compo-fo-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => false }));
import { createUser } from "@/lib/auth";
import { demoProject } from "./demo-fixtures";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { saveThemeVersion, themeVersion } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);

/** Composition attendue (inventaire des références : docs/coordination/LOT_2C_FRAISE_ONDE_INVENTAIRE.md). */
const EXPECTED = {
  fraise: {
    profile: "pop",
    index: ["cv-hero", "marquee", "cv-reviews", "cv-feature", "features-grid", "cv-feature", "faq", "comparison-table", "stats", "cv-guarantee", "cv-stories", "faq", "newsletter", "marquee"],
    product: ["main-product", "content-tabs", "cv-stories", "cv-feature", "features-grid", "cv-reviews", "cv-feature", "stats", "timeline", "comparison-table", "cv-guarantee", "faq", "newsletter", "marquee"],
    pages: ["a-propos", "listicle", "advertorial", "sections", "contact", "faq", "livraison-retours", "mentions-legales", "confidentialite", "conditions-generales"],
    headings: ["Ils en parlent", "Pourquoi Fraise", "En quelques", "Questions fréquentes"],
    offers: 3,
  },
  // Refonte E-commerce (issue #158) : campagne, achat, détail, usages, bandeau d'appel, questions, inscription.
  onde: {
    profile: "studio",
    index: ["fs-campaign", "featured-purchase", "ed-finishes", "ed-diptych", "cta-banner", "faq", "newsletter"],
    product: ["main-product", "ed-finishes", "ed-scene", "faq"],
    pages: ["usages", "aide"],
    headings: ["Casque ONDE Audio", "Questions"],
    offers: 0,
  },
} as const;

describe("FRAISE (Lumora) et ONDE (refonte E-commerce) : composition figée, jamais réduite", async () => {
  const user = await createUser("compo-fo@example.invalid", "isolated-test-only", "Composition");
  for (const id of ["fraise", "onde"] as const) {
    it(`${id} : sections attendues, ordonnées, aucune masquée ; bon thème ; pages de référence ; rendu par la route d'aperçu`, async () => {
      const f = await fr(() => demoProject(user.id, id));
      const { spec } = f, exp = EXPECTED[id];
      expect(spec.direction).toBe(id);
      const attr = id === "onde" ? "editorial" : "conversion";
      expect(spec.settings[`${attr}_profile`]).toBe(exp.profile);
      const types = (t: string) => spec.templates[t].order.map((k) => spec.templates[t].sections[k].type);
      const hidden = (t: string) => spec.templates[t].order.filter((k) => spec.templates[t].sections[k].disabled);
      expect(types("index"), `${id} accueil`).toEqual(exp.index);
      const productKey = spec.store.product.template_suffix && spec.templates[`product.${spec.store.product.template_suffix}`] ? `product.${spec.store.product.template_suffix}` : "product";
      expect(types(productKey), `${id} fiche`).toEqual(exp.product);
      expect(hidden("index"), `${id} accueil : sections masquées`).toEqual([]);
      expect(hidden(productKey), `${id} fiche : sections masquées`).toEqual([]);
      for (const h of exp.pages) expect(spec.store.pages.map((p) => p.handle), `${id} page ${h}`).toContain(h);
      // En-tête : bandeau(x) d'annonce identifiés comme exemples + en-tête ; pied de page en colonnes.
      expect(Object.values(spec.groups.header.sections).filter((s) => !s.disabled).map((s) => s.type)).toEqual(id === "fraise" ? ["announcement-bar", "announcement-bar", "header"] : ["header"]);
      // Offres FRAISE (1 / 2+1 / 3+2) : dans le bloc d'achat de la fiche.
      const main = Object.values(spec.templates[productKey].sections).find((s) => s.type === "main-product")!;
      expect(Object.values(main.blocks ?? {}).filter((b) => b.type === "quantity_offer")).toHaveLength(exp.offers);
      // Même version dans le studio et dans l'aperçu : la version enregistrée se relit à l'identique (ordre des sections).
      const version = saveThemeVersion(f.pid, spec, "Test composition", "user");
      const reloaded = themeVersion(f.pid, version.id)!.spec;
      expect(reloaded.templates.index.order.map((k: string) => reloaded.templates.index.sections[k].type)).toEqual(exp.index);
      // Rendu réel : accueil et fiche contiennent les titres des sections de référence, rien de « masqué ».
      const files = compileTheme(spec);
      for (const route of ["/", `/products/${spec.store.product.handle}`]) {
        const r = await renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams());
        expect(r.status, `${id} ${route}`).toBe(200);
        for (const h of exp.headings) expect(r.html, `${id} ${route} : « ${h} »`).toContain(h);
        expect(r.html).toContain(`data-${attr}="${exp.profile}"`);
      }
    });
  }
});
