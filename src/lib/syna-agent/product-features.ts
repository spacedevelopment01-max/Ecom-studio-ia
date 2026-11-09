/**
 * Fonctions du bloc d'achat des sections « Produit vedette » (consigne du propriétaire du 8 novembre 2026) : SINA les
 * active ou les retire d'elle-même, produit par produit, d'après la fiche du produit (options, variantes, prix barré)
 * et les offres que le client a saisies. Rien n'est affiché pour une option que le produit n'a pas ; aucune offre
 * n'est inventée. Décision gratuite et sans IA : la même fiche donne toujours le même bloc. La livraison estimée, les
 * points de fidélité et le choix entre les produits de la gamme sont des FONCTIONS de ce bloc, jamais des sections à part.
 */
import { z } from "zod";
import { all, json, run } from "../db";
import { listProducts, type StudioProduct } from "../products/catalog";

/** Offres de la boutique, saisies par le client (jamais devinées). */
export const shopOffersSchema = z.object({
  /** Offre sur la quantité : lots dégressifs (2 à −10 %, 3 à −15 %…) ou « N achetés, M offerts ». */
  quantity: z.union([
    z.object({ kind: z.literal("lots"), tiers: z.array(z.object({ qty: z.number().int().min(2).max(20), pct: z.number().min(1).max(80) })).min(1).max(5) }),
    z.object({ kind: z.literal("bogo"), buy: z.number().int().min(1).max(10), free: z.number().int().min(1).max(5) }),
  ]).nullable().default(null),
  /** Abonnement : remise et rythmes proposés (en semaines). Demande une application d'abonnement sur la boutique. */
  subscription: z.object({ pct: z.number().min(0).max(80), weeks: z.array(z.number().int().min(1).max(26)).min(1).max(4) }).nullable().default(null),
  /** Lot à compléter : produits du catalogue proposés avec le produit, remise si tout est pris. */
  bundle: z.object({ products: z.array(z.string().min(1).max(160)).min(1).max(3), pct: z.number().min(0).max(80) }).nullable().default(null),
  /** Cadeaux par paliers de panier (en euros). La livraison offerte s'y ajoute d'elle-même si elle est connue. */
  gifts: z.array(z.object({ at: z.number().min(1).max(10_000), label: z.string().min(2).max(80) })).max(4).default([]),
  /** Promotion limitée dans le temps (fin réelle, sinon aucune promotion affichée). */
  promo: z.object({ pct: z.number().min(1).max(80), endsAt: z.number().int() }).nullable().default(null),
  /** Délai de livraison réel (jours ouvrés) et heure limite de commande du jour. Sinon lu dans la réponse « Livraison ». */
  delivery: z.object({ minDays: z.number().int().min(0).max(60), maxDays: z.number().int().min(0).max(90), cutoffHour: z.number().int().min(0).max(23).nullable().default(null) })
    .refine((d) => d.maxDays >= d.minDays, "maxDays doit être au moins minDays").nullable().default(null),
  /** Programme de fidélité réel : points gagnés par euro et récompense. */
  loyalty: z.object({ pointsPerEuro: z.number().min(0.1).max(100), rewardPoints: z.number().int().min(1).max(100_000), rewardLabel: z.string().min(2).max(80) }).nullable().default(null),
  /** Choix entre les produits de la gamme dans le bloc (si le catalogue en a au moins deux). Le client peut le refuser. */
  range: z.boolean().default(true),
}).strict();
export type ShopOffers = z.infer<typeof shopOffersSchema>;
export const NO_OFFERS: ShopOffers = shopOffersSchema.parse({});

export function loadShopOffers(projectId: string): ShopOffers {
  const row = all<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id=?", projectId)[0];
  const raw = row ? (json<Record<string, unknown>>(row.settings_json, {}) as any).offers : null;
  const r = shopOffersSchema.safeParse(raw ?? {});
  return r.success ? r.data : NO_OFFERS;
}

