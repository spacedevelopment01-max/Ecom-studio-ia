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
import type { ThemeSpec } from "../theme/spec";
import type { Connection } from "../social/publish";

const version = () => getSetting("shopify.apiVersion") || "2025-07";

async function gql(c: Connection, query: string, variables: Record<string, unknown> = {}) {
  const shop = c.external_id;
  const r = await fetch(`https://${shop}/admin/api/${version()}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": decrypt(c.access_token)! },
    body: JSON.stringify({ query, variables }),
  });
  if (r.status === 401 || r.status === 403) throw new PermanentError("Shopify refuse l'accès : reconnectez la boutique (autorisations manquantes).");
  const j: any = await r.json();
  if (j.errors) throw new Error(`Shopify : ${JSON.stringify(j.errors).slice(0, 300)}`);
  return j.data;
}

function userErrors(d: any, key: string) {
  const errs = d?.[key]?.userErrors ?? [];
  if (errs.length) throw new Error(`Shopify : ${errs.map((e: any) => e.message).join(" ; ")}`);
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
  if (!up.ok && up.status !== 201 && up.status !== 204) throw new Error(`Envoi d'image vers Shopify échoué (${up.status}).`);
  return t.resourceUrl;
}

export async function pushProduct(c: Connection, spec: ThemeSpec): Promise<{ productId: string; handle: string }> {
  const p = spec.store.product;
  if (p.price === null) throw new UserFacingError("Renseignez le prix du produit avant de l'envoyer à Shopify.");
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
  const d = await gql(c, `mutation($input: ProductSetInput!){ productSet(synchronous: true, input: $input){ product{ id handle } userErrors{ field message } } }`, { input });
  userErrors(d, "productSet");
  return { productId: d.productSet.product.id, handle: d.productSet.product.handle };
}

export async function pushPages(c: Connection, spec: ThemeSpec) {
  const created: string[] = [];
  for (const page of spec.store.pages) {
    const d = await gql(c, `mutation($page: PageCreateInput!){ pageCreate(page: $page){ page{ id handle } userErrors{ field message code } } }`, {
      page: { title: page.title, handle: page.handle, body: page.body_html || "<p></p>", templateSuffix: page.template_suffix, isPublished: true },
    });
    const errs = d?.pageCreate?.userErrors ?? [];
    if (errs.length && !errs.some((e: any) => /taken|already/i.test(e.message))) throw new Error(`Page ${page.title} : ${errs.map((e: any) => e.message).join(" ; ")}`);
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
  if (!isPublicAppUrl()) throw new UserFacingError("Shopify doit télécharger le thème depuis une adresse publique HTTPS. Définissez l'adresse publique du studio dans l'administration, ou importez le ZIP manuellement.");
  const src = `${appUrl()}/api/public/theme/${signMedia("theme", `${projectId}:${versionId}`, 3600)}/theme.zip`;
  const d = await gql(c, `mutation($source: URL!, $name: String){ themeCreate(source: $source, name: $name, role: UNPUBLISHED){ theme{ id name processing } userErrors{ field message } } }`, { source: src, name: name.slice(0, 50) });
  userErrors(d, "themeCreate");
  return { themeId: d.themeCreate.theme.id as string, editorUrl: `https://${c.external_id}/admin/themes/${String(d.themeCreate.theme.id).split("/").pop()}/editor` };
}
