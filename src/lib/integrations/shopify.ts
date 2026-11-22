/**
 * Installation dans une boutique Shopify via l'API Admin (après autorisation
 * OAuth du marchand) : thème non publié, produit (brouillon) avec images et
 * variantes, pages liées aux gabarits du thème.
 */
import { redact } from "../redact";
import { jetonFrais, noterVersionServie, shopifyAppDeps, SHOPIFY_API_VERSION } from "./shopify-app";
import { getSetting } from "../settings";
import { decrypt } from "../secrets";
import { one } from "../db";
import { assetData, getAsset } from "../library";
import { PermanentError, UserFacingError } from "../jobs";
import { isPublicAppUrl, signMedia } from "../public-url";
import { appUrl } from "../settings";
import { storeProducts, type StoreProduct, type ThemeSpec } from "../theme/spec";
import type { Connection } from "../social/publish";
import { L } from "../i18n-server";
import { sanitizeBlogHtml } from "../blog-html";
import { offreVide, titreRemise, type OffreBoutique, type PreuveRemises } from "../syna-agent/custom-theme/remises";

// 2025-07 n'est plus tenue par Shopify (recherche 04, 22 novembre 2026) : la plus récente tenue est demandée.
const version = () => getSetting("shopify.apiVersion") || SHOPIFY_API_VERSION;

async function gql(c0: Connection, query: string, variables: Record<string, unknown> = {}) {
  // Boutique reliée par l'application du client : un jeton frais avant chaque envoi.
  const c = await jetonFrais(c0 as Connection & { expires_at?: number | null; meta?: string | null });
  const shop = c.external_id, v = version();
  const r = await (shopifyAppDeps.fetch ?? fetch)(`https://${shop}/admin/api/${v}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": decrypt(c.access_token)! },
    body: JSON.stringify({ query, variables }),
  });
  noterVersionServie(r.headers?.get?.("x-shopify-api-version") ?? null, v);
  if (r.status === 401 || r.status === 403) throw new PermanentError(L("Shopify refuse l'accès : reconnectez la boutique (autorisations manquantes).", "Shopify denied access: reconnect the store (missing permissions)."));
  const j: any = await r.json();
  if (j.errors) throw new Error(L(`Shopify : ${JSON.stringify(j.errors).slice(0, 300)}`, `Shopify: ${JSON.stringify(j.errors).slice(0, 300)}`));
  return j.data;
}

function userErrors(d: any, key: string) {
  const errs = d?.[key]?.userErrors ?? [];
  if (errs.length) throw new Error(L(`Shopify : ${errs.map((e: any) => e.message).join(" ; ")}`, `Shopify: ${errs.map((e: any) => e.message).join("; ")}`));
}

export function shopifyConnection(userId: string, projectId: string): Connection | undefined {
  return one<Connection>(
    "SELECT c.* FROM connections c JOIN project_connections pc ON pc.connection_id = c.id WHERE c.user_id = ? AND pc.project_id = ? AND c.provider = 'shopify' AND c.status = 'active' ORDER BY c.updated_at DESC LIMIT 1",
    userId,
    projectId,
  ) ?? one<Connection>("SELECT * FROM connections WHERE user_id = ? AND provider = 'shopify' AND status = 'active' ORDER BY updated_at DESC LIMIT 1", userId);
}

async function stagedUpload(c: Connection, filename: string, mime: string, data: Buffer): Promise<string> {
  const d = await gql(c, `mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{ name value } } userErrors{ field message } } }`, {
    input: [{ resource: "IMAGE", filename, mimeType: mime, httpMethod: "POST", fileSize: String(data.length) }],
  });
  userErrors(d, "stagedUploadsCreate");
  const t = d.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(data)], { type: mime }), filename);
  const up = await fetch(t.url, { method: "POST", body: form });
  if (!up.ok && up.status !== 201 && up.status !== 204) throw new Error(L(`Envoi d'image vers Shopify échoué (${up.status}).`, `Image upload to Shopify failed (${up.status}).`));
  return t.resourceUrl;
}

