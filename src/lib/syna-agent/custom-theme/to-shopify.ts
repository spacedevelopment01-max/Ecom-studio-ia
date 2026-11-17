/**
 * Mise en boutique Shopify d'un thème sur mesure à tenue (13 novembre 2026 ; question du propriétaire : « comment tu
 * vas vraiment construire tout le site complètement » ; avant ce jour, le thème sur mesure ne partait pas dans Shopify).
 *
 * Le thème sur mesure devient une VERSION DE THÈME du Studio (ThemeSpec), que le Studio sait déjà exporter en ZIP et
 * envoyer à Shopify : chaque section devient une section Shopify « es-custom-… » avec son HTML, sa part de la feuille
 * de la tenue, et de VRAIES fonctions à la place des exemples (prix, photos et stock lus dans la boutique, ajout au
 * panier, panier, formulaire de contact, recherche, liens vers les vraies pages). Chaque page devient un modèle
 * (accueil, fiche produit commune, une fiche par produit, collection, panier, pages, page introuvable).
 *
 * Gratuit, sans IA. Rien d'inventé ne part en boutique : une information « [À compléter] » bloque la mise en boutique
 * (elle est listée au client), ou est retirée avec son accord ; une photo d'exemple bloque toujours.
 * Le paiement rapide (Shop Pay, Apple Pay…) est celui de Shopify, posé sous le bouton d'achat quand la boutique l'a activé.
 * Page boutique : vrais produits de la collection, vrais filtres de la boutique (ceux que Shopify propose), tri, pages
 * suivantes ; le journal, l'article et la recherche lisent la boutique ; tout formulaire devient un vrai formulaire de
 * contact, chaque champ avec son nom. Aucun script ne part : ce qui en demandait un dans l'aperçu (filtre immédiat,
 * minuteur, nom géant ajusté) a sa forme sans script.
 * Limites connues, dites au client : sections d'avant la tenue non converties ; le compte client est celui de Shopify ;
 * le bandeau de cookies est celui de Shopify ; la barre d'achat collée n'est pas envoyée ; le menu est posé tel qu'il a
 * été calculé (il ne suit pas encore les menus de la boutique) ; les avis demandent une application d'avis.
 */
import fs from "node:fs";
import path from "node:path";
import type { ThemeSpec, StorePage, StoreCollection, TemplateJson } from "../../theme/spec";
import { LIBRARY_DIR, libSection, withoutExamplePhotos } from "./library";
import { TENUE_FILES, TENUE_SECTIONS, coupe, isTenueSection, repere, tenueAttrs, tenueCss, tenueSection, validConstruction, withTenuePrestations, type TenuePrestation } from "./tenue";
import { isHeaderRoot, withMenu } from "./menu";
import { venteBoutique, withAchatId, withAchatOptions, withTenueComparison, withTenueFamilies, withTenueSite, type TenueSite } from "./tenue-data";
import { allSections, drawerOf, hasCoque, sectionHtml, type CtPage, type CtSection, type CustomTheme } from "./theme";
import { freeShippingFrom, type ShopOffers } from "../product-features";

export type ExportProblem = { level: "bloquant" | "à savoir"; text: string };
export type ExportProduct = { handle: string; title: string; categories: string[]; /** Ses options au catalogue (« Couleur », « Taille ») : la liste de choix de la boutique les porte ; une phrase d'option écrite qui les double ne part pas. */ options?: { name: string; values: string[] }[] };
export type ExportInput = {
  name: string;
  palette?: { dark?: string; primary?: string; secondary?: string; accent?: string; light?: string } | null;
  fonts?: { heading?: string | null; body?: string | null } | null;
  business: "products" | "services";
  products: ExportProduct[];
  prestations?: TenuePrestation[];
  company?: { shipping?: string | null; returns?: string | null };
  /** Graisse des titres d'une tenue « gras », quand la police de la marque en a une forte (voir titleWeight). */
  titleWeight?: number | null;
  /** Mentions vraies à dire près du prix (indice de réparabilité, paiement en plusieurs fois), confirmées par le client. */
  priceNotes?: string[];
  /** Coordonnées, horaires et zone du client : écrits tels quels dans les pages (téléphone, adresse, plan). */
  site?: Pick<TenueSite, "phone" | "address" | "hours" | "area"> & Partial<Pick<TenueSite, "addressDiscreet">> & Partial<Pick<TenueSite, "biens" | "carte" | "vitrine">>;
  /** Extension du fichier d'un média de la bibliothèque (« jpg », « png »), ou null s'il n'existe plus. */
  assetExt: (assetId: string) => string | null;
  /** Texte de bouton ou de lien → clé de page (les liens écrits pour la marque, comme dans l'aperçu). */
  linkMap: Record<string, string>;
  /** Logo de la marque (média de la bibliothèque), s'il existe. */
  logoAssetId?: string | null;
  /** Avec l'accord du client : les informations encore « [À compléter] » sont retirées au lieu de bloquer. */
  dropMissing?: boolean;
  /** Offres saisies par le client (shop.offers) : packs, lots, seuil de stock, promotion datée, fenêtre d'offre, remises confirmées. */
  offres?: ShopOffers | null;
  /** Thème du projet déjà en place : ses réglages et sa boutique servent de base. */
  base?: ThemeSpec | null;
};
export type ShopifyExport = { spec: ThemeSpec; problems: ExportProblem[]; templates: string[]; sections: number; productSuffixes: Record<string, string> };

// ---------------------------------------------------------------- la feuille, découpée par section

