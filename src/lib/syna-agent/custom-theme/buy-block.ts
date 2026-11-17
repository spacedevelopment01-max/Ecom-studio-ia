/**
 * Bloc d'achat « Produit vedette » du thème sur mesure, rempli avec les VRAIES données du client (audit du 10 novembre
 * 2026, exigences 6.11, G6 et 5.2) : prix, nom, couleurs et tailles du produit, remises par lot, abonnement, lot à
 * compléter, promotion et sa vraie date de fin, paliers de cadeaux, fidélité, livraison et retours. Les sections de la
 * bibliothèque gardent des valeurs d'exemple (« Sac Demi-lune » à 129 €, −10 % / −15 %, fin de promotion dans 2 j 5 h) :
 * elles ne doivent jamais apparaître sur le site d'un client. Sans donnée réelle, l'option n'est pas affichée.
 * Gratuit, sans IA : mêmes données, même bloc.
 */
import { listProducts, type StudioProduct } from "../../products/catalog";
import { assetUrl } from "../../library";
import { companyOf } from "../activity";
import { decideBuyFeatures, deliveryFrom, freeShippingFrom, loadShopOffers, type BuyFeatures } from "../product-features";
import { galleryAssets } from "../../products/gallery-store";
import { repere } from "./tenue";
import { avisAchat, tenueVitrine, withAchatId, withAchatOptions, withTenueColoris, withTenueLooks, withTenueLots, withTenueSizes, withTenueAchatVrai, withTenueVersions, type TenueCadeau, type TenueColoris, type TenueLots, type TenueOption, type TenueAchatVrai } from "./tenue-data";

export type BuyData = {
  base: number;
  name: string;
  unit: string;
  cfg: Record<string, unknown>;
  features: BuyFeatures;
  /** Promotion : pourcentage et genre (limitée dans le temps, ou prix barré). */
  promo: { pct: number; limited: boolean } | null;
  subscription: { pct: number; weeks: number[] } | null;
  bundlePct: number | null;
  gifts: { at: number; label: string }[];
  /** Repères sous le bouton (livraison offerte, retours) : seulement ceux que le client a donnés. */
  reassurance: string[];
  /** Galerie de la fiche produit créée par SINA (adresses, dans l'ordre ; sa photo d'abord s'il la garde), ou null. */
  gallery?: string[] | null;
};

