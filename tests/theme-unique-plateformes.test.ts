/**
 * Chantier « plateformes » (16 novembre 2026) : un site monté par SINA en style vente directe doit FONCTIONNER dans
 * WooCommerce et PrestaShop, pas seulement s'afficher (les lots, le pack, la barre d'achat), et aucune remise ne
 * s'affiche que la plateforme ne tient pas.
 *
 * Ici, sans IA ni réseau : les adaptateurs du contrat « tnBoutique » construisent les bonnes requêtes (faux fetch) ;
 * l'export de chaque plateforme contient le script commun, son adaptateur, les données de l'offre et le code des
 * remises ; un pack de 3 avec cadeau donne les bonnes lignes et le bon total ; sans stock géré, aucun « plus que N » ;
 * `remisesConfirmees` ne dit oui que sur preuve ; les remises Shopify partent par l'API d'administration (simulée).
 * L'essai sur de vraies installations locales (WordPress + WooCommerce, PrestaShop) se fait à part :
 * PLATEFORMES_OUT=<dossier> écrit les archives du site d'essai, que scripts/plateformes-essai.cjs installe et achète.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { OFFRE_ESSAI, siteEssai } from "./plateformes-fixtures";
import * as R from "@/lib/syna-agent/custom-theme/remises";

process.env.STUDIO_SYNA_AGENT = "1";
const ROOT = process.cwd();
/** Charge un adaptateur comme un module, hors navigateur (aucun « document » : il ne s'installe pas tout seul). */
const charge = (f: string) => { const m = { exports: {} as { creer: (c: unknown, d: unknown) => Boutique } }; new Function("module", "window", fs.readFileSync(path.join(ROOT, "public/sections", f), "utf8"))(m, {}); return m.exports; };
const woo = charge("boutique-woocommerce.js");
const presta = charge("boutique-prestashop.js");
type Panier = { nombre: number; total: number; lignes: { id: string; quantite: number; titre: string; prix: number; cadeau?: boolean }[] };
type Boutique = { ajouter: (l: unknown[], o?: unknown) => Promise<Panier>; panier: () => Promise<Panier>; argent: (c: number) => string; allerAuPanier: () => void };
type Appel = { url: string; method: string; headers: Record<string, string>; body: string };
/** Faux réseau : garde chaque requête, répond ce que `repondre` rend. */
function faux(repondre: (a: Appel, n: number) => { status?: number; json: unknown; headers?: Record<string, string> }) {
  const appels: Appel[] = [];
  const f = async (url: string, o: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const a = { url, method: o.method ?? "GET", headers: o.headers ?? {}, body: o.body ?? "" };
    appels.push(a);
    const r = repondre(a, appels.length);
    return { ok: (r.status ?? 200) < 400, status: r.status ?? 200, headers: { get: (k: string) => r.headers?.[k] ?? null }, json: async () => r.json };
  };
  return { f, appels };
}
const php = (() => { try { execFileSync("php", ["-v"], { stdio: "ignore" }); return true; } catch { return false; } })();
const texte = (z: Record<string, Uint8Array>, f: string) => strFromU8(z[f]);