type Rule = { media: string | null; selector: string; body: string };
/** Règles d'une feuille (un seul niveau de @media) ; les commentaires sont retirés. */
export function parseCss(css: string): Rule[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Rule[] = [];
  const walk = (text: string, media: string | null) => {
    let i = 0;
    while (i < text.length) {
      const open = text.indexOf("{", i);
      if (open < 0) break;
      const prelude = text.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (j < text.length && depth) { if (text[j] === "{") depth++; else if (text[j] === "}") depth--; j++; }
      const inner = text.slice(open + 1, j - 1);
      // Règles sous condition (« @media », « @supports ») : gardées avec leur condition.
      if (/^@(?:media|supports)\b/.test(prelude)) walk(inner, media ? `${media}{${prelude}` : prelude);
      else if (prelude && !prelude.startsWith("@")) out.push({ media, selector: prelude.replace(/\s+/g, " "), body: inner.trim() });
      i = j;
    }
  };
  walk(src, null);
  return out;
}
/** Sélecteurs d'une liste, coupés aux virgules de premier niveau (jamais dans « :is(…) »). */
const selectors = (list: string): string[] => { const out: string[] = []; let depth = 0, cur = ""; for (const ch of list) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
const rootOf = (html: string) => /^<(?:section|footer|aside|div)\s+class="tn (tn-[a-z0-9-]+)/.exec(html)?.[1] ?? null;
let sheets: { rule: Rule; root: string | null }[] | null = null;
/**
 * La feuille de la tenue, règle par règle, DANS L'ORDRE D'ORIGINE, chacune avec la section à laquelle elle appartient
 * (sa classe racine), ou null pour le socle commun. L'ordre compte : à force égale, la dernière règle l'emporte, et la
 * boutique doit donner le même résultat que l'aperçu.
 */
export function tenueSheets() {
  if (sheets) return sheets;
  const roots = new Set(TENUE_SECTIONS.map((s) => rootOf(s.html)).filter((x): x is string => !!x));
  const out: { rule: Rule; root: string | null }[] = [];
  for (const f of TENUE_FILES.css) {
    let css = ""; try { css = fs.readFileSync(path.join(LIBRARY_DIR(), f), "utf8"); } catch { continue; }
    for (const r of parseCss(css)) for (const sel of selectors(r.selector)) {
      const mine = [...new Set([...sel.matchAll(/\.(tn-[a-z0-9-]+)/g)].map((m) => m[1]).filter((c) => roots.has(c)))];
      out.push({ rule: { media: r.media, selector: sel, body: r.body }, root: mine.length === 1 ? mine[0] : null });
    }
  }
  return (sheets = out);
}
/** La feuille d'un thème : le socle et les règles des seules sections qu'il utilise, dans l'ordre d'origine. */
export const themeCss = (roots: Set<string>) => cssText(tenueSheets().filter((x) => x.root === null || roots.has(x.root)).map((x) => x.rule));
/**
 * La feuille d'un thème en morceaux, coupée entre deux règles, dans l'ordre d'origine : le premier d'au plus « first »
 * caractères, les suivants d'au plus « max ». Une section de Shopify ne dépasse pas 256 Ko, et le contrôle du Studio
 * refuse une section de plus de 200 000 caractères : un site complet (plus de vingt pièces différentes) a une feuille
 * plus longue que cela. Un seul morceau : toute la feuille tient dans l'en-tête.
 */
export function themeCssParts(roots: Set<string>, first: number, max: number): string[] {
  const rules = tenueSheets().filter((x) => x.root === null || roots.has(x.root)).map((x) => x.rule);
  const out: string[] = [];
  let cur: Rule[] = [], size = 0, limit = Math.max(first, 1), media: string | null = null;
  for (const r of rules) {
    const n = r.selector.length + r.body.length + 3 + (r.media && (r.media !== media || !cur.length) ? r.media.length + 6 : 0);
    if (cur.length && size + n > limit) { out.push(cssText(cur)); cur = []; size = 0; limit = max; }
    cur.push(r); size += n; media = r.media;
  }
  if (cur.length || !out.length) out.push(cssText(cur));
  return out;
}
/**
 * Taille de la feuille portée par une seule section (l'en-tête avec son HTML, puis chaque section de suite) : sous les
 * 200 000 caractères du contrôle du Studio, avec de la marge pour ce qui s'ajoute après (condition des pages à coque,
 * lien du panier de côté). Un site dont la feuille tenait dans l'en-tête y tient toujours.
 */
export const FEUILLE_MAX = 190_000;
/** Règles réécrites en texte, les @media regroupés à la suite, dans l'ordre d'origine. */
export function cssText(rules: Rule[]): string {
  const out: string[] = [];
  let media: string | null = null, buf: string[] = [];
  const flush = () => { if (!buf.length) return; out.push(media ? `${media}{${buf.join("")}}${"}".repeat((media.match(/\{@/g) ?? []).length)}` : buf.join("\n")); buf = []; };
  for (const r of rules) { if (r.media !== media) { flush(); media = r.media; } buf.push(`${r.selector}{${r.body}}`); }
  flush();
  return out.join("\n");
}

// ---------------------------------------------------------------- du HTML de l'aperçu au Liquid de la boutique

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "x";
/** Un texte du client ne doit jamais être lu comme du Liquid. */
const literal = (html: string) => html.replace(/\{\{|\{%/g, (m) => `{{ '${m}' }}`);
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Modèle Shopify d'une page du thème, ou null (page tenue par Shopify : le compte client). */
/**
 * Noms clairs des modèles (demande du propriétaire, 16 novembre 2026 : Shopify range les modèles par catégorie — Produits,
 * Collections, Pages — et montre leur nom dans son éditeur et dans « Modèle de thème » de chaque produit, page ou
 * collection). Une clé de page interne devient un nom en français simple, qui sert aussi d'adresse de la page.
 */
const PAGE_NAMES: Record<string, string> = { about: "a-propos", legal: "informations-legales", faq: "questions", aide: "aide", contact: "contact", prestations: "prestations", reservation: "reservation", devis: "devis", journal: "journal", biens: "nos-biens", bien: "fiche-bien", visite: "demande-de-visite", carte: "la-carte", ateliers: "ateliers", inscription: "inscription", "bien-recu": "bien-recu" };
export const pageName = (key: string): string => PAGE_NAMES[key] ?? key;
/** Page de collection dessinée pour UNE famille de produits : clé « shop-<famille> » → modèle « collection.<famille> ». */
export const collectionOf = (key: string): string | null => (/^shop-[a-z0-9-]{1,40}$/.test(key) ? key.slice(5) : null);
export function templateOf(pg: Pick<CtPage, "key" | "product"> & { sections?: { id: string }[] }, first: boolean): string | null {
  const has = (id: string) => (pg.sections ?? []).some((s) => s.id === id);
  if (pg.key === "home") return "index";
  // Pages que la boutique remplit elle-même : la liste des articles, un article, les résultats d'une recherche.
  if (has("tn-journal")) return "blog";
  if (has("tn-article")) return "article";
  if (has("tn-resultats")) return "search";
  // Boutique fermée : c'est la page « mot de passe » de la boutique.
  if (has("tn-fermee") && pg.key !== "home") return "password";
  if (pg.key === "product") return "product";
  if (/^product-/.test(pg.key)) return `product.${suffixOf(pg)}`;
  if (pg.key === "shop") return "collection";
  if (collectionOf(pg.key)) return `collection.${collectionOf(pg.key)}`;
  if (pg.key === "cart") return "cart";
  if (pg.key === "404") return "404";
  if (pg.key === "compte") return null;
  void first;
  return `page.${pageName(pg.key)}`;
}
/** Suffixe du modèle de la fiche propre à un produit (« product.<suffixe> »). */
export const suffixOf = (pg: Pick<CtPage, "key" | "product">) => `fiche-${slug(pg.product ?? pg.key.replace(/^product-/, ""))}`.slice(0, 50).replace(/-+$/, "");

type Ctx = { input: ExportInput; t: CustomTheme; files: Record<string, string>; problems: ExportProblem[]; page: CtPage | null; template: string | null; /** Suite de la feuille du site, quand elle ne tient pas dans l'en-tête (remplie en convertissant l'en-tête). */ suite: string[]; /** Classes racines des sections du thème (leur feuille part avec l'en-tête). */ roots: Set<string> };

/** Adresse réelle d'une destination de l'aperçu (clé de page, « shop:Famille », « legal:cgv »). */
function urlOf(c: Ctx, to: string): string {
  const [key, ...rest] = to.split(":"), arg = rest.join(":");
  const pg = c.t.pages.find((p) => p.key === key);
  if (key === "home") return "{{ routes.root_url }}";
  if (key === "shop") return arg ? `{{ routes.collections_url }}/${slug(arg)}` : "{{ routes.all_products_collection_url }}";
  if (key === "cart") return "{{ routes.cart_url }}";
  if (key === "compte") return "{{ routes.account_url }}";
  if (key === "p" && arg) return `{{ routes.root_url }}products/${slug(arg)}`;
  if (pg && templateOf(pg, false) === "blog") return "{{ routes.root_url }}blogs/journal";
  if (pg && templateOf(pg, false) === "article") return "{{ routes.root_url }}blogs/journal";
  if (pg && templateOf(pg, false) === "search") return "{{ routes.search_url }}";
  if (key === "product") { const h = pg?.product ?? c.input.products[0]?.handle; return h ? `{{ routes.root_url }}products/${h}` : "{{ routes.all_products_collection_url }}"; }
  if (pg?.product) return `{{ routes.root_url }}products/${pg.product}`;
  if (pg && collectionOf(key)) return `{{ routes.collections_url }}/${collectionOf(key)}`;
  if (pg && key !== "404") return `{{ routes.root_url }}pages/${pageName(key)}`;
  return "{{ routes.root_url }}";
}

/** Photos : un média de la bibliothèque devient un fichier du thème ; une photo d'exemple bloque. */
function photos(c: Ctx, html: string, where: string): string {
  let out = html.replace(/\/api\/files\/([\w-]+)/g, (_m, id: string) => {
    const ext = c.input.assetExt(id);
    if (!ext) { c.problems.push({ level: "bloquant", text: `${where} : une photo n'existe plus dans tes Fichiers` }); return ""; }
    const file = `tn-${id}.${ext}`; c.files[file] = id;
    return `{{ '${file}' | asset_url }}`;
  });
  if (/photos\/[\w.-]+\.(?:webp|png|jpe?g)/.test(out)) { c.problems.push({ level: "bloquant", text: `${where} : il reste une photo d'exemple (aucune ne part en boutique)` }); out = withoutExamplePhotos(out, c.input.palette); }
  return out;
}

/** Liens de l'aperçu → vraies adresses. Un lien sans destination connue mène à l'accueil, et c'est dit. */
function links(c: Ctx, html: string, where: string): string {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/g, (m, attrs: string, inner: string) => {
    if (!/href="#"/.test(attrs)) return m;
    const go = /\sdata-go="([^"]+)"/.exec(attrs)?.[1] ?? c.input.linkMap[strip(inner).replace(/[→↗]/g, "").trim()] ?? null;
    if (!go) c.problems.push({ level: "à savoir", text: `${where} : le lien « ${strip(inner).slice(0, 40)} » n'a pas de destination, il mène à l'accueil` });
    const clean = attrs.replace(/\s(?:onclick="return false"|data-go="[^"]*")/g, "").replace(/href="#"/, `href="${go ? urlOf(c, go) : "{{ routes.root_url }}"}"`);
    return `<a${clean}>${inner}</a>`;
  });
}

/** Informations encore « [À compléter] » : listées (elles bloquent), ou retirées avec l'accord du client. */
function missing(c: Ctx, html: string, where: string): string {
  const found = [...html.matchAll(/\[À compléter(?:\s*:\s*([^\]<]{1,80}))?\]/g)].map((m) => (m[1] ?? "une information").trim());
  if (!found.length) return html;
  if (!c.input.dropMissing) { c.problems.push({ level: "bloquant", text: `${where} : à compléter : ${[...new Set(found)].join(", ")}` }); return html; }
  c.problems.push({ level: "à savoir", text: `${where} : retiré faute d'information : ${[...new Set(found)].join(", ")}` });
  // D'abord la seule ligne qui porte l'information (entre deux retours à la ligne) : la phrase d'à côté reste.
  let out = html.replace(/<br\s*\/?>[^<]*\[À compléter[^\]]*\][^<]*/g, "").replace(/(>)[^<>]*\[À compléter[^\]]*\][^<]*<br\s*\/?>/g, "$1");
  const has = (x: string) => /\[À compléter/.test(x);
  /** Éléments d'un contenu, quand il n'est fait que d'éléments à la suite (sinon : aucun). */
  const kidsOf = (inside: string) => { const kids = inside.match(/<([a-z0-9]+)\b[^>]*>(?:(?!<\/\1>)[\s\S])*?<\/\1>/g) ?? []; return kids.join("") === inside.trim() ? kids : []; };
  // Dans une ligne riche (trois éléments ou plus : un nom, sa description, un détail), seul l'élément qui porte
  // l'information manquante part : la ligne garde son nom et sa description.
  out = out.replace(/<(li|tr)\b([^>]*)>((?:(?!<\/?\1\b)[\s\S])*?)<\/\1>/g, (m, tag: string, attrs: string, inside: string) => {
    if (!has(inside)) return m;
    const kids = kidsOf(inside), keep = kids.filter((k) => !has(k));
    const texts = keep.filter((k) => strip(k.replace(/<svg[\s\S]*?<\/svg>/g, "")).length > 0 && !/^<a\b/.test(k));
    return kids.length >= 3 && texts.length >= 2 ? `<${tag}${attrs}>${keep.join("")}</${tag}>` : m;
  });
  // Une paire « nom, valeur » dont la valeur manque part en entier (jamais un nom laissé seul).
  out = out.replace(/<(div|p)\b[^>]*>((?:(?!<\/?\1\b)[\s\S])*?)<\/\1>/g, (m, _tag: string, inside: string) => (has(inside) && kidsOf(inside).length === 2 ? "" : m));
  // Puis la ligne qui la porte (ligne de liste ou de tableau, volet), puis le plus petit élément (paragraphe, mention).
  for (const tags of ["li|tr|details", "p|small|figcaption|td|span|i|b|em|address|blockquote|cite"]) {
    const rx = new RegExp(`<(${tags})\\b[^>]*>(?:(?!<\\/?\\1\\b)[\\s\\S])*?\\[À compléter[^\\]]*\\](?:(?!<\\/?\\1\\b)[\\s\\S])*?<\\/\\1>`);
    for (let n = 0; n < 200 && rx.test(out); n++) out = out.replace(rx, "");
  }
  // Une liste ou un tableau vidés disparaissent avec leurs lignes (un tableau réduit à son en-tête aussi).
  for (let n = 0; n < 6; n++) out = out.replace(/<(ul|ol|table|tbody|dl)\b[^>]*>\s*<\/\1>/g, "").replace(/<table\b[^>]*>\s*<thead>(?:(?!<\/thead>)[\s\S])*<\/thead>\s*<\/table>/g, "");
  return out.replace(/\[À compléter[^\]]*\]/g, "");
}

/** Inscription à la lettre : ces sections n'envoient qu'une adresse e-mail. */
const NEWSLETTER = new Set(["tn-infolettre", "tn-infolettre-photo", "tn-pied-complet", "tn-pied-lettre", "tn-fermee"]);
/**
 * Un formulaire de l'aperçu devient un vrai formulaire de la boutique : l'inscription à la lettre (un client « newsletter »),
 * sinon un message de contact dont chaque champ porte son nom en clair (« Le jour souhaité », « La prestation »…), pour
 * que le professionnel lise la demande telle qu'elle a été remplie.
 */
