/**
 * Le menu principal d'un thème sur mesure, calculé depuis les pages du thème et le catalogue du client (13 novembre
 * 2026 ; question du propriétaire : « Et les méga menu tu va faire commenr pour les clients ? »). Gratuit, sans IA.
 *
 * Principe : le menu n'est pas écrit à la main dans l'en-tête, il vient des vraies données. SINA le PROPOSE (peu de
 * produits : un menu simple ; des familles : un sous-menu ; beaucoup de produits ou de familles : un grand menu par
 * familles, avec quelques produits dans chacune), le client le corrige, le thème le garde (CustomTheme.menu). Un lien
 * ne mène jamais à une page qui n'existe pas.
 */
import type { CustomTheme, MenuItem } from "./theme";

export type MenuProduct = { handle: string; title: string; categories: string[] };
export type SiteMenu = MenuItem[];

/** Au-delà, une famille ne liste plus ses produits dans le grand menu : « Tout voir » suffit. */
export const MENU_PRODUCTS_PER_FAMILY = 5;
/** Un grand menu à partir de tant de familles, ou de tant de produits rangés par familles. */
export const GRAND_MENU_FROM = { families: 4, products: 9 };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const first = <T>(list: (T | null | undefined | false)[]) => list.find(Boolean) as T | undefined;

/** Page de la fiche d'un produit : la sienne si elle existe, sinon la fiche commune. */
export function productPageKey(t: CustomTheme, handle: string): string | null {
  return t.pages.find((p) => p.product === handle)?.key ?? t.pages.find((p) => p.key === "product")?.key ?? null;
}

/** Le menu que SINA propose, d'après ce que le site contient vraiment. */
export function proposeMenu(t: CustomTheme, products: MenuProduct[], business: "products" | "services"): SiteMenu {
  const page = (...keys: string[]) => first(keys.map((k) => t.pages.find((p) => p.key === k)));
  const out: SiteMenu = [];
  if (business === "services") {
    const prestations = page("prestations"), book = page("reservation", "devis"), work = page("realisations");
    if (prestations) out.push({ label: prestations.label, to: prestations.key });
    if (work) out.push({ label: work.label, to: work.key });
    if (book) out.push({ label: book.label, to: book.key });
  } else {
    const shop = page("shop"), product = page("product");
    const families = [...new Set(products.flatMap((p) => p.categories.map((c) => c.trim()).filter(Boolean)))];
    if (shop && families.length >= 2) {
      const grand = families.length >= GRAND_MENU_FROM.families || products.length >= GRAND_MENU_FROM.products;
      out.push({
        label: shop.label, to: shop.key, ...(grand ? { grand: true } : {}),
        children: [{ label: "Tout voir", to: shop.key }, ...families.map((f) => {
          const inside = products.filter((p) => p.categories.includes(f));
          const items = grand && inside.length <= MENU_PRODUCTS_PER_FAMILY ? inside.map((p) => ({ label: p.title, to: productPageKey(t, p.handle) ?? shop.key })) : [];
          return { label: f, to: `${shop.key}:${f}`, ...(items.length ? { items } : {}) };
        })],
      });
    } else if (shop && products.length >= 2 && products.length <= 6 && products.every((p) => t.pages.some((pg) => pg.product === p.handle))) {
      // Peu de produits, chacun avec sa fiche : ils sont dans le menu.
      out.push({ label: shop.label, to: shop.key, children: products.map((p) => ({ label: p.title, to: productPageKey(t, p.handle)! })) });
    } else if (shop) out.push({ label: shop.label, to: shop.key });
    else if (product) out.push({ label: product.label, to: product.key });
  }
  for (const k of ["about", "journal", "aide", "contact"]) { const pg = page(k); if (pg) out.push({ label: pg.label, to: pg.key }); }
  return out;
}

