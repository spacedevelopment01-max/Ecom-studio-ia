/**
 * Thème unique du Studio, chantier « intégration » (lot 4) : ce qui tombait entre les modules de pièces.
 *
 * 1) Une coque propre à une page (page d'arrivée d'une publicité) : l'opération qui la pose, le contrôle, l'aperçu
 *    (la page affiche SA coque, rien du site autour), le modèle Shopify (« page.arrivee » : l'en-tête et le pied du
 *    site ne s'y rendent pas, la coque de la page ouvre et ferme le modèle), le rendu Liquid du Studio.
 * 2) La lecture du catalogue de vente (« vitrine ») est dans les données du site, plus dans celles des métiers.
 * 3) Les remises : l'indicateur passé à la mise en boutique vient de la preuve lue dans la boutique quand elle existe,
 *    sinon de la déclaration du client ; l'outil « shop.discounts_check » interroge la boutique reliée.
 * Gratuit, sans IA, aucun appel réel (la boutique interrogée est simulée). Client et produits inventés pour l'essai.
 */
import { describe, expect, it } from "vitest";
import { tenueSection } from "@/lib/syna-agent/custom-theme/tenue";
import * as S from "@/lib/syna-agent/custom-theme/theme";
import * as R from "@/lib/syna-agent/custom-theme/remises";
import * as F from "./tenue-fauteuil-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";
const sp = (x: string) => x.replace(/ /g, " ");
const vide = (): S.CustomTheme => ({ version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: 0 });
/** Un site d'essai : un accueil, une fiche, une page d'arrivée ; l'en-tête et le pied du site ; un bandeau sur tout le site. */
const site = () => S.applyStructure(vide(), [
  { op: "page", key: "home", label: "Accueil" }, { op: "add", page: "home", section: "tn-atouts" },
  { op: "page", key: "product", label: "Fiche produit" }, { op: "add", page: "product", section: "tn-achat" },
  { op: "page", key: "arrivee", label: "Page d'arrivée" }, { op: "add", page: "arrivee", section: "tn-ouverture-arrivee" }, { op: "add", page: "arrivee", section: "tn-raisons" }, { op: "add", page: "arrivee", section: "tn-barre-produit" },
  { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }, { op: "extra", section: "tn-messages" }, { op: "tenue", tenue: F.FAUTEUIL_TENUE },
]);
/** L'opération exacte que SINA envoie pour poser la coque de la page d'arrivée. */
const COQUE: S.StructureOp[] = [
  { op: "page_shell", page: "arrivee", slot: "header", section: "tn-entete-arrivee" },
  { op: "page_shell", page: "arrivee", slot: "footer", section: "tn-pied-arrivee", construction: "ligne" },
];
/** Toutes les sections écrites « pour le client » (leurs textes neutres valent textes du client), photos remplacées. */
const ecrit = (t: S.CustomTheme) => { for (const x of S.allSections(t)) { x.s.html = tenueSection(x.s.id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1").replace(/\[À compléter[^\]]*\]/g, "Texte d'essai"); x.s.clientTexts = true; } return t; };

describe("thème unique, intégration : une coque propre à une page", () => {
  it("l'opération « page_shell » pose l'en-tête et le pied d'une page, seulement des pièces de ces rôles, et les retire", () => {
    const t = S.applyStructure(site(), COQUE);
    const pg = t.pages.find((p) => p.key === "arrivee")!;
    expect(pg.coque?.header?.id).toBe("tn-entete-arrivee");
    expect(pg.coque?.footer).toMatchObject({ id: "tn-pied-arrivee", construction: "ligne" });
    expect(S.hasCoque(pg)).toBe(true);
    expect(S.hasCoque(t.pages[0])).toBe(false);
    // Le site garde son en-tête et son pied ; les pièces de la coque sont lues, écrites et retouchées comme les autres.
    expect(t.header?.id).toBe("tn-entete");
    expect(S.allSections(t).filter((x) => x.place === "coque de arrivee").map((x) => x.s.id)).toEqual(["tn-entete-arrivee", "tn-pied-arrivee"]);
    expect(S.findSection(t, pg.coque!.header!.uid)?.page?.key).toBe("arrivee");
    const autre = S.applyStructure(t, [{ op: "construction", uid: pg.coque!.header!.uid, construction: "nom-au-centre" }]);
    expect(autre.pages.find((p) => p.key === "arrivee")!.coque!.header!.construction).toBe("nom-au-centre");
    // Une pièce qui n'est ni un en-tête ni un pied est refusée, à chaque emplacement ; une page inconnue aussi.
    expect(() => S.applyStructure(site(), [{ op: "page_shell", page: "arrivee", slot: "header", section: "tn-raisons" }])).toThrow(/n'est pas un en-tête/);
    expect(() => S.applyStructure(site(), [{ op: "page_shell", page: "arrivee", slot: "footer", section: "tn-entete-arrivee" }])).toThrow(/n'est pas un pied de page/);
    expect(() => S.applyStructure(site(), [{ op: "page_shell", page: "inconnue", slot: "header", section: "tn-entete-arrivee" }])).toThrow(/introuvable/);
    // Retirée emplacement par emplacement ; sans rien, la page reprend la coque du site.
    const sans = S.applyStructure(t, [{ op: "page_shell", page: "arrivee", slot: "header", section: null }, { op: "page_shell", page: "arrivee", slot: "footer", section: null }]);
    expect(sans.pages.find((p) => p.key === "arrivee")!.coque).toBeUndefined();
  });

  it("le contrôle accepte la coque d'une page, et refuse toujours un en-tête parmi les sections ou une autre pièce dans la coque", () => {
    const t = S.applyStructure(site(), COQUE);
    const textes = (x: S.CustomTheme) => S.checkCustomTheme(x).map((p) => p.text);
    expect(textes(t).filter((x) => /ne se pose pas dans une page|n'est pas un/.test(x))).toEqual([]);
    // Parmi les sections d'une page : toujours refusé (il sert à tout le site, ou à la coque d'une page).
    const dedans = S.applyStructure(site(), [{ op: "add", page: "arrivee", section: "tn-entete-arrivee", at: 0 }]);
    expect(textes(dedans).some((x) => /ne se pose pas dans une page/.test(x))).toBe(true);
    // Une coque forcée à la main avec une pièce d'un autre rôle : bloquant.
    const force: S.CustomTheme = JSON.parse(JSON.stringify(t));
    force.pages.find((p) => p.key === "arrivee")!.coque!.footer = { uid: "sforce01", id: "tn-raisons" };
    expect(S.checkCustomTheme(force).filter((p) => p.level === "bloquant").map((p) => p.text).some((x) => /n'est pas un pied de page : la coque de « Page d'arrivée »/.test(x))).toBe(true);
  });

  it("dans Shopify : le modèle « page.arrivee » s'ouvre et se ferme par SA coque ; l'en-tête, le pied et les fenêtres du site ne s'y rendent pas", async () => {
    const { customThemeSpec, coqueModele } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection, validateSpec } = await import("@/lib/theme/ops");
    const { renderPage } = await import("@/lib/theme/render");
    const { linkMap } = await import("@/lib/syna-agent/custom-theme/render");
    const t = ecrit(S.applyStructure(S.applyStructure(site(), COQUE), [{ op: "settings", cart: "drawer" }]));
    const pg = t.pages.find((p) => p.key === "arrivee")!;
    const out = customThemeSpec(t, { name: "Boutique Essai", business: "products", products: [{ handle: "gourde-essai", title: "Gourde d'essai", categories: [] }], company: { shipping: "48 h", returns: "30 jours" }, assetExt: () => "jpg", linkMap: linkMap(t), dropMissing: true, base: null });
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    for (const [type, c] of Object.entries(out.spec.customSections)) expect(validateCustomSection(c.liquid), `${type} : contrôle du Studio`).toBeNull();
    const spec = out.spec;
    spec.files = {};
    spec.store.product = { title: "Gourde d'essai", handle: "gourde-essai", vendor: "Essai", description_html: "", price: 3400, compare_at_price: null, currency: "EUR", options: [], variants: [{ title: "Default Title", options: [], price: 3400, available: true }], images: [], tags: [] };
    expect(validateSpec(spec)).toEqual([]);
    // Le modèle de la page : nom clair, sa coque en première et en dernière section, la page créée avec ce modèle.
    const tpl = spec.templates["page.arrivee"];
    expect(tpl.order[0]).toBe(`tn-${pg.coque!.header!.uid}`);
    expect(tpl.order.at(-1)).toBe(`tn-${pg.coque!.footer!.uid}`);
    expect(tpl.order.length).toBe(pg.sections.length + 2);
    expect(spec.store.pages.find((p) => p.handle === "arrivee")?.template_suffix).toBe("arrivee");
    expect(coqueModele("page.arrivee")).toBe("page.arrivee");
    expect(coqueModele("index")).toBe("index.");
    // Les sections des deux groupes du site (bandeau, en-tête, pied, panier de côté) sont sous condition ; leur feuille reste.
    const groupes = [...Object.values(spec.groups.header.sections), ...Object.values(spec.groups.footer.sections)].map((x) => spec.customSections[x.type].liquid);
    expect(groupes.length).toBeGreaterThanOrEqual(4);
    for (const l of groupes) expect(l).toMatch(/\{%- assign tn_modele = template\.name \| append: '\.' \| append: template\.suffix -%\}\{%- unless tn_modele == 'page\.arrivee' -%\}<div class="ctw[\s\S]*<\/div>\{%- endunless -%\}\n\{% (?:stylesheet|schema) %\}/);
    const entete = spec.customSections[`es-custom-${t.header!.uid}`].liquid;
    expect(entete.indexOf("{%- endunless -%}")).toBeLessThan(entete.indexOf("{% stylesheet %}"));
    expect(entete).toContain(".tn-entete-arrivee"); // la feuille du site porte aussi les règles de la coque de la page
    // La coque de la page n'est sous aucune condition, ne porte pas la feuille du site, et lit le vrai produit.
    const mien = spec.customSections[`es-custom-${pg.coque!.header!.uid}`].liquid;
    expect(mien).not.toContain("tn_modele");
    expect(mien).not.toContain("{% stylesheet %}");
    expect(mien).toContain("data-tn-coque");
    expect(mien).toContain("{%- assign vedette = all_products['gourde-essai'] -%}");
    expect(mien).toContain("<span data-tn-produit-nom>{{ vedette.title }}</span>");
    expect(spec.customSections[`es-custom-${pg.coque!.footer!.uid}`].liquid).toMatch(/<footer data-tn-c="ligne" data-tn-coque class="tn tn-pied-arrivee"/);
    expect(out.problems.some((x) => x.level === "à savoir" && /« Page d'arrivée » : cette page a son propre en-tête/.test(x.text))).toBe(true);
    // Rendu Liquid du Studio : sur la page d'arrivée, ni l'en-tête ni le pied du site, ni le bandeau, ni le panier de côté.
    const arrivee = (await renderPage({ spec, base: "", cart: [] }, "/pages/arrivee", new URLSearchParams()));
    expect(arrivee.status).toBe(200);
    expect(arrivee.template).toBe("page.arrivee");
    expect(arrivee.html).toContain('class="tn tn-entete-arrivee"');
    expect(arrivee.html).toContain('class="tn tn-pied-arrivee"');
    expect(arrivee.html).toContain("<span data-tn-produit-nom>Gourde d'essai</span>");
    expect(arrivee.html.indexOf('class="tn tn-entete-arrivee"')).toBeLessThan(arrivee.html.indexOf('class="tn tn-ouverture-arrivee'));
    expect(arrivee.html.indexOf('class="tn tn-barre-produit"')).toBeLessThan(arrivee.html.indexOf('class="tn tn-pied-arrivee"'));
    for (const racine of ['class="tn tn-entete"', 'class="tn tn-pied tn-sombre"', 'class="tn tn-messages"', 'class="tn tn-panier-cote"']) expect(arrivee.html.includes(racine), `${racine} absent de la page d'arrivée`).toBe(false);
    // Sur l'accueil : la coque du site, et rien de la page d'arrivée.
    const accueil = (await renderPage({ spec, base: "", cart: [] }, "/", new URLSearchParams())).html;
    for (const racine of ['class="tn tn-entete"', 'class="tn tn-pied tn-sombre"', 'class="tn tn-messages"', 'class="tn tn-panier-cote"']) expect(accueil.includes(racine), `${racine} présent sur l'accueil`).toBe(true);
    expect(accueil).not.toContain('class="tn tn-entete-arrivee"');
    expect(accueil).not.toContain('class="tn tn-pied-arrivee"');
    // Hors de Shopify (en-tête et pied posés une fois pour toutes les pages) : la feuille du site les retire des pages à coque.
    expect(entete).toMatch(new RegExp(`html body:has\\(\\[data-tn-coque\\]\\) :is\\((?:\\[data-es-type="es-custom-[a-z0-9]+"\\],?){${groupes.length}}\\)\\{display:none!important\\}\\n\\{% endstylesheet %\\}`));
    // Un site sans coque de page : aucune condition n'est posée (rien ne change pour lui).
    const t0 = ecrit(site());
    const sansCoque = customThemeSpec(t0, { name: "Boutique Essai", business: "products", products: [{ handle: "gourde-essai", title: "Gourde d'essai", categories: [] }], company: { shipping: "48 h", returns: "30 jours" }, assetExt: () => "jpg", linkMap: linkMap(t0), dropMissing: true, base: null });
    expect(Object.values(sansCoque.spec.customSections).some((c) => c.liquid.includes("tn_modele"))).toBe(false);
  }, 120_000);
});

describe("thème unique, intégration : la feuille d'un site complet ne tient pas dans une seule section", () => {
  it("elle est coupée entre deux règles, dans l'ordre ; la suite part dans le groupe d'en-tête, jamais retirée d'une page à coque", async () => {
    const { customThemeSpec, themeCss, themeCssParts, parseCss, FEUILLE_MAX } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection, validateSpec } = await import("@/lib/theme/ops");
    const { TENUE_SECTIONS } = await import("@/lib/syna-agent/custom-theme/tenue");
    const { linkMap } = await import("@/lib/syna-agent/custom-theme/render");
    // Un site d'essai très grand : une quarantaine de pièces différentes sur une page de plus.
    const pieces = TENUE_SECTIONS.filter((x) => !["en-tête", "pied de page", "recherche", "panier", "commande"].includes(x.role) && !["bandeau", "partout"].includes(x.group ?? "")).slice(0, 45).map((x) => x.id);
    const t = ecrit(S.applyStructure(S.applyStructure(site(), COQUE), [{ op: "page", key: "tout", label: "Tout" }, ...pieces.map((section) => ({ op: "add", page: "tout", section }) as const)]));
    const out = customThemeSpec(t, { name: "Boutique Essai", business: "products", products: [{ handle: "gourde-essai", title: "Gourde d'essai", categories: [] }], company: { shipping: "48 h", returns: "30 jours" }, assetExt: () => "jpg", linkMap: linkMap(t), dropMissing: true, base: null });
    const spec = out.spec;
    const suites = spec.groups.header.order.filter((k) => k.startsWith("tn-feuille-"));
    expect(suites.length, "la feuille de ce site demande au moins une section de suite").toBeGreaterThanOrEqual(1);
    expect(spec.groups.header.order.slice(-suites.length)).toEqual(suites.map((_k, i) => `tn-feuille-${i + 1}`));
    // Aucune section ne dépasse ce que le contrôle du Studio accepte (200 000 caractères ; Shopify : 256 Ko par fichier).
    for (const [type, c] of Object.entries(spec.customSections)) { expect(c.liquid.length, `${type} : taille`).toBeLessThan(200_000); if (type.startsWith("es-custom-feuille-") || type === `es-custom-${t.header!.uid}`) expect(validateCustomSection(c.liquid), `${type} : contrôle du Studio`).toBeNull(); }
    expect(validateSpec({ ...spec, templates: { ...spec.templates } }).filter((x) => /group:header/.test(x))).toEqual([]);
    // Les mêmes règles, dans le même ordre, que la feuille entière : le début dans l'en-tête, la suite dans les sections de suite.
    const roots = new Set(S.allSections(t).map((x) => /^<(?:section|footer|aside|div)\s+class="tn (tn-[a-z0-9-]+)/.exec(tenueSection(x.s.id)!.html)?.[1]).filter((x): x is string => !!x));
    const ligne = (r: { media: string | null; selector: string; body: string }) => `${r.media ?? ""}|${r.selector}|${r.body}`;
    const entiere = parseCss(themeCss(roots)).map(ligne);
    const parts = themeCssParts(roots, 20_000, FEUILLE_MAX);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.flatMap((x) => parseCss(x).map(ligne))).toEqual(entiere);
    const feuille = (l: string) => /\{% stylesheet %\}\n([\s\S]*?)\n\{% endstylesheet %\}/.exec(l)?.[1] ?? /<style>([\s\S]*?)<\/style>/.exec(l)?.[1] ?? "";
    const envoyee = [spec.customSections[`es-custom-${t.header!.uid}`].liquid, ...suites.map((k) => spec.customSections[spec.groups.header.sections[k].type].liquid)].flatMap((l) => parseCss(feuille(l)).map(ligne)).filter((x) => !x.includes("html body:has([data-tn-coque])")); // (la règle des pages à coque est posée à la fin de la feuille de l'en-tête)
    const debut = envoyee.indexOf(entiere[0]);
    expect(debut).toBeGreaterThanOrEqual(0);
    expect(envoyee.slice(debut, debut + entiere.length)).toEqual(entiere);
    // La suite de la feuille n'est jamais mise sous la condition des pages à coque (la page d'arrivée en a besoin).
    for (const k of suites) { const l = spec.customSections[spec.groups.header.sections[k].type].liquid; expect(l).not.toContain("tn_modele"); expect(l).toMatch(/^\{%- comment -%\}[^\n]*\n<style>/); }
    expect(spec.customSections[`es-custom-${t.header!.uid}`].liquid).toContain("tn_modele");
    expect(spec.customSections[`es-custom-${t.header!.uid}`].liquid).not.toContain("es-custom-feuille-");
    // Un petit site garde toute sa feuille dans l'en-tête : aucune section de suite.
    expect(themeCssParts(new Set(["tn-atouts"]), FEUILLE_MAX, FEUILLE_MAX)).toHaveLength(1);
  }, 120_000);
});

describe("thème unique, intégration : aperçu, données du site et remises (projet d'essai)", async () => {
  const { account, project } = await import("./conversation209-fixtures");
  const { saveBrand, loadProject } = await import("@/lib/projects");
  const { createProduct, listProducts } = await import("@/lib/products/catalog");
  const { saveCompany } = await import("@/lib/syna-agent/activity");
  const { renderCustomTheme, tenueSite, tenueProducts } = await import("@/lib/syna-agent/custom-theme/render");
  const D = await import("@/lib/syna-agent/custom-theme/tenue-data");
  const user = await account(), pid = await project(user);
  saveBrand(pid, F.FAUTEUIL_BRAND as never);
  createProduct(pid, { title: "Gourde d'essai", images: [], price: 3900, compareAt: 4500, productType: "Gourde isotherme", categories: ["Les gourdes"], options: [{ name: "Contenance", values: ["Petite", "Grande"] }], variants: [{ options: ["Petite"], price: 3400 }, { options: ["Grande"], price: 3900 }] } as never);
  createProduct(pid, { title: "Bouchon d'essai", images: [], price: 900, productType: "", categories: ["Les accessoires"] } as never);
  saveCompany(pid, { shipping: "Colissimo, 48 h", returns: "30 jours" });

  it("l'aperçu : la page d'arrivée affiche SA coque, avec le nom du vrai produit ; rien du site ne s'y pose", () => {
    const t = S.applyStructure(site(), COQUE);
    const html = sp(renderCustomTheme(loadProject(pid), t));
    const page = /<main class="tb-pg" data-pg="arrivee" data-coque[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? "";
    expect(page, "la page d'arrivée porte « data-coque »").not.toBe("");
    // SON en-tête ouvre la page, SON pied la ferme ; ils sont marqués en-tête et pied (désignation, logo).
    expect(page).toMatch(/^<section data-ct="[^"]+" data-ct-role="header"[^>]* class="tn tn-entete-arrivee"/);
    expect(page).toMatch(/<footer data-ct="[^"]+" data-ct-role="footer" data-tn-c="ligne" class="tn tn-pied-arrivee">(?:(?!<\/footer>)[\s\S])*<\/footer>$/);
    // Le nom du vrai produit dans « Découvrir … », le lien vers SA fiche.
    expect(page).toContain("Découvrir <span data-tn-produit-nom>Gourde d'essai</span>");
    expect(page).not.toContain("<span data-tn-produit-nom>le produit</span>");
    // Les autres pages n'ont pas de coque à elles ; l'en-tête et le pied du site restent posés une fois, hors des pages.
    expect(html).toMatch(/<main class="tb-pg" data-pg="home">/);
    expect((html.match(/class="tn tn-entete"/g) ?? []).length).toBe(1);
    expect((html.match(/class="tn tn-entete-arrivee"/g) ?? []).length).toBe(1);
    // La règle qui retire tout ce qui est du site quand la page est affichée, et la navigation qui la déclenche.
    expect(html).toContain(".tb-wrap[data-coque]>.frame>:not(.tb-pg){display:none!important}");
    expect(html).toContain('if(pg.hasAttribute("data-coque"))wrap.setAttribute("data-coque","");else wrap.removeAttribute("data-coque")');
    expect(html).toMatch(/<div class="tb-wrap ctw ctw-classique ctw-classique" data-tn-/); // l'accueil s'ouvre d'abord : pas de « data-coque » au départ
    // Une page d'arrivée affichée la première part déjà sans la coque du site.
    const seule = S.applyStructure(t, [{ op: "drop_page", key: "home" }, { op: "drop_page", key: "product" }]);
    expect(renderCustomTheme(loadProject(pid), seule)).toMatch(/<div class="tb-wrap ctw ctw-classique ctw-classique" data-coque/);
    // Pour regarder la page en image (hors contrôle) : INTEG_OUT=<dossier>.
    if (process.env.INTEG_OUT) { const fs = require("node:fs") as typeof import("node:fs"); fs.mkdirSync(process.env.INTEG_OUT, { recursive: true }); fs.writeFileSync(`${process.env.INTEG_OUT}/arrivee.html`, renderCustomTheme(loadProject(pid), seule)); }
  });

  it("SINA peut poser la coque : l'outil de composition accepte « page_shell », et une page « arrivee » la reçoit d'office", async () => {
    const T = await import("@/lib/syna-agent/custom-theme/tools");
    const structure = T.customThemeTools.find((x) => x.name === "custom.structure")!;
    expect(structure.args.safeParse({ ops: [{ op: "page_shell", page: "arrivee", slot: "header", section: "tn-entete-arrivee" }] }).success).toBe(true);
    expect(structure.args.safeParse({ ops: [{ op: "page_shell", page: "arrivee", slot: "search", section: "tn-entete-arrivee" }] }).success).toBe(false);
    expect(structure.description).toContain("page_shell");
    expect(["arrivee", "arrivee-ete"].every(T.isArrivee)).toBe(true);
    expect(["home", "arrivees", "shop-arrivee"].some(T.isArrivee)).toBe(false);
  });

  it("la lecture du catalogue de vente est dans les données du site (« tenueSite »), plus dans celles des métiers", () => {
    const t = site();
    const d = tenueSite(loadProject(pid), t, tenueProducts(pid, t), []);
    expect(JSON.parse(sp(JSON.stringify(d.vitrine)))).toEqual(JSON.parse(sp(JSON.stringify(D.tenueVitrine(pid)))));
    expect(sp(d.vitrine!.produits!["Gourde d'essai"].compare!)).toBe("45 €");
    expect(d.vitrine!.produits!["Gourde d'essai"]).toMatchObject({ genre: "Gourde isotherme", versions: 2 });
    expect(D.tenueMetiers(pid)).toEqual({ biens: [], carte: [], reseaux: [] }); // (les comptes du client sur les réseaux suivent le même chemin : module « partitions »)
    expect(D.tenueMetiers(pid)).not.toHaveProperty("vitrine");
  });

  it("les remises : la preuve lue dans la boutique l'emporte sur la déclaration du client, dans les deux sens", async () => {
    const { saveShopOffers, loadShopOffers } = await import("@/lib/syna-agent/product-features");
    const I = await import("@/lib/syna-agent/custom-theme/install");
    const now = Date.now();
    saveShopOffers(pid, { quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }] }, remisesConfirmees: true });
    const offre = I.offreDuSite(pid, loadShopOffers(pid), null)!;
    expect(Object.keys(offre.produits).sort()).toEqual(listProducts(pid).map((p) => p.handle).sort());
    const bonne: R.PreuveRemises = { plateforme: "woocommerce", empreinte: offre.empreinte, actif: true, manque: [], luLe: now };
    // La règle seule (sans base) : déclaration faute de preuve ; la preuve ensuite, quelle que soit la déclaration.
    expect(R.indicateurRemises(offre, null, true)).toMatchObject({ ok: true, source: "declaration" });
    expect(R.indicateurRemises(offre, null, false)).toMatchObject({ ok: false, source: "declaration" });
    expect(R.indicateurRemises(offre, bonne, false, { maintenant: now })).toMatchObject({ ok: true, source: "preuve" });
    expect(R.indicateurRemises(offre, { ...bonne, actif: false, empreinte: null, manque: ["remise absente"] }, true, { maintenant: now })).toMatchObject({ ok: false, source: "preuve" });
    expect(R.indicateurRemises(offre, { ...bonne, empreinte: "autre" }, true, { maintenant: now })).toMatchObject({ ok: false, source: "preuve" });
    expect(R.indicateurRemises(offre, bonne, true, { maintenant: now + 25 * 3600_000 })).toMatchObject({ ok: false, source: "preuve" });
    // Dans le projet : rien n'a été lu → la déclaration du client.
    expect(I.preuveRemises(pid)).toBeNull();
    expect(I.remisesDuProjet(pid, loadShopOffers(pid), null, now)).toMatchObject({ ok: true, source: "declaration" });
    // La mise en boutique : la pièce des offres par quantité part avec la déclaration, ne part plus quand la boutique dit non.
    const t = ecrit(S.applyStructure(site(), [{ op: "add", page: "product", section: "tn-lots" }]));
    S.saveCustomTheme(pid, t);
    const lots = t.pages.find((p) => p.key === "product")!.sections.find((s) => s.id === "tn-lots")!.uid;
    const avant = I.customThemeExport(pid, { dropMissing: true });
    expect(Object.keys(avant.spec.customSections)).toContain(`es-custom-${lots}`);
    I.gardePreuveRemises(pid, { plateforme: "woocommerce", empreinte: null, actif: false, manque: ["les règles ne sont pas posées"], luLe: Date.now() });
    expect(I.preuveRemises(pid)).toMatchObject({ actif: false });
    const refuse = I.customThemeExport(pid, { dropMissing: true });
    expect(Object.keys(refuse.spec.customSections)).not.toContain(`es-custom-${lots}`);
    expect(refuse.problems.some((x) => x.level === "à savoir" && /^Remises : Les remises ne sont pas en place dans la boutique : les règles ne sont pas posées/.test(x.text))).toBe(true);
    // La boutique dit oui : la pièce part, même si le client n'a rien déclaré.
    saveShopOffers(pid, { remisesConfirmees: false });
    I.gardePreuveRemises(pid, { ...bonne, luLe: Date.now() });
    const tenue = I.customThemeExport(pid, { dropMissing: true });
    expect(Object.keys(tenue.spec.customSections)).toContain(`es-custom-${lots}`);
    expect(tenue.problems.some((x) => /^Remises : /.test(x.text) && /ne part/.test(x.text))).toBe(false);
  }, 120_000);

  it("l'outil « shop.discounts_check » : interroge la boutique reliée, garde sa réponse, dit ce qui manque ; Shopify sans accès : le pas à pas", async () => {
    const { getTool } = await import("@/lib/syna-agent/registry");
    const { discountsDeps } = await import("@/lib/syna-agent/tools/offers");
    const { saveShopOffers, loadShopOffers } = await import("@/lib/syna-agent/product-features");
    const I = await import("@/lib/syna-agent/custom-theme/install");
    const { run } = await import("@/lib/db");
    const { encrypt } = await import("@/lib/secrets");
    const tool = getTool("shop.discounts_check")!;
    expect(tool, "outil au registre").toBeTruthy();
    expect(tool.kind).toBe("read");
    expect(tool.estimate, "gratuit").toBeUndefined();
    const ctx = { user, projectId: pid, conversationId: "c", runId: "r", attachment: () => null };
    saveShopOffers(pid, { quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }] }, remisesConfirmees: false });
    const offre = I.offreDuSite(pid, loadShopOffers(pid), (await import("@/lib/projects")).currentTheme(pid)?.spec ?? null)!;
    // Shopify, boutique non reliée : le pas à pas exact, rien n'est confirmé.
    run("UPDATE projects SET platform='shopify' WHERE id=?", pid);
    const sans = await tool.run(ctx, {});
    expect(sans.ok).toBe(true);
    expect(sans.summary).toMatch(/n'est pas reliée/);
    expect((sans.data as { confirmees: boolean; guide: string[] }).confirmees).toBe(false);
    expect((sans.data as { guide: string[] }).guide).toEqual(R.guideRemisesShopify(offre, Object.fromEntries(listProducts(pid).map((p) => [p.handle, p.data.title]))));
    expect((sans.data as { guide: string[] }).guide.length).toBeGreaterThan(1);
    // WooCommerce, boutique non reliée : dit simplement.
    run("UPDATE projects SET platform='woocommerce' WHERE id=?", pid);
    expect((await tool.run(ctx, {})).summary).toMatch(/La boutique WooCommerce du client n'est pas reliée/);
    // Boutique reliée (simulée) : la boutique répond « pas en place », puis « en place ».
    (await import("@/lib/products/sync")).listStores(pid); // crée la table des boutiques reliées
    run("INSERT INTO platform_stores (id, project_id, user_id, platform, url, store, credentials, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", `st-${pid}`, pid, user.id, "woocommerce", "https://boutique-essai.example", "boutique-essai.example", encrypt("{}")!, Date.now(), Date.now());
    const vrai = { ...discountsDeps };
    const appels: string[] = [];
    try {
      discountsDeps.preuve = async (plateforme, url) => { appels.push(`${plateforme} ${url}`); return { plateforme, empreinte: null, actif: false, manque: ["les produits de l'offre ne sont pas publiés"], luLe: Date.now() }; };
      const non = await tool.run(ctx, {});
      expect(appels).toEqual(["woocommerce https://boutique-essai.example"]);
      expect(non.summary).toMatch(/Les remises ne sont pas encore en place dans la boutique WooCommerce : .*les produits de l'offre ne sont pas publiés/);
      expect(non.data).toMatchObject({ confirmees: false, manque: ["les produits de l'offre ne sont pas publiés"] });
      expect(I.remisesDuProjet(pid, loadShopOffers(pid), null)).toMatchObject({ ok: false, source: "preuve" });
      discountsDeps.preuve = async (plateforme) => ({ plateforme, empreinte: offre.empreinte, actif: true, manque: [], luLe: Date.now() });
      const oui = await tool.run(ctx, {});
      expect(oui.summary).toMatch(/sont en place dans la boutique WooCommerce/);
      expect(oui.data).toMatchObject({ confirmees: true });
      // La réponse de la boutique est gardée : la mise en boutique s'en sert, alors que le client n'a rien déclaré.
      expect(loadShopOffers(pid).remisesConfirmees).toBe(false);
      expect(I.remisesDuProjet(pid, loadShopOffers(pid), (await import("@/lib/projects")).currentTheme(pid)?.spec ?? null)).toMatchObject({ ok: true, source: "preuve" });
      // Une boutique qui ne répond pas vaut « non confirmé », jamais une erreur montrée au client.
      discountsDeps.preuve = async () => { throw new Error("la boutique ne répond pas"); };
      expect((await tool.run(ctx, {})).data).toMatchObject({ confirmees: false, manque: ["la boutique ne répond pas"] });
    } finally { Object.assign(discountsDeps, vrai); }
    // Sans aucune remise dans les offres : rien à vérifier, la boutique n'est pas interrogée.
    saveShopOffers(pid, { quantity: null });
    expect((await tool.run(ctx, {})).summary).toMatch(/rien à vérifier/);
  }, 120_000);
});
