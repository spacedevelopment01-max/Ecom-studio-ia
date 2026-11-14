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

/** Pose le menu calculé dans l'en-tête à tenue (à la place des liens d'exemple) ; un autre en-tête n'est pas touché. */
export function withMenu(headerHtml: string, menu: SiteMenu | undefined): string {
  if (!menu?.length || !/class="tn tn-entete/.test(headerHtml)) return headerHtml;
  return headerHtml.replace(/(<details class="tn-menu">[\s\S]*?<nav>)[\s\S]*?(<\/nav>)/, (_m, a: string, b: string) => `${a}${menuHtml(menu)}${b}`);
}
