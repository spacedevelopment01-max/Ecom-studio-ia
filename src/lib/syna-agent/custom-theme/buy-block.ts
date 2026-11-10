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
  // Repères sous le bouton : seulement les vrais (livraison offerte, retours) ; sinon rien.
  out = out.replace(/<div class="po-tr">[\s\S]*?<\/div>/, d.reassurance.length ? `<div class="po-tr">${d.reassurance.map((x) => `<span>${escText(x)}</span>`).join("")}</div>` : "");
  return out;
}
