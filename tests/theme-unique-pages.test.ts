/**
 * Thème unique du Studio, chantier « pages » (lot 4, référence partie 15) : les pages simples en plusieurs mises en
 * page, le panier en tiroir et en page (deux versions chacun), la recherche, « bien reçu », la boutique fermée, et les
 * façons de bâtir ajoutées aux pièces de récit, aux bandeaux et aux fenêtres. Gratuit, sans IA, aucun appel réel.
 *
 * 1) Toujours : chaque pièce a ses façons, chaque façon nouvelle est dessinée dans la feuille du module, aucune règle
 *    ne cible une façon d'origine, la feuille respecte les règles d'écriture ; le panier garde lignes, quantités, total
 *    et bouton de commande vers la plateforme ; aucune page de commande dans le thème ; Shopify accepte les pièces.
 * 2) À la demande, PAGES_OUT=<dossier> : chaque façon est capturée sur téléphone et sur ordinateur, dans trois allures
 *    (le tiroir : ouvert, avec deux produits d'un catalogue d'essai). Rien ne doit dépasser de l'écran en largeur.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TENUE_SECTIONS, tenueSection, withTenueProducts, type TenueProduct } from "@/lib/syna-agent/custom-theme/tenue";
import { PAGES_FACONS, PAGES_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-pages";
import * as D from "@/lib/syna-agent/custom-theme/tenue-data";
import * as F from "./tenue-fauteuil-fixtures";
import * as K from "./tenue-sac-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";
const DIR = path.join(process.cwd(), "public", "sections");
const SHEET = fs.readFileSync(path.join(DIR, "tenue-pages.css"), "utf8");
const rootOf = (id: string) => /class="tn (tn-[a-z0-9-]+)/.exec(tenueSection(id)!.html)![1];
const sp = (x: string) => x.replace(/ /g, " ");

/** Toutes les façons attendues : la première est le rendu d'origine. */
const FACONS: Record<string, string[]> = {
  // pièces nouvelles
  "tn-tiroir": ["etroit", "large"],
  "tn-recherche": ["barre", "panneau"],
  "tn-questions-rubriques": ["empilees", "cartes"],
  "tn-merci": ["centre", "deux-colonnes"],
  "tn-fermee": ["photo-pleine", "moitie"],
  // pages simples et panier
  "tn-404": ["photo-au-centre", "grande-image", "produits"],
  "tn-legal": ["volets", "sommaire"],
  "tn-article": ["colonne", "grande-image"],
  "tn-compte": ["simple", "carte"],
  "tn-panier": ["empile", "deux-colonnes"],
  // récit, bandeaux, fenêtres
  "tn-places": ["file", "alternees"],
  "tn-resultats": ["lignes", "cartes"],
  "tn-annonce": ["centre", "defile", "filets"],
  "tn-pays": ["fenetre", "bande"],
  "tn-suivi": ["deux-parties", "cartes"],
  "tn-discussion": ["bulle", "bandeau"],
  "tn-manifeste": ["sombre", "clair-centre"],
  "tn-cookies": ["bandeau", "carte"],
  "tn-age": ["fenetre", "plein-ecran"],
};
/** Façons déjà là, vérifiées sans rien refaire : elles couvrent les mises en page décidées. */
const DEJA_LA: Record<string, string[]> = {
  "tn-journal": ["titres", "cartes"], // liste éditoriale, grille
  "tn-questions": ["filets", "deux-colonnes", "cartes"],
  "tn-contact": ["formulaire-puis-carte", "coordonnees-en-grand", "deux-colonnes"],
  "tn-histoire": ["titre-photo-texte", "lettrine", "deux-colonnes"],
  "tn-rdv": ["colonne", "photo"], // contact en prise de rendez-vous
  "tn-frise": ["ligne", "colonnes"], // à propos en chronologie
  "tn-equipe": ["noms", "photos"], // à propos avec l'équipe réelle (jamais inventée)
};