/** Un menu enregistré ne garde que les liens qui mènent quelque part ; un sous-menu vidé disparaît. */
export function validMenu(t: CustomTheme, menu: SiteMenu): { menu: SiteMenu; dropped: string[] } {
  const keys = new Set(t.pages.map((p) => p.key)), ok = (to: string) => keys.has(to.split(":")[0]);
  const dropped: string[] = [];
  const keep = <X extends { label: string; to: string }>(list: X[] | undefined) => (list ?? []).filter((x) => ok(x.to) || (dropped.push(x.label), false));
  const out = keep(menu).map((m) => {
    const children = keep(m.children).map((c) => { const items = keep(c.items); return { label: c.label, to: c.to, ...(items.length ? { items } : {}) }; });
    return { label: m.label, to: m.to, ...(m.grand && children.length ? { grand: true } : {}), ...(children.length ? { children } : {}) };
  });
  return { menu: out, dropped };
}

/** Le menu en HTML, pour l'en-tête à tenue : liens simples, sous-menus en volets, grand menu en colonnes. */
export function menuHtml(menu: SiteMenu): string {
  const a = (x: { label: string; to: string }, cls = "") => `<a${cls ? ` class="${cls}"` : ""} href="#" onclick="return false" data-go="${esc(x.to)}">${esc(x.label)}</a>`;
  return menu.map((m) => {
    if (!m.children?.length) return a(m);
    const inside = m.children.map((c) => (c.items?.length ? `<div class="tn-col">${a(c, "tn-fam")}${c.items.map((i) => a(i)).join("")}</div>` : a(c, m.grand ? "tn-fam" : ""))).join("");
    return `<details class="tn-sous"${m.grand ? " data-tn-grand" : ""}><summary>${esc(m.label)}</summary><div class="tn-sous-in">${inside}</div></details>`;
  }).join("");
}

/** Les trois en-têtes du thème unique (pièces de tenue-coque.ts) : leur menu est visible sur ordinateur, replié sur téléphone. */
const COQUE_HEADER = /class="tn (tn-entete-(?:liens|annonce|services))\b/;
/** Racine d'un en-tête à tenue (celui du socle ou un de ceux de la coque). */
export const isHeaderRoot = (root: string | null | undefined): boolean => !!root && /^tn-entete(?:-(?:liens|annonce|services))?$/.test(root);
/** Au plus tant de familles en onglets, tant de produits montrés par famille, tant de colonnes illustrées. */
export const MENU_MAX = { families: 8, cards: 4 };

/** Famille du catalogue vue par le menu : son nom et la photo d'un de ses vrais produits (jamais une photo d'exemple). */
export type MenuFamily = { name: string; image?: string | null };
/** Produit du catalogue vu par le menu : son nom, sa vraie photo, son vrai prix, la page de sa fiche, ses familles. */
export type MenuCard = { title: string; image?: string | null; price?: string | null; go?: string | null; soldOut?: boolean; families?: string[] };
/** Ce que l'en-tête reçoit en plus du menu : le catalogue (aperçu), ou la boutique qui le lit elle-même (mise en boutique). */
export type MenuData = {
  /** Construction de l'en-tête, si elle n'est pas encore écrite sur sa racine. */
  construction?: string | null;
  /** Faux : ni panier, ni recherche, ni compte (site de services sans panier). */
  boutique?: boolean;
  families?: MenuFamily[];
  products?: MenuCard[];
  /** Mise en boutique : les photos des familles et les produits mis en avant sont lus dans la boutique (Liquid). */
  shop?: { collection: (family: string) => string };
};

const escL = (s: string) => esc(s).replace(/\{/g, "&#123;").replace(/%\}/g, "%&#125;");
const lien = (x: { label: string; to: string }, cls = "", more = "") => `<a${cls ? ` class="${cls}"` : ""} href="#" onclick="return false" data-go="${escL(x.to)}"${more}>${escL(x.label)}</a>`;
const fond = (url: string | null | undefined) => (url ? ` style="background-image:url(${esc(url)})"` : "");
/** Famille visée par un lien du menu (« shop:Famille »), ou null. */
const familyOf = (to: string): string | null => { const i = to.indexOf(":"); return i > 0 && to.slice(i + 1).trim() ? to.slice(i + 1).trim() : null; };