const COLOR_HEX: Record<string, string> = {
  noir: "#1b1b1b", blanc: "#f4f2ee", ecru: "#efe6d2", écru: "#efe6d2", crème: "#f1e8d6", creme: "#f1e8d6", beige: "#d9c7a7", sable: "#d8c4a6",
  gris: "#8f8f8f", anthracite: "#3a3a3a", marine: "#1f2a44", bleu: "#2f5aa8", ciel: "#9cc3e6", nuit: "#2e3b4e", vert: "#3f7d4e", sauge: "#a7b9a0",
  kaki: "#6b6a3a", olive: "#6f7445", rouge: "#b3262e", bordeaux: "#6d1f2c", rose: "#e8a7b5", corail: "#ef7f6a", orange: "#e8742c", terracotta: "#c58463",
  jaune: "#f2c94c", moutarde: "#d1a23a", camel: "#b98a5a", cognac: "#9a5a2e", marron: "#6b4423", chocolat: "#4b2e1f", violet: "#6c4ba0", lilas: "#c3a6d8",
  or: "#c9a54a", doré: "#c9a54a", argent: "#c0c0c0", argenté: "#c0c0c0", turquoise: "#3cb8b2",
};
const hexOf = (name: string) => COLOR_HEX[name.trim().toLowerCase().split(/\s+/)[0]] ?? "#bdb6ab";
const euros = (cents: number | null | undefined) => (cents == null ? null : Math.round(cents) / 100);
const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pctText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")}`;
const eurText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} €`;
const imageOf = (p: StudioProduct) => (p.data.images[0]?.assetId ? assetUrl({ id: p.data.images[0].assetId }) : null);

/** Mot d'unité du produit (« 2 pots », « 2 paires ») d'après son nom ; « article » sinon. */
export function unitOf(title: string): string {
  const t = title.toLowerCase();
  const found = [["pot", "pot"], ["confiture", "pot"], ["miel", "pot"], ["pâte à tartiner", "pot"], ["sachet", "sachet"], ["thé", "sachet"], ["infusion", "sachet"], ["flacon", "flacon"], ["bougie", "bougie"], ["boîte", "boîte"], ["coffret", "coffret"], ["bouteille", "bouteille"], ["paire", "paire"], ["baskets", "paire"], ["chaussure", "paire"], ["savon", "savon"], ["tube", "tube"], ["lot", "lot"]]
    .find(([k]) => new RegExp(`(?<!\\p{L})${k}s?(?!\\p{L})`, "u").test(t));
  return found ? found[1] : "article";
}

/** Données réelles du bloc d'achat pour un produit du projet (le premier, ou celui nommé). */
export function buyBlockData(projectId: string, productTitle?: string): BuyData | null {
  let products: StudioProduct[] = [];
  try { products = listProducts(projectId); } catch { return null; }
  if (!products.length) return null;
  const p = (productTitle && products.find((x) => x.data.title.trim().toLowerCase() === productTitle.trim().toLowerCase())) || products[0];
  const price = euros(p.data.price ?? p.variants.find((v) => v.price != null)?.price ?? null);
  if (price == null) return null; // sans prix réel, on n'affiche pas de bloc d'achat chiffré
  const company = companyOf(projectId) as { shipping?: string; returns?: string };
  const offers = loadShopOffers(projectId);
  const f = decideBuyFeatures(p, offers, { catalog: products.map((x) => x.data.title), freeShippingFrom: freeShippingFrom(company.shipping), shippingDelay: deliveryFrom(company.shipping) });
  const byTitle = (title: string) => products.find((x) => x.data.title.trim().toLowerCase() === title.trim().toLowerCase());
  const cfg: Record<string, unknown> = {};
  let base = price;
  let promo: BuyData["promo"] = null;
  if (f.promo?.kind === "limited") { promo = { pct: f.promo.pct, limited: true }; cfg.promoPct = f.promo.pct; cfg.promoEnd = f.promo.endsAt; }
  if (f.promo?.kind === "compareAt") {
    const cmp = euros(p.data.compareAt ?? p.variants.find((v) => v.compareAt != null)?.compareAt ?? null);
    // Prix barré : le bloc part du prix d'avant et applique la remise exacte (le total affiché est le vrai prix).
    if (cmp && cmp > price) { base = cmp; cfg.promoPct = (1 - price / cmp) * 100; promo = { pct: f.promo.pct, limited: false }; }
  }
  if (f.colors) cfg.colors = f.colors.values.map((v) => [v.name, hexOf(v.name), ...(v.image ? [assetUrl({ id: v.image })] : [])]);
  if (f.formats.length) cfg.sizes = f.formats[0].values;
  if (f.quantity?.kind === "lots") cfg.lots = f.quantity.tiers.map((t) => [t.qty, t.pct]);
  if (f.quantity?.kind === "bogo") cfg.bogo = [f.quantity.buy, f.quantity.free];
  if (f.subscription) cfg.subPct = f.subscription.pct;
  if (f.bundle) {
    cfg.bundle = f.bundle.products.map((t) => byTitle(t)).filter((x): x is StudioProduct => !!x && euros(x.data.price) != null).map((x) => [imageOf(x) ?? "", x.data.title, euros(x.data.price)]);
    cfg.bundlePct = f.bundle.pct;
  }
  if (f.range.length) {
    cfg.gamme = [p, ...f.range.map((t) => byTitle(t)).filter((x): x is StudioProduct => !!x)].filter((x) => euros(x.data.price) != null)
      .map((x) => [imageOf(x) ?? "", x.data.title, euros(x.data.price), x.data.productType || "", plain(x.data.description_html).slice(0, 220)]);
  }
  if (f.gifts.length) cfg.tiers = f.gifts.slice(0, 3).map((g) => [g.at, escText(g.label.toLowerCase()), escText(g.label)]);
  if (f.loyalty) cfg.loyalty = { per: f.loyalty.pointsPerEuro, reward: f.loyalty.rewardPoints, label: escText(f.loyalty.rewardLabel) };
  const free = freeShippingFrom(company.shipping);
  const days = /(\d{1,3})\s*jours?/.exec(company.returns ?? "")?.[1];
  const reassurance = [free ? `Livraison offerte dès ${eurText(free)}` : "", days ? `Retours sous ${days} jours` : ""].filter(Boolean);
  return {
    base, name: p.data.title, unit: unitOf(p.data.title) !== "article" ? unitOf(p.data.title) : unitOf(plain(p.data.description_html)), cfg, features: f, promo,
    subscription: f.subscription ? { pct: f.subscription.pct, weeks: f.subscription.weeks } : null,
    bundlePct: f.bundle ? f.bundle.pct : null, gifts: f.gifts.slice(0, 3), reassurance,
    gallery: (() => { const g = galleryAssets(projectId, p.id); if (!g) return null; const own = imageOf(p); return [...(g.keepOwn && own ? [own] : []), ...g.assets.map((id) => assetUrl({ id }))]; })(),
  };
}

/**
 * Pose les données réelles dans le HTML d'une section à bloc d'achat : attributs lus par le script du bloc, textes
 * d'exemple fixes (−15 %, « couleurs d'exemple », abonnement −10 %, rythmes, paliers, livraison et retours) remplacés
 * ou retirés. Sans données (aucun produit ni prix), le HTML est rendu tel quel.
 */
export function withRealBuyBlock(html: string, d: BuyData | null): string {
  if (!d || !/data-pvb/.test(html)) return html;
  let out = html.replace(/<div([^>]*?)\sdata-pvb([^>]*)>/, (_m, a: string, b: string) => {
    const keep = `${a} data-pvb${b}`.replace(/\s(?:data-base|data-name|data-unit|data-cfg)="[^"]*"/g, "");
    return `<div${keep} data-base="${d.base}" data-name="${escAttr(d.name)}" data-unit="${escAttr(d.unit)}" data-cfg="${escAttr(JSON.stringify(d.cfg))}">`;
  });
  // Promotion : vraie remise ; compte à rebours seulement pour une promotion limitée (sa vraie fin).
  out = out.replace(/<div class="po-promo" data-opt="promo">[\s\S]*?<\/div>/, d.promo
    ? d.promo.limited
      ? `<div class="po-promo" data-opt="promo"><span>−${pctText(d.promo.pct)} % : l'offre se termine dans</span><span class="po-cd" data-pocd></span></div>`
      : `<div class="po-promo" data-opt="promo"><span>Prix réduit : −${pctText(d.promo.pct)} %</span></div>`
    : `<div class="po-promo" data-opt="promo" hidden></div>`);
  out = out.replace(/<em>couleurs d'exemple<\/em>/g, "");
  out = out.replace(/(data-s="1">Abonnement)<small>−[\d,.]+ %<\/small>/, d.subscription ? `$1<small>−${pctText(d.subscription.pct)} %</small>` : "$1");
  if (d.subscription) out = out.replace(/<div class="po-fq" data-pofq>[\s\S]*?<\/div>/, `<div class="po-fq" data-pofq>${d.subscription.weeks.map((w, i) => `<button type="button" aria-pressed="${i === 0}" data-w="${w}">Toutes les ${w} sem.</button>`).join("")}</div>`);
  out = out.replace(/<em>−[\d,.]+ % avec les deux<\/em>/g, d.bundlePct ? `<em>−${pctText(d.bundlePct)} % avec tout le lot</em>` : "");
  // Paliers de cadeaux : repères posés aux vrais montants.
  out = out.replace(/(<div class="po-gl"><i><b data-pogb><\/b><\/i>)((?:<span data-at="[^"]*"[^>]*>[\s\S]*?<\/span>)+)/, (_m, head: string, spans: string) => {
    if (!d.gifts.length) return head;
    const icon = /<span data-at="[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(spans)?.[1] ?? "";
    const max = d.gifts[d.gifts.length - 1].at;
    return head + d.gifts.map((g) => `<span data-at="${g.at}" style="left:${Math.max(8, Math.min(96, Math.round((g.at / max) * 96)))}%" title="${escAttr(g.label)}">${icon}</span>`).join("");
  });
  // Sélecteur de mélanges du « Produit vedette » (`data-xflavs`) : la vraie gamme du client (nom, prix, photo), jamais les
  // six thés de la démonstration ; sans gamme, le sélecteur est retiré.
  const gamme = Array.isArray(d.cfg.gamme) ? (d.cfg.gamme as [string, string, number][]) : [];
  out = out.replace(/<div class="pnl p">\s*<div><div class="lab">([^<]*)<b data-xflav>[^<]*<\/b><\/div><div class="pl" data-xflavs>[\s\S]*?<\/div><\/div>\s*<\/div>/, (_m, lab: string) => gamme.length > 1
    ? `<div class="pnl p"><div><div class="lab">${lab}<b data-xflav>${escText(gamme[0][1])}</b></div><div class="pl" data-xflavs>${gamme.map(([img, title, price], i) =>
      `<button type="button" aria-pressed="${i === 0}" data-n="${escAttr(title)}" data-t="|${escAttr(title)}" data-p="${price}" data-img="${escAttr(img || "")}">${escText(title)}</button>`).join("")}</div></div></div>`
    : "");
  // Galerie de la fiche produit (décision du 10 novembre 2026) : chaque photo de la section reçoit, dans l'ordre, une
  // image de la galerie (une même photo répétée, grande vue et vignette, reçoit la même) ; dans la galerie principale
  // (data-xmain), les images en plus sont ajoutées. Les cartes de produits, ailleurs, gardent la photo du client.
  if (d.gallery?.length) {
    const g = d.gallery, map = new Map<string, string>();
    const pick = (src: string) => { if (!map.has(src)) map.set(src, g[map.size % g.length]); return map.get(src)!; };
    out = out.replace(/(\s(?:src|data-src)=")((?:\.\/)?photos\/[^"]+|\/api\/files\/[\w-]+)"/g, (_m, attr: string, src: string) => `${attr}${escAttr(pick(src))}"`);
    out = out.replace(/(<div[^>]*\sdata-xmain[^>]*>[\s\S]*?)(<\/div>)/, (_m, inner: string, end: string) => {
      const extra = g.slice(map.size).map((u) => `<img src="${escAttr(u)}" alt="${escAttr(d.name)}">`).join("");
      return inner + extra + end;
    });
  }
  // Repères sous le bouton : seulement les vrais (livraison offerte, retours) ; sinon rien.
  out = out.replace(/<div class="po-tr">[\s\S]*?<\/div>/, d.reassurance.length ? `<div class="po-tr">${d.reassurance.map((x) => `<span>${escText(x)}</span>`).join("")}</div>` : "");
  return out;
}

/**
 * Vraies données des pièces posées sous le bloc d'achat à tenue (thème unique, 16 novembre 2026) : les options du produit
 * de la page (couleurs, tailles, stock de chaque valeur) et l'offre par quantité du client. Sans produit : null.
 */
export function achatFacts(projectId: string, handle?: string | null): { title: string; handle: string; options: TenueOption[]; lots: TenueLots | null; image: string | null; price: string | null; soldOut: boolean; /** Les couleurs du produit qui ont la photo de leur version. */ coloris: TenueColoris[] } | null {
  const products = listProducts(projectId);
  if (!products.length) return null;
  const p = (handle && products.find((x) => x.handle === handle)) || products[0];
  // Une valeur n'a plus de stock quand aucune de ses variantes ne peut se commander.
  const out = (v: StudioProduct["variants"][number]) => v.stock !== null && v.stock <= 0 && v.stockPolicy !== "continue";
  const options: TenueOption[] = p.data.options.map((o, i) => ({
    name: o.name,
    values: o.values.map((label) => {
      const mine = p.variants.filter((v) => (v.options[i] ?? "").trim().toLowerCase() === label.trim().toLowerCase());
      return { label, soldOut: mine.length > 0 && mine.every(out), teinte: /couleur|coloris|teinte|colou?r/i.test(o.name) ? hexOf(label) : null };
    }),
  }));
  const cents = p.data.price ?? p.variants.find((v) => v.price != null)?.price ?? null;
  let lots: TenueLots | null = null;
  if (cents != null) {
    const q = (() => { try { return decideBuyFeatures(p, loadShopOffers(projectId), { catalog: products.map((x) => x.data.title), freeShippingFrom: null, shippingDelay: null }).quantity; } catch { return null; } })();
    const unit = unitOf(p.data.title) !== "article" ? unitOf(p.data.title) : unitOf(plain(p.data.description_html));
    if (q?.kind === "lots") lots = { unit, cents, tiers: q.tiers.map((t) => ({ qty: t.qty, pct: t.pct })) };
    if (q?.kind === "bogo") lots = { unit, cents, tiers: [{ qty: q.buy, free: q.free }] };
  }
  const price = cents == null ? null : `${(Math.round(cents) / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",")} €`;
  // Les coloris en scène : chaque couleur avec la photo d'une de ses versions (champ « image » de la variante) ; sans photo, pas montrée.
  const ci = p.data.options.findIndex((o) => /couleur|coloris|teinte|colou?r/i.test(o.name));
  const coloris: TenueColoris[] = ci < 0 ? [] : p.data.options[ci].values.flatMap((nom) => {
    const image = p.variants.find((v) => (v.options[ci] ?? "").trim().toLowerCase() === nom.trim().toLowerCase() && v.image)?.image;
    return image ? [{ nom, teinte: hexOf(nom), image: assetUrl({ id: image }) }] : [];
  });
  return { title: p.data.title, handle: p.handle, options, lots, image: imageOf(p), price, soldOut: p.variants.length > 0 && p.variants.every(out), coloris };
}

/**
 * Pose ces données dans les pièces de la fiche produit qui les lisent : pastilles de version, guide des tailles, offres
 * par quantité ; et retire du « look complet » le produit de la page (il ne se propose pas à lui-même). Une section qui
 * ne porte aucun de ces repères est rendue telle quelle, sans lire le catalogue.
 */
export function withTenueAchat(html: string, projectId: string, handle?: string | null, o: { /** La page n'a pas la pièce des pastilles : le bloc d'achat porte lui-même le vrai choix. */ selecteur?: boolean; /** Photo créée pour le bloc d'achat de chaque fiche (repère du produit → adresse) : elle sert quand le produit n'a aucune photo au catalogue. */ fiches?: Map<string, string> } = {}): string {
  if (!/\sdata-tn-(?:versions|guide-tailles|lots|looks|appel-produit|achat|packs|sous-bouton|offre-moment|fenetre-offre|rappel-achat|coloris)\b/.test(html)) return html;
  const f = (() => { try { return achatFacts(projectId, handle); } catch { return null; } })();
  // Sans produit : ni offre, ni fenêtre, ni coloris (une pièce qui ne montrerait que son exemple ne se pose pas).
  if (!f) return /\sdata-tn-(?:offre-moment|fenetre-offre|coloris)\b/.test(html) ? "" : html;
  // Le vrai choix du catalogue dans le bloc d'achat : jamais une phrase d'option écrite à sa place.
  let out = withTenueLots(withTenueSizes(withTenueVersions(withAchatOptions(withAchatId(html), f.options, o), f.options), f.options), f.lots);
  // Les coloris en scène : seulement avec au moins deux couleurs qui ont leur photo.
  out = withTenueColoris(out, f.coloris);
  if (!out) return out;
  // Achat, suite : table des versions, prix barré, packs, dessous du bouton, offre datée, fenêtre d'offre.
  const v = (() => { try { return venteFacts(projectId, handle); } catch { return null; } })();
  if (v) out = withTenueAchatVrai(out, v);
  // Sans les faits de vente (catalogue illisible) : ni offre datée ni fenêtre d'offre, elles ne montreraient que leur exemple.
  else if (/\sdata-tn-(?:offre-moment|fenetre-offre)\b/.test(out)) return "";
  // Rappel vers l'achat : le vrai nom, le vrai prix (un prix inconnu ne s'écrit pas) ; avec des packs, le bouton le dit.
  if (/\sdata-tn-rappel-achat\b/.test(out)) {
    out = out.replace(/(<b class="tn-ra-nom">)[\s\S]*?(<\/b>)/, `$1${escText(f.title)}$2`).replace(/<span class="tn-ra-prix">[\s\S]*?<\/span>/, f.price ? `<span class="tn-ra-prix">${f.price}</span>` : "");
    if (v?.packs.length) out = out.replace(/>Choisir le mien<\/a>/, ">Choisir mon pack</a>");
  }
  if (!out) return out;
  // « Le produit, son prix, son bouton » : la vraie photo, le vrai nom, le vrai prix, le stock, la livraison et les retours du client.
  if (/\sdata-tn-appel-produit\b/.test(out)) {
    const co = (() => { try { return companyOf(projectId) as { shipping?: string; returns?: string }; } catch { return {}; } })() as { shipping?: string; returns?: string };
    // Sa vraie photo ; sans photo au catalogue, la scène créée pour cette pièce reste, et une photo d'exemple laisse la place à celle de sa fiche.
    const image = f.image ?? (/<div class="tn-ph" style="background-image:url\(\/api\/files\//.test(out) ? null : o.fiches?.get(f.handle) ?? (!handle ? o.fiches?.get("") : null) ?? null);
    if (image) out = out.replace(/(<div class="tn-ph")[^>]*(><\/div>)/, `$1 style="background-image:url(${escAttr(image)})"$2`);
    out = out.replace(/(<b class="tn-nom-a">)[\s\S]*?(<\/b>)/, `$1${escText(f.title)}$2`)
      .replace(/<ul class="tn-reperes">[\s\S]*?<\/ul>/, `<ul class="tn-reperes"><li>${escText(repere("Livraison", co.shipping))}</li><li>${escText(repere("Retours", co.returns))}</li></ul>`);
    if (f.price) out = out.replace(/<div class="tn-prix">[\s\S]*?<\/div>/, `<div class="tn-prix">${f.price}</div>${f.soldOut ? '<div class="tn-rupture">Épuisé pour l\'instant.</div>' : ""}`);
    if (f.soldOut) out = out.replace(/<a class="tn-bt"/, '<a class="tn-bt tn-off" aria-disabled="true"');
    out = out.replace(/\[À compléter(?:\s*:\s*([^\]<]{1,80}))?\]/g, (_m, what: string | undefined) => `<mark class="tn-manque">À compléter${what ? ` : ${what.trim()}` : ""}</mark>`);
  }
  // Le look : la carte du produit de la page s'en va quand il en reste au moins une autre.
  if (/\sdata-tn-looks\b/.test(out)) {
    const cards = out.match(/<a class="tn-carte-p[^"]*"[^>]*>[\s\S]*?<\/a>/g) ?? [];
    const own = cards.find((c) => (/<b>([\s\S]*?)<\/b>/.exec(c)?.[1] ?? "").replace(/&amp;/g, "&").trim().toLowerCase() === f.title.trim().toLowerCase());
    if (own && cards.length > 1) out = out.replace(own, "");
    // Trois pièces au plus dans un look.
    const left = cards.filter((c) => c !== own || cards.length <= 1);
    for (const extra of left.slice(3)) out = out.replace(extra, "");
  }
  return out;
}

/**
 * Les vraies données de la fiche « vente directe » pour le produit de la page : versions (identifiant, options, stock
 * seulement s'il est suivi, prix et prix de comparaison du catalogue), packs, seuil, quantité de départ, délai, promotion
 * datée et fenêtre d'offre saisis par le client (shop.offers). Rien n'est déduit : ce qui n'est pas donné reste absent.
 */
export function venteFacts(projectId: string, handle?: string | null, now = Date.now()): TenueAchatVrai | null {
  const products = listProducts(projectId);
  if (!products.length) return null;
  const p = (handle && products.find((x) => x.handle === handle)) || products[0];
  const o = loadShopOffers(projectId);
  const co = (() => { try { return companyOf(projectId) as { shipping?: string; returns?: string }; } catch { return {}; } })() as { shipping?: string; returns?: string };
  const versions = p.variants.map((x) => {
    const prix = x.price ?? p.data.price ?? null;
    if (prix == null) return null;
    const suivi = x.stock !== null && x.stock !== undefined, compare = x.compareAt ?? p.data.compareAt ?? null;
    return { id: x.id, options: (x.options ?? []).map(String), disponible: !(suivi && x.stock! <= 0 && x.stockPolicy !== "continue"), ...(suivi ? { stock: x.stock! } : {}), prix, ...(compare && compare > prix ? { compare } : {}) };
  }).filter((x): x is NonNullable<typeof x> => !!x);
  if (!versions.length) return null;
  const cadeau = (h: string | undefined): TenueCadeau | null => {
    const g = h ? products.find((x) => x.handle === h || x.data.title.trim().toLowerCase() === h.trim().toLowerCase()) : null;
    return g && g.variants[0] ? { id: g.variants[0].id, titre: g.data.title, image: imageOf(g) } : null;
  };
  const prix = (versions.find((x) => x.disponible) ?? versions[0]).prix;
  return {
    titre: p.data.title, noms: p.data.options.map((x) => x.name), versions,
    packs: o.packs.map((k) => ({ quantite: k.quantite, nom: k.nom, prix: k.prixCentimes ?? Math.round(prix * k.quantite * (1 - (k.remisePct ?? 0) / 100)), populaire: !!k.populaire, cadeau: cadeau(k.cadeauHandle) })),
    seuilStock: o.seuilStock, stockDepart: o.stockDepart, delai: o.delaiLivraison,
    promo: o.promo && o.promo.endsAt > now ? { nom: o.promo.nom ?? null, pct: o.promo.pct, fin: o.promo.endsAt, cadeau: cadeau(o.promo.cadeauHandle) } : null,
    // Moyens de paiement : le Studio n'a aucune source remplie par le client (ni fiche de l'entreprise, ni réglage) : vide, jamais un logo présumé.
    fenetre: o.fenetreOffre, paiements: [], livraison: co.shipping?.trim() || null, retours: co.returns?.trim() || null,
    // Avis : lus là où le module « vente » les range (TenueVitrine.avis) ; tant qu'il n'y a pas de source, rien.
    avis: (() => { try { return avisAchat(tenueVitrine(projectId).avis, p.data.title); } catch { return null; } })(),
  };
}