const selectors = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@(?:media|supports)[^{]*\{/g, "").replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
const PRODUITS: TenueProduct[] = [
  { title: "Premier produit", image: "/api/files/a1", price: "149 €", cents: 14900, go: "product" },
  { title: "Deuxième produit", image: "/api/files/a2", price: "39 €", cents: 3900, go: "product" },
  { title: "Troisième produit", image: "/api/files/a3", price: "19 €", cents: 1900, go: "product" },
  { title: "Produit épuisé", image: "/api/files/a4", price: "25 €", cents: 2500, go: "product", soldOut: true },
];

describe("thème unique, pages : chaque pièce a ses façons, dessinées dans la feuille du module", () => {
  it("les pièces nouvelles sont dans la bibliothèque, avec des textes d'exemple neutres", () => {
    expect(PAGES_SECTIONS.map((s) => s.id)).toEqual(["tn-tiroir", "tn-recherche", "tn-questions-rubriques", "tn-merci", "tn-fermee"]);
    for (const s of PAGES_SECTIONS) {
      expect(TENUE_SECTIONS.some((x) => x.id === s.id), s.id).toBe(true);
      // Aucun texte tiré d'un projet d'essai ni d'un métier : rien sur le thé, aucun chiffre, aucun prix, aucune coordonnée.
      const text = s.html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/\[À compléter[^\]]*\]/g, " ").replace(/<[^>]+>/g, " ");
      expect(text, s.id).not.toMatch(/\bthé\b|infusion|tasse|jasmin|rooibos|sachet|mélange|feuilles/i);
      expect(text.replace(/\b1\b/g, ""), `${s.id} : aucun chiffre d'exemple (hors la quantité « 1 »)`).not.toMatch(/\d/);
      expect(text, s.id).not.toMatch(/€|@/);
    }
  });

  it("chaque pièce citée a ses façons, dans l'ordre, avec une phrase claire qui dit ce qu'on voit", () => {
    for (const [id, keys] of Object.entries(FACONS)) {
      const s = tenueSection(id);
      expect(s, id).toBeTruthy();
      expect(s!.constructions.map((c) => c.key), id).toEqual(keys);
      for (const c of s!.constructions) expect(c.label.length, `${id} · ${c.key}`).toBeGreaterThan(24);
    }
    // Les pièces d'autres chantiers : elles gardent au moins ces façons (un autre chantier peut en ajouter).
    for (const [id, keys] of Object.entries(DEJA_LA)) expect(tenueSection(id)?.constructions.map((c) => c.key) ?? [], id).toEqual(expect.arrayContaining(keys));
    // Les façons ajoutées à des pièces d'autres modules passent toutes par le registre du module.
    for (const id of Object.keys(PAGES_FACONS)) expect(FACONS[id], id).toEqual(PAGES_FACONS[id].map((c) => c.key));
  });

  it("chaque façon nouvelle a ses règles dans la feuille du module ; aucune règle ne cible une façon d'origine", () => {
    const mine = selectors(SHEET);
    const others = selectors(["tenue.css", "tenue-produit.css", "tenue-services.css", "tenue-recit.css"].map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join("\n"));
    for (const [id, keys] of Object.entries(FACONS)) {
      const root = rootOf(id);
      for (const key of keys.slice(1)) expect(mine.some((sel) => sel.includes(`.ctw`) && sel.includes(`.${root}[data-tn-c="${key}"]`)), `${id} : règle [data-tn-c="${key}"] sur .${root}`).toBe(true);
      for (const sel of [...mine, ...others]) expect(sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${keys[0]}"]`), `${id} : aucune règle pour « ${keys[0]} » (${sel.slice(0, 80)})`).toBe(false);
    }
  });

  it("la feuille respecte les règles d'écriture : sélecteurs en « .ctw .tn-… », aucune couleur en dur, aucun « !important », titres à l'échelle", () => {
    const css = SHEET.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/!important/);
    expect(css.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|:\s*(?:white|black|red|grey|gray)\b/gi) ?? []).toEqual([]);
    for (const list of selectors(SHEET)) for (const sel of list.split(/,(?![^(]*\))/)) {
      if (/^(?:from|to|\d+%)$/.test(sel.trim())) continue;
      expect(sel.trim(), "sélecteur").toMatch(/^\.ctw(?:\[data-tn-[a-z]+(?:="[a-z]+")?\])? (?:\.tb-pg>)?\.tn-[a-z0-9-]+/);
    }
    // Toute taille de h1 ou de h2 suit l'échelle des titres.
    for (const rule of css.split("}")) {
      const [sel, body] = rule.split("{");
      if (!body || !/(?:^|[\s>,])h[12](?:$|[\s,.[]|:(?!:))/.test(sel.split(",").map((x) => x.trim().split(/\s+/).pop()).join(" , "))) continue;
      const size = /font-size:([^;]+)/.exec(body)?.[1];
      if (size) expect(size, `${sel.trim().slice(0, 70)}`).toContain("var(--tn-k)");
    }
    // Les pièces qui s'ouvrent ont leur forme sans script : un lien vers elles suffit.
    expect(css).toContain(".ctw .tn-tiroir:target .tn-panneau{transform:none}");
    expect(css).toMatch(/\.tn-recherche\[data-tn-c="panneau"\]:target\{display:block/);
  });
});

