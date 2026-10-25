/**
 * Mission E (issue #137) — les quatre démonstrations composées par le vrai moteur dans leur thème de référence :
 * identité appliquée (nom, palette, profil graphique), catégorie reconnue, galerie « Sections » filtrée par thème et
 * catégorie, pages rendues sans erreur ni texte « [À compléter » visible, adaptation d'une identité à un autre thème.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/demos4-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
vi.mock("@/lib/ai/llm", async (original) => ({ ...await original<object>(), llmConfigured: () => false }));
import fs from "node:fs";
import path from "node:path";
import { createUser } from "@/lib/auth";
import { demoProject, type DemoId } from "./demo-fixtures";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { projectStoreKind } from "@/lib/theme/project-kind";
import { compatibleSectionTypes } from "@/lib/theme/section-compat";
import { themeRecommendation } from "@/lib/theme/theme-recommendation";
import { validateSpec } from "@/lib/theme/ops";
import { runWithLang } from "@/lib/i18n-server";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
// Kit privé de la démonstration (hors dépôt) : FRAISE dans public/demo/fraise/v2/, les autres dans public/demo/<id>/.
const installed = (id: string) => fs.existsSync(path.join(process.cwd(), "public", "demo", id));
const EXPECT: Record<DemoId, { kind: "services" | "catalog" | "specialty"; profile: Record<string, string>; family: RegExp }> = {
  // FRAISE GUMMIES (sept planches) : sections fg-* propres au thème (voir tests/fraise-theme.test.ts), aucun profil global ;
  // la galerie propose la bibliothèque de la famille Boutique spécialisée (cv-, fs-).
  fraise: { kind: "specialty", profile: { conversion_profile: "none" }, family: /^cv-/ },
  onde: { kind: "catalog", profile: { conversion_profile: "onde" }, family: /^on-/ },
  orbe: { kind: "catalog", profile: { editorial_profile: "object" }, family: /^ed-/ },
  rive: { kind: "services", profile: { editorial_profile: "journal" }, family: /^ed-/ },
  // SILLON V2 (PR #182) : sections sv-* propres au thème, aucun profil global (voir aussi tests/sillon-theme.test.ts).
  sillon: { kind: "specialty", profile: { editorial_profile: "none" }, family: /^sv-/ },
  noctil: { kind: "specialty", profile: { conversion_profile: "astral" }, family: /^cv-/ },
  traverse: { kind: "specialty", profile: { conversion_profile: "itineraire" }, family: /^cv-/ },
  heuren: { kind: "catalog", profile: { editorial_profile: "cadran" }, family: /^(ed-|fs-)/ },
  alcove: { kind: "catalog", profile: { editorial_profile: "arrondi" }, family: /^(ed-|fs-)/ },
  "museau-club": { kind: "specialty", profile: { conversion_profile: "club" }, family: /^cv-/ },
  souple: { kind: "catalog", profile: { editorial_profile: "poudre" }, family: /^(ed-|fs-)/ },
  // TABLE SAISON (issue #175) : vérifiée par tests/table-saison-theme.test.ts (sections ts-*, aucun profil global).
  "table-saison": { kind: "services", profile: {}, family: /^ts-/ },
  // ATELIER NUANCE (issue #177) : vérifiée par tests/atelier-nuance-theme.test.ts (sections an-*, aucun profil global).
  "atelier-nuance": { kind: "services", profile: {}, family: /^an-/ },
  // PARENTHÈSE : vérifiée par tests/parenthese-theme.test.ts (sections pa-*, aucun profil global).
  parenthese: { kind: "services", profile: {}, family: /^pa-/ },
  // PHASE — Électricité : vérifiée par tests/phase-theme.test.ts (sections ph-*, aucun profil global).
  phase: { kind: "services", profile: {}, family: /^ph-/ },
  "maison-horizon": { kind: "services", profile: { editorial_profile: "horizon" }, family: /^re-/ },
  aplat: { kind: "services", profile: { editorial_profile: "aplat" }, family: /^ap-/ },
};

/** Informations que seul le client peut fournir : la mention « à compléter » est voulue (rien d'inventé), jamais un titre ni une accroche. */
const ALLOWED_TODO = [/^caractéristiques/, /^matières et entretien$/, /^délais et tarifs de livraison$/, /^conditions de retour$/, /^nom du projet$/, /^ce qui a été réalisé$/, /^vos horaires/, /^zone d'intervention ou adresse$/, /^téléphone$/, /^moyens de paiement/, /^éditeur du site/, /^délais et frais de livraison/];

describe("Les quatre démonstrations dans leur thème de référence", async () => {
  const user = await createUser("demos4@example.invalid", "isolated-test-only", "Démos");
  for (const id of ["fraise", "onde", "orbe", "rive"] as DemoId[]) {
    it(`${id} : identité, catégorie, galerie filtrée, pages rendues`, async () => {
      const f = await fr(() => demoProject(user.id, id));
      const { spec, project } = f;
      expect(spec.direction).toBe(id);
      expect(validateSpec(spec)).toEqual([]);
      expect(f.demo.brand).toBe(spec.store.shopName);
      for (const [k, v] of Object.entries(EXPECT[id].profile)) expect(spec.settings[k], k).toBe(v);
      // Palette : les schémas dérivent des rôles de couleur de la démonstration (accent de marque dans un schéma plein).
      const schemes = spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>;
      const accent = f.demo.palette[2].toUpperCase();
      expect(Object.values(schemes).some((s) => Object.values(s.settings).some((c) => String(c).toUpperCase() === accent))).toBe(true);
      // Catégorie reconnue (réglage du projet) et recommandation cohérente.
      expect(projectStoreKind(project).kind).toBe(EXPECT[id].kind);
      const r = themeRecommendation(project, "fr");
      expect(r.eligible).toContain(id);
      expect(r.category.kind).toBe(EXPECT[id].kind);
      // Galerie « Sections » : la famille du thème est proposée, les deux autres familles de référence non.
      const lib = compatibleSectionTypes(spec, EXPECT[id].kind);
      expect(lib.some((t) => EXPECT[id].family.test(t))).toBe(true);
      expect(lib.some((t) => (EXPECT[id].family.source === "^cv-" ? /^ed-/ : /^cv-/).test(t))).toBe(false);
      if (EXPECT[id].kind === "services") for (const t of ["featured-purchase", "featured-collection"]) expect(lib).not.toContain(t);
      else expect(lib).toContain("faq");
      // Visuels du kit : placés si installés (sinon sections masquées, jamais un cadre vide visible).
      if (installed(id)) expect(Object.keys(spec.files).length).toBeGreaterThanOrEqual(5);
      // Pages rendues par le vrai moteur : accueil, fiche ou prestation, pages ; aucun « [À compléter » visible.
      const files = compileTheme(spec);
      const routes = ["/", ...(f.services ? [] : [`/products/${spec.store.product.handle}`, "/collections/all"]), ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
      for (const route of routes) {
        const r = await renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams());
        expect(r.status, `${id} ${route}`).toBe(200);
        const visible = r.html.replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ");
        // Rien d'inventé : les seules mentions « [À compléter : …] » visibles sont des informations que seul le client
        // peut fournir (fiche technique, entretien, livraison, retours, légendes de réalisations, horaires, zone, téléphone).
        // Les pages d'information (FAQ, livraison, mentions, à propos, prestations) listent explicitement chaque élément attendu.
        // FRAISE / ONDE : composition de référence du lot 2C (contenu vérifié par tests/lot2c-conversion.test.ts et
        // tests/demos-fraise-onde-composition.test.ts) ; ses cellules « [À compléter] » (colonne « Autres » du comparatif,
        // caractéristiques) sont voulues : rien n'est affirmé sur d'autres marques ni sur des valeurs non confirmées.
        const showcase = route === "/" || route.startsWith("/products/");
        if (id !== "fraise" && id !== "onde") for (const m of visible.matchAll(/\[À compléter(?: : ([^\]]*))?\]/g)) expect(showcase ? ALLOWED_TODO.some((re) => re.test(m[1] ?? "")) : !!m[1], `${id} ${route} : ${m[0]}`).toBe(true);
        expect(r.html).toContain(f.demo.brand);
      }
      // Entête : nom de la marque ; profil graphique appliqué sur le body.
      const home = await renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams());
      const attr = "conversion_profile" in EXPECT[id].profile ? "data-conversion" : "data-editorial";
      expect(home.html).toMatch(new RegExp(`${attr}="${Object.values(EXPECT[id].profile)[0]}"`));
    });
  }

  it("adaptation : l'identité FRAISE composée dans le thème SILLON (même catégorie) se rend avec ses couleurs et son nom", async () => {
    const f = await fr(() => demoProject(user.id, "fraise", { direction: "sillon" }));
    expect(f.spec.direction).toBe("sillon");
    expect(f.spec.store.shopName).toBe("FRAISE GUMMIES");
    expect(f.spec.settings.conversion_profile).toBe("none"); // SILLON V2 : sections sv-*, aucun profil global
    const schemes = f.spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>;
    expect(Object.values(schemes).some((s) => Object.values(s.settings).some((c) => String(c).toUpperCase() === "#E3363E"))).toBe(true);
    const home = await renderPage({ spec: f.spec, base: "", files: compileTheme(f.spec), cart: [] }, "/", new URLSearchParams());
    expect(home.status).toBe(200);
    expect(home.html).toContain("FRAISE GUMMIES");
  });
});
