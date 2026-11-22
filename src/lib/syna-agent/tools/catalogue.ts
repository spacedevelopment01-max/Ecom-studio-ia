/** Catalogue : mêmes fonctions que l'onglet Catalogue (fiches, variantes, prix en centimes, stock, versions). */
import { prixBarresSansPreuve, QUESTION_30_JOURS } from "../prix-anterieur";
import { z } from "zod";
import { createProduct, getProduct, listProducts, setVariantStock, updateProduct, archiveProduct, type StudioProduct } from "../../products/catalog";
import { L } from "../../i18n-server";
import { assetData, getAsset } from "../../library";
import { suiviAllume } from "../../suivi/reglages";
import type { AgentTool, Change } from "../types";
import { cents, euros, project, same } from "./common";

const view = (x: StudioProduct) => ({
  id: x.id, version: x.version, handle: x.handle, status: x.status, title: x.data.title, price: euros(x.data.price), compareAt: euros(x.data.compareAt), currency: x.data.currency,
  options: x.data.options, images: x.data.images.map((i) => i.assetId), description: x.data.description_html.slice(0, 400),
  variants: x.variants.map((v) => ({ id: v.id, options: v.options, price: euros(v.price), stock: v.stock, sku: v.sku })),
});

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const listTool: AgentTool<{ query?: string; includeArchived?: boolean }> = {
  name: "catalogue.list", module: "catalogue", kind: "read", needsProject: true,
  description: "Liste les produits (id, version, titre, prix en euros, options, variantes avec id/prix/stock). `query` filtre par mots du titre, d'une option ou d'une variante (« noir », « version noire »).",
  args: z.object({ query: z.string().max(120).optional(), includeArchived: z.boolean().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    let items = listProducts(p.id, { includeArchived: a.includeArchived }).map(view);
    if (a.query) {
      const words = norm(a.query).split(/\s+/).filter((w) => w.length > 2).map((w) => w.replace(/(e|s|es)$/, ""));
      items = items.filter((x) => { const hay = norm(JSON.stringify([x.title, x.options, x.variants.map((v) => v.options)])); return words.some((w) => hay.includes(w)); });
    }
    // Prix barré sans la preuve des 30 jours : il n'est pas affiché ; SINA demande au client (une fois par promotion).
    const sansPreuve = prixBarresSansPreuve(p.id);
    return { ok: true, summary: L(`${items.length} produit(s).`, `${items.length} product(s).`), data: items.slice(0, 60), ...(sansPreuve.length ? { hint: `Prix barré pas affiché, faute de preuve des 30 jours, pour : ${sansPreuve.map((x) => `« ${x.titre} »`).join(", ")}. Si le client veut le montrer, demande-lui, une fois par promotion : « ${QUESTION_30_JOURS} » ; puis prix.preuve avec ses mots.` } : {}) };
  },
};

const ProductFields = z.object({
  title: z.string().min(1).max(160).optional(),
  description_html: z.string().max(40000).optional(),
  price: z.number().min(0).max(1_000_000).nullable().optional().describe("Prix en euros (ex. 39 ou 39.9)"),
  compareAt: z.number().min(0).max(1_000_000).nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  options: z.array(z.object({ name: z.string().min(1).max(40), values: z.array(z.string().min(1).max(60)).min(1).max(50) })).max(3).optional(),
  images: z.array(z.object({ assetId: z.string().max(40), alt: z.string().max(200).default("") })).max(30).optional(),
  tags: z.array(z.string().max(60)).max(40).optional(),
  productType: z.string().max(120).optional(),
  seo: z.object({ title: z.string().max(70), description: z.string().max(320) }).optional(),
  status: z.enum(["active", "draft"]).optional(),
}).strict();

function toInput(f: z.infer<typeof ProductFields>) {
  const { price, compareAt, ...rest } = f;
  return { ...rest, ...(price !== undefined ? { price: price == null ? null : cents(price) } : {}), ...(compareAt !== undefined ? { compareAt: compareAt == null ? null : cents(compareAt) } : {}) };
}

const createTool: AgentTool<z.infer<typeof ProductFields>> = {
  name: "catalogue.create", module: "catalogue", kind: "write", needsProject: true,
  description: "Crée une fiche produit (titre obligatoire ; prix en euros seulement si le client l'a donné ; photos = assetId de la bibliothèque ou d'une pièce jointe). Les variantes naissent des options.",
  args: ProductFields.extend({ title: z.string().min(1).max(160) }),
  run: (ctx, a) => {
    const p = project(ctx);
    const created = createProduct(p.id, toInput(a) as any);
    const read = getProduct(p.id, created.id);
    return { ok: true, summary: L(`Produit « ${read.data.title} » créé et relu.`, `Product "${read.data.title}" created.`), data: view(read), changes: [{ module: "catalogue", object: `produit ${read.data.title}`, summary: L("création", "created"), after: view(read), verified: true }] };
  },
};

const updateTool: AgentTool<{ productId: string; expectedVersion?: number; fields?: z.infer<typeof ProductFields>; variants?: { options: string[]; price?: number | null; compareAt?: number | null; sku?: string; stock?: number | null }[] }> = {
  name: "catalogue.update", module: "catalogue", kind: "write", needsProject: true,
  description: "Modifie une fiche existante : champs (titre, description, prix du produit en euros, options, photos, SEO, statut) et/ou des variantes précises désignées par leurs options exactes (prix en euros, stock, SKU). Les autres variantes ne changent pas. Utilisez catalogue.list pour l'id, la version et les options exactes.",
  args: z.object({
    productId: z.string().max(40), expectedVersion: z.number().int().optional(), fields: ProductFields.optional(),
    variants: z.array(z.object({ options: z.array(z.string().max(60)).max(3), price: z.number().min(0).max(1_000_000).nullable().optional(), compareAt: z.number().min(0).max(1_000_000).nullable().optional(), sku: z.string().max(64).optional(), stock: z.number().int().nullable().optional() }).strict()).max(100).optional(),
  }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), before = getProduct(p.id, a.productId);
    const variants = (a.variants ?? []).map((v) => ({ options: v.options, ...(v.price !== undefined ? { price: v.price == null ? null : cents(v.price) } : {}), ...(v.compareAt !== undefined ? { compareAt: v.compareAt == null ? null : cents(v.compareAt) } : {}), ...(v.sku !== undefined ? { sku: v.sku } : {}), ...(v.stock !== undefined ? { stock: v.stock } : {}) }));
    for (const v of variants) if (!before.variants.some((x) => same(x.options, v.options))) return { ok: false, summary: L(`Variante introuvable : ${v.options.join(" / ")}. Options existantes : ${before.variants.map((x) => x.options.join(" / ")).join(" ; ")}`, "Variant not found.") };
    const after = updateProduct(p.id, a.productId, { ...(a.fields ? toInput(a.fields) : {}), ...(variants.length ? { variants } : {}), version: a.expectedVersion ?? before.version } as any);
    const read = getProduct(p.id, a.productId), changes: Change[] = [];
    const vb = view(before), va = view(read);
    for (const k of ["title", "price", "compareAt", "status", "description"] as const) if (!same(vb[k], va[k])) changes.push({ module: "catalogue", object: `${va.title} › ${k}`, summary: `${vb[k]} → ${va[k]}`, before: vb[k], after: va[k], verified: true });
    for (const v of va.variants) { const o = vb.variants.find((x) => same(x.options, v.options)); if (o && !same(o, v)) changes.push({ module: "catalogue", object: `${va.title} › ${v.options.join(" / ") || "variante"}`, summary: `prix ${o.price} → ${v.price} ; stock ${o.stock} → ${v.stock}`, before: o, after: v, verified: true }); }
    if (!same(vb.options, va.options) || !same(vb.images, va.images)) changes.push({ module: "catalogue", object: `${va.title} › options/photos`, summary: L("options ou photos modifiées", "options or photos changed"), before: { options: vb.options, images: vb.images }, after: { options: va.options, images: va.images }, verified: true });
    return { ok: after.version > before.version || changes.length > 0, summary: L(`Fiche « ${va.title} » enregistrée (version ${read.version}) et relue.`, `Product "${va.title}" saved.`), data: va, changes };
  },
};