export async function pushProduct(c: Connection, spec: ThemeSpec, product?: StoreProduct): Promise<{ productId: string; handle: string; seo: Awaited<ReturnType<typeof pushProductSeo>> }> {
  const p = product ?? spec.store.product;
  if (p.price === null) throw new UserFacingError(L(`Renseignez le prix de « ${p.title} » avant de l'envoyer à Shopify.`, `Enter the price of "${p.title}" before sending it to Shopify.`));
  const files: { originalSource: string; contentType: "IMAGE"; alt: string }[] = [];
  for (const f of p.images.slice(0, 10)) {
    const a = getAsset(spec.files[f]);
    if (!a) continue;
    files.push({ originalSource: await stagedUpload(c, f, a.mime === "image/png" ? "image/png" : "image/jpeg", assetData(a)), contentType: "IMAGE", alt: p.title });
  }
  const hasOptions = p.options.length > 0 && p.variants.length > 0 && p.variants[0].title !== "Default Title";
  const input: Record<string, unknown> = {
    title: p.title,
    handle: p.handle,
    descriptionHtml: p.description_html,
    vendor: p.vendor,
    status: "DRAFT",
    // Mise en page propre au produit (templates/product.<suffixe>.json du thème), sinon la fiche commune.
    templateSuffix: p.template_suffix && spec.templates[`product.${p.template_suffix}`] ? p.template_suffix : null,
    files,
    productOptions: hasOptions ? [{ name: p.options[0], values: p.variants.map((v) => ({ name: v.options[0] })) }] : [{ name: "Title", values: [{ name: "Default Title" }] }],
    variants: (hasOptions ? p.variants : [{ title: "Default Title", options: ["Default Title"], price: p.price }]).map((v) => ({
      optionValues: [{ optionName: hasOptions ? p.options[0] : "Title", name: v.options[0] }],
      price: ((v.price ?? p.price!) / 100).toFixed(2),
    })),
  };
  // Produit déjà créé (envoi précédent, reprise après une erreur) : mis à jour au lieu d'être dupliqué.
  const found = await gql(c, `query($q: String!){ products(first: 1, query: $q){ nodes{ id handle } } }`, { q: `handle:${p.handle}` });
  const existing = found?.products?.nodes?.find((n: { handle: string }) => n.handle === p.handle);
  if (existing) input.id = existing.id;
  const d = await gql(c, `mutation($input: ProductSetInput!){ productSet(synchronous: true, input: $input){ product{ id handle } userErrors{ field message } } }`, { input });
  userErrors(d, "productSet");
  const productId = d.productSet.product.id as string;
  const seo = await pushProductSeo(c, productId, p.seo);
  return { productId, handle: d.productSet.product.handle, seo };
}

/**
 * Résultat de l'envoi du SEO d'une fiche : jamais présenté comme « vérifié ».
 *  - sent : requête transmise, mais la réponse ne confirme pas l'enregistrement des deux champs ;
 *  - accepted : Shopify renvoie les métachamps enregistrés, sans erreur (affichage réel côté boutique NON VÉRIFIÉ) ;
 *  - refused : Shopify refuse (userErrors, droits…) — le produit reste envoyé ;
 *  - unknown : pas de réponse exploitable (réseau, délai) — on ne sait pas ;
 *  - none : aucun titre ni description SEO à envoyer.
 */
export type SeoPushStatus = "none" | "sent" | "accepted" | "refused" | "unknown";
export type SeoPushResult = { status: SeoPushStatus; detail?: string; verified: false; mechanism: typeof SEO_MECHANISM };
/** Mécanisme NON VÉRIFIÉ (documentation officielle inaccessible depuis le studio, aucun test sur une vraie boutique). */
export const SEO_MECHANISM = "metafieldsSet global.title_tag / global.description_tag (UNVERIFIED)" as const;
const seoResult = (status: SeoPushStatus, detail?: string): SeoPushResult => ({ status, ...(detail ? { detail: detail.slice(0, 200) } : {}), verified: false, mechanism: SEO_MECHANISM });

/**
 * SEO de la fiche produit (titre et méta-description), envoyé APRÈS le produit et sans jamais le bloquer : mêmes
 * champs que ceux déjà utilisés pour les articles de blog (métachamps « global.title_tag » et
 * « global.description_tag », que Shopify affiche comme titre et description pour les moteurs de recherche).
 * MÉCANISME NON VÉRIFIÉ : à confirmer par la documentation officielle ou un vrai test Shopify avant d'être présenté
 * comme fiable. Refus de la boutique : le produit reste envoyé, le refus est rendu tel quel.
 */