function forms(html: string, root: string | null): string {
  const v = vous(html);
  return html.replace(/<form\b([^>]*?)\sonsubmit="return false"([^>]*)>([\s\S]*?)<\/form>/g, (_m, a1: string, a2: string, inner: string) => {
    let n = 0;
    const cls = /class="([^"]*)"/.exec(`${a1}${a2}`)?.[1] ?? "";
    const field = (label: string, c = "") => {
      const name = `contact[${attr(strip(label)).slice(0, 60) || `champ ${++n}`}]`, text = attr(strip(label));
      if (/tn-haut/.test(c) || /message|demande|précis|projet|besoin/i.test(label)) return `<textarea class="tn-champ-i tn-haut" name="contact[body]" placeholder="${text}" aria-label="${text}" required></textarea>`;
      const type = /e-?mail|courriel/i.test(label) ? "email" : /téléphone|numéro/i.test(label) ? "tel" : "text";
      return `<input class="tn-champ-i" type="${type}" name="${type === "email" ? "contact[email]" : name}" placeholder="${text}" aria-label="${text}"${type === "email" ? " required" : ""}>`;
    };
    /** Nom d'un vrai champ : son étiquette (le texte qui le précède ou le suit dans son « label »), sinon son nom d'origine. */
    const named = (block: string, fallback?: string) => block.replace(/<(input|select|textarea)\b([^>]*)>/g, (f, tag: string, a: string) => {
      if (/type="(?:submit|button|hidden)"/.test(a)) return f;
      const own = /\sname="([^"]*)"/.exec(a)?.[1], radio = /type="(?:radio|checkbox)"/.test(a);
      const label = fallback ?? /(?:aria-label|placeholder)="([^"\s][^"]*)"/.exec(a)?.[1] ?? own ?? `champ ${++n}`;
      const email = /type="email"/.test(a);
      const rest = a.replace(/\sname="[^"]*"/, "");
      return `<${tag}${rest} name="${email ? "contact[email]" : `contact[${attr(strip(label)).slice(0, 60)}]`}"${radio && !/\svalue=/.test(a) ? ' value="oui"' : ""}>`;
    });
    let body = inner
      // Champs dessinés (une étiquette seule) → vrais champs.
      .replace(/<label(\s+class="([^"]*)")?>((?:(?!<\/label>|<input|<select|<textarea)[\s\S])*?)<\/label>/g, (_l, _c, c: string | undefined, label: string) => field(label, c ?? ""))
      // Un groupe de choix (« Plutôt : le matin, l'après-midi ») : tous ses boutons portent le nom du groupe.
      .replace(/<div class="tn-moment[^"]*"[^>]*aria-label="([^"]*)"[^>]*>[\s\S]*?<\/div>/g, (g, label: string) => named(g, label))
      // Vrais champs dans leur étiquette : le texte de l'étiquette devient leur nom.
      .replace(/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*?<\/label>/g, (l) => (/name="contact\[/.test(l) ? l : named(l, strip(l.replace(/<(select)\b[\s\S]*?<\/\1>/g, " ")) || undefined)))
      // Les champs qui restent.
      .replace(/<(input|select|textarea)\b((?:(?!\sname="contact\[)[^>])*)>/g, (f) => named(f))
      .replace(/<a class="tn-bt"[^>]*>([\s\S]*?)<\/a>/, (_a, label: string) => `<button class="tn-bt" type="submit">${label}</button>`);
    const open = (kind: string) => `{%- form '${kind}'${cls ? `, class: '${cls}'` : ""} -%}`;
    if (root && NEWSLETTER.has(root)) return `${open("customer")}<input type="hidden" name="contact[tags]" value="newsletter">{%- if form.posted_successfully? -%}<p class="tn-ok">C'est noté. Merci.</p>{%- endif -%}${body}{%- endform -%}`;
    if (!/name="contact\[email\]"/.test(body)) body = body.replace(/(<button\b[^>]*type="submit")/, `<input class="tn-champ-i" type="email" name="contact[email]" placeholder="${v ? "Votre e-mail" : "Ton e-mail"}" aria-label="${v ? "Votre e-mail" : "Ton e-mail"}" required>$1`);
    return `${open("contact")}{%- if form.posted_successfully? -%}<p class="tn-ok">${v ? "Demande envoyée. Merci." : "C'est envoyé. Merci."}</p>{%- endif -%}{%- if form.errors -%}<p class="tn-ok">${v ? "Vérifiez l'adresse e-mail, puis renvoyez le message." : "Vérifie l'adresse e-mail, puis renvoie le message."}</p>{%- endif -%}${body}{%- endform -%}`;
  });
}

const SHOP_CARD = `<a class="tn-carte-p{% unless product.available %} tn-epuise{% endunless %}{% unless product.featured_image %} tn-sans-photo{% endunless %}" href="{{ product.url }}">{% if product.featured_image %}<div class="tn-ph" style="background-image:url({{ product.featured_image | image_url: width: 800 }})"></div>{% endif %}<b>{{ product.title }}</b><span>{{ product.price | money }}</span>{% unless product.available %}<em>Épuisé</em>{% endunless %}</a>`;
const CARD = (limit: string, source: string) => `<div class="tn-cartes">{%- for product in ${source} ${limit} -%}<a class="tn-carte-p{% unless product.available %} tn-epuise{% endunless %}{% unless product.featured_image %} tn-sans-photo{% endunless %}" href="{{ product.url }}">{% if product.featured_image %}<div class="tn-ph" style="background-image:url({{ product.featured_image | image_url: width: 800 }})"></div>{% endif %}<b>{{ product.title }}</b><span>{% if product.available %}{{ product.price | money }}{% else %}Épuisé{% endif %}</span></a>{%- endfor -%}</div>`;

/** La marque vouvoie-t-elle ? (les quelques phrases que la boutique ajoute suivent la voix de la section) */
const vous = (html: string) => /\b(?:votre|vos|vous)\b/i.test(strip(html)) && !/\b(?:ton|ta|tes|toi)\b/i.test(strip(html));

/** Sections qui montrent des données de la boutique : l'exemple laisse la place aux vraies données, lues en direct. */
function live(c: Ctx, html: string, root: string | null): string {
  let out = html;
  const v = vous(html);
  // Page boutique à tenue : les produits de la collection, les filtres de la boutique, le tri, les pages suivantes.
  if (root === "tn-catalogue" && /\sdata-tn-produits\b/.test(out)) {
    const shop = c.template === "collection", src = shop ? "collection" : "collections.all";
    const families = [...new Set(c.input.products.flatMap((p) => p.categories.map((x) => x.trim()).filter(Boolean)))];
    const famLinks = families.length >= 2 ? `<fieldset><legend>Famille</legend><a href="{{ routes.all_products_collection_url }}">Tout voir</a>${families.map((f) => `<a href="{{ routes.collections_url }}/${slug(f)}">${attr(f)}</a>`).join("")}</fieldset>` : "";
    const apply = "Appliquer";
    out = out
      .replace(/<div class="tn-outils">[\s\S]*?<\/fieldset><\/div><\/div>/, (m) => {
        const filtrer = strip(/<label class="tn-filtrer">[\s\S]*?<span>([\s\S]*?)<\/span>/.exec(m)?.[1] ?? "Filtrer"), trier = strip(/<label class="tn-tri"><span>([\s\S]*?)<\/span>/.exec(m)?.[1] ?? "Trier par");
        return `<form class="tn-outils" method="get" action="{{ ${src}.url }}">{%- assign tri = ${src}.sort_by | default: ${src}.default_sort_by -%}<label class="tn-filtrer"><input type="checkbox"><span>${filtrer}</span></label><label class="tn-tri"><span>${trier}</span><select name="sort_by">{%- for option in ${src}.sort_options -%}<option value="{{ option.value }}"{% if option.value == tri %} selected{% endif %}>{{ option.name }}</option>{%- endfor -%}</select></label><button class="tn-appliquer" type="submit">${apply}</button><div class="tn-filtres">${famLinks}{%- for filter in ${src}.filters -%}{%- if filter.type == 'list' -%}<fieldset><legend>{{ filter.label }}</legend>{%- for value in filter.values -%}<label><input type="checkbox" name="{{ value.param_name }}" value="{{ value.value }}"{% if value.active %} checked{% endif %}{% if value.count == 0 and value.active == false %} disabled{% endif %}><span>{{ value.label }}</span></label>{%- endfor -%}</fieldset>{%- endif -%}{%- endfor -%}</div></form>`;
      })
      .replace(/<div class="tn-choisis">[\s\S]*?<\/label><\/div>/, (m) => `<div class="tn-actifs">{%- assign actifs = 0 -%}{%- for filter in ${src}.filters -%}{%- for value in filter.active_values -%}{%- assign actifs = actifs | plus: 1 -%}<a href="{{ value.url_to_remove }}">{{ value.label }}</a>{%- endfor -%}{%- endfor -%}{%- if actifs > 0 -%}<a class="tn-effacer" href="{{ ${src}.url }}">${strip(/<label class="tn-effacer">[\s\S]*?<span>([\s\S]*?)<\/span>/.exec(m)?.[1] ?? "Tout effacer")}</a>{%- endif -%}</div>`)
      .replace(/<div class="tn-cartes">[\s\S]*<\/div>(?=<\/section>)/, `{%- paginate ${src}.products by 48 -%}<div class="tn-cartes">{%- for product in ${src}.products -%}${SHOP_CARD}{%- endfor -%}</div>{%- if paginate.pages > 1 -%}<nav class="tn-pages" aria-label="Pages">{{ paginate | default_pagination }}</nav>{%- endif -%}{%- endpaginate -%}`);
  } else if (/\sdata-tn-produits\b/.test(out)) {
    // Cartes de produits : la collection de la page (page boutique), sinon tout le catalogue.
    const shop = c.template === "collection";
    out = out.replace(/<div class="tn-cartes">[\s\S]*<\/div>(?=<\/section>)/, shop ? `{%- paginate collection.products by 48 -%}${CARD("", "collection.products")}{%- if collection.products.size == 0 -%}<p class="tn-vide">Aucun produit ici pour l'instant.</p>{%- endif -%}{%- endpaginate -%}` : CARD(root === "tn-404" ? "limit: 4" : "limit: 8", "collections.all.products"));
  }
  // Familles : chacune mène à sa collection, avec la photo de la collection (ou celle de son premier produit).
  if (/\sdata-tn-rayons\b/.test(out)) {
    const names = [...new Set(c.input.products.flatMap((p) => p.categories.map((x) => x.trim()).filter(Boolean)))];
    out = withTenueFamilies(out, names.map((name) => ({ name, to: `shop:${name}`, image: null, products: c.input.products.filter((p) => p.categories.includes(name)).map((p) => p.title) })));
    for (const name of names) out = out.replace(`data-go="${attr(`shop:${name}`)}"><div class="tn-ph tn-cadre"></div>`, `data-go="${attr(`shop:${name}`)}">{%- assign famille = collections['${slug(name)}'] -%}<div class="tn-ph tn-cadre"{% if famille.featured_image %} style="background-image:url({{ famille.featured_image | image_url: width: 800 }})"{% elsif famille.products.first.featured_image %} style="background-image:url({{ famille.products.first.featured_image | image_url: width: 800 }})"{% endif %}></div>`);
    if (names.length < 2) c.problems.push({ level: "bloquant", text: "« Les familles de produits » demande au moins deux familles dans ton catalogue" });
  }
  // Comparatif : les vrais noms, chacun vers sa fiche, et les vrais prix lus dans la boutique.
  if (/\sdata-tn-comparatif\b/.test(out)) {
    const list = c.input.products.slice(0, 3);
    if (list.length < 2) c.problems.push({ level: "bloquant", text: "« Comparer les produits de la gamme » demande au moins deux produits dans ton catalogue" });
    out = withTenueComparison(out, list.map((p) => ({ title: p.title, image: null, price: `@@prix:${p.handle}@@`, go: `p:${p.handle}` })))
      .replace(/<mark class="tn-manque">([\s\S]*?)<\/mark>/g, "[$1]").replace(/@@prix:([\w-]+)@@/g, (_m, h: string) => `{{ all_products['${h}'].price | money }}`);
  }
  // Journal : les articles du blog de la boutique ; article : celui de la page.
  if (/\sdata-tn-articles\b/.test(out)) out = out.replace(/(<div class="tn-articles" data-tn-articles>)[\s\S]*<\/div>(?=<\/section>)/, `{%- paginate blog.articles by 24 -%}$1{%- for article in blog.articles -%}<a class="tn-art" href="{{ article.url }}"><div class="tn-ph tn-cadre"{% if article.image %} style="background-image:url({{ article.image | image_url: width: 900 }})"{% endif %}></div>{%- if article.tags.size > 0 -%}<small>{{ article.tags.first }}</small>{%- endif -%}<b>{{ article.title }}</b><span>{{ article.excerpt_or_content | strip_html | truncate: 110 }}</span></a>{%- endfor -%}</div>{%- if blog.articles.size == 0 -%}<p class="tn-vide">Les premiers articles arrivent bientôt.</p>{%- endif -%}{%- if paginate.pages > 1 -%}<nav class="tn-pages" aria-label="Pages">{{ paginate | default_pagination }}</nav>{%- endif -%}{%- endpaginate -%}`);
  if (/\sdata-tn-article\b/.test(out)) out = out.replace(/(<a class="tn-retour")[^>]*>([\s\S]*?)<\/a>[\s\S]*(?=<\/section>)/, (_m, a: string, label: string) => `${a} href="{{ blog.url }}">${label}</a>{%- if article.tags.size > 0 -%}<small>{{ article.tags.first }}</small>{%- endif -%}<h1>{{ article.title }}</h1>{%- if article.excerpt != blank -%}<p class="tn-chapo">{{ article.excerpt | strip_html }}</p>{%- endif -%}{%- if article.image -%}<div class="tn-ph tn-cadre" style="background-image:url({{ article.image | image_url: width: 1400 }})"></div>{%- endif -%}<div class="tn-corps">{{ article.content }}</div><small class="tn-signe">{{ article.author }}</small>`);
  // Recherche : le mot cherché, le vrai champ, les vrais résultats ; rien trouvé : le mot simple de la section.
  if (/\sdata-tn-resultats\b/.test(out)) {
    const svg = /<svg[\s\S]*?<\/svg>/.exec(out)?.[0] ?? "", empty = /<div class="tn-vide">[\s\S]*?<\/div>(?=<\/section>)/.exec(out)?.[0] ?? "";
    out = out.replace(/^(<(?:section|div)\b[^>]*)>[\s\S]*(<\/(?:section|div)>)$/, (_m, open: string, close: string) => `${open}{% if search.performed and search.results_count == 0 %} data-tn-vide{% endif %}><h1>{%- if search.performed -%}Résultats pour «&nbsp;{{ search.terms | escape }}&nbsp;»{%- else -%}Chercher{%- endif -%}</h1><form class="tn-form" action="{{ routes.search_url }}" method="get" role="search"><label class="tn-cherche"><input type="search" name="q" value="{{ search.terms | escape }}" aria-label="Chercher sur le site">${svg}</label></form>{%- if search.performed -%}<small class="tn-nombre">{{ search.results_count }} résultat{% if search.results_count > 1 %}s{% endif %}</small>{%- paginate search.results by 24 -%}<div class="tn-liste">{%- for item in search.results -%}<a class="tn-res" href="{{ item.url }}"><b>{{ item.title }}</b><small>{%- case item.object_type -%}{%- when 'product' -%}Produit{%- when 'article' -%}Le journal{%- else -%}Page{%- endcase -%}</small><span>{%- if item.object_type == 'product' -%}{{ item.price | money }}{%- else -%}Lire{%- endif -%}</span></a>{%- endfor -%}</div>{%- endpaginate -%}{%- endif -%}${empty}${close}`);
  }
  // Moyens de paiement du pied de page : ceux que la boutique accepte vraiment.
  out = out.replace(/<span data-tn-paiements>[\s\S]*?<\/span>/, `<span class="tn-paiements" data-tn-paiements>{%- for type in shop.enabled_payment_types -%}{{ type | payment_type_svg_tag }}{%- endfor -%}</span>`);
  // Bloc d'achat : photos, prix, stock et ajout au panier du produit de la page.
  if (/\sdata-tn-achat\b/.test(out)) {
    out = withAchatId(out); // la cible des boutons de rappel (« #tn-achat »)
    // Le vrai choix est la liste des versions de la boutique : la phrase d'option écrite qui double une option du catalogue ne part pas.
    const fiche = c.input.products.find((x) => x.handle === c.page?.product) ?? (c.page && /^product/.test(c.page.key) ? c.input.products[0] : undefined);
    if (fiche?.options?.length) out = withAchatOptions(out, fiche.options.map((o) => ({ name: o.name, values: o.values.map((label) => ({ label })) })));
    const label = strip(/<a class="tn-bt"[^>]*data-pogo[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1] ?? "Ajouter au panier");
    out = out
      .replace(/<div class="tn-galerie">[\s\S]*?<\/div><\/div>/, `<div class="tn-galerie">{%- if product.featured_image -%}<div class="tn-grande tn-ph" role="img" aria-label="{{ product.featured_image.alt | default: product.title | escape }}" style="background-image:url({{ product.featured_image | image_url: width: 1400 }})"></div>{%- endif -%}{%- if product.images.size > 1 -%}<div class="tn-vignettes">{%- for image in product.images limit: 5 -%}<i class="tn-ph" style="background-image:url({{ image | image_url: width: 300 }})"></i>{%- endfor -%}</div>{%- endif -%}</div>`)
      .replace(/<div class="tn-prix">[\s\S]*?<\/div>(?:<div class="tn-rupture">[\s\S]*?<\/div>)?/, `<div class="tn-prix">${PRIX_BARRE}{{ product.selected_or_first_available_variant.price | money }}${MOINS}</div>{%- unless product.available -%}<div class="tn-rupture">Épuisé pour l'instant.</div>{%- endunless -%}`)
      .replace(/<a class="tn-bt[^"]*"[^>]*data-pogo[^>]*>[\s\S]*?<\/a>(?=<ul|<\/section>|<div class="tn-barre">)/, `{%- form 'product', product, class: 'tn-enveloppe' -%}{%- if product.has_only_default_variant -%}<input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">{%- else -%}<select class="tn-choix" name="id" aria-label="Choisir une version">{%- for variant in product.variants -%}<option value="{{ variant.id }}"{% if variant == product.selected_or_first_available_variant %} selected{% endif %}{% unless variant.available %} disabled{% endunless %}>{{ variant.title }} · {{ variant.price | money }}</option>{%- endfor -%}</select>{%- endif -%}<button class="tn-bt" type="submit" name="add"{% unless product.available %} disabled{% endunless %}>${label}</button>{%- if product.available -%}<div class="tn-rapide">{{ form | payment_button }}</div>{%- endif -%}{%- endform -%}`)
      // La barre d'achat part en boutique : cachée tant que le script commun n'a pas démarré (sans lui, elle n'achèterait rien).
      .replace(/<div class="tn-barre">[\s\S]*?<\/div>(?=<\/section>)/, `<div class="tn-barre" data-tn-barre hidden><b>{{ product.title }}</b><button class="tn-bt" type="button" data-tn-acheter{% unless product.available %} disabled{% endunless %}>${label}</button></div>`)
      // La table des versions du produit et les deux scripts du Studio (contrat tnBoutique) : fichiers du thème.
      .replace(/<\/section>\s*$/, `${TABLE_VERSIONS}${SCRIPTS_ACHAT}</section>`);
    if (c.input.priceNotes?.length) out = out.replace(/(<div class="tn-prix">[\s\S]*?<\/div>(?:\{%- unless product\.available -%\}[\s\S]*?\{%- endunless -%\})?)/, `$1<ul class="tn-pres-prix">${c.input.priceNotes.slice(0, 3).map((n) => `<li>${literal(attr(n))}</li>`).join("")}</ul>`);
    // Livraison et retours : ceux du client, tels qu'il les a donnés.
    const co = c.input.company ?? {};
    out = out.replace(/<ul class="tn-reperes">[\s\S]*?<\/ul>/, `<ul class="tn-reperes"><li>${literal(attr(repere("Livraison", co.shipping)))}</li><li>${literal(attr(repere("Retours", co.returns)))}</li></ul>`);
  }
  // Pastilles de version (pièce posée sous le bloc d'achat) : les vraies options du produit ; chaque pastille mène à la
  // version choisie, que le bloc d'achat reprend (prix, stock, choix du formulaire). Sans script.
  if (/\sdata-tn-versions\b/.test(out)) out = out.replace(/(<section\b[^>]*\sdata-tn-versions\b[^>]*>)[\s\S]*(<\/section>)$/, `$1{%- unless product.has_only_default_variant -%}{%- for option in product.options_with_values -%}{%- assign nom = option.name | downcase -%}<div class="tn-groupe-v{% if nom contains 'coul' or nom contains 'color' or nom contains 'teinte' %} tn-couleurs{% endif %}"><small>{{ option.name }}</small><div class="tn-choix-v">{%- for value in option.values -%}<a class="tn-pastille{% if value.selected or option.selected_value == value %} tn-on{% endif %}{% if value.available == false %} tn-off{% endif %}" href="{% if value.variant %}{{ value.variant.url }}{% else %}{{ product.url }}{% endif %}"{% if value.swatch.color %} style="--teinte:{{ value.swatch.color }}"{% endif %}><span>{{ value }}</span></a>{%- endfor -%}</div></div>{%- endfor -%}{%- endunless -%}$2`);
  // « Le produit, son prix, son bouton » : le produit de la page, sinon le premier du catalogue ; un vrai formulaire d'achat.
  if (/\sdata-tn-appel-produit\b/.test(out)) {
    const label = strip(/<a class="tn-bt"[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1] ?? "Ajouter au panier"), first = c.page?.product ?? c.input.products[0]?.handle ?? "", co = c.input.company ?? {};
    out = out.replace(/^(<section\b[^>]*>)/, `$1{%- assign vedette = product -%}{%- unless vedette -%}{%- assign vedette = all_products['${first}'] -%}{%- endunless -%}`)
      .replace(/<div class="tn-ph"[^>]*><\/div>/, `<div class="tn-ph"{% if vedette.featured_image %} role="img" aria-label="{{ vedette.title | escape }}" style="background-image:url({{ vedette.featured_image | image_url: width: 1000 }})"{% endif %}></div>`)
      .replace(/(<b class="tn-nom-a">)[\s\S]*?(<\/b>)/, `$1{{ vedette.title }}$2`)
      .replace(/<div class="tn-prix">[\s\S]*?<\/div>(?:<div class="tn-rupture">[\s\S]*?<\/div>)?/, `<div class="tn-prix">{{ vedette.selected_or_first_available_variant.price | money }}</div>{%- unless vedette.available -%}<div class="tn-rupture">Épuisé pour l'instant.</div>{%- endunless -%}`)
      .replace(/<a class="tn-bt[^"]*"[^>]*>[\s\S]*?<\/a>/, `{%- form 'product', vedette, class: 'tn-enveloppe' -%}<input type="hidden" name="id" value="{{ vedette.selected_or_first_available_variant.id }}"><button class="tn-bt" type="submit" name="add"{% unless vedette.available %} disabled{% endunless %}>${label}</button>{%- endform -%}`)
      .replace(/<ul class="tn-reperes">[\s\S]*?<\/ul>/, `<ul class="tn-reperes"><li>${literal(attr(repere("Livraison", co.shipping)))}</li><li>${literal(attr(repere("Retours", co.returns)))}</li></ul>`);
  }
  // Rappel vers l'achat : une vraie ancre vers le bloc d'achat de la fiche (sans script) ; ailleurs, vers la fiche du produit.
  if (/\sdata-tn-rappel-achat\b/.test(out)) {
    const first = c.page?.product ?? c.input.products[0]?.handle ?? "";
    out = out.replace(/^(<section\b[^>]*>)/, `$1{%- assign vedette = product -%}{%- unless vedette -%}{%- assign vedette = all_products['${first}'] -%}{%- endunless -%}`)
      .replace(/(<b class="tn-ra-nom">)[\s\S]*?(<\/b>)/, `$1{{ vedette.title }}$2`)
      .replace(/(<span class="tn-ra-prix">)[\s\S]*?(<\/span>)/, `$1{{ vedette.selected_or_first_available_variant.price | money }}$2`)
      .replace(/<a class="tn-bt"[^>]*\sdata-tn-rappel[^>]*>/, `<a class="tn-bt" href="{% unless product %}{{ vedette.url }}{% endunless %}#tn-achat">`);
  }
  // Les coloris en scène : les couleurs lues dans les options du produit, la photo de chaque version ; un toucher mène à
  // la fiche sur cette version. Moins de deux couleurs avec photo : la pièce reste cachée (rien d'exemple ne part).
  if (/\sdata-tn-coloris\b/.test(out)) {
    const first = c.page?.product ?? c.input.products[0]?.handle ?? "";
    const couleurs = (inner: string) => `{%- for option in vedette.options_with_values -%}{%- assign tn_nom = option.name | downcase -%}{%- if tn_nom contains 'coul' or tn_nom contains 'color' or tn_nom contains 'teinte' -%}{%- for value in option.values -%}{%- if value.variant.featured_image -%}${inner}{%- endif -%}{%- endfor -%}{%- endif -%}{%- endfor -%}`;
    out = out.replace(/^<section\b([^>]*)>/, (_m, a: string) => `<section${a}{%- assign vedette = product -%}{%- unless vedette -%}{%- assign vedette = all_products['${first}'] -%}{%- endunless -%}{%- assign tn_nb = 0 -%}${couleurs("{%- assign tn_nb = tn_nb | plus: 1 -%}")}{% if tn_nb == 0 or tn_nb == 1 %} hidden{% endif %}>`)
      .replace(/(<ul class="tn-col-liste">)[\s\S]*?(<\/ul>)/, (_m, a: string, b: string) => `${a}${couleurs(`<li><a class="tn-col" href="{{ value.variant.url }}#tn-achat"><div class="tn-ph tn-cadre" role="img" aria-label="{{ value | escape }}" style="background-image:url({{ value.variant.featured_image | image_url: width: 900 }})"></div><span><i{% if value.swatch.color %} style="--teinte:{{ value.swatch.color }}"{% endif %}></i>{{ value }}</span></a></li>`)}${b}`);
  }
  // Une pièce dont toutes les lignes sont encore « à compléter » ne garde pas ses en-têtes seuls : elle part avec ses lignes.
  if (c.input.dropMissing && /tn-avec-lignes/.test(out) && !(out.match(/<li\b[^>]*>[\s\S]*?<\/li>/g) ?? []).some((li) => !/\[À compléter/.test(li))) out = out.replace(/<(small|div)\b[^>]*class="[^"]*tn-avec-lignes[^"]*"[^>]*>[\s\S]*?<\/\1>/g, "");
  // Les avantages : un avantage pas encore écrit ne part pas avec sa seule photo.
  if (root === "tn-avantages" && c.input.dropMissing) out = out.replace(/<li><div class="tn-ph[^>]*><\/div>(<div><b>\s*\[À compléter)/g, "<li>$1");
  // Le mur d'avis : seuls de vrais avis écrits restent (aucune application d'avis ne le remplit).
  if (root === "tn-mur-avis" && !/<ul data-tn-avis>\s*<li>/.test(out)) out = out.replace(/<ul data-tn-avis>\s*<\/ul>/, "");
  // Le look complet : d'autres vrais produits de la boutique (trois au plus), jamais celui de la page.
  if (/\sdata-tn-looks\b/.test(out)) out = out.replace(/<div class="tn-cartes">[\s\S]*?<\/div>(?=<\/div><\/section>)/, `<div class="tn-cartes">{%- assign vus = 0 -%}{%- for autre in collections.all.products limit: 12 -%}{%- if autre.id != product.id and vus < 3 -%}{%- assign vus = vus | plus: 1 -%}<a class="tn-carte-p{% unless autre.available %} tn-epuise{% endunless %}{% unless autre.featured_image %} tn-sans-photo{% endunless %}" href="{{ autre.url }}">{% if autre.featured_image %}<div class="tn-ph" style="background-image:url({{ autre.featured_image | image_url: width: 600 }})"></div>{% endif %}<b>{{ autre.title }}</b><span>{% if autre.available %}{{ autre.price | money }}{% else %}Épuisé{% endif %}</span></a>{%- endif -%}{%- endfor -%}</div>`);
  // Panier (la page et le tiroir) : les vraies lignes, les quantités, le vrai total, le bouton qui ouvre le paiement de
  // Shopify. Aucun script : « − », « + » et « Retirer » sont des liens de la boutique (elle recharge le panier), la
  // barre de livraison offerte est calculée par la boutique sur le seuil donné par le client.
  const goal = Math.round((freeShippingFrom(c.input.company?.shipping) ?? 0) * 100);
  const seuil = goal > 0 ? `{%- assign reste = ${goal} | minus: cart.total_price -%}<div class="tn-seuil"><p>{%- if reste > 0 -%}Plus que <b>{{ reste | money }}</b> pour la livraison offerte{%- else -%}La livraison est offerte{%- endif -%}</p><i style="--part:{{ cart.total_price | times: 100 | divided_by: ${goal} | at_most: 100 | at_least: 4 }}%"></i></div>` : "";
  const lignes = `<div class="tn-lignes" data-tn-lignes>{%- for item in cart.items -%}<div class="tn-ligne"><div class="tn-ph"{% if item.image %} style="background-image:url({{ item.image | image_url: width: 300 }})"{% endif %}></div><div class="tn-quoi"><b>{{ item.product.title }}</b>{%- unless item.product.has_only_default_variant -%}<em>{{ item.variant.title }}</em>{%- endunless -%}<div class="tn-qte"><a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&amp;quantity={{ item.quantity | minus: 1 }}" aria-label="Retirer un exemplaire">−</a><span>{{ item.quantity }}</span><a href="{{ routes.cart_change_url }}?line={{ forloop.index }}&amp;quantity={{ item.quantity | plus: 1 }}" aria-label="Ajouter un exemplaire">+</a></div><a class="tn-oter" href="{{ item.url_to_remove }}">Retirer</a></div><span class="tn-prix-l">{{ item.final_line_price | money }}</span></div>{%- endfor -%}</div>`;
  // (La page panier seulement : « data-tn-panier-cote », le tiroir, a sa propre conversion juste après. Lu sans cette
  // précision, le tiroir perdait ici ses produits à ajouter avant d'être converti.)
  if (/\sdata-tn-panier(?![\w-])/.test(out)) {
    const button = strip(/<a class="tn-bt"[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1] ?? "Passer commande"), total = strip(/<div class="tn-total"><span>([\s\S]*?)<\/span>/.exec(out)?.[1] ?? "Total");
    out = out.replace(/<div class="tn-lignes" data-tn-lignes>[\s\S]*?<a class="tn-bt"[^>]*>[\s\S]*?<\/a>/, `{%- if cart.item_count == 0 -%}<div class="tn-recap"><p class="tn-vide">${v ? "Votre" : "Ton"} panier est vide.</p><a class="tn-bt" href="{{ routes.all_products_collection_url }}">Voir la boutique</a>{%- else -%}${lignes}<div class="tn-recap">${seuil}<form class="tn-enveloppe" action="{{ routes.cart_url }}" method="post"><div class="tn-total"><span>${total}</span><span class="tn-prix-t">{{ cart.total_price | money }}</span></div><button class="tn-bt" type="submit" name="checkout">${button}</button>{%- if additional_checkout_buttons -%}<div class="tn-rapide">{{ content_for_additional_checkout_buttons }}</div>{%- endif -%}</form>{%- endif -%}`);
  }
  // Tiroir de panier : il s'ouvre par un lien vers lui (« #tn-panier-cote », posé sur le panier de l'en-tête) et se ferme par
  // un lien ; les produits à ajouter sont ceux du catalogue qui ne sont pas déjà dans le panier.
  if (/\sdata-tn-panier-cote\b/.test(out)) {
    const text = (rx: RegExp, d: string) => strip(rx.exec(out)?.[1] ?? d);
    const title = text(/<h2>([\s\S]*?)<\/h2>/, "Panier"), button = text(/class="tn-bas"[\s\S]*?<a class="tn-bt"[^>]*>([\s\S]*?)<\/a>/, "Passer commande"), total = text(/<div class="tn-total"><span>([\s\S]*?)<\/span>/, "Total");
    const more = text(/<div class="tn-plus"[^>]*><b>([\s\S]*?)<\/b>/, ""), seeCart = text(/<a class="tn-lien"[^>]*data-go="cart"[^>]*>([\s\S]*?)<\/a>/, "Voir le panier");
    const empty = text(/<div class="tn-vide"><p>([\s\S]*?)<\/p>/, "Le panier est vide."), seeShop = text(/<div class="tn-vide"><p>[\s\S]*?<\/p><a[^>]*>([\s\S]*?)<\/a>/, "Voir la boutique");
    const svg = /<a class="tn-x"[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1] ?? "×";
    const plus = more ? `<div class="tn-plus"><b>${more}</b><div class="tn-sugg">{%- assign montres = 0 -%}{%- for product in collections.all.products limit: 16 -%}{%- assign dedans = false -%}{%- for item in cart.items -%}{%- if item.product_id == product.id -%}{%- assign dedans = true -%}{%- endif -%}{%- endfor -%}{%- if dedans == false and product.available and montres < 4 -%}{%- assign montres = montres | plus: 1 -%}<a class="tn-s" href="{{ product.url }}"><div class="tn-ph"{% if product.featured_image %} style="background-image:url({{ product.featured_image | image_url: width: 300 }})"{% endif %}></div><span>{{ product.title }}</span><em>{{ product.price | money }}</em></a>{%- endif -%}{%- endfor -%}</div></div>` : "";
    out = `<section class="tn tn-panier-cote" id="tn-panier-cote" data-tn-panier-cote{% if cart.item_count == 0 %} data-tn-vide{% endif %}><a class="tn-voile" href="#tn-ferme" aria-label="Fermer le panier" tabindex="-1"></a><div class="tn-panneau" role="dialog" aria-label="${attr(title)}"><div class="tn-haut"><h2>${title}</h2><a class="tn-x" href="#tn-ferme" aria-label="Fermer le panier">${svg}</a></div>${seuil}${lignes}<div class="tn-vide"><p>${empty}</p><a class="tn-lien" href="{{ routes.all_products_collection_url }}">${seeShop}</a></div>${plus}<form class="tn-bas" action="{{ routes.cart_url }}" method="post"><div class="tn-total"><span>${total}</span><span class="tn-prix-t">{{ cart.total_price | money }}</span></div><button class="tn-bt" type="submit" name="checkout">${button}</button><a class="tn-lien" href="{{ routes.cart_url }}">${seeCart}</a></form></div></section>`;
  }
  // Recherche à tenue : le vrai champ de la boutique (valider mène aux résultats), ses produits, ses familles en raccourcis.
  if (/\sdata-tn-recherche\b/.test(out)) {
    const families = [...new Set(c.input.products.flatMap((p) => p.categories.map((x) => x.trim()).filter(Boolean)))];
    out = out.replace(/<form class="tn-form" onsubmit="return false" role="search">/, `<form class="tn-form" action="{{ routes.search_url }}" method="get" role="search">`)
      .replace(/(<input type="search" name="q")/, `$1 value="{{ search.terms | escape }}"`)
      .replace(/(<div class="tn-res-l">)[\s\S]*?(<\/div>)<p class="tn-rien">[\s\S]*?<\/p>/, `$1{%- for product in collections.all.products limit: 6 -%}<a class="tn-r" href="{{ product.url }}"><div class="tn-ph"{% if product.featured_image %} style="background-image:url({{ product.featured_image | image_url: width: 300 }})"{% endif %}></div><b>{{ product.title }}</b><span>{% if product.available %}{{ product.price | money }}{% else %}Épuisé{% endif %}</span></a>{%- endfor -%}$2`)
      .replace(/<a class="tn-x"[^>]*data-tn-fermer[^>]*>[\s\S]*?<\/a>/, "");
    if (families.length >= 2) out = out.replace(/(<div class="tn-mots" data-tn-mots>)([\s\S]*?)(<\/div>)/, (_m, a: string, own: string, b: string) => `${a}${families.slice(0, 5).map((f) => `<a class="tn-mot" href="{{ routes.collections_url }}/${slug(f)}">${attr(f)}</a>`).join("")}${(own.match(/<a\b[\s\S]*?<\/a>/g) ?? []).filter((x) => !/data-go="shop"/.test(x)).slice(0, 2).join("")}${b}`);
  }
  // Boutique fermée : l'entrée par mot de passe est celle de la boutique (sur sa page « mot de passe » seulement).
  if (root === "tn-fermee") out = c.template === "password"
    ? out.replace(/<form class="tn-passe" onsubmit="return false">([\s\S]*?)<\/form>/, (_m, inner: string) => `{%- form 'storefront_password', class: 'tn-passe' -%}${inner.replace(/<input type="password"/, '<input type="password" name="password" aria-label="Mot de passe"')}{%- endform -%}`)
    : out.replace(/<details class="tn-cle">[\s\S]*?<\/details>/, "");
  // En-tête : le nombre d'articles du vrai panier, le nom qui ramène à l'accueil, le logo s'il existe.
  if (isHeaderRoot(root) && c.input.business === "services" && !c.t.pages.some((pg) => pg.key === "cart")) out = out.replace(/<button type="button" class="tn-pan"[^>]*>[\s\S]*?<\/button>/, "");
  if (isHeaderRoot(root)) {
    // La loupe mène à la vraie recherche de la boutique.
    out = out.replace(/<button type="button" class="tn-e-ic"([^>]*)>([\s\S]*?)<\/button>/, `<a class="tn-e-ic" href="{{ routes.search_url }}"$1>$2</a>`);
    out = out.replace(/<button type="button" class="tn-pan"([^>]*)>([\s\S]*?)<span>0<\/span>([\s\S]*?)<\/button>/, `<a class="tn-pan" href="{{ routes.cart_url }}"$1>$2<span>{{ cart.item_count }}</span>$3</a>`);
    if (c.input.logoAssetId) { const ext = c.input.assetExt(c.input.logoAssetId); if (ext) { const f = `tn-logo.${ext}`; c.files[f] = c.input.logoAssetId; out = out.replace(/(<span class="tn-nom lg">)[\s\S]*?(<\/span>)/, `$1<img src="{{ '${f}' | asset_url }}" alt="${attr(c.input.name)}" loading="eager">$2`); } }
  }
  // En-tête d'une page d'arrivée (coque propre à la page) : le logo s'il existe, comme l'en-tête du site.
  if (root === "tn-entete-arrivee" && c.input.logoAssetId) { const ext = c.input.assetExt(c.input.logoAssetId); if (ext) { const f = `tn-logo.${ext}`; c.files[f] = c.input.logoAssetId; out = out.replace(/(<span class="tn-nom lg">)[\s\S]*?(<\/span>)/, `$1<img src="{{ '${f}' | asset_url }}" alt="${attr(c.input.name)}" loading="eager">$2`); } }
  // Recherche de la page introuvable : un vrai champ.
  out = out.replace(/<div class="tn-champ"><span>([^<]*)<\/span>(<svg[\s\S]*?<\/svg>)<\/div>/, (_m, label: string, svg: string) => `<form class="tn-champ" action="{{ routes.search_url }}" method="get" role="search"><input type="search" name="q" placeholder="${attr(label)}" aria-label="${attr(label)}"><button type="submit" aria-label="Chercher">${svg}</button></form>`);
  return out;
}

/** Règles ajoutées pour la boutique : vrais champs et vrais boutons, à l'image de ceux de l'aperçu. */
const SHOP_CSS = `.ctw .tn form.tn-enveloppe{display:contents}
.ctw .tn button.tn-bt{appearance:none;-webkit-appearance:none;font-family:var(--f-ui)}
.ctw .tn-achat button.tn-bt,.ctw .tn-panier button.tn-bt{display:block;width:100%}
.ctw .tn button.tn-bt[disabled]{opacity:.45;cursor:default}
.ctw .tn .tn-choix{display:block;width:100%;margin-top:16px;padding:13px 14px;background:none;border:1.5px solid var(--tn-encre);border-radius:var(--tn-arrondi,0);font:inherit;color:inherit}
.ctw .tn input.tn-champ-i,.ctw .tn textarea.tn-champ-i{display:block;width:100%;background:none;border:0;border-bottom:1.5px solid var(--tn-encre);border-radius:0;padding:15px 0 14px;font:inherit;color:inherit}
.ctw .tn textarea.tn-champ-i{min-height:92px;resize:vertical}
.ctw .tn input.tn-champ-i::placeholder,.ctw .tn textarea.tn-champ-i::placeholder{color:var(--tn-sourd);opacity:1}
.ctw .tn form.tn-champ input{flex:1;min-width:0;background:none;border:0;font:inherit;color:inherit}
.ctw .tn form.tn-champ button{background:none;border:0;padding:0;color:inherit;display:flex;cursor:pointer}
.ctw .tn .tn-rapide{margin-top:10px}
.ctw .tn .tn-rapide .es-express-note{margin:0;font-size:13px;color:var(--tn-sourd)}
.ctw .tn .tn-ok{margin:0 0 12px;font-weight:600}
.ctw .tn .tn-vide{margin:18px 0;color:var(--tn-texte)}
.ctw .tn :focus-visible{outline:2px solid var(--tn-accent);outline-offset:2px}
.ctw .tn form input[type="hidden"]{display:none!important}
.ctw .tn-catalogue .tn-appliquer{appearance:none;-webkit-appearance:none;background:none;border:0;border-bottom:1.5px solid var(--tn-encre);border-radius:0;padding:0 0 2px;min-height:44px;font:inherit;font-weight:600;color:inherit;cursor:pointer}
.ctw .tn-catalogue .tn-filtres a{display:flex;align-items:center;min-height:44px;font-size:16px}
.ctw .tn-catalogue .tn-actifs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px}
.ctw .tn-catalogue .tn-actifs:empty{display:none}
.ctw .tn-catalogue .tn-actifs a{display:inline-flex;align-items:center;min-height:38px;padding:0 14px;border:1.5px solid var(--tn-encre);border-radius:999px;font-size:14.5px;line-height:1.2}
.ctw .tn-catalogue .tn-actifs a.tn-effacer{order:-1;border:0;border-radius:0;padding:0 2px;font-weight:600;text-decoration:underline;text-underline-offset:4px}
.ctw .tn .tn-pages{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;margin-top:34px;font-size:16px}
.ctw .tn .tn-pages a,.ctw .tn .tn-pages .current{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
.ctw .tn .tn-pages .current{font-weight:700;border-bottom:1.5px solid var(--tn-encre)}
.ctw .tn .tn-paiements{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px}
.ctw .tn .tn-paiements svg{height:22px;width:auto}
html body .shopify-section:has(>.ctw>.tn-ent:not([data-tn-c="sur-photo"])){position:sticky;top:0;z-index:60}
@supports (animation-timeline:scroll()){html body .shopify-section:has(>.ctw>.tn-ent[data-tn-c="sur-photo"]){position:sticky;top:0;z-index:60}}
@keyframes tn-e-plein{to{background-color:var(--tn-fond);background-image:none;color:var(--tn-encre);border-bottom-color:var(--tn-e-filet)}}`;

/** Prix barré et étiquette « −X % » : seulement à partir du vrai prix de comparaison de la version, le pourcentage calculé. */
const PRIX_BARRE = `{%- assign tn_v = product.selected_or_first_available_variant -%}{%- if tn_v.compare_at_price > tn_v.price -%}<s>{{ tn_v.compare_at_price | money }}</s> {% endif -%}`;
const MOINS = `{%- if tn_v.compare_at_price > tn_v.price %} <em class="tn-moins">−{{ tn_v.compare_at_price | minus: tn_v.price | times: 100.0 | divided_by: tn_v.compare_at_price | round }}&nbsp;%</em>{%- endif -%}`;
/** Table des versions lue par le script commun : le stock n'y figure que s'il est suivi par Shopify. */
const TABLE_VERSIONS = `<script type="application/json" data-tn-versions data-tn-titre="{{ product.title | escape }}" data-tn-noms="{{ product.options | join: '|' | escape }}">[{%- for variant in product.variants -%}{"id":"{{ variant.id }}","options":{{ variant.options | json }},"disponible":{{ variant.available | json }},{%- if variant.inventory_management == 'shopify' -%}"stock":{{ variant.inventory_quantity | json }},{%- endif -%}{%- if variant.compare_at_price > variant.price -%}"compare":{{ variant.compare_at_price | json }},{%- endif -%}"prix":{{ variant.price | json }}}{%- unless forloop.last -%},{%- endunless -%}{%- endfor -%}]</script>`;
/** Les deux fichiers du Studio envoyés dans le dossier « assets » du thème (voir STUDIO_SCRIPTS dans theme/compile.ts). */
export const SCRIPT_COMMUN = `<script src="{{ 'tenue-achat.js' | asset_url }}" defer></script>`;
const SCRIPTS_ACHAT = `<script src="{{ 'boutique-shopify.js' | asset_url }}" defer></script>${SCRIPT_COMMUN}`;
const pctTxt = (n: number) => String(n).replace(".", ",");
/** Un pack ou un lot porte-t-il un prix remisé ou un cadeau (donc une remise automatique à créer dans la boutique) ? */
const packRemise = (k: ShopOffers["packs"][number]) => (k.remisePct ?? 0) > 0 || k.prixCentimes != null || !!k.cadeauHandle;
/** Ce que le client doit avoir dans sa boutique pour que les prix affichés soient les prix payés : dit tel quel. */
export function remisesAttendues(o: ShopOffers | null | undefined): string[] {
  if (!o) return [];
  const out: string[] = [];
  if (o.quantity?.kind === "lots") for (const t of o.quantity.tiers) out.push(`remise automatique par quantité : ${t.qty} articles achetés, −${pctTxt(t.pct)} %`);
  if (o.quantity?.kind === "bogo") out.push(`remise automatique « achetez ${o.quantity.buy}, recevez ${o.quantity.free} » sur le même produit`);
  for (const k of o.packs) {
    if ((k.remisePct ?? 0) > 0) out.push(`remise automatique par quantité : ${k.quantite} articles achetés, −${pctTxt(k.remisePct!)} % (pack « ${k.nom} »)`);
    else if (k.prixCentimes != null) out.push(`remise automatique par quantité : ${k.quantite} articles pour ${(k.prixCentimes / 100).toFixed(2).replace(".", ",")} € (pack « ${k.nom} »)`);
    if (k.cadeauHandle) out.push(`remise automatique « achetez ${k.quantite}, recevez 1 » : le produit « ${k.cadeauHandle} » offert à 100 % (pack « ${k.nom} »)`);
  }
  return [...new Set(out)];
}
const CADEAU = (h: string, cls: string) => `{%- assign tn_cadeau = all_products['${h}'] -%}{%- if tn_cadeau.available -%}<div class="${cls}"><i class="tn-ph"{% if tn_cadeau.featured_image %} style="background-image:url({{ tn_cadeau.featured_image | image_url: width: 200 }})"{% endif %}></i><span>{{ tn_cadeau.title }}</span><em>Offert</em></div>{%- endif -%}`;

/** Achat, suite, en Liquid : offres par quantité, packs, dessous du bouton, offre du moment, fenêtre d'offre. Rend null : la pièce ne part pas (c'est dit). */
function vente(c: Ctx, html: string, root: string | null, where: string): string | null {
  const o = c.input.offres ?? null, note = (text: string) => { c.problems.push({ level: "à savoir", text: `${where} : ${text}` }); return null; };
  const attendues = remisesAttendues(o);
  let out = html;
  if (root === "tn-lots") {
    const q = o?.quantity;
    if (!q) return note("section non envoyée (aucune offre par quantité saisie)");
    if (!o.remisesConfirmees) return note(`section non envoyée : le thème ne calcule aucune remise. Crée d'abord dans ta boutique : ${attendues.filter((x) => !/pack «/.test(x)).join(" ; ")}. Puis confirme-le à SINA`);
    const p = "product.selected_or_first_available_variant.price";
    const line = (n: number, prix: string, tag: string, on: boolean) => `<li data-tn-quantite="${n}"><label><input type="radio" name="tn-lot"${on ? " checked" : ""}><b>${n} {% if ${n} > 1 %}articles{% else %}article{% endif %}</b><span>{{ ${prix} | money }}</span>${n > 1 ? `<i>soit {{ ${prix} | divided_by: ${n} | money }} l'unité</i>` : ""}${tag ? `<em>${tag}</em>` : ""}</label></li>`;
    const rows = q.kind === "lots" ? q.tiers.slice(0, 4).map((t) => line(t.qty, `${p} | times: ${t.qty} | times: ${100 - t.pct} | divided_by: 100.0 | round`, `−${pctTxt(t.pct)} %`, false)) : [line(q.buy + q.free, `${p} | times: ${q.buy}`, `${q.free} offert${q.free > 1 ? "s" : ""}`, false)];
    out = out.replace(/(<ul>)[\s\S]*?(<\/ul>)/, `$1${line(1, p, "", true)}${rows.join("")}$2`);
  }
  if (root === "tn-packs") {
    const packs = o?.packs ?? [];
    if (!packs.length) return note("section non envoyée (aucun pack saisi)");
    if (!o!.remisesConfirmees && packs.some(packRemise)) return note(`section non envoyée : le thème ne calcule aucune remise. Crée d'abord dans ta boutique : ${attendues.filter((x) => /pack «/.test(x)).join(" ; ")}. Puis confirme-le à SINA`);
    const first = Math.max(0, packs.findIndex((k) => k.populaire));
    const one = (k: ShopOffers["packs"][number], i: number) => {
      const prix = k.prixCentimes != null ? String(k.prixCentimes) : `tn_v.price | times: ${k.quantite} | times: ${100 - (k.remisePct ?? 0)} | divided_by: 100.0 | round`;
      return `{%- assign tn_pp = ${prix} -%}{%- assign tn_plein = tn_v.compare_at_price | default: 0 | times: ${k.quantite} -%}<li class="tn-pack" data-tn-pack data-tn-quantite="${k.quantite}" data-tn-prix="{{ tn_pp }}"${k.cadeauHandle ? `{% if all_products['${k.cadeauHandle}'].available %} data-tn-cadeau="{{ all_products['${k.cadeauHandle}'].selected_or_first_available_variant.id }}" data-tn-cadeau-nom="{{ all_products['${k.cadeauHandle}'].title | escape }}"{% endif %}` : ""}>${k.populaire ? '<em class="tn-pack-etiquette">Le plus populaire</em>' : ""}<label><input type="radio" name="tn-pack"${i === first ? " checked" : ""}><b>${literal(attr(k.nom))}</b><span class="tn-pack-prix">{%- if tn_plein > tn_pp -%}<s>{{ tn_plein | money }}</s> {% endif -%}{{ tn_pp | money }}{%- if tn_plein > tn_pp %} <em class="tn-moins">−{{ tn_plein | minus: tn_pp | times: 100.0 | divided_by: tn_plein | round }}&nbsp;%</em>{%- endif -%}</span>${k.quantite > 1 ? `<i>soit {{ tn_pp | divided_by: ${k.quantite} | money }} l'unité</i>` : ""}</label>${k.cadeauHandle ? CADEAU(k.cadeauHandle, "tn-pack-cadeau") : ""}<div class="tn-pack-lignes" data-tn-pack-lignes></div></li>`;
    };
    out = out.replace(/<form class="tn-packs-f"[^>]*>[\s\S]*<\/form>/, (m) => {
      const label = strip(/<button class="tn-bt"[^>]*>([\s\S]*?)<\/button>/.exec(m)?.[1] ?? "Ajouter au panier");
      return `{%- assign tn_v = product.selected_or_first_available_variant -%}{%- form 'product', product, class: 'tn-packs-f', data-tn-achat-form: 'oui' -%}<input type="hidden" name="id" value="{{ tn_v.id }}"><ul class="tn-pack-liste">${packs.slice(0, 4).map(one).join("")}</ul><button class="tn-bt" type="submit" name="add" data-tn-acheter{% unless product.available %} disabled{% endunless %}>${label}</button><p class="tn-erreur" data-tn-erreur role="alert" hidden></p>{%- endform -%}`;
    });
  }
  if (root === "tn-sous-bouton") {
    const drop = (h: string) => (/\[À compléter/.test(h) ? "" : h);
    out = out.replace(/(<section\b[^>]*>)/, `$1${o?.stockDepart ? `<div class="tn-jauge" data-tn-jauge data-tn-depart="${o.stockDepart}" role="img" hidden><i><b></b></i><span></span><span></span></div>` : ""}${o?.seuilStock ? `<p class="tn-stock" data-tn-stock data-tn-seuil="${o.seuilStock}" aria-live="polite" hidden></p>` : ""}`)
      .replace(/<p class="tn-delai"[^>]*>[\s\S]*?<\/p>/, o?.delaiLivraison ? `<p class="tn-delai" data-tn-delai>Chez toi en ${literal(attr(o.delaiLivraison.replace(/^(?:chez toi )?en\s+/i, "")))}</p>` : "")
      // Moyens de paiement : ceux que la boutique accepte vraiment, dessinés par Shopify.
      .replace(/<div class="tn-paiements-sb"[^>]*>[\s\S]*?<\/div>/, `<div class="tn-paiements-sb" data-tn-paiements-sb aria-label="Moyens de paiement acceptés">{%- for type in shop.enabled_payment_types -%}{{ type | payment_type_svg_tag }}{%- endfor -%}</div>`);
    const co = c.input.company ?? {};
    for (const [cle, val] of [["livraison", co.shipping], ["retours", co.returns]] as const) if (val) out = out.replace(new RegExp(`(<li data-tn-g="${cle}">[\\s\\S]*?<span>)[\\s\\S]*?(<\\/span>)`), (_m, a: string, b: string) => `${a}${literal(attr(coupe(val, 90)))}${b}`);
    // Ce qui n'a pas été écrit pour ce client ne part pas : volet, repère ou question encore « à compléter ».
    if (c.input.dropMissing) out = out.replace(/<details class="tn-tailles-sb"[\s\S]*?<\/details>(?=<details|<p|<div|<ul)/, drop).replace(/<details class="tn-recois">[\s\S]*?<\/details>/, drop)
      .replace(/<li data-tn-g="[a-z]+">[\s\S]*?<\/li>/g, drop).replace(/<details><summary>[\s\S]*?<\/details>/g, drop);
  }
  if (root === "tn-offre-moment") {
    const p = o?.promo && o.promo.endsAt > Date.now() ? o.promo : null;
    if (!p) return note("section non envoyée (aucune promotion saisie avec sa date de fin, ou date passée)");
    const fin = new Date(p.endsAt), jour = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, "0")}-${String(fin.getDate()).padStart(2, "0")}`;
    // La date passée, la pièce se cache d'elle-même (la boutique, puis le script) ; le décompte vise cette seule date.
    out = out.replace(/(<section\b[^>]*\sdata-tn-offre-moment\b)/, `$1 data-tn-fin="${p.endsAt}"{% assign tn_now = 'now' | date: '%s' | plus: 0 %}{% if tn_now >= ${Math.floor(p.endsAt / 1000)} %} hidden{% endif %}`)
      .replace(/(<b class="tn-om-nom">)[\s\S]*?(<\/b>)/, (_m, a: string, b: string) => (p.nom ? `${a}${literal(attr(p.nom))}${b}` : ""))
      .replace(/(<em class="tn-om-remise">)[\s\S]*?(<\/em>)/, `$1−${pctTxt(p.pct)}&nbsp;%$2`)
      .replace(/<div class="tn-om-cadeau">[\s\S]*?<\/div>/, p.cadeauHandle ? CADEAU(p.cadeauHandle, "tn-om-cadeau") : "")
      .replace(/(<p class="tn-om-fin"[^>]*>)[\s\S]*?(<\/p>)/, `$1{%- assign tn_jour = 'now' | date: '%Y-%m-%d' -%}{%- if tn_jour == '${jour}' -%}Aujourd'hui seulement{%- else -%}Jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}{%- endif -%}$2`)
      .replace(/<\/section>\s*$/, `${SCRIPT_COMMUN}</section>`);
    c.problems.push({ level: "à savoir", text: `${where} : la remise de −${pctTxt(p.pct)} % doit exister dans ta boutique jusqu'à la même date (prix de comparaison ou remise automatique) ; le thème ne change aucun prix, et la date passée, la pièce disparaît` });
  }
  if (root === "tn-fenetre-offre") {
    const f = o?.fenetreOffre;
    if (!f) return note("fenêtre non envoyée (aucune offre donnée avec son code de réduction)");
    out = out.replace(/(<h2 id="tn-fo-titre">)[\s\S]*?(<\/h2>)/, (_m, a: string, b: string) => `${a}${literal(attr(f.titre))}${b}`)
      .replace(/(<p class="tn-fo-texte">)[\s\S]*?(<\/p>)/, (_m, a: string, b: string) => `${a}${literal(attr(f.texte))}${b}`)
      // L'e-mail part dans la liste de clients de la boutique (formulaire d'inscription de Shopify) ; le code n'est écrit dans la page qu'après l'inscription.
      .replace(/<form class="tn-fo-form"[^>]*>([\s\S]*?)<\/form><div class="tn-fo-code"[^>]*>([\s\S]*?)<b>[\s\S]*?<\/b><\/div>/, (_m, inner: string, tete: string) => `{%- form 'customer', class: 'tn-fo-form' -%}{%- if form.posted_successfully? -%}<div class="tn-fo-code" data-tn-fo-code data-tn-recu>${tete}<b>${literal(attr(f.code))}</b></div>{%- else -%}<input type="hidden" name="contact[tags]" value="newsletter">${inner.replace('name="email"', 'name="contact[email]"')}{%- if form.errors -%}<p class="tn-erreur" role="alert">{{ form.errors | default_errors }}</p>{%- endif -%}{%- endif -%}{%- endform -%}`)
      .replace(/<\/section>\s*$/, `${SCRIPT_COMMUN}</section>`);
  }
  return out;
}

/** Une section du thème → sa section Shopify (HTML en Liquid, sa part de la feuille, un schéma). */
function sectionLiquid(c: Ctx, s: CtSection, o: { header?: boolean; /** Pièce de la coque propre à une page : traitée comme un en-tête ou un pied, sans la feuille du site. */ coque?: "header" | "footer" } = {}): string | null {
  const l = libSection(s.id);
  const where = `${c.page?.label ?? (o.header ? "En-tête" : "Site")} › ${l?.title ?? s.id}`;
  if (!isTenueSection(l)) { c.problems.push({ level: "bloquant", text: `${where} : cette section n'est pas à la tenue de la marque, elle ne part pas encore en boutique` }); return null; }
  const built = validConstruction(s.id, s.construction);
  let html = literal(sectionHtml(s));
  const root = rootOf(html);
  // En-têtes du thème unique : le menu prend la forme de la construction ; photos des familles et produits mis en avant
  // sont lus dans la boutique (collections), jamais figés dans le thème.
  if (o.header || o.coque === "header") html = withMenu(html, c.t.menu, { construction: built, boutique: !(c.input.business === "services" && !c.t.pages.some((pg) => pg.key === "cart")), shop: { collection: slug } });
  // Ce que le client a donné s'écrit dans la page : téléphone, adresse, horaires, zone, plan, livraison et retours.
  html = withTenueSite(withTenuePrestations(html, c.input.prestations ?? []), { ...(c.input.site ?? {}), shipping: c.input.company?.shipping ?? null, returns: c.input.company?.returns ?? null, prestations: c.input.prestations ?? [], live: true }, built).replace(/<mark class="tn-manque">([\s\S]*?)<\/mark>/g, "[$1]");
  // Une pièce qui ne vaut que par un fait du client (offre de première visite, délais, réseaux, horaires, adresse, fiche
  // d'un bien…) ne rend rien sans lui (tenue-data.ts) : elle n'est pas envoyée, et c'est dit.
  if (!html.trim()) { c.problems.push({ level: "à savoir", text: `${where} : section non envoyée (elle ne se montre qu'avec l'information du client, qui manque)` }); return null; }
  // Les avis : sans application d'avis dans la boutique, rien ne peut en recevoir ; la section n'est envoyée que si de vrais avis y sont écrits.
  if (root === "tn-avis" && !/<ul data-tn-avis>\s*<li>/.test(html)) { c.problems.push({ level: "à savoir", text: `${where} : section non envoyée (aucun avis réel ; dans Shopify, les avis demandent une application d'avis)` }); return null; }
  html = live(c, html, root);
  // Vente directe (module « vente ») : cartes de vente, guide de choix, page d'arrivée, ajout rapide de la collection.
  html = venteBoutique(html, { root, built, products: c.input.products, first: c.page?.product ?? c.input.products[0]?.handle ?? null });
  const sold = vente(c, html, root, where);
  if (sold === null) return null;
  html = sold;
  const before = /\[À compléter/.test(html);
  html = missing(c, html, where);
  // Une section vidée de ses informations ne garde pas un titre seul : elle est retirée, et c'est dit.
  if (before && c.input.dropMissing && !o.header && !o.coque) {
    const text = (h: string) => strip(h.replace(/<svg[\s\S]*?<\/svg>/g, " "));
    const titles = [...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/g)].map((m) => strip(m[1])).join(" ");
    // (Une phrase entière écrite en titre, une citation par exemple, est un contenu : elle reste.)
    if (text(html).length - titles.length < 12 && titles.length < 40 && !/tn-ph|<form|\{%-? form/.test(html)) { c.problems.push({ level: "à savoir", text: `${where} : section retirée, il ne restait que son titre` }); return null; }
  }
  html = forms(html, root);
  html = links(c, photos(c, html, where), where);
  html = html.replace(/\sonclick="return false"/g, "").replace(/^<(section|footer|aside|div)\b/, `<$1${built ? ` data-tn-c="${built}"` : ""}${o.coque ? " data-tn-coque" : ""}`);
  // Toute la feuille part avec l'en-tête (il est sur toutes les pages), dans l'ordre d'origine : couleurs et polices
  // de la marque, fond de page, socle, règles des sections utilisées, puis les règles propres à la boutique.
  const fond = c.input.palette?.light ?? "#F6F1E7";
  // Une feuille trop longue pour une seule section est coupée entre deux règles : le début reste dans l'en-tête, la
  // suite part dans des sections de suite du groupe d'en-tête (voir customThemeSpec), dans le même ordre.
  let css = "";
  if (o.header) {
    const tete = [tenueCss(c.input.palette, c.t.tenue, "", c.input.titleWeight ?? null).trim(), ".ctw{--f-title:var(--font-heading);--f-ui:var(--font-body)}",
      `html body:has(.ctw),html body:has(.ctw) .es-main,html body:has(.ctw) .shopify-section{background-color:${fond}}`,
      `html body:has(.ctw[data-tn-fond="toile"]){background-image:repeating-linear-gradient(0deg,color-mix(in srgb,var(--tn-encre) 3.5%,transparent) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,color-mix(in srgb,var(--tn-encre) 3%,transparent) 0 1px,transparent 1px 3px)}`,
      `html body:has(.ctw[data-tn-fond="toile"]) .es-main,html body:has(.ctw[data-tn-fond="toile"]) .shopify-section{background-color:transparent}`].join("\n");
    const parts = themeCssParts(c.roots, FEUILLE_MAX - tete.length - html.length - SHOP_CSS.length, FEUILLE_MAX - SHOP_CSS.length);
    css = [tete, parts[0], ...(parts.length === 1 ? [SHOP_CSS] : [])].join("\n");
    c.suite.push(...parts.slice(1).map((x, i, all) => (i === all.length - 1 ? `${x}\n${SHOP_CSS}` : x)));
  }
  const name = (l?.title ?? s.id).replace(/ à la tenue de la marque/, "").slice(0, 25);
  return `{%- comment -%} E-COM STUDIO IA : section du thème sur mesure (${s.id}). {%- endcomment -%}\n<div class="ctw ctw-${c.t.family}"${tenueAttrs(c.t.tenue, c.input.fonts?.heading)}>${html}</div>\n${css ? `{% stylesheet %}\n${css}\n{% endstylesheet %}\n` : ""}{% schema %}\n${JSON.stringify({ name, settings: [] })}\n{% endschema %}\n`;
}

/** Type des sections de suite de la feuille du site (« es-custom-feuille-1 »…). */
const FEUILLE_TYPE = "es-custom-feuille-";
/** Le modèle d'une page tel que Shopify le nomme, « nom.suffixe » (« page.arrivee », « index. » sans suffixe). */
export const coqueModele = (key: string) => (key.includes(".") ? key : `${key}.`);
/**
 * Une section d'un groupe du site (en-tête ou pied) qui ne rend rien sur les modèles des pages à coque propre : son
 * HTML est mis sous condition (« sauf » : la condition Liquid des modèles concernés), sa feuille et son schéma restent.
 */
export function sansCoque(liquid: string, sauf: string): string {
  return liquid.replace(/(\{%- endcomment -%\}\n)([\s\S]*?)(\n(?:\{% stylesheet %\}|\{% schema %\}))/, (_m, a: string, body: string, b: string) => `${a}{%- assign tn_modele = template.name | append: '.' | append: template.suffix -%}{%- unless ${sauf} -%}${body}{%- endunless -%}${b}`);
}

/** Gabarits que Shopify exige et que le thème sur mesure ne dessine pas : ceux du thème de base du Studio. */
const BASE_TEMPLATES: Record<string, TemplateJson> = {
  "list-collections": { sections: { main: { type: "main-list-collections", settings: {} } }, order: ["main"] },
  search: { sections: { main: { type: "main-search", settings: {} } }, order: ["main"] },
  page: { sections: { main: { type: "main-page", settings: {} } }, order: ["main"] },
  blog: { sections: { main: { type: "main-blog", settings: {} } }, order: ["main"] },
  article: { sections: { main: { type: "main-article", settings: {} } }, order: ["main"] },
  password: { sections: { main: { type: "main-password", settings: {} } }, order: ["main"], layout: "password" },
  collection: { sections: { main: { type: "main-collection", settings: {} } }, order: ["main"] },
  cart: { sections: { main: { type: "main-cart", settings: {} } }, order: ["main"] },
  "404": { sections: { main: { type: "main-404", settings: {} } }, order: ["main"] },
};

/** Le thème sur mesure, prêt pour Shopify : une version de thème du Studio, et tout ce qui reste à régler. */
export function customThemeSpec(t: CustomTheme, input: ExportInput): ShopifyExport {
  const problems: ExportProblem[] = [], files: Record<string, string> = {};
  const customSections: ThemeSpec["customSections"] = {}, templates: Record<string, TemplateJson> = {}, pages: StorePage[] = [], productSuffixes: Record<string, string> = {};
  const add = (c: Ctx, s: CtSection, o: { header?: boolean; coque?: "header" | "footer" } = {}): string | null => { const liquid = sectionLiquid(c, s, o); if (!liquid) return null; const type = `es-custom-${s.uid}`; customSections[type] = { name: (libSection(s.id)?.title ?? s.id).slice(0, 25), liquid }; return type; };
  const group = (list: (string | null)[], type: "header" | "footer", name: string) => { const ok = list.filter((x): x is string => !!x); return { type, name, sections: Object.fromEntries(ok.map((x) => [x.replace(/^es-custom-/, "tn-"), { type: x, settings: {} }])), order: ok.map((x) => x.replace(/^es-custom-/, "tn-")) }; };
  const roots = new Set(allSections(t).map((x) => rootOf(sectionHtml(x.s))).filter((x): x is string => !!x));
  const suite: string[] = [];
  const ctx = (page: CtPage | null, template: string | null): Ctx => ({ input, t, files, problems, page, template, suite, roots });
  if (!t.header || !t.footer) problems.push({ level: "bloquant", text: "il manque l'en-tête ou le pied de page" });
  const bands = (t.extras ?? []).filter((s) => tenueSection(s.id)?.group === "bandeau");
  // Le tiroir de panier part avec le pied de page (il est sur toutes les pages) ; la recherche à tenue, avec l'en-tête.
  const drawer = input.business === "products" ? drawerOf(t) : null;
  const search = t.search && rootOf(sectionHtml(t.search)) === "tn-recherche" ? t.search : null;
  if (drawer) roots.add("tn-panier-cote");
  // La fenêtre d'offre part avec le pied de page (elle est sur toutes les pages), seulement si le client a donné son offre.
  const offre = (t.extras ?? []).find((s) => rootOf(sectionHtml(s)) === "tn-fenetre-offre") ?? null;
  for (const s of (t.extras ?? []).filter((x) => !bands.includes(x) && x !== drawer && x !== offre)) problems.push({ level: "à savoir", text: `« ${libSection(s.id)?.title ?? s.id} » n'est pas envoyée : Shopify a sa propre fenêtre pour cela (cookies, âge), à régler dans la boutique` });
  // L'en-tête porte le socle de la feuille (couleurs, polices, formes) : il est sur toutes les pages.
  const header = group([...bands.map((s) => add(ctx(null, null), s)), t.header ? add(ctx(null, null), t.header, { header: true }) : null, search ? add(ctx(null, null), { ...search, construction: undefined }) : null], "header", "En-tête");
  const footer = group([t.footer ? add(ctx(null, null), t.footer) : null, drawer ? add(ctx(null, null), drawer) : null, offre ? add(ctx(null, null), offre) : null], "footer", "Pied de page");
  // La suite de la feuille du site (site complet : elle ne tient pas dans la seule section de l'en-tête) : des sections
  // du groupe d'en-tête qui ne portent que des règles, écrites dans la page pour garder l'ordre d'origine (la feuille
  // de l'en-tête est chargée d'abord, puis chaque suite, dans l'ordre du groupe).
  suite.forEach((part, i) => {
    const type = `${FEUILLE_TYPE}${i + 1}`;
    customSections[type] = { name: `Feuille du site ${i + 2}`, liquid: `{%- comment -%} E-COM STUDIO IA : suite de la feuille du site (elle ne tient pas dans une seule section). {%- endcomment -%}\n<style>${/\{\{|\{%/.test(part) ? `{% raw %}${part}{% endraw %}` : part}</style>\n{% schema %}\n${JSON.stringify({ name: `Feuille du site ${i + 2}`, settings: [] })}\n{% endschema %}\n` };
    header.sections[`tn-feuille-${i + 1}`] = { type, settings: {} }; header.order.push(`tn-feuille-${i + 1}`);
  });
  // Remises : le thème n'en calcule aucune. La liste exacte de ce que la boutique doit porter, dite au client.
  const attendues = remisesAttendues(input.offres);
  if (attendues.length && allSections(t).some((x) => ["tn-lots", "tn-packs"].includes(rootOf(sectionHtml(x.s)) ?? ""))) problems.push({ level: "à savoir", text: `Remises : le thème affiche les prix de tes offres mais n'en calcule aucune ; le prix payé est celui de ta boutique. ${input.offres?.remisesConfirmees ? "Tu as confirmé avoir créé" : "À créer dans ta boutique (Réductions › Réduction automatique)"} : ${attendues.join(" ; ")}` });
  if (search && search.construction && search.construction !== validConstruction(search.id, null)) problems.push({ level: "à savoir", text: "La recherche est posée en barre sous l'en-tête : sans script, le panneau qui s'ouvre par la loupe ne part pas en boutique" });
  if (drawer && footer.order.some((k) => footer.sections[k].type === `es-custom-${drawer.uid}`)) {
    // Le panier de l'en-tête ouvre le tiroir (sauf sur la page panier elle-même) ; sans script, il ne s'ouvre pas tout seul après un ajout.
    for (const x of Object.values(header.sections)) customSections[x.type].liquid = customSections[x.type].liquid.replace(/href="\{\{ routes\.cart_url \}\}"/g, `href="{% if template.name == 'cart' %}{{ routes.cart_url }}{% else %}#tn-panier-cote{% endif %}"`);
    problems.push({ level: "à savoir", text: "Tiroir de panier : dans Shopify, il s'ouvre au clic sur le panier de l'en-tête ; après un ajout au panier, la boutique montre la page panier (aucun script ne part)" });
  }
  const coques: { key: string; label: string }[] = [];
  for (const [i, pg] of t.pages.entries()) {
    const key = templateOf(pg, i === 0);
    if (!key) { problems.push({ level: "à savoir", text: `« ${pg.label} » n'est pas envoyée : dans Shopify, le compte client est une page de Shopify` }); continue; }
    // Coque propre à la page : SON en-tête est la première section du modèle, SON pied la dernière.
    const c = ctx(pg, key), types = [pg.coque?.header ? add(c, pg.coque.header, { coque: "header" }) : null, ...pg.sections.map((s) => add(c, s)), pg.coque?.footer ? add(c, pg.coque.footer, { coque: "footer" }) : null].filter((x): x is string => !!x);
    if (hasCoque(pg)) coques.push({ key, label: pg.label });
    templates[key] = { sections: Object.fromEntries(types.map((x) => [x.replace(/^es-custom-/, "tn-"), { type: x, settings: {} }])), order: types.map((x) => x.replace(/^es-custom-/, "tn-")), ...(key === "password" ? { layout: "password" } : {}) };
    if (key.startsWith("product.") && pg.product) productSuffixes[pg.product] = key.slice(8);
    if (templates[key] && ["blog", "article", "search"].includes(key)) problems.push({ level: "à savoir", text: `« ${pg.label} » : dans Shopify, cette page est remplie par la boutique (articles du journal, résultats de la recherche)` });
    if (key.startsWith("page.")) pages.push({ handle: pageName(pg.key), title: pg.label, template_suffix: key.slice(5), body_html: "", ...(pg.seo ? { seo: pg.seo } : {}) });
    // Une fiche produit vend : elle garde un vrai formulaire d'achat.
    if (/^product/.test(key) && !types.some((x) => /\{%-?\s*form 'product'/.test(customSections[x].liquid))) problems.push({ level: "bloquant", text: `« ${pg.label} » n'a pas de bloc d'achat : une fiche produit doit permettre d'acheter` });
  }
  // Pages à coque propre (page d'arrivée d'une publicité) : Shopify n'a qu'un groupe d'en-tête et un groupe de pied par
  // thème. Sur le modèle de ces pages, les sections des deux groupes (bandeau, en-tête, recherche, pied, panier de côté,
  // fenêtre d'offre) ne rendent rien ; leur feuille et leur schéma restent (la feuille du site part avec l'en-tête).
  if (coques.length) {
    const sauf = coques.map((x) => `tn_modele == '${coqueModele(x.key)}'`).join(" or ");
    for (const g of [header, footer]) for (const x of Object.values(g.sections)) if (!x.type.startsWith(FEUILLE_TYPE)) customSections[x.type].liquid = sansCoque(customSections[x.type].liquid, sauf);
    // Hors de Shopify (WooCommerce, PrestaShop), l'en-tête et le pied du site sont posés une fois pour toutes les pages :
    // là, c'est la feuille du site qui les retire des pages qui portent leur coque (chaque section y garde son repère « data-es-type »).
    const duSite = [header, footer].flatMap((g) => Object.values(g.sections).filter((x) => !x.type.startsWith(FEUILLE_TYPE)).map((x) => `[data-es-type="${x.type}"]`));
    if (t.header && customSections[`es-custom-${t.header.uid}`] && duSite.length) customSections[`es-custom-${t.header.uid}`].liquid = customSections[`es-custom-${t.header.uid}`].liquid.replace(/\n\{% endstylesheet %\}/, () => `\nhtml body:has([data-tn-coque]) :is(${duSite.join(",")}){display:none!important}\n{% endstylesheet %}`);
    problems.push({ level: "à savoir", text: `${coques.map((x) => `« ${x.label} »`).join(", ")} : cette page a son propre en-tête et son propre pied ; l'en-tête, le pied et les fenêtres du site ne s'y affichent pas` });
  }
  for (const [k, v] of Object.entries(BASE_TEMPLATES)) templates[k] ??= structuredClone(v);
  // Un site de services ne dessine pas de fiche produit : Shopify en exige une, c'est celle du thème de base.
  if (input.business === "services") templates.product ??= { sections: { main: { type: "main-product", settings: {} } }, order: ["main"] };
  if (input.business === "products") { templates.index ?? problems.push({ level: "bloquant", text: "il manque la page d'accueil" }); if (!templates.product) problems.push({ level: "bloquant", text: "il manque la fiche produit" }); }
  // Familles de produits → collections de la boutique (celles du menu et de la page boutique).
  const families = [...new Set(input.products.flatMap((p) => p.categories.map((x) => x.trim()).filter(Boolean)))];
  // Une famille dont SINA a dessiné la page de collection reçoit SON modèle (« collection.<famille> ») ; les autres gardent
  // le modèle commun. Un modèle de collection sans famille au catalogue est dit au client : il ne serait relié à rien.
  const collections: StoreCollection[] = families.map((f) => ({ handle: slug(f), title: f, description: "", products: input.products.filter((p) => p.categories.includes(f)).map((p) => p.handle), ...(templates[`collection.${slug(f)}`] ? { template_suffix: slug(f) } : {}) }));
  for (const k of Object.keys(templates)) if (k.startsWith("collection.") && !families.some((f) => slug(f) === k.slice(11))) problems.push({ level: "à savoir", text: `Le modèle de collection « ${k.slice(11)} » ne correspond à aucune famille de ton catalogue : il part dans le thème, mais aucune collection ne l'utilise` });
  const base = input.base;
  const font = (id: string | null | undefined, fallback: string, weight?: number | null) => (id ? (/_[ni]\d$/.test(id) && !weight ? id : `${id.replace(/_[ni]\d$/, "")}_n${weight ? Math.round(weight / 100) : 4}`) : fallback);
  const spec: ThemeSpec = {
    v: 1, name: `${input.name} · thème sur mesure`, language: base?.language ?? "fr", direction: base?.direction ?? "onde",
    settings: { ...(base?.settings ?? {}), type_heading_font: font(input.fonts?.heading, "instrument_serif_n4", input.titleWeight), type_body_font: font(input.fonts?.body, "dm_sans_n4") },
    groups: { header, footer }, templates, customSections, files: { ...(base?.files ?? {}), ...files }, locks: [],
    meta: { ...(base?.meta ?? {}) },
    store: {
      ...(base?.store ?? { shopName: input.name, product: { title: input.products[0]?.title ?? input.name, handle: input.products[0]?.handle ?? "produit", vendor: input.name, description_html: "", price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] }, menus: {}, policies: [] }),
      shopName: input.name, business: input.business, pages, ...(collections.length ? { collections } : {}),
    } as ThemeSpec["store"],
  };
  return { spec, problems, templates: Object.keys(templates), sections: Object.keys(customSections).length, productSuffixes };
}

/** Sections d'un thème qui ne sont pas à tenue (elles ne partent pas encore en boutique). */
export const notTenue = (t: CustomTheme) => allSections(t).filter((x) => !isTenueSection(libSection(x.s.id))).map((x) => libSection(x.s.id)?.title ?? x.s.id);
