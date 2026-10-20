/** Offres commerciales du même ThemeSpec que l'éditeur. Calcul serveur de l'aperçu, jamais prix transmis par le navigateur. */
import type { SectionInstance, StoreProduct, ThemeSpec } from "./spec";
import { storeProducts } from "./store-products";

export type OfferLine = { variantId: number; quantity: number; offerGroup?: string; offerTarget?: string; offerId?: string; gift?: boolean; variantIdentity?: string; finalLinePrice?: number };
export type Offer = { id: string; quantity: number; discount: number; totalPrice?: number; label: string; recommended: boolean };
export type Gift = { target: string; sku: string; threshold: number; quantity: number };
const integer = (n: unknown, min: number, max: number) => Number.isSafeInteger(Number(n)) && Number(n) >= min && Number(n) <= max;
export function purchaseConfig(section: SectionInstance) {
  const blocks = (section.block_order ?? Object.keys(section.blocks ?? {})).filter((id) => section.blocks?.[id]).map((id) => ({ id, ...section.blocks![id] })).filter((b) => b.type && !b.disabled);
  return {
    offers: blocks.filter((b) => b.type === "quantity_offer" && integer(b.settings.quantity, 1, 20) && integer(b.settings.discount ?? 0, 0, 100)).map((b): Offer => ({ id: b.id, quantity: Number(b.settings.quantity), discount: Number(b.settings.discount ?? 0), ...(b.settings.price_mode === "fixed_total" ? { totalPrice: integer(b.settings.total_price, 0, 100000000) ? Number(b.settings.total_price) : NaN } : {}), label: String(b.settings.title ?? ""), recommended: b.settings.recommended === true })),
    gifts: blocks.filter((b) => b.type === "threshold_gift" && b.settings.gift_target && integer(b.settings.threshold, 1, 20) && integer(b.settings.quantity, 1, 20)).map((b): Gift => ({ target: String(b.settings.gift_target), sku: String(b.settings.sku ?? ""), threshold: Number(b.settings.threshold), quantity: Number(b.settings.quantity) })),
  };
}
/** Une présentation réutilisée lit les mêmes blocs que la fiche ; aucune deuxième règle tarifaire. */
export function sharedPurchaseSection(spec: ThemeSpec, section: SectionInstance): SectionInstance {
 if(!["purchase-offers","featured-purchase"].includes(section.type) || !section.settings.purchase_source)return section;
 const parts=String(section.settings.purchase_source).split(":");
 const source=parts.length===2?spec.templates[parts[0]]?.sections[parts[1]]:undefined;
 if(!source || source.type!=="main-product" || source.settings.product_target!==section.settings.product_target) return {...section,settings:{...section.settings,purchase_enabled:false},blocks:{},block_order:[]};
 return {...section,settings:{...source.settings,...section.settings,purchase_enabled:section.settings.purchase_enabled===true&&source.settings.purchase_enabled===true&&!source.disabled},blocks:structuredClone(source.blocks),block_order:source.block_order?.slice()};
}
export function productOfferSection(spec: ThemeSpec, product: StoreProduct) {
  const ownKey = product.template_suffix ? `product.${product.template_suffix}` : "product";
  const candidates = Object.entries(spec.templates).flatMap(([key, template]) => (template.order ?? []).map((id) => ({ id, key, section: template.sections[id] }))).filter(({ key, section: s }) => s && !s.disabled && !s.settings.purchase_source && s.settings.purchase_enabled === true && ["main-product", "purchase-offers", "featured-purchase"].includes(s.type) && (s.settings.product_target ? s.settings.product_target === product.contentTarget : key === ownKey));
  // Deux configurations concurrentes ne deviennent jamais une règle commerciale devinée.
  return candidates.length === 1 ? candidates[0] : null;
}
/** Correspondances uniques uniquement : un nom ou une position ne remplace jamais une identité. */
export function purchaseTargetHandles(spec: ThemeSpec) {
 const products=storeProducts(spec), out:Record<string,string>={};
 for(const p of products) if(p.contentTarget && products.filter((x)=>x.contentTarget===p.contentTarget).length===1)out[p.contentTarget]=p.handle;
 return out;
}
export function offerVariants(spec: ThemeSpec) {
  return storeProducts(spec).flatMap((p, pi) => (p.variants.length ? p.variants : [{ title: "Default Title", price: p.price, available: true, options: [] }]).map((v, vi) => ({ id: 1000 * (pi + 1) + vi, product: p, variant: v, price: v.price ?? p.price, stock: v.inventory_quantity })));
}
export const offerVariantIdentity = (v: StoreProduct["variants"][number]) => v.sku ? `sku:${v.sku}` : `options:${JSON.stringify(v.options)}`;
function available(hit: ReturnType<typeof offerVariants>[number], quantity: number) {
  return inStock(hit, quantity) && hit.price !== null;
}
function inStock(hit: ReturnType<typeof offerVariants>[number], quantity: number) {
  return hit.variant.available && integer(quantity, 1, 99) && (hit.stock === undefined || hit.stock >= quantity);
}
/** Les identités sont relues avant une mutation, y compris après changement d'ordre du catalogue. */
export function rebindOfferLines(spec: ThemeSpec, input: OfferLine[]): OfferLine[] {
  const variants = offerVariants(spec);
  return input.map((l) => {
    if (l.gift || !l.offerGroup || !l.variantIdentity) return l;
    const matches = variants.filter((v) => v.product.contentTarget === l.offerTarget && offerVariantIdentity(v.variant) === l.variantIdentity);
    if (matches.length !== 1) throw new Error("Identité de variante ambiguë ou retirée.");
    return { ...l, variantId: matches[0].id };
  });
}
/** Reconstitue cadeaux et remises après TOUT changement. Les cadeaux du navigateur sont ignorés. */
export function reconcileOfferCart(spec: ThemeSpec, input: OfferLine[]): OfferLine[] {
  const variants = offerVariants(spec), table = new Map(variants.map((v) => [v.id, v]));
  input = rebindOfferLines(spec, input);
  const lines: OfferLine[] = input.filter((l) => !l.gift && integer(l.quantity, 1, 99) && table.has(l.variantId)).map((l) => ({ ...l, finalLinePrice: undefined }));
  const totals = new Map<number, number>();
  for (const l of lines) totals.set(l.variantId, (totals.get(l.variantId) ?? 0) + l.quantity);
  for (const [id, quantity] of totals) {
    const hit = table.get(id)!;
    // Produit sans prix (« Prix à définir ») : rien n'est vendu, et le message le dit plutôt qu'un faux manque de stock.
    if (inStock(hit, quantity) && hit.price === null) throw new Error("Prix à définir : ce produit ne peut pas encore être ajouté au panier.");
    if (!available(hit, quantity)) throw new Error("Variante indisponible ou stock insuffisant.");
  }
  for (const group of new Set(lines.map((l) => l.offerGroup).filter(Boolean))) {
    const groupLines = lines.filter((l) => l.offerGroup === group), p = table.get(groupLines[0].variantId)!.product;
    if (!p.contentTarget || groupLines.some((l) => table.get(l.variantId)!.product.contentTarget !== p.contentTarget || l.offerTarget !== p.contentTarget)) throw new Error("Association du lot invalide.");
    const section = productOfferSection(spec, p)?.section;
    if (!section) throw new Error("Offre non disponible.");
    const config = purchaseConfig(section), count = groupLines.reduce((n, l) => n + l.quantity, 0);
    const exact = config.offers.find((o) => o.id === groupLines[0].offerId && o.quantity === count);
    const candidates = config.offers.filter((o) => o.quantity === count);
    const offer = exact ?? (candidates.length === 1 ? candidates[0] : undefined);
    for (const l of groupLines) l.offerId = offer?.id;
    const base = groupLines.reduce((n, l) => n + table.get(l.variantId)!.price! * l.quantity, 0);
    const total = offer?.totalPrice ?? Math.round(base * (100 - (offer?.discount ?? 0)) / 100);
    if (!Number.isSafeInteger(total) || total < 0) throw new Error("Prix du lot à renseigner.");
    let allocated = 0;
    groupLines.forEach((l, i) => { l.finalLinePrice = i === groupLines.length - 1 ? total - allocated : Math.floor(base ? total * table.get(l.variantId)!.price! * l.quantity / base : total / groupLines.length); allocated += l.finalLinePrice; });
    for (const gift of config.gifts.filter((g) => count >= g.threshold)) {
      const choices = variants.filter((v) => v.product.contentTarget === gift.target && (!gift.sku || v.variant.sku === gift.sku));
      if (new Set(choices.map((v) => v.product)).size !== 1) continue;
      const hit = gift.sku ? (choices.length === 1 ? choices[0] : undefined) : choices.find((v) => inStock(v, (totals.get(v.id) ?? 0) + gift.quantity));
      if (!hit || !inStock(hit, (totals.get(hit.id) ?? 0) + gift.quantity)) continue;
      totals.set(hit.id, (totals.get(hit.id) ?? 0) + gift.quantity);
      const existing = lines.find((l) => l.gift && l.variantId === hit.id && l.offerGroup === group);
      if (existing) existing.quantity += gift.quantity;
      else lines.push({ variantId: hit.id, quantity: gift.quantity, gift: true, offerGroup: group, offerTarget: p.contentTarget, finalLinePrice: 0 });
    }
  }
  for (const l of lines) l.finalLinePrice ??= table.get(l.variantId)!.price! * l.quantity;
  return lines;
}
/** Ajout atomique : ne remplace le lot précédent qu'après validation complète. */
export function addOfferToCart(spec: ThemeSpec, cart: OfferLine[], request: { target: string; offer: string; variants: number[] }): OfferLine[] {
  const products = storeProducts(spec).filter((p) => p.contentTarget === request.target), p = products.length === 1 ? products[0] : undefined, selected = p && productOfferSection(spec, p);
  const offer = selected && purchaseConfig(selected.section).offers.find((o) => o.id === request.offer);
  if (!p || !offer || request.variants.length !== offer.quantity) throw new Error("Offre ou quantité invalide.");
  const choices = offerVariants(spec);
  if (request.variants.some((id) => choices.find((v) => v.id === id)?.product !== p)) throw new Error("La variante n'appartient pas à ce produit.");
  const group = `offer-${request.target}`;
  const added: OfferLine[] = [];
  for (const variantId of request.variants) {
    const line = added.find((l) => l.variantId === variantId);
    if (line) line.quantity++; else added.push({ variantId, quantity: 1, offerGroup: group, offerTarget: request.target, offerId: request.offer, variantIdentity: offerVariantIdentity(choices.find((v) => v.id === variantId)!.variant) });
  }
  return reconcileOfferCart(spec, [...cart.filter((l) => l.offerGroup !== group), ...added]);
}