export async function pushProductSeo(c: Connection, productId: string, seo: { title: string; description: string } | undefined): Promise<SeoPushResult> {
  if (!seo?.title?.trim() && !seo?.description?.trim()) return seoResult("none");
  const metafields = [
    { ownerId: productId, namespace: "global", key: "title_tag", type: "single_line_text_field", value: (seo.title ?? "").trim() },
    { ownerId: productId, namespace: "global", key: "description_tag", type: "single_line_text_field", value: (seo.description ?? "").trim() },
  ].filter((m) => m.value);
  let d: any;
  try {
    d = await gql(c, `mutation($metafields: [MetafieldsSetInput!]!){ metafieldsSet(metafields: $metafields){ metafields{ key } userErrors{ field message } } }`, { metafields });
  } catch (e) {
    if (e instanceof PermanentError) throw e;
    const msg = redact((e as Error).message);
    // Réponse d'erreur de Shopify (droits, champ) = refus ; panne réseau ou délai = on ne sait pas.
    return /fetch failed|network|timeout|ETIMEDOUT|ECONNRESET|aborted|socket/i.test(msg) ? seoResult("unknown", msg) : seoResult("refused", msg);
  }
  const errs = d?.metafieldsSet?.userErrors ?? [];
  if (errs.length) return seoResult("refused", errs.map((e: any) => e.message).join(" ; "));
  const saved = new Set<string>((d?.metafieldsSet?.metafields ?? []).map((m: { key: string }) => m.key));
  if (!d?.metafieldsSet) return seoResult("unknown", "réponse sans metafieldsSet");
  return metafields.every((m) => saved.has(m.key)) ? seoResult("accepted") : seoResult("sent", `confirmés : ${[...saved].join(", ") || "aucun"}`);
}

/**
 * Relecture du SEO d'une fiche dans la boutique (lecture seule, phase 8B) : métachamps global.title_tag /
 * description_tag ET champ `seo` du produit tel que Shopify le rend. Sert à VÉRIFIER le mécanisme sur une vraie
 * boutique (scripts/verify-shopify-seo.ts) ; tant que ce n'est pas fait, le mécanisme reste « NON VÉRIFIÉ ».
 */
export async function readProductSeo(c: Connection, productId: string): Promise<{ metafields: { title: string | null; description: string | null }; seo: { title: string | null; description: string | null } }> {
  const d = await gql(c, `query($id: ID!){ product(id: $id){ seo{ title description } t: metafield(namespace: "global", key: "title_tag"){ value } m: metafield(namespace: "global", key: "description_tag"){ value } } }`, { id: productId });
  const pr = d?.product;
  if (!pr) throw new Error(L("Produit introuvable dans la boutique.", "Product not found in the store."));
  return { metafields: { title: pr.t?.value ?? null, description: pr.m?.value ?? null }, seo: { title: pr.seo?.title ?? null, description: pr.seo?.description ?? null } };
}

/** Compare ce qui a été envoyé à ce que la boutique rend : « vérifié » seulement si le champ `seo` reprend les deux valeurs. */
export function compareSeo(sent: { title: string; description: string }, read: Awaited<ReturnType<typeof readProductSeo>>): { stored: boolean; displayed: boolean; detail: string } {
  const eq = (a: string | null, b: string) => (a ?? "").trim() === b.trim();
  const stored = eq(read.metafields.title, sent.title) && eq(read.metafields.description, sent.description);
  const displayed = eq(read.seo.title, sent.title) && eq(read.seo.description, sent.description);
  return { stored, displayed, detail: displayed ? "le champ SEO du produit reprend les valeurs envoyées" : stored ? "métachamps enregistrés, mais le champ SEO du produit ne les reprend pas" : "valeurs absentes ou différentes dans la boutique" };
}

/** Résumé honnête du SEO envoyé (comptes par statut), affiché au client et repris par le diagnostic. */
export function seoSummary(seo: Record<string, SeoPushResult>): { counts: Record<SeoPushStatus, number>; text: string } {
  const counts: Record<SeoPushStatus, number> = { none: 0, sent: 0, accepted: 0, refused: 0, unknown: 0 };
  for (const r of Object.values(seo)) counts[r.status]++;
  const parts = [
    counts.accepted && L(`${counts.accepted} accepté(s)`, `${counts.accepted} accepted`),
    counts.sent && L(`${counts.sent} envoyé(s) sans confirmation`, `${counts.sent} sent without confirmation`),
    counts.refused && L(`${counts.refused} refusé(s)`, `${counts.refused} refused`),
    counts.unknown && L(`${counts.unknown} état inconnu`, `${counts.unknown} unknown`),
  ].filter(Boolean);
  return { counts, text: parts.length ? L(`SEO des fiches : ${parts.join(", ")} (affichage dans Shopify non vérifié)`, `Product SEO: ${parts.join(", ")} (display in Shopify not verified)`) : "" };
}

