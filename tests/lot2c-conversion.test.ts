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
  it("accents lisibles : chaque schéma expose un accent « ink » (texte sur le fond) et « fill » (fond sous le texte d'accent) à 4,5:1 au moins, inchangés quand l'accent l'est déjà", async () => fr(async () => {
    const lum = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((acc, x, i) => acc + x * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = (a: string, b: string) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    for (const kind of ["fraise", "onde"] as const) {
      const { spec } = await conversionProject(user.id, kind, pack); const home = (await render(spec, "/")).html;
      for (const [id, scheme] of Object.entries(spec.settings.color_schemes as Record<string, { settings: Record<string, string> }>)) {
        const block = home.match(new RegExp(`\\.color-${id},[^}]*}`))?.[0] ?? ""; expect(block, `${kind} ${id}`).toContain("--c-accent-ink:");
        const ink = block.match(/--c-accent-ink: (#[0-9a-f]{6})/i)![1], fill = block.match(/--c-accent-fill: (#[0-9a-f]{6})/i)![1];
        expect(contrast(ink, scheme.settings.background), `${kind} ${id} ink ${ink}`).toBeGreaterThanOrEqual(4.5); expect(contrast(ink, scheme.settings.surface), `${kind} ${id} ink/surface ${ink}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(fill, scheme.settings.accent_text), `${kind} ${id} fill ${fill}`).toBeGreaterThanOrEqual(4.5);
        if (contrast(scheme.settings.accent, scheme.settings.background) >= 4.5 && contrast(scheme.settings.accent, scheme.settings.surface) >= 4.5) expect(ink.toLowerCase()).toBe(scheme.settings.accent.toLowerCase());
        if (contrast(scheme.settings.accent, scheme.settings.accent_text) >= 4.5) expect(fill.toLowerCase()).toBe(scheme.settings.accent.toLowerCase());
      }
    }
    // Vert vif ONDE sur blanc (2,1:1) et rouge FRAISE sur crème (3,7:1) : seuls les accents de texte sont assombris ; ONDE garde ses boutons tels quels (texte sombre sur vert : déjà 9:1).
    const onde = (await conversionProject(user.id, "onde", pack)).spec; const h = (await render(onde, "/")).html; const s1 = h.match(/\.color-scheme-1,[^}]*}/)![0];
    expect(s1).toMatch(/--c-accent: #4ECD01/i); expect(s1).not.toMatch(/--c-accent-ink: #4ECD01/i); expect(s1).toMatch(/--c-accent-fill: #4ECD01/i);
  }));

  it("les nouvelles sections sont dans la bibliothèque FR/EN avec un schéma traduit", () => {
    for (const type of ["cv-hero", "cv-cards", "cv-reviews", "cv-feature", "cv-guarantee", "cv-stories", "cv-article", "cv-hotspots", "cv-alternating", "cv-steps", "cv-gallery", "cv-specs", "cv-banner", "cv-ingredients", "cv-quote"]) {
      expect(libraryEntry(type, "fr")?.name, type).toBeTruthy(); expect(libraryEntry(type, "en")?.name, type).toBeTruthy();
      const en = sectionSchema(null, type, "en")!; expect(en.name).not.toMatch(/[éèà]/);
      for (const s of en.settings) if (s.label) expect(s.label, `${type}.${s.id}`).not.toMatch(/[éèàç]|Visuel|Titre/);
    }
  });

  it("page « Bibliothèque de sections » : huit types rendus, animations réglables et désactivables par section, textes jamais masqués sans JavaScript", async () => fr(async () => {
    const f = await conversionProject(user.id, "fraise", pack), spec = f.spec, page = spec.templates["page.sections"];
    const types = new Set(Object.values(page.sections).map((s) => s.type));
    for (const t of ["features-grid", "cv-hotspots", "cv-alternating", "cv-steps", "cv-gallery", "comparison-table", "cv-specs", "cv-banner", "cv-ingredients", "cv-quote"]) expect(types.has(t), t).toBe(true);
    const animated = Object.values(page.sections).filter((s) => "animation" in s.settings); expect(animated.length).toBeGreaterThanOrEqual(10);
    for (const s of animated) { const schema = sectionSchema(spec, s.type, "fr")!; expect(schema.settings.find((x) => x.id === "animation")?.options?.map((o) => o.value)).toEqual(["none", "fade", "rise", "zoom"]); expect(schema.settings.find((x) => x.id === "animation_speed")?.options?.map((o) => o.value)).toEqual(["slow", "normal", "fast"]); }
    // Contenu principal à partir de la première des huit sections (le titre de page et l'introduction sont des sections de base, hors réglage).
    const main = (r: { html: string }) => { const m = r.html.slice(r.html.indexOf("<main"), r.html.indexOf("</main>")); return m.slice(m.lastIndexOf("es-section-wrapper", m.indexOf("data-cols-m"))); };
    const rise = main(await render(spec, "/pages/sections"));
    expect(rise).toContain('data-reveal="up" data-d="'); expect(rise).toContain("cv-anim--normal"); expect(rise).toContain('data-cols-m="2"'); expect(rise).toContain('data-layout="carousel"'); expect(rise).toContain("[data-cv-hotspots]".slice(1, -1)); expect(rise).toContain("data-cv-lightbox"); expect(rise).toContain("[À compléter]"); expect(rise).toContain("data-cv-ingredients"); expect(rise).toContain("data-cv-quote"); expect(rise).toContain("Avis fictif");
    // « Aucune » sur chaque section : plus aucune apparition au défilement produite par le réglage ; « Lente » : classe de vitesse.
    const off = structuredClone(spec); for (const s of Object.values(off.templates["page.sections"].sections)) if ("animation" in s.settings) { s.settings.animation = "none"; s.settings.animation_speed = "slow"; }
    expect(validateSpec(off)).toEqual([]);
    const none = main(await render(off, "/pages/sections")); expect(none).not.toContain("data-d="); expect(none).not.toMatch(/data-reveal="(up|fade|zoom)"/); expect(none).toContain("cv-anim--slow"); expect(none).not.toContain("cv-anim--normal");
    const fade = structuredClone(spec); for (const s of Object.values(fade.templates["page.sections"].sections)) if ("animation" in s.settings) s.settings.animation = "fade";
    expect(main(await render(fade, "/pages/sections"))).toContain('data-reveal="fade"');
    // Garde-fous du thème : sans JavaScript rien n'est masqué (règles sous .motion-ready), repli à 3,2 s, mouvement réduit respecté.
    const fs = process.getBuiltinModule("fs"), css = fs.readFileSync("theme-base/assets/theme.css", "utf8"), js = fs.readFileSync("theme-base/assets/theme.js", "utf8"), cv = fs.readFileSync("theme-base/assets/conversion.css", "utf8");
    for (const line of css.split("\n")) if (/\[data-reveal\][^{]*\{[^}]*opacity:\s*0/.test(line)) expect(line.trim().startsWith(".motion-ready"), line).toBe(true);
    expect(js).toMatch(/setTimeout\(function \(\) \{ \$\$\('\[data-reveal\]:not\(\.is-in\)'[\s\S]*3200\)/);
    expect(cv).toContain("@media(prefers-reduced-motion:reduce)"); expect(cv).toContain(".cv-anim--slow{--motion-duration:"); expect(cv).toContain(".cv-anim--fast{--motion-duration:");
    // Fiche produit : format de galerie réglable (carré sans bandes dans la démonstration).
    expect((await render(spec, f.detail)).html).toContain('data-gallery-ratio="square"');
  }));
});