/**
 * Le menu des en-têtes du thème unique. Trois formes, toutes sans script (cases à cocher et boutons radio cachés, que
 * la feuille lit) :
 *  - « simple » : des liens ; un sous-menu se déplie (panneau sous le mot sur ordinateur, volet sur téléphone) ;
 *  - « colonnes » : le grand menu à colonnes ; chaque famille a sa colonne, la photo d'un de ses vrais produits, et ses
 *    liens (sur téléphone : des rubriques qui se déplient, avec leur vignette) ;
 *  - « produits » : le grand menu à produits ; les familles en onglets, et sous l'onglet choisi les vrais produits de la
 *    famille, avec leur photo et leur prix (sur téléphone : onglets en haut du panneau, produits qui défilent au doigt).
 * Une famille sans photo n'a pas d'image ; un produit sans prix n'a pas de prix ; rien n'est inventé.
 */
export function navHtml(menu: SiteMenu, forme: "simple" | "colonnes" | "produits" = "simple", d: MenuData = {}): string {
  const fams = new Map((d.families ?? []).map((f) => [f.name, f] as const));
  /** Photo d'une famille : celle du catalogue (aperçu), ou celle de sa collection, lue par la boutique. */
  const photo = (name: string): string => {
    if (d.shop) { const h = d.shop.collection(name); return `{%- assign famille = collections['${h}'] -%}{%- if famille.featured_image -%}<i class="tn-ph" style="background-image:url({{ famille.featured_image | image_url: width: 600 }})"></i>{%- elsif famille.products.first.featured_image -%}<i class="tn-ph" style="background-image:url({{ famille.products.first.featured_image | image_url: width: 600 }})"></i>{%- endif -%}`; }
    const url = fams.get(name)?.image;
    return url ? `<i class="tn-ph"${fond(url)}></i>` : "";
  };
  /** Les produits mis en avant d'une famille : les vrais, avec leur photo et leur prix. */
  const cards = (name: string): string => {
    if (d.shop) return `{%- for product in collections['${d.shop.collection(name)}'].products limit: ${MENU_MAX.cards} -%}<a class="tn-e-carte" href="{{ product.url }}">{%- if product.featured_image -%}<i class="tn-ph" style="background-image:url({{ product.featured_image | image_url: width: 600 }})"></i>{%- endif -%}<b>{{ product.title }}</b><span>{%- if product.available -%}{{ product.price | money }}{%- else -%}Épuisé{%- endif -%}</span></a>{%- endfor -%}`;
    const inside = (d.products ?? []).filter((p) => (p.families ?? []).includes(name));
    // Les produits qui ont une photo d'abord : la vitrine montre, elle ne liste pas.
    const list = [...inside.filter((p) => p.image), ...inside.filter((p) => !p.image)].slice(0, MENU_MAX.cards);
    return list.map((p) => `<a class="tn-e-carte" href="#" onclick="return false"${p.go ? ` data-go="${escL(p.go)}"` : ""}>${p.image ? `<i class="tn-ph"${fond(p.image)}></i>` : ""}<b>${escL(p.title)}</b>${p.soldOut ? "<span>Épuisé</span>" : p.price ? `<span>${escL(p.price)}</span>` : ""}</a>`).join("");
  };
  return menu.map((m, n) => {
    if (!m.children?.length) return lien(m);
    const kids = m.children;
    const titre = `<label class="tn-e-t"><input type="checkbox"><span>${escL(m.label)}</span></label>`;
    // Grand menu à produits : il faut au moins deux familles du catalogue parmi les liens.
    const tabs = kids.filter((c) => { const f = familyOf(c.to); return !!f && (d.shop ? true : (d.products ?? []).some((p) => (p.families ?? []).includes(f))); }).slice(0, MENU_MAX.families);
    if (forme === "produits" && tabs.length >= 2) {
      const others = kids.filter((c) => !tabs.includes(c));
      const onglets = tabs.map((c, i) => `<label><input type="radio" name="tn-e-rayon-${n}"${i === 0 ? " checked" : ""}><span>${escL(c.label)}</span></label>`).join("");
      const rayons = tabs.map((c) => `<div class="tn-e-rayon">${cards(familyOf(c.to)!)}${lien({ label: `Tout voir : ${c.label}`, to: c.to }, "tn-e-voir")}</div>`).join("");
      return `<div class="tn-e-sous" data-tn-m="produits">${titre}<div class="tn-e-in"><div class="tn-e-vitrine"><div class="tn-e-onglets">${onglets}</div><div class="tn-e-rayons">${rayons}</div></div>${others.length ? `<div class="tn-e-plus">${others.map((c) => lien(c)).join("")}</div>` : ""}</div></div>`;
    }
    if (forme === "colonnes" || (forme === "produits" && m.grand)) {
      // Une colonne par rubrique : celle qui a des liens se déplie sur téléphone, les autres sont un lien illustré.
      const cols = kids.filter((c) => c.items?.length || familyOf(c.to)), others = kids.filter((c) => !cols.includes(c));
      const col = (c: (typeof kids)[number]) => {
        const f = familyOf(c.to), img = f ? photo(f) : "";
        if (!c.items?.length) return `<a class="tn-e-col tn-e-seul" href="#" onclick="return false" data-go="${escL(c.to)}">${img}<span>${escL(c.label)}</span></a>`;
        return `<div class="tn-e-col"><label class="tn-e-h"><input type="checkbox">${img}<span>${escL(c.label)}</span></label><div class="tn-e-items">${lien({ label: "Tout voir", to: c.to }, "tn-e-fam", ` aria-label="Tout voir : ${escL(c.label)}"`)}${c.items.map((i) => lien(i)).join("")}</div></div>`;
      };
      if (cols.length) return `<div class="tn-e-sous" data-tn-m="colonnes">${titre}<div class="tn-e-in"><div class="tn-e-cols">${cols.map(col).join("")}</div>${others.length ? `<div class="tn-e-plus">${others.map((c) => lien(c)).join("")}</div>` : ""}</div></div>`;
    }
    const inside = kids.map((c) => (c.items?.length ? `<div class="tn-e-groupe">${lien(c, "tn-e-fam")}${c.items.map((i) => lien(i)).join("")}</div>` : lien(c, m.grand ? "tn-e-fam" : ""))).join("");
    return `<div class="tn-e-sous"${m.grand ? " data-tn-grand" : ""}>${titre}<div class="tn-e-in">${inside}</div></div>`;
  }).join("");
}