/** Envoie tous les produits de la boutique (brouillons), puis crée les collections manuelles. */
export async function pushCatalog(c: Connection, spec: ThemeSpec, onProgress?: (done: number, total: number) => void) {
  // Site d'entreprise de services : aucun produit à créer (le site repose sur les pages et le thème).
  if (spec.store.business === "services") return { products: [] as string[], collections: [] as string[], seo: {} as Record<string, SeoPushResult> };
  const products = storeProducts(spec);
  const missing = products.filter((p) => p.price === null).map((p) => p.title);
  if (missing.length) throw new UserFacingError(L(`Renseignez le prix de : ${missing.join(", ")} avant l'envoi à Shopify.`, `Enter the price of: ${missing.join(", ")} before sending to Shopify.`));
  const ids = new Map<string, string>();
  // SEO de chaque fiche : envoyé, absent ou refusé par la boutique (rendu dans le résultat de l'envoi, jamais perdu).
  const seo: Record<string, SeoPushResult> = {};
  for (const [i, p] of products.entries()) {
    const r = await pushProduct(c, spec, p);
    ids.set(p.handle, r.productId);
    seo[p.handle] = r.seo;
    onProgress?.(i + 1, products.length);
  }
  const collections: string[] = [], collectionIds: string[] = [];
  for (const col of spec.store.collections ?? []) {
    const productIds = col.products.map((h) => ids.get(h)).filter(Boolean);
    const d = await gql(c, `mutation($input: CollectionInput!){ collectionCreate(input: $input){ collection{ id handle } userErrors{ field message } } }`, {
      input: { title: col.title, handle: col.handle, descriptionHtml: col.description ? `<p>${col.description}</p>` : "", products: productIds, ...(col.template_suffix && spec.templates[`collection.${col.template_suffix}`] ? { templateSuffix: col.template_suffix } : {}) },
    });
    const errs = d?.collectionCreate?.userErrors ?? [];
    if (errs.length && !errs.some((e: any) => /taken|already/i.test(e.message))) throw new Error(L(`Collection ${col.title} : ${errs.map((e: any) => e.message).join(" ; ")}`, `Collection ${col.title}: ${errs.map((e: any) => e.message).join("; ")}`));
    collections.push(col.handle);
    if (d?.collectionCreate?.collection?.id) collectionIds.push(d.collectionCreate.collection.id);
  }
  // Créés par l'interface, produits et collections ne se voient pas dans la boutique tant qu'ils ne sont pas publiés sur
  // la boutique en ligne (recherche 04, 22 novembre 2026 : le Studio ne le faisait jamais).
  const publication = await publierSurLaBoutique(c, [...ids.values(), ...collectionIds]);
  return { products: [...ids.keys()], collections, seo, publication };
}

/** La publication « Boutique en ligne » de la boutique (null si Shopify ne la donne pas). */
async function publicationBoutique(c: Connection): Promise<string | null> {
  const d = await gql(c, `{ publications(first: 25){ nodes{ id name } } }`);
  const nodes: { id: string; name: string }[] = d?.publications?.nodes ?? [];
  return nodes.find((n) => /online store|boutique en ligne/i.test(n.name))?.id ?? null;
}

/** Publie produits et collections sur la boutique en ligne ; rend combien sont visibles, et ce qui a coincé. */
export async function publierSurLaBoutique(c: Connection, ids: string[]): Promise<{ publies: number; erreurs: string[] }> {
  if (!ids.length) return { publies: 0, erreurs: [] };
  const pub = await publicationBoutique(c);
  if (!pub) return { publies: 0, erreurs: [L("la boutique en ligne n'a pas été trouvée dans tes canaux de vente : tes produits sont créés mais pas encore visibles", "online store channel not found")] };
  let publies = 0; const erreurs: string[] = [];
  for (const rid of ids) {
    const d = await gql(c, `mutation($id: ID!, $input: [PublicationInput!]!){ publishablePublish(id: $id, input: $input){ userErrors{ field message } } }`, { id: rid, input: [{ publicationId: pub }] });
    const errs = d?.publishablePublish?.userErrors ?? [];
    if (errs.length) erreurs.push(errs.map((e: any) => e.message).join(" ; ")); else publies++;
  }
  return { publies, erreurs };
}

/** Les menus du site créés dans la boutique (menu du haut et du bas), au lieu de ceux de Shopify par défaut. */
export async function pushMenus(c: Connection, spec: ThemeSpec): Promise<string[]> {
  const items = (links: { title: string; url: string; links?: { title: string; url: string }[] }[]): unknown[] => links.map((l) => ({ title: l.title.slice(0, 255), type: "HTTP", url: l.url, ...(l.links?.length ? { items: items(l.links) } : {}) }));
  const done: string[] = [];
  for (const [handle, m] of Object.entries(spec.store.menus ?? {})) {
    if (!m.links?.length) continue;
    const d = await gql(c, `mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!){ menuCreate(title: $title, handle: $handle, items: $items){ menu{ id handle } userErrors{ field message } } }`, { title: m.title, handle, items: items(m.links) });
    const errs = d?.menuCreate?.userErrors ?? [];
    if (errs.length && !errs.some((e: any) => /taken|already/i.test(e.message))) throw new Error(L(`Menu ${m.title} : ${errs.map((e: any) => e.message).join(" ; ")}`, `Menu ${m.title}: ${errs.map((e: any) => e.message).join("; ")}`));
    done.push(handle);
  }
  return done;
}

