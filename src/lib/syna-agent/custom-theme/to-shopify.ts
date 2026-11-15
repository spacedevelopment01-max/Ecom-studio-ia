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
import { LIBRARY_DIR, libSection } from "./library";
import { TENUE_FILES, TENUE_SECTIONS, isTenueSection, tenueAttrs, tenueCss, tenueSection, validConstruction, withTenuePrestations, type TenuePrestation } from "./tenue";
import { withMenu } from "./menu";
import { withTenueComparison, withTenueFamilies, withTenueSite, type TenueSite } from "./tenue-data";
import { allSections, sectionHtml, type CtPage, type CtSection, type CustomTheme } from "./theme";

export type ExportProblem = { level: "bloquant" | "à savoir"; text: string };
export type ExportProduct = { handle: string; title: string; categories: string[] };
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
  site?: Pick<TenueSite, "phone" | "address" | "hours" | "area">;
  /** Extension du fichier d'un média de la bibliothèque (« jpg », « png »), ou null s'il n'existe plus. */
  assetExt: (assetId: string) => string | null;
  /** Texte de bouton ou de lien → clé de page (les liens écrits pour la marque, comme dans l'aperçu). */
  linkMap: Record<string, string>;
  /** Logo de la marque (média de la bibliothèque), s'il existe. */
  logoAssetId?: string | null;
  /** Avec l'accord du client : les informations encore « [À compléter] » sont retirées au lieu de bloquer. */
  dropMissing?: boolean;
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
export function templateOf(pg: Pick<CtPage, "key" | "product"> & { sections?: { id: string }[] }, first: boolean): string | null {
  const has = (id: string) => (pg.sections ?? []).some((s) => s.id === id);
  if (pg.key === "home") return "index";
  // Pages que la boutique remplit elle-même : la liste des articles, un article, les résultats d'une recherche.
  if (has("tn-journal")) return "blog";
  if (has("tn-article")) return "article";
  if (has("tn-resultats")) return "search";
  if (pg.key === "product") return "product";
  if (/^product-/.test(pg.key)) return `product.${suffixOf(pg)}`;
  if (pg.key === "shop") return "collection";
  if (pg.key === "cart") return "cart";
  if (pg.key === "404") return "404";
  if (pg.key === "compte") return null;
  void first;
  return `page.${pg.key}`;
}
/** Suffixe du modèle de la fiche propre à un produit (« product.<suffixe> »). */
export const suffixOf = (pg: Pick<CtPage, "key" | "product">) => `fiche-${slug(pg.product ?? pg.key.replace(/^product-/, ""))}`.slice(0, 50).replace(/-+$/, "");

type Ctx = { input: ExportInput; t: CustomTheme; files: Record<string, string>; problems: ExportProblem[]; page: CtPage | null; template: string | null; /** Classes racines des sections du thème (leur feuille part avec l'en-tête). */ roots: Set<string> };

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
  if (pg && key !== "404") return `{{ routes.root_url }}pages/${key}`;
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
  if (/photos\/[\w.-]+\.(?:webp|png|jpe?g)/.test(out)) { c.problems.push({ level: "bloquant", text: `${where} : il reste une photo d'exemple (aucune ne part en boutique)` }); out = out.replace(/\s?style="background-image:url\(photos\/[^)]*\)"/g, ""); }
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
const NEWSLETTER = new Set(["tn-infolettre", "tn-infolettre-photo", "tn-pied-complet"]);
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