describe("thème unique, pages : le panier (page et tiroir) et les vraies données", () => {
  const site = (over: Partial<D.TenueSite> = {}): D.TenueSite => ({ products: PRODUITS, freeFrom: 200, ...over });

  it("le tiroir : deux produits du catalogue d'essai, quantités, total, bouton de commande, lien vers la page panier", () => {
    const html = sp(D.withTenueSite(tenueSection("tn-tiroir")!.html, site()));
    expect(html.match(/<div class="tn-ligne"/g)).toHaveLength(2);
    expect(html).toContain('<div class="tn-ligne" data-tn-cents="14900"><div class="tn-ph" style="background-image:url(/api/files/a1)"></div><div class="tn-quoi"><b>Premier produit</b><div class="tn-qte">');
    expect(html.match(/data-tn-moins/g)).toHaveLength(2);
    expect(html.match(/data-tn-plus/g)).toHaveLength(2);
    expect(html.match(/data-tn-oter/g)).toHaveLength(2);
    expect(html).toContain('<span class="tn-prix-t">188 €</span>');
    expect(html).toMatch(/<a class="tn-bt" href="#" onclick="return false">Passer commande<\/a>/); // sans destination : c'est le paiement de la plateforme
    expect(html).toContain('data-go="cart">Voir le panier</a>');
    // Le tiroir se ferme : la croix et le voile ; il est annoncé comme une fenêtre.
    expect(html.match(/data-tn-fermer/g)).toHaveLength(2);
    expect(html).toContain('role="dialog" aria-modal="true" aria-label="Panier"');
  });

  it("livraison offerte : le seuil du client, sinon rien ; produits à ajouter : les vrais, jamais ceux du panier ni un produit épuisé", () => {
    const html = sp(D.withTenueSite(tenueSection("tn-tiroir")!.html, site()));
    expect(html).toContain('<div class="tn-seuil" data-tn-seuil="20000"><p>Plus que <b>12 €</b> pour la livraison offerte</p><i style="--part:94%"></i></div>');
    expect(sp(D.withTenueSite(tenueSection("tn-tiroir")!.html, site({ freeFrom: 150 })))).toContain("<p>La livraison est offerte</p>");
    const none = D.withTenueSite(tenueSection("tn-tiroir")!.html, site({ freeFrom: null }));
    expect(none).not.toMatch(/tn-seuil|livraison offerte|À compléter/);
    const more = /<div class="tn-sugg">([\s\S]*?)<\/div><\/div><div class="tn-bas">/.exec(html)![1];
    expect(more.match(/<a class="tn-s"/g)).toHaveLength(1);
    expect(more).toContain("Troisième produit");
    expect(more).not.toMatch(/Premier produit|Deuxième produit|Produit épuisé/);
    // Deux produits en tout : rien d'autre à proposer, le bloc s'en va.
    expect(D.withTenueSite(tenueSection("tn-tiroir")!.html, site({ products: PRODUITS.slice(0, 2) }))).not.toContain('class="tn-plus"');
    // Sans catalogue : la pièce garde son exemple, annoncé en jaune ; aucun seuil d'exemple.
    const bare = D.withTenueSite(tenueSection("tn-tiroir")!.html, {});
    expect(bare).toContain('<mark class="tn-manque">À compléter : prix</mark>');
    expect(bare).not.toContain("tn-seuil");
  });

  it("la page panier prend la même charpente : lignes, quantités, récapitulatif, total, bouton de commande", () => {
    const html = sp(D.withTenueSite(withTenueProducts(tenueSection("tn-panier")!.html, PRODUITS), site()));
    expect(html).toMatch(/^<section class="tn tn-panier" data-tn-panier><h1>Ton panier\.<\/h1><div class="tn-lignes" data-tn-lignes><div class="tn-ligne" data-tn-cents="14900">/);
    expect(html.match(/<div class="tn-ligne"/g)).toHaveLength(2);
    expect(html.match(/class="tn-qte"/g)).toHaveLength(2);
    expect(html).toMatch(/<div class="tn-recap"><div class="tn-seuil" data-tn-seuil="20000">[\s\S]*<div class="tn-total"><span>Total<\/span><span class="tn-prix-t">188 €<\/span><\/div><a class="tn-bt" href="#" onclick="return false">Passer commande<\/a><p>Livraison : <mark class="tn-manque">À compléter<\/mark><\/p><\/div><\/section>$/);
    // Sans seuil donné : aucune barre ; deux passes ne changent rien de plus.
    const plain = D.withTenueSite(withTenueProducts(tenueSection("tn-panier")!.html, PRODUITS), site({ freeFrom: null }));
    expect(plain).not.toContain("tn-seuil");
    expect(D.withTenueSite(plain, site({ freeFrom: null }))).toBe(plain);
    // Sans catalogue : la ligne d'exemple de la pièce, dans la même charpente.
    const bare = D.withTenueSite(tenueSection("tn-panier")!.html, {});
    expect(bare.match(/<div class="tn-ligne"/g)).toHaveLength(1);
    expect(bare).toContain("<b>Thé vert jasmin</b>");
  });

  it("page introuvable : des produits du vrai catalogue dans la façon « produits » seulement ; textes légaux : le sommaire fait des titres", () => {
    const base = tenueSection("tn-404")!.html;
    expect(D.withTenueSite(base, site())).toBe(D.withTenueContact(base, site()));
    expect(D.withTenueSite(base.replace('class="tn tn-404"', 'class="tn tn-404" data-tn-c="grande-image"'), site())).not.toContain("tn-repartir");
    const found = D.withTenueSite(base, site(), "produits");
    expect(found).toMatch(/<b class="tn-repartir" data-tn-produits>À voir en attendant<\/b><div class="tn-cartes">(?:<a class="tn-carte-p"[\s\S]*?<\/a>){3}<\/div><\/section>$/);
    expect(found).not.toContain("Produit épuisé");
    expect(D.withTenueSite(base, {}, "produits")).not.toContain("tn-repartir"); // aucun produit : rien d'inventé
    const legal = D.withTenueSite(tenueSection("tn-legal")!.html.replace('class="tn tn-legal"', 'class="tn tn-legal" data-tn-c="sommaire"'), {});
    expect(legal).toContain('<nav class="tn-sommaire" aria-label="Sommaire"><b>Sommaire</b><a href="#tn-texte-1">Mentions légales</a><a href="#tn-texte-2">Conditions générales de vente</a>');
    expect(legal.match(/<details id="tn-texte-\d" open>/g)).toHaveLength(5);
    expect(D.withTenueSite(tenueSection("tn-legal")!.html, {})).not.toContain("tn-sommaire");
  });

  it("recherche : les vrais produits, les familles en raccourcis quand il y en a au moins deux", () => {
    const html = D.withTenueSite(tenueSection("tn-recherche")!.html, site({ families: [{ name: "La gamme", to: "shop:La gamme", image: null, products: [] }, { name: "Les accessoires", to: "shop:Les accessoires", image: null, products: [] }] }));
    expect(html.match(/<a class="tn-r"/g)).toHaveLength(4);
    expect(html).toContain("<b>Produit épuisé</b><span>Épuisé</span>");
    expect(html).toContain('<a class="tn-mot" href="#" onclick="return false" data-go="shop:La gamme">La gamme</a>');
    expect(html).toContain("Questions fréquentes");
    expect(html).toContain('<input type="search" name="q"');
  });
});

