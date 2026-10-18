/** FRAISE GUMMIES et ONDE AUDIO (issue #137) : deux thèmes complets rendus par le moteur, données de démonstration identifiées,
 * panier à bandeaux, visuels cohérents, bibliothèque et traductions. Sans le kit d'images (variable LOT2C_PACK), les cadres
 * « visuel à importer » remplacent les images : le test reste valable, les captures non. */
import { afterAll, describe, it, expect, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/lot2c-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
import { createUser } from "@/lib/auth";
import { conversionProject } from "./lot2c-fixtures";
import { renderPage } from "@/lib/theme/render";
import { validateSpec } from "@/lib/theme/ops";
import { addOfferToCart, purchaseConfig, reconcileOfferCart } from "@/lib/theme/purchase-offers";
import { libraryEntry } from "@/lib/theme/section-library";
import { sectionSchema } from "@/lib/theme/spec";
import { runWithLang } from "@/lib/i18n-server";
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const pack = process.env.LOT2C_PACK;
const render = (spec: any, path: string, cart: any[] = []) => { const [pathname, query = ""] = path.split("?"); return renderPage({ spec, base: "", cart }, pathname, new URLSearchParams(query)); };

describe("Lot 2C — FRAISE GUMMIES (référence Lumora) et ONDE AUDIO (référence Pawish)", async () => {
  const user = await createUser(`lot2c-${Date.now()}@example.invalid`, "isolated-only", "Test");
  for (const kind of ["fraise", "onde"] as const) {
    it(`${kind} : toutes les pages se rendent, données de démonstration identifiées, aucun produit inventé`, async () => fr(async () => {
      const f = await conversionProject(user.id, kind, pack), spec = f.spec;
      expect(validateSpec(spec)).toEqual([]);
      expect(spec.settings.conversion_profile).toBe(kind === "fraise" ? "pop" : "contrast");
      const pages = ["/", f.detail, "/collections/all", "/cart", "/pages/a-propos", "/pages/contact", "/pages/faq", "/pages/livraison-retours", "/pages/mentions-legales", "/pages/confidentialite", "/pages/conditions-generales", "/search?q=casque", "/page-inconnue"];
      for (const path of pages) {
        const r = await render(spec, path);
        expect(r.status, path).toBe(path === "/page-inconnue" ? 404 : 200);
        expect(r.html, path).not.toMatch(/Liquid error|\[object Object\]|undefined undefined/);
        expect((r.html.match(/<h1[\s>]/g) ?? []).length, path).toBe(1);
        expect(r.html).toContain(`data-conversion="${kind === "fraise" ? "pop" : "contrast"}"`);
      }
      const home = (await render(spec, "/")).html;
      expect(home).toContain("data-cv-hero"); expect(home).toContain("Note fictive"); expect((home.match(/Avis fictif/g) ?? []).length).toBeGreaterThanOrEqual(6);
      expect(home).toContain("data-cv-stories"); expect((home.match(/Vidéo à venir/g) ?? []).length).toBe(3); expect(home).not.toContain("data-cv-story-open");// sans vidéo : aucun bouton de lecture
      expect(home).toContain("Image IA — démonstration"); expect(home).toContain("exemple de promotion"); expect(home).toContain("Exemple de politique");
      expect(home).toContain("es-marquee"); expect(home).toContain("es-ctable"); expect(home).toContain("es-stats"); expect(home).toContain("cv-guarantee");
      // Une seule référence : collection et recherche ne montrent qu'elle, avec le visuel « fond clair » de sa variante.
      const collection = (await render(spec, "/collections/all")).html;
      expect((collection.match(/class="es-card /g) ?? []).length).toBe(1);
      if (pack) expect(collection).toContain(`${kind}-02-fond-clair.webp`);
      expect((await render(spec, "/search?q=inexistant")).html).toContain("Aucun résultat");
      // Pages légales : structure prête, rien d'inventé.
      const legal = (await render(spec, "/pages/mentions-legales")).html;
      expect(legal).toContain("[À compléter"); expect(legal).not.toMatch(/SIRET\s*:\s*\d/);
      // Contact : validation réelle (champ requis), envoi signalé inactif dans l'aperçu.
      const contact = (await render(spec, "/pages/contact")).html;
      expect(contact).toContain('name="contact[email]" autocomplete="email" required'); expect(contact).toContain("l'envoi n'est pas actif");
      // Panier vide puis rempli : compteur, total avec nombre d'articles, économies, bouton sécurisé, garantie en exemple.
      const empty = (await render(spec, "/cart")).html;
      expect(empty).toContain("Votre panier est vide."); expect(empty).toContain("Continuer mes achats");
      const offers = purchaseConfig(spec.templates.product.sections.main).offers; if (kind === "fraise") expect(offers.map((o) => o.quantity)).toEqual([1, 3, 5]);
      const cart = kind === "fraise" ? addOfferToCart(spec, [], { target: "product:main", offer: offers[1].id, variants: [1000, 1000, 1000] }) : reconcileOfferCart(spec, [{ variantId: 1000, quantity: 2 }]);
      const filled = (await render(spec, "/cart", cart)).html;
      expect(filled).toContain(kind === "fraise" ? "Total : 3 articles" : "Total : 2 articles");
      expect(filled).toContain("Économies"); expect(filled).toContain(kind === "fraise" ? "54,90" : "80,00"); expect(filled).toContain(kind === "fraise" ? "49,80" : "298,00");
      expect(filled).toContain("Paiement sécurisé"); expect(filled).toContain("es-icon--lock"); expect(filled).toContain("à remplacer par vos conditions réelles");
      const drawer = filled.slice(filled.indexOf("data-cart-drawer"));
      expect(drawer).toContain("data-cart-drawer-count"); expect(drawer).toContain(kind === "fraise" ? "Livraison offerte dès 2 flacons" : "Démonstration fictive");
      if (kind === "onde") { expect(drawer).toContain("Code de réduction"); expect(drawer).toContain("aucun code n'est actif"); }
      if (kind === "fraise") { expect(drawer).toContain("Protection des expéditions"); expect(drawer).toContain('aria-checked="false"'); }
      if (pack) expect(drawer).toContain(`${kind}-02-fond-clair.webp`);
      // Fiche : prix barré avec badge de remise, libellé unitaire ou quantité réelle.
      const product = (await render(spec, f.detail)).html;
      expect(product).toContain("es-price__save"); expect(product).toContain(kind === "fraise" ? "−29 %" : "−21 %");
      if (kind === "fraise") { expect(product).toContain("data-offer-compare"); expect(product).toContain('"unit":"par flacon"'); expect((product.match(/data-quantity="/g) ?? []).length).toBe(3); }
      else { expect(product).toContain('name="quantity"'); expect(product).toContain("data-sticky-buy"); }
      if (kind === "fraise") expect(product).toContain("es-ctabs"); expect(product).toContain("note fictive");
    }));
  }
  it("les nouvelles sections sont dans la bibliothèque FR/EN avec un schéma traduit", () => {
    for (const type of ["cv-hero", "cv-cards", "cv-reviews", "cv-feature", "cv-guarantee", "cv-stories"]) {
      expect(libraryEntry(type, "fr")?.name, type).toBeTruthy(); expect(libraryEntry(type, "en")?.name, type).toBeTruthy();
      const en = sectionSchema(null, type, "en")!; expect(en.name).not.toMatch(/[éèà]/);
      for (const s of en.settings) if (s.label) expect(s.label, `${type}.${s.id}`).not.toMatch(/[éèàç]|Visuel|Titre/);
    }
  });
});