export function saveShopOffers(projectId: string, offers: Partial<ShopOffers>): ShopOffers {
  const next = shopOffersSchema.parse({ ...loadShopOffers(projectId), ...offers });
  const row = all<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id=?", projectId)[0];
  if (!row) throw new Error("Projet introuvable.");
  run("UPDATE projects SET settings_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...json<Record<string, unknown>>(row.settings_json, {}), offers: next }), Date.now(), projectId);
  return next;
}

/** Montant de la livraison offerte lu dans la réponse du client (« offerte dès 35 € »), sinon null. */
export function freeShippingFrom(shipping: string | undefined | null): number | null {
  const m = (shipping ?? "").match(/(?:offert|gratuit)e?s?\b[^0-9]{0,30}?(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:€|euros?)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

/** Délai de livraison lu dans la réponse du client (« 2 à 3 jours », « 48 à 72 h », « sous 24 h »), sinon null. */
export function deliveryFrom(shipping: string | undefined | null): { minDays: number; maxDays: number } | null {
  const t = (shipping ?? "").toLowerCase();
  const toDays = (n: number, unit: string) => (/^h/.test(unit) ? Math.max(1, Math.ceil(n / 24)) : n);
  const r = t.match(/(\d{1,3})\s*(?:h|heures?|j|jours?)?\s*(?:à|a|-|–)\s*(\d{1,3})\s*(h|heures?|j\b|jours?)/);
  if (r) { const a = toDays(Number(r[1]), r[3]), b = toDays(Number(r[2]), r[3]); return b >= a ? { minDays: a, maxDays: b } : null; }
  const one = t.match(/(?:sous|en)\s*(\d{1,3})\s*(h|heures?|j\b|jours?)/);
  if (one) { const d = toDays(Number(one[1]), one[2]); return { minDays: d, maxDays: d }; }
  return null;
}

export type BuyFeatures = {
  colors: { option: string; values: { name: string; image: string | null }[] } | null;
  formats: { option: string; values: string[] }[];
  promo: { kind: "compareAt"; pct: number } | { kind: "limited"; pct: number; endsAt: number } | null;
  quantity: ShopOffers["quantity"];
  subscription: ShopOffers["subscription"];
  bundle: { products: string[]; pct: number } | null;
  gifts: { at: number; label: string }[];
  /** Autres produits de la gamme proposés dans le bloc (choisir l'un change la photo, le nom et le prix). */
  range: string[];
  /** Livraison estimée (date calculée chaque jour d'après ce délai réel). */
  delivery: { minDays: number; maxDays: number; cutoffHour: number | null } | null;
  /** Points de fidélité gagnés avec l'achat. */
  loyalty: ShopOffers["loyalty"];
  /** Fonctions retirées et pourquoi (pour le compte rendu au client). */
  hidden: string[];
};

const COLOR = /^(couleurs?|coloris|teintes?|colou?rs?)$/i;

/** Décide le bloc d'achat d'un produit. Pur : mêmes données, même résultat. */
export function decideBuyFeatures(p: Pick<StudioProduct, "data" | "variants">, offers: ShopOffers, o: { catalog?: string[]; freeShippingFrom?: number | null; shippingDelay?: { minDays: number; maxDays: number } | null; now?: number } = {}): BuyFeatures {
  const now = o.now ?? Date.now();
  const hidden: string[] = [];
  const opts = (p.data.options ?? []).map((x, i) => ({ ...x, i })).filter((x) => x.values.length >= 2);
  const c = opts.find((x) => COLOR.test(x.name.trim()));
  const colors = c ? { option: c.name, values: c.values.map((v) => ({ name: v, image: p.variants.find((vr) => vr.options[c.i] === v && vr.image)?.image ?? null })) } : null;
  if (!colors) hidden.push("couleurs : le produit n'a pas plusieurs couleurs");
  const formats = opts.filter((x) => x !== c).map((x) => ({ option: x.name, values: x.values }));
  if (!formats.length) hidden.push("formats : une seule version du produit");

  const price = p.data.price ?? p.variants.find((v) => v.price != null)?.price ?? null;
  const cmp = p.data.compareAt ?? p.variants.find((v) => v.compareAt != null)?.compareAt ?? null;
  let promo: BuyFeatures["promo"] = null;
  if (offers.promo && offers.promo.endsAt > now) promo = { kind: "limited", pct: offers.promo.pct, endsAt: offers.promo.endsAt };
  else if (price != null && cmp != null && cmp > price) promo = { kind: "compareAt", pct: Math.round((1 - price / cmp) * 100) };
  else hidden.push(offers.promo ? "promotion : terminée" : "promotion : aucune saisie");

  const quantity = offers.quantity ?? null;
  if (!quantity) hidden.push("offre sur la quantité : aucune saisie");
  const subscription = offers.subscription ?? null;
  if (!subscription) hidden.push("abonnement : non proposé");

  let bundle: BuyFeatures["bundle"] = null;
  if (offers.bundle) {
    const known = new Set((o.catalog ?? []).map((x) => x.trim().toLowerCase()));
    const self = p.data.title.trim().toLowerCase();
    const items = offers.bundle.products.filter((x) => x.trim().toLowerCase() !== self && (!o.catalog || known.has(x.trim().toLowerCase())));
    if (items.length) bundle = { products: items, pct: offers.bundle.pct };
    else hidden.push("lot à compléter : aucun produit du lot dans le catalogue");
  } else hidden.push("lot à compléter : aucun saisi");

  const gifts = [...offers.gifts];
  if (o.freeShippingFrom && !gifts.some((g) => /livraison/i.test(g.label))) gifts.push({ at: o.freeShippingFrom, label: "Livraison offerte" });
  gifts.sort((a, b) => a.at - b.at);
  if (!gifts.length) hidden.push("cadeaux par paliers : aucun palier connu");

  const self = p.data.title.trim().toLowerCase();
  const range = offers.range ? [...new Set((o.catalog ?? []).map((x) => x.trim()).filter((x) => x && x.toLowerCase() !== self))].slice(0, 8) : [];
  if (!range.length) hidden.push(offers.range ? "choix dans la gamme : un seul produit au catalogue" : "choix dans la gamme : refusé par le client");
  const d = offers.delivery ?? o.shippingDelay ?? null;
  const delivery = d ? { minDays: d.minDays, maxDays: d.maxDays, cutoffHour: offers.delivery?.cutoffHour ?? null } : null;
  if (!delivery) hidden.push("livraison estimée : délai de livraison inconnu");
  const loyalty = offers.loyalty ?? null;
  if (!loyalty) hidden.push("points de fidélité : aucun programme de fidélité");
  return { colors, formats, promo, quantity, subscription, bundle, gifts, range, delivery, loyalty, hidden };
}

const eur = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} €`;

/** Consigne du bloc d'achat pour la page d'un produit (maquette en code), et textes permis au contrôle. */
export function buyBlockBrief(f: BuyFeatures): { lines: string[]; allowed: string[] } {
  const lines: string[] = [], allowed: string[] = [];
  if (f.colors) { lines.push(`- Choix de la couleur (« ${f.colors.option} ») en pastilles rondes : ${f.colors.values.map((v) => v.name).join(", ")} ; la couleur choisie s'écrit à côté du libellé${f.colors.values.some((v) => v.image) ? " et change la grande photo" : ""}.`); allowed.push(f.colors.option, ...f.colors.values.map((v) => v.name)); }
  for (const x of f.formats) { lines.push(`- Choix « ${x.option} » en boutons : ${x.values.join(", ")}.`); allowed.push(x.option, ...x.values); }
  if (f.promo?.kind === "limited") { lines.push(`- Promotion limitée −${f.promo.pct} % avec son compte à rebours (fin réelle) ; prix barré et économie affichés.`); allowed.push(`−${f.promo.pct} %`); }
  if (f.promo?.kind === "compareAt") { lines.push(`- Prix barré et économie (−${f.promo.pct} %).`); allowed.push(`−${f.promo.pct} %`); }
  if (f.quantity?.kind === "lots") { lines.push(`- Choix de la quantité en cartes : 1 ${f.quantity.tiers.map((t) => `· ${t.qty} (−${t.pct} %)`).join(" ")} ; l'économie s'affiche.`); allowed.push(...f.quantity.tiers.map((t) => `−${t.pct} %`)); }
  if (f.quantity?.kind === "bogo") { lines.push(`- Offre « ${f.quantity.buy} achetés, ${f.quantity.free} offert${f.quantity.free > 1 ? "s" : ""} » : choix de la quantité en cartes, l'article offert est signalé.`); allowed.push(`${f.quantity.buy} + ${f.quantity.free} offert`); }
  if (f.subscription) { lines.push(`- Interrupteur « Achat unique / Abonnement −${f.subscription.pct} % », rythmes : ${f.subscription.weeks.map((w) => `toutes les ${w} semaines`).join(", ")}.`); allowed.push("Achat unique", "Abonnement", `−${f.subscription.pct} %`); }
  if (f.bundle) { lines.push(`- « Complète ton lot » : ${f.bundle.products.join(", ")}, à cocher ; −${f.bundle.pct} % si tout est pris.`); allowed.push(...f.bundle.products, `−${f.bundle.pct} %`); }
  if (f.range.length) { lines.push(`- Choix dans la gamme, en pastilles avec la photo de chaque produit : ce produit, puis ${f.range.join(", ")} ; choisir un produit change la photo, le nom, la description et le prix de la section (sauf si la section a déjà son propre choix de produit).`); allowed.push(...f.range); }
  if (f.gifts.length) { lines.push(`- Jauge des cadeaux par paliers : ${f.gifts.map((g) => `${g.label} dès ${eur(g.at)}`).join(", ")} ; le message dit ce qu'il manque.`); allowed.push(...f.gifts.map((g) => g.label)); }
  if (f.delivery) {
    const span = f.delivery.minDays === f.delivery.maxDays ? `${f.delivery.minDays} jour${f.delivery.minDays > 1 ? "s" : ""} ouvré${f.delivery.minDays > 1 ? "s" : ""}` : `${f.delivery.minDays} à ${f.delivery.maxDays} jours ouvrés`;
    lines.push(`- Sous le bouton, la livraison estimée : « Reçois-le entre le [date] et le [date] », dates calculées chaque jour d'après le délai réel (${span}${f.delivery.cutoffHour != null ? `, commande avant ${f.delivery.cutoffHour} h` : ""}).`);
    allowed.push("Reçois-le");
  }
  if (f.loyalty) { lines.push(`- Sous le bouton, les points de fidélité : « Tu gagnes N points » (${f.loyalty.pointsPerEuro} point${f.loyalty.pointsPerEuro > 1 ? "s" : ""} par euro ; ${f.loyalty.rewardPoints} points = ${f.loyalty.rewardLabel}), le nombre suit le total.`); allowed.push("Tu gagnes", f.loyalty.rewardLabel); }
  if (!lines.length) return { lines: [], allowed };
  return {
    lines: [
      "BLOC D'ACHAT DE CE PRODUIT (décidé d'après sa fiche et les offres du client ; une seule section « Produit vedette », tout en haut de la fiche) :",
      ...lines,
      "- N'affiche AUCUNE autre option ni offre que celles-ci (pas de couleur, d'abonnement, de lot, de cadeau, de délai ni de points qui ne sont pas listés). Ces fonctions restent DANS le bloc d'achat : jamais une section à part.",
    ],
    allowed,
  };
}

/** Bloc d'achat de chaque produit du catalogue du projet. */
export function projectBuyFeatures(projectId: string, shipping?: string | null): { product: string; features: BuyFeatures }[] {
  const offers = loadShopOffers(projectId);
  let products: StudioProduct[] = [];
  try { products = listProducts(projectId); } catch { return []; }
  const catalog = products.map((x) => x.data.title);
  return products.map((x) => ({ product: x.data.title, features: decideBuyFeatures(x, offers, { catalog, freeShippingFrom: freeShippingFrom(shipping), shippingDelay: deliveryFrom(shipping) }) }));
}
