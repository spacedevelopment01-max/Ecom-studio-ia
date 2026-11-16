/**
 * Thème unique du Studio, la coque (lot 4, référence partie 15) : les huit en-têtes (dont deux grands menus, chacun avec
 * sa version téléphone) et les six pieds de page. Gratuit, sans IA, aucun appel réel.
 *
 * Toujours : les huit en-têtes et les six pieds existent avec leur clé ; chaque clé nouvelle est dessinée dans la
 * feuille de la coque, sans couleur en dur ni « !important » ; le menu calculé pose colonnes, images et produits à partir
 * des vraies données ; rien d'exemple ne part dans le thème Shopify ; un site de services n'a ni panier ni recherche.
 * Avec COQUE_OUT=<dossier> : chaque en-tête est capturé fermé et ouvert, sur ordinateur et sur téléphone, dans deux
 * allures, avec un catalogue d'essai inventé (quatre familles, dix produits) ; chaque pied de page de même.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ENTETES, PIEDS, COQUE_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-coque";
import { TENUE_SECTIONS, tenueSection, validConstruction } from "@/lib/syna-agent/custom-theme/tenue";
import * as M from "@/lib/syna-agent/custom-theme/menu";
import { customThemeSpec, tenueSheets } from "@/lib/syna-agent/custom-theme/to-shopify";
import { validateCustomSection } from "@/lib/theme/ops";

process.env.STUDIO_SYNA_AGENT = "1";

const SHEET = fs.readFileSync(path.join(process.cwd(), "public", "sections", "tenue-coque.css"), "utf8");
const RULES = SHEET.replace(/\/\*[\s\S]*?\*\//g, "");

describe("la coque : huit en-têtes et six pieds de page, une clé chacun", () => {
  it("les huit en-têtes décidés existent, dans l'ordre, chacun avec sa pièce, sa clé et un label qui dit ce qu'on voit", () => {
    expect(ENTETES.map((e) => e.cle)).toEqual(["classique", "logo-centre", "sur-photo", "annonce", "mega-colonnes", "mega-produits", "services", "plein-ecran"]);
    expect(new Set(ENTETES.map((e) => e.cle)).size).toBe(8);
    for (const e of ENTETES) {
      const s = tenueSection(e.piece)!;
      expect(s, e.piece).toBeTruthy();
      expect(s.role).toBe("en-tête");
      expect(validConstruction(e.piece, e.construction), `${e.piece} : ${e.construction}`).toBe(e.construction);
      expect(s.constructions.find((c) => c.key === e.construction)!.label).toBe(e.label);
      expect(e.label.length).toBeGreaterThan(60);
      // chaque en-tête dit sa version téléphone, sauf ceux dont la forme est la même partout
      if (!["sur-photo", "annonce", "plein-ecran"].includes(e.cle)) expect(e.label, e.cle).toMatch(/sur téléphone/);
    }
    // les deux grands menus
    expect(ENTETES.filter((e) => /grand menu/i.test(e.label)).map((e) => e.cle)).toEqual(["mega-colonnes", "mega-produits"]);
    // l'en-tête du socle garde ses trois façons, telles quelles
    expect(tenueSection("tn-entete")!.constructions.map((c) => c.key)).toEqual(["centre", "gauche", "sangle"]);
  });

  it("les six pieds de page décidés existent : deux d'avant gardés tels quels, une façon de plus du pied complet, trois pièces nouvelles", () => {
    expect(PIEDS.map((p) => p.cle)).toEqual(["colonnes", "centre-minimal", "lettre", "services", "grand-nom", "reassurance"]);
    for (const p of PIEDS) {
      const s = tenueSection(p.piece)!;
      expect(s, p.piece).toBeTruthy();
      expect(s.role).toBe("pied de page");
      expect(validConstruction(p.piece, p.construction), `${p.piece} : ${p.construction}`).toBe(p.construction);
    }
    // le pied complet garde ses trois façons, dans l'ordre (la première reste son rendu d'origine) ; une quatrième s'ajoute
    expect(tenueSection("tn-pied-complet")!.constructions.map((c) => c.key)).toEqual(["colonnes", "grand-nom", "centre", "centre-minimal"]);
    expect(RULES).toContain('.ctw .tn-pied-complet[data-tn-c="centre-minimal"]{');
    for (const key of ["colonnes", "grand-nom", "centre"]) expect(RULES.includes(`[data-tn-c="${key}"]`), `la coque ne redessine pas « ${key} »`).toBe(false);
    expect(tenueSection("tn-pied")!.constructions.map((c) => c.key)).toEqual(["ligne", "liens-en-grand"]);
    expect(COQUE_SECTIONS.map((s) => s.id)).toEqual(["tn-entete-liens", "tn-entete-annonce", "tn-entete-services", "tn-pied-lettre", "tn-pied-services", "tn-pied-reassurance"]);
    for (const s of COQUE_SECTIONS) expect(TENUE_SECTIONS.some((x) => x.id === s.id), s.id).toBe(true);
    // réservées au bon genre de site
    expect(tenueSection("tn-entete-services")!.pour).toBe("services");
    expect(tenueSection("tn-pied-services")!.pour).toBe("services");
    expect(tenueSection("tn-pied-reassurance")!.pour).toBe("produits");
  });

  it("chaque clé nouvelle est dessinée dans la feuille de la coque", () => {
    const has = (sel: string) => RULES.includes(sel);
    // la première construction de l'en-tête à menu visible est son rendu de base : aucune règle à elle
    expect(has('[data-tn-c="classique"]')).toBe(false);
    for (const key of ["logo-centre", "sur-photo", "mega-colonnes", "mega-produits", "plein-ecran"].filter((k) => !k.startsWith("mega"))) expect(has(`.tn-ent[data-tn-c="${key}"]`), key).toBe(true);
    // les deux grands menus sont dessinés par la forme du menu calculé (colonnes illustrées, vitrine de produits)
    for (const cls of [".tn-e-sous[data-tn-m]", ".tn-e-cols", ".tn-e-col", ".tn-e-h", ".tn-e-vitrine", ".tn-e-onglets", ".tn-e-rayon", ".tn-e-carte", ".tn-e-voir"]) expect(has(cls), cls).toBe(true);
    for (const root of [".ctw .tn-entete-liens", ".ctw .tn-entete-annonce .tn-e-msg", ".ctw .tn-entete-services .tn-e-tel", ".ctw .tn-pied-lettre .tn-form", ".ctw .tn-pied-services .tn-p-tel", ".ctw .tn-pied-services ul[data-tn-zone]", ".ctw .tn-pied-reassurance .tn-p-gar"]) expect(has(root), root).toBe(true);
    // version téléphone et version ordinateur
    expect(RULES).toMatch(/@media \(max-width:959px\)/);
    expect(RULES).toMatch(/@media \(min-width:960px\)/);
  });

  it("la feuille respecte les règles : sélecteurs en « .ctw .tn-… », aucune couleur en dur, aucun « !important »", () => {
    expect(SHEET).not.toMatch(/!important/);
    // les seuls « # » permis sont ceux des dessins de masque (le trait d'un pictogramme, jamais une couleur affichée)
    const sansMasques = RULES.replace(/url\("data:image\/svg\+xml,[^"]*"\)/g, "");
    expect(sansMasques.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g) ?? []).toEqual([]);
    const selectors = sansMasques.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").replace(/@(?:media|supports)[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
    expect(selectors.length).toBeGreaterThan(150);
    for (const list of selectors) for (const sel of list.split(/,(?![^()]*\))/)) expect(sel.trim(), sel).toMatch(/^\.ctw(?:\[data-tn-[a-z]+="[a-z]+"\])? (?::is\()?\.tn-/);
    // des zones à toucher de 44 px : le bouton du menu, les outils, les liens du panneau
    expect(RULES).toMatch(/\.tn-e-burger\{[^}]*min-width:44px;height:44px/);
    expect(RULES).toMatch(/\.tn-e-ic,\.ctw \.tn-ent \.tn-pan\{[^}]*min-width:44px;height:44px/);
    // au clavier : le contour suit la case cachée
    expect(RULES).toContain(".ctw .tn-ent label:has(>input:focus-visible){outline:");
  });

  it("le balisage : aucun script, un menu nommé, des cases à cocher pour ouvrir (elles marchent sans script)", () => {
    for (const id of ["tn-entete-liens", "tn-entete-annonce", "tn-entete-services"]) {
      const h = tenueSection(id)!.html;
      expect(h).toContain('<nav class="tn-e-nav" aria-label="Menu principal">');
      expect(h).toContain('<label class="tn-e-burger"><input type="checkbox" aria-label="Menu">');
      expect(h).not.toMatch(/<script|<details/);
      expect(h).toContain('data-go="home"><span class="tn-nom lg">Brindi</span></a>');
    }
    // les outils de boutique sont marqués : un site de services les perd
    expect(tenueSection("tn-entete-liens")!.html.match(/data-tn-boutique/g)).toHaveLength(4);
    expect(tenueSection("tn-entete-services")!.html).not.toMatch(/tn-pan|Rechercher|data-tn-boutique/);
    expect(tenueSection("tn-entete-services")!.html).toContain('<a class="tn-e-tel" href="#" onclick="return false" data-tn-tel>[À compléter : téléphone]</a>');
    // jamais une coordonnée, un message ou un moyen de paiement d'exemple
    expect(tenueSection("tn-entete-annonce")!.html).toContain('<p class="tn-e-msg">[À compléter : message du moment]</p>');
    const services = tenueSection("tn-pied-services")!.html;
    for (const slot of ["data-tn-tel>[À compléter : téléphone]<", "data-tn-adresse>[À compléter : adresse]<", 'data-tn-horaires="jours"><tbody><tr><td colspan="2">[À compléter', 'data-tn-zone="villes"><li>[À compléter', "data-tn-itineraire>Voir l'itinéraire<"]) expect(services, slot).toContain(slot);
    expect(services).not.toMatch(/photos\//); // aucun plan dessiné
    const gar = tenueSection("tn-pied-reassurance")!.html;
    expect(gar).toMatch(/<li data-tn-cle="livraison">[^]*<span>\[À compléter : livraison\]<\/span><\/li><li data-tn-cle="retours">[^]*<span>\[À compléter : retours\]<\/span><\/li>/);
    expect(gar).toContain("<span data-tn-paiements>[À compléter : moyens de paiement acceptés]</span>");
    // aucun mot d'un projet d'essai dans les pièces nouvelles
    for (const s of COQUE_SECTIONS) expect(s.html, s.id).not.toMatch(/thé|infusion|tisane|jasmin|mélange/i);
  });
});

// ---------------------------------------------------------------- le menu calculé, avec de vraies données

const MENU = [
  { label: "La boutique", to: "shop", grand: true, children: [
    { label: "Tout voir", to: "shop" },
    { label: "Hauts", to: "shop:Hauts", items: [{ label: "Chemise en lin", to: "product-chemise" }, { label: "Doudoune <courte>", to: "product" }] },
    { label: "Chaussures", to: "shop:Chaussures", items: [{ label: "Baskets blanches", to: "product" }] },
    { label: "Sacs", to: "shop:Sacs" },
  ] },
  { label: "Notre histoire", to: "about" },
];
const FAMILIES = [{ name: "Hauts", image: "/api/files/hauts1" }, { name: "Chaussures", image: null }, { name: "Sacs", image: "/api/files/sacs1" }];
const PRODUCTS = [
  { title: "Chemise en lin", image: "/api/files/p1", price: "89 €", go: "product-chemise", families: ["Hauts"] },
  { title: "Doudoune <courte>", image: null, price: null, go: "product", families: ["Hauts"] },
  { title: "Baskets blanches", image: "/api/files/p3", price: "120 €", go: "product", families: ["Chaussures"], soldOut: true },
  { title: "Sac demi-lune", image: "/api/files/p4", price: "145 €", go: "product", families: ["Sacs"] },
];

describe("la coque : le menu calculé pose colonnes, images et produits à partir des vraies données", () => {
  it("grand menu à colonnes : une colonne par famille, la photo d'un vrai produit, jamais une photo d'exemple", () => {
    const h = M.navHtml(MENU, "colonnes", { families: FAMILIES, products: PRODUCTS });
    expect(h).toMatch(/^<div class="tn-e-sous" data-tn-m="colonnes"><label class="tn-e-t"><input type="checkbox"><span>La boutique<\/span><\/label>/);
    // la famille qui a des liens se déplie (téléphone) ; sa photo est celle du catalogue ; son lien « Tout voir » la recouvre (ordinateur)
    expect(h).toContain('<div class="tn-e-col"><label class="tn-e-h"><input type="checkbox"><i class="tn-ph" style="background-image:url(/api/files/hauts1)"></i><span>Hauts</span></label><div class="tn-e-items"><a class="tn-e-fam" href="#" onclick="return false" data-go="shop:Hauts" aria-label="Tout voir : Hauts">Tout voir</a><a href="#" onclick="return false" data-go="product-chemise">Chemise en lin</a>');
    // une famille sans photo n'a pas d'image
    expect(h).toContain('<label class="tn-e-h"><input type="checkbox"><span>Chaussures</span></label>');
    // une famille sans liens est un lien illustré
    expect(h).toContain('<a class="tn-e-col tn-e-seul" href="#" onclick="return false" data-go="shop:Sacs"><i class="tn-ph" style="background-image:url(/api/files/sacs1)"></i><span>Sacs</span></a>');
    expect(h).toContain('<div class="tn-e-plus"><a href="#" onclick="return false" data-go="shop">Tout voir</a></div>');
    expect(h).toContain('<a href="#" onclick="return false" data-go="about">Notre histoire</a>');
    expect(h.match(/class="tn-e-col[ "]/g)).toHaveLength(3);
    expect(h).not.toMatch(/photos\//);
    // un texte du client ne devient jamais du balisage
    expect(h).toContain("Doudoune &lt;courte&gt;");
    // sans catalogue : les colonnes restent, sans aucune image
    expect(M.navHtml(MENU, "colonnes")).not.toMatch(/tn-ph/);
  });

  it("grand menu à produits : les familles en onglets, les vrais produits avec leur photo et leur vrai prix", () => {
    const h = M.navHtml(MENU, "produits", { families: FAMILIES, products: PRODUCTS });
    expect(h).toContain('<div class="tn-e-sous" data-tn-m="produits">');
    expect(h).toContain('<div class="tn-e-onglets"><label><input type="radio" name="tn-e-rayon-0" checked><span>Hauts</span></label><label><input type="radio" name="tn-e-rayon-0"><span>Chaussures</span></label><label><input type="radio" name="tn-e-rayon-0"><span>Sacs</span></label></div>');
    // la carte : la vraie photo, le vrai nom, le vrai prix, vers la fiche du produit
    expect(h).toContain('<a class="tn-e-carte" href="#" onclick="return false" data-go="product-chemise"><i class="tn-ph" style="background-image:url(/api/files/p1)"></i><b>Chemise en lin</b><span>89 €</span></a>');
    // un produit sans photo ni prix : ni image, ni prix inventé ; un produit épuisé le dit
    expect(h).toContain('<a class="tn-e-carte" href="#" onclick="return false" data-go="product"><b>Doudoune &lt;courte&gt;</b></a>');
    expect(h).toContain("<b>Baskets blanches</b><span>Épuisé</span></a>");
    expect(h.match(/class="tn-e-rayon"/g)).toHaveLength(3);
    expect(h).toContain('<a class="tn-e-voir" href="#" onclick="return false" data-go="shop:Sacs">Tout voir : Sacs</a>');
    expect(h).not.toMatch(/photos\//);
    // au plus quatre produits par famille
    const many = M.navHtml(MENU, "produits", { products: Array.from({ length: 9 }, (_x, i) => ({ title: `P${i}`, image: null, price: "10 €", go: "product", families: i < 7 ? ["Hauts"] : ["Sacs"] })) });
    expect(many.match(/class="tn-e-carte"/g)).toHaveLength(M.MENU_MAX.cards + 2);
    // sans famille dans le catalogue, pas de vitrine : le menu reste un sous-menu
    expect(M.navHtml([{ label: "Boutique", to: "shop", children: [{ label: "Tout voir", to: "shop" }, { label: "Aide", to: "aide" }] }], "produits", { products: PRODUCTS })).not.toMatch(/tn-e-vitrine/);
  });

  it("le menu se pose dans l'en-tête selon sa construction ; l'en-tête du socle reste comme avant", () => {
    const base = tenueSection("tn-entete-liens")!.html;
    const of = (c: string) => M.withMenu(base.replace("<section ", `<section data-tn-c="${c}" `), MENU, { families: FAMILIES, products: PRODUCTS });
    expect(of("mega-colonnes")).toContain('data-tn-m="colonnes"');
    expect(of("mega-produits")).toContain('data-tn-m="produits"');
    const simple = of("classique");
    expect(simple).not.toMatch(/data-tn-m=|tn-ph/);
    expect(simple).toContain('<div class="tn-e-sous" data-tn-grand><label class="tn-e-t"><input type="checkbox"><span>La boutique</span></label><div class="tn-e-in"><a class="tn-e-fam" href="#" onclick="return false" data-go="shop">Tout voir</a><div class="tn-e-groupe"><a class="tn-e-fam" href="#" onclick="return false" data-go="shop:Hauts">Hauts</a>');
    // les liens d'exemple sont partis, le reste de l'en-tête est intact
    expect(simple).not.toContain(">Aide</a>");
    expect(simple).toContain('<div class="tn-e-bas"><a href="#" onclick="return false" data-go="compte" data-tn-boutique>Mon compte</a></div></nav>');
    expect(M.withMenu(base, undefined)).toBe(base);
    // l'en-tête du socle : même rendu qu'avant
    const old = tenueSection("tn-entete")!.html;
    expect(M.withMenu(old, MENU, { families: FAMILIES })).toBe(old.replace(/(<details class="tn-menu">[\s\S]*?<nav>)[\s\S]*?(<\/nav>)/, `$1${M.menuHtml(MENU)}$2`));
    expect(M.withMenu(old, undefined)).toBe(old);
  });

  it("un site de services n'a ni panier, ni recherche, ni compte", () => {
    for (const id of ["tn-entete-liens", "tn-entete-annonce"]) {
      const h = M.withMenu(tenueSection(id)!.html, [{ label: "Prestations", to: "prestations" }], { boutique: false });
      expect(h, id).not.toMatch(/tn-pan|Panier|Rechercher|Mon compte|data-tn-boutique/);
      expect(h).toContain('<div class="tn-e-outils"></div>');
      expect(h).toContain('<div class="tn-e-liens"><a href="#" onclick="return false" data-go="prestations">Prestations</a></div><div class="tn-e-bas"></div></nav>');
    }
  });
});

// ---------------------------------------------------------------- la mise en boutique

const products = [{ handle: "chemise-en-lin", title: "Chemise en lin", categories: ["Hauts"] }, { handle: "baskets-blanches", title: "Baskets blanches", categories: ["Chaussures"] }, { handle: "sac-demi-lune", title: "Sac demi-lune", categories: ["Sacs"] }];
const input = (over: Record<string, unknown> = {}) => ({
  name: "Brindi", palette: { dark: "#1F2A24", primary: "#B4532A", secondary: "#E9D8B8", accent: "#B4532A", light: "#F6F1E7" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, business: "products" as const,
  products, prestations: [], company: { shipping: "Colissimo, 48 h", returns: "14 jours" }, site: { phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Lun–Ven 9 h–18 h", area: "Lyon, Villeurbanne" },
  assetExt: () => "jpg", linkMap: {}, logoAssetId: null, dropMissing: false, base: null, ...over,
});
const inst = (id: string, uid: string, construction?: string | null, html?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: html ?? tenueSection(id)!.html });
const shopTheme = (header: ReturnType<typeof inst>, footer: ReturnType<typeof inst>, over: Record<string, unknown> = {}) => ({
  version: 1, family: "classique", style: "classique", header, footer, search: null, rev: 0, at: 0,
  pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "product", label: "Fiche produit", sections: [inst("tn-achat", "buy", null, tenueSection("tn-achat")!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1"))] }, { key: "shop", label: "La boutique", sections: [] }, { key: "about", label: "Notre histoire", sections: [] }],
  menu: [{ label: "La boutique", to: "shop", grand: true, children: [{ label: "Tout voir", to: "shop" }, { label: "Hauts", to: "shop:Hauts", items: [{ label: "Chemise en lin", to: "product" }] }, { label: "Chaussures", to: "shop:Chaussures", items: [{ label: "Baskets blanches", to: "product" }] }, { label: "Sacs", to: "shop:Sacs", items: [{ label: "Sac demi-lune", to: "product" }] }] }, { label: "Notre histoire", to: "about" }],
  ...over,
}) as any;
const liquidOf = (out: ReturnType<typeof customThemeSpec>, id: string) => Object.values(out.spec.customSections).find((c) => c.liquid.includes(`(${id})`))!.liquid.replace(/ /g, " ");
const FORBIDDEN = /À compléter|photos\/|onclick=|onsubmit=|data-go=|href="#"|\/api\/files\/|<script/;
/** Le balisage d'une section Shopify, sans sa feuille. */
const markup = (liquid: string) => liquid.split("{% stylesheet %}")[0];

