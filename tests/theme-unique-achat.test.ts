/**
 * Thème unique du Studio, module « achat » (16 novembre 2026) : le bloc d'achat en six façons (une par style de page
 * produit), les pièces nouvelles de la fiche produit et les façons ajoutées aux pièces qui n'en avaient qu'une.
 *
 * Toujours (sans IA, sans navigateur) : les six façons existent ; chaque clé nouvelle est dessinée dans la feuille du
 * module ; aucune règle ne cible la clé d'origine ; le bloc garde prix, stock, variantes et ajout au panier dans chaque
 * façon ; les pièces nouvelles n'ont ni chiffre ni coordonnée d'exemple ; la mise en boutique les accepte.
 * Avec ACHAT_OUT=<dossier> : chaque façon et chaque pièce nouvelle est rendue avec un catalogue d'essai (options,
 * stock, offre par quantité), dans trois tenues, sur téléphone et sur ordinateur. Rien ne doit dépasser de l'écran.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACHAT_FACONS, ACHAT_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-achat";
import { TENUE_SECTIONS, tenueSection, validConstruction, withTenueBuyBlock } from "@/lib/syna-agent/custom-theme/tenue";
import * as D from "@/lib/syna-agent/custom-theme/tenue-data";
import * as F from "./tenue-fauteuil-fixtures";
import * as K from "./tenue-sac-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const SHEET = fs.readFileSync(path.join(process.cwd(), "public", "sections", "tenue-achat.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** Sélecteurs de la feuille (ceux des règles sous @media compris). */
const SELECTORS = SHEET.replace(/@supports[^{]*\{/g, "").replace(/@media[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
const rootOf = (id: string) => /class="tn (tn-[a-z0-9-]+)/.exec(tenueSection(id)!.html)![1];
const STYLES = ["simple", "vente-directe", "grandes-photos", "technique", "fond-doux", "portrait"];
const sp = (s: string) => s.replace(/ /g, " ");

describe("bloc d'achat : six façons, une par style de page produit", () => {
  it("les six façons existent, dites en clair ; la première est le rendu d'origine", () => {
    const s = tenueSection("tn-achat")!;
    expect(s.constructions.map((c) => c.key)).toEqual(STYLES);
    for (const c of s.constructions) expect(c.label.length, c.key).toBeGreaterThan(40);
    expect(validConstruction("tn-achat", "inconnue")).toBe("simple");
    expect(validConstruction("tn-achat", "portrait")).toBe("portrait");
  });

  it("chaque clé nouvelle a ses règles dans la feuille du module ; aucune règle ne cible une clé d'origine", () => {
    // Un sélecteur « nu » : sans les listes de « :is(…) » et de « :not(…) », qui nomment d'autres pièces que celle visée.
    const nu = (sel: string) => sel.replace(/:(?:is|not)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g, "");
    for (const [id, list] of Object.entries(ACHAT_FACONS)) {
      const root = rootOf(id);
      expect(list.length, id).toBeGreaterThanOrEqual(2);
      expect(list.length, id).toBeLessThanOrEqual(6);
      // (tn-atouts garde ses trois façons d'origine, dessinées dans tenue.css : seule la quatrième est du module.)
      for (const c of list.slice(id === "tn-atouts" ? 3 : 1)) {
        const mine = SELECTORS.filter((sel) => sel.includes(`.ctw`) && sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${c.key}"]`));
        expect(mine.length, `${id} : règles pour « ${c.key} »`).toBeGreaterThanOrEqual(3);
        // Une vraie autre mise en page : elle a aussi ses règles d'écran large.
        expect(new RegExp(`@media \\(min-width:760px\\)\\{[\\s\\S]*\\.${root}[^{]*\\[data-tn-c="${c.key}"\\]`).test(SHEET), `${id} : « ${c.key} » sur grand écran`).toBe(true);
      }
      expect(SELECTORS.map(nu).some((sel) => sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${list[0].key}"]`)), `${id} : aucune règle pour « ${list[0].key} »`).toBe(false);
    }
    // Les pièces nouvelles : deux façons au moins, la seconde dessinée.
    for (const s of ACHAT_SECTIONS) {
      expect(s.constructions.length, s.id).toBeGreaterThanOrEqual(2);
      for (const c of s.constructions.slice(1)) expect(SELECTORS.some((sel) => sel.includes(`.ctw .${rootOf(s.id)}[data-tn-c="${c.key}"]`)), `${s.id} : « ${c.key} »`).toBe(true);
      expect(SELECTORS.map(nu).some((sel) => sel.includes(`[data-tn-c="${s.constructions[0].key}"]`) && sel.includes(`.${rootOf(s.id)}`)), `${s.id} : aucune règle pour sa première façon`).toBe(false);
    }
  });

  it("la feuille suit les règles : sélecteurs « .ctw .tn-… », aucune couleur en dur, aucun « !important »", () => {
    expect(SHEET).not.toMatch(/!important/);
    expect(SHEET.replace(/url\("data:[^"]*"\)/g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    for (const sel of SELECTORS) for (const one of sel.split(/,(?![^(]*\))/)) expect(one.trim(), one).toMatch(/^\.ctw(?:\[data-tn-[a-z]+="[a-z]+"\])? \.(?:tn-|tb-pg>\.tn-|tb-pg:not\(\[hidden\]\):has\(>\.tn-)/);
    // Toute taille de titre suit l'échelle de la tenue.
    for (const r of SHEET.split("}")) { const [sel, body] = r.split("{").slice(-2); if (/ h[12](?:,|$)|>h[12](?:,|$)/.test(sel ?? "") && /font-size:/.test(body ?? "")) expect(body, sel).toMatch(/font-size:calc\([\d.]+px\*var\(--tn-k\)\)/); }
  });

  it("le bloc garde le prix, le stock, la version et l'ajout au panier dans chaque façon", () => {
    // Aucune façon ne cache un élément du bloc (la première vignette, doublon de la grande photo, peut l'être).
    for (const r of SHEET.split("}")) {
      const [sel, body] = r.split("{").slice(-2);
      if (!sel || !/\.tn-achat/.test(sel) || !/display:none/.test(body ?? "")) continue;
      expect(sel, "seule la vignette en doublon se cache").toMatch(/\.tn-vignettes i:first-child$|::-webkit-scrollbar$/);
    }
    for (const part of [".tn-prix", ".tn-rupture", ".tn-pres-prix", ".tn-option", ".tn-reperes", ">.tn-bt", ">form>.tn-bt", ">form>.tn-choix"]) {
      for (const key of ["vente-directe", "technique", "fond-doux", "portrait"]) expect(SELECTORS.some((sel) => sel.includes(`.tn-achat[data-tn-c="${key}"]`) && sel.includes(part)), `${key} range ${part}`).toBe(true);
    }
    // Même balisage, mêmes données : le Studio pose le prix, la rupture, les mentions, la livraison, la barre.
    const html = withTenueBuyBlock(tenueSection("tn-achat")!.html, { images: ["/api/files/a", "/api/files/b"], price: "149 €", shipping: "48 h", returns: "30 jours", soldOut: true, notes: ["Indice de réparabilité : 8,2 sur 10"] });
    expect(html).toContain('<div class="tn-prix">149 €</div><div class="tn-rupture">');
    expect(html).toContain('<a class="tn-bt tn-off" aria-disabled="true"');
    expect(html).toContain('<ul class="tn-pres-prix"><li>Indice de réparabilité');
    expect(html).toContain('<div class="tn-option">');
    expect(html).toMatch(/<div class="tn-barre"><b>[^<]+<\/b><a class="tn-bt/);
  });

  it("dans la boutique, chaque façon garde le vrai formulaire d'achat : version, prix, stock, bouton", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection } = await import("@/lib/theme/ops");
    for (const key of STYLES) {
      const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
      const t = { version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy", key), sec("tn-versions", "v1"), sec("tn-looks", "l1")] }] } as any;
      const out = customThemeSpec(t, { name: "Essai", business: "products", products: [{ handle: "a", title: "A", categories: [] }, { handle: "b", title: "B", categories: [] }], company: { shipping: "48 h", returns: "30 jours" }, assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null } as any);
      expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text), key).toEqual([]);
      const buy = out.spec.customSections["es-custom-buy"].liquid;
      expect(validateCustomSection(buy), key).toBeNull();
      expect(buy).toContain(`<section data-tn-c="${key}" class="tn tn-achat"`);
      expect(buy).toContain("{{ product.selected_or_first_available_variant.price | money }}");
      expect(buy).toContain('<div class="tn-rupture">Épuisé pour l\'instant.</div>');
      expect(buy).toMatch(/\{%- form 'product', product, class: 'tn-enveloppe' -%\}[^]*<select class="tn-choix" name="id"[^]*<button class="tn-bt" type="submit" name="add"/);
      // Les pastilles de version et le look lisent la boutique en direct, sans script.
      const versions = out.spec.customSections["es-custom-v1"].liquid;
      expect(validateCustomSection(versions)).toBeNull();
      expect(versions).toContain("{%- for option in product.options_with_values -%}");
      expect(versions).toContain('href="{% if value.variant %}{{ value.variant.url }}{% else %}{{ product.url }}{% endif %}"');
      expect(versions).not.toMatch(/À compléter|<input/);
      const looks = out.spec.customSections["es-custom-l1"].liquid;
      expect(validateCustomSection(looks)).toBeNull();
      expect(looks).toContain("{%- if autre.id != product.id and vus < 3 -%}");
      expect(looks).not.toMatch(/À compléter|photos\/|href="#"/);
    }
  });
});

describe("pièces nouvelles de la fiche produit", () => {
  const visible = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  it("elles sont rangées dans la banque, sans doublon avec une pièce existante", () => {
    expect(ACHAT_SECTIONS.map((s) => s.id)).toEqual(["tn-versions", "tn-guide-tailles", "tn-lots", "tn-looks", "tn-allergenes", "tn-avant-apres-produit", "tn-pictos", "tn-probleme-reponse", "tn-nous-et-autres", "tn-appel-produit", "tn-livraison", "tn-garantie", "tn-mur-avis", "tn-avantages", "tn-packs", "tn-sous-bouton", "tn-offre-moment", "tn-fenetre-offre", "tn-rappel-achat", "tn-coloris"]);
    for (const s of ACHAT_SECTIONS) expect(TENUE_SECTIONS.filter((x) => x.id === s.id || x.title === s.title).length, s.id).toBe(1);
  });

  it("aucun chiffre, aucune coordonnée, aucun mot d'un projet d'essai dans leurs exemples", () => {
    for (const s of ACHAT_SECTIONS) {
      const text = visible(s.html);
      expect(text, `${s.id} : aucun chiffre d'exemple`).not.toMatch(/\d/);
      expect(text, s.id).not.toMatch(/@|\bthé\b|infusion|tisane|jasmin|rooibos|sachet|tasse|Brindi|toilett/i);
      // Ce qui ne s'invente pas est annoncé « à compléter », ou vient du catalogue.
      expect(s.html, s.id).toMatch(/\[À compléter/);
    }
    // Les photos qui ne s'inventent pas : jamais posées sans celles du client.
    expect(tenueSection("tn-looks")!.authentic).toBeTruthy();
    expect(tenueSection("tn-avant-apres-produit")!.authentic).toBeTruthy();
    expect(tenueSection("tn-mur-avis")!.authentic).toBeTruthy();
    // Jamais de fausse urgence ni de faux avis, dans aucune pièce du module.
    for (const s of ACHAT_SECTIONS) expect(visible(s.html), s.id).not.toMatch(/plus que|derni[eè]res? pi[eè]ces?|vite|se termine|compte à rebours|étoiles?|avis vérifi/i);
  });

  it("pastilles de version : les vraies options, la couleur choisie d'avance, la taille jamais, l'épuisé barré", () => {
    const html = tenueSection("tn-versions")!.html;
    const out = D.withTenueVersions(html, [
      { name: "Couleur", values: [{ label: "Sable", soldOut: true, teinte: "#d8c4a6" }, { label: "Nuit", teinte: "#2e3b4e" }] },
      { name: "Taille", values: [{ label: "S" }, { label: "M" }, { label: "L <grand>", soldOut: true }] },
    ]);
    expect(out).toContain('<div class="tn-groupe-v tn-couleurs"><small>Couleur</small>');
    expect(out).toContain('<label class="tn-off" style="--teinte:#d8c4a6"><input type="radio" name="tn-v-1" disabled><span>Sable</span></label>');
    expect(out).toContain('<label style="--teinte:#2e3b4e"><input type="radio" name="tn-v-1" checked><span>Nuit</span></label>');
    expect(out).toContain('<label><input type="radio" name="tn-v-2"><span>S</span></label>');
    expect(out).toContain('<label class="tn-off"><input type="radio" name="tn-v-2" disabled><span>L &lt;grand&gt;</span></label>');
    expect((out.match(/name="tn-v-2" checked/g) ?? []).length).toBe(0);
    expect(out).not.toContain("À compléter");
    expect(D.withTenueVersions(html, [])).toBe(html); // un produit sans option : rien n'est inventé
  });

  it("guide des tailles : une ligne par vraie taille, les mesures restent à compléter ; un tableau déjà écrit n'est pas touché", () => {
    const html = tenueSection("tn-guide-tailles")!.html;
    const out = D.withTenueSizes(html, [{ name: "Taille", values: [{ label: "S" }, { label: "M" }] }]);
    expect((out.match(/<tr><th>(?:S|M)<\/th>/g) ?? []).length).toBe(2);
    expect(out).toContain('<tr><th>S</th><td><mark class="tn-manque">À compléter</mark></td>');
    const written = html.replace(/<tbody>[\s\S]*?<\/tbody>/, "<tbody><tr><th>Unique</th><td>de quatre-vingt à cent</td><td>libre</td><td>libre</td></tr></tbody>");
    expect(D.withTenueSizes(written, [{ name: "Taille", values: [{ label: "S" }] }])).toContain("<th>Unique</th>");
    expect(D.withTenueSizes(html, [{ name: "Couleur", values: [{ label: "Sable" }] }])).toBe(html);
  });

  it("offres par quantité : le prix du lot, le prix à l'unité et la remise du client ; sans offre, aucune remise d'exemple", () => {
    const html = tenueSection("tn-lots")!.html;
    const out = sp(D.withTenueLots(html, { unit: "pot", cents: 900, tiers: [{ qty: 2, pct: 10 }, { qty: 3, pct: 15 }] }));
    expect(out).toContain('<li><label><input type="radio" name="tn-lot" checked><b>1 pot</b><span>9 €</span></label></li>');
    expect(out).toContain("<b>2 pots</b><span>16,20 €</span><i>soit 8,10 € l'unité</i><em>−10 %</em>");
    expect(out).toContain("<b>3 pots</b><span>22,95 €</span><i>soit 7,65 € l'unité</i><em>−15 %</em>");
    expect(out).not.toMatch(/À compléter|<s>|<del>/); // jamais de prix barré
    const bogo = sp(D.withTenueLots(html, { unit: "savon", cents: 600, tiers: [{ qty: 2, free: 1 }] }));
    expect(bogo).toContain("<b>3 savons</b><span>12 €</span><i>soit 4 € l'unité</i><em>1 offert</em>");
    expect(D.withTenueLots(html, null)).toBe(html);
    expect(D.withTenueLots(html, { unit: "pot", cents: 900, tiers: [] })).toBe(html);
  });

  it("le look complet : les autres vrais produits du catalogue, jamais celui de la page", () => {
    const html = tenueSection("tn-looks")!.html;
    const products = [{ title: "Chemise lin", image: "/api/files/a", price: "89 €", go: "product" }, { title: "Pantalon large", image: "/api/files/b", price: null, go: "product-pantalon" }, { title: "Sandales", image: null, price: "59 €", go: "product-sandales", soldOut: true }];
    const out = D.withTenueLooks(html, products, "chemise lin");
    expect(out).not.toContain("Chemise lin");
    expect(out).toContain('data-go="product-pantalon"><div class="tn-ph" style="background-image:url(/api/files/b)"></div><b>Pantalon large</b><span><mark class="tn-manque">À compléter : prix</mark></span></a>');
    expect(out).toContain('<a class="tn-carte-p tn-epuise" href="#" onclick="return false" data-go="product-sandales"><div class="tn-ph"></div><b>Sandales</b><span>Épuisé</span></a>');
    expect(out).not.toMatch(/La chemise|Le pantalon|Les sandales/); // les cartes d'exemple sont parties
    expect((D.withTenueLooks(html, [...products, { title: "Chapeau", image: null, price: "45 €", go: "product" }, { title: "Sac", image: null, price: "99 €", go: "product" }]).match(/class="tn-carte-p/g) ?? []).length).toBe(4); // la carte du produit de la page part ensuite
    expect(D.withTenueLooks(html, [], null)).toBe(html);
    expect(D.dataGaps(["tn-looks"], { products: 1, families: 0 }).join(" ")).toMatch(/tn-looks.*au moins deux produits/);
  });

  it("le Studio pose ces données dans la fiche du bon produit (options, stock, offre par quantité, look)", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { loadProject } = await import("@/lib/projects");
    const { createProduct } = await import("@/lib/products/catalog");
    const { saveShopOffers } = await import("@/lib/syna-agent/product-features");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const user = await account(), pid = await project(user);
    createProduct(pid, { title: "Robe Midi", price: 12900, options: [{ name: "Couleur", values: ["Sable", "Nuit"] }, { name: "Taille", values: ["S", "M"] }], variants: [{ options: ["Sable", "S"], stock: 0 }, { options: ["Sable", "M"], stock: 0 }, { options: ["Nuit", "S"], stock: 3 }, { options: ["Nuit", "M"], stock: 0 }] } as any);
    createProduct(pid, { title: "Ceinture tressée", price: 3900 } as any);
    saveShopOffers(pid, { quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }] } } as any);
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [{ op: "page", key: "product", label: "Fiche produit" }, { op: "add", page: "product", section: "tn-achat", construction: "portrait" }, { op: "add", page: "product", section: "tn-versions" }, { op: "add", page: "product", section: "tn-guide-tailles", construction: "tiroir" }, { op: "add", page: "product", section: "tn-lots" }, { op: "add", page: "product", section: "tn-looks" },
      { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }]);
    const out = sp(renderCustomTheme(loadProject(pid), t, { embed: true }));
    expect(out).toMatch(/data-tn-c="portrait" class="tn tn-achat"/);
    expect(out).toContain('<div class="tn-prix">129 €</div>');
    expect(out).toContain('<label class="tn-off" style="--teinte:#d8c4a6"><input type="radio" name="tn-v-1" disabled><span>Sable</span></label>');
    expect(out).toContain('<label><input type="radio" name="tn-v-2"><span>S</span></label><label class="tn-off"><input type="radio" name="tn-v-2" disabled><span>M</span></label>');
    expect(out).toMatch(/<tr><th>S<\/th><td><mark class="tn-manque">À compléter<\/mark><\/td>/);
    expect(out).toContain("<b>2 articles</b><span>232,20 €</span><i>soit 116,10 € l'unité</i><em>−10 %</em>");
    const looks = /<section[^>]*class="tn tn-looks"[^]*?<\/section>/.exec(out)![0];
    expect(looks).toContain("<b>Ceinture tressée</b><span>39 €</span>");
    expect(looks).not.toContain("Robe Midi");
  });

  it("vente directe : livraison et retours du client, coches tirées du texte, produit et prix réels dans l'appel", async () => {
    const liv = D.withTenueDirect(tenueSection("tn-livraison")!.html, { shipping: "Colissimo suivi, 4,90 €" });
    expect(liv).toContain('data-tn-livraison>Colissimo suivi, 4,90 €</p>');
    expect(liv).toContain('<mark class="tn-manque">À compléter : délai de préparation</mark>'); // jamais un délai inventé
    const gar = sp(D.withTenueDirect(tenueSection("tn-garantie")!.html, { returns: "30 jours pour changer d'avis, produit non utilisé" }));
    expect(gar).toContain('<div class="tn-sceau-g"><b>Retours</b><span>30 jours</span></div>');
    expect(gar).toContain('<p class="tn-conditions">30 jours pour changer d&#39;avis'.replace("&#39;", "'"));
    expect(D.withTenueDirect(tenueSection("tn-garantie")!.html, { returns: "Échange possible, écris-nous" })).toContain('<div class="tn-sceau-g"><b>Retours</b></div>'); // pas de délai écrit : aucun délai affiché
    expect(D.withTenueDirect(tenueSection("tn-garantie")!.html, {})).toBe(tenueSection("tn-garantie")!.html);
    const face = D.withTenueDirect(tenueSection("tn-nous-et-autres")!.html.replace("<i>Oui</i><i>Non</i>", "<i>Oui</i><i>Parfois</i>"), {});
    expect(face).toContain('<i class="tn-oui">Oui</i><i>Parfois</i>');
    expect(face).toContain('<i class="tn-oui">Oui</i><i class="tn-non">Non</i>');
    // L'appel avec le produit : dans le Studio, le produit de la page ; épuisé, il le dit et ne se commande pas.
    const { account, project } = await import("./conversation209-fixtures");
    const { createProduct } = await import("@/lib/products/catalog");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { withTenueAchat } = await import("@/lib/syna-agent/custom-theme/buy-block");
    const user = await account(), pid = await project(user);
    createProduct(pid, { title: "Lampe Halo", price: 5900, variants: [{ options: [], stock: 0 }] } as any);
    saveCompany(pid, { shipping: "Chez toi en 3 à 5 jours", returns: "30 jours" });
    const out = withTenueAchat(tenueSection("tn-appel-produit")!.html, pid);
    expect(out).toContain('<b class="tn-nom-a">Lampe Halo</b><div class="tn-prix">59 €</div><div class="tn-rupture">Épuisé pour l\'instant.</div><a class="tn-bt tn-off" aria-disabled="true"');
    expect(out).toContain("<li>Livraison : Chez toi en 3 à 5 jours</li><li>Retours : 30 jours</li>");
  });

  it("vente directe en boutique : un vrai formulaire d'achat dans l'appel, et rien d'exemple ne part", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const sec = (id: string, uid: string, html?: string) => ({ uid, id, clientTexts: true, html: (html ?? tenueSection(id)!.html).replace(/photos\/[\w.-]+/g, "/api/files/a1") });
    const ids = ["tn-probleme-reponse", "tn-nous-et-autres", "tn-appel-produit", "tn-livraison", "tn-garantie", "tn-mur-avis", "tn-avantages"];
    const theme = (extra: any[] = []) => ({ version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, pages: [{ key: "home", label: "Accueil", sections: [sec("tn-appel-produit", "home1")] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy"), ...ids.map((id, i) => sec(id, `d${i}`)), ...extra] }] }) as any;
    const input = (over: Record<string, unknown> = {}) => ({ name: "Essai", business: "products", products: [{ handle: "lampe-halo", title: "Lampe Halo", categories: [] }], company: { shipping: "Chez toi en 3 à 5 jours", returns: "30 jours" }, assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null, ...over }) as any;
    const out = customThemeSpec(theme(), input());
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    const all = Object.values(out.spec.customSections).map((c) => c.liquid).join("\n");
    expect(all).not.toMatch(/À compléter|photos\/|href="#"|onclick=/);
    const notes = out.problems.map((x) => x.text).join("\n");
    // Les pièces dont tout l'exemple était « à compléter » sont retirées, et c'est dit ; aucune ne part avec ses seuls en-têtes.
    for (const t of ["Le problème, puis la réponse", "Nous et les autres", "Le mur d'avis", "Les avantages, un par un"]) expect(notes, t).toContain(`${t} : section retirée, il ne restait que son titre`);
    expect(all).not.toMatch(/Aujourd'hui<\/small>|Ce produit<\/b>/);
    // L'appel : le produit de la page, ou le premier du catalogue sur l'accueil ; un vrai formulaire.
    const home = out.spec.customSections["es-custom-home1"].liquid;
    expect(home).toContain("{%- assign vedette = product -%}{%- unless vedette -%}{%- assign vedette = all_products['lampe-halo'] -%}{%- endunless -%}");
    expect(home).toMatch(/\{%- form 'product', vedette, class: 'tn-enveloppe' -%\}<input type="hidden" name="id" value="\{\{ vedette\.selected_or_first_available_variant\.id \}\}"><button class="tn-bt" type="submit" name="add"/);
    expect(home).toContain("<li>Livraison : Chez toi en 3 à 5 jours</li><li>Retours : 30 jours</li>");
    // La garantie et la livraison portent ce que le client a donné ; sans ses conditions, l'accord du client manquant bloque.
    expect(all).toContain('<p class="tn-conditions">30 jours</p>');
    const strict = customThemeSpec(theme(), input({ dropMissing: false, company: {} }));
    expect(strict.problems.filter((x) => x.level === "bloquant").map((x) => x.text).join("\n")).toMatch(/La garantie de retour, mise en avant : à compléter : délai de retour, conditions de retour/);
    // Un mur d'avis écrit avec de vrais avis part ; les lignes restées vides s'en vont.
    const real = tenueSection("tn-mur-avis")!.html.replace("[À compléter : avis d'un client]", "Il ne quitte plus mon bureau.").replace("[À compléter : prénom et date]", "Inès, mars").replace("[À compléter : d'où viennent ces avis, et s'ils sont vérifiés]", "Avis reçus par e-mail après l'achat.");
    const mur = customThemeSpec(theme([sec("tn-mur-avis", "mur", real)]), input()).spec.customSections["es-custom-mur"].liquid;
    expect((mur.match(/<li>/g) ?? []).length).toBe(1);
    expect(mur).toContain("Il ne quitte plus mon bureau.");
  });

  it("la mise en boutique accepte chaque pièce nouvelle et chaque façon ajoutée", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection } = await import("@/lib/theme/ops");
    const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
    const cases = [...ACHAT_SECTIONS.flatMap((s) => s.constructions.map((c) => [s.id, c.key] as const)), ...Object.entries(ACHAT_FACONS).filter(([id]) => id !== "tn-achat").flatMap(([id, list]) => list.map((c) => [id, c.key] as const))];
    for (const [id, key] of cases) {
      const t = { version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy"), sec(id, "s1", key)] }] } as any;
      const out = customThemeSpec(t, { name: "Essai", business: "products", products: [{ handle: "a", title: "A", categories: [] }, { handle: "b", title: "B", categories: [] }], assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null } as any);
      expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text), `${id} ${key}`).toEqual([]);
      for (const [type, c] of Object.entries(out.spec.customSections)) {
        expect(validateCustomSection(c.liquid), `${id} ${key} ${type}`).toBeNull();
        expect(c.liquid, `${id} ${key} ${type}`).not.toMatch(/À compléter|photos\/|onclick=|data-go=|href="#"|\/api\/files\/|<script(?! type="application\/json" data-tn-versions| src="\{\{ '(?:tenue-achat|boutique-shopify)\.js' \| asset_url \}\}" defer>)/);
      }
      const mine = out.spec.customSections["es-custom-s1"]?.liquid;
      if (mine) expect(mine, `${id} ${key}`).toContain(`data-tn-c="${key}"`);
      // La feuille de la boutique porte les règles de la façon choisie.
      if (mine && key !== tenueSection(id)!.constructions[0].key) expect(Object.values(out.spec.customSections).map((c) => c.liquid).join("\n"), `${id} ${key} : feuille`).toContain(`[data-tn-c="${key}"]`);
    }
  });
});

describe("contrat de boutique : le script du Studio ne parle qu'à « window.tnBoutique »", () => {
  const read = (f: string) => fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8");
  const run = async (file: string, sandbox: Record<string, unknown>) => { const vm = await import("node:vm"); const w: any = { ...sandbox }; w.window = w; vm.runInNewContext(read(file), w); return w; };

  it("le script commun n'appelle aucune plateforme : ni adresse de panier, ni fetch", () => {
    const js = read("tenue-achat.js").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(js).not.toMatch(/fetch\(|XMLHttpRequest|cart\/add|cart\.js|wc-ajax|prestashop|Shopify/i);
    expect(read("tenue-achat.js")).toContain("tnBoutique.ajouter(lignes, options) → Promise<Panier>");
  });

  it("un pack de trois articles en trois versions, avec son cadeau, ajoute quatre lignes ; deux fois la même version s'additionne", async () => {
    const w = await run("tenue-achat.js", { document: { querySelectorAll: () => [] } });
    expect(JSON.parse(JSON.stringify(w.tnAchat.lignes({ articles: ["11", "12", "13"], cadeau: "99" })))).toEqual([{ id: "11", quantite: 1 }, { id: "12", quantite: 1 }, { id: "13", quantite: 1 }, { id: "99", quantite: 1, cadeau: true }]);
    expect(JSON.parse(JSON.stringify(w.tnAchat.lignes({ articles: ["11", "11", "13"] })))).toEqual([{ id: "11", quantite: 2 }, { id: "13", quantite: 1 }]);
  });

  it("l'adaptateur Shopify construit les bonnes requêtes (faux fetch, pas une vraie boutique)", async () => {
    const calls: { url: string; init?: any }[] = [];
    const fetch = async (url: string, init?: any) => { calls.push({ url, init }); return url.endsWith("cart/add.js") ? { ok: true, json: async () => ({ items: [] }) } : { ok: true, json: async () => ({ item_count: 4, total_price: 8700, items: [{ variant_id: 11, quantity: 1, title: "Collier — Bleu / S", final_line_price: 2900 }] }) }; };
    const w = await run("boutique-shopify.js", { fetch, Shopify: { routes: { root: "/fr/" }, currency: { active: "EUR" } }, document: { documentElement: { lang: "fr" } }, Intl, location: {} });
    const cart = await w.tnBoutique.ajouter([{ id: "11", quantite: 1 }, { id: "12", quantite: 1 }, { id: "13", quantite: 1 }, { id: "99", quantite: 1, cadeau: true }]);
    expect(calls[0].url).toBe("/fr/cart/add.js");
    expect(calls[0].init.method).toBe("POST");
    expect(JSON.parse(calls[0].init.body)).toEqual({ items: [{ id: 11, quantity: 1 }, { id: 12, quantity: 1 }, { id: 13, quantity: 1 }, { id: 99, quantity: 1, properties: { _cadeau: "oui" } }] });
    expect(calls[1].url).toBe("/fr/cart.js");
    expect(JSON.parse(JSON.stringify(cart))).toEqual({ nombre: 4, total: 8700, lignes: [{ id: "11", quantite: 1, titre: "Collier — Bleu / S", prix: 2900 }] });
    expect(w.tnBoutique.argent(2900).replace(/\s/g, " ")).toBe("29,00 €");
    // Un refus de la boutique (stock) remonte tel quel ; rien à ajouter : aucune requête.
    const refus = await run("boutique-shopify.js", { fetch: async () => ({ ok: false, json: async () => ({ description: "Il ne reste que 2 articles." }) }), document: { documentElement: {} }, Intl, location: {} });
    await expect(refus.tnBoutique.ajouter([{ id: "11", quantite: 3 }])).rejects.toThrow("Il ne reste que 2 articles.");
    const n = calls.length;
    await expect(w.tnBoutique.ajouter([])).rejects.toThrow();
    expect(calls.length).toBe(n);
  });

  it("l'adaptateur de l'aperçu tient un panier d'essai : le cadeau ne compte pas dans le total", async () => {
    const w = await run("boutique-apercu.js", { document: { dispatchEvent: () => true }, CustomEvent: class { constructor(public type: string, public init: unknown) {} } });
    await w.tnBoutique.ajouter([{ id: "a", quantite: 2 }, { id: "g", quantite: 1, cadeau: true }], { prix: { a: 2900, g: 1900 } });
    const cart = JSON.parse(JSON.stringify(await w.tnBoutique.panier()));
    expect([cart.nombre, cart.total]).toEqual([3, 5800]);
    expect(w.tnBoutique.argent(5800).replace(/\s/g, " ")).toBe("58 €");
  });
});

// ---------------------------------------------------------------- planches en image (à la demande)

const VIF = {
  name: "Museau", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Des accessoires francs et joyeux pour les chiens de ville.", audience: "", personality: ["joyeuse", "franche"],
  tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] },
  palette: { primary: "#FF4F6D", secondary: "#FFD43B", accent: "#FF4F6D", light: "#FFF6DC", dark: "#1D1A3A" },
  fonts: { heading: "unbounded_n8", body: "dm_sans" }, logo: { concept: "", status: "proposed" },
} as const;
const MODE = {
  name: "Maison Lise", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Des vêtements d'été en lin, coupés pour durer.", audience: "", personality: ["soignée", "solaire"],
  tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] },
  palette: { primary: "#B5562E", secondary: "#E9DFCF", accent: "#B5562E", light: "#F5F0E8", dark: "#1E1B18" },
  fonts: { heading: "instrument_serif", body: "dm_sans" }, logo: { concept: "", status: "proposed" },
} as const;
const ASSETS = path.join(process.cwd(), "public", "theme-assets");
type Essai = { key: string; brand: unknown; tenue: Record<string, string>; dir: string; photos: string[]; others: [string, string, number][]; product: { title: string; small: string; phrase: string; option: string; bouton: string; price: number; options: { name: string; values: string[] }[]; out: string[] } };
const ESSAIS: Essai[] = [
  { key: "calme", brand: F.FAUTEUIL_BRAND, tenue: { ...F.FAUTEUIL_TENUE }, dir: path.join(ASSETS, "alcove"), photos: F.PRODUCT_PHOTOS, others: [["Repose-pieds Alcôve", "ambiance-06.webp", 18900], ["Coussin Alcôve", "ambiance-09.webp", 4900], ["Plaid Alcôve", "ambiance-04.webp", 7900]],
    product: { title: "Fauteuil Alcôve", small: "Le fauteuil", phrase: "Une assise profonde, des bras qui entourent, un tissu qu'on a envie de toucher.", option: "Tissu terracotta", bouton: "L'installer chez moi", price: 64900, options: [{ name: "Couleur", values: ["Terracotta", "Écru", "Sauge"] }], out: ["Sauge"] } },
  { key: "brute", brand: K.SAC_BRAND, tenue: { ...K.SAC_TENUE }, dir: K.SAC_DIR, photos: ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"], others: [["Trousse Traverse", "detail-poche.webp", 2900], ["Sangle Traverse", "detail-boucle.webp", 1900], ["Housse Traverse", "detail-poignee.webp", 2400]],
    product: { title: "Sac Traverse", small: "Le sac de voyage", phrase: "Une grande poche, une poche devant, des sangles qui serrent le tout. Tu le fermes, tu pars.", option: "Toile kaki", bouton: "Le prendre", price: 14900, options: [{ name: "Couleur", values: ["Kaki", "Noir"] }, { name: "Taille", values: ["Cabine", "Soute"] }], out: [] } },
  { key: "vive", brand: VIF, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "la boucle" }, dir: path.join(ASSETS, "museau-club"), photos: ["collier-01.webp", "collier-02.webp", "collier-03.webp", "collier-04.webp", "collier-05.webp"], others: [["Laisse Museau", "laisse-01.webp", 3400], ["Harnais Museau", "harnais-01.webp", 4900], ["Pochette Museau", "pochette-01.webp", 1900]],
    product: { title: "Collier Museau", small: "Le collier", phrase: "Doux contre le cou, solide à la boucle. Il se règle en deux gestes et ne bouge plus.", option: "Bleu électrique", bouton: "Je le prends", price: 2900, options: [{ name: "Couleur", values: ["Bleu", "Rouge", "Jaune"] }, { name: "Taille", values: ["XS", "S", "M", "L"] }], out: ["L"] } },
  { key: "mode", brand: MODE, tenue: { titres: "fins", bouton: "droit", cadre: "droit", fond: "uni", petits: "normal", signe: "le pli du lin" }, dir: path.join(process.cwd(), "public", "sections", "photos"), photos: ["md-t1.webp", "md-r1.webp", "md-r2.webp", "md-j1.webp", "md-j2.webp"], others: [["Chemise en lin", "md-o1.webp", 8900], ["Pantalon large", "md-o3.webp", 10900], ["Sandales croisées", "md-o5.webp", 7900]],
    product: { title: "Robe Lise", small: "La robe d'été", phrase: "Un lin qui respire, une taille qui se noue, une jupe qui suit le pas.", option: "Lin écru", bouton: "Ajouter au panier", price: 12900, options: [{ name: "Couleur", values: ["Écru", "Terracotta"] }, { name: "Taille", values: ["36", "38", "40", "42"] }], out: ["42"] } },
];

describe.runIf(!!process.env.ACHAT_OUT)("module achat : planches en image, trois tenues, téléphone et ordinateur", () => {
  it("chaque façon et chaque pièce nouvelle est rendue ; rien ne dépasse de l'écran", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveBrand, loadProject } = await import("@/lib/projects");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { saveShopOffers } = await import("@/lib/syna-agent/product-features");
    const { saveAsset } = await import("@/lib/library");
    const { createProduct } = await import("@/lib/products/catalog");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const { shootPages } = await import("@/lib/syna-agent/custom-theme/shots");
    const out = process.env.ACHAT_OUT!;
    fs.mkdirSync(out, { recursive: true });
    const only = (process.env.ACHAT_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const tenues = (process.env.ACHAT_TENUES ?? "calme,brute,vive").split(",");
    // Une page par façon nouvelle et par pièce nouvelle ; six pages « style » : le bloc et la pièce qui va avec lui.
    const single = [...Object.entries(ACHAT_FACONS).flatMap(([id, list]) => list.slice(id === "tn-achat" ? 0 : 1).map((c) => ({ id, c: c.key }))), ...ACHAT_SECTIONS.flatMap((s) => s.constructions.map((c) => ({ id: s.id, c: c.key })))]
      .map((x) => ({ key: `${x.id.slice(3)}--${x.c}`.slice(0, 44), sections: [x] }));
    const styles = [
      { key: "style-1-simple", sections: [{ id: "tn-achat", c: "simple" }] },
      { key: "style-2-vente-directe", sections: [{ id: "tn-achat", c: "vente-directe" }, { id: "tn-lots", c: "cartes" }] },
      { key: "style-3-haut-de-gamme", sections: [{ id: "tn-achat", c: "grandes-photos" }] },
      { key: "style-4-technique", sections: [{ id: "tn-achat", c: "technique" }, { id: "tn-versions", c: "lignes" }] },
      { key: "style-5-soin", sections: [{ id: "tn-achat", c: "fond-doux" }, { id: "tn-pictos", c: "rangee" }] },
      { key: "page-vente-directe", sections: [{ id: "tn-achat", c: "vente-directe" }, { id: "tn-lots", c: "cartes" }, { id: "tn-atouts", c: "coches" }, { id: "tn-probleme-reponse", c: "deux-temps" }, { id: "tn-avantages", c: "alternes" }, { id: "tn-mur-avis", c: "mosaique" }, { id: "tn-nous-et-autres", c: "tableau" }, { id: "tn-livraison", c: "frise" }, { id: "tn-garantie", c: "bande" }, { id: "tn-questions", c: "cartes" }, { id: "tn-appel-produit", c: "bande-sombre" }] },
      { key: "accueil-un-produit", sections: [{ id: "tn-ouverture", c: "titre-en-bas" }, { id: "tn-appel-produit", c: "carte" }, { id: "tn-atouts", c: "coches" }, { id: "tn-garantie", c: "sceau" }] },
      { key: "style-6-mode", sections: [{ id: "tn-achat", c: "portrait" }, { id: "tn-versions", c: "pastilles" }, { id: "tn-guide-tailles", c: "tiroir" }] },
    ];
    const pages = [...styles, ...single].filter((p) => !only.length || only.some((o) => p.key.includes(o)));
    expect(new Set(pages.map((p) => p.key)).size).toBe(pages.length);
    const overflow: string[] = [];
    for (const e of ESSAIS.filter((x) => tenues.includes(x.key))) {
      const user = await account(), pid = await project(user);
      saveBrand(pid, e.brand as any);
      const up = async (f: string) => (await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f, undefined, e.dir), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" })).id;
      const images = [] as { assetId: string }[];
      for (const f of e.photos) images.push({ assetId: await up(f) });
      const combos = e.product.options.reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
      createProduct(pid, { title: e.product.title, images, price: e.product.price, categories: ["La gamme"], options: e.product.options, variants: combos.map((c) => ({ options: c, stock: c.some((v) => e.product.out.includes(v)) ? 0 : 5 })) } as any);
      for (const [title, f, price] of e.others) createProduct(pid, { title, images: [{ assetId: await up(f) }], price, categories: ["Les accessoires"] } as any);
      saveCompany(pid, { shipping: "Chez toi en 2 à 4 jours, 4,90 €", returns: "30 jours pour changer d'avis" });
      saveShopOffers(pid, { quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }, { qty: 3, pct: 15 }] } } as any);
      const look = await up(e.photos[e.photos.length - 1]);
      const html = (id: string) => {
        let h = tenueSection(id)!.html;
        if (id === "tn-achat") h = h.replace("<small>Le thé</small>", `<small>${e.product.small}</small>`).replace(">Thé vert jasmin</h1>", `>${e.product.title}</h1>`).replace(/<p>[\s\S]*?<\/p>/, `<p>${e.product.phrase}</p>`).replace("Sachet de 100 g", e.product.option).replace(">Ajouter au panier</a><ul", `>${e.product.bouton}</a><ul`);
        if (id === "tn-looks") h = h.replace("photos/md-j2.webp", `/api/files/${look}`);
        // Textes d'un client inventé pour l'essai (tenue « vive ») : la page se juge remplie.
        if (e.key === "vive") {
          const seq = (list: string[]) => { let i = 0; h = h.replace(/\[À compléter[^\]]*\]/g, (m) => list[i++] ?? m); };
          if (id === "tn-probleme-reponse") seq(["Un collier qui frotte et qui laisse une marque.", "Un intérieur doublé de maille douce.", "Une boucle qui lâche quand il tire.", "Une boucle testée à la traction, que tu fermes d'un clic.", "Un réglage qui glisse à chaque balade.", "Une sangle qui garde son réglage."]);
          if (id === "tn-nous-et-autres") { seq(["un collier d'entrée de gamme", "Doublure en maille douce", "Boucle testée à la traction", "Lavable en machine", "Réparé par la marque", "Fiches de la marque et essais de traction du fabricant."]); h = h.replace(/(Lavable en machine<\/span><p><i>Oui<\/i><i>)Non/, "$1Oui"); }
          if (id === "tn-avantages") { seq(["Doux contre le cou", "Une maille aérée, sans couture qui gratte.", "Fermé d'un clic", "Une boucle large, facile à saisir avec des gants.", "Lavé, séché, reparti", "Il passe en machine et sèche en une nuit."]); let n = 0; h = h.replace(/photos\/[\w.-]+/g, () => `/api/files/${[images[1], images[2], images[4]][n++ % 3].assetId}`); }
          if (id === "tn-mur-avis") { seq(["Enfin un collier qui ne lui pèle pas le cou. On a pris le harnais dans la foulée.", "Camille, février", "Solide, et le bleu est encore plus beau en vrai.", "Théo, janvier", "La boucle se ferme d'une main, c'est tout ce que je demandais.", "Sonia, mars", "Lavé dix fois, il n'a pas bougé.", "Marc, mars", "Avis reçus par e-mail après l'achat, publiés tels quels."]); let n = 0; h = h.replace(/photos\/[\w.-]+/g, () => `/api/files/${[images[3], images[4]][n++ % 2].assetId}`); }
          if (id === "tn-livraison") seq(["", "Chaque commande part de notre atelier sous deux jours ouvrés.", "Colissimo suivi : tu reçois le lien de suivi par e-mail.", "Deux à quatre jours après le départ, dans ta boîte aux lettres."]);
          if (id === "tn-atouts") h = h.replace("Tout est bio", "Doublé de maille douce").replace("Du thé, des fleurs, rien d'autre.", "Rien ne frotte, rien ne gratte.").replace("Assemblé à la main", "Boucle testée à la traction").replace("Par petites quantités, à la commande.", "Elle tient quand il tire.").replace("En vrac", "Lavable en machine").replace("Dans un sachet qui se referme.", "Il sèche en une nuit.");
          if (id === "tn-questions") h = h.replace("Avant de choisir.", "Avant de commander.").replace("Combien de tasses dans un sachet ?", "Quelle taille pour mon chien ?").replace("[À compléter : nombre de tasses]", "Mesure son tour de cou et ajoute deux doigts : le guide des tailles donne la taille en face.").replace("Et s'il ne me plaît pas ?", "Et s'il ne lui va pas ?").replace("[À compléter : retours]", "Tu as 30 jours pour nous le renvoyer.").replace("Comment le conserver ?", "Comment le laver ?").replace("À l'abri de la lumière, dans son sachet refermé.", "En machine, à basse température, dans un filet.");
          if (id === "tn-ouverture") h = h.replace("Thés et infusions bio", "Colliers pour chiens").replace("Le thé vert au jasmin", "Le collier Museau").replace("Pose ton écran.<br>Respire.", "Il tire.<br>Rien ne lâche.").replace("Quelques minutes, une tasse chaude, plus rien d'autre. Le reste de la journée attendra.", "Un collier doux contre son cou, solide à la boucle, qui passe en machine.").replace("Choisir mon mélange", "Voir le collier").replace("photos/hero.jpg", `/api/files/${look}`);
          if (id === "tn-appel-produit") h = h.replace("Prêt à l'essayer&nbsp;?", "Prêt pour la prochaine balade&nbsp;?");
        }
        return h;
      };
      const t: any = { version: 1, family: "classique", style: "classique", search: null, rev: 0, at: Date.now(), tenue: e.tenue,
        header: { uid: "h", id: "tn-entete", html: tenueSection("tn-entete")!.html }, footer: { uid: "f", id: "tn-pied", html: tenueSection("tn-pied")!.html },
        pages: pages.map((p, i) => ({ key: p.key, label: p.key, sections: p.sections.map((s, j) => ({ uid: `s${i}x${j}`, id: s.id, construction: s.c, html: html(s.id), ...(s.id === "tn-achat" || e.key === "vive" ? { clientTexts: true } : {}) })) })) };
      const page = renderCustomTheme(loadProject(pid), t, { embed: true });
      for (const view of ["téléphone", "ordinateur"] as const) {
        const shots = await shootPages(page, pages.map((p) => p.key), { view, maxHeight: 14000, quality: 86 });
        expect(shots, "Chromium présent").not.toBeNull();
        for (const s of shots!) {
          fs.writeFileSync(path.join(out, `${s.key}__${e.key}__${view === "téléphone" ? "tel" : "ordi"}.jpg`), s.data);
          if (s.overflow > 1) overflow.push(`${s.key} · tenue ${e.key} · ${view} : dépasse de ${s.overflow} px`);
        }
      }
    }
    expect(overflow, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 900_000);

  // Écran étroit (320 px) et barre d'achat : une page statique, sans le Studio. Les polices de la marque n'y sont pas
  // chargées : des polices larges du système les remplacent, pour juger les débordements au plus serré.
  it("à 320 px rien ne déborde ; la barre d'achat reprend la vignette et le prix du bloc", async () => {
    const { chromium } = await import("playwright");
    const { chromiumPath } = await import("@/lib/theme/snapshot");
    const { markMissing } = await import("@/lib/syna-agent/custom-theme/tenue");
    const out = process.env.ACHAT_OUT!;
    fs.mkdirSync(out, { recursive: true });
    const dir = path.join(process.cwd(), "public", "sections");
    const css = ["tenue.css", "tenue-produit.css", "tenue-achat.css"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    const js = ["tenue.js", "tenue-achat.js"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    const img = (f: string) => `file://${path.join(process.cwd(), "public", "theme-assets", f)}`;
    const list = [...Object.entries(ACHAT_FACONS).flatMap(([id, l]) => l.map((c) => [id, c.key] as const)), ...ACHAT_SECTIONS.flatMap((x) => x.constructions.map((c) => [x.id, c.key] as const))];
    const fill = (id: string) => {
      let h = tenueSection(id)!.html.replace(/photos\//g, `file://${dir}/photos/`);
      if (id === "tn-achat") h = withTenueBuyBlock(h.replace(">Thé vert jasmin</h1>", ">Collier Museau</h1>"), { images: [1, 2, 3, 4, 5].map((n) => img(`museau-club/collier-0${n}.webp`)), price: "29 €", shipping: "Chez toi en 2 à 4 jours, 4,90 €", returns: "30 jours pour changer d'avis", notes: ["Indice de réparabilité : 8,2 sur 10"] });
      if (id === "tn-versions") h = D.withTenueVersions(h, [{ name: "Couleur", values: [{ label: "Bleu électrique", teinte: "#2f5aa8" }, { label: "Rouge", teinte: "#b3262e" }, { label: "Jaune moutarde", teinte: "#d1a23a", soldOut: true }] }, { name: "Taille", values: ["XS", "S", "M", "L", "XL", "XXL"].map((label) => ({ label })) }]);
      if (id === "tn-lots") h = D.withTenueLots(h, { unit: "bouteille", cents: 124900, tiers: [{ qty: 2, pct: 10 }, { qty: 3, pct: 15 }] });
      return markMissing(h);
    };
    const tenues = [["fins", "pilule", "niche", "uni", "normal", "Georgia,serif"], ["gras", "etiquette", "droit", "toile", "machine", "'Arial Black',Impact,sans-serif"], ["capitales", "ombre", "penche", "uni", "normal", "'Arial Black',Impact,sans-serif"]];
    const body = tenues.map((t) => `<div class="ctw" data-tn-titres="${t[0]}" data-tn-bouton="${t[1]}" data-tn-cadre="${t[2]}" data-tn-fond="${t[3]}" data-tn-petits="${t[4]}" style="--f-title:${t[5]};--tn-arrondi:${t[2] === "droit" ? "0px" : "14px"}"><div class="frame"><main class="tb-pg">${list.map(([id, key]) => fill(id).replace(/^<section\b/, `<section data-essai="${id} ${key} (${t[0]})" data-tn-c="${key}"`)).join("\n")}</main></div></div>`).join("\n");
    const file = path.join(out, "statique.html");
    fs.writeFileSync(file, `<!doctype html><html data-po-barre="1"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.ctw{--tn-fond:#F6F1E7;--tn-encre:#1F1B16;--tn-accent:#B4532A;--tn-doux:#E9D8B8;--tn-texte:#2c2620;--tn-sourd:#6d655c;--tn-bouton:#1F1B16;--tn-sur-bouton:#fbf8f2;--f-ui:Arial,sans-serif}${css}</style><body>${body}<script>${js}</script></body></html>`);
    const browser = await chromium.launch({ executablePath: chromiumPath() ?? undefined });
    try {
      const over: string[] = [];
      for (const width of [320, 390, 1000, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        await page.goto(`file://${file}`);
        over.push(...await page.evaluate((w) => [...document.querySelectorAll("section[data-essai]")].flatMap((sec) => {
          const wide = [...sec.querySelectorAll("*")].filter((el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && cs.position !== "fixed" && !el.closest(".tn-galerie,.tn-vignettes,.tn-barre") && r.right > w + 1.5 && getComputedStyle(sec).overflowX !== "clip"; });
          return document.documentElement.scrollWidth > w + 1 && wide.length ? [`${w} px · ${sec.getAttribute("data-essai")} : ${wide[0].tagName}.${wide[0].className}`] : [];
        }), width));
        if (width === 320) expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
        // La barre d'achat : le bouton du bloc sorti de l'écran, elle monte avec la vignette et le prix.
        if (width !== 320) {
          const bar = page.locator('.tn-achat[data-tn-c="vente-directe"] > .tn-barre').first();
          expect(await bar.locator(".tn-vig").count()).toBe(1);
          expect(await bar.locator(".tn-prix-b").textContent()).toBe("29 €");
          expect(await page.locator('.tn-achat[data-tn-c="simple"] > .tn-barre .tn-vig').count()).toBe(0); // la façon d'origine n'est pas touchée
          // (Le bouton passe d'abord à l'écran, comme quand on fait défiler : la barre ne se décide qu'à ce moment-là.)
          await page.evaluate(() => { const b = document.querySelector('.tn-achat[data-tn-c="vente-directe"] > .tn-bt')!; scrollTo(0, b.getBoundingClientRect().top + scrollY - 300); });
          await page.waitForTimeout(300);
          await page.evaluate(() => { const b = document.querySelector('.tn-achat[data-tn-c="vente-directe"] > .tn-bt')!; scrollTo(0, b.getBoundingClientRect().bottom + scrollY + 40); });
          await page.waitForTimeout(700);
          expect(await bar.evaluate((el) => el.classList.contains("tn-on"))).toBe(true);
          fs.writeFileSync(path.join(out, `barre-achat__${width === 390 ? "tel" : "ordi"}.jpg`), await page.screenshot({ type: "jpeg", quality: 86 }));
        }
        await page.close();
      }
      expect(over, "rien ne dépasse").toEqual([]);
    } finally { await browser.close(); }
  }, 300_000);
});


// ══ Achat, suite : packs, dessous du bouton, offre datée, fenêtre d'offre, et l'achat pour de vrai ══
// Client inventé pour l'essai (colliers pour chiens). Rien n'est vendu : panier d'essai de l'aperçu, faux fetch pour Shopify.
const JOUR = 86_400_000;
const COULEURS = ["Bleu", "Rouge", "Jaune"], TAILLES = ["S", "M", "L"];
const versionsEssai = (o: { stock?: boolean; compare?: boolean } = {}): D.TenueVersion[] => COULEURS.flatMap((c, i) => TAILLES.map((t, j) => {
  const stock = c === "Jaune" && t === "L" ? 0 : c === "Bleu" && t === "S" ? 4 : 7;
  return { id: `v-${c}-${t}`.toLowerCase(), options: [c, t], disponible: stock > 0, ...(o.stock === false ? {} : { stock }), prix: 3000, ...(o.compare === false ? {} : { compare: 4000 }) };
}));
const venteEssai = (o: Partial<D.TenueAchatVrai> & { stock?: boolean; compare?: boolean } = {}, now = Date.now()): D.TenueAchatVrai => ({
  titre: "Collier Museau", noms: ["Couleur", "Taille"], versions: versionsEssai(o),
  packs: [{ quantite: 1, nom: "Un collier", prix: 3000 }, { quantite: 2, nom: "Le duo", prix: 5400 }, { quantite: 3, nom: "Le trio", prix: 7650, populaire: true, cadeau: { id: "v-laisse", titre: "La laisse Museau", image: null } }],
  seuilStock: 5, stockDepart: 200, delai: "2 à 4 jours ouvrés",
  promo: { nom: "Les jours Museau", pct: 25, fin: now + 2 * JOUR + 5 * 3_600_000, cadeau: null },
  fenetre: { titre: "Dix pour cent sur ta première commande", texte: "Inscris-toi à la lettre de Museau : ton code arrive tout de suite.", code: "MUSEAU10" },
  paiements: [], livraison: "Chez toi en 2 à 4 jours, 4,90 €", retours: "30 jours pour changer d'avis", ...o,
});
const piece = (id: string) => tenueSection(id)!.html;

describe("achat, suite : rien ne s'affiche sans sa vraie donnée", () => {
  const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();
  it("prix barré et étiquette : seulement avec le vrai prix de comparaison, le pourcentage calculé", () => {
    const bloc = piece("tn-achat").replace(/<div class="tn-prix">[^<]*<\/div>/, '<div class="tn-prix">30 €</div>');
    const avec = D.withTenueAchatVrai(bloc, venteEssai({}, NOW), NOW);
    expect(sp(avec)).toContain('<div class="tn-prix"><s>40 €</s> 30 € <em class="tn-moins">−25 %</em></div>');
    expect(avec).toMatch(/<script type="application\/json" data-tn-versions data-tn-titre="Collier Museau" data-tn-noms="Couleur\|Taille">\[\{"id":"v-bleu-s","options":\["Bleu","S"\],"disponible":true,"stock":4,"prix":3000,"compare":4000\}/);
    const sans = D.withTenueAchatVrai(bloc, venteEssai({ compare: false }, NOW), NOW);
    expect(sans).toContain('<div class="tn-prix">30 €</div>');
    expect(sans).not.toMatch(/<s>|tn-moins/);
    // Les packs : prix barré et « −X % » calculés sur le prix de comparaison × la quantité ; sans lui, le prix du pack seul.
    const packs = sp(D.withTenueAchatVrai(piece("tn-packs"), venteEssai({}, NOW), NOW));
    expect(packs).toContain('data-tn-quantite="3" data-tn-prix="7650" data-tn-cadeau="v-laisse"');
    expect(packs).toContain('<s>120 €</s> 76,50 € <em class="tn-moins">−36 %</em>');
    expect(packs).toContain("<span>La laisse Museau</span><em>Offert</em>");
    expect((packs.match(/Le plus populaire/g) ?? []).length).toBe(1);
    const packsSans = D.withTenueAchatVrai(piece("tn-packs"), venteEssai({ compare: false, packs: [{ quantite: 2, nom: "Le duo", prix: 5400 }] }, NOW), NOW);
    expect(packsSans).not.toMatch(/<s>|tn-moins|Le plus populaire|tn-pack-cadeau/);
    // Sans pack saisi : la pièce garde ses « à compléter », aucun prix d'exemple.
    expect(D.withTenueAchatVrai(piece("tn-packs"), venteEssai({ packs: [] }, NOW), NOW)).not.toMatch(/€/);
  });

  it("stock restant et jauge : seulement avec le stock suivi, le seuil et la quantité de départ du client", () => {
    const sb = piece("tn-sous-bouton");
    const avec = D.withTenueAchatVrai(sb, venteEssai({}, NOW), NOW);
    expect(avec).toContain('<div class="tn-jauge" data-tn-jauge data-tn-depart="200" role="img" hidden>');
    expect(avec).toContain('<p class="tn-stock" data-tn-stock data-tn-seuil="5" aria-live="polite" hidden></p>');
    expect(avec).toContain("Chez toi en 2 à 4 jours ouvrés</p>");
    for (const sans of [venteEssai({ stock: false }, NOW), venteEssai({ seuilStock: null, stockDepart: null }, NOW)]) expect(D.withTenueAchatVrai(sb, sans, NOW)).not.toMatch(/data-tn-jauge|data-tn-stock/);
    // Sans délai donné : aucune ligne « Chez toi en … » ; sans moyen de paiement connu : aucun logo.
    const nu = D.withTenueAchatVrai(sb, venteEssai({ delai: null }, NOW), NOW);
    expect(nu).not.toMatch(/class="tn-delai"|tn-paiements-sb/);
    expect(D.withTenueAchatVrai(sb, venteEssai({ paiements: ["Visa"] }, NOW), NOW)).toContain("<span>Visa</span>");
    // Le lien des tailles ne reste que si le produit a de vraies tailles.
    expect(D.withTenueAchatVrai(sb, venteEssai({ noms: ["Couleur"] }, NOW), NOW)).not.toContain("Quelle taille");
  });

  it("offre du moment : la promotion datée du client ; « Aujourd'hui seulement » le dernier jour ; passée la date, rien", () => {
    const om = piece("tn-offre-moment");
    const fin = new Date(2026, 10, 28, 23, 59, 0).getTime();
    const avec = sp(D.withTenueAchatVrai(om, venteEssai({ promo: { nom: "Les jours Museau", pct: 25, fin, cadeau: { id: "v-laisse", titre: "La laisse Museau", image: null } } }, NOW), NOW));
    expect(avec).toContain(`data-tn-offre-moment data-tn-fin="${fin}"`);
    expect(avec).toContain('<em class="tn-om-remise">−25 %</em>');
    expect(avec).toContain("Jusqu'au 28 novembre</p>");
    expect(avec).not.toMatch(/Aujourd'hui seulement|À compléter/);
    const dernier = D.withTenueAchatVrai(om, venteEssai({ promo: { nom: null, pct: 25, fin: new Date(2026, 10, 16, 23, 0, 0).getTime(), cadeau: null } }, NOW), NOW);
    expect(dernier).toContain("Aujourd'hui seulement</p>");
    expect(dernier).not.toMatch(/tn-om-nom|tn-om-cadeau/);
    expect(D.withTenueAchatVrai(om, venteEssai({ promo: null }, NOW), NOW)).toBe("");
    expect(D.withTenueAchatVrai(om, venteEssai({ promo: { nom: "Finie", pct: 25, fin: NOW - 1000, cadeau: null } }, NOW), NOW)).toBe("");
    // La fenêtre d'offre ne se pose pas sans offre ; avec, elle porte le titre, la phrase et le code du client.
    expect(D.withTenueAchatVrai(piece("tn-fenetre-offre"), venteEssai({ fenetre: null }, NOW), NOW)).toBe("");
    const fen = D.withTenueAchatVrai(piece("tn-fenetre-offre"), venteEssai({}, NOW), NOW);
    expect(fen).toContain("<b>MUSEAU10</b>");
    expect(fen).toMatch(/data-tn-fo-code hidden>/);
    expect(fen).not.toMatch(/À compléter/);
  });

  it("l'offre du client accepte les champs nouveaux, et seulement eux", async () => {
    const { shopOffersSchema } = await import("@/lib/syna-agent/product-features");
    const o = shopOffersSchema.parse({ packs: [{ quantite: 3, nom: "Le trio", remisePct: 15, cadeauHandle: "laisse-museau", populaire: true }], seuilStock: 5, stockDepart: 200, delaiLivraison: "2 à 4 jours ouvrés", fenetreOffre: { titre: "Dix pour cent", texte: "Sur ta première commande.", code: "MUSEAU10" }, promo: { pct: 25, endsAt: NOW + JOUR, nom: "Les jours Museau" } });
    expect(o.remisesConfirmees).toBe(false);
    expect(shopOffersSchema.parse({})).toMatchObject({ packs: [], seuilStock: null, stockDepart: null, delaiLivraison: null, fenetreOffre: null, remisesConfirmees: false });
    expect(shopOffersSchema.safeParse({ packs: [{ quantite: 3, nom: "Le trio", urgence: "vite" }] }).success).toBe(true); // un champ inconnu d'un pack est ignoré, jamais affiché
    expect(shopOffersSchema.safeParse({ fausseUrgence: true }).success).toBe(false);
  });
});

describe("finitions de la fiche : note et avis, rappel vers l'achat, coloris en scène", () => {
  const vd = (h: string) => h.replace(/^<section\b/, '<section data-tn-c="vente-directe"');
  it("note et ligne d'avis : seulement avec de vrais avis de ce produit ; sans avis, ni étoiles ni « 0 avis »", () => {
    const sans = D.withTenueAchatVrai(vd(piece("tn-achat")), venteEssai());
    expect(sans).not.toMatch(/tn-note-a|tn-avis-a|tn-etoiles-a/);
    expect(D.avisAchat(null, "Collier Museau")).toBeNull();
    expect(D.avisAchat({ source: "x", liste: [] }, "Collier Museau")).toBeNull();
    // L'avis d'un autre produit ne compte pas ; l'avis sans produit compte ; la ligne est l'avis court le mieux noté, mot pour mot.
    const a = D.avisAchat(AVIS_ESSAI, "Collier Museau")!;
    expect(a.nombre).toBe(3);
    expect(Math.round(a.note! * 100)).toBe(467);
    expect(a.ligne).toEqual({ text: "Lavé dix fois, il n'a pas bougé.", name: "Marc" });
    const avec = D.withTenueAchatVrai(vd(piece("tn-achat")), venteEssai({ avis: a }));
    expect(avec).toMatch(/<\/h1><div class="tn-note-a" data-tn-note><i class="tn-etoiles-a" style="--note:4\.7" role="img" aria-label="Note : 4,7 sur 5"><\/i><b>4,7<\/b><span>3 avis<\/span><\/div>/);
    expect(avec).toMatch(/<\/ul><blockquote class="tn-avis-a" data-tn-avis-a><p>«&nbsp;Lavé dix fois, il n'a pas bougé\.&nbsp;»<\/p><cite>Marc<\/cite><\/blockquote>/);
    // Des avis sans note : pas d'étoiles, la ligne reste. Une autre façon du bloc : rien (seule la vente directe les range).
    const sansNote = D.withTenueAchatVrai(vd(piece("tn-achat")), venteEssai({ avis: D.avisAchat({ source: "x", liste: [{ text: "Très bien.", name: "Léa" }] }, "Collier Museau") }));
    expect(sansNote).not.toMatch(/tn-note-a|tn-etoiles-a/);
    expect(sansNote).toContain("<cite>Léa</cite>");
    expect(D.withTenueAchatVrai(piece("tn-achat"), venteEssai({ avis: a }))).not.toMatch(/tn-note-a|tn-avis-a/);
  });

  it("le bloc d'achat porte l'identifiant « tn-achat » ; les coloris ne se posent qu'avec deux couleurs qui ont leur photo", () => {
    expect(D.withTenueAchatVrai(piece("tn-achat"), venteEssai())).toMatch(/^<section class="tn tn-achat" data-tn-achat id="tn-achat">/);
    expect(D.withAchatId(D.withAchatId(piece("tn-achat"))).match(/id="tn-achat"/g)!.length).toBe(1);
    expect(D.withAchatId(piece("tn-packs"))).toBe(piece("tn-packs"));
    const deux = D.withTenueColoris(piece("tn-coloris"), [{ nom: "Bleu", teinte: "#2f5aa8", image: "/api/files/a1" }, { nom: "Rouge", teinte: null, image: "/api/files/a2" }, { nom: "Jaune", teinte: null, image: "" }]);
    expect(deux.match(/<li>/g)!.length).toBe(2);
    expect(deux).toContain('data-tn-rappel data-tn-couleur="Bleu"><div class="tn-ph tn-cadre" style="background-image:url(/api/files/a1)"></div><span><i style="--teinte:#2f5aa8"></i>Bleu</span>');
    expect(deux).not.toMatch(/À compléter|Jaune|md-o/);
    expect(D.withTenueColoris(piece("tn-coloris"), [{ nom: "Bleu", teinte: null, image: "/api/files/a1" }])).toBe("");
    expect(D.withTenueColoris(piece("tn-coloris"), [])).toBe("");
    expect(D.dataGaps(["tn-coloris"], { products: 1, families: 0, couleurs: 1 }).join(" ")).toMatch(/tn-coloris.*deux couleurs avec la photo/);
    expect(D.dataGaps(["tn-coloris"], { products: 1, families: 0, couleurs: 3 })).toEqual([]);
    expect(D.dataGaps(["tn-coloris"], { products: 1, families: 0 })).toEqual([]);
  });

  it("le Studio pose ces données depuis le catalogue : identifiant, rappel (nom, prix), coloris avec la photo de chaque version", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { createProduct } = await import("@/lib/products/catalog");
    const { saveAsset } = await import("@/lib/library");
    const { withTenueAchat } = await import("@/lib/syna-agent/custom-theme/buy-block");
    const sharp = (await import("sharp")).default;
    const user = await account(), pid = await project(user);
    const photo = async (n: string, r: number) => (await saveAsset({ projectId: pid, userId: user.id, data: await sharp({ create: { width: 60, height: 60, channels: 3, background: { r, g: 90, b: 160 } } }).jpeg().toBuffer(), name: n, mime: "image/jpeg", role: "product", origin: "upload" })).id;
    const [bleu, rouge] = [await photo("bleu.jpg", 40), await photo("rouge.jpg", 200)];
    createProduct(pid, { title: "Collier Museau", price: 3000, images: [{ assetId: bleu }, { assetId: rouge }], options: [{ name: "Couleur", values: ["Bleu", "Rouge", "Jaune"] }], variants: [{ options: ["Bleu"], price: 3000, image: bleu }, { options: ["Rouge"], price: 3000, image: rouge }, { options: ["Jaune"], price: 3000 }] } as any);
    createProduct(pid, { title: "Médaille", price: 900 } as any);
    expect(withTenueAchat(piece("tn-achat"), pid)).toMatch(/^<section class="tn tn-achat" data-tn-achat id="tn-achat">/);
    const rappel = withTenueAchat(piece("tn-rappel-achat"), pid);
    expect(rappel).toContain('<b class="tn-ra-nom">Collier Museau</b><span class="tn-ra-prix">30 €</span>');
    expect(rappel).not.toContain("À compléter");
    const coloris = withTenueAchat(piece("tn-coloris"), pid);
    expect(coloris.match(/data-tn-couleur="[^"]+"/g)).toEqual(['data-tn-couleur="Bleu"', 'data-tn-couleur="Rouge"']);
    expect(coloris).toContain(`/api/files/${bleu}`);
    // Un produit sans couleur : la pièce ne se pose pas. Sans vrais avis au Studio : ni note ni ligne d'avis.
    expect(withTenueAchat(piece("tn-coloris"), pid, "medaille")).toBe("");
    expect(withTenueAchat(vd(piece("tn-achat")), pid)).not.toMatch(/tn-note-a|tn-avis-a/);
    // Moyens de paiement : aucune source remplie par le client dans le Studio : rien ne s'affiche dans l'aperçu.
    expect(withTenueAchat(piece("tn-sous-bouton"), pid)).not.toMatch(/tn-paiements-sb/);
  });

  it("en boutique Shopify : l'identifiant du bloc, une vraie ancre pour le rappel, les coloris lus dans les options (Liquid contrôlé, pas une vraie boutique)", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection } = await import("@/lib/theme/ops");
    const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
    const theme = { version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, extras: [], pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy", "vente-directe"), sec("tn-rappel-achat", "ra", "bande"), sec("tn-coloris", "col", "file")] }] } as any;
    const out = customThemeSpec(theme, { name: "Museau", business: "products", products: [{ handle: "collier-museau", title: "Collier Museau", categories: [] }], company: { shipping: "Chez toi en 2 à 4 jours", returns: "30 jours" }, assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null, offres: null } as any);
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    for (const [type, c] of Object.entries(out.spec.customSections)) expect(validateCustomSection(c.liquid), type).toBeNull();
    expect(out.spec.customSections["es-custom-buy"].liquid).toContain('<section data-tn-c="vente-directe" class="tn tn-achat" data-tn-achat id="tn-achat">');
    const ra = out.spec.customSections["es-custom-ra"].liquid;
    expect(ra).toContain(`<a class="tn-bt" href="{% unless product %}{{ vedette.url }}{% endunless %}#tn-achat">Choisir le mien</a>`);
    expect(ra).toContain(`<b class="tn-ra-nom">{{ vedette.title }}</b><span class="tn-ra-prix">{{ vedette.selected_or_first_available_variant.price | money }}</span>`);
    expect(ra).not.toMatch(/À compléter|data-tn-rappel[\s>]|onclick/);
    const col = out.spec.customSections["es-custom-col"].liquid;
    expect(col).toContain(`{%- if value.variant.featured_image -%}<li><a class="tn-col" href="{{ value.variant.url }}#tn-achat"><div class="tn-ph tn-cadre" role="img" aria-label="{{ value | escape }}" style="background-image:url({{ value.variant.featured_image | image_url: width: 900 }})"></div>`);
    expect(col).toContain("{% if tn_nb == 0 or tn_nb == 1 %} hidden{% endif %}");
    expect(col).not.toMatch(/À compléter|\/api\/files|data-tn-rappel[\s>]/);
  });
});

describe("achat, suite, en boutique Shopify (Liquid contrôlé par le Studio ; pas une vraie boutique)", () => {
  const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
  const theme = (extras: any[] = []) => ({ version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, extras, pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy", "vente-directe"), sec("tn-offre-moment", "om"), sec("tn-lots", "lots"), sec("tn-packs", "packs"), sec("tn-sous-bouton", "sb")] }] }) as any;
  const offres = async (over: Record<string, unknown> = {}) => (await import("@/lib/syna-agent/product-features")).shopOffersSchema.parse({ quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }] }, packs: [{ quantite: 1, nom: "Un collier" }, { quantite: 3, nom: "Le trio", remisePct: 15, cadeauHandle: "laisse-museau", populaire: true }], seuilStock: 5, stockDepart: 200, delaiLivraison: "2 à 4 jours ouvrés", promo: { pct: 25, endsAt: Date.now() + 2 * JOUR, nom: "Les jours Museau" }, fenetreOffre: { titre: "Dix pour cent", texte: "Sur ta première commande.", code: "MUSEAU10" }, ...over });
  const input = (o: unknown) => ({ name: "Museau", business: "products", products: [{ handle: "collier-museau", title: "Collier Museau", categories: [] }, { handle: "laisse-museau", title: "Laisse Museau", categories: [] }], company: { shipping: "Chez toi en 2 à 4 jours", returns: "30 jours" }, assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null, offres: o }) as any;

  it("le bloc d'achat charge les deux scripts du Studio, pose la table des versions et garde la barre d'achat", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection } = await import("@/lib/theme/ops");
    const { compileTheme } = await import("@/lib/theme/compile");
    const out = customThemeSpec(theme(), input(await offres({ remisesConfirmees: true })));
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    for (const [type, c] of Object.entries(out.spec.customSections)) expect(validateCustomSection(c.liquid), type).toBeNull();
    const buy = out.spec.customSections["es-custom-buy"].liquid;
    expect(buy).toContain(`<script src="{{ 'boutique-shopify.js' | asset_url }}" defer></script><script src="{{ 'tenue-achat.js' | asset_url }}" defer></script>`);
    expect(buy).toContain(`<script type="application/json" data-tn-versions data-tn-titre="{{ product.title | escape }}" data-tn-noms="{{ product.options | join: '|' | escape }}">[{%- for variant in product.variants -%}{"id":"{{ variant.id }}","options":{{ variant.options | json }},"disponible":{{ variant.available | json }},{%- if variant.inventory_management == 'shopify' -%}"stock":{{ variant.inventory_quantity | json }},{%- endif -%}`);
    expect(buy).toContain(`"prix":{{ variant.price | json }}}`);
    // Prix barré : seulement si la boutique porte un vrai prix de comparaison.
    expect(buy).toContain("{%- if tn_v.compare_at_price > tn_v.price -%}<s>{{ tn_v.compare_at_price | money }}</s>");
    expect(buy).toMatch(/<div class="tn-barre" data-tn-barre hidden><b>\{\{ product\.title \}\}<\/b><button class="tn-bt" type="button" data-tn-acheter/);
    // Les deux fichiers partent dans le dossier « assets » du thème, tels qu'ils sont dans le Studio.
    const files = compileTheme(out.spec);
    for (const f of ["tenue-achat.js", "boutique-shopify.js"]) expect(files.get(`assets/${f}`), f).toBe(fs.readFileSync(path.join(process.cwd(), "public", "sections", f), "utf8"));
    // Lots et packs partent, avec les quantités, le cadeau lu dans la boutique, et un vrai formulaire sans script.
    const lots = out.spec.customSections["es-custom-lots"].liquid, packs = out.spec.customSections["es-custom-packs"].liquid;
    expect(lots).toContain('<li data-tn-quantite="2"><label><input type="radio" name="tn-lot">');
    expect(lots).toContain("| times: 2 | times: 90 | divided_by: 100.0 | round | money }}");
    expect(packs).toContain(`{%- form 'product', product, class: 'tn-packs-f', data-tn-achat-form: 'oui' -%}<input type="hidden" name="id" value="{{ tn_v.id }}">`);
    expect(packs).toContain(`data-tn-cadeau="{{ all_products['laisse-museau'].selected_or_first_available_variant.id }}"`);
    expect(packs).toContain('data-tn-quantite="3" data-tn-prix="{{ tn_pp }}"');
    expect(packs).toContain("{%- if tn_plein > tn_pp -%}<s>{{ tn_plein | money }}</s>");
    expect((packs.match(/Le plus populaire/g) ?? []).length).toBe(1);
    // Sous le bouton : jauge et stock attendent le vrai stock ; les moyens de paiement sont ceux de la boutique.
    const sb = out.spec.customSections["es-custom-sb"].liquid;
    expect(sb).toContain('data-tn-jauge data-tn-depart="200"');
    expect(sb).toContain('data-tn-stock data-tn-seuil="5"');
    expect(sb).toContain("{%- for type in shop.enabled_payment_types -%}{{ type | payment_type_svg_tag }}{%- endfor -%}");
    expect(sb).toContain("Chez toi en 2 à 4 jours ouvrés");
    expect(sb).not.toMatch(/À compléter|Quelle taille/);
    // L'offre du moment : la date de fin du client, cachée par la boutique une fois passée.
    const om = out.spec.customSections["es-custom-om"].liquid;
    expect(om).toMatch(/data-tn-fin="\d{13}"\{% assign tn_now = 'now' \| date: '%s' \| plus: 0 %\}\{% if tn_now >= \d{10} %\} hidden\{% endif %\}/);
    expect(om).toContain("Les jours Museau");
    expect(out.problems.map((x) => x.text).join("\n")).toMatch(/Remises : le thème affiche les prix de tes offres mais n'en calcule aucune.*Tu as confirmé avoir créé : remise automatique par quantité : 2 articles achetés, −10 % ; remise automatique par quantité : 3 articles achetés, −15 % \(pack « Le trio »\) ; remise automatique « achetez 3, recevez 1 » : le produit « laisse-museau » offert à 100 %/);
  });

  it("sans « remisesConfirmees », lots et packs ne partent pas avec un prix remisé, et la note dit quoi créer", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const out = customThemeSpec(theme(), input(await offres()));
    expect(out.spec.customSections["es-custom-lots"]).toBeUndefined();
    expect(out.spec.customSections["es-custom-packs"]).toBeUndefined();
    const notes = out.problems.map((x) => x.text).join("\n");
    expect(notes).toMatch(/Offres par quantité : section non envoyée : le thème ne calcule aucune remise\. Crée d'abord dans ta boutique : remise automatique par quantité : 2 articles achetés, −10 %/);
    expect(notes).toMatch(/Les packs : section non envoyée : le thème ne calcule aucune remise\. Crée d'abord dans ta boutique : .*« achetez 3, recevez 1 »/);
    expect(notes).toContain("À créer dans ta boutique (Réductions › Réduction automatique)");
    expect(Object.values(out.spec.customSections).map((c) => c.liquid).join("\n")).not.toMatch(/times: 90|times: 85|<ul class="tn-pack-liste"/);
    // Des packs sans remise ni cadeau partent sans confirmation : aucun prix remisé n'est affiché.
    const simples = customThemeSpec(theme(), input(await offres({ quantity: null, packs: [{ quantite: 1, nom: "Un collier" }, { quantite: 2, nom: "Deux colliers" }] })));
    expect(simples.spec.customSections["es-custom-packs"].liquid).toContain("| times: 2 | times: 100 | divided_by: 100.0 | round");
    // Sans offre du tout : ni lots, ni packs, ni offre du moment ; la fiche garde son bloc d'achat.
    const rien = customThemeSpec(theme(), input(null));
    expect(Object.keys(rien.spec.customSections).sort()).toEqual(["es-custom-buy", "es-custom-f", "es-custom-h", "es-custom-sb"]);
    expect(rien.spec.customSections["es-custom-sb"].liquid).not.toMatch(/data-tn-jauge|data-tn-stock|class="tn-delai"/);
  });

  it("la fenêtre d'offre ne part qu'avec la vraie offre : inscription à la liste de la boutique, code écrit après l'inscription", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection } = await import("@/lib/theme/ops");
    const sans = customThemeSpec(theme([sec("tn-fenetre-offre", "fo")]), input(await offres({ fenetreOffre: null })));
    expect(sans.spec.customSections["es-custom-fo"]).toBeUndefined();
    expect(sans.problems.map((x) => x.text).join("\n")).toContain("fenêtre non envoyée (aucune offre donnée avec son code de réduction)");
    const avec = customThemeSpec(theme([sec("tn-fenetre-offre", "fo", "carte-en-bas")]), input(await offres()));
    const fo = avec.spec.customSections["es-custom-fo"].liquid;
    expect(validateCustomSection(fo)).toBeNull();
    expect(avec.spec.groups.footer.order).toContain("tn-fo");
    expect(fo).toMatch(/\{%- form 'customer', class: 'tn-fo-form' -%\}\{%- if form\.posted_successfully\? -%\}<div class="tn-fo-code" data-tn-fo-code data-tn-recu><span>Ton code<\/span><b>MUSEAU10<\/b><\/div>\{%- else -%\}<input type="hidden" name="contact\[tags\]" value="newsletter">/);
    expect(fo).toContain('name="contact[email]" required');
    expect(fo.split("MUSEAU10").length).toBe(2); // le code n'est écrit qu'une fois, dans la branche « inscription reçue »
    expect(fo).toContain(`<script src="{{ 'tenue-achat.js' | asset_url }}" defer></script>`);
  });
});

// ── La fiche « vente directe » complète, en page statique (feuilles et scripts du Studio, panier d'essai de l'aperçu) ──
const SUITE = ["tn-achat", "tn-offre-moment", "tn-packs", "tn-sous-bouton", "tn-atouts", "tn-probleme-reponse", "tn-coloris", "tn-avantages", "tn-rappel-achat", "tn-mur-avis", "tn-nous-et-autres", "tn-livraison", "tn-garantie", "tn-questions", "tn-appel-produit"];
const FACONS: Record<string, string[]> = { "tn-achat": ["vente-directe", "vente-directe"], "tn-offre-moment": ["encadre", "bandeau"], "tn-packs": ["empilees", "cote-a-cote"], "tn-sous-bouton": ["liste", "cartes"], "tn-atouts": ["coches", "coches"], "tn-probleme-reponse": ["deux-temps", "face-a-face"], "tn-avantages": ["alternes", "cartes"], "tn-mur-avis": ["mosaique", "file"], "tn-nous-et-autres": ["tableau", "lignes"], "tn-livraison": ["frise", "cartes"], "tn-garantie": ["bande", "sceau"], "tn-questions": ["cartes", "cartes"], "tn-appel-produit": ["bande-sombre", "carte"], "tn-fenetre-offre": ["plein-ecran", "carte-en-bas"], "tn-versions": ["pastilles", "lignes"], "tn-rappel-achat": ["bande", "bouton"], "tn-coloris": ["mosaique", "file"] };
/** Vrais avis inventés pour l'essai (module « vente » : TenueVitrine.avis). */
const AVIS_ESSAI: D.TenueVitrine["avis"] = { source: "Avis vérifiés", verifies: true, liste: [
  { text: "Enfin un collier qui ne lui pèle pas le cou.", name: "Camille", date: "2026-02-11", rating: 5, product: "Collier Museau" },
  { text: "Solide, et le bleu est encore plus beau en vrai. La boucle est un peu dure les premiers jours, puis elle se fait très bien à la main.", name: "Théo", date: "2026-01-20", rating: 4, product: "Collier Museau" },
  { text: "Lavé dix fois, il n'a pas bougé.", name: "Marc", date: "2026-03-02", rating: 5 },
  { text: "La laisse est trop courte pour moi.", name: "Inès", date: "2026-03-05", rating: 2, product: "La laisse Museau" },
] };
const ALLURES = [
  { key: "vive", palette: VIF.palette, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal" }, titre: "Bricolage", arrondi: "14px" },
  { key: "calme", palette: { primary: "#2F5D50", secondary: "#E4E9DD", accent: "#2F5D50", light: "#FAF7F0", dark: "#1C2420" }, tenue: { titres: "fins", bouton: "pilule", cadre: "niche", fond: "uni", petits: "normal" }, titre: "Instrument", arrondi: "16px" },
];
async function ficheStatique(o: { vente?: D.TenueAchatVrai; allure?: number; sections?: string[]; fenetre?: boolean; tiroir?: boolean; facons?: Record<string, string> } = {}): Promise<string> {
  const { tenueCss, markMissing } = await import("@/lib/syna-agent/custom-theme/tenue");
  const { TENUE_FILES } = await import("@/lib/syna-agent/custom-theme/tenue");
  const dir = path.join(process.cwd(), "public", "sections"), a = ALLURES[o.allure ?? 0], v = o.vente ?? venteEssai();
  const img = (f: string) => `file://${path.join(ASSETS, "museau-club", f)}`;
  const seq = (h: string, list: string[]) => { let i = 0; return h.replace(/\[À compléter[^\]]*\]/g, (m) => list[i++] ?? m); };
  const pics = (h: string, list: string[]) => { let n = 0; return h.replace(/photos\/[\w.-]+/g, () => img(list[n++ % list.length])); };
  const cadeau = { id: "v-laisse", titre: "La laisse Museau", image: img("laisse-01.webp") };
  const vrai: D.TenueAchatVrai = { ...v, packs: v.packs.map((p) => (p.cadeau ? { ...p, cadeau } : p)), promo: v.promo ? { ...v.promo, cadeau } : null };
  const options: D.TenueOption[] = [{ name: "Couleur", values: [{ label: "Bleu", teinte: "#2f5aa8" }, { label: "Rouge", teinte: "#b3262e" }, { label: "Jaune", teinte: "#f2c94c" }] }, { name: "Taille", values: TAILLES.map((label) => ({ label })) }];
  const fill = (id: string): string => {
    let h = piece(id);
    if (id === "tn-achat") h = withTenueBuyBlock(h.replace("<small>Le thé</small>", "<small>Le collier</small>").replace(">Thé vert jasmin</h1>", ">Collier Museau</h1>").replace(/<p>[\s\S]*?<\/p>/, "<p>Doux contre le cou, solide à la boucle. Il se règle en deux gestes et ne bouge plus.</p>").replace(/<div class="tn-option">[\s\S]*?<\/div>/, "").replace(/>Ajouter au panier<\/a>/g, ">Je le prends</a>"), { images: [1, 2, 3, 4, 5].map((n) => img(`collier-0${n}.webp`)), price: "30 €", shipping: v.livraison ?? undefined, returns: v.retours ?? undefined } as any);
    if (id === "tn-versions") h = D.withTenueVersions(h, options);
    if (id === "tn-packs") h = h.replace("Choisis ton pack.", "Un, deux ou trois&nbsp;?").replace(">Ajouter au panier<", ">Ajouter mon pack au panier<");
    if (id === "tn-sous-bouton") h = seq(h, ["S", "28 à 34 cm", "1,5 cm", "Petits chiens", "M", "34 à 42 cm", "2 cm", "Chiens moyens", "L", "42 à 52 cm", "2,5 cm", "Grands chiens", "Ton collier, sa médaille à graver et un sachet en coton pour le ranger.", "", "", "Carte ou PayPal, sur une page protégée.", "", "Une vraie personne te répond sous un jour ouvré.", "Quelle taille pour mon chien ?", "Mesure son tour de cou et ajoute deux doigts : le guide des tailles donne la taille en face.", "Est-ce qu'il passe en machine ?", "Oui, à 30 degrés, dans un filet. Il sèche en une nuit.", "Et s'il ne lui va pas ?", "Tu as 30 jours pour nous le renvoyer."]).replace("Tour de poitrine", "Tour de cou").replace("Tour de taille", "Largeur").replace("Tour de hanches", "Pour qui");
    if (id === "tn-atouts") h = h.replace("Tout est bio", "Doublé de maille douce").replace("Du thé, des fleurs, rien d'autre.", "Rien ne frotte, rien ne gratte.").replace("Assemblé à la main", "Boucle testée à la traction").replace("Par petites quantités, à la commande.", "Elle tient quand il tire.").replace("En vrac", "Lavable en machine").replace("Dans un sachet qui se referme.", "Il sèche en une nuit.");
    if (id === "tn-probleme-reponse") h = seq(h, ["Un collier qui frotte et qui laisse une marque.", "Un intérieur doublé de maille douce.", "Une boucle qui lâche quand il tire.", "Une boucle testée à la traction, que tu fermes d'un clic.", "Un réglage qui glisse à chaque balade.", "Une sangle qui garde son réglage."]);
    if (id === "tn-avantages") h = pics(seq(h, ["Doux contre le cou", "Une maille aérée, sans couture qui gratte.", "Fermé d'un clic", "Une boucle large, facile à saisir avec des gants.", "Lavé, séché, reparti", "Il passe en machine et sèche en une nuit."]), ["ambiance-02.webp", "collier-03.webp", "ambiance-05.webp"]);
    if (id === "tn-mur-avis") h = pics(seq(h, ["Enfin un collier qui ne lui pèle pas le cou. On a pris la laisse dans la foulée.", "Camille, février", "Solide, et le bleu est encore plus beau en vrai.", "Théo, janvier", "La boucle se ferme d'une main, c'est tout ce que je demandais.", "Sonia, mars", "Lavé dix fois, il n'a pas bougé.", "Marc, mars", "Avis reçus par e-mail après l'achat, publiés tels quels."]), ["ambiance-07.webp", "ambiance-09.webp"]);
    if (id === "tn-nous-et-autres") h = D.withTenueDirect(seq(h, ["un collier d'entrée de gamme", "Doublure en maille douce", "Boucle testée à la traction", "Lavable en machine", "Réparé par la marque", "Fiches de la marque et essais de traction du fabricant."]), {} as any);
    if (id === "tn-livraison") h = seq(h, ["", "Chaque commande part de notre atelier sous deux jours ouvrés.", "Colissimo suivi : tu reçois le lien de suivi par e-mail.", "Deux à quatre jours après le départ, dans ta boîte aux lettres."]);
    if (id === "tn-questions") h = h.replace("Avant de choisir.", "Avant de commander.").replace("Combien de tasses dans un sachet ?", "Il existe pour les chiots ?").replace("[À compléter : nombre de tasses]", "Oui : la taille S se règle dès 28 cm de tour de cou.").replace("Et s'il ne me plaît pas ?", "La médaille est comprise ?").replace("[À compléter : retours]", "Oui, à graver chez un cordonnier ou par nos soins.").replace("Comment le conserver ?", "Comment l'entretenir ?").replace("À l'abri de la lumière, dans son sachet refermé.", "En machine à 30 degrés, dans un filet.");
    if (id === "tn-appel-produit") h = pics(h, ["collier-02.webp"]).replace("Prêt à l'essayer&nbsp;?", "Prêt pour la prochaine balade&nbsp;?").replace(/(<b class="tn-nom-a">)[\s\S]*?(<\/b>)/, "$1Collier Museau$2").replace(/(<div class="tn-prix">)[\s\S]*?(<\/div>)/, "$130 €$2").replace(/<ul class="tn-reperes">[\s\S]*?<\/ul>/, `<ul class="tn-reperes"><li>Livraison : ${v.livraison}</li><li>Retours : ${v.retours}</li></ul>`).replace(">Ajouter au panier<", ">Je le prends<");
    if (id === "tn-fenetre-offre") h = pics(h, ["ambiance-03.webp"]);
    if (id === "tn-coloris") h = D.withTenueColoris(h, [{ nom: "Bleu", teinte: "#2f5aa8", image: img("collier-01.webp") }, { nom: "Rouge", teinte: "#b3262e", image: img("ambiance-02.webp") }, { nom: "Jaune", teinte: "#f2c94c", image: img("ambiance-05.webp") }]);
    if (id === "tn-rappel-achat") h = h.replace(/(<b class="tn-ra-nom">)[\s\S]*?(<\/b>)/, "$1Collier Museau$2").replace(/(<span class="tn-ra-prix">)[\s\S]*?(<\/span>)/, "$130 €$2").replace(">Choisir le mien<", ">Choisir mon collier<");
    // La construction s'écrit sur la racine avant les données, comme dans l'aperçu du Studio.
    h = h.replace(/^<section\b/, `<section data-essai="${id}" data-tn-c="${o.facons?.[id] ?? FACONS[id]?.[o.allure ?? 0] ?? ""}"`);
    h = D.withTenueAchatVrai(D.withTenueDirect(D.withTenueSizes(h, options), { shipping: v.livraison, returns: v.retours } as any), vrai);
    return h ? markMissing(pics(h, ["collier-04.webp"])) : "";
  };
  const css = TENUE_FILES.css.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n").replace(/url\(photos\//g, `url(file://${dir}/photos/`);
  const js = ["boutique-apercu.js", "tenue.js", "tenue-achat.js", "tenue-pages.js"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n;");
  const fonts = [["Bricolage", "bricolage.woff2"], ["Instrument", "instrument.woff2"], ["Inter", "inter.woff2"]].map(([n, f]) => `@font-face{font-family:"${n}";src:url("file://${path.join(process.cwd(), "public", "fonts", f)}");font-weight:100 900}`).join("");
  const attrs = Object.entries(a.tenue).map(([k, val]) => ` data-tn-${k}="${val}"`).join("");
  const ids = o.sections ?? SUITE;
  return `<!doctype html><html lang="fr" data-po-barre="1"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fonts}body{margin:0;background:${a.palette.light}}${tenueCss(a.palette as any, a.tenue as any)}${css}.ctw{--f-title:"${a.titre}",Georgia,serif;--f-ui:"Inter",Arial,sans-serif;--tn-arrondi:${a.arrondi};font-family:var(--f-ui)}</style><body><div class="ctw"${attrs}><div class="frame"><main class="tb-pg">${ids.map(fill).join("\n")}</main>${o.fenetre === false ? "" : fill("tn-fenetre-offre")}${o.tiroir ? `<div class="tn-fixes">${markMissing(piece("tn-panier-cote"))}</div>` : ""}</div></div><script>${js}</script></body></html>`;
}

describe.runIf(!!process.env.CHROMIUM || !!process.env.ACHAT_OUT)("achat, suite : ça marche pour de vrai dans l'aperçu (Playwright, panier d'essai)", () => {
  const tmp = path.join(process.env.ACHAT_OUT ?? path.join(process.cwd(), "node_modules", ".cache", "achat-suite"));
  const ouvre = async (html: string, width = 390, name = "page") => {
    const { chromium } = await import("playwright");
    const { chromiumPath } = await import("@/lib/theme/snapshot");
    fs.mkdirSync(tmp, { recursive: true });
    const file = path.join(tmp, `${name}.html`);
    fs.writeFileSync(file, html);
    const browser = await chromium.launch({ executablePath: chromiumPath() ?? undefined });
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.goto(`file://${file}`);
    return { browser, page };
  };
  const panier = (page: any) => page.evaluate(() => (window as any).tnBoutique.panier());
  const choisirTrio = async (page: any) => {
    await page.locator('[data-tn-pack][data-tn-quantite="3"] label').click();
    const lignes = page.locator('[data-tn-pack][data-tn-quantite="3"] [data-tn-article]');
    expect(await lignes.count()).toBe(3);
    for (const [i, [c, t]] of ([["Bleu", "S"], ["Rouge", "M"], ["Jaune", "S"]] as const).entries()) { await lignes.nth(i).locator("select").nth(0).selectOption(c); await lignes.nth(i).locator("select").nth(1).selectOption(t); }
    return lignes;
  };
  const QUATRE = [{ id: "v-bleu-s", quantite: 1, cadeau: false }, { id: "v-rouge-m", quantite: 1, cadeau: false }, { id: "v-jaune-s", quantite: 1, cadeau: false }, { id: "v-laisse", quantite: 1, cadeau: true }];

  it("le pack de trois en trois versions, puis le bouton : quatre lignes au panier (trois articles et le cadeau) ; la barre d'achat ajoute la même chose", async () => {
    const { browser, page } = await ouvre(await ficheStatique(), 390, "pack");
    try {
      // Le pack désigné par le client est choisi d'avance et déplie ses lignes ; une version épuisée ne se choisit pas.
      const lignes = await choisirTrio(page);
      await lignes.nth(2).locator("select").nth(0).selectOption("Jaune");
      expect(await lignes.nth(2).locator('select >> nth=1').locator('option[value="L"]').isDisabled()).toBe(true);
      await page.locator("[data-tn-packs] [data-tn-acheter]").click();
      const p1 = await panier(page);
      expect(p1.lignes.map((l: any) => ({ id: l.id, quantite: l.quantite, cadeau: l.cadeau }))).toEqual(QUATRE);
      expect(p1.nombre).toBe(4);
      expect(p1.total).toBe(7650); // le prix du pack ; le cadeau ne compte pas
      // La barre d'achat : même achat que le bouton (le pack choisi).
      await page.locator(".tn-achat > .tn-barre [data-pogo]").evaluate((el: HTMLElement) => el.click());
      const p2 = await panier(page);
      expect(p2.lignes.map((l: any) => ({ id: l.id, quantite: l.quantite, cadeau: l.cadeau }))).toEqual(QUATRE.map((l) => ({ ...l, quantite: 2 })));
      // Le bouton du bloc d'achat aussi.
      await page.locator(".tn-achat > a.tn-bt[data-pogo]").first().evaluate((el: HTMLElement) => el.click());
      expect((await panier(page)).nombre).toBe(12);
    } finally { await browser.close(); }
  }, 120_000);

  it("offre par quantité : le bouton ajoute la quantité choisie de la version choisie ; sans taille choisie, il le dit et n'ajoute rien", async () => {
    const lots = D.withTenueLots(piece("tn-lots"), { unit: "collier", cents: 3000, tiers: [{ qty: 2, pct: 10 }, { qty: 3, pct: 15 }] });
    const html = (await ficheStatique({ sections: ["tn-achat", "tn-versions", "tn-sous-bouton"], fenetre: false })).replace(/(<section data-essai="tn-sous-bouton")/, `${D.withTenueAchatVrai(lots, venteEssai())}$1`);
    const { browser, page } = await ouvre(html, 390, "lots");
    try {
      const bouton = page.locator(".tn-achat > a.tn-bt[data-pogo]").first();
      await bouton.evaluate((el: HTMLElement) => el.click());
      expect((await panier(page)).nombre).toBe(0);
      expect(await page.locator("[data-tn-erreur]").first().textContent()).toBe("Choisis d'abord : taille.");
      await page.locator(".tn-versions .tn-groupe-v").nth(1).locator("label", { hasText: "M" }).click();
      await page.locator('[data-tn-lots] li[data-tn-quantite="3"] label').click();
      await bouton.evaluate((el: HTMLElement) => el.click());
      expect((await panier(page)).lignes.map((l: any) => [l.id, l.quantite])).toEqual([["v-bleu-m", 3]]);
      // Stock restant : Bleu M a 7 en stock, au-dessus du seuil de 5 : rien. Bleu S en a 4 : « Plus que 4 ».
      const stock = page.locator("[data-tn-stock]");
      expect(await stock.isHidden()).toBe(true);
      await page.locator(".tn-versions .tn-groupe-v").nth(1).locator("label", { hasText: "S" }).click();
      expect(await stock.textContent()).toBe("Plus que 4 en stock");
      expect(await stock.isVisible()).toBe(true);
      // La jauge : 4 restants sur un lot de départ de 200 pour cette version.
      expect((await page.locator("[data-tn-jauge]").textContent())!.replace(/ /g, " ")).toBe("98 % vendu2 % restant");
    } finally { await browser.close(); }
  }, 120_000);

  it("sans stock suivi, ni « plus que », ni jauge ; une plateforme qui refuse : le message se lit, rien ne part au panier", async () => {
    const { browser, page } = await ouvre(await ficheStatique({ vente: venteEssai({ stock: false }), sections: ["tn-achat", "tn-versions", "tn-packs", "tn-sous-bouton"], fenetre: false }), 390, "sans-stock");
    try {
      await page.locator(".tn-versions .tn-groupe-v").nth(1).locator("label", { hasText: "S" }).click();
      expect(await page.locator("[data-tn-stock], [data-tn-jauge]").count()).toBe(0);
      expect(await page.locator("text=/Plus que|% vendu/").count()).toBe(0);
      await page.evaluate(() => { (window as any).tnBoutique.ajouter = () => Promise.reject(new Error("Il n'en reste que 2 en stock.")); });
      await page.locator("[data-tn-packs] [data-tn-acheter]").click();
      expect(await page.locator("[data-tn-packs] [data-tn-erreur]").textContent()).toBe("Il n'en reste que 2 en stock.");
    } finally { await browser.close(); }
  }, 120_000);

  it("offre du moment : le décompte vise la date de fin saisie ; la date passée, la pièce disparaît d'elle-même", async () => {
    const fin = Date.now() + 2 * JOUR + 5 * 3_600_000 + 90_000;
    const { browser, page } = await ouvre(await ficheStatique({ vente: venteEssai({ promo: { nom: "Les jours Museau", pct: 25, fin, cadeau: null } }), sections: ["tn-achat", "tn-offre-moment"], fenetre: false }), 390, "offre");
    try {
      const om = page.locator("[data-tn-offre-moment]");
      expect(await om.getAttribute("data-tn-fin")).toBe(String(fin));
      expect((await om.locator("[data-tn-decompte]").textContent())!.slice(0, 9)).toBe("02j05h01m");
      expect(await om.locator("[data-tn-fin-texte]").textContent()).toMatch(/^Jusqu'au \d{1,2} \S+$/);
      // Le dernier jour, et ce jour-là seulement : « Aujourd'hui seulement ».
      await page.evaluate(() => document.querySelector("[data-tn-offre-moment]")!.setAttribute("data-tn-fin", String(new Date().setHours(23, 59, 59, 0))));
      await page.waitForTimeout(1200);
      expect(await om.locator("[data-tn-fin-texte]").textContent()).toBe("Aujourd'hui seulement");
      await page.evaluate(() => document.querySelector("[data-tn-offre-moment]")!.setAttribute("data-tn-fin", String(Date.now() - 1000)));
      await page.waitForTimeout(1200);
      expect(await om.isHidden()).toBe(true);
    } finally { await browser.close(); }
  }, 120_000);

  it("fenêtre d'offre : fermée à l'arrivée, une fois par visiteur, se ferme au clavier, à la croix et à côté ; le code après l'inscription", async () => {
    const { browser, page } = await ouvre(await ficheStatique({ sections: ["tn-achat"] }), 390, "fenetre");
    try {
      const f = page.locator("[data-tn-fenetre-offre]");
      expect(await f.isHidden()).toBe(true);
      await page.waitForTimeout(1500);
      expect(await f.isHidden(), "jamais à l'arrivée").toBe(true);
      await f.evaluate((el: any) => el.tnOuvre());
      expect(await f.isVisible()).toBe(true);
      expect(await f.locator("[data-tn-fo-code]").isHidden(), "le code attend l'inscription").toBe(true);
      await page.keyboard.press("Escape");
      expect(await f.isHidden()).toBe(true);
      await f.evaluate((el: any) => el.tnOuvre());
      expect(await f.isHidden(), "une seule fois par visiteur").toBe(true);
      // Un autre visiteur : il s'inscrit, le code se montre ; la croix ferme.
      await page.evaluate(() => localStorage.clear());
      await f.evaluate((el: any) => el.tnOuvre());
      await f.locator("input[type=email]").fill("camille@example.com");
      await f.locator("form .tn-bt").click();
      expect(await f.locator("[data-tn-fo-code] b").textContent()).toBe("MUSEAU10");
      expect(await f.locator("[data-tn-fo-code]").isVisible()).toBe(true);
      await f.locator(".tn-fo-fermer").click();
      expect(await f.isHidden()).toBe(true);
    } finally { await browser.close(); }
  }, 120_000);

  it("le panier de côté s'ouvre après un ajout, rempli avec le panier reçu ; un refus de la boutique ne l'ouvre pas", async () => {
    const { browser, page } = await ouvre(await ficheStatique({ tiroir: true, fenetre: false }), 390, "tiroir");
    try {
      const tiroir = page.locator(".tn-panier-cote");
      await page.evaluate(() => { (window as any).allers = 0; (window as any).tnBoutique.allerAuPanier = () => { (window as any).allers++; }; });
      expect(await tiroir.getAttribute("data-tn-ouvert")).toBeNull();
      // Un refus (stock) : le message se lit, le tiroir reste fermé.
      await page.evaluate(() => { const b = (window as any).tnBoutique; b.vrai = b.ajouter; b.ajouter = () => Promise.reject(new Error("Il n'en reste que 2 en stock.")); });
      await page.locator("[data-tn-packs] [data-tn-acheter]").click();
      expect(await page.locator("[data-tn-packs] [data-tn-erreur]").textContent()).toBe("Il n'en reste que 2 en stock.");
      expect(await tiroir.getAttribute("data-tn-ouvert")).toBeNull();
      await page.evaluate(() => { const b = (window as any).tnBoutique; b.ajouter = b.vrai; });
      await choisirTrio(page);
      await page.locator("[data-tn-packs] [data-tn-acheter]").click();
      await page.waitForSelector(".tn-panier-cote[data-tn-ouvert]");
      const lignes = await tiroir.locator(".tn-lignes .tn-ligne").evaluateAll((els) => els.map((l) => [l.getAttribute("data-tn-id"), l.querySelector(".tn-quoi b")!.textContent, l.querySelector(".tn-qte span")!.textContent, l.querySelector(".tn-prix-l")!.textContent!.replace(/\u00a0/g, " ")]));
      expect(lignes).toEqual([["v-bleu-s", "Collier Museau, Bleu · S", "1", "25,50 €"], ["v-rouge-m", "Collier Museau, Rouge · M", "1", "25,50 €"], ["v-jaune-s", "Collier Museau, Jaune · S", "1", "25,50 €"], ["v-laisse", "La laisse Museau", "1", "Offert"]]);
      expect((await tiroir.locator(".tn-prix-t").textContent())!.replace(/\u00a0/g, " ")).toBe("76,50 €");
      expect(await tiroir.getAttribute("data-tn-vide")).toBeNull();
      // Aucune ligne d'exemple ne reste ; la photo du cadeau est celle du pack ; le script d'achat n'a pas changé de page.
      expect(await tiroir.locator(".tn-lignes").textContent()).not.toMatch(/Nom du premier|À compléter/);
      expect(await tiroir.locator('.tn-ligne[data-tn-id="v-laisse"] .tn-ph').evaluate((el: HTMLElement) => el.style.backgroundImage)).toContain("laisse-01.webp");
      expect(await page.evaluate(() => (window as any).allers)).toBe(0);
      // Fermé à la croix, puis un deuxième ajout par le bouton du bloc : il se rouvre avec les quantités à jour.
      await tiroir.locator(".tn-x").click();
      expect(await tiroir.getAttribute("data-tn-ouvert")).toBeNull();
      await page.locator(".tn-achat > a.tn-bt[data-pogo]").first().evaluate((el: HTMLElement) => el.click());
      await page.waitForSelector(".tn-panier-cote[data-tn-ouvert]");
      expect(await tiroir.locator(".tn-lignes .tn-qte span").allTextContents()).toEqual(["2", "2", "2", "2"]);
      if (process.env.ACHAT_OUT) { await page.waitForTimeout(400); fs.writeFileSync(path.join(process.env.ACHAT_OUT, "tiroir__vive.png"), await page.screenshot({ type: "png" })); }
    } finally { await browser.close(); }
  }, 120_000);

  it("rappel vers l'achat et coloris en scène : le bouton ramène au bloc d'achat ; une couleur touchée se choisit dans le pack et se voit sur la grande photo", async () => {
    const suite = ["tn-achat", "tn-packs", "tn-sous-bouton", "tn-atouts", "tn-rappel-achat", "tn-avantages", "tn-coloris", "tn-livraison"];
    for (const width of [390, 1280]) {
      const { browser, page } = await ouvre(await ficheStatique({ sections: suite, fenetre: false }), width, "rappel");
      try {
        expect(await page.locator("section#tn-achat[data-tn-achat]").count()).toBe(1);
        const bouton = page.locator("[data-tn-rappel-achat] a[data-tn-rappel]");
        await bouton.scrollIntoViewIfNeeded();
        expect(await page.evaluate(() => scrollY)).toBeGreaterThan(600);
        await bouton.click();
        await page.waitForFunction(() => { const r = document.querySelector(".tn-achat h1")!.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, null, { timeout: 5000 });
        // Les coloris : trois couleurs avec leur photo ; « Rouge » passe dans les trois articles du pack et sur la grande photo.
        const rouge = page.locator('[data-tn-coloris] a[data-tn-couleur="Rouge"]');
        expect(await page.locator("[data-tn-coloris] a[data-tn-couleur]").count()).toBe(3);
        await rouge.scrollIntoViewIfNeeded();
        await rouge.click();
        expect(await page.locator('[data-tn-pack][data-tn-quantite="3"] [data-tn-article] select:first-of-type').evaluateAll((els) => els.map((x) => (x as HTMLSelectElement).value))).toEqual(["Rouge", "Rouge", "Rouge"]);
        expect(await page.locator(".tn-achat .tn-grande").evaluate((el: HTMLElement) => el.style.backgroundImage)).toContain("ambiance-02.webp");
        await page.waitForFunction(() => { const r = document.querySelector(".tn-achat h1")!.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, null, { timeout: 5000 });
        await page.locator("[data-tn-packs] [data-tn-acheter]").click();
        expect((await panier(page)).lignes.map((l: any) => [l.id, l.quantite])).toEqual([["v-rouge-s", 3], ["v-laisse", 1]]);
      } finally { await browser.close(); }
    }
  }, 120_000);

  it("sur ordinateur, la fiche tient en deux colonnes : la galerie reste visible pendant que la colonne d'achat défile, puis le récit reprend toute la largeur", async () => {
    for (const [n, a] of ALLURES.entries()) for (const width of [1000, 1280]) {
      const { browser, page } = await ouvre(await ficheStatique({ allure: n, fenetre: false }), width, `colonnes-${a.key}`);
      try {
        const boite = (sel: string) => page.evaluate((q) => { const r = document.querySelector(q)!.getBoundingClientRect(); return { x: Math.round(r.left), d: Math.round(r.right), y: Math.round(r.top + scrollY), h: Math.round(r.height), haut: Math.round(r.top) }; }, sel);
        const titre = await boite(".tn-achat h1"), gal = await boite(".tn-achat .tn-galerie");
        expect(gal.d, "la galerie est à gauche de la colonne d'achat").toBeLessThan(titre.x);
        // Les pièces d'achat : même bord gauche et même largeur que la colonne (l'offre en bandeau comprise), l'une sous l'autre, dans l'ordre.
        let bas = titre.y;
        for (const id of ["tn-offre-moment", "tn-packs", "tn-sous-bouton"]) {
          const b = await boite(`[data-essai="${id}"]`);
          expect(Math.abs(b.x - titre.x), `${a.key} ${width} ${id} : aligné sur la colonne d'achat`).toBeLessThanOrEqual(1);
          expect(Math.abs(b.d - titre.d), `${a.key} ${width} ${id} : largeur de la colonne`).toBeLessThanOrEqual(1);
          expect(b.y, `${id} sous la pièce d'avant`).toBeGreaterThan(bas);
          bas = b.y;
        }
        // Le récit : pleine largeur, sous la colonne.
        const recit = await boite('[data-essai="tn-atouts"]'), sb = await boite('[data-essai="tn-sous-bouton"]');
        expect(recit.x).toBe(0);
        expect(recit.d).toBe(width);
        expect(recit.y).toBeGreaterThanOrEqual(sb.y + sb.h);
        // La galerie reste à l'écran quand on descend jusqu'au dessous du bouton, puis s'en va avec le récit.
        await page.evaluate(() => scrollTo(0, document.querySelector('[data-essai="tn-sous-bouton"]')!.getBoundingClientRect().top + scrollY - 200));
        const pendant = await boite(".tn-achat .tn-grande");
        expect(pendant.haut, `${a.key} ${width} : galerie collante`).toBeGreaterThanOrEqual(0);
        expect(pendant.haut).toBeLessThanOrEqual(40);
        if (process.env.ACHAT_OUT && n === 0) fs.writeFileSync(path.join(process.env.ACHAT_OUT, `colle__${width}.png`), await page.screenshot({ type: "png" }));
        await page.evaluate(() => scrollTo(0, document.querySelector('[data-essai="tn-probleme-reponse"]')!.getBoundingClientRect().top + scrollY));
        const apres = await boite(".tn-achat .tn-grande");
        expect(apres.haut + apres.h, `${a.key} ${width} : la photo part avec la colonne d'achat`).toBeLessThan(0);
      } finally { await browser.close(); }
    }
    // Sur téléphone, rien ne change : tout l'un sous l'autre, sur toute la largeur.
    const { browser, page } = await ouvre(await ficheStatique({ fenetre: false }), 390, "colonnes-tel");
    try {
      expect(await page.evaluate(() => getComputedStyle(document.querySelector("main")!).display)).toBe("block");
      expect(await page.evaluate(() => getComputedStyle(document.querySelector(".tn-achat")!).display)).toBe("grid");
    } finally { await browser.close(); }
  }, 180_000);

  it.runIf(!!process.env.ACHAT_OUT)("captures de la fiche complète, deux allures, téléphone et ordinateur ; rien ne déborde à 320 px ; la planche du propriétaire", async () => {
    const sharp = (await import("sharp")).default;
    const out = process.env.ACHAT_OUT!;
    const shots: Record<string, Buffer> = {}, cuts: Record<string, number[]> = {};
    for (const [n, a] of ALLURES.entries()) for (const width of [320, 390, 1000, 1280]) {
      const { browser, page } = await ouvre(await ficheStatique({ allure: n, vente: venteEssai({ avis: D.avisAchat(AVIS_ESSAI, "Collier Museau") }) }), width, `fiche-${a.key}`);
      try {
        await page.waitForTimeout(500);
        const large = await page.evaluate((w) => [...document.querySelectorAll("section[data-essai] *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && getComputedStyle(el).position !== "fixed" && !el.closest(".tn-galerie,.tn-vignettes,.tn-barre,.tn-pack-liste,.tn-mur-avis,.tn-avantages,.tn-col-liste") && r.right > w + 1.5; }).map((el) => `${el.closest("section")!.getAttribute("data-essai")} ${el.tagName}.${el.className}`).slice(0, 3), width);
        expect(large, `${a.key} ${width} px : rien ne dépasse`).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${a.key} ${width}`).toBeLessThanOrEqual(width + 1);
        // Le bloc d'achat garde une seule colonne sur téléphone, note et avis compris (aucune colonne en trop).
        if (width <= 390) expect(await page.evaluate(() => Math.round(document.querySelector(".tn-achat h1")!.getBoundingClientRect().width)), `${a.key} ${width} : largeur du nom`).toBeGreaterThanOrEqual(width - 60);
        if (width === 320) continue;
        const key = `${a.key}-${width === 390 ? "tel" : width === 1000 ? "moyen" : "ordi"}`;
        // La barre d'achat est une pièce fixe : on la retire de la capture entière, elle a sa propre capture.
        await page.evaluate(() => document.querySelectorAll(".tn-barre").forEach((b) => ((b as HTMLElement).style.visibility = "hidden")));
        shots[key] = await page.screenshot({ type: "png", fullPage: true });
        cuts[key] = await page.evaluate(() => [...document.querySelectorAll("section[data-essai]")].map((s) => Math.round(s.getBoundingClientRect().top + scrollY)));
        fs.writeFileSync(path.join(out, `fiche__${key}.jpg`), await sharp(shots[key]).jpeg({ quality: 84 }).toBuffer());
        if (width >= 1000) {
          // L'écran tel qu'on le voit : en haut de la fiche, puis en descendant (la photo reste pendant que la colonne d'achat défile).
          await page.evaluate(() => scrollTo(0, 0));
          shots[`${key}-haut`] = await page.screenshot({ type: "png" });
          await page.evaluate(() => scrollTo(0, document.querySelector('[data-essai="tn-packs"]')!.getBoundingClientRect().top + scrollY - 110));
          await page.waitForTimeout(200);
          shots[`${key}-colle`] = await page.screenshot({ type: "png" });
          for (const k of ["haut", "colle"]) fs.writeFileSync(path.join(out, `ecran__${key}-${k}.jpg`), await sharp(shots[`${key}-${k}`]).jpeg({ quality: 84 }).toBuffer());
          await page.evaluate(() => scrollTo(0, 0));
        }
        if (width === 390) {
          await page.evaluate(() => document.querySelectorAll(".tn-barre").forEach((b) => ((b as HTMLElement).style.visibility = "")));
          await page.evaluate(() => { const b = document.querySelector(".tn-achat > .tn-bt")!; scrollTo(0, b.getBoundingClientRect().top + scrollY - 300); });
          await page.waitForTimeout(300);
          await page.evaluate(() => scrollTo(0, document.querySelector('[data-essai="tn-atouts"]')!.getBoundingClientRect().top + scrollY - 200));
          await page.waitForTimeout(800);
          shots[`${a.key}-barre`] = await page.screenshot({ type: "png" });
          fs.writeFileSync(path.join(out, `barre__${a.key}.jpg`), await sharp(shots[`${a.key}-barre`]).jpeg({ quality: 84 }).toBuffer());
          await page.evaluate(() => { scrollTo(0, 0); (document.querySelector("[data-tn-fenetre-offre]") as any).tnOuvre(); });
          await page.waitForTimeout(300);
          shots[`${a.key}-fenetre`] = await page.screenshot({ type: "png" });
          fs.writeFileSync(path.join(out, `fenetre__${a.key}.jpg`), await sharp(shots[`${a.key}-fenetre`]).jpeg({ quality: 84 }).toBuffer());
        }
      } finally { await browser.close(); }
    }
    // La planche : la fiche sur téléphone en colonnes, la fenêtre d'offre et la barre d'achat à part, puis l'ordinateur.
    const W = 2400, M = 40, G = 24, fond = "#F3EFE8", encre = "#1D1A3A";
    const colonnes = async (key: string, n: number, largeur: number, from = 0) => {
      const meta = await sharp(shots[key]).metadata(), H = meta.height!, w = meta.width!, tops = cuts[key];
      const bornes = [from];
      for (let i = 1; i < n; i++) { const ideal = from + ((H - from) * i) / n; bornes.push(tops.reduce((b, t) => (Math.abs(t - ideal) < Math.abs(b - ideal) ? t : b), tops[0])); }
      bornes.push(H);
      const parts: Buffer[] = [];
      for (let i = 0; i < n; i++) if (bornes[i + 1] > bornes[i]) parts.push(await sharp(shots[key]).extract({ left: 0, top: bornes[i], width: w, height: bornes[i + 1] - bornes[i] }).resize({ width: largeur }).png().toBuffer());
      return parts;
    };
    const texte = (t: string, size: number, w: number, bold = true) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.round(size * 1.5)}"><text x="0" y="${size}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${encre}">${t.replace(/&/g, "&amp;")}</text></svg>`);
    const layers: { input: Buffer; left: number; top: number }[] = [];
    let y = M;
    layers.push({ input: texte("La fiche produit « vente directe », complète — client et prix inventés pour l'essai", 40, W - 2 * M), left: M, top: y }); y += 66;
    layers.push({ input: texte("Tout est branché sur du vrai : promotion datée, stock suivi, prix de comparaison, packs et cadeau du client ; note et avis seulement avec de vrais avis ; coloris lus au catalogue.", 24, W - 2 * M, false), left: M, top: y }); y += 60;
    layers.push({ input: texte("Sur téléphone, de haut en bas (se lit colonne après colonne)", 28, 1700), left: M, top: y });
    layers.push({ input: texte("La fenêtre d'offre et la barre d'achat", 28, 600), left: M + 4 * (390 + G) + 20, top: y }); y += 50;
    const tel = await colonnes("vive-tel", 4, 390);
    let bas = y;
    for (const [i, p] of tel.entries()) { layers.push({ input: p, left: M + i * (390 + G), top: y }); bas = Math.max(bas, y + (await sharp(p).metadata()).height!); }
    const xd = M + 4 * (390 + G) + 20, wd = 330;
    let yd = y;
    for (const [k, label] of [["vive-fenetre", "La fenêtre d'offre, ouverte (jamais à l'arrivée)"], ["calme-fenetre", "Son autre façon : une carte en bas de l'écran"], ["vive-barre", "La barre d'achat reste visible quand on descend"]] as const) {
      const im = await sharp(shots[k]).resize({ width: wd }).png().toBuffer();
      layers.push({ input: texte(label, 17, 700), left: xd, top: yd }); yd += 30;
      layers.push({ input: im, left: xd, top: yd }); yd += (await sharp(im).metadata()).height! + 26;
    }
    const tiroir = path.join(out, "tiroir__vive.png");
    if (fs.existsSync(tiroir)) { const t = await sharp(tiroir).resize({ width: wd }).png().toBuffer(); layers.push({ input: texte("Après un ajout, le panier de côté s'ouvre", 17, 700), left: xd, top: yd }); yd += 30; layers.push({ input: t, left: xd, top: yd }); yd += (await sharp(t).metadata()).height! + 26; }
    const ye = y;
    y = Math.max(bas, yd, ye) + 50;
    // L'ordinateur : deux écrans tels qu'on les voit (la photo reste pendant que la colonne d'achat défile), puis le récit.
    const demi = Math.floor((W - 2 * M - G) / 2);
    layers.push({ input: texte("Sur ordinateur : en haut de la fiche", 28, demi), left: M, top: y });
    layers.push({ input: texte("En descendant : la photo reste, la colonne d'achat défile", 28, demi), left: M + demi + G, top: y }); y += 50;
    let hEcran = 0;
    for (const [i, k] of ["vive-ordi-haut", "vive-ordi-colle"].entries()) { const im = await sharp(shots[k]).resize({ width: demi }).png().toBuffer(); layers.push({ input: im, left: M + i * (demi + G), top: y }); hEcran = Math.max(hEcran, (await sharp(im).metadata()).height!); }
    y += hEcran + 50;
    layers.push({ input: texte("Sur ordinateur, la suite : le récit en pleine largeur (se lit colonne après colonne)", 28, 1700), left: M, top: y }); y += 50;
    const recit = cuts["vive-ordi"][SUITE.indexOf("tn-atouts")];
    const ordi = await colonnes("vive-ordi", 3, Math.floor((W - 2 * M - 2 * G) / 3), recit);
    let bas2 = y;
    for (const [i, p] of ordi.entries()) { layers.push({ input: p, left: M + i * (Math.floor((W - 2 * M - 2 * G) / 3) + G), top: y }); bas2 = Math.max(bas2, y + (await sharp(p).metadata()).height!); }
    const board = await sharp({ create: { width: W, height: bas2 + M, channels: 3, background: fond } }).composite(layers).jpeg({ quality: 82 }).toBuffer();
    fs.writeFileSync(path.join(out, "fiche-complete.jpg"), board);
  }, 600_000);
});

// ══ Essai réel du 17 novembre 2026 : deux options écrites dans le bloc d'achat cassaient la fiche sur téléphone ══
// Deux « .tn-option » recevaient la même ligne de grille : une deuxième colonne naissait, la première tombait à 0 px
// et le titre se découpait lettre par lettre. Chaque option a maintenant sa ligne, dans les six façons.
describe.runIf(!!process.env.CHROMIUM || !!process.env.ACHAT_OUT)("bloc d'achat : 0, 1, 2 ou 3 options, dans les six façons, à 320, 390 et 1280 px", () => {
  const OPTIONS = ["Matière : une valeur parmi trois, écrite en toutes lettres sur une ligne assez longue", "Ta date (facultatif). Dis-moi le jour à marquer : elle ira sur l'étiquette, à l'intérieur.", "Emballage cadeau : oui ou non"];
  it("aucune colonne à 0 px, le titre garde plus de 60 % de la colonne d'achat, les options se suivent sans se couvrir", async () => {
    const { chromium } = await import("playwright");
    const { chromiumPath } = await import("@/lib/theme/snapshot");
    const dir = path.join(process.cwd(), "public", "sections");
    const css = ["tenue.css", "tenue-produit.css", "tenue-achat.css"].map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    const bloc = (style: string, n: number) => withTenueBuyBlock(tenueSection("tn-achat")!.html.replace(/photos\//g, `file://${dir}/photos/`).replace(/<div class="tn-option">[\s\S]*?<\/div>/, OPTIONS.slice(0, n).map((o) => `<div class="tn-option"><i></i><span>${o}</span></div>`).join("")), { images: [], price: "420 €", shipping: "Livraison en France, 12 €", returns: "14 jours après réception" })
      .replace(/^<section\b/, `<section data-essai="${style} · ${n} option(s)" data-tn-c="${style}"`);
    const body = STYLES.flatMap((s) => [0, 1, 2, 3].map((n) => `<main class="tb-pg">${bloc(s, n)}</main>`)).join("\n");
    const tmp = path.join(process.env.ACHAT_OUT ?? path.join(process.cwd(), "node_modules", ".cache", "achat-suite"));
    fs.mkdirSync(tmp, { recursive: true });
    const file = path.join(tmp, "options.html");
    fs.writeFileSync(file, `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.ctw{--tn-fond:#F6F1E7;--tn-encre:#1F1B16;--tn-accent:#B4532A;--tn-doux:#E9D8B8;--tn-texte:#2c2620;--tn-sourd:#6d655c;--tn-bouton:#1F1B16;--tn-sur-bouton:#fbf8f2;--f-ui:Arial,sans-serif;--f-title:'Arial Black',Impact,sans-serif;--tn-k:1}${css}</style><body><div class="ctw" data-tn-titres="gras" data-tn-bouton="droit" data-tn-cadre="droit" data-tn-fond="uni" data-tn-petits="normal"><div class="frame">${body}</div></div></body></html>`);
    const browser = await chromium.launch({ executablePath: chromiumPath() ?? undefined });
    try {
      const bad: string[] = [];
      for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        await page.goto(`file://${file}`);
        bad.push(...await page.evaluate((w) => [...document.querySelectorAll("section[data-essai]")].flatMap((sec) => {
          const nom = `${w} px · ${sec.getAttribute("data-essai")}`, cs = getComputedStyle(sec), out: string[] = [];
          const box = (el: Element) => el.getBoundingClientRect();
          if (cs.display === "grid") { const cols = cs.gridTemplateColumns.split(" ").map(parseFloat); if (cols.some((c) => !(c > 0.5))) out.push(`${nom} : une colonne à 0 px (${cs.gridTemplateColumns})`); if (w < 760 && cols.length > 2) out.push(`${nom} : ${cols.length} colonnes sur téléphone`); }
          const h1 = box(sec.querySelector("h1")!), bt = box(sec.querySelector(":scope > .tn-bt")!);
          if (h1.width < 0.6 * bt.width) out.push(`${nom} : le titre fait ${Math.round(h1.width)} px pour une colonne de ${Math.round(bt.width)} px`);
          if (bt.width < 0.4 * Math.min(w, 600)) out.push(`${nom} : le bouton d'achat ne fait que ${Math.round(bt.width)} px`);
          const opts = [...sec.querySelectorAll(":scope > .tn-option")].map(box);
          opts.forEach((o, i) => { if (o.width < 120) out.push(`${nom} : l'option ${i + 1} ne fait que ${Math.round(o.width)} px`); if (i && o.top < opts[i - 1].bottom - 2) out.push(`${nom} : l'option ${i + 1} couvre la précédente`); });
          if (opts.length && bt.top < opts[opts.length - 1].bottom - 2) out.push(`${nom} : le bouton couvre la dernière option`);
          if (document.documentElement.scrollWidth > w + 1) out.push(`${nom} : la page dépasse de l'écran`);
          return out;
        }), width));
        if (process.env.ACHAT_OUT) fs.writeFileSync(path.join(tmp, `options__${width}.jpg`), await page.screenshot({ type: "jpeg", quality: 70, fullPage: true }));
        await page.close();
      }
      expect([...new Set(bad)], "bloc d'achat avec plusieurs options").toEqual([]);
    } finally { await browser.close(); }
  }, 180_000);
});