/**
 * Pose le menu calculé dans l'en-tête à tenue (à la place des liens d'exemple) ; un autre en-tête n'est pas touché.
 * En-têtes du thème unique : la forme du menu suit la construction choisie (« mega-colonnes », « mega-produits »), les
 * photos et les produits viennent du catalogue ; un site de services sans panier perd le panier, la recherche et le compte.
 */
export function withMenu(headerHtml: string, menu: SiteMenu | undefined, d: MenuData = {}): string {
  if (COQUE_HEADER.test(headerHtml)) {
    let out = headerHtml;
    const built = d.construction ?? /^\s*<section\b[^>]*\sdata-tn-c="([a-z0-9-]+)"/.exec(out)?.[1] ?? null;
    if (d.boutique === false) out = out.replace(/<(a|button)\b[^>]*\sdata-tn-boutique\b[^>]*>[\s\S]*?<\/\1>/g, "");
    if (menu?.length) out = out.replace(/(<div class="tn-e-liens">)[\s\S]*?(<\/div>(?:<div class="tn-e-bas">|<\/nav>))/, (_m, a: string, b: string) => `${a}${navHtml(menu, built === "mega-colonnes" ? "colonnes" : built === "mega-produits" ? "produits" : "simple", d)}${b}`);
    return out;
  }
  if (!menu?.length || !/class="tn tn-entete[\s"]/.test(headerHtml)) return headerHtml;
  return headerHtml.replace(/(<details class="tn-menu">[\s\S]*?<nav>)[\s\S]*?(<\/nav>)/, (_m, a: string, b: string) => `${a}${menuHtml(menu)}${b}`);
}