describe("la coque : rien d'exemple ne part dans le thème Shopify", () => {
  const message = (h: string) => h.replace("[À compléter : message du moment]", "Fermeture du 1er au 15 août.");

  for (const e of ENTETES) {
    it(`en-tête « ${e.cle} » : une section Shopify valide, de vraies adresses, aucun geste de l'aperçu`, () => {
      const services = e.cle === "services";
      const html = e.cle === "annonce" ? message(tenueSection(e.piece)!.html) : undefined;
      const t = shopTheme(inst(e.piece, "h", e.construction, html), inst("tn-pied", "f"), services ? { pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "prestations", label: "Prestations", sections: [] }, { key: "reservation", label: "Rendez-vous", sections: [] }], menu: [{ label: "Prestations", to: "prestations" }] } : {});
      const out = customThemeSpec(t, input(services ? { business: "services" as const, products: [] } : {}));
      expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
      const l = liquidOf(out, e.piece);
      expect(validateCustomSection(l)).toBeNull();
      expect(l).not.toMatch(FORBIDDEN);
      expect(l).toContain(`data-tn-c="${e.construction}"`);
      // l'en-tête porte la feuille : celle de la coque part avec lui
      expect(l).toMatch(/\{% stylesheet %\}[^]*\.ctw \.tn-ent\{position:sticky/);
      expect(l).toContain('href="{{ routes.root_url }}"><span class="tn-nom lg">Brindi</span></a>');
      if (services) {
        expect(l).toContain('<a class="tn-e-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
        expect(l).toContain('<a class="tn-bt" href="{{ routes.root_url }}pages/reservation">Rendez-vous</a>');
        expect(markup(l)).not.toMatch(/tn-pan|cart\.item_count|routes\.search_url|routes\.cart_url/);
      } else {
        expect(l).toContain('<a class="tn-pan" href="{{ routes.cart_url }}" aria-label="Panier" data-tn-boutique>');
        expect(l).toContain("<span>{{ cart.item_count }}</span>");
        expect(l).toContain('<a class="tn-e-ic" href="{{ routes.search_url }}" aria-label="Rechercher" data-tn-boutique>');
        expect(l).toContain('href="{{ routes.account_url }}"');
      }
      if (e.cle === "annonce") expect(l).toContain('<p class="tn-e-msg">Fermeture du 1er au 15 août.</p>');
      if (e.cle === "mega-colonnes") {
        // la photo d'une famille est lue dans la boutique : celle de sa collection, sinon celle de son premier produit
        expect(l).toContain("{%- assign famille = collections['hauts'] -%}{%- if famille.featured_image -%}<i class=\"tn-ph\" style=\"background-image:url({{ famille.featured_image | image_url: width: 600 }})\"></i>{%- elsif famille.products.first.featured_image -%}");
        expect(l).toContain('<a class="tn-e-fam" href="{{ routes.collections_url }}/chaussures" aria-label="Tout voir : Chaussures">Tout voir</a>');
      } else if (e.cle === "mega-produits") {
        // les produits mis en avant sont ceux de la collection, avec leur prix du moment
        expect(l).toContain("{%- for product in collections['sacs'].products limit: 4 -%}<a class=\"tn-e-carte\" href=\"{{ product.url }}\">");
        expect(l).toContain("<b>{{ product.title }}</b><span>{%- if product.available -%}{{ product.price | money }}{%- else -%}Épuisé{%- endif -%}</span></a>{%- endfor -%}");
        expect(l).toContain('<input type="radio" name="tn-e-rayon-0" checked><span>Hauts</span>');
      } else if (!services) expect(markup(l)).not.toMatch(/collections\[/);
      expect(out.spec.store.collections?.map((c) => c.handle) ?? []).toEqual(services ? [] : ["hauts", "chaussures", "sacs"]);
    });
  }

  it("l'en-tête avec bande d'annonce : sans message vrai, la mise en boutique s'arrête et le dit", () => {
    const out = customThemeSpec(shopTheme(inst("tn-entete-annonce", "h", "annonce"), inst("tn-pied", "f")), input());
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text).join("\n")).toMatch(/En-tête avec bande d'annonce : à compléter : message du moment/);
    // avec l'accord du client, la ligne s'en va et le menu reste
    const dropped = liquidOf(customThemeSpec(shopTheme(inst("tn-entete-annonce", "h", "annonce"), inst("tn-pied", "f")), input({ dropMissing: true })), "tn-entete-annonce");
    expect(markup(dropped)).not.toMatch(/tn-e-msg|À compléter/);
    expect(dropped).toContain('<nav class="tn-e-nav" aria-label="Menu principal">');
  });

  it("l'en-tête de services sans téléphone donné : le numéro s'en va, le bouton de rendez-vous reste", () => {
    const t = shopTheme(inst("tn-entete-services", "h", "services"), inst("tn-pied", "f"), { pages: [{ key: "home", label: "Accueil", sections: [] }, { key: "reservation", label: "Rendez-vous", sections: [] }], menu: undefined });
    const l = liquidOf(customThemeSpec(t, input({ business: "services" as const, products: [], site: {}, dropMissing: true })), "tn-entete-services");
    expect(markup(l)).not.toMatch(/data-tn-tel|À compléter/);
    expect(l).toContain('<ul class="tn-e-actions"><li><a class="tn-bt" href="{{ routes.root_url }}pages/reservation">Rendez-vous</a></li></ul>');
  });

  it("les trois pieds nouveaux : la lettre inscrit un client, les coordonnées sont celles du client, les paiements ceux de la boutique", () => {
    const of = (id: string, over: Record<string, unknown> = {}) => { const out = customThemeSpec(shopTheme(inst("tn-entete-liens", "h", "classique"), inst(id, "f")), input(over)); return { out, l: liquidOf(out, id) }; };
    const lettre = of("tn-pied-lettre");
    expect(lettre.out.problems.filter((x) => x.level === "bloquant")).toEqual([]);
    expect(lettre.l).toMatch(/\{%- form 'customer', class: 'tn-form' -%\}<input type="hidden" name="contact\[tags\]" value="newsletter">/);
    expect(lettre.l).toContain('name="contact[email]"');
    expect(lettre.l).not.toMatch(FORBIDDEN);

    const services = of("tn-pied-services", { business: "services" as const });
    expect(services.out.problems.filter((x) => x.level === "bloquant")).toEqual([]);
    expect(services.l).toContain('<a class="tn-p-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    expect(services.l).toContain("<span data-tn-adresse>12 rue des Lilas, 69003 Lyon</span>");
    expect(services.l).toContain('href="https://www.openstreetmap.org/directions?to=12%20rue%20des%20Lilas%2C%2069003%20Lyon" target="_blank" rel="noopener" data-tn-itineraire>Voir l\'itinéraire</a>');
    expect(services.l).toContain('<table data-tn-horaires="jours"><tbody><tr><th>Lun–Ven</th><td>9 h–18 h</td></tr></tbody></table>');
    expect(services.l).toContain('<ul data-tn-zone="villes"><li>Lyon</li><li>Villeurbanne</li></ul>');
    expect(services.l).not.toMatch(FORBIDDEN);
    // rien de donné : avec l'accord du client, chaque bloc vide s'en va avec son titre (jamais un titre seul, jamais un itinéraire sans adresse)
    const bare = of("tn-pied-services", { business: "services" as const, site: {}, dropMissing: true }).l;
    expect(markup(bare)).not.toMatch(/Nous trouver|Les horaires|Nous nous déplaçons|itineraire|data-tn-tel|À compléter/);
    expect(bare).toContain("Demander un devis");
    // sans cet accord, tout ce qui manque est listé et bloque
    expect(of("tn-pied-services", { business: "services" as const, site: {} }).out.problems.filter((x) => x.level === "bloquant").map((x) => x.text).join("\n")).toMatch(/téléphone, adresse, jours et heures d'ouverture, villes desservies/);

    const gar = of("tn-pied-reassurance");
    expect(gar.out.problems.filter((x) => x.level === "bloquant")).toEqual([]);
    expect(gar.l).toMatch(/<li data-tn-cle="livraison"><svg[^]*?<\/svg><b>Livraison<\/b><span>Colissimo, 48 h<\/span><\/li>/);
    expect(gar.l).toMatch(/<li data-tn-cle="retours"><svg[^]*?<\/svg><b>Retours<\/b><span>14 jours<\/span><\/li>/);
    // les moyens de paiement : ceux que la boutique accepte vraiment, jamais une liste écrite à la main
    expect(gar.l).toContain('<b>Paiement</b><span class="tn-paiements" data-tn-paiements>{%- for type in shop.enabled_payment_types -%}{{ type | payment_type_svg_tag }}{%- endfor -%}</span>');
    expect(gar.l).not.toMatch(FORBIDDEN);
    expect(gar.l).not.toMatch(/Visa|Mastercard|PayPal|Carte bancaire/i);
  });

  it("la feuille de la coque est découpée : le socle des en-têtes part toujours, chaque pied seulement s'il est posé", () => {
    const sheets = tenueSheets();
    expect(sheets.some((x) => x.root === null && x.rule.selector.startsWith(".ctw .tn-ent .tn-e-barre"))).toBe(true);
    for (const root of ["tn-entete-annonce", "tn-entete-services", "tn-pied-lettre", "tn-pied-services", "tn-pied-reassurance"]) expect(sheets.some((x) => x.root === root), root).toBe(true);
    const l = liquidOf(customThemeSpec(shopTheme(inst("tn-entete-liens", "h", "classique"), inst("tn-pied-lettre", "f")), input()), "tn-entete-liens");
    expect(l).toContain(".ctw .tn-pied-lettre .tn-form{");
    expect(l).not.toContain(".ctw .tn-pied-services .tn-p-tel{");
    expect(l).not.toContain(".ctw .tn-entete-services .tn-e-tel{");
    // dans la boutique, c'est le cadre de la section qui reste en haut de l'écran
    expect(l).toContain('html body .shopify-section:has(>.ctw>.tn-ent:not([data-tn-c="sur-photo"])){position:sticky;top:0;z-index:60}');
  });
});

// ---------------------------------------------------------------- l'aperçu, avec un vrai catalogue d'essai (inventé)

const PHOTOS = path.join(process.cwd(), "public", "sections", "photos");
/** Catalogue d'essai inventé : quatre familles, dix produits, leurs photos, leurs prix. */
const CATALOGUE: [string, string, number, string][] = [
  ["Chemise en lin", "md-o1.webp", 8900, "Hauts"], ["Doudoune courte", "md-g3.webp", 18900, "Hauts"],
  ["Short à cordon", "md-o2.webp", 5900, "Bas"], ["Pantalon large", "md-o3.webp", 9500, "Bas"],
  ["Baskets blanches", "md-o4.webp", 12000, "Chaussures"], ["Sandales croisées", "md-o5.webp", 7500, "Chaussures"], ["Baskets bicolores", "rp-d2.webp", 13500, "Chaussures"],
  ["Sac demi-lune noir", "mo-s1.webp", 14500, "Sacs et accessoires"], ["Sac demi-lune ivoire", "mo-s2.webp", 14500, "Sacs et accessoires"], ["Casquette en coton", "md-g1.webp", 3500, "Sacs et accessoires"],
];
const brand = (name: string, palette: Record<string, string>, fonts: { heading: string; body: string }) => ({ name, nameStatus: "validated", alternatives: [], tagline: "", positioning: "Des pièces simples, pour tous les jours.", audience: "", personality: ["simple"], tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] }, palette, fonts, logo: { concept: "", status: "proposed" } });
/** Trois allures très différentes, trois marques inventées. */
const ALLURES = [
  { key: "calme", brand: brand("Olivane", { primary: "#B5562F", secondary: "#E9DBC6", accent: "#B5562F", light: "#F6EEE1", dark: "#2A211B" }, { heading: "instrument_serif", body: "dm_sans" }), tenue: { titres: "fins", bouton: "pilule", cadre: "niche", fond: "uni", petits: "normal", signe: "l'arche" } },
  { key: "brute", brand: brand("Nordet", { primary: "#D9F24A", secondary: "#D6D2C8", accent: "#D9F24A", light: "#ECE9E2", dark: "#14181B" }, { heading: "space_grotesk", body: "work_sans" }), tenue: { titres: "gras", bouton: "etiquette", cadre: "droit", fond: "toile", petits: "machine", signe: "l'étiquette" } },
  { key: "vive", brand: brand("Pimpon", { primary: "#FF4F6D", secondary: "#FFD43B", accent: "#FF4F6D", light: "#FFF6DC", dark: "#1D1A3A" }, { heading: "unbounded_n8", body: "dm_sans" }), tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "le pompon" } },
] as const;
const OUVERTURE = (photo: string, services: boolean) => `<section class="tn tn-ouverture"><div class="tn-ph" style="background-image:url(${photo})"></div><div class="tn-in"><span class="tn-etq">${services ? "Électricité · Lyon" : "Nouvelle saison"}</span><small>${services ? "Dépannage et rénovation" : "La garde-robe d'été"}</small><h1>${services ? "La lumière revient.<br>Le calme aussi." : "Léger, simple,<br>fait pour l'été."}</h1></div><div class="tn-bas"><p>${services ? "Une panne, un tableau qui saute, une pièce à éclairer : tu appelles, on te dit quand on vient." : "Du lin, du coton, des coupes amples. Tu enfiles, tu sors, tu n'y penses plus."}</p><a class="tn-bt" href="#" onclick="return false" data-go="${services ? "devis" : "shop"}">${services ? "Demander un devis" : "Voir la collection"}</a></div></section>`;