/** Les pages légales de Shopify (remboursement, conditions, confidentialité, mentions) remplies avec celles du site. */
export const POLICY_TYPES: Record<string, string> = { "refund-policy": "REFUND_POLICY", "terms-of-service": "TERMS_OF_SERVICE", "privacy-policy": "PRIVACY_POLICY", "legal-notice": "LEGAL_NOTICE", "shipping-policy": "SHIPPING_POLICY" };
export async function pushPolicies(c: Connection, spec: ThemeSpec): Promise<{ faites: string[]; aCompleter: string[] }> {
  const faites: string[] = [], aCompleter: string[] = [];
  for (const pol of spec.store.policies ?? []) {
    const type = POLICY_TYPES[pol.handle];
    if (!type) continue;
    // Jamais une page légale avec un trou : elle attend que le client ait tout donné.
    if (/\[À compléter|\[To complete/.test(pol.body_html)) { aCompleter.push(pol.title); continue; }
    const d = await gql(c, `mutation($shopPolicy: ShopPolicyInput!){ shopPolicyUpdate(shopPolicy: $shopPolicy){ shopPolicy{ id } userErrors{ field message } } }`, { shopPolicy: { type, body: pol.body_html.slice(0, 500_000) } });
    userErrors(d, "shopPolicyUpdate");
    faites.push(pol.title);
  }
  return { faites, aCompleter };
}

/** Le forfait de la boutique, lu avant de monter le site (Starter : refusé, dit avant tout travail). */
export async function lireForfait(c: Connection): Promise<{ displayName: string | null; partnerDevelopment: boolean } | null> {
  const d = await gql(c, `{ shop{ plan{ displayName partnerDevelopment } } }`);
  return d?.shop?.plan ?? null;
}

export async function pushPages(c: Connection, spec: ThemeSpec) {
  const created: string[] = [];
  for (const page of spec.store.pages) {
    const d = await gql(c, `mutation($page: PageCreateInput!){ pageCreate(page: $page){ page{ id handle } userErrors{ field message code } } }`, {
      page: {
        title: page.title,
        handle: page.handle,
        body: page.body_html || "<p></p>",
        templateSuffix: page.template_suffix,
        // Brouillon dans le studio : créé non publié dans Shopify.
        isPublished: page.status !== "draft",
        // Titre et description pour Google (champs SEO de la page dans Shopify).
        ...(page.seo?.title ? { metafields: [{ namespace: "global", key: "title_tag", type: "single_line_text_field", value: page.seo.title }, ...(page.seo.description ? [{ namespace: "global", key: "description_tag", type: "multi_line_text_field", value: page.seo.description }] : [])] } : {}),
      },
    });
    const errs = d?.pageCreate?.userErrors ?? [];
    if (errs.length && !errs.some((e: any) => /taken|already/i.test(e.message))) throw new Error(L(`Page ${page.title} : ${errs.map((e: any) => e.message).join(" ; ")}`, `Page ${page.title}: ${errs.map((e: any) => e.message).join("; ")}`));
    created.push(page.handle);
  }
  return created;
}

/**
 * Installation du thème : Shopify télécharge lui-même le ZIP depuis une
 * adresse publique signée (valable 1 h). Sans adresse publique, le ZIP est
 * à importer manuellement (Boutique en ligne › Thèmes › Ajouter un thème).
 */
export async function pushTheme(c: Connection, projectId: string, versionId: string, name: string) {
  if (!isPublicAppUrl()) throw new UserFacingError(L("Shopify doit télécharger le thème depuis une adresse publique HTTPS. Définissez l'adresse publique du studio dans l'administration, ou importez le ZIP manuellement.", "Shopify needs to download the theme from a public HTTPS address. Set the studio's public address in the admin area, or import the ZIP manually."));
  const src = `${appUrl()}/api/public/theme/${signMedia("theme", `${projectId}:${versionId}`, 3600)}/theme.zip`;
  const d = await gql(c, `mutation($source: URL!, $name: String){ themeCreate(source: $source, name: $name, role: UNPUBLISHED){ theme{ id name processing } userErrors{ field message } } }`, { source: src, name: name.slice(0, 50) });
  userErrors(d, "themeCreate");
  return { themeId: d.themeCreate.theme.id as string, editorUrl: `https://${c.external_id}/admin/themes/${String(d.themeCreate.theme.id).split("/").pop()}/editor` };
}

// ---------------------------------------------------------------- articles de blog

export type ShopifyArticleInput = {
  /** Article déjà envoyé (gid) : mis à jour au lieu d'être dupliqué. */
  ref?: string | null;
  title: string;
  handle: string;
  bodyHtml: string;
  summary: string;
  tags: string[];
  author: string;
  metaTitle: string;
  metaDescription: string;
  /** Image de couverture accessible publiquement (Shopify la télécharge). */
  imageUrl?: string | null;
  imageAlt?: string;
  publish: boolean;
  /** Nom du blog créé s'il n'existe ni « News » ni « Journal ». */
  blogTitle: string;
};

/** Blog de la boutique où ranger les articles : « News » ou « Journal » s'il existe, sinon créé. */
async function articleBlog(c: Connection, title: string): Promise<{ id: string; handle: string }> {
  const d = await gql(c, `query{ blogs(first: 50){ nodes{ id title handle } } }`);
  const blogs: { id: string; title: string; handle: string }[] = d?.blogs?.nodes ?? [];
  const known = blogs.find((b) => /^(news|journal|blog|actualites|actualités)$/i.test(b.handle) || /^(news|journal|blog|actualités)$/i.test(b.title.trim()));
  if (known) return known;
  const created = await gql(c, `mutation($blog: BlogCreateInput!){ blogCreate(blog: $blog){ blog{ id handle } userErrors{ field message } } }`, { blog: { title } });
  userErrors(created, "blogCreate");
  return created.blogCreate.blog;
}

/** Article déjà envoyé : son blog actuel, ou null s'il a été supprimé dans Shopify. */
async function existingArticle(c: Connection, id: string): Promise<{ id: string; handle: string; blog: { handle: string } | null } | null> {
  const d = await gql(c, `query($id: ID!){ article(id: $id){ id handle blog{ handle } } }`, { id });
  return d?.article ?? null;
}

/** Crée (ou met à jour) l'article dans le blog de la boutique, en brouillon ou publié. */
export async function pushBlogArticle(c: Connection, a: ShopifyArticleInput): Promise<{ ref: string; url: string; published: boolean }> {
  // Mise à jour : l'article reste dans son blog (aucun blog créé, lien juste). Supprimé dans Shopify : recréé.
  let ref = a.ref ?? null;
  let blogHandle: string | null = null;
  if (ref) {
    const prev = await existingArticle(c, ref);
    if (prev) blogHandle = prev.blog?.handle ?? null;
    else ref = null;
  }
  let blog: { id: string; handle: string } | null = null;
  const blogFor = async () => (blog ??= await articleBlog(c, a.blogTitle));
  const base: Record<string, unknown> = {
    title: a.title,
    handle: a.handle,
    body: sanitizeBlogHtml(a.bodyHtml),
    summary: a.summary,
    tags: a.tags,
    isPublished: a.publish,
    author: { name: a.author },
    ...(a.imageUrl ? { image: { url: a.imageUrl, altText: a.imageAlt ?? a.title } } : {}),
  };
  const seo = [
    { namespace: "global", key: "title_tag", type: "single_line_text_field", value: a.metaTitle },
    { namespace: "global", key: "description_tag", type: "single_line_text_field", value: a.metaDescription },
  ].filter((m) => m.value);
  const send = async (withSeo: boolean) => {
    const article = { ...base, ...(withSeo && seo.length ? { metafields: seo } : {}) };
    if (ref) {
      const d = await gql(c, `mutation($id: ID!, $article: ArticleUpdateInput!){ articleUpdate(id: $id, article: $article){ article{ id handle blog{ handle } } userErrors{ field message } } }`, { id: ref, article });
      return { d, key: "articleUpdate" };
    }
    const b = await blogFor();
    const d = await gql(c, `mutation($article: ArticleCreateInput!){ articleCreate(article: $article){ article{ id handle blog{ handle } } userErrors{ field message } } }`, { article: { ...article, blogId: b.id } });
    return { d, key: "articleCreate" };
  };
  const errs = (r: { d: any; key: string }): any[] => r.d?.[r.key]?.userErrors ?? [];
  let r = await send(true);
  // Article supprimé dans Shopify entre-temps : recréé plutôt qu'une erreur brute.
  if (ref && errs(r).some((e: any) => /not\s*found|n'existe|introuvable|does not exist/i.test(String(e.message)))) {
    ref = null;
    r = await send(true);
  }
  // Champs SEO refusés (définition différente dans la boutique) : l'article part sans eux plutôt que pas du tout.
  if (errs(r).some((e: any) => /metafield/i.test(`${e.field ?? ""} ${e.message}`))) r = await send(false);
  userErrors(r.d, r.key);
  const art = r.d[r.key].article as { id: string; handle: string; blog?: { handle: string } | null };
  const handle = art.blog?.handle ?? blogHandle ?? (blog as { handle: string } | null)?.handle ?? (await blogFor()).handle;
  return { ref: art.id, url: `https://${c.external_id}/blogs/${handle}/${art.handle}`, published: a.publish };
}

// ---------------------------------------------------------------- remises de l'offre (chantier « plateformes »)

/**
 * Les remises RÉELLES de l'offre dans Shopify, créées par l'accès du client (API d'administration) : pour chaque
 * palier, une remise automatique « montant sur des produits » avec quantité minimale ; pour chaque cadeau, une remise
 * automatique « achetez X, recevez Y » à 100 %. Le thème ne calcule jamais une remise : c'est Shopify qui la tient.
 * Droit : « write_discounts » (il donne aussi la lecture). L'autorisation du Studio le demande depuis le 16 novembre
 * 2026 (src/lib/social/oauth.ts, accord du propriétaire). Une boutique reliée AVANT ne l'a pas : rien n'est tenté,
 * SINA demande de relier la boutique à nouveau, ou donne le guide pas à pas (guideRemisesShopify). ÉCRIT, NON ESSAYÉ sur une vraie boutique : seulement des requêtes simulées.
 */
export const DROITS_REMISES = ["write_discounts", "read_discounts"] as const;
const droitsDe = (c: Connection): string[] => String((c as unknown as { scopes?: string | null }).scopes ?? "").split(/[\s,]+/).filter(Boolean);
/** L'accès du client permet-il de créer et de vérifier des remises ? Sinon : les droits qui manquent. */
export function droitsRemises(c: Connection): { ok: boolean; manque: string[] } {
  const have = droitsDe(c);
  // « write_x » donne aussi la lecture.
  const manque = have.includes("write_discounts") ? [] : ["write_discounts"];
  return { ok: manque.length === 0, manque };
}

type RemiseShopify = { titre: string; statut: string };
async function remisesDuStudio(c: Connection): Promise<RemiseShopify[]> {
  const d = await gql(c, `query{ automaticDiscountNodes(first: 100, query: "title:Studio*"){ nodes{ automaticDiscount{ __typename ... on DiscountAutomaticBasic{ title status } ... on DiscountAutomaticBxgy{ title status } } } } }`);
  return ((d?.automaticDiscountNodes?.nodes ?? []) as { automaticDiscount?: { title?: string; status?: string } }[]).map((n) => ({ titre: String(n.automaticDiscount?.title ?? ""), statut: String(n.automaticDiscount?.status ?? "") })).filter((x) => x.titre);
}
async function produitShopify(c: Connection, handle: string): Promise<{ id: string; variants: { id: string; sku: string }[] } | null> {
  const d = await gql(c, `query($q: String!){ products(first: 1, query: $q){ nodes{ id handle variants(first: 100){ nodes{ id sku } } } } }`, { q: `handle:${handle}` });
  const p = (d?.products?.nodes ?? []).find((x: { handle: string }) => x.handle === handle);
  return p ? { id: p.id, variants: (p.variants?.nodes ?? []).map((v: { id: string; sku: string | null }) => ({ id: v.id, sku: v.sku ?? "" })) } : null;
}
/** Les remises attendues pour une offre : leur nom (le même à la création, à la vérification et dans le guide). */
export function remisesAttenduesShopify(offre: OffreBoutique): string[] {
  return Object.entries(offre.produits).flatMap(([handle, r]) => [...r.paliers.map((p) => titreRemise(handle, p)), ...r.cadeaux.map((k) => titreRemise(handle, { des: k.des, cadeau: k.handle }))]);
}

/**
 * Crée dans Shopify les remises automatiques de l'offre qui n'y sont pas encore (jamais deux fois la même : reconnues
 * à leur nom). Rien n'est supprimé ni modifié. Rend ce qui a été créé, ce qui existait, et ce qui a manqué.
 */
export async function creerRemisesShopify(c: Connection, offre: OffreBoutique, maintenant = new Date()): Promise<{ creees: string[]; existantes: string[]; manque: string[] }> {
  const droits = droitsRemises(c);
  if (!droits.ok) return { creees: [], existantes: [], manque: [`droit manquant sur la boutique : ${droits.manque.join(", ")}`] };
  const out = { creees: [] as string[], existantes: [] as string[], manque: [] as string[] };
  if (offreVide(offre)) return out;
  const deja = new Map((await remisesDuStudio(c)).map((r) => [r.titre, r.statut]));
  const produits = new Map<string, Awaited<ReturnType<typeof produitShopify>>>();
  const produit = async (h: string) => { if (!produits.has(h)) produits.set(h, await produitShopify(c, h)); return produits.get(h)!; };
  const startsAt = maintenant.toISOString();
  // Deux remises de produits ne s'appliquent ensemble (prix du pack ET cadeau) que si chacune l'autorise.
  const combinesWith = { productDiscounts: true, orderDiscounts: false, shippingDiscounts: true };
  for (const [handle, r] of Object.entries(offre.produits)) {
    const p = await produit(handle);
    if (!p) { out.manque.push(`produit « ${handle} » introuvable dans la boutique`); continue; }
    for (const palier of r.paliers) {
      const title = titreRemise(handle, palier);
      if (deja.has(title)) { (deja.get(title) === "ACTIVE" ? out.existantes : out.manque).push(deja.get(title) === "ACTIVE" ? title : `« ${title} » existe mais n'est pas active`); continue; }
      const d = await gql(c, `mutation($d: DiscountAutomaticBasicInput!){ discountAutomaticBasicCreate(automaticBasicDiscount: $d){ automaticDiscountNode{ id } userErrors{ field message } } }`, {
        d: { title, startsAt, combinesWith, minimumRequirement: { quantity: { greaterThanOrEqualToQuantity: String(palier.quantite) } }, customerGets: { value: { percentage: Math.round(palier.pourcent * 100) / 10000 }, items: { products: { productsToAdd: [p.id] } } } },
      });
      userErrors(d, "discountAutomaticBasicCreate");
      out.creees.push(title);
    }
    for (const k of r.cadeaux) {
      const title = titreRemise(handle, { des: k.des, cadeau: k.handle });
      if (deja.has(title)) { (deja.get(title) === "ACTIVE" ? out.existantes : out.manque).push(deja.get(title) === "ACTIVE" ? title : `« ${title} » existe mais n'est pas active`); continue; }
      const g = await produit(k.handle);
      const version = g && k.sku ? g.variants.find((v) => v.sku === k.sku) : null;
      if (!g || (k.sku && !version)) { out.manque.push(`cadeau « ${k.handle} » introuvable dans la boutique`); continue; }
      const d = await gql(c, `mutation($d: DiscountAutomaticBxgyInput!){ discountAutomaticBxgyCreate(automaticBxgyDiscount: $d){ automaticDiscountNode{ id } userErrors{ field message } } }`, {
        d: {
          title, startsAt, combinesWith, usesPerOrderLimit: "1",
          customerBuys: { value: { quantity: String(k.des) }, items: { products: { productsToAdd: [p.id] } } },
          customerGets: { value: { discountOnQuantity: { quantity: String(k.quantite), effect: { percentage: 1 } } }, items: { products: version ? { productVariantsToAdd: [version.id] } : { productsToAdd: [g.id] } } },
        },
      });
      userErrors(d, "discountAutomaticBxgyCreate");
      out.creees.push(title);
    }
  }
  return out;
}

/**
 * Les remises de l'offre sont-elles en place dans Shopify ? Lu dans la boutique : chaque remise attendue doit exister
 * sous son nom et être active. La preuve rendue se passe à `remisesConfirmees` (remises.ts).
 */
export async function etatRemisesShopify(c: Connection, offre: OffreBoutique, maintenant = Date.now()): Promise<PreuveRemises> {
  const non = (manque: string[]): PreuveRemises => ({ plateforme: "shopify", empreinte: null, actif: false, manque, luLe: maintenant });
  if (!droitsDe(c).some((x) => x === "read_discounts" || x === "write_discounts")) return non(["droit manquant sur la boutique : read_discounts (les remises ne peuvent pas être vérifiées par le Studio)"]);
  let vues: RemiseShopify[];
  try { vues = await remisesDuStudio(c); } catch (e) { return non([redact(e instanceof Error ? e.message : "Shopify ne répond pas")]); }
  const actives = new Set(vues.filter((r) => r.statut === "ACTIVE").map((r) => r.titre));
  const manque = remisesAttenduesShopify(offre).filter((t) => !actives.has(t)).map((t) => `remise absente ou inactive : « ${t} »`);
  return { plateforme: "shopify", empreinte: manque.length ? null : offre.empreinte, actif: manque.length === 0, manque, luLe: maintenant };
}