describe("l'offre : une seule règle pour les trois plateformes", () => {
  it("lots et packs deviennent des paliers par quantité ; le cadeau a sa condition ; l'empreinte suit les règles", () => {
    const o = OFFRE_ESSAI();
    expect(o.produits["tee-essai"].paliers).toEqual([{ quantite: 2, pourcent: 10 }, { quantite: 3, pourcent: 20 }]);
    expect(o.produits["tee-essai"].cadeaux).toEqual([{ des: 3, handle: "chaussettes-essai", sku: null, quantite: 1, titre: "Chaussettes d'essai", pack: "le-trio" }]);
    expect(o.produits["tee-essai"].packs.map((k) => [k.id, k.quantite, k.pourcent, !!k.populaire])).toEqual([["un-tee", 1, 0, false], ["le-duo", 2, 10, false], ["le-trio", 3, 20, true]]);
    // Les chaussettes sont le cadeau : elles gardent les mêmes paliers, jamais elles-mêmes en cadeau.
    expect(o.produits["chaussettes-essai"].cadeaux).toEqual([]);
    // Un pack à prix fixe devient le pourcentage qui donne ce prix : 3 tees à 69,60 € = −20 %.
    expect(R.offreDepuisOffres({ packs: [{ quantite: 3, nom: "Trio", prixCentimes: 6960 }] }, [{ handle: "tee-essai", centimes: 2900 }]).offre.produits["tee-essai"].paliers).toEqual([{ quantite: 3, pourcent: 20 }]);
    expect(R.offreDepuisOffres({ packs: [{ quantite: 3, nom: "Trio", prixCentimes: 6960 }] }, [{ handle: "tee-essai" }]).nonTenu[0]).toContain("n'a pas de prix");
    expect(o.empreinte).toMatch(/^[0-9a-f]{16}$/);
    expect(R.offreBoutique({ produits: [{ handle: "tee-essai", lots: [{ quantite: 2, pourcent: 12 }] }] }).empreinte).not.toBe(o.empreinte);
    // Ce que le panier ne tiendrait pas de la même façon partout est refusé.
    expect(() => R.offreBoutique({ produits: [{ handle: "a", lots: [{ quantite: 3, pourcent: 10 }], packs: [{ id: "p", titre: "P", quantite: 3, pourcent: 20 }] }] })).toThrow(/deux remises différentes pour 3 articles/);
    expect(() => R.offreBoutique({ produits: [{ handle: "a", packs: [{ id: "p", titre: "P", quantite: 3, pourcent: 20, cadeau: { handle: "a", quantite: 1, titre: "A" } }] }] })).toThrow(/un autre produit/);
    expect(() => R.offreBoutique({ produits: [{ handle: "a", lots: [{ quantite: 2, pourcent: 20 }, { quantite: 3, pourcent: 10 }] }] })).toThrow(/moins remisés/);
    // « N achetés, M offerts » n'est pas converti : il ne doit pas s'afficher.
    const b = R.offreDepuisLots({ kind: "bogo", buy: 2, free: 1 }, ["a"]);
    expect(R.offreVide(b.offre)).toBe(true);
    expect(b.nonTenu[0]).toContain("2 achetés, 1 offert");
    expect(R.offreDepuisLots({ kind: "lots", tiers: [{ qty: 2, pct: 10 }] }, ["a", "b"]).offre.produits.b.paliers).toEqual([{ quantite: 2, pourcent: 10 }]);
  });

  it("un pack de 3 avec cadeau : trois versions différentes, le cadeau sur sa ligne, le bon total", () => {
    const lignes = R.lignesDuPack(["101", "102", "104"], "900");
    expect(lignes).toEqual([{ id: "101", quantite: 1 }, { id: "102", quantite: 1 }, { id: "104", quantite: 1 }, { id: "900", quantite: 1, cadeau: true }]);
    // Deux fois la même version : une seule ligne, quantité 2 (comme tnAchat.lignes du script commun).
    expect(R.lignesDuPack(["101", "101", "104"])).toEqual([{ id: "101", quantite: 2 }, { id: "104", quantite: 1 }]);
    const catalogue = { "101": { handle: "tee-essai", centimes: 2900 }, "102": { handle: "tee-essai", centimes: 2900 }, "104": { handle: "tee-essai", centimes: 2900 }, "900": { handle: "chaussettes-essai", centimes: 900 } };
    const p = R.panierAttendu(OFFRE_ESSAI(), catalogue, lignes);
    expect(p.lignes).toEqual([
      { id: "101", quantite: 1, unitaire: 2320, prix: 2320, cadeau: false }, { id: "102", quantite: 1, unitaire: 2320, prix: 2320, cadeau: false }, { id: "104", quantite: 1, unitaire: 2320, prix: 2320, cadeau: false },
      { id: "900", quantite: 1, unitaire: 0, prix: 0, cadeau: true },
    ]);
    expect(p.total).toBe(6960);
    expect(p.nombre).toBe(4);
    // Deux articles : le lot (−10 %), pas de cadeau. Un seul : plein prix. Sans offre : plein prix.
    expect(R.panierAttendu(OFFRE_ESSAI(), catalogue, [{ id: "101", quantite: 2 }])).toMatchObject({ total: 5220, nombre: 2 });
    expect(R.panierAttendu(OFFRE_ESSAI(), catalogue, [{ id: "101", quantite: 1 }])).toMatchObject({ total: 2900, nombre: 1 });
    expect(R.panierAttendu(null, catalogue, lignes).total).toBe(8700);
    // Le script commun rend les mêmes lignes.
    const win: { tnAchat?: { lignes: (p: unknown) => unknown } } = {};
    new Function("window", "document", fs.readFileSync(path.join(ROOT, "public/sections/tenue-achat.js"), "utf8").split("\n(function () {\n  if (window.tnAchat.pret)")[0])(win, {});
    expect(win.tnAchat!.lignes({ articles: ["101", "102", "104"], cadeau: "900" })).toEqual(lignes);
  });

  it("remisesConfirmees : oui seulement sur preuve, pour CES règles, et récente", async () => {
    const o = OFFRE_ESSAI(), t = 1_800_000_000_000;
    expect(R.remisesConfirmees(null, null).ok).toBe(true);
    expect(R.remisesConfirmees(o, null).ok).toBe(false);
    expect(R.remisesConfirmees(o, { plateforme: "woocommerce", empreinte: o.empreinte, actif: false, manque: ["cadeau introuvable"], luLe: t }, { maintenant: t })).toMatchObject({ ok: false, pourquoi: expect.stringContaining("cadeau introuvable") });
    expect(R.remisesConfirmees(o, { plateforme: "woocommerce", empreinte: "autre", actif: true, luLe: t }, { maintenant: t }).ok).toBe(false);
    expect(R.remisesConfirmees(o, { plateforme: "woocommerce", empreinte: o.empreinte, actif: true, luLe: t - 3 * 24 * 3600_000 }, { maintenant: t }).ok).toBe(false);
    expect(R.remisesConfirmees(o, { plateforme: "prestashop", empreinte: o.empreinte, actif: true, luLe: t }, { maintenant: t }).ok).toBe(true);
    // La boutique est interrogée à son adresse d'état ; une panne vaut « non confirmé ».
    const ok = faux(() => ({ json: { empreinte: o.empreinte, actif: true, manque: [] } }));
    const preuve = await R.lirePreuveRemises("woocommerce", "https://boutique.example/", ok.f as never, t);
    expect(ok.appels[0].url).toBe("https://boutique.example/?rest_route=/es/v1/offre");
    expect(R.remisesConfirmees(o, preuve, { maintenant: t }).ok).toBe(true);
    const ps = faux(() => ({ json: { empreinte: o.empreinte, actif: false, manque: ["les remises de cette offre ne sont pas encore posées"] } }));
    const p2 = await R.lirePreuveRemises("prestashop", "https://boutique.example", ps.f as never, t);
    expect(ps.appels[0].url).toBe("https://boutique.example/index.php?fc=module&module=esstudio&controller=offre");
    expect(R.remisesConfirmees(o, p2, { maintenant: t }).ok).toBe(false);
    expect((await R.lirePreuveRemises("woocommerce", "https://x.example", (async () => { throw new Error("réseau"); }) as never, t)).actif).toBe(false);
    expect((await R.lirePreuveRemises("woocommerce", "https://x.example", faux(() => ({ status: 404, json: {} })).f as never, t)).manque).toEqual(["la boutique a répondu 404"]);
  });
});

