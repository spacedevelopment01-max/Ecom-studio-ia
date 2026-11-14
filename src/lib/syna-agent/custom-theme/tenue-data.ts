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
 *  - journal : data-tn-articles, data-tn-article.
 */
import { markMissing, type TenuePrestation, type TenueProduct } from "./tenue";

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

/** Toutes les vraies données d'une section à tenue, en une passe (l'ordre ne compte pas : chaque pose a son attribut). */
export function withTenueSite(html: string, d: TenueSite): string {
  if (!/class="tn tn-/.test(html)) return html;
  let out = withTenueContact(html, d);
  out = withTenuePrestationChoices(out, d.prestations ?? []);
  out = withTenueCatalogue(out, d);
  out = withTenueFamilies(out, d.families ?? []);
  out = withTenueComparison(out, d.products ?? []);
  out = withTenueGuarantees(out, d);
  out = withTenueReviews(out);
  return withTenueArticles(out, d.articles ?? []);
}

/**
 * Ce qu'une section demande au catalogue pour exister (contrôle de la conception, sans IA) : une section de familles
 * sans au moins deux familles, ou un comparatif sans au moins deux produits, ne montrerait que son exemple.
 */
export function dataGaps(ids: string[], facts: { products: number; families: number }): string[] {
  const out: string[] = [];
  if (ids.includes("tn-rayons") && facts.families < 2) out.push(`« Les familles de produits » (tn-rayons) demande au moins deux familles dans le catalogue du client (il en a ${facts.families}) : retire-la, ou prends une section de produits`);
  if (ids.includes("tn-comparatif") && facts.products < 2) out.push(`« Comparer les produits de la gamme » (tn-comparatif) demande au moins deux produits dans le catalogue du client (il en a ${facts.products}) : retire-la`);
  return out;
}
