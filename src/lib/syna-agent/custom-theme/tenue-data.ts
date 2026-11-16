/**
 * Vraies données des sections à tenue (thème sur mesure, 14 novembre 2026). Gratuit, sans IA, sans base : des fonctions
 * pures, « le HTML d'une section + les données du client → le HTML rempli ». Le rendu (render.ts) lit les données ; la
 * mise en boutique (to-shopify.ts) s'en sert aussi pour ce qui reste écrit dans la page.
 *
 * Règle : une section qui montre des données du client garde des lignes d'exemple dans la bibliothèque et porte un
 * attribut « data-tn-… ». Ici, les lignes d'exemple laissent la place aux vraies données. Ce que le client n'a pas
 * donné reste « [À compléter] », jamais inventé ; sans aucune donnée, la section garde son exemple, annoncé comme tel.
 *
 *  - coordonnées : data-tn-tel, data-tn-adresse, data-tn-horaires (« ligne » ou « jours »), data-tn-zone (« ligne » ou
 *    « villes »), data-tn-itineraire, et le plan (jamais une image dessinée : un cadre qui ouvre la vraie carte) ;
 *  - prestations : data-tn-prestations-choix (liste déroulante d'un formulaire) ;
 *  - boutique : filtres de la page boutique (familles réelles), data-tn-rayons, data-tn-comparatif, data-tn-garanties ;
 *  - avis : data-tn-avis (aucun avis d'exemple ne reste : sans vrai avis, la section invite à donner le premier) ;
 *  - journal : data-tn-articles, data-tn-article ;
 *  - métiers (thème unique, lot 4) : data-tn-biens et data-tn-bien (biens de la rubrique Biens), data-tn-carte (carte du
 *    restaurant), data-tn-prestations-options et data-tn-equipe-options (rendez-vous en trois temps). Seule la lecture
 *    de ces deux rubriques (« tenueMetiers », en bas du fichier) touche à la base ; tout le reste est pur.
 */
import { markMissing, type TenuePrestation, type TenueProduct } from "./tenue";
import { assetUrl } from "../../library";
import { listBiens, VISIBLE_STATUSES } from "../../biens";
import { carteprice, listCarte } from "../../contenus/carte";
import { QUANTITE } from "./tenue-pages";
import { listProducts } from "../../products/catalog";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clean = (v: string | null | undefined, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const pic = (u: string | null) => (u ? ` style="background-image:url(${esc(u)})"` : "");

/** Famille de produits : son nom, la page qui la montre, la photo d'un de ses produits, les noms de ses produits. */
export type TenueFamily = { name: string; to: string; image: string | null; products: string[] };
/** Article du journal écrit dans le Studio. */
export type TenueArticle = { title: string; excerpt: string; tag: string | null; image: string | null; bodyHtml: string };
/** Ce que le Studio sait du client, pour toutes les sections à tenue d'un site. */
export type TenueSite = {
  phone?: string | null; address?: string | null; hours?: string | null; area?: string | null;
  shipping?: string | null; returns?: string | null;
  families?: TenueFamily[]; prestations?: TenuePrestation[]; products?: TenueProduct[]; articles?: TenueArticle[];
  /** Métiers : les biens visibles de la rubrique Biens, la carte publiée du restaurant, l'équipe donnée par le client. */
  biens?: TenueBien[]; carte?: TenueRubrique[]; equipe?: TenueMembre[];
  /** Panier : le seuil de livraison offerte donné par le client, en euros (sinon aucune barre de livraison offerte). */
  freeFrom?: number | null;
  /** Mise en boutique : les produits sont lus en direct par la boutique ; les emplacements sont posés, sans produit écrit. */
  live?: boolean;
  /** Vente directe (module « vente ») : genre et prix de comparaison des produits, offre réelle, avis d'une vraie source, macaron. */
  vitrine?: TenueVitrine;
};

// ---------------------------------------------------------------- coordonnées, horaires, zone, plan

/** Horaires écrits librement (« Lun–Ven 9 h–18 h ; samedi 9 h–12 h ») → une ligne par période, le ou les jours à part. */
export function hoursRows(hours: string): { day: string | null; text: string }[] {
  const DAY = "(?:lun|mar|mer|jeu|ven|sam|dim)[\\p{L}.]*";
  const rx = new RegExp(`^((?:du |le |les |tous les )?${DAY}(?:\\s*(?:[-–—/]|au|à|et|,)\\s*${DAY})*)\\s*[:,]?\\s+(.+)$`, "iu");
  return hours.split(/\n|;|\s\|\s/).map((x) => x.trim()).filter(Boolean).slice(0, 10).map((line) => {
    const m = rx.exec(line);
    return m ? { day: m[1].charAt(0).toLocaleUpperCase("fr-FR") + m[1].slice(1), text: m[2].trim() } : { day: null, text: line };
  });
}
/** Les mêmes horaires sur une ligne : une virgule entre deux périodes, et une plage d'heures qui ne se coupe jamais. */
export const hoursLine = (hours: string): string => hours.split(/\n|;|\s\|\s/).map((x) => x.trim()).filter(Boolean).join(", ").replace(/(\d)\s?h\b/g, "$1\u00a0h").replace(/\s([-–—])\s(?=\d)/g, "\u00a0$1\u00a0");
/** Zone écrite librement (« Lyon, Villeurbanne et Bron ») → une ville par ligne, ou la phrase entière si ce n'est pas une liste. */
export function zoneCities(area: string): string[] {
  const parts = area.split(/,|;|\n|\s+et\s+/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean);
  return parts.length >= 2 && parts.every((x) => x.length <= 40) ? parts.slice(0, 24) : [area.trim()];
}
const OSM = "https://www.openstreetmap.org";

/**
 * Pose le téléphone, l'adresse, les horaires, la zone et l'itinéraire du client. Le plan n'est jamais une image (essai
 * réel du 9 novembre 2026 : un plan de quartier dessiné par l'IA, montré comme la vraie carte) : c'est un cadre qui ouvre
 * la vraie carte à l'adresse du client, ou « [À compléter : adresse] ».
 */
export function withTenueContact(html: string, d: TenueSite): string {
  if (!/\sdata-tn-(?:tel|adresse|horaires|zone|itineraire)\b|photos\/(?:carte|map|plan)-/.test(html)) return html;
  const phone = clean(d.phone, 40), address = clean(d.address), hours = clean(d.hours, 400), area = clean(d.area, 400);
  const inner = (attr: string, fill: (tag: string) => string | null) => (h: string) => h.replace(new RegExp(`<([a-z]+)\\b([^>]*\\s${attr}(?=[\\s>])[^>]*)>[\\s\\S]*?<\\/\\1>`, "g"), (m, tag: string, attrs: string) => { const v = fill(tag); return v == null ? m : `<${tag}${attrs}>${v}</${tag}>`; });
  let out = html;
  if (phone) out = out.replace(/<a\b([^>]*\sdata-tn-tel\b[^>]*)>[\s\S]*?<\/a>/g, (_m, attrs: string) => `<a${attrs.replace(/\sonclick="return false"/, "").replace(/href="#"/, `href="tel:${esc(phone.replace(/[^\d+]/g, ""))}"`)}>${esc(phone)}</a>`);
  if (address) out = inner("data-tn-adresse", () => esc(address))(out);
  if (hours) {
    out = inner('data-tn-horaires="ligne"', () => esc(hoursLine(hours)))(out);
    const tie = (x: string) => x.replace(/(\d)\s?h\b/g, "$1\u00a0h");
    out = inner('data-tn-horaires="jours"', () => `<tbody>${hoursRows(hours).map((r) => (r.day ? `<tr><th>${esc(r.day)}</th><td>${esc(tie(r.text))}</td></tr>` : `<tr><td colspan="2">${esc(r.text)}</td></tr>`)).join("")}</tbody>`)(out);
  }
  if (area) {
    out = inner('data-tn-zone="ligne"', () => esc(area))(out);
    out = inner('data-tn-zone="villes"', () => zoneCities(area).map((c) => `<li>${esc(c)}</li>`).join(""))(out);
  }
  if (address) out = out.replace(/<a\b([^>]*\sdata-tn-itineraire\b[^>]*)>/g, (_m, attrs: string) => `<a${attrs.replace(/\sonclick="return false"/, "").replace(/href="#"/, `href="${OSM}/directions?to=${encodeURIComponent(address)}" target="_blank" rel="noopener"`)}>`);
  out = out.replace(/<div class="tn-ph([^"]*)" style="background-image:url\(photos\/(?:carte|map|plan)-[\w.-]+\)"><\/div>/g, (_m, cls: string) => address
    ? `<a class="tn-ph tn-plan${cls}" href="${OSM}/search?query=${encodeURIComponent(address)}" target="_blank" rel="noopener" aria-label="Ouvrir la carte à cette adresse"><i aria-hidden="true"></i><b>${esc(address)}</b><em>Voir sur la carte</em></a>`
    : `<div class="tn-ph tn-plan${cls}"><i aria-hidden="true"></i><b>[À compléter : adresse]</b></div>`);
  return markMissing(out);
}

/** La liste déroulante d'un formulaire de rendez-vous : les vraies prestations du client. */
export function withTenuePrestationChoices(html: string, list: TenuePrestation[]): string {
  if (!list.length || !/\sdata-tn-prestations-choix\b/.test(html)) return html;
  return html.replace(/(<select\b[^>]*\sdata-tn-prestations-choix\b[^>]*>)[\s\S]*?(<\/select>)/g, (_m, a: string, b: string) => `${a}${list.slice(0, 40).map((p) => `<option>${esc(p.name)}</option>`).join("")}${b}`);
}

// ---------------------------------------------------------------- boutique : filtres, familles, comparatif, réassurance

/**
 * Page boutique : les filtres d'exemple laissent la place aux vraies familles du catalogue (sans famille, pas de
 * filtre par famille) ; rien n'est choisi d'avance ; chaque carte porte ses familles et son prix, pour le filtre et le tri.
 */