describe("adaptateurs du contrat « tnBoutique »", () => {
  const cartWoo = {
    items_count: 4,
    items: [
      { id: 101, quantity: 1, name: "Tee d&#039;essai", variation: [{ attribute: "Couleur", value: "Noir" }, { attribute: "Taille", value: "S" }], totals: { line_total: "2320", line_total_tax: "0" }, extensions: { es: { cadeau: false } } },
      { id: 900, quantity: 1, name: "Chaussettes", variation: [], totals: { line_total: "0", line_total_tax: "0" }, extensions: { es: { cadeau: true } } },
    ],
    totals: { total_items: "6960", total_items_tax: "0", total_discount: "0", total_discount_tax: "0", total_price: "7450", currency_minor_unit: 2 },
  };

  it("WooCommerce : une requête add-item par ligne, à la suite, avec le jeton « Nonce » renouvelé ; le cadeau n'est pas envoyé ; le panier est relu", async () => {
    const r = faux((a, n) => ({ json: cartWoo, headers: { Nonce: `jeton-${n + 1}` } }));
    const b = woo.creer({ api: "https://b.example/wp-json/wc/store/v1/", jeton: "jeton-1", panier: "https://b.example/panier/" }, { fetch: r.f });
    const p = await b.ajouter(R.lignesDuPack(["101", "102", "104"], "900"));
    expect(r.appels.map((a) => `${a.method} ${a.url}`)).toEqual(["POST https://b.example/wp-json/wc/store/v1/cart/add-item", "POST https://b.example/wp-json/wc/store/v1/cart/add-item", "POST https://b.example/wp-json/wc/store/v1/cart/add-item", "GET https://b.example/wp-json/wc/store/v1/cart"]);
    expect(r.appels.slice(0, 3).map((a) => JSON.parse(a.body))).toEqual([{ id: 101, quantity: 1 }, { id: 102, quantity: 1 }, { id: 104, quantity: 1 }]);
    expect(r.appels.slice(0, 3).map((a) => a.headers.Nonce)).toEqual(["jeton-1", "jeton-2", "jeton-3"]);
    expect(r.appels[0].headers["Content-Type"]).toBe("application/json");
    // Le panier du contrat : articles, total remisé de la boutique (sans la livraison), lignes en centimes, cadeau signalé.
    expect(p).toEqual({ nombre: 4, total: 6960, lignes: [{ id: "101", quantite: 1, titre: "Tee d'essai · Noir / S", prix: 2320 }, { id: "900", quantite: 1, titre: "Chaussettes", prix: 0, cadeau: true }] });
  });

  it("WooCommerce : le message de la boutique est rendu tel quel au client ; rien n'est envoyé sans article", async () => {
    const r = faux(() => ({ status: 400, json: { code: "woocommerce_rest_product_partially_out_of_stock", message: "Vous ne pouvez pas ajouter cette quantit&eacute; : <strong>3 en stock</strong>." } }));
    const b = woo.creer({ api: "/wp-json/wc/store/v1/", jeton: "j" }, { fetch: r.f });
    await expect(b.ajouter([{ id: "101", quantite: 9 }])).rejects.toThrow(/3 en stock/);
    await expect(b.ajouter([{ id: "900", quantite: 1, cadeau: true }])).rejects.toThrow("Aucun article à ajouter.");
    expect(r.appels).toHaveLength(1);
    expect(b.argent(6960)).toBe("69,60 €");
    expect(b.argent(2900)).toBe("29 €");
    expect(woo.creer({ argent: { avant: "$", apres: "", virgule: ".", milliers: "," } }, {}).argent(123450)).toBe("$1,234.50");
  });

  it("PrestaShop : le contrôleur du panier, en requête, avec id_product, id_product_attribute, qty et le jeton ; puis le panier du module", async () => {
    const r = faux((a) => (a.method === "POST" ? { json: { success: true, hasError: false, errors: [] } } : { json: { nombre: 4, total: 6960, lignes: [{ id: "12-31", quantite: 1, titre: "Tee d'essai · Couleur : Noir", prix: 2320, cadeau: false }, { id: "13-0", quantite: 1, titre: "Chaussettes", prix: 0, cadeau: true }] } }));
    const b = presta.creer({ ajout: "https://b.example/panier", lecture: "https://b.example/module/esstudio/panier", jeton: "abc123", panier: "https://b.example/panier?action=show" }, { fetch: r.f });
    const p = await b.ajouter(R.lignesDuPack(["12-31", "12-32", "12-36"], "13-0"));
    expect(r.appels.map((a) => `${a.method} ${a.url}`)).toEqual(["POST https://b.example/panier", "POST https://b.example/panier", "POST https://b.example/panier", "GET https://b.example/module/esstudio/panier"]);
    const corps = r.appels.slice(0, 3).map((a) => Object.fromEntries(new URLSearchParams(a.body)));
    expect(corps[0]).toEqual({ ajax: "1", action: "update", add: "1", op: "up", id_product: "12", id_product_attribute: "31", id_customization: "0", qty: "1", token: "abc123" });
    expect(corps.map((c) => c.id_product_attribute)).toEqual(["31", "32", "36"]);
    expect(r.appels[0].headers["Content-Type"]).toContain("application/x-www-form-urlencoded");
    expect(p).toEqual({ nombre: 4, total: 6960, lignes: [{ id: "12-31", quantite: 1, titre: "Tee d'essai · Couleur : Noir", prix: 2320 }, { id: "13-0", quantite: 1, titre: "Chaussettes", prix: 0, cadeau: true }] });
    // Un produit sans déclinaison : « 13 » vaut « 13-0 ».
    await b.ajouter([{ id: "13", quantite: 2 }]);
    expect(Object.fromEntries(new URLSearchParams(r.appels[4].body))).toMatchObject({ id_product: "13", id_product_attribute: "0", qty: "2" });
  });

  it("PrestaShop : l'erreur de PrestaShop (stock) est rendue au client ; un identifiant inconnu est refusé sans requête", async () => {
    const r = faux(() => ({ json: { hasError: true, errors: ["Il n'y a pas assez de produits en stock."] } }));
    const b = presta.creer({ ajout: "/panier", lecture: "/module/esstudio/panier", jeton: "t" }, { fetch: r.f });
    await expect(b.ajouter([{ id: "12-31", quantite: 99 }])).rejects.toThrow("Il n'y a pas assez de produits en stock.");
    await expect(b.ajouter([{ id: "abc", quantite: 1 }])).rejects.toThrow("Version inconnue.");
    expect(r.appels).toHaveLength(1);
  });
});