const stockTool: AgentTool<{ variantId: string; stock: number | null }> = {
  name: "catalogue.stock", module: "catalogue", kind: "write", needsProject: true,
  description: "Fixe le stock d'une variante (null = non suivi, 0 = rupture).",
  args: z.object({ variantId: z.string().max(40), stock: z.number().int().min(-100000).max(10_000_000).nullable() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const prod = listProducts(p.id, { includeArchived: true }).find((x) => x.variants.some((v) => v.id === a.variantId));
    if (!prod) return { ok: false, summary: L("Variante introuvable.", "Variant not found.") };
    const before = prod.variants.find((v) => v.id === a.variantId)!.stock;
    setVariantStock(p.id, a.variantId, a.stock);
    const after = getProduct(p.id, prod.id).variants.find((v) => v.id === a.variantId)!.stock;
    return { ok: after === a.stock, summary: L(`Stock : ${before} → ${after}.`, `Stock: ${before} → ${after}.`), changes: [{ module: "catalogue", object: `${prod.data.title} › stock`, summary: `${before} → ${after}`, before, after, verified: after === a.stock }] };
  },
};

const archiveTool: AgentTool<{ productId: string }> = {
  name: "catalogue.archive", module: "catalogue", kind: "write", needsProject: true, sensitive: true,
  description: "Archive un produit (il disparaît de la boutique ; restaurable). Accord du client requis.",
  args: z.object({ productId: z.string().max(40) }).strict(),
  run: (ctx, a) => { const p = project(ctx), r = archiveProduct(p.id, a.productId); return { ok: r.status === "archived", summary: L(`« ${r.data.title} » archivé.`, `"${r.data.title}" archived.`), changes: [{ module: "catalogue", object: r.data.title, summary: "archivé", verified: r.status === "archived" }] }; },
};

/**
 * Poser sur un produit la photo que le client vient d'envoyer (décision du propriétaire, 17 novembre 2026 : SINA monte le
 * site sans attendre les photos des produits ; le client les importe ensuite, « et elles prennent leur place toutes
 * seules »). Seulement une VRAIE photo du client (image envoyée par lui dans ce projet), jamais une image créée : le
 * produit ne s'invente pas. Le rendu du site lit le catalogue : la galerie de la fiche et les cartes la montrent aussitôt.
 */
const photosTool: AgentTool<{ product: string; photos: string[]; replace?: boolean }> = {
  name: "catalogue.photos", module: "catalogue", kind: "write", needsProject: true,
  description: "Pose sur UN produit les vraies photos que le client a envoyées (gratuit). product : son titre exact ou son id (catalogue.list). photos : les identifiants des pièces jointes du fil (ou des images de ses Fichiers), dans l'ordre voulu ; la première devient la photo principale. Elles s'ajoutent à celles qu'il a déjà (replace:true pour les remplacer). Jamais une image créée par l'IA : seulement ses photos à lui. Dans l'aperçu de son site, la galerie de sa fiche et ses cartes la montrent tout de suite, sans refaire le site.",
  args: z.object({ product: z.string().min(1).max(160), photos: z.array(z.string().min(1).max(60)).min(1).max(12), replace: z.boolean().optional() }).strict(),
  run: async (ctx, a) => {
    const p = project(ctx), list = listProducts(p.id);
    const prod = list.find((x) => x.id === a.product) ?? list.find((x) => norm(x.data.title).trim() === norm(a.product).trim());
    if (!prod) return { ok: false, summary: L(`Produit « ${a.product} » introuvable.`, "Product not found."), hint: `Produits du catalogue : ${list.map((x) => x.data.title).join(" ; ") || "aucun"}.` };
    const ids: string[] = [], refused: string[] = [];
    for (const raw of a.photos) {
      const id = ctx.attachment(raw)?.assetId ?? raw;
      const asset = getAsset(id);
      if (!asset || asset.project_id !== p.id || asset.deleted_at || asset.kind !== "image") { refused.push(`${raw} : image introuvable dans ce projet`); continue; }
      if (asset.origin !== "upload") { refused.push(`${raw} : ce n'est pas une photo envoyée par le client (une image créée ne se pose jamais comme photo de son produit)`); continue; }
      if (!ids.includes(id)) ids.push(id);
    }
    if (!ids.length) return { ok: false, internal: true, summary: `Aucune photo posée : ${refused.join(" ; ")}.`, hint: "Les identifiants des photos envoyées sont dans la ligne de contexte de chaque pièce jointe (« asset … »), ou dans files.list." };
    const before = prod.data.images.map((i) => i.assetId);
    const images = [...(a.replace ? [] : prod.data.images), ...ids.filter((id) => a.replace || !before.includes(id)).map((assetId) => ({ assetId, alt: prod.data.title }))].slice(0, 30);
    updateProduct(p.id, prod.id, { images, version: prod.version } as any);
    const read = getProduct(p.id, prod.id), after = read.data.images.map((i) => i.assetId);
    const ok = ids.every((id) => after.includes(id));
    const sans = listProducts(p.id).filter((x) => x.status === "active" && !x.data.images.some((i) => !!i.assetId)).map((x) => x.data.title);
    // Le contrôle gratuit de la photo du téléphone (studio photo, recherche 08 point 6) : taille, lumière, netteté, jugées
    // par le code. Une photo faible reste posée (c'est la sienne), mais SINA lui dit comment la refaire plutôt que de
    // payer des images sur une mauvaise base.
    const aRefaire: { photo: string; conseil: string }[] = [];
    if (suiviAllume("studioPhoto")) {
      const { jugerPhoto } = await import("../../suivi/studio-photo");
      for (const id of ids) {
        try { const j = await jugerPhoto(assetData(getAsset(id)!)); if (!j.ok && j.conseil) aRefaire.push({ photo: id, conseil: j.conseil }); } catch { /* photo illisible : rien à dire */ }
      }
    }
    return {
      ok, summary: L(`${ids.length} photo(s) posée(s) sur « ${read.data.title} » et relue(s) : ${after.length} photo(s) au total.`, "Photos set."),
      data: { produit: read.data.title, photos: after, ...(refused.length ? { refusees: refused } : {}), ...(aRefaire.length ? { photosARefaire: aRefaire } : {}), produitsEncoreSansPhoto: sans },
      hint: `${aRefaire.length ? `Photo(s) faible(s) jugée(s) par le code (gratuit) : ${aRefaire.map((x) => `${x.photo} : ${x.conseil}`).join(" | ")} Dis-lui ce conseil avec ses mots, avant toute image payée sur cette photo. ` : ""}Dis au client que la photo de « ${read.data.title} » est en place : la galerie de sa fiche et ses cartes la montrent dans l'aperçu de son site, sans rien refaire.${sans.length ? ` Il reste sans photo : ${sans.join(", ")}.` : " Tous ses produits ont maintenant leur photo : propose-lui, avec le prix de la carte d'accord, de créer les scènes avec son vrai produit (custom.photo pour une photo du site, gallery.plan pour la galerie de sa fiche), et de valider son site (custom.choose) pour qu'il soit prêt à partir."}`,
      changes: [{ module: "catalogue", object: `${read.data.title} › photos`, summary: L(`${before.length} → ${after.length} photo(s)`, "photos changed"), before, after, verified: ok }],
    };
  },
};

export const catalogueTools: AgentTool[] = [listTool, createTool, updateTool, stockTool, archiveTool, photosTool];