async function chantier(allure: (typeof ALLURES)[number], business: "products" | "services") {
  const { account, project } = await import("./conversation209-fixtures");
  const { saveBrand, saveServices, loadProject } = await import("@/lib/projects");
  const { saveCompany } = await import("@/lib/syna-agent/activity");
  const { saveAsset, assetUrl } = await import("@/lib/library");
  const { createProduct } = await import("@/lib/products/catalog");
  const F = await import("./tenue-fauteuil-fixtures");
  const user = await account();
  const pid = await project(user, business);
  saveBrand(pid, (business === "services" ? { ...allure.brand, name: "Atelier Volta" } : allure.brand) as any);
  const save = async (file: string) => assetUrl({ id: (await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(file, undefined, PHOTOS), name: file.replace(/\.\w+$/, ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" })).id });
  const scene = await save(business === "services" ? "sv-spots.jpg" : "md-j2.webp");
  if (business === "products") for (const [title, file, price, family] of CATALOGUE) createProduct(pid, { title, images: [{ assetId: (await save(file)).split("/").pop()! }], price, categories: [family] } as any);
  else saveServices(pid, { ...loadProject(pid).services, services: [{ name: "Dépannage", price: "", duration: "" }, { name: "Tableau électrique", price: "", duration: "" }] as any, phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Du lundi au vendredi 8 h – 18 h ; samedi 9 h – 12 h", area: "Lyon, Villeurbanne, Bron, Caluire et Vénissieux" });
  saveCompany(pid, { shipping: "Colissimo, 48 h, 4,90 €", returns: "30 jours pour changer d'avis" });
  return { pid, scene, loadProject };
}

/** Le thème d'essai : un accueil ouvert par une grande photo, les pages du menu, l'en-tête et le pied demandés. */
async function themeOf(o: { pid: string; scene: string; business: "products" | "services"; tenue: unknown; header: { id: string; construction: string | null }; footer: { id: string; construction: string | null }; extra?: { key: string; id: string; construction: string | null }[] }) {
  const S = await import("@/lib/syna-agent/custom-theme/theme");
  const { menuProducts } = await import("@/lib/syna-agent/custom-theme/render");
  const pages: [string, string, string?][] = o.business === "services"
    ? [["home", "Accueil"], ["prestations", "Prestations"], ["realisations", "Réalisations"], ["devis", "Demander un devis"], ["reservation", "Rendez-vous"], ["about", "Notre histoire"], ["contact", "Contact"], ["legal", "Mentions légales"]]
    : [["home", "Accueil"], ["shop", "La boutique", "tn-catalogue"], ["product", "Fiche produit", "tn-achat"], ["about", "Notre histoire"], ["journal", "Le journal"], ["aide", "Aide"], ["contact", "Contact"], ["cart", "Panier"], ["compte", "Mon compte"], ["legal", "Mentions légales"]];
  let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
  t = S.applyStructure(t, [
    ...pages.flatMap(([key, label, section]) => [{ op: "page", key, label } as const, ...(section ? [{ op: "add", page: key, section } as const] : [])]),
    { op: "add", page: "home", section: "tn-ouverture", construction: "titre-en-bas" }, ...(o.business === "products" ? [{ op: "add", page: "home", section: "tn-produits", construction: "grille" } as const] : [{ op: "add", page: "home", section: "tn-atouts", construction: "numeros" } as const]),
    ...(o.extra ?? []).flatMap((x) => [{ op: "page", key: x.key, label: x.key } as const, { op: "add", page: x.key, section: x.id, ...(x.construction ? { construction: x.construction } : {}) } as const]),
    { op: "shell", slot: "header", section: o.header.id, ...(o.header.construction ? { construction: o.header.construction } : {}) }, { op: "shell", slot: "footer", section: o.footer.id, ...(o.footer.construction ? { construction: o.footer.construction } : {}) }, { op: "tenue", tenue: o.tenue },
  ] as any);
  const home = t.pages.find((p: any) => p.key === "home");
  home.sections[0].html = OUVERTURE(o.scene, o.business === "services"); home.sections[0].clientTexts = true;
  if (t.header.id === "tn-entete-annonce") { t.header.html = tenueSection("tn-entete-annonce")!.html.replace("[À compléter : message du moment]", "Livraison en point relais ou à domicile, partout en France"); }
  for (const s of home.sections) if (s.id === "tn-produits") { s.html = tenueSection("tn-produits")!.html.replace(/<h2>[\s\S]*?<\/h2>/, "<h2>Les nouveautés.</h2>"); }
  // les textes d'exemple du pied complet (ceux de la bibliothèque) laissent la place à des mots neutres
  for (const s of [t.footer, ...t.pages.flatMap((p: any) => p.sections)]) if (s?.id === "tn-pied-complet") { s.html = tenueSection("tn-pied-complet")!.html.replace("Des thés en feuilles entières, pour les pauses qui comptent.", "Des pièces simples, pour tous les jours.").replace("Tous les mélanges", "Toute la boutique"); }
  t.menu = o.business === "services"
    ? [{ label: "Prestations", to: "prestations", children: [{ label: "Toutes les prestations", to: "prestations" }, { label: "Dépannage", to: "prestations:Dépannage" }, { label: "Tableau électrique", to: "prestations:Tableau électrique" }, { label: "Éclairage", to: "prestations:Éclairage" }] }, { label: "Réalisations", to: "realisations" }, { label: "Notre histoire", to: "about" }, { label: "Contact", to: "contact" }]
    : M.proposeMenu(t, menuProducts(o.pid), "products");
  return t;
}

describe("la coque : dans l'aperçu, avec un vrai catalogue d'essai (quatre familles, dix produits)", () => {
  it("le grand menu lit le catalogue ; l'en-tête de services porte le téléphone du client et aucun panier", async () => {
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const shop = await chantier(ALLURES[0], "products");
    const tenue = ALLURES[0].tenue, pied = { id: "tn-pied-reassurance", construction: null };
    const cols = await themeOf({ ...shop, business: "products", tenue, header: { id: "tn-entete-liens", construction: "mega-colonnes" }, footer: pied });
    // quatre familles, dix produits : SINA propose un grand menu, quelques produits sous chaque famille
    expect(cols.menu[0]).toMatchObject({ label: "La boutique", to: "shop", grand: true });
    expect(cols.menu[0].children.map((c: any) => c.label)).toEqual(["Tout voir", "Hauts", "Bas", "Chaussures", "Sacs et accessoires"]);
    const page = renderCustomTheme(shop.loadProject(shop.pid), cols, { embed: true });
    const header = /<section data-ct="[^"]+" data-ct-role="header"[^>]*>[\s\S]*?<\/section>/.exec(page)![0];
    expect(header).toContain('data-tn-c="mega-colonnes" class="tn tn-entete-liens tn-ent"');
    expect(header.match(/<div class="tn-e-col">/g)).toHaveLength(4);
    // chaque colonne a la photo d'un vrai produit de la famille (un fichier du client), jamais une photo d'exemple
    expect(header.match(/<label class="tn-e-h"><input type="checkbox"><i class="tn-ph" style="background-image:url\(\/api\/files\/[\w-]+\)"><\/i>/g)).toHaveLength(4);
    expect(header).not.toMatch(/photos\//);
    expect(header).toContain(">Baskets bicolores</a>");
    expect(header).toContain('<span class="tn-nom lg">Olivane</span>');
    // les mêmes données, en vitrine de produits : le vrai prix de chaque produit
    const vit = renderCustomTheme(shop.loadProject(shop.pid), { ...cols, header: { ...cols.header, construction: "mega-produits" } }, { embed: true });
    const h2 = /<section data-ct="[^"]+" data-ct-role="header"[^>]*>[\s\S]*?<\/section>/.exec(vit)![0];
    expect(h2.match(/<div class="tn-e-rayon">/g)).toHaveLength(4);
    expect(h2).toMatch(/<a class="tn-e-carte" href="#" onclick="return false" data-go="product"><i class="tn-ph" style="background-image:url\(\/api\/files\/[\w-]+\)"><\/i><b>Chemise en lin<\/b><span>89 €<\/span><\/a>/);
    expect(h2).toContain("<b>Sac demi-lune noir</b><span>145 €</span>");
    // le pied de réassurance : la livraison et les retours du client ; le paiement reste à compléter (jamais inventé)
    const footer = /<footer data-ct="[^"]+" data-ct-role="footer"[^>]*>[\s\S]*?<\/footer>/.exec(page)![0];
    expect(footer).toContain("<b>Livraison</b><span>Colissimo, 48 h, 4,90 €</span>");
    expect(footer).toContain("<b>Retours</b><span>30 jours pour changer d'avis</span>");
    expect(footer).toContain('<span data-tn-paiements><mark class="tn-manque">À compléter : moyens de paiement acceptés</mark></span>');

    const sv = await chantier(ALLURES[1], "services");
    const st = await themeOf({ ...sv, business: "services", tenue: ALLURES[1].tenue, header: { id: "tn-entete-services", construction: "services" }, footer: { id: "tn-pied-services", construction: null } });
    const spage = renderCustomTheme({ ...sv.loadProject(sv.pid), business: "services" } as any, st, { embed: true });
    const sh = /<section data-ct="[^"]+" data-ct-role="header"[^>]*>[\s\S]*?<\/section>/.exec(spage)![0];
    expect(sh).toContain('<a class="tn-e-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    expect(sh).not.toMatch(/tn-pan|Panier|Rechercher/);
    const sf = /<footer data-ct="[^"]+" data-ct-role="footer"[^>]*>[\s\S]*?<\/footer>/.exec(spage)![0].replace(/ /g, " ");
    expect(sf).toContain('<a class="tn-p-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    expect(sf).toContain("<tr><th>Du lundi au vendredi</th><td>8 h – 18 h</td></tr><tr><th>Samedi</th><td>9 h – 12 h</td></tr>");
    expect(sf).toContain("<li>Lyon</li><li>Villeurbanne</li><li>Bron</li><li>Caluire</li><li>Vénissieux</li>");
    expect(sf).toMatch(/href="https:\/\/www\.openstreetmap\.org\/directions\?to=12%20rue%20des%20Lilas[^"]*" target="_blank" rel="noopener" data-tn-itineraire>/);
    // un en-tête à menu visible posé sur un site de services : ni panier, ni recherche, ni compte
    const st2 = await themeOf({ ...sv, business: "services", tenue: ALLURES[1].tenue, header: { id: "tn-entete-liens", construction: "classique" }, footer: { id: "tn-pied-services", construction: null } });
    const sh2 = /<section data-ct="[^"]+" data-ct-role="header"[^>]*>[\s\S]*?<\/section>/.exec(renderCustomTheme({ ...sv.loadProject(sv.pid), business: "services" } as any, st2, { embed: true }))![0];
    expect(sh2).not.toMatch(/tn-pan|Panier|Rechercher|Mon compte/);
    expect(sh2).toContain('<div class="tn-e-sous"><label class="tn-e-t"><input type="checkbox"><span>Prestations</span></label>');
  }, 120_000);
});

// ---------------------------------------------------------------- captures à la demande

describe.runIf(!!process.env.COQUE_OUT)("la coque : captures, fermé et ouvert, ordinateur et téléphone, deux allures", () => {
  const out = process.env.COQUE_OUT!;
  const only = (process.env.COQUE_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const VIEWS = { ordi: { width: 1280, height: 800 }, tel: { width: 390, height: 844 }, petit: { width: 320, height: 640 } } as const;

  async function browserOf() {
    const { chromiumPath } = await import("@/lib/theme/snapshot");
    const { chromium } = await import("playwright");
    return chromium.launch({ executablePath: chromiumPath()!, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  }
  async function open(browser: import("playwright").Browser, html: string, view: keyof typeof VIEWS, js = true) {
    const { getAsset, assetData } = await import("@/lib/library");
    const { fontFilePath } = await import("@/lib/theme/render");
    const { LIBRARY_DIR } = await import("@/lib/syna-agent/custom-theme/library");
    const ctx = await browser.newContext({ viewport: VIEWS[view], deviceScaleFactor: view === "ordi" ? 1 : 2, reducedMotion: "reduce", javaScriptEnabled: js, hasTouch: view !== "ordi" });
    const page = await ctx.newPage();
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.origin !== "http://theme.sina") return route.abort();
      if (u.pathname === "/") return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
      if (u.pathname.startsWith("/sections/")) { const f = path.join(LIBRARY_DIR(), decodeURIComponent(u.pathname.slice(10))); return fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }) : route.fulfill({ status: 404 }); }
      const file = /^\/api\/files\/([\w-]+)/.exec(u.pathname);
      if (file) { const a = getAsset(file[1]); return a ? route.fulfill({ body: assetData(a), contentType: a.mime }) : route.fulfill({ status: 404 }); }
      const font = /^\/api\/syna\/fonts\/(.+)$/.exec(u.pathname);
      if (font) { const f = fontFilePath(decodeURIComponent(font[1])); return f ? route.fulfill({ body: fs.readFileSync(f), contentType: "font/ttf" }) : route.fulfill({ status: 404 }); }
      return route.fulfill({ status: 404 });
    });
    await page.goto("http://theme.sina/", { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(350);
    return { ctx, page };
  }
  const overflow = (page: import("playwright").Page) => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
  const shot = async (page: import("playwright").Page, file: string, height?: number) => { const v = page.viewportSize()!; fs.writeFileSync(path.join(out, file), await page.screenshot({ type: "jpeg", quality: 86, clip: { x: 0, y: 0, width: v.width, height: Math.min(height ?? v.height, v.height) } })); };

  it("les huit en-têtes", async () => {
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    fs.mkdirSync(out, { recursive: true });
    const browser = await browserOf();
    const wide: string[] = [];
    try {
      const sites = new Map<string, Awaited<ReturnType<typeof chantier>>>();
      for (const [i, e] of ENTETES.entries()) {
        if (only.length && !only.includes(e.cle)) continue;
        const business = e.cle === "services" ? "services" : "products";
        for (const allure of process.env.COQUE_TOUTES ? ALLURES : [ALLURES[i % 3], ALLURES[(i + 1) % 3]]) {
          const k = `${allure.key}-${business}`;
          if (!sites.has(k)) sites.set(k, await chantier(allure, business));
          const site = sites.get(k)!;
          const t = await themeOf({ ...site, business, tenue: allure.tenue, header: { id: e.piece, construction: e.construction }, footer: { id: "tn-pied", construction: null } });
          const html = renderCustomTheme({ ...site.loadProject(site.pid), business } as any, t, { embed: true });
          const name = (view: string, state: string) => `entete-${e.n}-${e.cle}__${allure.key}__${view}-${state}.jpg`;
          for (const view of ["ordi", "tel", "petit"] as const) {
            const { ctx, page } = await open(browser, html, view);
            if (await overflow(page) > 1) wide.push(`${e.cle} · ${allure.key} · ${view} fermé : dépasse de ${await overflow(page)} px`);
            if (view !== "petit") await shot(page, name(view, "ferme"), view === "ordi" ? 520 : 600);
            // ouvrir : sur ordinateur, la souris passe sur la première rubrique ; sur téléphone, on touche le bouton du menu
            const burger = page.locator('[data-ct-role="header"] .tn-e-burger');
            if (view === "ordi" && e.cle !== "plein-ecran") { const sous = page.locator('[data-ct-role="header"] .tn-e-sous').first(); if (await sous.count()) await sous.hover(); }
            else {
              await burger.click({ position: { x: 10, y: 10 } });
              if (e.cle === "mega-colonnes") await page.locator('[data-ct-role="header"] .tn-e-h').nth(1).click({ position: { x: 100, y: 20 } });
              if (e.cle === "mega-produits") await page.locator('[data-ct-role="header"] .tn-e-onglets label').nth(2).click();
              if (!e.cle.startsWith("mega") && e.cle !== "plein-ecran" && await page.locator('[data-ct-role="header"] .tn-e-t').count()) await page.locator('[data-ct-role="header"] .tn-e-t').first().click({ position: { x: 60, y: 20 } });
            }
            await page.waitForTimeout(350);
            if (await overflow(page) > 1) wide.push(`${e.cle} · ${allure.key} · ${view} ouvert : dépasse de ${await overflow(page)} px`);
            await shot(page, name(view, "ouvert"));
            if (view === "ordi" && e.cle === "mega-produits") { await page.locator('[data-ct-role="header"] .tn-e-sous').first().hover(); await page.locator('[data-ct-role="header"] .tn-e-onglets label').nth(2).click(); await page.waitForTimeout(250); await shot(page, name(view, "ouvert-2")); }
            if (view === "ordi" && e.cle === "sur-photo") { await page.mouse.move(640, 700); await page.evaluate(() => scrollTo(0, 520)); await page.waitForTimeout(300); await shot(page, name(view, "defile"), 420); }
            await ctx.close();
          }
          // sans script (comme dans la boutique) : le menu s'ouvre quand même
          if (allure === ALLURES[i % 3]) {
            const { ctx, page } = await open(browser, html, "tel", false);
            await page.locator('[data-ct-role="header"] .tn-e-burger').click({ position: { x: 10, y: 10 } });
            await page.waitForTimeout(200);
            await shot(page, name("tel", "ouvert-sans-script"));
            expect(await page.locator('[data-ct-role="header"] .tn-e-nav').isVisible(), `${e.cle} : le menu s'ouvre sans script`).toBe(true);
            expect(await page.locator('[data-ct-role="header"] .tn-e-liens > a').first().isVisible()).toBe(true);
            await shot(page, name("tel", "ouvert-sans-script"));
            await ctx.close();
          }
        }
      }
    } finally { await browser.close().catch(() => {}); }
    expect(wide, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 900_000);

  it("les six pieds de page", async () => {
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    fs.mkdirSync(out, { recursive: true });
    const browser = await browserOf();
    const wide: string[] = [];
    try {
      for (const allure of ALLURES) {
        for (const business of ["products", "services"] as const) {
          const list = PIEDS.filter((p) => (business === "services") === (p.cle === "services")).filter((p) => !only.length || only.includes(p.cle));
          if (!list.length) continue;
          const site = await chantier(allure, business);
          const t = await themeOf({ ...site, business, tenue: allure.tenue, header: { id: "tn-entete-liens", construction: "classique" }, footer: { id: "tn-pied", construction: null }, extra: list.map((p) => ({ key: `pied-${p.cle}`, id: p.piece, construction: p.construction })) });
          const html = renderCustomTheme({ ...site.loadProject(site.pid), business } as any, t, { embed: true });
          for (const view of ["ordi", "tel", "petit"] as const) {
            const { ctx, page } = await open(browser, html, view);
            await page.addStyleTag({ content: '[data-ct-role="header"]{display:none}' });
            for (const p of list) {
              await page.evaluate((k) => (window as unknown as { ctGo: (key: string) => void }).ctGo(k), `pied-${p.cle}`);
              await page.waitForTimeout(400);
              if (await overflow(page) > 1) wide.push(`${p.cle} · ${allure.key} · ${view} : dépasse de ${await overflow(page)} px`);
              if (view !== "petit") fs.writeFileSync(path.join(out, `pied-${p.n}-${p.cle}__${allure.key}__${view}.jpg`), await page.locator(`.tb-pg[data-pg="pied-${p.cle}"] > footer`).screenshot({ type: "jpeg", quality: 86 }));
            }
            await ctx.close();
          }
        }
      }
    } finally { await browser.close().catch(() => {}); }
    expect(wide, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 900_000);
});