describe("thème unique, pages : aucune page de commande dans le thème, et la mise en boutique", async () => {
  const { customThemeSpec, templateOf } = await import("@/lib/syna-agent/custom-theme/to-shopify");
  const { validateCustomSection } = await import("@/lib/theme/ops");
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const products = [{ handle: "premier", title: "Premier produit", categories: ["La gamme"] }, { handle: "deuxieme", title: "Deuxième produit", categories: ["La gamme"] }, { handle: "troisieme", title: "Troisième produit", categories: ["Les accessoires"] }];
  const input = (over: Record<string, unknown> = {}) => ({
    name: "Essai", palette: { dark: "#1F2A24", primary: "#B4532A", secondary: "#E9D8B8", accent: "#B4532A", light: "#F6F1E7" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, business: "products" as const,
    products, company: { shipping: "Colissimo, offerte dès 60 € d'achat", returns: "14 jours" }, assetExt: () => "jpg", linkMap: {}, logoAssetId: null, dropMissing: true, base: null, ...over,
  });
  const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
  const theme = (pages: { key: string; label: string; sections: ReturnType<typeof sec>[] }[], over: Record<string, unknown> = {}) => ({
    version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0,
    pages: [{ key: "home", label: "Accueil", sections: [sec("tn-ouverture", "o")] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy")] }, ...pages], ...over,
  }) as any;
  const liquid = (out: ReturnType<typeof customThemeSpec>, id: string) => sp(Object.values(out.spec.customSections).find((c) => c.liquid.includes(`(${id})`))!.liquid);
  const blocking = (out: ReturnType<typeof customThemeSpec>) => out.problems.filter((x) => x.level === "bloquant").map((x) => x.text);

  it("le paiement reste celui de la plateforme : aucune page de commande ni de confirmation, « merci » réservée", () => {
    const kind = { business: "products" as const, products: 3, platform: "shopify" };
    const keys = S.requiredPages(kind).flatMap((r) => r.keys);
    expect(keys).toContain("cart");
    expect(keys).not.toContain("commande");
    expect(keys).not.toContain("merci");
    // « Bien reçu » se pose sous une autre clé : la clé « merci » est celle de la confirmation de commande, tenue par Shopify.
    const bad = S.checkCustomTheme(theme([{ key: "merci", label: "Merci", sections: [sec("tn-merci", "m")] }]), kind).filter((x) => x.level === "bloquant").map((x) => x.text).join("\n");
    expect(bad).toMatch(/Commande confirmée » en trop/);
    const ok = S.checkCustomTheme(theme([{ key: "bien-recu", label: "Bien reçu", sections: [sec("tn-merci", "m")] }]), kind).filter((x) => x.level === "bloquant").map((x) => x.text).join("\n");
    expect(ok).not.toMatch(/en trop|tn-merci|Bien reçu/);
    expect(tenueSection("tn-merci")!.does).toMatch(/JAMAIS la confirmation d'une commande/);
    for (const s of PAGES_SECTIONS) expect(s.role, s.id).not.toBe("commande");
  });

  it("page panier dans Shopify : lignes, quantités et retrait par des liens de la boutique, total, bouton qui ouvre le paiement de Shopify", () => {
    for (const construction of ["empile", "deux-colonnes"]) {
      const out = customThemeSpec(theme([{ key: "cart", label: "Panier", sections: [sec("tn-panier", "c", construction)] }]), input());
      expect(blocking(out)).toEqual([]);
      expect(Object.keys(out.spec.templates)).toContain("cart");
      expect(Object.keys(out.spec.templates).join(" ")).not.toMatch(/checkout|commande|merci/);
      const l = liquid(out, "tn-panier");
      expect(l).toContain(`data-tn-c="${construction}"`);
      expect(l).toContain('{%- for item in cart.items -%}<div class="tn-ligne">');
      expect(l).toContain('<a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&amp;quantity={{ item.quantity | plus: 1 }}" aria-label="Ajouter un exemplaire">+</a>');
      expect(l).toContain('<a class="tn-oter" href="{{ item.url_to_remove }}">Retirer</a>');
      expect(l).toContain('<span class="tn-prix-t">{{ cart.total_price | money }}</span></div><button class="tn-bt" type="submit" name="checkout">Passer commande</button>');
      expect(l).toContain("{%- assign reste = 6000 | minus: cart.total_price -%}"); // le seuil du client
      expect(l).toContain("Ton panier est vide.");
      expect(l).not.toMatch(/<script|onclick=/);
      expect(validateCustomSection(l)).toBeNull();
    }
    // Sans seuil donné par le client : aucune barre de livraison offerte.
    const none = customThemeSpec(theme([{ key: "cart", label: "Panier", sections: [sec("tn-panier", "c", "deux-colonnes")] }]), input({ company: { shipping: "Colissimo", returns: null } }));
    expect(liquid(none, "tn-panier")).not.toMatch(/tn-seuil|livraison offerte/);
  });

  it("tiroir dans Shopify : envoyé avec le pied de page, ouvert par le panier de l'en-tête, sans aucun script", () => {
    for (const construction of ["etroit", "large"]) {
      const out = customThemeSpec(theme([{ key: "cart", label: "Panier", sections: [sec("tn-panier", "c")] }], { extras: [sec("tn-tiroir", "x1", construction)] }), input());
      expect(blocking(out)).toEqual([]);
      const l = liquid(out, "tn-tiroir");
      expect(out.spec.groups.footer!.order).toContain("tn-x1");
      expect(l).toContain(`<section data-tn-c="${construction}" class="tn tn-tiroir" id="tn-tiroir" data-tn-tiroir{% if cart.item_count == 0 %} data-tn-vide{% endif %}>`);
      expect(l).toContain('<a class="tn-x" href="#tn-ferme" aria-label="Fermer le panier">');
      expect(l).toContain("{%- for item in cart.items -%}");
      expect(l).toContain("{{ item.quantity }}");
      expect(l).toContain('<button class="tn-bt" type="submit" name="checkout">Passer commande</button><a class="tn-lien" href="{{ routes.cart_url }}">Voir le panier</a>');
      expect(l).toContain("{%- if dedans == false and product.available and montres < 4 -%}"); // produits à ajouter : pas ceux du panier
      expect(l).not.toMatch(/<script|onclick=|href="#"|À compléter/);
      expect(validateCustomSection(l)).toBeNull();
      // Le panier de l'en-tête ouvre le tiroir, sauf sur la page panier.
      expect(liquid(out, "tn-entete")).toContain(`href="{% if template.name == 'cart' %}{{ routes.cart_url }}{% else %}#tn-tiroir{% endif %}"`);
      expect(out.problems.map((x) => x.text).join("\n")).toMatch(/après un ajout au panier, la boutique montre la page panier/);
      // Sa feuille part avec l'en-tête, forme sans script comprise.
      expect(liquid(out, "tn-entete")).toContain(".ctw .tn-tiroir:target .tn-panneau{transform:none}");
    }
    // « Panier sur le côté » coché par le client, sans tiroir posé : le tiroir à tenue part quand même.
    const auto = customThemeSpec(theme([{ key: "cart", label: "Panier", sections: [sec("tn-panier", "c")] }], { settings: { cart: "drawer" } }), input());
    expect(liquid(auto, "tn-tiroir")).toContain('data-tn-c="etroit"');
    // Un site de services n'a pas de panier : pas de tiroir.
    const services = customThemeSpec(theme([], { extras: [sec("tn-tiroir", "x1")] }), input({ business: "services", products: [] }));
    expect(Object.values(services.spec.customSections).some((c) => c.liquid.includes("(tn-tiroir)"))).toBe(false);
  });

  it("recherche, page introuvable, textes légaux, boutique fermée, « bien reçu », questions par rubriques : Shopify les accepte", () => {
    const out = customThemeSpec(theme([
      { key: "404", label: "Page introuvable", sections: [sec("tn-404", "n", "produits")] },
      { key: "legal", label: "Informations légales", sections: [sec("tn-legal", "l", "sommaire")] },
      { key: "aide", label: "Questions", sections: [sec("tn-questions-rubriques", "q", "cartes")] },
      { key: "bien-recu", label: "Bien reçu", sections: [sec("tn-merci", "m", "deux-colonnes")] },
      { key: "ouverture", label: "Ouverture prochaine", sections: [sec("tn-fermee", "o2", "moitie")] },
    ], { search: sec("tn-recherche", "r", "panneau") }), input());
    expect(blocking(out)).toEqual([]);
    for (const [type, c] of Object.entries(out.spec.customSections)) {
      expect(validateCustomSection(c.liquid), type).toBeNull();
      expect(c.liquid, type).not.toMatch(/À compléter|photos\/|onclick=|onsubmit=|data-go=|href="#"|\/api\/files\/|<script/);
    }
    // Page introuvable : quatre produits de la boutique, un vrai champ de recherche.
    expect(Object.keys(out.spec.templates)).toContain("404");
    expect(liquid(out, "tn-404")).toContain('<b class="tn-repartir" data-tn-produits>À voir en attendant</b><div class="tn-cartes">{%- for product in collections.all.products limit: 4 -%}');
    expect(liquid(out, "tn-404")).toContain('<form class="tn-champ" action="{{ routes.search_url }}" method="get" role="search">');
    // Textes légaux : le sommaire mène à chaque texte par une ancre, sans script.
    expect(liquid(out, "tn-legal")).toMatch(/<nav class="tn-sommaire" aria-label="Sommaire"><b>Sommaire<\/b><a href="#tn-texte-1">/);
    // Recherche : avec l'en-tête, en barre (le panneau demande un script), vrai formulaire de la boutique.
    const search = liquid(out, "tn-recherche");
    expect(out.spec.groups.header!.order).toContain("tn-r");
    expect(search).toContain('data-tn-c="barre"');
    expect(search).toContain('<form class="tn-form" action="{{ routes.search_url }}" method="get" role="search"><label class="tn-cherche"><input type="search" name="q" value="{{ search.terms | escape }}"');
    expect(search).toContain('<a class="tn-mot" href="{{ routes.collections_url }}/la-gamme">La gamme</a>');
    expect(search).toContain("{%- for product in collections.all.products limit: 6 -%}");
    expect(out.problems.map((x) => x.text).join("\n")).toMatch(/La recherche est posée en barre sous l'en-tête/);
    // Boutique fermée : la page « mot de passe » de la boutique, l'inscription à la lettre, l'entrée par mot de passe.
    expect(templateOf({ key: "ouverture", sections: [{ id: "tn-fermee" }] }, false)).toBe("password");
    expect(out.spec.templates.password.layout).toBe("password");
    const closed = liquid(out, "tn-fermee");
    expect(closed).toMatch(/\{%- form 'customer', class: 'tn-form' -%\}<input type="hidden" name="contact\[tags\]" value="newsletter">/);
    expect(closed).toContain(`{%- form 'storefront_password', class: 'tn-passe' -%}<label class="tn-champ"><input type="password" name="password" aria-label="Mot de passe"`);
    // « Bien reçu » et les questions par rubriques : des pages simples de la boutique.
    expect(out.spec.store.pages.map((p) => p.handle)).toEqual(expect.arrayContaining(["bien-recu", "aide", "legal"]));
    expect(liquid(out, "tn-merci")).toContain('<a class="tn-bt" href="{{ routes.root_url }}">Retour à l\'accueil</a>');
    expect(liquid(out, "tn-questions-rubriques")).toContain("<h2>La commande</h2>");
  });
});

describe("thème unique, pages : dans l'aperçu du Studio", async () => {
  it("le tiroir est posé sur tout le site (ou ajouté quand le client coche « panier sur le côté »), avec le panier d'essai et le seuil du client", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveBrand, loadProject } = await import("@/lib/projects");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { createProduct } = await import("@/lib/products/catalog");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const pid = await project(await account());
    saveBrand(pid, F.FAUTEUIL_BRAND as any);
    for (const [i, title] of ["Premier produit", "Deuxième produit", "Troisième produit"].entries()) createProduct(pid, { title, images: [], price: [14900, 3900, 1900][i], categories: [] } as any);
    saveCompany(pid, { shipping: "Colissimo, offerte dès 200 € d'achat", returns: "14 jours" });
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, { op: "add", page: "home", section: "tn-produits" }, { op: "page", key: "cart", label: "Panier" }, { op: "add", page: "cart", section: "tn-panier", construction: "deux-colonnes" },
      { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }, { op: "shell", slot: "search", section: "tn-recherche", construction: "panneau" }, { op: "tenue", tenue: F.FAUTEUIL_TENUE }]);
    // Sans tiroir : la page panier seule.
    expect(renderCustomTheme(loadProject(pid), t)).not.toContain('class="tn tn-tiroir"');
    // Le client coche « panier sur le côté » : le tiroir à tenue s'ajoute, l'ancien tiroir ne s'en mêle pas.
    const checked = sp(renderCustomTheme(loadProject(pid), S.applyStructure(t, [{ op: "settings", cart: "drawer" }])));
    expect(checked).toMatch(/<div class="tn-fixes"><section data-ct="tiroir" data-ct-role="page" data-tn-c="etroit" class="tn tn-tiroir"/);
    expect(checked).toContain('"ctCart":"page"');
    // SINA le pose sur tout le site, dans sa façon large.
    const placed = sp(renderCustomTheme(loadProject(pid), S.applyStructure(t, [{ op: "extra", section: "tn-tiroir", construction: "large" }])));
    expect(placed).toMatch(/data-tn-c="large" class="tn tn-tiroir"/);
    expect(placed).toContain('<div class="tn-seuil" data-tn-seuil="20000"><p>Plus que <b>12 €</b> pour la livraison offerte</p>');
    expect(placed).toContain('<span class="tn-prix-t">188 €</span>');
    expect(placed).toContain('<script src="/sections/tenue-pages.js"></script>');
    // La page panier, façon « deux colonnes » : même panier d'essai, même seuil.
    expect(placed).toMatch(/data-tn-c="deux-colonnes" class="tn tn-panier" data-tn-panier>[\s\S]*?<div class="tn-recap"><div class="tn-seuil" data-tn-seuil="20000">/);
    // La recherche à tenue tient l'emplacement « recherche » du site.
    expect(placed).toMatch(/data-ct-role="search" data-tn-c="panneau" class="tn tn-recherche"/);
    expect(S.checkCustomTheme(S.applyStructure(t, [{ op: "extra", section: "tn-tiroir" }])).filter((x) => x.level === "bloquant").map((x) => x.text).join("\n")).not.toMatch(/tiroir|recherche/i);
  });
});

/** Trois allures très différentes : une pièce doit tenir dans les trois. */
const VIF_BRAND = {
  name: "Zeste", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Des couleurs franches.", audience: "", personality: ["joyeuse", "franche"],
  tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] },
  palette: { primary: "#FF4F6D", secondary: "#FFD43B", accent: "#FF4F6D", light: "#FFF6DC", dark: "#1D1A3A" },
  fonts: { heading: "unbounded_n8", body: "dm_sans" }, logo: { concept: "", status: "proposed" },
} as const;
const ALLURES = [
  { key: "calme", brand: F.FAUTEUIL_BRAND, tenue: { ...F.FAUTEUIL_TENUE }, dir: undefined as string | undefined, photos: F.PRODUCT_PHOTOS.slice(0, 5), names: ["Fauteuil Alcôve terracotta", "Repose-pieds Alcôve", "Coussin Alcôve", "Plaid Alcôve", "Lampe Alcôve"] },
  { key: "brute", brand: K.SAC_BRAND, tenue: { ...K.SAC_TENUE }, dir: K.SAC_DIR, photos: K.SAC_PRODUCT_PHOTOS, names: ["Sac de voyage Traverse kaki", "Trousse Traverse", "Sangle Traverse"] },
  { key: "vive", brand: VIF_BRAND, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "le zeste" } as const, dir: undefined as string | undefined, photos: F.PRODUCT_PHOTOS.slice(0, 4), names: ["Infusion pêche", "Infusion fraise", "Infusion citron", "Infusion menthe"] },
];

