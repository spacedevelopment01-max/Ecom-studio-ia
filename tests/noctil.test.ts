/**
 * NOCTIL refait d'après les maquettes du 23 octobre (PR #167, commentaire 6363066224, dossier
 * docs/design/noctil-reference-20261023) : thème de la famille **Produit spécifique / Boutique spécialisée**, profil
 * « astral » (crème, bleu nuit, lavande, Nunito), un seul produit, le projecteur galaxie. Garde-fous :
 *  - thème actif, famille spécialisée, profil « astral », polices Nunito 800 / 400 fournies avec leur licence ;
 *  - accueil dans l'ordre de la planche 01, avec le produit détouré en surplomb de l'ouverture (section « Produit en
 *    surplomb » juste après l'ouverture de nuit, débordement réglé sur ordinateur et téléphone) ;
 *  - le débordement ne s'applique que derrière une grande photo (règle CSS) : déplacée ailleurs, la section reste à sa place ;
 *  - prix de démonstration 69 € annoncé comme tel ; deux projecteurs = 138 € en sous-total, livraison à l'étape suivante,
 *    jamais un « Total » trompeur ; exemple de commande sans aucun champ de carte ; pages compte reliées entre elles ;
 *  - rien d'inventé : âge, alimentation, dimensions, bruit, garantie, délais restent « À confirmer » ; aucun avis, aucun
 *    bienfait sur le sommeil ; pages légales « à renseigner » sans donnée de société ; © 2026 ;
 *  - 16 médias utilisés (6 originaux, 10 créations complémentaires), jamais les ambiances d'adulte ; SEO par page ;
 *    liens internes valides ; cookies optionnels refusés par défaut ;
 *  - un autre projet installé dans ce thème garde sa propre identité ; exports Shopify / WooCommerce / PrestaShop.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage, variantId } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { validateSpec } from "@/lib/theme/ops";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds, themePreviewPath } from "@/lib/theme/theme-fit";
import { THEME_FAMILY, FAMILY_LIBRARY, isStructuralType } from "@/lib/theme/section-families";
import { themeAllowed } from "@/lib/theme/theme-access";
import { composeShop, buildShop } from "@/lib/engine/shop";
import { saveBrand, loadProject, currentTheme } from "@/lib/projects";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { demoProject } from "./demo-fixtures";
import { NOCTIL_MEDIA, NOCTIL_PAGES, NOCTIL_PRICE, NOCTIL_ARTICLES } from "./noctil-fixtures";
import { KIT_EXCLUDED } from "./noctil-traverse-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { clientFixture } from "./mission154-fixtures";
import sharp from "sharp";
import { saveAsset } from "@/lib/library";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<section[^>]*\bhidden\b[^>]*>[\s\S]*?<\/section>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;| /g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const LIBRARY = new Set(FAMILY_LIBRARY.specialty.flatMap((e) => e.dispositions.map((d) => d.type)));
const zipText = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");
const ID = "noctil";
const HOME = ["cv-banner", "cv-rise", "cv-cards", "cv-banner", "cv-steps", "cv-banner", "fs-journal", "faq"];
const PRODUCT = ["main-product", "cv-banner", "features-grid", "cv-cards", "cv-cards", "cv-gallery", "faq", "faq", "fs-journal"];

describe("NOCTIL : thème actif de la famille « Boutique spécialisée »", () => {
  it("catalogue, famille spécialisée, profil « astral », polices Nunito fournies, accès par forfait, aperçu suivi", () => {
    expect(ACTIVE_THEMES).toContain(ID);
    expect(themeKinds(ID)).toEqual(["specialty"]);
    expect(THEME_FAMILY[ID]).toBe("specialty");
    // Droits par thème et par forfait (mission #190) : répartition encore à choisir, ouvert à tous les forfaits payants.
    for (const plan of ["creer", "vendre", "dominer"] as const) expect(themeAllowed(plan, ID)).toBe(true);
    expect(themeAllowed(null, ID)).toBe(false);
    const t = catalogTheme(ID)!;
    expect(t.settings).toMatchObject({ conversion_profile: "astral", editorial_profile: "none" });
    expect(t.fonts).toEqual({ heading: "nunito_n8", body: "nunito_n4" });
    expect(t.home.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(process.cwd(), "public", themePreviewPath(ID)))).toBe(true);
    for (const w of [400, 700, 800]) expect(fs.existsSync(path.join(process.cwd(), "assets", "fonts", `Nunito-${w}.ttf`)), `Nunito ${w}`).toBe(true);
    expect(fs.readFileSync(path.join(process.cwd(), "assets", "fonts", "licenses", "Nunito-OFL.txt"), "utf8")).toMatch(/SIL Open Font License/);
  });

  it("profil « astral » propre au thème, mouvement réduit respecté ; profils des autres thèmes présents", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "conversion.css"), "utf8");
    for (const p of ["astral", "itineraire", "nomade", "pop", "contrast", "club"]) expect(css, p).toContain(`body[data-conversion="${p}"]`);
    expect(css).toMatch(/prefers-reduced-motion:reduce\)\{body\[data-conversion="astral"\]/);
  });

  it("produit en surplomb : débordement seulement derrière une grande photo, au-dessus de la photo mais sous l'en-tête, aucun clic capté, rien de rogné en hauteur", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "conversion.css"), "utf8");
    expect(css).toContain(".cv-rise{position:relative;z-index:3;overflow-x:clip;--rise-on:0}");
    expect(css).toContain(".shopify-section:has(:is(.cv-banner--background,.es-hero-full)) + .shopify-section .cv-rise--auto{--rise-on:1}");
    expect(css).toMatch(/\.cv-rise__media\{[^}]*pointer-events:none[^}]*margin-top:calc\(var\(--rise-on\)/);
    const theme = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "theme.css"), "utf8");
    expect(Number(theme.match(/\.es-header \{ position: relative; z-index: (\d+)/)![1])).toBeGreaterThan(3);
    const liquid = fs.readFileSync(path.join(process.cwd(), "theme-base", "sections", "cv-rise.liquid"), "utf8");
    for (const id of ["media_width", "rise", "mobile_width", "mobile_rise", "overlap", "decor"]) expect(liquid, id).toContain(`"id": "${id}"`);
  });

  it("dispositions NOCTIL dans la galerie de la famille ; écrans d'exemple hors galerie", () => {
    const disp = (key: string) => FAMILY_LIBRARY.specialty.find((e) => e.key === `specialty.${key}`)!.dispositions.map((d) => d.id);
    expect(disp("hero")).toEqual(expect.arrayContaining(["night", "dark-right"]));
    expect(disp("purchase")).toEqual(expect.arrayContaining(["rise", "rise-final"]));
    expect(disp("benefits")).toContain("row");
    expect(disp("details")).toContain("columns-carousel");
    expect(disp("situations")).toContain("grid-carousel");
    expect(disp("faq")).toEqual(expect.arrayContaining(["pair", "topic-titles"]));
    expect(disp("story")).toEqual(expect.arrayContaining(["journal-pages", "journal-list"]));
    expect(disp("contact")).toContain("form-subject");
    for (const t of ["demo-order", "demo-account"]) expect(isStructuralType(t), t).toBe(true);
  });
});

describe("NOCTIL : démonstration (planches 01 à 07)", async () => {
  const user = await createUser("noctil-demo@example.invalid", "isolated-test-only", "Noctil");
  const f = await fr(() => demoProject(user.id, ID));
  const { spec } = f;
  const files = compileTheme(spec);
  const productKey = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
  const types = (key: string) => spec.templates[key].order.map((sid) => spec.templates[key].sections[sid]);
  const productRoute = `/products/${spec.store.product.handle}`;
  const routes = ["/", "/collections/all", productRoute, ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const route of routes) pages.set(route, (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html);
  const all = [...pages.values()].join("\n");

  it("accueil dans l'ordre de la planche 01 : ouverture de nuit puis produit en surplomb ; fiche sans section de reste", () => {
    expect(spec.direction).toBe(ID);
    expect(validateSpec(spec)).toEqual([]);
    expect(types("index").map((s) => s.type)).toEqual(HOME);
    expect(types("index")[0].settings).toMatchObject({ layout: "night", veil: "left", heading_tag: "h1" });
    expect(types("index")[1].settings).toMatchObject({ overlap: "auto", image_asset: "noctil-projecteur-detoure.png", buy_product: spec.store.product.handle, price_note: "Prix de démonstration" });
    expect(Number(types("index")[1].settings.rise)).toBeGreaterThan(0);
    expect(Number(types("index")[1].settings.mobile_rise)).toBeGreaterThan(0);
    expect(types(productKey).map((s) => s.type)).toEqual(PRODUCT);
    for (const key of Object.keys(spec.templates)) for (const s of types(key)) {
      expect(!!s.disabled, `${key} ${s.type}`).toBe(false);
      expect(LIBRARY.has(s.type) || isStructuralType(s.type), `${key} ${s.type}`).toBe(true);
    }
    expect(spec.settings.conversion_profile).toBe("astral");
    expect(loadProject(f.pid).settings.storeKind).toBe("specialty");
    const home = pages.get("/")!;
    expect(home).toMatch(/<section class="es-section cv-rise cv-rise--media-left cv-rise--auto cv-rise--curve/);
    expect(home).toContain("noctil-projecteur-detoure.png");
  });

  it("un produit à 69 € de démonstration, galerie de six vues, liens utiles, barre d'achat", () => {
    expect(spec.store.product.price).toBe(NOCTIL_PRICE);
    expect(spec.store.product.variants).toHaveLength(1);
    expect(spec.store.product.images).toHaveLength(6);
    const html = pages.get(productRoute)!;
    const text = visibleText(html);
    expect(text).toContain("Le projecteur NOCTIL");
    expect(text).toContain("Une galaxie pour les petites imaginations");
    expect(text).toContain("Prix de démonstration");
    expect(html).toContain(`href="${NOCTIL_PAGES.guide}"`);
    expect(html).toContain(`href="${NOCTIL_PAGES.livraison}"`);
    expect(html).toContain("data-sticky-buy");
    expect(text.match(/À confirmer/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it("médias : les 16 fichiers retenus, aucune ambiance d'adulte, produit détouré en PNG à fond transparent", () => {
    expect(f.missing).toEqual([]);
    expect(NOCTIL_MEDIA).toHaveLength(16);
    const shown = all + JSON.stringify(spec.store.product.images);
    for (const m of NOCTIL_MEDIA) expect(shown, m.file).toContain(`${ID}-${m.file}`);
    for (const x of KIT_EXCLUDED.noctil) { expect(all).not.toContain(`${ID}-${x.file}`); expect(Object.keys(spec.files)).not.toContain(`${ID}-${x.file}`); }
    expect(NOCTIL_MEDIA.find((m) => m.file === "projecteur-detoure.png")?.role).toBe("cutout");
  });

  it("SEO : un H1, titre et description uniques par page, alt partout, aperçu non indexable", () => {
    const titles = new Set<string>(), descriptions = new Set<string>();
    for (const [route, html] of pages) {
      expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
      const title = html.match(/<title>([\s\S]*?)<\/title>/)![1].trim();
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
      expect(description.length, route).toBeGreaterThan(20);
      titles.add(title); descriptions.add(description);
      expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
      for (const img of html.match(/<img [^>]*>/g) ?? []) expect(img, route).toMatch(/\balt="/);
    }
    expect(titles.size).toBe(pages.size);
    expect(descriptions.size).toBe(pages.size);
  });

  it("rien d'inventé : ni avis ni note, ni âge, ni garantie, ni délai, ni mesure, ni bienfait sur le sommeil ; © 2026", () => {
    const ld = [...pages.get(productRoute)!.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    expect(JSON.stringify(ld)).not.toMatch(/AggregateRating|"Review"|ratingValue/);
    for (const [route, html] of pages) {
      const text = visibleText(html);
      expect(text, route).not.toMatch(/★|\d([,.]\d)?\s?\/\s?5\b|avis clients?|garantie \d|garanti à vie|livraison (offerte|gratuite|en \d+)|sous \d+ ?(h|jours)|\d+\s?(mm|cm|kg|mAh|W|lm|h)\b|certifi|dès \d+ ans|à partir de \d+ ans|(convient|adapté) (aux enfants )?de tous âges|sommeil|endormissement|apaisant|peur du noir/i);
      expect(text, route).not.toMatch(/(©|&copy;)\s*20(2[0-5])\b/);
      expect(text, route).toMatch(/(©|&copy;)\s*2026\s*NOCTIL/);
      expect(text, route).not.toMatch(/lorem ipsum|Camille|NOCTIL SAS/i);
    }
    expect(all).not.toMatch(/href="(#|)"[^>]*es-social/);
    for (const handle of [NOCTIL_PAGES.mentions, NOCTIL_PAGES.cgv, NOCTIL_PAGES.confidentialite, NOCTIL_PAGES.cookies]) {
      const text = visibleText(pages.get(handle)!);
      expect(text, handle).toMatch(/Contenu juridique à compléter et à valider avant publication/);
      expect(text, handle).toMatch(/\[À renseigner|à compléter et valider avant publication\]/i);
    }
    expect(visibleText(pages.get(NOCTIL_PAGES.mentions)!)).toMatch(/Nom de la société : \[À renseigner\]/);
  });

  it("panier : deux projecteurs = 138 € en sous-total, livraison à l'étape suivante, aucun « Total » trompeur ; panier vide illustré", async () => {
    const cart = [{ variantId: variantId(0, 0), quantity: 2 }];
    const html = (await fr(() => renderPage({ spec, base: "", files, cart }, "/cart", new URLSearchParams()))).html;
    const summary = visibleText(html.slice(html.indexOf('class="es-cart__summary"'), html.indexOf("</aside>", html.indexOf('class="es-cart__summary"'))));
    expect(summary).toContain("Sous-total 138 €");
    expect(summary).toMatch(/Livraison Calculée à l'étape suivante/);
    expect(summary).not.toMatch(/\bTotal\b/);
    expect(summary).toContain("Prix de démonstration");
    expect(visibleText(html)).toContain("Vous aimerez aussi");
    expect(html).toContain(`data-demo-checkout href="${NOCTIL_PAGES.paiement}"`);
    expect(html).toMatch(/<button type="submit" name="checkout"/);
    const emptyHtml = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/cart", new URLSearchParams()))).html;
    const empty = visibleText(emptyHtml);
    expect(empty).toContain("Votre panier est vide");
    expect(empty).toContain("L'univers vous attend");
    expect(empty).not.toContain("Vous aimerez aussi");
    expect(emptyHtml).toContain('class="es-planet"');
  });

  it("exemple de commande et de confirmation : aucun champ de carte, champs désactivés, simulation annoncée", () => {
    for (const handle of [NOCTIL_PAGES.paiement, NOCTIL_PAGES.confirmation]) {
      const html = pages.get(handle)!;
      expect(html, handle).not.toMatch(/cc-number|cc-csc|cc-exp|Numéro de carte|Code de sécurité|Date d'expiration/i);
      expect(visibleText(html), handle).toMatch(/Sous-total 69 €/);
      expect(visibleText(html), handle).toMatch(/Exemple de (démonstration|confirmation)/);
    }
    const checkout = pages.get(NOCTIL_PAGES.paiement)!;
    expect(checkout.match(/<fieldset class="es-order__step" disabled>/g)?.length).toBe(4);
    expect(visibleText(checkout)).toContain("Simulation de commande : aucun paiement réel ne sera effectué.");
    expect(checkout).not.toMatch(/<form[^>]*action="\/cart|name="checkout"|Payer maintenant/);
  });

  it("espace client : connexion, création, mot de passe oublié, aperçu, commande, informations reliés ; facture d'exemple jamais présentée comme réelle", () => {
    const acct = [NOCTIL_PAGES.connexion, NOCTIL_PAGES.inscription, NOCTIL_PAGES.motDePasse, NOCTIL_PAGES.compte, NOCTIL_PAGES.commande, NOCTIL_PAGES.infos];
    for (const r of acct) expect(pages.has(r), r).toBe(true);
    expect(pages.get(NOCTIL_PAGES.connexion)!).toContain(`href="${NOCTIL_PAGES.motDePasse}"`);
    expect(pages.get(NOCTIL_PAGES.connexion)!).toContain(`href="${NOCTIL_PAGES.inscription}"`);
    for (const r of [NOCTIL_PAGES.compte, NOCTIL_PAGES.commande, NOCTIL_PAGES.infos]) for (const to of [NOCTIL_PAGES.compte, NOCTIL_PAGES.commande, NOCTIL_PAGES.infos, NOCTIL_PAGES.connexion]) expect(pages.get(r)!, `${r} → ${to}`).toContain(`href="${to}"`);
    const order = visibleText(pages.get(NOCTIL_PAGES.commande)!);
    expect(order).toMatch(/Sous-total 69 €/);
    expect(order).toContain("Aucune facture n'existe dans cette démonstration.");
    expect(pages.get(NOCTIL_PAGES.commande)!).not.toMatch(/\.pdf|Télécharger la facture/);
    for (const r of acct) { const sec = pages.get(r)!.match(/<section class="es-section es-acct[\s\S]*?<\/section>/)![0]; expect(sec.replace(/<fieldset[^>]*\sdisabled>[\s\S]*?<\/fieldset>/g, ""), r).not.toMatch(/<input/); }
    expect(visibleText(pages.get(NOCTIL_PAGES.compte)!)).toMatch(/Aperçu Commandes Adresses Informations/);
  });

  it("aide : FAQ avec recherche et thèmes en intertitres, contact avec sujet, commande et accord, livraison « à confirmer »", () => {
    const faq = pages.get(NOCTIL_PAGES.faq)!;
    expect(faq).toContain("data-faq-search");
    expect([...faq.matchAll(/class="es-heading es-faq__topic">([^<]+)</g)].map((m) => m[1])).toEqual(["Le projecteur NOCTIL", "Ma commande", "Livraison", "Retours"]);
    const contact = pages.get(NOCTIL_PAGES.contact)!;
    expect(contact).toMatch(/<select name="contact\[subject\]" required/);
    expect(contact).toContain('name="contact[order]"');
    expect(contact).toMatch(/<input type="checkbox" name="contact\[consent\]" value="oui" required>/);
    expect(contact).toContain("data-ed-contact");
    expect(visibleText(pages.get(NOCTIL_PAGES.livraison)!).match(/À confirmer/g)!.length).toBeGreaterThanOrEqual(6);
    expect(visibleText(pages.get(NOCTIL_PAGES.guide)!)).not.toMatch(/notice fournie|Voir la notice/i);
  });

  it("journal : filtres par catégorie, six articles par page, articles liés ; pages légales avec leur menu", () => {
    const journal = pages.get(NOCTIL_PAGES.journal)!;
    expect([...journal.matchAll(/class="fs-chip-filter[^"]*"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(["Tous", "La chambre", "Inspiration", "Histoires"]);
    expect(journal).toContain('data-paginate="6"');
    expect(journal).toContain("data-pager");
    expect(journal.match(/data-chip-item="/g)?.length).toBe(NOCTIL_ARTICLES.length);
    for (const a of NOCTIL_ARTICLES) expect(visibleText(pages.get(`/pages/${a.handle}`)!), a.handle).toContain("Articles liés");
    for (const handle of [NOCTIL_PAGES.mentions, NOCTIL_PAGES.cgv, NOCTIL_PAGES.confidentialite, NOCTIL_PAGES.cookies]) {
      const html = pages.get(handle)!;
      expect(html, handle).toContain('class="es-legal__pages"');
      expect(html.match(/aria-current="page"/g)?.length, handle).toBeGreaterThanOrEqual(1);
    }
  });

  it("bandeau de cookies : catégories facultatives refusées par défaut, « Tout refuser » aussi visible que « Tout accepter »", () => {
    expect(spec.settings.cookie_banner).toBe(true);
    const html = pages.get("/")!;
    expect(html).toContain("data-cookie-banner");
    const prefs = html.slice(html.indexOf("data-cookie-prefs"), html.indexOf("</form>", html.indexOf("data-cookie-prefs")));
    expect(prefs).not.toMatch(/checked/);
    const refuse = html.match(/<button[^>]*data-cookie-choice="refuse"[^>]*>/)![0], accept = html.match(/<button[^>]*data-cookie-choice="accept"[^>]*>/)![0];
    expect(refuse).not.toMatch(/hidden/);
    expect(accept).not.toMatch(/hidden/);
    expect(html).toContain(`href="${NOCTIL_PAGES.cookies}"`);
  });

  it("page introuvable illustrée, retour à l'accueil", async () => {
    const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, "/pages/inexistante", new URLSearchParams()))).html;
    expect(visibleText(html)).toContain("Cette étoile semble introuvable");
    expect(html).toContain('class="es-star-illus"');
  });

  it("liens internes : chaque lien de page mène à une page existante de la démonstration", () => {
    const known = new Set(["/", "/search", "/cart", "/collections/all", ...routes]);
    for (const [route, html] of pages) for (const m of html.matchAll(/href="(\/(?:pages|products|collections)\/[^"#?]*)"/g)) expect(known.has(m[1]), `${route} → ${m[1]}`).toBe(true);
    for (const [route, html] of pages) expect(html, route).not.toMatch(/<a [^>]*href="#"(?![^>]*data-)/);
  });
});

describe("NOCTIL appliqué à un autre projet : identité du projet, jamais celle de la démonstration", async () => {
  const user = await createUser("noctil-autre@example.invalid", "isolated-test-only", "Autre");
  it("aucune trace de la démo (textes, images, prix), couleurs et nom du projet ; sans produit détouré, aucun débordement", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: ID });
    const built = await fr(() => composeShop(pid, ID, null, false));
    const spec = built.spec;
    expect(spec.direction).toBe(ID);
    expect(spec.settings.conversion_profile).toBe("astral");
    expect(spec.store.product.price).not.toBe(NOCTIL_PRICE);
    const files = compileTheme(spec);
    for (const route of ["/", `/products/${spec.store.product.handle}`]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      expect(visibleText(html), route).not.toMatch(/NOCTIL|galaxie|projecteur|Prix de démonstration|petit monde/i);
      expect(html, route).not.toMatch(/theme-assets\/noctil|noctil-(produit|projecteur|hero|logo|tipi|peluches)/);
      expect(html).toContain("Atelier Verre");
      expect(html.match(/<h1[\s>]/g)?.length, route).toBe(1);
    }
    const rise = Object.values(spec.templates.index.sections).find((s) => s.type === "cv-rise");
    if (rise && !String(rise.settings.image_asset ?? "").includes("detoure")) expect(rise.settings.overlap).toBe("none");
    expect(JSON.stringify(spec.settings.color_schemes).toUpperCase()).not.toMatch(/#B9A6F9/);
  });

  it("bandeaux des pages chez un client : titre de la page en ouverture, un argument différent par bandeau, « Une question ? » sur les pages d'aide", async () => {
    const f = await clientFixture({ services: false, copySource: "ai" });
    await fr(() => buildShop(null, f.pid, { direction: ID, useAi: false }));
    const spec = currentTheme(f.pid)!.spec;
    const pageTitle = (template: string) => spec.store.pages.find((x) => `page.${x.template_suffix}` === template)?.title;
    for (const [template, page] of Object.entries(spec.templates)) {
      const banners = (page.order ?? Object.keys(page.sections)).map((id) => page.sections[id]).filter((s) => s?.type === "cv-banner" && !s.disabled);
      const headings = banners.map((s) => String(s.settings.heading));
      expect(new Set(headings).size, template).toBe(headings.length);
      const hero = banners.find((s) => s.settings.heading_tag === "h1");
      if (template.startsWith("page.") && hero) expect(hero.settings.heading, template).toBe(pageTitle(template));
    }
    expect(spec.templates["page.mentions-legales"]?.sections.hero?.settings.heading).not.toBe(loadProject(f.pid).product.name);
    expect(spec.templates["page.livraison-retours"]?.sections.question?.settings.heading).toBe("Une question ?");
  });

  it("détourage du client avec une grande marge transparente : la remontée en tient compte (haut visible du produit)", async () => {
    const f = await clientFixture({ services: false, copySource: "ai", brand: "Céramor" });
    // Dessin d'essai à fond transparent : le haut du produit est à 24 % de la hauteur (la démonstration : 8,85 %).
    const cut = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><path d="M250 330 Q450 250 650 330 L640 640 Q450 720 260 640 Z" fill="#325d67"/><circle cx="450" cy="250" r="30" fill="#2a4f58"/></svg>`)).png().toBuffer();
    await saveAsset({ projectId: f.pid, userId: f.user.id, data: cut, name: "theiere-detouree.png", mime: "image/png", origin: "upload", role: "cutout", status: "approved", meta: { width: 900, height: 900, alt: "Théière détourée" } });
    await fr(() => buildShop(null, f.pid, { direction: ID, useAi: false }));
    const rise = Object.values(currentTheme(f.pid)!.spec.templates.index.sections).find((s) => s.type === "cv-rise")!;
    expect(rise.settings.overlap).toBe("auto");
    expect(rise.settings.rise).toBe(36);
    expect(rise.settings.mobile_rise).toBe(50);
  });
});

describe("NOCTIL : exports", async () => {
  const user = await createUser("noctil-exports@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, ID));
  const media = NOCTIL_MEDIA.map((m) => `${ID}-${m.file}`);

  it("couche de design : classes du profil sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining(["es-conversion-astral", `dir-${ID}`]));
    for (const s of ["conversion.js", "family.js"]) expect(d.scripts).toContain(s);
  });

  it("Shopify : tous les médias (le détourage en PNG), sections, profil, polices", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, f).toContain(f);
    expect(names).toMatch(/assets\/noctil-projecteur-detoure\.png/);
    const json = zipText(z, /\.json$/);
    expect(json).toMatch(/"conversion_profile":\s*"astral"/);
    for (const t of ["cv-banner", "cv-rise", "cv-cards", "cv-steps", "fs-journal", "faq", "features-grid", "cv-gallery", "demo-order", "demo-account", "legal-page", "contact-form"]) expect(names + json, t).toContain(t);
    expect(zipText(z, /conversion\.css$/)).toContain('body[data-conversion="astral"]');
    expect(zipText(z, /conversion\.css$/)).toContain(".cv-rise__media{");
    expect(json).toMatch(/"type_heading_font":\s*"nunito_n8"/);
    expect(names + json + zipText(z, /\.(csv|liquid)$/)).not.toMatch(/\/home\/|\/tmp\/|localhost|127\.0\.0\.1/);
  });

  for (const platform of ["woocommerce", "prestashop"] as const) it(`${platform} : médias, feuilles réécrites, scripts et classes du profil`, async () => {
    const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
    expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of media) expect(names, `${platform} ${f}`).toContain(f);
    const css = zipText(z, /\.css$/);
    expect(css).toContain("body.es-conversion-astral");
    expect(css).toContain(".cv-rise__media{");
    const all = names + zipText(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
    expect(all).toContain("es-conversion-astral");
    expect(all).not.toMatch(/\/home\/user|\/tmp\/ecs-/);
  });
});
