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
const SELECTORS = SHEET.replace(/@media[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
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
    for (const [id, list] of Object.entries(ACHAT_FACONS)) {
      const root = rootOf(id);
      expect(list.length, id).toBeGreaterThanOrEqual(2);
      expect(list.length, id).toBeLessThanOrEqual(6);
      for (const c of list.slice(1)) {
        const mine = SELECTORS.filter((sel) => sel.includes(`.ctw`) && sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${c.key}"]`));
        expect(mine.length, `${id} : règles pour « ${c.key} »`).toBeGreaterThanOrEqual(3);
        // Une vraie autre mise en page : elle a aussi ses règles d'écran large.
        expect(new RegExp(`@media \\(min-width:760px\\)\\{[\\s\\S]*\\.${root}[^{]*\\[data-tn-c="${c.key}"\\]`).test(SHEET), `${id} : « ${c.key} » sur grand écran`).toBe(true);
      }
      expect(SELECTORS.some((sel) => sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${list[0].key}"]`)), `${id} : aucune règle pour « ${list[0].key} »`).toBe(false);
    }
    // Les pièces nouvelles : deux façons au moins, la seconde dessinée.
    for (const s of ACHAT_SECTIONS) {
      expect(s.constructions.length, s.id).toBeGreaterThanOrEqual(2);
      for (const c of s.constructions.slice(1)) expect(SELECTORS.some((sel) => sel.includes(`.ctw .${rootOf(s.id)}[data-tn-c="${c.key}"]`)), `${s.id} : « ${c.key} »`).toBe(true);
      expect(SELECTORS.some((sel) => sel.includes(`[data-tn-c="${s.constructions[0].key}"]`) && sel.includes(`.${rootOf(s.id)}`)), `${s.id} : aucune règle pour sa première façon`).toBe(false);
    }
  });

  it("la feuille suit les règles : sélecteurs « .ctw .tn-… », aucune couleur en dur, aucun « !important »", () => {
    expect(SHEET).not.toMatch(/!important/);
    expect(SHEET.replace(/url\("data:[^"]*"\)/g, "")).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
    for (const sel of SELECTORS) for (const one of sel.split(/,(?![^(]*\))/)) expect(one.trim(), one).toMatch(/^\.ctw(?:\[data-tn-[a-z]+="[a-z]+"\])? \.(?:tn-|tb-pg>\.tn-)/);
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
    expect(ACHAT_SECTIONS.map((s) => s.id)).toEqual(["tn-versions", "tn-guide-tailles", "tn-lots", "tn-looks", "tn-allergenes", "tn-avant-apres-produit", "tn-pictos"]);
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
        expect(c.liquid, `${id} ${key} ${type}`).not.toMatch(/À compléter|photos\/|onclick=|data-go=|href="#"|\/api\/files\/|<script/);
      }
      const mine = out.spec.customSections["es-custom-s1"]?.liquid;
      if (mine) expect(mine, `${id} ${key}`).toContain(`data-tn-c="${key}"`);
      // La feuille de la boutique porte les règles de la façon choisie.
      if (mine && key !== tenueSection(id)!.constructions[0].key) expect(Object.values(out.spec.customSections).map((c) => c.liquid).join("\n"), `${id} ${key} : feuille`).toContain(`[data-tn-c="${key}"]`);
    }
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
        return h;
      };
      const t: any = { version: 1, family: "classique", style: "classique", search: null, rev: 0, at: Date.now(), tenue: e.tenue,
        header: { uid: "h", id: "tn-entete", html: tenueSection("tn-entete")!.html }, footer: { uid: "f", id: "tn-pied", html: tenueSection("tn-pied")!.html },
        pages: pages.map((p, i) => ({ key: p.key, label: p.key, sections: p.sections.map((s, j) => ({ uid: `s${i}x${j}`, id: s.id, construction: s.c, html: html(s.id), ...(s.id === "tn-achat" ? { clientTexts: true } : {}) })) })) };
      const page = renderCustomTheme(loadProject(pid), t, { embed: true });
      for (const view of ["téléphone", "ordinateur"] as const) {
        const shots = await shootPages(page, pages.map((p) => p.key), { view, maxHeight: 3000, quality: 86 });
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
      for (const width of [320, 390, 1280]) {
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