/** Export fermé : aucune remise/cadeau active sans adaptateur commercial serveur installé et vérifié. */
export function guardPurchaseExport(spec: ThemeSpec, platform = "shopify") {
  const out = structuredClone(spec), disabled: string[] = [];
  for(const t of Object.values(out.templates))for(const [id,s]of Object.entries(t.sections))t.sections[id]=sharedPurchaseSection(spec,s);
  for (const [key, template] of Object.entries(out.templates)) for (const [id, section] of Object.entries(template.sections)) {
    const config = purchaseConfig(section);
    if (section.settings.purchase_enabled && (platform !== "shopify" || config.gifts.length || config.offers.some((o) => o.discount > 0 || o.totalPrice !== undefined))) {
      section.settings.purchase_enabled = false; disabled.push(`${key}:${id}`);
    }
  }
  return { spec: out, disabled };
}

/** Libellé client de l'erreur ; aucun contenu technique ni donnée de compte. */
export function purchaseErrorMessage(error: unknown, lang: string) {
 const message = error instanceof Error ? error.message : "";
 if (lang !== "en") return message || "Offre indisponible.";
 const messages: Record<string,string> = {
  "Identité de variante ambiguë ou retirée.":"Variant identity is ambiguous or was removed.",
  "Variante indisponible ou stock insuffisant.":"Variant unavailable or insufficient stock.",
  "Prix à définir : ce produit ne peut pas encore être ajouté au panier.":"Price to be set: this product cannot be added to the cart yet.",
  "Association du lot invalide.":"Invalid bundle association.",
  "Offre non disponible.":"Offer unavailable.",
  "Offre ou quantité invalide.":"Invalid offer or quantity.",
  "La variante n'appartient pas à ce produit.":"The variant does not belong to this product.",
  "Quantité invalide.":"Invalid quantity.",
  "Prix du lot à renseigner.":"Enter the bundle price.",
  "Variante ou quantité invalide.":"Invalid variant or quantity.",
 };
 return messages[message] ?? "Offer unavailable.";
}

/** Dossier de configuration transportable ; ne constitue jamais une activation dans un CMS. */
export function purchaseExportManifest(spec: ThemeSpec) {
 const sections = Object.entries(spec.templates).flatMap(([template,t]) => Object.entries(t.sections).filter(([,s]) => ["main-product","purchase-offers","featured-purchase"].includes(s.type) && purchaseConfig(s).offers.length).map(([section,s]) => ({ template, section, productTarget: s.settings.product_target ?? null, settings:s.settings, blocks:s.blocks, blockOrder:s.block_order, style: s.settings.purchase_style ?? "outlined", configuration: purchaseConfig(s) })));
 return sections.length ? { version:1, commercialServerInstalled:false, checkoutVerified:false, instruction:"Configurer et vérifier les règles dans le système commercial de la plateforme avant activation. Ce fichier conserve les données ; il ne crée ni remise ni cadeau.", sections, catalog:storeProducts(spec).map((p)=>({target:p.contentTarget,handle:p.handle,currency:p.currency,variants:p.variants.map((v)=>({sku:v.sku,options:v.options,price:v.price,available:v.available}))})) } : null;
}