const SHOP_CARD = `<a class="tn-carte-p{% unless product.available %} tn-epuise{% endunless %}" href="{{ product.url }}"><div class="tn-ph"{% if product.featured_image %} style="background-image:url({{ product.featured_image | image_url: width: 800 }})"{% endif %}></div><b>{{ product.title }}</b><span>{{ product.price | money }}</span>{% unless product.available %}<em>Épuisé</em>{% endunless %}</a>`;
const CARD = (limit: string, source: string) => `<div class="tn-cartes">{%- for product in ${source} ${limit} -%}<a class="tn-carte-p{% unless product.available %} tn-epuise{% endunless %}" href="{{ product.url }}"><div class="tn-ph"{% if product.featured_image %} style="background-image:url({{ product.featured_image | image_url: width: 800 }})"{% endif %}></div><b>{{ product.title }}</b><span>{% if product.available %}{{ product.price | money }}{% else %}Épuisé{% endif %}</span></a>{%- endfor -%}</div>`;

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
    out = out.replace(/<div class="tn-cartes">[\s\S]*<\/div>(?=<\/section>)/, shop ? `{%- paginate collection.products by 48 -%}${CARD("", "collection.products")}{%- if collection.products.size == 0 -%}<p class="tn-vide">Aucun produit ici pour l'instant.</p>{%- endif -%}{%- endpaginate -%}` : CARD("limit: 8", "collections.all.products"));
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
    const label = strip(/<a class="tn-bt"[^>]*data-pogo[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1] ?? "Ajouter au panier");
    out = out
      .replace(/<div class="tn-galerie">[\s\S]*?<\/div><\/div>/, `<div class="tn-galerie">{%- if product.featured_image -%}<div class="tn-grande tn-ph" role="img" aria-label="{{ product.featured_image.alt | default: product.title | escape }}" style="background-image:url({{ product.featured_image | image_url: width: 1400 }})"></div>{%- endif -%}{%- if product.images.size > 1 -%}<div class="tn-vignettes">{%- for image in product.images limit: 5 -%}<i class="tn-ph" style="background-image:url({{ image | image_url: width: 300 }})"></i>{%- endfor -%}</div>{%- endif -%}</div>`)
      .replace(/<div class="tn-prix">[\s\S]*?<\/div>(?:<div class="tn-rupture">[\s\S]*?<\/div>)?/, `<div class="tn-prix">{{ product.selected_or_first_available_variant.price | money }}</div>{%- unless product.available -%}<div class="tn-rupture">Épuisé pour l'instant.</div>{%- endunless -%}`)
      .replace(/<a class="tn-bt[^"]*"[^>]*data-pogo[^>]*>[\s\S]*?<\/a>(?=<ul|<\/section>|<div class="tn-barre">)/, `{%- form 'product', product, class: 'tn-enveloppe' -%}{%- if product.has_only_default_variant -%}<input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">{%- else -%}<select class="tn-choix" name="id" aria-label="Choisir une version">{%- for variant in product.variants -%}<option value="{{ variant.id }}"{% if variant == product.selected_or_first_available_variant %} selected{% endif %}{% unless variant.available %} disabled{% endunless %}>{{ variant.title }} · {{ variant.price | money }}</option>{%- endfor -%}</select>{%- endif -%}<button class="tn-bt" type="submit" name="add"{% unless product.available %} disabled{% endunless %}>${label}</button>{%- if product.available -%}<div class="tn-rapide">{{ form | payment_button }}</div>{%- endif -%}{%- endform -%}`)
      .replace(/<div class="tn-barre">[\s\S]*?<\/div>(?=<\/section>)/, "");
    if (c.input.priceNotes?.length) out = out.replace(/(<div class="tn-prix">[\s\S]*?<\/div>(?:\{%- unless product\.available -%\}[\s\S]*?\{%- endunless -%\})?)/, `$1<ul class="tn-pres-prix">${c.input.priceNotes.slice(0, 3).map((n) => `<li>${literal(attr(n))}</li>`).join("")}</ul>`);
    // Livraison et retours : ceux du client, tels qu'il les a donnés.
    const co = c.input.company ?? {};
    out = out.replace(/<ul class="tn-reperes">[\s\S]*?<\/ul>/, `<ul class="tn-reperes"><li>Livraison : ${co.shipping ? literal(attr(co.shipping)) : "[À compléter]"}</li><li>Retours : ${co.returns ? literal(attr(co.returns)) : "[À compléter]"}</li></ul>`);
  }
  // Panier : les vraies lignes, le vrai total, le bouton qui ouvre le paiement de Shopify.
  if (/\sdata-tn-panier\b/.test(out)) {
    const button = strip(/<a class="tn-bt"[^>]*>([\s\S]*?)<\/a>/.exec(out)?.[1] ?? "Passer commande"), total = strip(/<div class="tn-total"><span>([\s\S]*?)<\/span>/.exec(out)?.[1] ?? "Total");
    out = out.replace(/<div class="tn-ligne">[\s\S]*?<a class="tn-bt"[^>]*>[\s\S]*?<\/a>/, `{%- if cart.item_count == 0 -%}<p class="tn-vide">${v ? "Votre" : "Ton"} panier est vide.</p><a class="tn-bt" href="{{ routes.all_products_collection_url }}">Voir la boutique</a>{%- else -%}<form class="tn-enveloppe" action="{{ routes.cart_url }}" method="post">{%- for item in cart.items -%}<div class="tn-ligne"><div class="tn-ph"{% if item.image %} style="background-image:url({{ item.image | image_url: width: 300 }})"{% endif %}></div><div><b>{{ item.product.title }}</b><span>Quantité : {{ item.quantity }}</span></div><span class="tn-prix-l">{{ item.final_line_price | money }}</span></div>{%- endfor -%}<div class="tn-total"><span>${total}</span><span class="tn-prix-t">{{ cart.total_price | money }}</span></div><button class="tn-bt" type="submit" name="checkout">${button}</button>{%- if additional_checkout_buttons -%}<div class="tn-rapide">{{ content_for_additional_checkout_buttons }}</div>{%- endif -%}</form>{%- endif -%}`);
  }
  // En-tête : le nombre d'articles du vrai panier, le nom qui ramène à l'accueil, le logo s'il existe.
  if (root === "tn-entete" && c.input.business === "services" && !c.t.pages.some((pg) => pg.key === "cart")) out = out.replace(/<button type="button" class="tn-pan"[^>]*>[\s\S]*?<\/button>/, "");
  if (root === "tn-entete") {
    out = out.replace(/<button type="button" class="tn-pan"([^>]*)>([\s\S]*?)<span>0<\/span>([\s\S]*?)<\/button>/, `<a class="tn-pan" href="{{ routes.cart_url }}"$1>$2<span>{{ cart.item_count }}</span>$3</a>`);
    if (c.input.logoAssetId) { const ext = c.input.assetExt(c.input.logoAssetId); if (ext) { const f = `tn-logo.${ext}`; c.files[f] = c.input.logoAssetId; out = out.replace(/(<span class="tn-nom lg">)[\s\S]*?(<\/span>)/, `$1<img src="{{ '${f}' | asset_url }}" alt="${attr(c.input.name)}" loading="eager">$2`); } }
  }
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
.ctw .tn .tn-paiements svg{height:22px;width:auto}`;