describe("exports WooCommerce et PrestaShop d'un site monté par SINA", async () => {
  const { cmsExport } = await import("@/lib/cms-v2/export");
  const { spec, problemes } = await siteEssai();
  const offre = OFFRE_ESSAI();
  const out = process.env.PLATEFORMES_OUT;
  const exp = { woo: await cmsExport("woocommerce", spec, async () => null, { offre }), ps: await cmsExport("prestashop", spec, async () => null, { offre }) };
  const z = { woo: unzipSync(new Uint8Array(exp.woo.zip)), ps: unzipSync(new Uint8Array(exp.ps.zip)) };
  const racine = Object.keys(z.woo)[0].split("/")[0];
  if (out) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, "woocommerce.zip"), exp.woo.zip); fs.writeFileSync(path.join(out, "prestashop.zip"), exp.ps.zip); fs.writeFileSync(path.join(out, "offre.json"), JSON.stringify(offre, null, 1)); }

  it("le site d'essai se convertit sans blocage et ne perd aucune pièce de sa fiche produit", () => {
    expect(problemes).toEqual([]);
    for (const e of [exp.woo, exp.ps]) expect(e.issues.filter((i) => i.severity === "blocking").map((i) => i.detail)).toEqual([]);
    expect(spec.templates.product.order).toEqual(["tn-buy", "tn-v1", "tn-packs", "tn-sb", "tn-g1"]);
  });

  it("WooCommerce : la fiche produit est celle du site (ses pièces), plus la fiche native ; scripts, offre et code des remises partent", () => {
    const fiche = texte(z.woo, `${racine}/templates/single-product.html`);
    for (const type of ["es-custom-buy", "es-custom-v1", "es-custom-packs", "es-custom-sb", "es-custom-g1"]) {
      expect(fiche, type).toContain(`"type":"${type}"`);
      expect(z.woo[`${racine}/inc/sections/${type}.liquid`], type).toBeTruthy();
    }
    expect(fiche).not.toContain("woocommerce/add-to-cart-form");
    expect(fiche).toContain("wp:woocommerce/store-notices");
    // Le script commun, l'adaptateur, les données de l'offre, le code des remises.
    expect(texte(z.woo, `${racine}/assets/js/tenue-achat.js`)).toContain("window.tnBoutique");
    expect(texte(z.woo, `${racine}/assets/js/boutique-woocommerce.js`)).toContain("cart/add-item");
    expect(JSON.parse(texte(z.woo, `${racine}/inc/offre.json`))).toEqual(offre);
    const achat = texte(z.woo, `${racine}/inc/es-achat.php`);
    for (const mot of ["woocommerce_before_calculate_totals", "es_cadeau", "register_rest_route('es/v1', '/offre'", "wp_create_nonce('wc_store_api')", "managing_stock()"]) expect(achat, mot).toContain(mot);
    expect(texte(z.woo, `${racine}/inc/es-woo.php`)).toContain("es-achat.php");
    expect(z.woo[`${racine}/inc/php/es-fiche.php`]).toBeTruthy();
    // Les pièces ne portent plus d'adresses propres à Shopify que WordPress ne saurait pas mener.
    expect(texte(z.woo, `${racine}/inc/sections/es-custom-packs.liquid`)).toContain("all_products.chaussettes-essai");
    expect(texte(z.woo, `${racine}/inc/sections/es-custom-buy.liquid`)).not.toContain("boutique-shopify.js");
    expect(texte(z.woo, `${racine}/assets/css/es-woo.css`)).toContain(".tn-achat>.tn-barre:not([hidden]){display:flex;transform:none}");
    expect(texte(z.woo, `${racine}/inc/sections/es-custom-g1.liquid`)).not.toContain("routes.root_url }}pages");
    expect(exp.woo.issues.map((i) => i.code)).toContain("offer_rules_delivered");
    expect(exp.woo.issues.map((i) => i.code)).not.toContain("product_layouts_shared");
  });

  it("PrestaShop : la fiche produit est rendue par le module avec le vrai produit ; scripts, offre et règles natives partent", () => {
    expect(texte(z.ps, "templates/catalog/product.tpl")).toContain("{hook h='displayEsFiche' product=$product}");
    const plan = JSON.parse(texte(z.ps, "config/es-fiche.json"));
    expect(plan.commune.map((x: { type: string }) => x.type)).toEqual(["es-custom-buy", "es-custom-v1", "es-custom-packs", "es-custom-sb", "es-custom-g1"]);
    for (const x of plan.commune) expect(z.ps[`dependencies/modules/esstudio/liquid/sections/${x.type}.liquid`], x.type).toBeTruthy();
    expect(z.ps["dependencies/modules/esstudio/php/es-liquid.php"]).toBeTruthy();
    expect(z.ps["dependencies/modules/esstudio/php/es-fiche.php"]).toBeTruthy();
    const yml = texte(z.ps, "config/theme.yml");
    expect(yml).toContain("path: assets/js/boutique-prestashop.js");
    expect(yml).toContain("path: assets/js/tenue-achat.js");
    expect(texte(z.ps, "assets/js/boutique-prestashop.js")).toContain("id_product_attribute=");
    expect(texte(z.ps, "assets/js/tenue-achat.js")).toContain("window.tnBoutique");
    expect(JSON.parse(texte(z.ps, "dependencies/modules/esstudio/offre.json"))).toEqual(offre);
    expect(JSON.parse(texte(z.ps, "config/es-offre.json"))).toEqual(offre);
    const achat = texte(z.ps, "dependencies/modules/esstudio/achat.php");
    for (const mot of ["new SpecificPrice()", "from_quantity", "new CartRule()", "gift_product", "cart_rule_product_rule_group", "PS_STOCK_MANAGEMENT"]) expect(achat, mot).toContain(mot);
    for (const c of ["panier", "offre", "ajout"]) expect(z.ps[`dependencies/modules/esstudio/controllers/front/${c}.php`], c).toBeTruthy();
    // L'accueil : la pièce qui vend (prix, bouton) n'est pas figée, le module la rend avec le vrai produit.
    const home = texte(z.ps, "templates/es/home.tpl");
    expect(home).toMatch(/\{hook h='displayEsPiece' type='es-custom-ap' id='[\w-]*tn-ap'\}/);
    expect(home).not.toContain('name="id" value="1000"');
    expect(home).not.toContain("29,00");
    expect(plan.vivantes).toContain("es-custom-ap");
    expect(texte(z.ps, "templates/layouts/layout-full-width.tpl")).toContain("$page.page_name == 'product'");
    expect(texte(z.ps, "assets/css/es-ps.css")).toContain(".tn-achat>.tn-barre:not([hidden]){display:flex;transform:none}");
    expect(texte(z.ps, "dependencies/modules/esstudio/liquid/sections/es-custom-buy.liquid")).not.toContain("boutique-shopify.js");
    // Le module seul (mise à jour sans changer de thème) porte aussi l'achat.
    const mod = unzipSync(z.ps["import/module-esstudio.zip"]);
    for (const f of ["esstudio/achat.php", "esstudio/offre.json", "esstudio/fiche.json", "esstudio/php/es-fiche.php", "esstudio/liquid/sections/es-custom-buy.liquid"]) expect(mod[f], f).toBeTruthy();
  });

  it("sans offre donnée, aucune donnée d'offre ne part ; un site sans pièce à tenue garde sa fiche native", async () => {
    const sans = await cmsExport("woocommerce", spec, async () => null, { offre: null });
    const zs = unzipSync(new Uint8Array(sans.zip));
    expect(zs[`${racine}/inc/offre.json`]).toBeUndefined();
    expect(zs[`${racine}/inc/es-achat.php`]).toBeTruthy();
    expect(sans.issues.map((i) => i.code)).not.toContain("offer_rules_delivered");
    const { fichesTenue, aDesPiecesTenue, offrePourExport } = await import("@/lib/cms-v2/achat");
    expect(fichesTenue(spec)!.commune.sections.map((x) => x.id)).toEqual(["tn-buy", "tn-v1", "tn-packs", "tn-sb", "tn-g1"]);
    const ancien = structuredClone(spec);
    ancien.templates.product = { sections: { main: { type: "main-product", settings: {} } }, order: ["main"] };
    expect(fichesTenue(ancien)).toBeNull();
    expect(aDesPiecesTenue(ancien)).toBe(true);
    // Une règle dont le produit ou le cadeau n'est pas au catalogue ne part pas, et c'est dit.
    const autre = R.offreBoutique({ produits: [{ handle: "absent", lots: [{ quantite: 2, pourcent: 10 }] }] });
    expect(offrePourExport(autre, spec)).toEqual({ offre: null, ecartes: ["produit « absent » absent du catalogue"] });
    const cadeauAbsent = R.offreBoutique({ produits: [{ handle: "tee-essai", packs: [{ id: "p", titre: "P", quantite: 3, pourcent: 20, cadeau: { handle: "absent", quantite: 1, titre: "X" } }] }] });
    expect(offrePourExport(cadeauAbsent, spec).ecartes).toEqual(["cadeau « absent » absent du catalogue"]);
    // L'offre d'essai passe entière (mêmes règles, même empreinte).
    expect(offrePourExport(offre, spec)).toEqual({ offre, ecartes: [] });
  });

  it.skipIf(!php)("moteur PHP des exports : les pièces sont rendues avec le VRAI produit (prix, versions, stock, identifiants)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-plateformes-"));
    try {
      fs.mkdirSync(path.join(dir, "sections")); fs.mkdirSync(path.join(dir, "snippets"));
      for (const type of ["es-custom-buy", "es-custom-v1", "es-custom-packs", "es-custom-sb", "es-custom-ap"]) fs.writeFileSync(path.join(dir, "sections", `${type}.liquid`), z.woo[`${racine}/inc/sections/${type}.liquid`]);
      const script = (stockGere: boolean, offreEnPlace: boolean) => `<?php
require ${JSON.stringify(path.join(ROOT, "assets/cms/php/es-liquid.php"))};
$v = function ($id, $c, $t, $stock, $dispo = true) { return ['id' => $id, 'options' => [$c, $t], 'centimes' => 2900, 'dispo' => $dispo, 'sku' => "TEE-$c-$t", 'stock' => ${stockGere ? "$stock" : "null"}, 'url' => '/produit/tee-essai/?variant=' . $id]; };
$tee = es_fiche_objet(['id' => 12, 'titre' => "Tee d'essai", 'handle' => 'tee-essai', 'url' => '/produit/tee-essai/', 'images' => [['src' => '/tee.jpg', 'alt' => 'Tee']],
  'options' => [['nom' => 'Couleur', 'valeurs' => [['nom' => 'Noir', 'teinte' => '#111111'], ['nom' => 'Sable']]], ['nom' => 'Taille', 'valeurs' => [['nom' => 'S'], ['nom' => 'M'], ['nom' => 'L']]]],
  'versions' => [$v(101, 'Noir', 'S', 20), $v(102, 'Noir', 'M', 21), $v(103, 'Noir', 'L', 0, false), $v(104, 'Sable', 'S', 20), $v(105, 'Sable', 'M', 21), $v(106, 'Sable', 'L', 3)]]);
$chaussettes = es_fiche_objet(['id' => 13, 'titre' => "Chaussettes d'essai", 'handle' => 'chaussettes-essai', 'url' => '/produit/chaussettes-essai/', 'versions' => [['id' => 900, 'options' => [], 'centimes' => 900, 'dispo' => true, 'stock' => null]]]);
$g = ['product' => $tee, 'all_products' => ['tee-essai' => $tee, 'chaussettes-essai' => $chaussettes], 'routes' => ['root_url' => '/', 'cart_url' => '/panier/']];
$out = [];
foreach (['es-custom-buy', 'es-custom-v1', 'es-custom-packs', 'es-custom-sb'] as $t) $out[$t] = es_fiche_garde(es_liquid_render_section(${JSON.stringify(dir)}, $t, ['id' => 'x', 'settings' => [], 'blocks' => []], $g), ${offreEnPlace ? "true" : "false"});
$g['product'] = null;
$out['es-custom-ap'] = es_liquid_render_section(${JSON.stringify(dir)}, 'es-custom-ap', ['id' => 'x', 'settings' => [], 'blocks' => []], $g);
echo json_encode($out);`;
      const rendu = (stockGere: boolean, offreEnPlace: boolean): Record<string, string> => { const f = path.join(dir, "t.php"); fs.writeFileSync(f, script(stockGere, offreEnPlace)); return JSON.parse(execFileSync("php", [f], { encoding: "utf8", timeout: 30_000 })); };
      const a = rendu(true, true);
      // Bloc d'achat : le vrai prix, chaque version avec SON identifiant, l'épuisée grisée, un vrai formulaire, la barre.
      expect(a["es-custom-buy"]).toContain('<div class="tn-prix">29,00 €</div>');
      expect(a["es-custom-buy"]).toContain('<option value="101" selected>Noir / S · 29,00 €</option><option value="102">Noir / M · 29,00 €</option><option value="103" disabled>Noir / L · 29,00 €</option>');
      expect(a["es-custom-buy"]).toMatch(/<form method="post"[^>]*class="tn-enveloppe"><input type="hidden" name="form_type" value="product">/);
      expect(a["es-custom-buy"]).toMatch(/<div class="tn-barre"[^>]*><b>Tee d'essai<\/b><button class="tn-bt" type="button" data-tn-acheter>/);
      // Jamais l'adaptateur de Shopify hors de Shopify : le thème exporté charge le sien.
      expect(a["es-custom-buy"]).not.toMatch(/boutique-shopify|<script src=/);
      // Pastilles : la teinte, la version visée, l'épuisée.
      expect(a["es-custom-v1"]).toContain('<a class="tn-pastille tn-on" href="/produit/tee-essai/?variant=101" style="--teinte:#111111"><span>Noir</span></a>');
      expect(a["es-custom-v1"]).toContain('<a class="tn-pastille" href="/produit/tee-essai/?variant=104"><span>Sable</span></a>');
      // Packs : prix calculés sur le vrai prix, cadeau par son identifiant de la boutique, table des versions avec le vrai stock.
      expect(a["es-custom-packs"]).toMatch(/data-tn-quantite="3" data-tn-prix="6960" data-tn-cadeau="900" data-tn-cadeau-nom="Chaussettes d&#0?39;essai"><em class="tn-pack-etiquette">Le plus populaire<\/em>/);
      expect(a["es-custom-packs"]).toContain('data-tn-quantite="2" data-tn-prix="5220"');
      expect(a["es-custom-packs"]).toContain("69,60 €");
      expect(a["es-custom-packs"]).toMatch(/<form method="post"[^>]*class="tn-packs-f"[^>]*data-tn-achat-form="oui">/);
      const tableDe = (html: string) => JSON.parse(/<script type="application\/json" data-tn-versions[^>]*>([\s\S]*?)<\/script>/.exec(html)![1]);
      const table = tableDe(a["es-custom-buy"]);
      expect(table).toHaveLength(6);
      expect(table[5]).toEqual({ id: "106", options: ["Sable", "L"], disponible: true, stock: 3, prix: 2900 });
      expect(table[2]).toMatchObject({ id: "103", disponible: false, stock: 0 });
      // « Plus que N » : la pièce porte le seuil du client ; le nombre vient de la table (vrai stock).
      expect(a["es-custom-sb"]).toContain('<p class="tn-stock" data-tn-stock data-tn-seuil="5"');
      // Accueil : « le produit, son prix, son bouton » lit le premier produit du catalogue par son adresse.
      expect(a["es-custom-ap"]).toContain(`<b class="tn-nom-a">Tee d'essai</b><div class="tn-prix">29,00 €</div>`);
      expect(a["es-custom-ap"]).toContain('<input type="hidden" name="id" value="101">');
      // Sans stock géré par la boutique : aucune quantité dans la table, donc aucun « plus que N » possible.
      const b = rendu(false, true);
      const sansStock = tableDe(b["es-custom-buy"]);
      for (const v of sansStock) expect(v, v.id).not.toHaveProperty("stock");
      // Remises pas en place dans la boutique : la pièce des packs n'est pas rendue du tout (le bloc d'achat reste).
      const c = rendu(true, false);
      expect(c["es-custom-packs"]).toBe("");
      expect(c["es-custom-buy"]).toContain('<div class="tn-prix">29,00 €</div>');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it.skipIf(!php)("PHP livré : aucune erreur de syntaxe", () => {
    for (const f of ["assets/cms/php/es-fiche.php", "assets/cms/php/es-liquid.php", "assets/cms/wordpress/es-achat.php", "assets/cms/wordpress/es-theme.php", "assets/cms/wordpress/es-woo.php", "assets/cms/prestashop/esstudio/achat.php", "assets/cms/prestashop/esstudio/esstudio.php", "assets/cms/prestashop/esstudio/controllers/front/panier.php", "assets/cms/prestashop/esstudio/controllers/front/offre.php", "assets/cms/prestashop/esstudio/controllers/front/ajout.php", "assets/cms/prestashop/esstudio/upgrade/upgrade-1.2.0.php"]) {
      expect(execFileSync("php", ["-l", path.join(ROOT, f)], { encoding: "utf8" }), f).toContain("No syntax errors");
    }
  });
});

describe("script commun : « plus que N » seulement avec le vrai stock", () => {
  it("une version sans « stock » ne déclenche jamais l'annonce ; sous le seuil, avec le vrai stock, oui", () => {
    const src = fs.readFileSync(path.join(ROOT, "public/sections/tenue-achat.js"), "utf8");
    // La règle est écrite dans le contrat du script, et son code ne lit que le « stock » numérique de la version.
    expect(src).toMatch(/data-tn-stock \+ data-tn-seuil[^\n]*seulement si la version a un « stock » numérique/);
    expect(src).toMatch(/typeof [\w.]+\.stock (?:===|!==) "number"/);
  });
});
