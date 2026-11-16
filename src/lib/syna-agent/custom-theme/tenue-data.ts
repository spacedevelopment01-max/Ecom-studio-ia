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
  return out;
}

// ---------------------------------------------------------------- lecture des rubriques Biens et Carte (seule partie qui lit la base)

/**
 * Ce que le Studio sait des métiers du client : ses biens visibles (publiés, vendus, loués : jamais un brouillon ni un
 * bien retiré) et la carte publiée de son restaurant (jamais un plat en brouillon, retiré ou indisponible). Une lecture
 * qui échoue rend une liste vide : la pièce garde alors son exemple, annoncé « À compléter ».
 */
export function tenueMetiers(projectId: string): Pick<TenueSite, "biens" | "carte"> {
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
  return { biens, carte };
}