/** Une section du thème → sa section Shopify (HTML en Liquid, sa part de la feuille, un schéma). */
function sectionLiquid(c: Ctx, s: CtSection, o: { header?: boolean } = {}): string | null {
  const l = libSection(s.id);
  const where = `${c.page?.label ?? (o.header ? "En-tête" : "Site")} › ${l?.title ?? s.id}`;
  if (!isTenueSection(l)) { c.problems.push({ level: "bloquant", text: `${where} : cette section n'est pas à la tenue de la marque, elle ne part pas encore en boutique` }); return null; }
  const built = validConstruction(s.id, s.construction);
  let html = literal(sectionHtml(s));
  const root = rootOf(html);
  if (o.header) html = withMenu(html, c.t.menu);
  // Ce que le client a donné s'écrit dans la page : téléphone, adresse, horaires, zone, plan, livraison et retours.
  html = withTenueSite(withTenuePrestations(html, c.input.prestations ?? []), { ...(c.input.site ?? {}), shipping: c.input.company?.shipping ?? null, returns: c.input.company?.returns ?? null, prestations: c.input.prestations ?? [] }).replace(/<mark class="tn-manque">([\s\S]*?)<\/mark>/g, "[$1]");
  // Les avis : sans application d'avis dans la boutique, rien ne peut en recevoir ; la section n'est envoyée que si de vrais avis y sont écrits.
  if (root === "tn-avis" && !/<ul data-tn-avis>\s*<li>/.test(html)) { c.problems.push({ level: "à savoir", text: `${where} : section non envoyée (aucun avis réel ; dans Shopify, les avis demandent une application d'avis)` }); return null; }
  html = live(c, html, root);
  const before = /\[À compléter/.test(html);
  html = missing(c, html, where);
  // Une section vidée de ses informations ne garde pas un titre seul : elle est retirée, et c'est dit.
  if (before && c.input.dropMissing && !o.header) {
    const text = (h: string) => strip(h.replace(/<svg[\s\S]*?<\/svg>/g, " "));
    const titles = [...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/g)].map((m) => strip(m[1])).join(" ");
    // (Une phrase entière écrite en titre, une citation par exemple, est un contenu : elle reste.)
    if (text(html).length - titles.length < 12 && titles.length < 40 && !/tn-ph|<form|\{%-? form/.test(html)) { c.problems.push({ level: "à savoir", text: `${where} : section retirée, il ne restait que son titre` }); return null; }
  }
  html = forms(html, root);
  html = links(c, photos(c, html, where), where);
  html = html.replace(/\sonclick="return false"/g, "").replace(/^<(section|footer|aside|div)\b/, `<$1${built ? ` data-tn-c="${built}"` : ""}`);
  // Toute la feuille part avec l'en-tête (il est sur toutes les pages), dans l'ordre d'origine : couleurs et polices
  // de la marque, fond de page, socle, règles des sections utilisées, puis les règles propres à la boutique.
  const fond = c.input.palette?.light ?? "#F6F1E7";
  const css = o.header ? [tenueCss(c.input.palette, c.t.tenue, "", c.input.titleWeight ?? null).trim(), ".ctw{--f-title:var(--font-heading);--f-ui:var(--font-body)}",
    `html body:has(.ctw),html body:has(.ctw) .es-main,html body:has(.ctw) .shopify-section{background-color:${fond}}`,
    `html body:has(.ctw[data-tn-fond="toile"]){background-image:repeating-linear-gradient(0deg,color-mix(in srgb,var(--tn-encre) 3.5%,transparent) 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,color-mix(in srgb,var(--tn-encre) 3%,transparent) 0 1px,transparent 1px 3px)}`,
    `html body:has(.ctw[data-tn-fond="toile"]) .es-main,html body:has(.ctw[data-tn-fond="toile"]) .shopify-section{background-color:transparent}`,
    themeCss(c.roots), SHOP_CSS].join("\n") : "";
  const name = (l?.title ?? s.id).replace(/ à la tenue de la marque/, "").slice(0, 25);
  return `{%- comment -%} E-COM STUDIO IA : section du thème sur mesure (${s.id}). {%- endcomment -%}\n<div class="ctw ctw-${c.t.family}"${tenueAttrs(c.t.tenue)}>${html}</div>\n${css ? `{% stylesheet %}\n${css}\n{% endstylesheet %}\n` : ""}{% schema %}\n${JSON.stringify({ name, settings: [] })}\n{% endschema %}\n`;
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
  const add = (c: Ctx, s: CtSection, o: { header?: boolean } = {}): string | null => { const liquid = sectionLiquid(c, s, o); if (!liquid) return null; const type = `es-custom-${s.uid}`; customSections[type] = { name: (libSection(s.id)?.title ?? s.id).slice(0, 25), liquid }; return type; };
  const group = (list: (string | null)[], type: "header" | "footer", name: string) => { const ok = list.filter((x): x is string => !!x); return { type, name, sections: Object.fromEntries(ok.map((x) => [x.replace(/^es-custom-/, "tn-"), { type: x, settings: {} }])), order: ok.map((x) => x.replace(/^es-custom-/, "tn-")) }; };
  const roots = new Set(allSections(t).map((x) => rootOf(sectionHtml(x.s))).filter((x): x is string => !!x));
  const ctx = (page: CtPage | null, template: string | null): Ctx => ({ input, t, files, problems, page, template, roots });
  if (!t.header || !t.footer) problems.push({ level: "bloquant", text: "il manque l'en-tête ou le pied de page" });
  const bands = (t.extras ?? []).filter((s) => tenueSection(s.id)?.group === "bandeau");
  for (const s of (t.extras ?? []).filter((x) => !bands.includes(x))) problems.push({ level: "à savoir", text: `« ${libSection(s.id)?.title ?? s.id} » n'est pas envoyée : Shopify a sa propre fenêtre pour cela (cookies, âge), à régler dans la boutique` });
  // L'en-tête porte le socle de la feuille (couleurs, polices, formes) : il est sur toutes les pages.
  const header = group([...bands.map((s) => add(ctx(null, null), s)), t.header ? add(ctx(null, null), t.header, { header: true }) : null], "header", "En-tête");
  const footer = group([t.footer ? add(ctx(null, null), t.footer) : null], "footer", "Pied de page");
  for (const [i, pg] of t.pages.entries()) {
    const key = templateOf(pg, i === 0);
    if (!key) { problems.push({ level: "à savoir", text: `« ${pg.label} » n'est pas envoyée : dans Shopify, le compte client est une page de Shopify` }); continue; }
    const c = ctx(pg, key), types = pg.sections.map((s) => add(c, s)).filter((x): x is string => !!x);
    templates[key] = { sections: Object.fromEntries(types.map((x) => [x.replace(/^es-custom-/, "tn-"), { type: x, settings: {} }])), order: types.map((x) => x.replace(/^es-custom-/, "tn-")) };
    if (key.startsWith("product.") && pg.product) productSuffixes[pg.product] = key.slice(8);
    if (templates[key] && ["blog", "article", "search"].includes(key)) problems.push({ level: "à savoir", text: `« ${pg.label} » : dans Shopify, cette page est remplie par la boutique (articles du journal, résultats de la recherche)` });
    if (key.startsWith("page.")) pages.push({ handle: pg.key, title: pg.label, template_suffix: key.slice(5), body_html: "", ...(pg.seo ? { seo: pg.seo } : {}) });
    // Une fiche produit vend : elle garde un vrai formulaire d'achat.
    if (/^product/.test(key) && !types.some((x) => /\{%-?\s*form 'product'/.test(customSections[x].liquid))) problems.push({ level: "bloquant", text: `« ${pg.label} » n'a pas de bloc d'achat : une fiche produit doit permettre d'acheter` });
  }
  for (const [k, v] of Object.entries(BASE_TEMPLATES)) templates[k] ??= structuredClone(v);
  // Un site de services ne dessine pas de fiche produit : Shopify en exige une, c'est celle du thème de base.
  if (input.business === "services") templates.product ??= { sections: { main: { type: "main-product", settings: {} } }, order: ["main"] };
  if (input.business === "products") { templates.index ?? problems.push({ level: "bloquant", text: "il manque la page d'accueil" }); if (!templates.product) problems.push({ level: "bloquant", text: "il manque la fiche produit" }); }
  // Familles de produits → collections de la boutique (celles du menu et de la page boutique).
  const families = [...new Set(input.products.flatMap((p) => p.categories.map((x) => x.trim()).filter(Boolean)))];
  const collections: StoreCollection[] = families.map((f) => ({ handle: slug(f), title: f, description: "", products: input.products.filter((p) => p.categories.includes(f)).map((p) => p.handle) }));
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
