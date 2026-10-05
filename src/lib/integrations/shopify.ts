/**
 * Installation dans une boutique Shopify via l'API Admin (après autorisation
 * OAuth du marchand) : thème non publié, produit (brouillon) avec images et
 * variantes, pages liées aux gabarits du thème.
 */
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

const version = () => getSetting("shopify.apiVersion") || "2025-07";

async function gql(c: Connection, query: string, variables: Record<string, unknown> = {}) {
  const shop = c.external_id;
  const r = await fetch(`https://${shop}/admin/api/${version()}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": decrypt(c.access_token)! },
    body: JSON.stringify({ query, variables }),
  });
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

export async function pushProduct(c: Connection, spec: ThemeSpec, product?: StoreProduct): Promise<{ productId: string; handle: string }> {
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
    templateSuffix: null,
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
  return { productId: d.productSet.product.id, handle: d.productSet.product.handle };
}

/** Envoie tous les produits de la boutique (brouillons), puis crée les collections manuelles. */
export async function pushCatalog(c: Connection, spec: ThemeSpec, onProgress?: (done: number, total: number) => void) {
  // Site d'entreprise de services : aucun produit à créer (le site repose sur les pages et le thème).
  if (spec.store.business === "services") return { products: [] as string[], collections: [] as string[] };
  const products = storeProducts(spec);
  const missing = products.filter((p) => p.price === null).map((p) => p.title);
  if (missing.length) throw new UserFacingError(L(`Renseignez le prix de : ${missing.join(", ")} avant l'envoi à Shopify.`, `Enter the price of: ${missing.join(", ")} before sending to Shopify.`));
  const ids = new Map<string, string>();
  for (const [i, p] of products.entries()) {
    const r = await pushProduct(c, spec, p);
    ids.set(p.handle, r.productId);
    onProgress?.(i + 1, products.length);
  }
  const collections: string[] = [];
  for (const col of spec.store.collections ?? []) {
    const productIds = col.products.map((h) => ids.get(h)).filter(Boolean);
    const d = await gql(c, `mutation($input: CollectionInput!){ collectionCreate(input: $input){ collection{ id handle } userErrors{ field message } } }`, {
      input: { title: col.title, handle: col.handle, descriptionHtml: col.description ? `<p>${col.description}</p>` : "", products: productIds },
    });
    const errs = d?.collectionCreate?.userErrors ?? [];
    if (errs.length && !errs.some((e: any) => /taken|already/i.test(e.message))) throw new Error(L(`Collection ${col.title} : ${errs.map((e: any) => e.message).join(" ; ")}`, `Collection ${col.title}: ${errs.map((e: any) => e.message).join("; ")}`));
    collections.push(col.handle);
  }
  return { products: [...ids.keys()], collections };
}

export async function pushPages(c: Connection, spec: ThemeSpec) {
  const created: string[] = [];
  for (const page of spec.store.pages) {
    const d = await gql(c, `mutation($page: PageCreateInput!){ pageCreate(page: $page){ page{ id handle } userErrors{ field message code } } }`, {
      page: { title: page.title, handle: page.handle, body: page.body_html || "<p></p>", templateSuffix: page.template_suffix, isPublished: true },
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

/** Crée (ou met à jour) l'article dans le blog de la boutique, en brouillon ou publié. */
export async function pushBlogArticle(c: Connection, a: ShopifyArticleInput): Promise<{ ref: string; url: string; published: boolean }> {
  const blog = await articleBlog(c, a.blogTitle);
  const base: Record<string, unknown> = {
    title: a.title,
    handle: a.handle,
    body: a.bodyHtml,
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
    if (a.ref) {
      const d = await gql(c, `mutation($id: ID!, $article: ArticleUpdateInput!){ articleUpdate(id: $id, article: $article){ article{ id handle } userErrors{ field message } } }`, { id: a.ref, article });
      return { d, key: "articleUpdate" };
    }
    const d = await gql(c, `mutation($article: ArticleCreateInput!){ articleCreate(article: $article){ article{ id handle } userErrors{ field message } } }`, { article: { ...article, blogId: blog.id } });
    return { d, key: "articleCreate" };
  };
  let r = await send(true);
  // Champs SEO refusés (définition différente dans la boutique) : l'article part sans eux plutôt que pas du tout.
  if ((r.d?.[r.key]?.userErrors ?? []).some((e: any) => /metafield/i.test(`${e.field ?? ""} ${e.message}`))) r = await send(false);
  userErrors(r.d, r.key);
  const art = r.d[r.key].article as { id: string; handle: string };
  return { ref: art.id, url: `https://${c.external_id}/blogs/${blog.handle}/${art.handle}`, published: a.publish };
}