describe.runIf(!!process.env.PAGES_OUT)("thème unique, pages : captures de chaque façon, trois allures, téléphone et ordinateur", () => {
  it("chaque façon est rendue ; rien ne dépasse de l'écran", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveBrand, saveServices, loadProject } = await import("@/lib/projects");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { saveAsset, getAsset, assetData } = await import("@/lib/library");
    const { createProduct } = await import("@/lib/products/catalog");
    const { fontFilePath } = await import("@/lib/theme/render");
    const { chromiumPath } = await import("@/lib/theme/snapshot");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const { chromium } = await import("playwright");
    const out = process.env.PAGES_OUT!;
    fs.mkdirSync(out, { recursive: true });
    const only = (process.env.PAGES_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const allures = ALLURES.filter((a) => !process.env.PAGES_ALLURES || process.env.PAGES_ALLURES.split(",").includes(a.key));
    const ids = Object.keys(FACONS).filter((id) => !["tn-tiroir", "tn-recherche"].includes(id) && (!only.length || only.includes(id)));
    const pages = ids.flatMap((id) => FACONS[id].map((c) => ({ key: `${id.slice(3)}--${c}`.slice(0, 40), id, construction: c })));
    const overflow: string[] = [];
    const ORIGIN = "http://theme.sina";
    const browser = await chromium.launch({ executablePath: chromiumPath() ?? process.env.CHROMIUM, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const a of allures) {
        const user = await account();
        const pid = await project(user);
        saveBrand(pid, a.brand as any);
        for (const [i, f] of a.photos.entries()) {
          const asset = await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f, undefined, a.dir), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" });
          createProduct(pid, { title: a.names[i], images: [{ assetId: asset.id }], price: [14900, 3900, 1900, 5900, 8900][i], categories: [i < 2 ? "La gamme" : "Les accessoires"] } as any);
        }
        saveServices(pid, { ...loadProject(pid).services, phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Du mardi au vendredi 9 h – 19 h ; samedi 9 h – 17 h", area: "Lyon, Villeurbanne, Bron et Caluire" } as any);
        saveCompany(pid, { shipping: "Colissimo, 48 h, 4,90 €, offerte dès 250 € d'achat", returns: "14 jours, emballage fermé" });
        let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
        t = S.applyStructure(t, [
          { op: "page", key: "accueil", label: "Accueil" }, { op: "add", page: "accueil", section: "tn-ouverture", construction: "titre-en-bas" }, { op: "add", page: "accueil", section: "tn-produits" },
          ...pages.flatMap((p) => [{ op: "page", key: p.key, label: p.key } as const, { op: "add", page: p.key, section: p.id, construction: p.construction } as const]),
          { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }, { op: "shell", slot: "search", section: "tn-recherche", construction: "barre" },
          { op: "extra", section: "tn-tiroir", construction: "etroit" }, { op: "tenue", tenue: a.tenue },
        ]);
        const html = renderCustomTheme(loadProject(pid), t, { embed: true });
        for (const view of [{ key: "tel", width: 390, height: 844 }, { key: "ordi", width: 1280, height: 860 }]) {
          const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, reducedMotion: "reduce" });
          const page = await context.newPage();
          await page.route("**/*", async (route) => {
            const u = new URL(route.request().url());
            if (u.origin !== ORIGIN) return route.abort();
            if (u.pathname === "/") return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
            if (u.pathname.startsWith("/sections/")) { const f = path.join(DIR, decodeURIComponent(u.pathname.slice("/sections/".length))); return fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }) : route.fulfill({ status: 404 }); }
            const file = /^\/api\/files\/([\w-]+)/.exec(u.pathname);
            if (file) { const x = getAsset(file[1]); return x ? route.fulfill({ body: assetData(x), contentType: x.mime }) : route.fulfill({ status: 404 }); }
            const font = /^\/api\/syna\/fonts\/(.+)$/.exec(u.pathname);
            if (font) { const f = fontFilePath(decodeURIComponent(font[1])); return f ? route.fulfill({ body: fs.readFileSync(f), contentType: "font/ttf" }) : route.fulfill({ status: 404 }); }
            return route.fulfill({ status: 404 });
          });
          await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 45_000 });
          const name = (what: string) => path.join(out, `${what}__${a.key}__${view.key}.jpg`);
          const wide = async (what: string) => { const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth })); if (m.w - m.vw > 1) overflow.push(`${what} · ${a.key} · ${view.key} : dépasse de ${m.w - m.vw} px`); };
          for (const p of pages) {
            await page.evaluate((k) => { (window as any).ctGo(k); scrollTo(0, 0); }, p.key);
            await page.waitForTimeout(160);
            const h = await page.evaluate(() => document.documentElement.scrollHeight);
            fs.writeFileSync(name(p.key), await page.screenshot({ type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 0, width: view.width, height: Math.min(h, 2400) } }));
            await wide(p.key);
          }
          if (!only.length || only.includes("tn-tiroir") || only.includes("tn-recherche")) {
            // Le tiroir : ouvert par le panier de l'en-tête, dans ses deux façons ; puis une quantité changée, puis fermé au clavier.
            await page.evaluate(() => { (window as any).ctGo("accueil"); scrollTo(0, 0); });
            for (const c of FACONS["tn-tiroir"]) {
              await page.evaluate((k) => document.querySelector(".tn-tiroir")!.setAttribute("data-tn-c", k), c);
              await page.click(".tn-entete .tn-pan");
              await page.waitForTimeout(520);
              expect(await page.evaluate(() => document.querySelector(".tn-tiroir")!.hasAttribute("data-tn-ouvert")), "le tiroir s'ouvre au clic sur le panier").toBe(true);
              expect(await page.evaluate(() => !!document.activeElement?.closest(".tn-tiroir")), "le clavier entre dans le tiroir").toBe(true);
              fs.writeFileSync(name(`tiroir--${c}`), await page.screenshot({ type: "jpeg", quality: 84 }));
              await wide(`tiroir--${c}`);
              if (c === "large") {
                await page.click(".tn-tiroir .tn-ligne [data-tn-plus]");
                expect((await page.textContent(".tn-tiroir .tn-prix-t"))!.replace(/\s/g, " ")).toBe("337 €");
                expect(await page.textContent(".tn-tiroir .tn-seuil p")).toBe("La livraison est offerte");
                await page.click(".tn-tiroir .tn-ligne [data-tn-moins]");
              }
              await page.keyboard.press("Escape");
              await page.waitForTimeout(450);
              expect(await page.evaluate(() => document.querySelector(".tn-tiroir")!.hasAttribute("data-tn-ouvert")), "Échap ferme le tiroir").toBe(false);
              expect(await page.evaluate(() => document.activeElement?.classList.contains("tn-pan")), "le clavier revient sur le panier").toBe(true);
            }
            // Sans script : le tiroir s'ouvre par un lien vers lui (forme envoyée dans Shopify).
            await page.evaluate(() => { location.hash = "tn-tiroir"; });
            await page.waitForTimeout(450);
            expect(await page.evaluate(() => getComputedStyle(document.querySelector(".tn-tiroir .tn-panneau")!).transform), "le lien « #tn-tiroir » ouvre le tiroir sans script").toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
            await page.evaluate(() => { location.hash = "tn-ferme"; });
            // La recherche : la barre sous l'en-tête, puis le panneau ouvert, un mot tapé.
            await page.waitForTimeout(300);
            fs.writeFileSync(name("recherche--barre"), await page.screenshot({ type: "jpeg", quality: 84 }));
            await page.evaluate(() => { const s = document.querySelector(".tn-recherche")!; s.setAttribute("data-tn-c", "panneau"); s.classList.add("ct-open"); });
            await page.waitForTimeout(200);
            fs.writeFileSync(name("recherche--panneau"), await page.screenshot({ type: "jpeg", quality: 84 }));
            await wide("recherche--panneau");
            await page.fill(".tn-recherche input", "zzzz");
            expect(await page.evaluate(() => document.querySelector(".tn-recherche")!.hasAttribute("data-tn-rien"))).toBe(true);
            await page.keyboard.press("Escape");
            expect(await page.evaluate(() => document.querySelector(".tn-recherche")!.classList.contains("ct-open"))).toBe(false);
          }
          await context.close();
        }
      }
    } finally { await browser.close().catch(() => {}); }
    expect(overflow, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 900_000);
});