export function withTenueCatalogue(html: string, d: TenueSite): string {
  if (!/class="tn tn-catalogue/.test(html) || !(d.products ?? []).length) return html;
  const fams = (d.families ?? []).map((f) => f.name);
  const box = (name: string, attr: string) => `<label><input type="checkbox" ${attr}><span>${esc(name)}</span></label>`;
  const sets = [fams.length >= 2 ? `<fieldset><legend>Famille</legend>${fams.map((f) => box(f, `data-tn-fam="${esc(f)}"`)).join("")}</fieldset>` : "",
    (d.products ?? []).some((p) => p.soldOut) ? `<fieldset><legend>Disponibilité</legend>${box("En stock seulement", "data-tn-stock")}</fieldset>` : ""].join("");
  let out = html.replace(/<div class="tn-filtres">[\s\S]*?<\/fieldset><\/div>/, `<div class="tn-filtres">${sets}</div>`)
    .replace(/(<div class="tn-choisis">)[\s\S]*?(<label class="tn-effacer">)/, "$1$2");
  // Aucun filtre possible : le bouton « Filtrer » n'a rien à ouvrir, il s'en va.
  if (!sets) out = out.replace(/<label class="tn-filtrer">[\s\S]*?<\/label>/, "").replace(/<div class="tn-filtres"><\/div>/, "");
  return out;
}

/** Les familles du catalogue (deux au moins) : la photo d'un de leurs produits, leur nom, une ligne. */
export function withTenueFamilies(html: string, families: TenueFamily[]): string {
  if (families.length < 2 || !/\sdata-tn-rayons\b/.test(html)) return html;
  // La ligne écrite pour une famille reste la sienne ; une famille sans ligne cite ses produits.
  const lines = new Map([...html.matchAll(/<b>([^<]*)<\/b><span>([^<]*)<\/span><\/a>/g)].map((m) => [m[1].trim().toLocaleLowerCase("fr-FR"), m[2]] as const));
  const card = (f: TenueFamily) => `<a href="#" onclick="return false" data-go="${esc(f.to)}"><div class="tn-ph tn-cadre"${pic(f.image)}></div><b>${esc(f.name)}</b><span>${lines.get(f.name.toLocaleLowerCase("fr-FR")) ?? esc(f.products.slice(0, 3).join(", "))}</span></a>`;
  return html.replace(/(<div class="tn-familles" data-tn-rayons>)[\s\S]*<\/div>(?=<\/section>)/, (_m, a: string) => `${a}${families.slice(0, 8).map(card).join("")}</div>`);
}

/**
 * Comparatif de la gamme : les vrais noms (chacun mène à sa fiche) et les vrais prix. Les autres critères sont des
 * textes écrits pour ces produits, dans le même ordre ; une colonne en trop (moins de produits que l'exemple) s'en va.
 */
export function withTenueComparison(html: string, products: TenueProduct[]): string {
  if (products.length < 2 || !/\sdata-tn-comparatif\b/.test(html)) return html;
  const list = products.slice(0, 3);
  return markMissing(html
    .replace(/(<div class="tn-noms">)[\s\S]*?(<\/div>)/, (_m, a: string, b: string) => `${a}${list.map((p) => `<a href="#" onclick="return false" data-go="${esc(p.go ?? "product")}">${esc(p.title)}</a>`).join("")}${b}`)
    .replace(/<div class="tn-critere"><small>([^<]*)<\/small><p>([\s\S]*?)<\/p><\/div>/g, (_m, label: string, values: string) => {
      const cells = [...values.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => m[1]);
      const row = /prix/i.test(label) ? list.map((p) => (p.price ? esc(p.price) : "[À compléter : prix]")) : list.map((_p, i) => cells[i] ?? "[À compléter]");
      return `<div class="tn-critere"><small>${label}</small><p>${row.map((v) => `<span>${v}</span>`).join("")}</p></div>`;
    }));
}

/** Réassurance : la livraison et les retours du client, tels qu'il les a donnés. */
export function withTenueGuarantees(html: string, d: TenueSite): string {
  if (!/\sdata-tn-garanties\b/.test(html)) return html;
  const put = (key: string, value: string | null) => (h: string) => (value ? h.replace(new RegExp(`(<li data-tn-cle="${key}">[\\s\\S]*?<span>)[\\s\\S]*?(<\\/span><\\/li>)`), (_m, a: string, b: string) => `${a}${esc(value)}${b}`) : h);
  return markMissing(put("retours", clean(d.returns, 160))(put("livraison", clean(d.shipping, 160))(html)));
}

/**
 * Avis des clients : jamais un avis d'exemple. Une ligne qui n'a pas reçu un vrai avis est retirée ; quand il n'en
 * reste aucune, la section invite seulement à donner le premier (c'est la feuille qui montre alors l'invitation).
 */
export function withTenueReviews(html: string): string {
  if (!/\sdata-tn-avis\b/.test(html)) return html;
  return html.replace(/(<ul data-tn-avis>)([\s\S]*?)(<\/ul>)/, (_m, a: string, lines: string, b: string) => `${a}${(lines.match(/<li>[\s\S]*?<\/li>/g) ?? []).filter((li) => !/<blockquote>\s*(?:\[À compléter|<mark class="tn-manque">)/.test(li)).join("")}${b}`);
}

// ---------------------------------------------------------------- fiche produit : versions, tailles, offres par quantité, look

/** Option d'un produit (« Couleur », « Taille ») et ses valeurs ; « teinte » : la couleur à montrer ; « soldOut » : plus aucune variante en stock. */
export type TenueOption = { name: string; values: { label: string; soldOut?: boolean; teinte?: string | null }[] };
/** Offre par quantité du client : le prix du produit en centimes, son mot d'unité, les paliers (remise en %, ou articles offerts). */
export type TenueLots = { unit: string; cents: number; tiers: { qty: number; pct?: number; free?: number }[] };
const money = (cents: number) => `${(Math.round(cents) / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",")}\u00a0€`;
const isColor = (name: string) => /couleur|coloris|teinte|colou?r/i.test(name);
const isSize = (name: string) => /taille|pointure|size/i.test(name);

/**
 * Les vraies options du produit en pastilles (« data-tn-versions ») : une rangée par option. La couleur est choisie
 * d'avance (la première en stock), la taille jamais ; une valeur sans stock est barrée et ne se choisit pas.
 */
export function withTenueVersions(html: string, options: TenueOption[]): string {
  const list = options.filter((o) => o.name.trim() && o.values.length);
  if (!list.length || !/\sdata-tn-versions\b/.test(html)) return html;
  const group = (o: TenueOption, i: number) => {
    const color = isColor(o.name), first = color ? o.values.findIndex((v) => !v.soldOut) : -1;
    const pill = (v: TenueOption["values"][number], j: number) => `<label${v.soldOut ? ' class="tn-off"' : ""}${color && v.teinte && /^#[0-9a-f]{3,8}$/i.test(v.teinte) ? ` style="--teinte:${v.teinte}"` : ""}><input type="radio" name="tn-v-${i + 1}"${j === first ? " checked" : ""}${v.soldOut ? " disabled" : ""}><span>${esc(v.label)}</span></label>`;
    return `<div class="tn-groupe-v${color ? " tn-couleurs" : ""}"><small>${esc(o.name)}</small><div class="tn-choix-v">${o.values.slice(0, 24).map(pill).join("")}</div></div>`;
  };
  return html.replace(/(<section\b[^>]*\sdata-tn-versions\b[^>]*>)[\s\S]*(<\/section>)$/, (_m, a: string, b: string) => `${a}${list.slice(0, 3).map(group).join("")}${b}`);
}

/** Guide des tailles : une ligne par vraie taille du produit ; les mesures restent celles que le client a écrites, sinon « [À compléter] ». */
export function withTenueSizes(html: string, options: TenueOption[]): string {
  const sizes = options.find((o) => isSize(o.name))?.values.map((v) => v.label) ?? [];
  if (!sizes.length || !/\sdata-tn-guide-tailles\b/.test(html)) return html;
  return markMissing(html.replace(/<tbody>([\s\S]*?)<\/tbody>/, (m, rows: string) => {
    const lines = rows.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
    // Un tableau déjà écrit pour ce produit (aucune taille « à compléter ») n'est pas touché.
    if (!lines.length || !lines.some((l) => /<th>\s*(?:\[À compléter|<mark class="tn-manque">)/.test(l))) return m;
    const cols = ((lines[0] ?? "").match(/<td>/g) ?? []).length;
    return `<tbody>${sizes.slice(0, 20).map((s) => `<tr><th>${esc(s)}</th>${"<td>[À compléter]</td>".repeat(cols)}</tr>`).join("")}</tbody>`;
  }));
}

/**
 * L'offre par quantité du client (« data-tn-lots ») : une ligne pour un seul article, puis une par palier, avec le prix
 * du lot, le prix à l'unité et la remise en pourcentage (ou les articles offerts). Sans offre, la pièce garde ses lignes
 * « [À compléter] » : aucune remise d'exemple.
 */
export function withTenueLots(html: string, lots: TenueLots | null): string {
  if (!lots || !lots.tiers.length || !(lots.cents > 0) || !/\sdata-tn-lots\b/.test(html)) return html;
  const unit = (n: number) => `${n}\u00a0${esc(lots.unit)}${n > 1 && !/[sxz]$/.test(lots.unit) ? "s" : ""}`;
  const line = (n: number, total: number, tag: string, on: boolean) => `<li><label><input type="radio" name="tn-lot"${on ? " checked" : ""}><b>${unit(n)}</b><span>${money(total)}</span>${n > 1 ? `<i>soit ${money(total / n)} l'unité</i>` : ""}${tag ? `<em>${tag}</em>` : ""}</label></li>`;
  const rows = lots.tiers.slice(0, 4).filter((t) => t.qty >= 2 && ((t.pct ?? 0) > 0 || (t.free ?? 0) > 0)).map((t) => (t.free
    ? line(t.qty + t.free, lots.cents * t.qty, `${t.free} offert${t.free > 1 ? "s" : ""}`, false)
    : line(t.qty, lots.cents * t.qty * (1 - (t.pct ?? 0) / 100), `−${String(t.pct ?? 0).replace(".", ",")}\u00a0%`, false)));
  if (!rows.length) return html;
  return html.replace(/(<ul>)[\s\S]*?(<\/ul>)/, (_m, a: string, b: string) => `${a}${line(1, lots.cents, "", true)}${rows.join("")}${b}`);
}

/**
 * Le look complet (« data-tn-looks ») : les autres vrais produits du catalogue (trois au plus), chacun vers sa fiche.
 * « current » : le nom du produit de la page, qui ne se propose pas à lui-même. Moins d'un autre produit : rien n'est posé.
 */
export function withTenueLooks(html: string, products: TenueProduct[], current?: string | null): string {
  if (!/\sdata-tn-looks\b/.test(html)) return html;
  const same = (a: string, b: string) => a.trim().toLocaleLowerCase("fr-FR") === b.trim().toLocaleLowerCase("fr-FR");
  // Sans le nom du produit de la page, une carte de plus : la sienne est retirée ensuite (withTenueAchat).
  const others = products.filter((p) => !current || !same(p.title, current)).slice(0, current ? 3 : 4);
  if (!others.length) return html;
  const card = (p: TenueProduct) => `<a class="tn-carte-p${p.soldOut ? " tn-epuise" : ""}" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"><div class="tn-ph"${pic(p.image)}></div><b>${esc(p.title)}</b><span>${p.soldOut ? "Épuisé" : p.price ? esc(p.price) : "[À compléter : prix]"}</span></a>`;
  return markMissing(html.replace(/(<div class="tn-cartes">)[\s\S]*?<\/div>(?=<\/div><\/section>)/, (_m, a: string) => `${a}${others.map(card).join("")}</div>`));
}

/**
 * Pièces de la vente directe qui lisent la fiche de l'entreprise : la livraison en tête de « la livraison, étape par
 * étape » (« data-tn-livraison »), les retours de « la garantie mise en avant » (« data-tn-garantie » : les conditions
 * telles que le client les a écrites ; le délai du sceau seulement s'il y figure) ; et les cases de « nous et les
 * autres » (« data-tn-face ») : une case « Oui » reçoit sa coche, une case « Non » sa croix, toute autre reste écrite.
 */
export function withTenueDirect(html: string, d: TenueSite): string {
  let out = html;
  const shipping = clean(d.shipping, 200), returns = clean(d.returns, 240);
  if (shipping && /\sdata-tn-livraison\b/.test(out)) out = out.replace(/(<p\b[^>]*\sdata-tn-livraison\b[^>]*>)[\s\S]*?(<\/p>)/, (_m, a: string, b: string) => `${a}${esc(shipping)}${b}`);
  if (returns && /\sdata-tn-garantie\b/.test(out)) {
    const days = /(\d{1,3})\s*jours?/.exec(returns)?.[1];
    out = out.replace(/(<p class="tn-conditions">)[\s\S]*?(<\/p>)/, (_m, a: string, b: string) => `${a}${esc(returns)}${b}`)
      .replace(/(<div class="tn-sceau-g"><b>[\s\S]*?<\/b>)<span>[\s\S]*?<\/span>/, (_m, a: string) => `${a}${days ? `<span>${days}\u00a0jours</span>` : ""}`);
  }
  if (/\sdata-tn-face\b/.test(out)) out = out.replace(/<i(?:\sclass="[^"]*")?>([^<]*)<\/i>/g, (_m, t: string) => `<i${/^\s*oui\b/i.test(t) ? ' class="tn-oui"' : /^\s*non\b/i.test(t) ? ' class="tn-non"' : ""}>${t}</i>`);
  return out === html ? html : markMissing(out);
}

// ---------------------------------------------------------------- journal

/** Les articles écrits dans le Studio : la liste du journal, puis la page de l'article (le premier). */
export function withTenueArticles(html: string, articles: TenueArticle[]): string {
  if (!articles.length) return html;
  let out = html;
  if (/\sdata-tn-articles\b/.test(out)) out = out.replace(/(<div class="tn-articles" data-tn-articles>)[\s\S]*<\/div>(?=<\/section>)/, (_m, a: string) => `${a}${articles.slice(0, 12).map((x) => `<a class="tn-art" href="#" onclick="return false" data-go="article"><div class="tn-ph tn-cadre"${pic(x.image)}></div>${x.tag ? `<small>${esc(x.tag)}</small>` : ""}<b>${esc(x.title)}</b><span>${esc(x.excerpt)}</span></a>`).join("")}</div>`);
  if (/\sdata-tn-article\b/.test(out)) {
    const x = articles[0];
    out = out.replace(/(<a class="tn-retour"[^>]*>[\s\S]*?<\/a>)[\s\S]*(?=<\/section>)/, (_m, back: string) => `${back}${x.tag ? `<small>${esc(x.tag)}</small>` : ""}<h1>${esc(x.title)}</h1>${x.excerpt ? `<p class="tn-chapo">${esc(x.excerpt)}</p>` : ""}${x.image ? `<div class="tn-ph tn-cadre"${pic(x.image)}></div>` : ""}<div class="tn-corps">${x.bodyHtml}</div>`);
  }
  return out;
}

// ---------------------------------------------------------------- panier (page et tiroir), page introuvable, textes légaux, recherche

/** Un montant en centimes, écrit comme les prix du site (« 149 € », « 8,50 € »). */
export const euros = (cents: number) => `${(Math.round(cents) / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",")}\u00a0€`;
/** Construction d'une section : celle donnée, sinon celle écrite sur sa racine. */
const builtOf = (html: string, built?: string | null) => built ?? /^\s*<[a-z]+\b[^>]*\sdata-tn-c="([^"]+)"/.exec(html)?.[1] ?? null;
/** Une ligne de panier : la photo du produit, son nom, sa quantité, « Retirer », son prix (le prix à l'unité reste sur la ligne, pour les calculs de l'aperçu). */
const cartLine = (x: { title: string; pic: string; price: string; cents?: number | null }) => `<div class="tn-ligne"${x.cents != null ? ` data-tn-cents="${Math.round(x.cents)}"` : ""}><div class="tn-ph"${x.pic}></div><div class="tn-quoi"><b>${x.title}</b>${QUANTITE}<button type="button" class="tn-oter" data-tn-oter>Retirer</button></div><span class="tn-prix-l">${x.price}</span></div>`;
/**
 * La barre de livraison offerte : ce qu'il reste à ajouter pour l'atteindre, et la part déjà faite. Elle n'existe que
 * si le client a donné son seuil (jamais un seuil d'exemple).
 */
export function freeShippingBar(freeFrom: number, totalCents: number | null): string {
  const goal = Math.round(freeFrom * 100), left = totalCents == null ? null : goal - totalCents;
  const text = left == null ? `Livraison offerte dès ${euros(goal)} d'achat` : left > 0 ? `Plus que <b>${euros(left)}</b> pour la livraison offerte` : "La livraison est offerte";
  return `<div class="tn-seuil" data-tn-seuil="${goal}"><p>${text}</p><i style="--part:${totalCents == null ? 0 : Math.max(4, Math.min(100, Math.round((totalCents / goal) * 100)))}%"></i></div>`;
}
/**
 * Le panier de l'aperçu (la page et le tiroir) : un panier d'essai fait des deux premiers produits en stock du
 * catalogue, avec leur vraie photo et leur vrai prix, le total calculé, la barre de livraison offerte si le client a
 * donné son seuil, et, dans le tiroir, d'autres produits du catalogue à ajouter. La page panier prend la même
 * charpente que le tiroir (lignes, quantité, « Retirer », récapitulatif) : ses deux façons se dessinent sur elle.
 */
export function withTenueCart(html: string, d: TenueSite): string {
  const page = /\sdata-tn-panier\b/.test(html), drawer = /\sdata-tn-panier-cote\b/.test(html);
  if (!page && !drawer) return html;
  const stock = (d.products ?? []).filter((p) => !p.soldOut), inCart = stock.slice(0, 2);
  const total = inCart.length && inCart.every((p) => p.cents != null) ? inCart.reduce((n, p) => n + Math.round(p.cents!), 0) : null;
  const lines = inCart.map((p) => cartLine({ title: esc(p.title), pic: pic(p.image), price: p.price ? esc(p.price) : "[À compléter : prix]", cents: p.cents })).join("");
  const bar = d.freeFrom && d.freeFrom > 0 ? freeShippingBar(d.freeFrom, d.live ? null : total) : "";
  let out = html;
  if (page && !/class="tn-lignes"/.test(out)) {
    const m = /^([\s\S]*?)(<div class="tn-ligne">[\s\S]*?)(<div class="tn-total">[\s\S]*?<\/div>)(<a class="tn-bt"[\s\S]*?<\/a>)([\s\S]*?)(<\/section>)\s*$/.exec(out);
    if (m) {
      // Sans produit au catalogue : la ligne d'exemple de la section, dans la même charpente.
      const sample = cartLine({ title: /<b>([\s\S]*?)<\/b>/.exec(m[2])?.[1] ?? "", pic: /<div class="tn-ph"([^>]*)>/.exec(m[2])?.[1] ?? "", price: /<span class="tn-prix-l">([\s\S]*?)<\/span>/.exec(m[2])?.[1] ?? "[À compléter : prix]" });
      const sum = total != null ? m[3].replace(/(<span class="tn-prix-t">)[\s\S]*?(<\/span>)/, `$1${euros(total)}$2`) : m[3];
      out = `${m[1]}<div class="tn-lignes" data-tn-lignes>${lines || sample}</div><div class="tn-recap">${bar}${sum}${m[4]}${m[5]}</div>${m[6]}`;
    }
  }
  if (drawer) {
    if (lines) out = out.replace(/(<div class="tn-lignes" data-tn-lignes>)[\s\S]*?(<\/div>)(?=<div class="tn-vide">)/, `$1${lines}$2`);
    if (total != null) out = out.replace(/(<span class="tn-prix-t">)[\s\S]*?(<\/span>)/, `$1${euros(total)}$2`);
    // Le seuil du client, ou rien : jamais la ligne d'exemple.
    out = out.replace(/<div class="tn-seuil" data-tn-seuil>[\s\S]*?<\/div>/, bar);
    const others = stock.filter((p) => !inCart.includes(p)).slice(0, 4);
    const block = /<div class="tn-plus" data-tn-suggestions>[\s\S]*?<\/div><\/div>(?=<div class="tn-bas">)/;
    if (others.length) out = out.replace(/(<div class="tn-sugg">)[\s\S]*?(<\/div><\/div>)(?=<div class="tn-bas">)/, (_m, a: string, b: string) => `${a}${others.map((p) => `<a class="tn-s" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"${p.cents != null ? ` data-tn-cents="${Math.round(p.cents)}"` : ""}><div class="tn-ph"${pic(p.image)}></div><span>${esc(p.title)}</span><em>${p.price ? esc(p.price) : "[À compléter : prix]"}</em></a>`).join("")}${b}`);
    // Un catalogue sans autre produit à proposer : rien à ajouter, le bloc s'en va.
    else if ((d.products ?? []).length) out = out.replace(block, "");
  }
  return markMissing(out);
}

/**
 * Page introuvable, façon « produits » : quatre produits du catalogue pour repartir (les vrais, en stock d'abord). Les
 * autres façons ne les montrent pas, la page reste courte.
 */
export function withTenue404(html: string, d: TenueSite, built?: string | null): string {
  if (!/class="tn tn-404/.test(html) || builtOf(html, built) !== "produits" || /class="tn-repartir"/.test(html)) return html;
  const stock = (d.products ?? []).filter((p) => !p.soldOut).slice(0, 4);
  if (!stock.length && !d.live) return html;
  const cards = stock.map((p) => `<a class="tn-carte-p" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"><div class="tn-ph"${pic(p.image)}></div><b>${esc(p.title)}</b><span>${p.price ? esc(p.price) : "[À compléter : prix]"}</span></a>`).join("");
  return markMissing(html.replace(/<\/section>\s*$/, `<b class="tn-repartir" data-tn-produits>À voir en attendant</b><div class="tn-cartes">${cards}</div></section>`));
}

/**
 * Textes légaux, façon « sommaire » : le sommaire est fait des titres des volets, chacun mène à son texte, et tous les
 * textes sont ouverts (on vient les lire, pas les chercher).
 */
export function withTenueLegal(html: string, built?: string | null): string {
  if (!/class="tn tn-legal/.test(html) || builtOf(html, built) !== "sommaire" || /class="tn-sommaire"/.test(html)) return html;
  const titles: string[] = [];
  const out = html.replace(/<details(\s+open)?>(<summary>)([\s\S]*?)(<\/summary>)/g, (_m, _o, a: string, title: string, b: string) => { titles.push(title); return `<details id="tn-texte-${titles.length}" open>${a}${title}${b}`; });
  if (titles.length < 2) return html;
  return out.replace(/(<\/h1>)/, `$1<nav class="tn-sommaire" aria-label="Sommaire"><b>Sommaire</b>${titles.map((t, i) => `<a href="#tn-texte-${i + 1}">${t}</a>`).join("")}</nav>`);
}

/** Recherche : les vrais produits du catalogue (six au plus) et, s'il y en a au moins deux, ses familles en raccourcis. */
export function withTenueSearch(html: string, d: TenueSite): string {
  if (!/\sdata-tn-recherche\b/.test(html)) return html;
  const products = (d.products ?? []).slice(0, 6), families = d.families ?? [];
  let out = html;
  if (products.length) out = out.replace(/(<div class="tn-res-l">)[\s\S]*?(<\/div>)(?=<p class="tn-rien">)/, (_m, a: string, b: string) => `${a}${products.map((p) => `<a class="tn-r" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"><div class="tn-ph"${pic(p.image)}></div><b>${esc(p.title)}</b><span>${p.soldOut ? "Épuisé" : p.price ? esc(p.price) : "[À compléter : prix]"}</span></a>`).join("")}${b}`);
  if (families.length >= 2) out = out.replace(/(<div class="tn-mots" data-tn-mots>)([\s\S]*?)(<\/div>)/, (_m, a: string, own: string, b: string) => `${a}${families.slice(0, 5).map((f) => `<a class="tn-mot" href="#" onclick="return false" data-go="${esc(f.to)}">${esc(f.name)}</a>`).join("")}${(own.match(/<a\b[\s\S]*?<\/a>/g) ?? []).filter((x) => !/data-go="shop"/.test(x)).slice(0, 2).join("")}${b}`);
  return markMissing(out);
}

/** Un bien immobilier visible sur le site (rubrique Biens) : ses photos sont des adresses de médias du projet. */
export type TenueBien = {
  ref: string; title: string; type: string; transaction: "vente" | "location"; status: string; city: string; sector: string;
  price: number | null; rent: number | null; charges: number | null; deposit: number | null; fees: string;
  surface: number | null; land: number | null; rooms: number | null; bedrooms: number | null; floor: string; furnished: boolean | null;
  exteriors: string[]; pool: boolean; features: string[]; availability: string; dpe: string | null; ges: string | null; propertyTax: string;
  summary: string; description: string; photos: string[]; featured: boolean;
  neighborhood: { text: string; photos: string[]; places: { label: string; detail: string }[] };
};
/** Une rubrique de la carte d'un restaurant et ses plats publiés. */
export type TenuePlat = { name: string; description: string; price: string | null; allergens: string; vegetarian: boolean };
export type TenueRubrique = { title: string; items: TenuePlat[] };
/** Une personne de l'équipe, telle que le client l'a donnée (jamais inventée). */
export type TenueMembre = { name: string; role: string | null };

// ---------------------------------------------------------------- métiers : biens, fiche d'un bien, carte, rendez-vous

const eurosRonds = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const nombre = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
const BIEN_TYPES: Record<string, string> = { maison: "Maison", appartement: "Appartement", villa: "Villa", loft: "Loft", propriete: "Propriété", mas: "Mas", terrain: "Terrain", autre: "Bien" };
const bienType = (b: TenueBien) => BIEN_TYPES[b.type] ?? "Bien";
const bienParti = (b: TenueBien) => b.status === "sold" || b.status === "rented";
const bienStatut = (b: TenueBien) => (b.status === "sold" ? "Vendu" : b.status === "rented" ? "Loué" : b.transaction === "location" ? "À louer" : "À vendre");
const bienLieu = (b: TenueBien) => [b.city, b.sector].map((x) => x.trim()).filter(Boolean).join(", ");
/** Prix affiché d'un bien : le prix de vente, ou le loyer hors charges ; un bien vendu ou loué n'affiche plus de prix. */
export const bienPrix = (b: TenueBien): string | null => (bienParti(b) ? null : b.transaction === "location" ? (b.rent != null ? `${eurosRonds(b.rent)} par mois, hors charges` : null) : b.price != null ? eurosRonds(b.price) : null);
const bienMesures = (b: TenueBien) => [b.surface ? `${nombre(b.surface)} m²` : "", b.rooms ? `${b.rooms} pièce${b.rooms > 1 ? "s" : ""}` : "", b.bedrooms ? `${b.bedrooms} chambre${b.bedrooms > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
/** Les biens encore à vendre ou à louer d'abord, puis ceux qui sont partis (ils gardent leur mention). */
const bienOrder = (list: TenueBien[]) => [...list.filter((b) => !bienParti(b)), ...list.filter(bienParti)];
/** Le bien d'une fiche : celui que le client a mis en avant, sinon le premier encore proposé, sinon le premier. */
export const ficheBien = (list: TenueBien[]): TenueBien | null => list.find((b) => b.featured && !bienParti(b)) ?? list.find((b) => !bienParti(b)) ?? list[0] ?? null;

function bienCard(b: TenueBien, filtres: boolean): string {
  const prix = bienPrix(b), mesures = bienMesures(b), montant = b.transaction === "location" ? b.rent : b.price;
  const data = filtres ? ` data-tn-tr="${b.transaction}" data-tn-type="${esc(b.type)}" data-tn-ville="${esc(b.city.trim())}"${montant != null ? ` data-tn-prix="${Math.round(montant)}"` : ""}` : "";
  return `<a class="tn-bien${bienParti(b) ? " tn-parti" : ""}" href="#" onclick="return false" data-go="bien"${data}><div class="tn-ph tn-cadre"${pic(b.photos[0] ?? null)}><i>${bienStatut(b)}</i></div><small>${esc([bienType(b), bienLieu(b)].filter(Boolean).join(" · "))}</small><b>${esc(b.title)}</b>${mesures ? `<span>${esc(mesures)}</span>` : ""}${prix ? `<em>${esc(prix)}</em>` : ""}</a>`;
}

/**
 * Les biens de la rubrique Biens dans les cartes à tenue (douze au plus sur une liste, tous sur la recherche, où chaque
 * carte porte de quoi être filtrée et où les listes de types et de villes ne proposent que ce qui existe vraiment). Sans
 * bien visible, la section garde ses cartes d'exemple, annoncées comme telles : jamais un bien inventé.
 */
export function withTenueBiens(html: string, biens: TenueBien[]): string {
  if (!biens.length || !/\sdata-tn-biens(?:="[a-z]+")?(?=[\s>])/.test(html)) return html;
  const filtres = /\sdata-tn-biens="filtres"/.test(html), list = bienOrder(biens).slice(0, filtres ? 60 : 12);
  let out = html.replace(/(<div class="tn-cartes-b"[^>]*>)(?:<a class="tn-bien[\s\S]*?<\/a>)*(<\/div>)/, (_m, a: string, b: string) => `${a}${list.map((x) => bienCard(x, filtres)).join("")}${b}`);
  if (filtres) {
    // La première ligne d'une liste (« Tous les types ») reste celle qui est écrite ; les suivantes sont les vraies valeurs.
    const options = (attr: string, rows: string) => (h: string) => h.replace(new RegExp(`(<select\\b[^>]*\\s${attr}(?=[\\s>])[^>]*>\\s*<option value="">[^<]*<\\/option>)[\\s\\S]*?(<\\/select>)`), (_m, a: string, b: string) => `${a}${rows}${b}`);
    const types = [...new Set(list.map((x) => x.type))], villes = [...new Set(list.map((x) => x.city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    out = options("data-tn-biens-types", types.map((t) => `<option value="${esc(t)}">${esc(BIEN_TYPES[t] ?? "Bien")}</option>`).join(""))(out);
    out = options("data-tn-biens-villes", villes.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join(""))(out);
    out = out.replace(/(<p class="tn-trouves"[^>]*>)[\s\S]*?(<\/p>)/, (_m, a: string, b: string) => `${a}${list.length} bien${list.length > 1 ? "s" : ""} en ce moment${b}`);
  }
  return markMissing(out);
}

/** Lignes du tableau des caractéristiques : seulement ce que le client a renseigné, dans l'ordre d'une annonce. */
export function bienRows(b: TenueBien): [string, string][] {
  const dehors = [...b.exteriors, ...(b.pool ? ["piscine"] : [])].join(", ");
  const rows: [string, string | null][] = [
    ["Type de bien", bienType(b)],
    ["Surface habitable", b.surface ? `${nombre(b.surface)} m²` : null],
    ["Terrain", b.land ? `${nombre(b.land)} m²` : null],
    ["Pièces", b.rooms ? String(b.rooms) : null],
    ["Chambres", b.bedrooms ? String(b.bedrooms) : null],
    ["Étage", clean(b.floor, 40)],
    ["Meublé", b.transaction === "location" && b.furnished != null ? (b.furnished ? "Oui" : "Non") : null],
    ["Extérieurs", dehors ? dehors.charAt(0).toLocaleUpperCase("fr-FR") + dehors.slice(1) : null],
    ["Disponibilité", clean(b.availability, 60)],
    ["Charges", b.transaction === "location" && b.charges != null ? `${eurosRonds(b.charges)} par mois` : null],
    ["Dépôt de garantie", b.transaction === "location" && b.deposit != null ? eurosRonds(b.deposit) : null],
    ["Honoraires", clean(b.fees, 200)],
    ["Taxe foncière", clean(b.propertyTax, 60)],
    ["Référence", clean(b.ref, 24)],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]);
}

/** Une étiquette énergie : la classe du diagnostic mise en avant, ou « non communiquée » (jamais une classe supposée). */
function withEnergyLabel(html: string, cls: "tn-dpe" | "tn-ges", letter: string | null): string {
  const L = letter && /^[A-G]$/.test(letter) ? letter : null;
  return html.replace(new RegExp(`<figure class="tn-etiquette ${cls}"([^>]*)>([\\s\\S]*?)<\\/figure>`), (_m, attrs: string, inner: string) => {
    let x = inner.replace(/<li data-l="([A-G])"[^>]*>/g, (_l, l: string) => `<li data-l="${l}"${l === L ? ' class="tn-oui"' : ""}>`)
      .replace(/(<p class="tn-classe">)[\s\S]*?(<\/p>)/, (_p, a: string, b: string) => `${a}Classe : <strong>${L ?? "non communiquée"}</strong>${b}`)
      .replace(/<p class="tn-alerte">[\s\S]*?<\/p>/, "");
    // Mention due dans une annonce pour un logement classé F ou G (à faire vérifier par l'agence, comme toute mention légale).
    if (cls === "tn-dpe" && (L === "F" || L === "G")) x += `<p class="tn-alerte">Logement à consommation énergétique excessive : classe ${L}</p>`;
    return `<figure class="tn-etiquette ${cls}"${attrs.replace(/\sdata-tn-classe="[^"]*"/, "")}${L ? ` data-tn-classe="${L}"` : ""}>${x}</figure>`;
  });
}

/**
 * La fiche d'un bien, pièce par pièce (« data-tn-bien » dit laquelle) : galerie et prix, caractéristiques, étiquettes
 * énergie, quartier, demande de visite. Tout vient du bien saisi par le client ; une valeur absente n'est jamais
 * inventée : sa ligne s'en va, ou reste « [À compléter] ».
 */
export function withTenueBienFiche(html: string, biens: TenueBien[]): string {
  const piece = /\sdata-tn-bien="(galerie|caracteristiques|energie|quartier|visite)"/.exec(html)?.[1], b = ficheBien(biens);
  if (!piece || !b) return html;
  const inner = (rx: RegExp, value: string | null) => (h: string) => (value == null ? h : h.replace(rx, (_m, a: string, z: string) => `${a}${value}${z}`));
  const prix = bienPrix(b), lieu = bienLieu(b);
  let out = html;
  if (piece === "galerie") {
    out = inner(/(<small class="tn-sur">)[\s\S]*?(<\/small>)/, esc([bienType(b), bienStatut(b), lieu].filter(Boolean).join(" · ")))(out);
    out = inner(/(<h1>)[\s\S]*?(<\/h1>)/, esc(b.title))(out);
    out = inner(/(<em class="tn-prix-bien">)[\s\S]*?(<\/em>)/, bienParti(b) ? bienStatut(b) : prix ? esc(prix) : null)(out);
    out = inner(/(<span class="tn-ref">)[\s\S]*?(<\/span>)/, b.ref ? `Référence ${esc(b.ref)}` : null)(out);
    if (b.photos.length) out = inner(/(<div class="tn-photos">)(?:<div class="tn-ph"[^>]*><\/div>)*(<\/div>)/, b.photos.slice(0, 5).map((u) => `<div class="tn-ph"${pic(u)}></div>`).join(""))(out);
    const cles: [string, string][] = [];
    if (b.surface) cles.push([`${nombre(b.surface)} m²`, "Surface"]);
    if (b.rooms) cles.push([String(b.rooms), b.rooms > 1 ? "Pièces" : "Pièce"]);
    if (b.bedrooms) cles.push([String(b.bedrooms), b.bedrooms > 1 ? "Chambres" : "Chambre"]);
    else if (b.land) cles.push([`${nombre(b.land)} m²`, "Terrain"]);
    if (cles.length) out = inner(/(<ul class="tn-cles">)[\s\S]*?(<\/ul>)/, cles.map(([v, l]) => `<li><b>${esc(v)}</b><small>${l}</small></li>`).join(""))(out);
  } else if (piece === "caracteristiques") {
    const texte = clean(b.description, 6000) ?? clean(b.summary, 400);
    out = inner(/(<p class="tn-descr">)[\s\S]*?(<\/p>)/, texte ? esc(texte).replace(/\n+/g, "<br>") : null)(out);
    out = inner(/(<dl class="tn-carac">)[\s\S]*?(<\/dl>)/, bienRows(b).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join(""))(out);
    out = out.replace(/<ul class="tn-atouts-b">[\s\S]*?<\/ul>/, b.features.length ? `<ul class="tn-atouts-b">${b.features.slice(0, 16).map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : "");
  } else if (piece === "energie") {
    out = withEnergyLabel(withEnergyLabel(out, "tn-dpe", b.dpe), "tn-ges", b.ges);
  } else if (piece === "quartier") {
    const q = b.neighborhood, texte = clean(q.text, 1200), places = q.places.filter((x) => x.label.trim());
    // Sans rien de saisi pour le quartier, la pièce garde son exemple, annoncé comme tel.
    if (!texte && !places.length && !q.photos.length) return html;
    out = inner(/(<p class="tn-texte-q">)[\s\S]*?(<\/p>)/, texte ? esc(texte).replace(/\n+/g, "<br>") : null)(out);
    out = out.replace(/<div class="tn-ph tn-cadre"[^>]*><\/div>/, q.photos[0] ? `<div class="tn-ph tn-cadre"${pic(q.photos[0])}></div>` : "");
    out = out.replace(/<ul class="tn-reperes-q">[\s\S]*?<\/ul>/, places.length ? `<ul class="tn-reperes-q">${places.slice(0, 6).map((x) => `<li><b>${esc(x.label.trim())}</b>${x.detail.trim() ? `<span>${esc(x.detail.trim())}</span>` : ""}</li>`).join("")}</ul>` : "");
  } else {
    if (b.photos[0]) out = out.replace(/(<div class="tn-rappel"><div class="tn-ph tn-cadre")[^>]*>/, (_m, a: string) => `${a}${pic(b.photos[0])}>`);
    out = inner(/(<b class="tn-nom-b">)[\s\S]*?(<\/b>)/, esc(b.title))(out);
    out = inner(/(<span class="tn-lieu-b">)[\s\S]*?(<\/span>)/, lieu ? esc([bienType(b), lieu].join(" · ")) : null)(out);
    out = inner(/(<em class="tn-prix-bien">)[\s\S]*?(<\/em>)/, bienParti(b) ? bienStatut(b) : prix ? esc(prix) : null)(out);
    // On ne propose à la visite que les biens encore à vendre ou à louer ; celui de la fiche est choisi d'avance.
    const libres = biens.filter((x) => !bienParti(x)).slice(0, 60);
    if (libres.length) out = inner(/(<select\b[^>]*\sdata-tn-biens-choix(?=[\s>])[^>]*>)[\s\S]*?(<\/select>)/, libres.map((x) => `<option${x === b ? " selected" : ""}>${esc(`${x.title}${x.ref ? ` (${x.ref})` : ""}`)}</option>`).join(""))(out);
  }
  return markMissing(out);
}

/**
 * La carte du restaurant : les rubriques et les plats publiés de la rubrique Carte. Un prix absent reste « [À compléter] » ;
 * les allergènes ne s'affichent que s'ils ont été saisis (le Studio ne les déduit ni ne les complète jamais).
 */
export function withTenueCarte(html: string, carte: TenueRubrique[]): string {
  const rubriques = carte.filter((r) => r.items.length);
  if (!rubriques.length || !/\sdata-tn-carte(?=[\s>])/.test(html)) return html;
  const plat = (p: TenuePlat) => `<li><b>${esc(p.name)}${p.vegetarian ? "<i>Végétarien</i>" : ""}</b>${p.description.trim() ? `<span>${esc(p.description.trim())}</span>` : ""}<em>${p.price ? esc(p.price) : "[À compléter : prix]"}</em>${p.allergens.trim() ? `<small>Allergènes : ${esc(p.allergens.trim())}</small>` : ""}</li>`;
  return markMissing(html.replace(/(<div class="tn-rubriques"[^>]*>)(?:<article\b[\s\S]*?<\/article>)*(<\/div>)/, (_m, a: string, b: string) => `${a}${rubriques.slice(0, 12).map((r) => `<article class="tn-rubrique"><h3>${esc(r.title)}</h3><ul>${r.items.slice(0, 40).map(plat).join("")}</ul></article>`).join("")}${b}`));
}

/**
 * Le rendez-vous en trois temps : les vraies prestations (nom, durée, prix) et, si le client a donné son équipe, les
 * vraies personnes (« Sans préférence » d'abord). Sans équipe donnée, les lignes restent « [À compléter : prénom] ».
 */
export function withTenueRdvSteps(html: string, prestations: TenuePrestation[], equipe: TenueMembre[]): string {
  if (!/\sdata-tn-(?:prestations|equipe)-options(?=[\s>])/.test(html)) return html;
  const group = (attr: string, rows: string) => (h: string) => (rows ? h.replace(new RegExp(`(<div\\b[^>]*\\s${attr}(?=[\\s>])[^>]*>)[\\s\\S]*?(<\\/div>)`), (_m, a: string, b: string) => `${a}${rows}${b}`) : h);
  const choix = (name: string, value: string, on: boolean, inside: string) => `<label><input type="radio" name="${name}" value="${esc(value)}"${on ? " checked" : ""}><span>${inside}</span></label>`;
  const membres = equipe.filter((m) => m.name.trim());
  let out = group("data-tn-prestations-options", prestations.slice(0, 20).map((p, i) => choix("prestation", p.name, i === 0, `<b>${esc(p.name)}</b><small>Durée : ${p.duration ? esc(p.duration) : "[À compléter]"}</small><em>${p.price ? esc(p.price) : "[À compléter : prix]"}</em>`)).join(""))(html);
  out = group("data-tn-equipe-options", membres.length ? [choix("avec", "Sans préférence", true, "<b>Sans préférence</b><small>La première personne disponible</small>"), ...membres.slice(0, 12).map((m) => choix("avec", m.name.trim(), false, `<b>${esc(m.name.trim())}</b>${m.role?.trim() ? `<small>${esc(m.role.trim())}</small>` : ""}`))].join("") : "")(out);
  return markMissing(out);
}

// ════════════════════════════════════════════════════════════════ vente directe (module « vente », thème unique) : début
// Pièces de tenue-vente.ts : bandeau à plusieurs messages, ouverture au macaron, cartes de vente, guide de choix, page
// d'arrivée de publicité (en-tête, ouverture, témoignages, barre du produit), page des avis, collection en ajout rapide.
// Règle : rien d'exemple ne reste. Un avis, une note, un prix barré, une offre ou un macaron n'existent que s'ils
// viennent d'une vraie donnée ; ce qui est facultatif et manque est retiré, jamais montré « à compléter ».

/** Un avis d'une vraie source d'avis (ou donné par le client) : ses mots exacts, jamais réécrits. */
export type TenueAvisVente = { text: string; name: string; /** Date de l'avis, « AAAA-MM-JJ ». */ date?: string | null; /** Note donnée, de 1 à 5. */ rating?: number | null; /** La source dit que l'achat est vérifié. */ verified?: boolean; /** Photos envoyées par le client. */ photos?: string[]; /** Nom du produit concerné. */ product?: string | null; /** Réponse publiée par la marque. */ reply?: string | null };
/** Ce que la vente directe demande de plus au Studio. Tout est facultatif : ce qui manque n'est pas montré. */
export type TenueVitrine = {
  /** Par produit (son nom) : son genre, son vrai prix de comparaison, son plus petit prix (« dès … ») quand ses versions n'ont pas le même prix, son nombre de versions. */
  produits?: Record<string, { genre?: string | null; compare?: string | null; des?: string | null; versions?: number }>;
  /** La promotion réelle du moment : son libellé, sa date de fin (« AAAA-MM-JJ »), les produits concernés (tous si absent). */
  offre?: { label: string; fin: string; produits?: string[] } | null;
  /** Les avis d'une vraie source : son nom, si elle vérifie les achats, les avis. */
  avis?: { source: string; verifies?: boolean; liste: TenueAvisVente[] } | null;
  /** Le chiffre vrai du macaron de l'ouverture, donné par le client. */
  macaron?: { chiffre: string; quoi: string } | null;
  /** D'autres messages vrais du bandeau, écrits par le client. */
  messages?: string[];
};

const manque = (x: string) => /\[À compléter|<mark class="tn-manque">/.test(x);
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 2026-11-05 » → « 5 novembre 2026 » ; une date écrite autrement reste telle quelle. */
export const dateFr = (iso: string): string => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim()); return m && MOIS[+m[2] - 1] ? `${+m[3] === 1 ? "1er" : +m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : iso.trim(); };
const note = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const valid = (r: number | null | undefined): r is number => typeof r === "number" && r >= 1 && r <= 5;
/** Une note en étoiles, dessinée par la feuille (jamais des étoiles écrites) : seulement pour une vraie note. */
export const etoiles = (n: number) => `<i class="tn-v-etoiles" style="--note:${Math.round(n * 10) / 10}" role="img" aria-label="Note : ${note(n)} sur 5"></i>`;
/** L'offre du client vaut encore : sa date de fin n'est pas passée (une offre sans date de fin lisible n'est jamais montrée). */
export function offreActive(o: TenueVitrine["offre"], now = Date.now()): o is NonNullable<TenueVitrine["offre"]> {
  if (!o || !o.label?.trim()) return false;
  const end = Date.parse(`${o.fin}T23:59:59`);
  return Number.isFinite(end) && end >= now;
}
const avisReels = (d: TenueSite): TenueAvisVente[] => (d.vitrine?.avis?.liste ?? []).filter((a) => a.text?.trim() && a.name?.trim());
const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase("fr-FR") === b.trim().toLocaleLowerCase("fr-FR");
const signature = (a: TenueAvisVente, avecNote = true) => [a.date ? esc(dateFr(a.date)) : "", avecNote && valid(a.rating) ? `Note donnée : ${note(a.rating)}/5` : ""].filter(Boolean).join(" · ");
const sourceLine = (d: TenueSite) => { const s = clean(d.vitrine?.avis?.source, 80); return s ? `Avis recueillis par ${esc(s)}${d.vitrine?.avis?.verifies ? ", qui vérifie les achats" : ""}. Ils sont repris tels qu'ils ont été écrits.` : null; };

/**
 * Bandeau à plusieurs messages : la livraison et les retours du client, son offre réelle (si sa date de fin n'est pas
 * passée), ses autres messages. Le paiement et l'offre, facultatifs, sont retirés quand ils manquent. La liste est
 * doublée (la copie n'est pas lue) pour un défilement sans fin ; chaque message porte son rang pour le relais.
 */
export function withVenteMessages(html: string, d: TenueSite, now = Date.now()): string {
  if (!/\sdata-tn-messages\b/.test(html) || /class="tn-v-fil tn-v-bis"/.test(html)) return html;
  const shipping = clean(d.shipping, 120), returns = clean(d.returns, 120), offre = offreActive(d.vitrine?.offre, now) ? d.vitrine!.offre! : null;
  return markMissing(html.replace(/<ul class="tn-v-fil" data-tn-messages>([\s\S]*?)<\/ul>/, (_m, lines: string) => {
    const out: string[] = [];
    for (const li of lines.match(/<li\b[^>]*>[\s\S]*?<\/li>/g) ?? []) {
      const key = /\sdata-tn-cle="([a-z]+)"/.exec(li)?.[1] ?? null, text = li.replace(/^<li\b[^>]*>|<\/li>$/g, "");
      if (key === "livraison") out.push(shipping ? `Livraison : ${esc(shipping)}` : text);
      else if (key === "retours") out.push(returns ? `Retours : ${esc(returns)}` : text);
      else if (key === "offre") { if (offre) out.push(`${esc(offre.label.trim())}, jusqu'au ${esc(dateFr(offre.fin))}`); else if (!manque(text)) out.push(text); }
      else if (!manque(text)) out.push(text);
    }
    for (const m of d.vitrine?.messages ?? []) { const t = clean(m, 120); if (t && !out.includes(esc(t))) out.push(esc(t)); }
    const list = out.slice(0, 6), items = list.map((t, i) => `<li style="--i:${i}">${t}</li>`).join("");
    return `<ul class="tn-v-fil" data-tn-messages data-tn-n="${list.length}">${items}</ul><ul class="tn-v-fil tn-v-bis" aria-hidden="true">${items}</ul>`;
  }));
}

/** Le macaron de l'ouverture : le chiffre vrai du client, sinon pas de macaron (jamais un chiffre « à compléter » sur la photo). */
export function withVenteMacaron(html: string, d: TenueSite): string {
  if (!/\sdata-tn-macaron\b/.test(html)) return html;
  const m = d.vitrine?.macaron, chiffre = clean(m?.chiffre, 14), quoi = clean(m?.quoi, 40);
  return html.replace(/<div class="tn-v-macaron" data-tn-macaron>([\s\S]*?)<\/div>/, (all, inner: string) => (chiffre && quoi ? `<div class="tn-v-macaron" data-tn-macaron><b>${esc(chiffre)}</b><span>${esc(quoi)}</span></div>` : manque(inner) ? "" : all));
}

/** Ce qui est écrit sur une carte de vente pour un produit nommé : son genre, sa ligne d'envie, le mot du bouton. */
function cartesEcrites(html: string) {
  const cards = html.match(/<a class="tn-v-carte[\s\S]*?<\/a>/g) ?? [];
  const pick = (c: string, rx: RegExp) => { const v = rx.exec(c)?.[1]?.trim() ?? ""; return v && !manque(v) ? v : null; };
  return { voir: pick(cards[0] ?? "", /<i class="tn-v-voir">([\s\S]*?)<\/i>/) ?? "Découvrir", par: new Map(cards.map((c) => [(pick(c, /<b>([\s\S]*?)<\/b>/) ?? "").toLocaleLowerCase("fr-FR"), { genre: pick(c, /<small>([\s\S]*?)<\/small>/), envie: pick(c, /<span class="tn-v-envie">([\s\S]*?)<\/span>/) }] as const)) };
}
/**
 * Cartes de vente : les vrais produits (huit au plus). Le genre vient du catalogue, sinon de la carte écrite pour ce
 * produit ; la ligne d'envie est celle écrite pour CE produit (jamais celle d'un autre) ; « dès » et le prix barré
 * viennent du catalogue ; l'étiquette d'offre, de la promotion réelle du client.
 */
export function withVenteCartes(html: string, d: TenueSite, now = Date.now()): string {
  const products = d.products ?? [];
  if (!products.length || !/\sdata-tn-cartes-vente\b/.test(html)) return html;
  const ecrit = cartesEcrites(html), offre = offreActive(d.vitrine?.offre, now) ? d.vitrine!.offre! : null;
  const card = (p: TenueProduct) => {
    const x = d.vitrine?.produits?.[p.title] ?? {}, w = ecrit.par.get(p.title.trim().toLocaleLowerCase("fr-FR"));
    const genre = clean(x.genre, 40), tag = offre && (!offre.produits?.length || offre.produits.some((t) => sameName(t, p.title))) && !p.soldOut ? `<em class="tn-v-offre">${esc(offre.label.trim().slice(0, 30))}</em>` : "";
    const prix = p.soldOut ? "Épuisé" : p.price ? `${x.des ? `dès ${esc(x.des)}` : esc(p.price)}${x.compare ? ` <s>${esc(x.compare)}</s>` : ""}` : "[À compléter : prix]";
    return `<a class="tn-v-carte${p.soldOut ? " tn-epuise" : ""}" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"><div class="tn-ph"${pic(p.image)}>${tag}</div>${genre ? `<small>${esc(genre)}</small>` : w?.genre ? `<small>${w.genre}</small>` : ""}<b>${esc(p.title)}</b>${w?.envie ? `<span class="tn-v-envie">${w.envie}</span>` : ""}<span class="tn-v-prix">${prix}</span><i class="tn-v-voir">${ecrit.voir}</i></a>`;
  };
  return markMissing(html.replace(/(<div class="tn-v-cartes">)[\s\S]*<\/div>(?=<\/section>)/, (_m, a: string) => `${a}${products.slice(0, 8).map(card).join("")}</div>`));
}

/**
 * Guide de choix : chaque envie mène au produit du catalogue qu'elle nomme (sa vraie photo, son vrai prix, sa fiche).
 * Quand aucune envie ne nomme un produit du catalogue, elles suivent l'ordre du catalogue ; une envie sans produit est
 * retirée. Façon « cartes » : toutes les envies sont ouvertes ; sinon, seule la première.
 */
export function withVenteGuide(html: string, d: TenueSite, built?: string | null): string {
  if (!/\sdata-tn-guide\b/.test(html)) return html;
  const products = (d.products ?? []).filter((p) => !p.soldOut), cartes = builtOf(html, built) === "cartes";
  const blocks = html.match(/<details class="tn-v-besoin"[\s\S]*?<\/details>/g) ?? [];
  const named = blocks.map((b) => { const n = (/<b data-tn-produit>([\s\S]*?)<\/b>/.exec(b)?.[1] ?? "").replace(/<[^>]+>/g, "").trim(); return products.find((p) => sameName(p.title, n)) ?? null; });
  const some = named.some(Boolean);
  let i = 0, kept = 0;
  const out = html.replace(/<details class="tn-v-besoin"(?: open)?>([\s\S]*?)<\/details>/g, (_m, inner: string) => {
    const p = products.length ? (some ? named[i] : products[i] ?? null) : undefined;
    i++;
    if (p === null) return "";
    const body = p ? inner.replace(/<div class="tn-ph"[^>]*><\/div>/, `<div class="tn-ph"${pic(p.image)}></div>`).replace(/(<b data-tn-produit>)[\s\S]*?(<\/b>)/, `$1${esc(p.title)}$2`)
      .replace(/(<span class="tn-v-prix">)[\s\S]*?(<\/span>)/, `$1${p.price ? esc(p.price) : "[À compléter : prix]"}$2`).replace(/data-go="product"/, `data-go="${esc(p.go ?? "product")}"`) : inner;
    return `<details class="tn-v-besoin"${cartes || kept++ === 0 ? " open" : ""}>${body}</details>`;
  });
  return products.length ? markMissing(out) : out;
}

/** Le produit d'une page d'arrivée : le premier produit en stock du catalogue (son nom dans l'en-tête et la barre, sa photo, sa fiche). */
export function withVenteArrivee(html: string, d: TenueSite): string {
  if (!/\sdata-tn-(?:arrivee|barre-produit)\b/.test(html)) return html;
  const p = (d.products ?? []).find((x) => !x.soldOut) ?? (d.products ?? [])[0];
  if (!p) return html;
  return html.replace(/(<(?:span|b) data-tn-produit-nom>)[\s\S]*?(<\/(?:span|b)>)/g, `$1${esc(p.title)}$2`).replace(/data-go="product"/g, `data-go="${esc(p.go ?? "product")}"`)
    .replace(/(<div class="tn-v-colle">)<div class="tn-ph"[^>]*><\/div>/, `$1<div class="tn-ph"${pic(p.image)}></div>`);
}

/** L'avis posé sur la photo d'une ouverture d'arrivée : le mieux noté des vrais avis courts ; sans vrai avis, rien n'est posé. */
export function withVenteAvisPose(html: string, d: TenueSite): string {
  if (!/\sdata-tn-avis-pose\b/.test(html)) return html;
  const best = avisReels(d).filter((a) => a.text.trim().length <= 180).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.text.length - b.text.length)[0];
  return html.replace(/<blockquote class="tn-v-pose">([\s\S]*?)<\/blockquote>/, (all, inner: string) => {
    if (best) { const src = clean(d.vitrine?.avis?.source, 80); return `<blockquote class="tn-v-pose">${valid(best.rating) ? etoiles(best.rating) : ""}<p>«&nbsp;${esc(best.text.trim())}&nbsp;»</p><cite>${esc(best.name.trim())}${best.date ? ` · ${esc(dateFr(best.date))}` : ""}</cite>${src ? `<small>Avis recueilli par ${esc(src)}</small>` : ""}</blockquote>`; }
    // Un vrai avis écrit dans la pièce reste ; ses lignes encore à compléter s'en vont.
    return manque(/<p>([\s\S]*?)<\/p>/.exec(inner)?.[1] ?? "[À compléter") ? "" : all.replace(/<(cite|small)>(?:(?!<\/\1>)[\s\S])*?(?:\[À compléter|<mark class="tn-manque">)[\s\S]*?<\/\1>/g, "");
  });
}

/**
 * Témoignages datés : avec une source d'avis, les trois mieux notés et, quand les notes diffèrent, l'avis le moins bien
 * noté montré à part ; sinon seuls les vrais avis écrits dans la pièce restent. Sans aucun avis, il ne reste que
 * l'invitation à donner le premier (la pièce ne se pose pas).
 */
export function withVenteTemoignages(html: string, d: TenueSite): string {
  if (!/\sdata-tn-temoignages\b/.test(html)) return html;
  const reels = avisReels(d);
  const line = (a: TenueAvisVente) => `<li><blockquote>${esc(a.text.trim())}</blockquote><b>${esc(a.name.trim())}</b>${signature(a) ? `<span>${signature(a)}</span>` : ""}</li>`;
  let out = html;
  if (reels.length) {
    const notes = reels.map((a) => a.rating).filter(valid), low = notes.length && Math.min(...notes) < Math.max(...notes) ? Math.min(...notes) : null;
    const reserve = low == null ? null : reels.filter((a) => a.rating === low).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))[0];
    const top = reels.filter((a) => a !== reserve).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 3);
    out = out.replace(/(<ul class="tn-v-avis-l">)[\s\S]*?(<\/ul>)/, `$1${top.map(line).join("")}$2`)
      .replace(/<div class="tn-v-nuance">(<b>[\s\S]*?<\/b>)[\s\S]*?<\/div>/, (_m, title: string) => (reserve ? `<div class="tn-v-nuance">${title}<blockquote>${esc(reserve.text.trim())}</blockquote><span>${[esc(reserve.name.trim()), signature(reserve)].filter(Boolean).join(" · ")}</span></div>` : ""));
    const src = sourceLine(d);
    if (src) out = out.replace(/(<p class="tn-v-source">)[\s\S]*?(<\/p>)/, `$1${src}$2`);
  } else {
    out = out.replace(/(<ul class="tn-v-avis-l">)([\s\S]*?)(<\/ul>)/, (_m, a: string, lines: string, b: string) => `${a}${(lines.match(/<li>[\s\S]*?<\/li>/g) ?? []).filter((li) => !manque(/<blockquote>([\s\S]*?)<\/blockquote>/.exec(li)?.[1] ?? "[À compléter")).map((li) => li.replace(/<(b|span)>(?:(?!<\/\1>)[\s\S])*?(?:\[À compléter|<mark class="tn-manque">)[\s\S]*?<\/\1>/g, "")).join("")}${b}`)
      .replace(/<div class="tn-v-nuance">[\s\S]*?<\/div>/, (m) => (manque(/<blockquote>([\s\S]*?)<\/blockquote>/.exec(m)?.[1] ?? "[À compléter") ? "" : m));
  }
  // Aucun avis : ni phrase d'introduction, ni source, ni avis réservé ; seulement l'invitation.
  if (!/<ul class="tn-v-avis-l">\s*<li>/.test(out)) out = out.replace(/<p class="tn-v-(?:chapo|source)">[\s\S]*?<\/p>/g, "").replace(/<div class="tn-v-nuance">[\s\S]*?<\/div>/, "");
  return out;
}

/**
 * Page des avis : TOUT vient de la source d'avis. La note moyenne, le nombre d'avis et la répartition sont calculés ;
 * la liste part du plus récent ; « Achat vérifié » n'apparaît que si la source le dit ; un avis mène à son produit
 * quand il est au catalogue. Sans source, il ne reste que le titre et l'invitation à donner le premier avis.
 */
export function withVenteAvisPage(html: string, d: TenueSite): string {
  if (!/\sdata-tn-avis-page\b/.test(html)) return html;
  const reels = avisReels(d).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")).slice(0, 60), notes = reels.map((a) => a.rating).filter(valid);
  if (!reels.length) return html.replace(/<div class="tn-v-resume">[\s\S]*?<\/ul><\/div>/, "").replace(/<div class="tn-v-tri">[\s\S]*?<\/div>/, "").replace(/(<ul class="tn-v-avis-l" data-tn-avis-liste>)[\s\S]*?(<\/ul>)/, "$1$2").replace(/<p class="tn-v-source">[\s\S]*?<\/p>/, "");
  const avg = notes.length ? notes.reduce((n, x) => n + x, 0) / notes.length : null;
  const NOMS = ["Cinq étoiles", "Quatre étoiles", "Trois étoiles", "Deux étoiles", "Une étoile"];
  const bars = NOMS.map((nom, i) => { const n = notes.filter((x) => Math.round(x) === 5 - i).length; return `<li><span>${nom}</span><i style="--part:${notes.length ? Math.round((n / notes.length) * 100) : 0}%"></i><em>${n}</em></li>`; }).join("");
  const resume = avg == null ? "" : `<div class="tn-v-resume"><div class="tn-v-moyenne"><b>${note(avg)}</b>${etoiles(avg)}<span>${reels.length} avis</span></div><ul class="tn-v-barres">${bars}</ul></div>`;
  const line = (a: TenueAvisVente) => {
    const p = a.product ? (d.products ?? []).find((x) => sameName(x.title, a.product!)) : null;
    return `<li${a.date ? ` data-tn-date="${esc(a.date)}"` : ""}${valid(a.rating) ? ` data-tn-note="${a.rating}"` : ""}><div class="tn-v-qui">${valid(a.rating) ? etoiles(a.rating) : ""}${a.date ? `<span>${esc(dateFr(a.date))}</span>` : ""}</div><b>${esc(a.name.trim())}</b>${a.verified ? '<em class="tn-v-verifie">Achat vérifié</em>' : ""}<blockquote>${esc(a.text.trim())}</blockquote>`
      + `${(a.photos ?? []).length ? `<div class="tn-v-photos">${a.photos!.slice(0, 4).map((u) => `<div class="tn-ph"${pic(u)} role="img" aria-label="Photo envoyée par ${esc(a.name.trim())}"></div>`).join("")}</div>` : ""}`
      + `${p ? `<a class="tn-v-produit" href="#" onclick="return false" data-go="${esc(p.go ?? "product")}"><i class="tn-ph"${pic(p.image)}></i><span>${esc(p.title)}</span></a>` : a.product?.trim() ? `<span class="tn-v-produit"><span>${esc(a.product.trim())}</span></span>` : ""}`
      + `${a.reply?.trim() ? `<div class="tn-v-reponse"><small>La réponse de la marque</small><p>${esc(a.reply.trim())}</p></div>` : ""}</li>`;
  };
  return html.replace(/<div class="tn-v-resume">[\s\S]*?<\/ul><\/div>/, resume)
    .replace(/(<ul class="tn-v-avis-l" data-tn-avis-liste>)[\s\S]*?(<\/ul>)/, `$1${reels.map(line).join("")}$2`)
    .replace(/(<p class="tn-v-source">)[\s\S]*?(<\/p>)/, (_m, a: string, b: string) => `${a}${sourceLine(d) ?? "[À compléter : d'où viennent ces avis]"}${b}`);
}

/**
 * Collection, façon « ajout rapide » : chaque carte devient un cadre avec son lien vers la fiche et, dessous, son
 * bouton : « Ajouter au panier » quand le produit n'a qu'une version, « Choisir des options » sinon (il mène à la
 * fiche) ; rien pour un produit épuisé. La note en étoiles n'apparaît que pour un produit qui a de vrais avis notés.
 */
export function withVenteCatalogue(html: string, d: TenueSite, built?: string | null): string {
  if (d.live || !/class="tn tn-catalogue/.test(html) || builtOf(html, built) !== "ajout-rapide" || /class="tn-v-ajout/.test(html)) return html;
  const reels = avisReels(d);
  return html.replace(/<a class="(tn-carte-p[^"]*)" href="#" onclick="return false" data-go="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g, (_m, cls: string, go: string, data: string, inner: string) => {
    const title = (/<b>([\s\S]*?)<\/b>/.exec(inner)?.[1] ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').trim();
    const x = Object.entries(d.vitrine?.produits ?? {}).find(([t]) => sameName(t, title))?.[1], notes = reels.filter((a) => a.product && sameName(a.product, title)).map((a) => a.rating).filter(valid);
    const stars = notes.length ? `<span class="tn-v-note">${etoiles(notes.reduce((n, r) => n + r, 0) / notes.length)}<u>(${notes.length})</u></span>` : "";
    const button = /tn-epuise/.test(cls) ? "" : x?.versions === 1
      ? `<a class="tn-v-ajout" href="#" onclick="return false" role="button" data-pogo>Ajouter au panier</a>`
      : `<a class="tn-v-ajout" href="#" onclick="return false" data-go="${go}">Choisir des options</a>`;
    return `<div class="${cls}"${data}><a class="tn-v-vers" href="#" onclick="return false" data-go="${go}">${inner.replace(/(<\/b>)/, `$1${stars}`)}</a>${button}</div>`;
  });
}

/** Toutes les vraies données des pièces de la vente directe, en une passe. */
export function withTenueVitrine(html: string, d: TenueSite, built?: string | null): string {
  if (!/\sdata-tn-(?:messages|macaron|cartes-vente|guide|arrivee|barre-produit|avis-pose|temoignages|avis-page)\b|class="tn tn-catalogue/.test(html)) return html;
  let out = withVenteMessages(html, d);
  out = withVenteMacaron(out, d);
  out = withVenteCartes(out, d);
  out = withVenteGuide(out, d, built);
  out = withVenteArrivee(out, d);
  out = withVenteAvisPose(out, d);
  out = withVenteTemoignages(out, d);
  out = withVenteAvisPage(out, d);
  return withVenteCatalogue(out, d, built);
}

/**
 * Mise en boutique Shopify des pièces de la vente directe (appelée par to-shopify.ts, après les sections « en direct ») :
 * les cartes de vente, le guide de choix, l'en-tête et la barre d'une page d'arrivée lisent la boutique (photo, nom,
 * prix, prix de comparaison, stock) ; l'ajout rapide de la collection devient un vrai formulaire d'achat. Aucun script.
 */
export function venteBoutique(html: string, o: { root: string | null; built?: string | null; products: { handle: string; title: string }[]; first?: string | null }): string {
  const img = (v: string, w: number) => `{% if ${v}.featured_image %} role="img" aria-label="{{ ${v}.title | escape }}" style="background-image:url({{ ${v}.featured_image | image_url: width: ${w} }})"{% endif %}`;
  const handleOf = (title: string) => o.products.find((p) => sameName(p.title, title))?.handle ?? null;
  let out = html;
  // Le bandeau : ses mouvements (la feuille de la boutique ne garde pas les « @keyframes »).
  if (o.root === "tn-messages") out = out.replace(/^(<section\b[^>]*>)/, `$1<style>@keyframes tn-v-defile{to{transform:translateX(-100%)}}@keyframes tn-v-tour-2{0%{opacity:0;transform:translateY(5px)}4%,46%{opacity:1;transform:none}50%,100%{opacity:0}}@keyframes tn-v-tour-3{0%{opacity:0;transform:translateY(5px)}3%,30%{opacity:1;transform:none}33.3%,100%{opacity:0}}@keyframes tn-v-tour-4{0%{opacity:0;transform:translateY(5px)}2.5%,22%{opacity:1;transform:none}25%,100%{opacity:0}}@keyframes tn-v-tour-5{0%{opacity:0;transform:translateY(5px)}2%,17.5%{opacity:1;transform:none}20%,100%{opacity:0}}@keyframes tn-v-tour-6{0%{opacity:0;transform:translateY(5px)}2%,14.5%{opacity:1;transform:none}16.6%,100%{opacity:0}}</style>`);
  if (o.root === "tn-barre-produit") out = out.replace(/^(<section\b[^>]*>)/, `$1<style>@keyframes tn-v-monte{from{transform:translateY(110%)}to{transform:none}}</style>`);
  if (/\sdata-tn-cartes-vente\b/.test(out)) {
    const ecrit = cartesEcrites(out), envies = [...ecrit.par.entries()].map(([name, w]) => ({ handle: handleOf(name), envie: w.envie })).filter((x) => x.handle && x.envie);
    const envie = envies.length ? `{%- case product.handle -%}${envies.map((x) => `{%- when '${x.handle}' -%}<span class="tn-v-envie">${x.envie}</span>`).join("")}{%- endcase -%}` : "";
    out = out.replace(/(<div class="tn-v-cartes">)[\s\S]*<\/div>(?=<\/section>)/, `$1{%- for product in collections.all.products limit: 8 -%}<a class="tn-v-carte{% unless product.available %} tn-epuise{% endunless %}" href="{{ product.url }}"><div class="tn-ph"{% if product.featured_image %} style="background-image:url({{ product.featured_image | image_url: width: 800 }})"{% endif %}></div>{%- if product.type != blank -%}<small>{{ product.type }}</small>{%- endif -%}<b>{{ product.title }}</b>${envie}<span class="tn-v-prix">{%- if product.available -%}{%- if product.price_varies -%}dès {% endif -%}{{ product.price_min | money }}{%- if product.compare_at_price_min > product.price_min %} <s>{{ product.compare_at_price_min | money }}</s>{%- endif -%}{%- else -%}Épuisé{%- endif -%}</span><i class="tn-v-voir">${ecrit.voir}</i></a>{%- endfor -%}</div>`);
  }
  if (/\sdata-tn-guide\b/.test(out) && o.products.length) {
    const blocks = out.match(/<details class="tn-v-besoin"[\s\S]*?<\/details>/g) ?? [];
    const named = blocks.map((b) => handleOf((/<b data-tn-produit>([\s\S]*?)<\/b>/.exec(b)?.[1] ?? "").replace(/<[^>]+>/g, "")));
    const some = named.some(Boolean);
    let i = 0, kept = 0;
    out = out.replace(/<details class="tn-v-besoin"(?: open)?>([\s\S]*?)<\/details>/g, (_m, inner: string) => {
      const h = some ? named[i] : o.products[i]?.handle ?? null;
      i++;
      if (!h) return "";
      const v = `choix${i}`;
      return `<details class="tn-v-besoin"${o.built === "cartes" || kept++ === 0 ? " open" : ""}>{%- assign ${v} = all_products['${h}'] -%}${inner.replace(/<div class="tn-ph"[^>]*><\/div>/, `<div class="tn-ph"${img(v, 600)}></div>`).replace(/(<b data-tn-produit>)[\s\S]*?(<\/b>)/, `$1{{ ${v}.title }}$2`)
        .replace(/(<span class="tn-v-prix">)[\s\S]*?(<\/span>)/, `$1{{ ${v}.price | money }}$2`).replace(/<a class="tn-v-lien"[^>]*>([\s\S]*?)<\/a>/, `<a class="tn-v-lien" href="{{ ${v}.url }}">$1</a>`)}</details>`;
    });
  }
  if (/\sdata-tn-(?:arrivee|barre-produit)\b/.test(out) && o.first) {
    out = out.replace(/^(<section\b[^>]*>)/, `$1{%- assign vedette = all_products['${o.first}'] -%}`).replace(/(<(?:span|b) data-tn-produit-nom>)[\s\S]*?(<\/(?:span|b)>)/g, "$1{{ vedette.title }}$2")
      .replace(/(<div class="tn-v-colle">)<div class="tn-ph"[^>]*><\/div>/, `$1<div class="tn-ph"${img("vedette", 300)}></div>`).replace(/<a ([^>]*?)href="#"([^>]*?)\sdata-go="product"([^>]*)>/g, `<a $1href="{{ vedette.url }}"$2$3>`);
  }
  // Collection en ajout rapide : la carte de la boutique, puis un vrai formulaire d'achat (une seule version) ou le lien vers la fiche.
  if (o.root === "tn-catalogue" && o.built === "ajout-rapide") out = out.replace(/<a class="(tn-carte-p\{% unless product\.available %\} tn-epuise\{% endunless %\})" href="\{\{ product\.url \}\}">([\s\S]*?)<\/a>(?=\{%- endfor -%\})/, (_m, cls: string, inner: string) => `<div class="${cls}"><a class="tn-v-vers" href="{{ product.url }}">${inner}</a>{%- if product.available -%}{%- if product.has_only_default_variant -%}{%- form 'product', product, class: 'tn-v-achat' -%}<input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}"><button class="tn-v-ajout" type="submit" name="add">Ajouter au panier</button>{%- endform -%}{%- else -%}<a class="tn-v-ajout" href="{{ product.url }}">Choisir des options</a>{%- endif -%}{%- endif -%}</div>`);
  return out;
}

/**
 * Ce que le catalogue sait de plus pour la vente directe (lecture de la base, comme « tenueMetiers ») : le genre de
 * chaque produit, son vrai prix de comparaison (seulement s'il dépasse le prix), « dès » quand ses versions n'ont pas
 * le même prix, son nombre de versions. Avis, offre datée et chiffre du macaron n'ont pas encore de source dans le
 * Studio : ils restent vides, donc rien ne s'affiche.
 */
export function tenueVitrine(projectId: string): TenueVitrine {
  try {
    const produits: NonNullable<TenueVitrine["produits"]> = {};
    for (const p of listProducts(projectId)) {
      const prices = p.variants.map((v) => v.price ?? p.data.price).filter((x): x is number => x != null), price = p.data.price ?? prices[0] ?? null;
      const low = prices.length ? Math.min(...prices) : price, compare = p.data.compareAt ?? p.variants.find((v) => v.compareAt != null)?.compareAt ?? null;
      produits[p.data.title] = { genre: p.data.productType.trim() || null, compare: compare != null && low != null && compare > low ? euros(compare) : null, des: new Set(prices).size > 1 && low != null ? euros(low) : null, versions: Math.max(1, p.variants.length) };
    }
    return { produits };
  } catch { return {}; }
}
// ════════════════════════════════════════════════════════════════ vente directe : fin

/**
 * Toutes les vraies données d'une section à tenue, en une passe (l'ordre ne compte pas : chaque pose a son attribut).
 * « built » : la construction de la section, quand elle n'est pas encore écrite sur sa racine (mise en boutique).
 */
export function withTenueSite(html: string, d: TenueSite, built?: string | null): string {
  if (!/class="tn tn-/.test(html)) return html;
  let out = withTenueContact(html, d);
  out = withTenuePrestationChoices(out, d.prestations ?? []);
  out = withTenueCatalogue(out, d);
  out = withTenueFamilies(out, d.families ?? []);
  out = withTenueComparison(out, d.products ?? []);
  out = withTenueLooks(out, d.products ?? []);
  out = withTenueDirect(out, d);
  out = withTenueGuarantees(out, d);
  out = withTenueReviews(out);
  out = withTenueBienFiche(withTenueBiens(out, d.biens ?? []), d.biens ?? []);
  out = withTenueCarte(out, d.carte ?? []);
  out = withTenueRdvSteps(out, d.prestations ?? [], d.equipe ?? []);
  out = withTenueCart(out, d);
  out = withTenue404(out, d, built);
  out = withTenueLegal(out, built);
  out = withTenueSearch(out, d);
  out = withTenueVitrine(out, d, built); // vente directe (module « vente »)
  return withTenueArticles(out, d.articles ?? []);
}

/**
 * Ce qu'une section demande au catalogue pour exister (contrôle de la conception, sans IA) : une section de familles
 * sans au moins deux familles, ou un comparatif sans au moins deux produits, ne montrerait que son exemple.
 */
export function dataGaps(ids: string[], facts: { products: number; families: number; /** Biens visibles et plats publiés, quand l'appelant les connaît. */ biens?: number; plats?: number }): string[] {
  const out: string[] = [];
  if (ids.includes("tn-rayons") && facts.families < 2) out.push(`« Les familles de produits » (tn-rayons) demande au moins deux familles dans le catalogue du client (il en a ${facts.families}) : retire-la, ou prends une section de produits`);
  if (ids.includes("tn-looks") && facts.products < 2) out.push(`« Le look complet » (tn-looks) demande au moins deux produits dans le catalogue du client (il en a ${facts.products}) : retire-la`);
  // Métiers : SINA n'invente jamais un bien ni une carte. Sans bien visible ou sans plat publié, la pièce ne se pose pas.
  const immo = ids.filter((id) => id === "tn-biens" || id === "tn-recherche-biens" || id.startsWith("tn-bien-"));
  if (facts.biens === 0 && immo.length) out.push(`Les pièces de biens immobiliers (${immo.join(", ")}) demandent au moins un bien publié dans la rubrique Biens du client (il n'en a aucun) : retire-les, ou attends qu'il en publie un`);
  if (facts.plats === 0 && ids.includes("tn-carte")) out.push("« La carte du restaurant » (tn-carte) demande au moins un plat publié dans la rubrique Carte du client (il n'en a aucun) : retire-la, ou prends « Les prestations et leurs prix »");
  if (ids.includes("tn-comparatif") && facts.products < 2) out.push(`« Comparer les produits de la gamme » (tn-comparatif) demande au moins deux produits dans le catalogue du client (il en a ${facts.products}) : retire-la`);
  // Vente directe (module « vente ») : le guide de choix mène à de vrais produits.
  if (ids.includes("tn-guide-choix") && facts.products < 2) out.push(`« Lequel est fait pour toi ? » (tn-guide-choix) demande au moins deux produits dans le catalogue du client (il en a ${facts.products}) : retire-la`);
  return out;
}

// ---------------------------------------------------------------- lecture des rubriques Biens et Carte (seule partie qui lit la base)

/**
 * Ce que le Studio sait des métiers du client : ses biens visibles (publiés, vendus, loués : jamais un brouillon ni un
 * bien retiré) et la carte publiée de son restaurant (jamais un plat en brouillon, retiré ou indisponible). Une lecture
 * qui échoue rend une liste vide : la pièce garde alors son exemple, annoncé « À compléter ».
 */
export function tenueMetiers(projectId: string): Pick<TenueSite, "biens" | "carte" | "vitrine"> {
  const url = (assetId: string) => assetUrl({ id: assetId });
  const biens = (() => {
    try {
      return listBiens(projectId).filter((b) => VISIBLE_STATUSES.includes(b.status)).map((b): TenueBien => {
        const d = b.data;
        return {
          ref: b.ref, title: d.headline || d.title, type: d.type, transaction: b.transaction, status: b.status, city: d.city, sector: d.sector,
          price: d.price, rent: d.rent, charges: d.charges, deposit: d.deposit, fees: d.fees, surface: d.surface, land: d.land, rooms: d.rooms, bedrooms: d.bedrooms,
          floor: d.floor, furnished: d.furnished, exteriors: d.exteriors, pool: d.pool, features: d.features, availability: d.availability, dpe: d.dpe, ges: d.ges,
          propertyTax: d.propertyTax, summary: d.summary, description: d.description, photos: d.photos.map((x) => url(x.assetId)), featured: d.featured,
          neighborhood: { text: d.neighborhood.text, photos: d.neighborhood.photos.map((x) => url(x.assetId)), places: d.neighborhood.places },
        };
      });
    } catch { return []; }
  })();
  const carte = (() => {
    try {
      const { categories, items } = listCarte(projectId);
      return categories.map((c): TenueRubrique => ({ title: c.title, items: items.filter((i) => i.categoryId === c.id && i.status === "published" && i.available).map((i) => ({ name: i.name, description: i.description, price: carteprice(i) || null, allergens: i.allergens, vegetarian: i.vegetarian })) })).filter((r) => r.items.length);
    } catch { return []; }
  })();
  // Vente directe (module « vente ») : ce que le catalogue sait de plus, lu ici parce que le rendu étale déjà cette lecture dans le site.
  return { biens, carte, vitrine: tenueVitrine(projectId) };
}

// ---------------------------------------------------------------- achat, suite : packs, sous le bouton, offres datées

/** Une version du produit, telle que le script commun la lit : « stock » n'existe que si le stock est suivi. Prix en centimes. */
export type TenueVersion = { id: string; options: string[]; disponible: boolean; stock?: number; prix: number; compare?: number | null };
export type TenueCadeau = { id: string; titre: string; image: string | null };
/** Tout ce que la fiche « vente directe » lit de vrai : le catalogue, l'offre saisie par le client, sa fiche d'entreprise. */
export type TenueAchatVrai = {
  titre: string; noms: string[]; versions: TenueVersion[];
  packs: { quantite: number; nom: string; prix: number; populaire?: boolean; cadeau?: TenueCadeau | null }[];
  seuilStock: number | null; stockDepart: number | null; delai: string | null;
  promo: { nom: string | null; pct: number; fin: number; cadeau?: TenueCadeau | null } | null;
  fenetre: { titre: string; texte: string; code: string } | null;
  /** Moyens de paiement réellement acceptés (noms), sinon vide : jamais un logo présumé. */
  paiements: string[];
  livraison: string | null; retours: string | null;
};
const jsonScript = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
/** Remise calculée entre un prix et son vrai prix de comparaison (jamais saisie) : « −20 % », ou rien. */
export const moins = (prix: number, compare: number | null | undefined) => (compare && compare > prix && prix > 0 ? `−${Math.round((1 - prix / compare) * 100)} %` : "");
const jourFin = (fin: number, now: number) => { const a = new Date(fin), b = new Date(now); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate() ? "Aujourd'hui seulement" : `Jusqu'au ${a.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`; };
const cadeauHtml = (c: TenueCadeau, cls: string) => `<div class="${cls}"><i class="tn-ph"${pic(c.image)}></i><span>${esc(c.titre)}</span><em>Offert</em></div>`;

/**
 * Pose les vraies données d'achat (« v ») dans les pièces qui les lisent : la table des versions et le prix barré dans le
 * bloc d'achat, les packs, les quantités des lots, le dessous du bouton, l'offre du moment, la fenêtre d'offre. Une pièce
 * dont la vraie donnée manque ne s'affiche pas (offre du moment, fenêtre d'offre) ou garde ses « [À compléter] ».
 */
export function withTenueAchatVrai(html: string, v: TenueAchatVrai, now = Date.now()): string {
  let out = html;
  const base = v.versions.find((x) => x.disponible) ?? v.versions[0];
  if (/<section\b[^>]*\sdata-tn-achat\b/.test(out) && v.versions.length) {
    if (!/<script[^>]*data-tn-versions/.test(out)) out = out.replace(/<\/section>\s*$/, `<script type="application/json" data-tn-versions data-tn-titre="${esc(v.titre)}" data-tn-noms="${esc(v.noms.join("|"))}">${jsonScript(v.versions)}</script></section>`);
    const tag = base ? moins(base.prix, base.compare) : "";
    if (tag && base?.compare) out = out.replace(/<div class="tn-prix">([^<]*)<\/div>/, (_m, p: string) => `<div class="tn-prix"><s>${money(base.compare!)}</s> ${p} <em class="tn-moins">${tag}</em></div>`);
  }
  if (/\sdata-tn-lots\b/.test(out)) out = out.replace(/<li>(<label><input type="radio" name="tn-lot"[^>]*><b>(\d+))/g, `<li data-tn-quantite="$2">$1`);
  if (/\sdata-tn-packs\b/.test(out) && v.packs.length && base) {
    const one = (p: TenueAchatVrai["packs"][number], on: boolean) => {
      const plein = base.compare && base.compare > base.prix ? base.compare * p.quantite : null, tag = moins(p.prix, plein);
      return `<li class="tn-pack${on ? " tn-on" : ""}" data-tn-pack data-tn-quantite="${p.quantite}" data-tn-prix="${Math.round(p.prix)}"${p.cadeau ? ` data-tn-cadeau="${esc(p.cadeau.id)}" data-tn-cadeau-nom="${esc(p.cadeau.titre)}"` : ""}>${p.populaire ? '<em class="tn-pack-etiquette">Le plus populaire</em>' : ""}<label><input type="radio" name="tn-pack"${on ? " checked" : ""}><b>${esc(p.nom)}</b><span class="tn-pack-prix">${plein && tag ? `<s>${money(plein)}</s> ` : ""}${money(p.prix)}${tag ? ` <em class="tn-moins">${tag}</em>` : ""}</span>${p.quantite > 1 ? `<i>soit ${money(p.prix / p.quantite)} l'unité</i>` : ""}</label>${p.cadeau ? cadeauHtml(p.cadeau, "tn-pack-cadeau") : ""}<div class="tn-pack-lignes" data-tn-pack-lignes></div></li>`;
    };
    const list = v.packs.slice(0, 4), first = Math.max(0, list.findIndex((p) => p.populaire));
    out = out.replace(/(<ul class="tn-pack-liste">)[\s\S]*?(<\/ul>)(?=<button)/, (_m, a: string, b: string) => `${a}${list.map((p, i) => one(p, i === first)).join("")}${b}`);
  }
  if (/\sdata-tn-sous-bouton\b/.test(out)) {
    const jauge = v.stockDepart && v.versions.some((x) => typeof x.stock === "number") ? `<div class="tn-jauge" data-tn-jauge data-tn-depart="${v.stockDepart}" role="img" hidden><i><b></b></i><span></span><span></span></div>` : "";
    const stock = v.seuilStock && v.versions.some((x) => typeof x.stock === "number") ? `<p class="tn-stock" data-tn-stock data-tn-seuil="${v.seuilStock}" aria-live="polite" hidden></p>` : "";
    out = out.replace(/(<section\b[^>]*\sdata-tn-sous-bouton\b[^>]*>)/, `$1${jauge}${stock}`)
      .replace(/<p class="tn-delai"[^>]*>[\s\S]*?<\/p>/, v.delai ? `<p class="tn-delai" data-tn-delai>Chez toi en ${esc(v.delai.replace(/^(?:chez toi )?en\s+/i, ""))}</p>` : "")
      .replace(/<div class="tn-paiements-sb"[^>]*>[\s\S]*?<\/div>/, v.paiements.length ? `<div class="tn-paiements-sb" data-tn-paiements-sb aria-label="Moyens de paiement acceptés">${v.paiements.slice(0, 8).map((p) => `<span>${esc(p)}</span>`).join("")}</div>` : "");
    if (v.livraison) out = out.replace(/(<li data-tn-g="livraison">[\s\S]*?<span>)[\s\S]*?(<\/span>)/, (_m, a: string, b: string) => `${a}${esc(v.livraison!.slice(0, 90))}${b}`);
    if (v.retours) out = out.replace(/(<li data-tn-g="retours">[\s\S]*?<span>)[\s\S]*?(<\/span>)/, (_m, a: string, b: string) => `${a}${esc(v.retours!.slice(0, 90))}${b}`);
    // Sans taille au catalogue, pas de lien « Quelle taille me faut-il ? ».
    if (!v.noms.some(isSize)) out = out.replace(/<details class="tn-tailles-sb"[\s\S]*?<\/details>(?=<details|<p|<div|<ul)/, "");
  }
  if (/\sdata-tn-offre-moment\b/.test(out)) {
    const p = v.promo && v.promo.fin > now ? v.promo : null;
    if (!p) return "";
    out = out.replace(/(<section\b[^>]*\sdata-tn-offre-moment\b)/, `$1 data-tn-fin="${p.fin}"`)
      .replace(/(<b class="tn-om-nom">)[\s\S]*?(<\/b>)/, (_m, a: string, b: string) => (p.nom ? `${a}${esc(p.nom)}${b}` : ""))
      .replace(/(<em class="tn-om-remise">)[\s\S]*?(<\/em>)/, `$1−${String(p.pct).replace(".", ",")} %$2`)
      .replace(/<div class="tn-om-cadeau">[\s\S]*?<\/div>/, p.cadeau ? cadeauHtml(p.cadeau, "tn-om-cadeau") : "")
      .replace(/(<p class="tn-om-fin"[^>]*>)[\s\S]*?(<\/p>)/, `$1${jourFin(p.fin, now)}$2`);
  }
  if (/\sdata-tn-fenetre-offre\b/.test(out)) {
    if (!v.fenetre) return "";
    out = out.replace(/(<h2 id="tn-fo-titre">)[\s\S]*?(<\/h2>)/, (_m, a: string, b: string) => `${a}${esc(v.fenetre!.titre)}${b}`)
      .replace(/(<p class="tn-fo-texte">)[\s\S]*?(<\/p>)/, (_m, a: string, b: string) => `${a}${esc(v.fenetre!.texte)}${b}`)
      .replace(/(<div class="tn-fo-code"[^>]*><span>[\s\S]*?<\/span><b>)[\s\S]*?(<\/b>)/, (_m, a: string, b: string) => `${a}${esc(v.fenetre!.code)}${b}`);
  }
  return out === html ? html : markMissing(out);
}
