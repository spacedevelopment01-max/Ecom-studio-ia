/**
 * Aperçu de la boutique : exécute les fichiers du thème compilé (ceux du ZIP)
 * avec LiquidJS. Gère pages, médias, polices et panier de démonstration.
 */
import fs from "node:fs";
import { recordPreviewContact } from "@/lib/theme/preview-contact";
import { HttpError, currentUser, ownedProject } from "@/lib/auth";
import { handle } from "@/lib/http";
import { currentTheme, themeVersion } from "@/lib/projects";
import { compileTheme, importedBinary, themeAssetBinary } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import { fontFilePath, renderNamedSections, renderPage, variantId, type PreviewCartLine } from "@/lib/theme/render";
import { addOfferToCart, reconcileOfferCart, purchaseErrorMessage, rebindOfferLines } from "@/lib/theme/purchase-offers";
import { storeProducts } from "@/lib/theme/spec";
import { previewTools, stockBadgeTool } from "@/lib/theme/preview-tools";
import { stockPhotoLabel, stockPhotosInTheme } from "@/lib/theme/stock-notice";
import { getAsset } from "@/lib/library";
import { L, uiLang } from "@/lib/i18n-server";
import { previewCsp, previewCors, previewSegment, splitPreviewSegment, verifyPreview } from "@/lib/theme/preview-access";
import type { ThemeSpec } from "@/lib/theme/spec";
import { one } from "@/lib/db";
import { DIRECTIONS, type DirectionId } from "@/lib/theme/directions";
import { composedDirectionSpec } from "@/lib/theme/direction-thumb";
import { modelById, previewModelSpec } from "@/lib/theme/page-templates";
import { loadProject } from "@/lib/projects";

export const runtime = "nodejs";

type P = { params: Promise<{ id: string; vid: string; path?: string[] }> };

/**
 * Accès : clé d'aperçu signée dans l'adresse (« <version>~<clé> », voir preview-access.ts), seule possible depuis
 * l'aperçu cloisonné ; sinon session du studio, puis redirection vers l'adresse avec clé.
 */
async function load(req: Request, ctx: P) {
  const { id, vid: seg, path } = await ctx.params;
  const { vid, token } = splitPreviewSegment(seg);
  let redirect: string | null = null;
  if (!token || !verifyPreview(token, id)) {
    const user = await currentUser();
    if (!user) throw new HttpError(401, L("Connexion requise.", "Sign-in required."));
    ownedProject(user, id);
    const url = new URL(req.url);
    redirect = `/preview/${id}/v/${previewSegment(vid, user.id, id)}${path?.length ? `/${path.map(encodeURIComponent).join("/")}` : "/"}${url.search}`;
  }
  // « dir-<direction> » : la boutique du projet composée dans une autre direction (vignettes de l'onglet Marque), rien d'enregistré.
  if (vid.startsWith("dir-")) {
    const d = vid.slice(4);
    if (!DIRECTIONS.some((x) => x.id === d) || !one("SELECT 1 FROM projects WHERE id = ? AND brand_json IS NOT NULL AND brand_json != 'null'", id)) throw new HttpError(404, L("Direction introuvable.", "Direction not found."));
    const spec = await composedDirectionSpec(id, d as DirectionId, currentTheme(id)?.spec.language ?? uiLang());
    return { id, vid, spec, segs: path ?? [], base: `/preview/${id}/v/${seg}`, redirect };
  }
  // « model-<modèle> » : un modèle de page appliqué à une copie du site du projet (aperçu, rien d'enregistré).
  if (vid.startsWith("model-")) {
    const model = modelById(vid.slice(6));
    const cur = currentTheme(id);
    if (!model || !cur) throw new HttpError(404, L("Modèle introuvable.", "Template not found."));
    const q = new URL(req.url).searchParams;
    const r = previewModelSpec(cur.spec as ThemeSpec, loadProject(id), model, { productHandle: q.get("produit") ?? undefined, service: q.get("prestation") ?? undefined });
    // Le chemin demandé est celui de la page du modèle ; les liens internes de l'aperçu mènent au site actuel.
    return { id, vid, spec: r.spec, segs: path?.length ? path : r.path.split("/").filter(Boolean), base: `/preview/${id}/v/${seg}`, redirect };
  }
  const v = vid === "current" ? currentTheme(id) : themeVersion(id, vid);
  if (!v) throw new HttpError(404, L("Version de boutique introuvable.", "Store version not found."));
  return { id, vid, spec: v.spec as ThemeSpec, segs: path ?? [], base: `/preview/${id}/v/${seg}`, redirect };
}

/**
 * Panier de démonstration, gardé côté serveur par projet : l'aperçu cloisonné (origine opaque) ne peut
 * ni lire ni écrire de cookie.
 */
const carts: Map<string, PreviewCartLine[]> = ((globalThis as { __esPreviewCarts?: Map<string, PreviewCartLine[]> }).__esPreviewCarts ??= new Map());
async function readCart(id: string): Promise<PreviewCartLine[]> {
  return (carts.get(id) ?? []).map((l) => ({ ...l }));
}

/** Toutes les variantes de la boutique, par identifiant global. */
function variantTable(spec: ThemeSpec, base = "") {
  const map = new Map<number, { title: string; productTitle: string; variantTitle: string; price: number; image: string | null }>();
  storeProducts(spec).forEach((p, pi) => {
    const variants = p.variants.length ? p.variants : [{ title: "Default Title", options: ["Default Title"], price: p.price, available: true }];
    // Visuel de la variante (même règle que le rendu des pages) : son média propre, sinon l'image du produit.
    variants.forEach((v, vi) => { const file = (v.image && p.images.includes(v.image) ? v.image : null) ?? p.images[0] ?? null; map.set(variantId(pi, vi), { title: v.title === "Default Title" ? p.title : `${p.title} - ${v.title}`, productTitle: p.title, variantTitle: v.title, price: v.price ?? p.price ?? 0, image: file ? `${base}/assets/${file}` : null }); });
  });
  return map;
}
async function writeCart(id: string, cart: PreviewCartLine[]) {
  carts.delete(id);
  carts.set(id, cart.filter((l) => l.quantity > 0).slice(0, 20));
  if (carts.size > 500) carts.delete(carts.keys().next().value!);
}

function cartJson(spec: ThemeSpec, cart: PreviewCartLine[], base = "") {
  const table = variantTable(spec, base);
  const items = cart.filter((l) => table.has(l.variantId)).map((l, i) => {
    const v = table.get(l.variantId)!;
    return { key: l.offerGroup ? `${l.offerGroup}:${l.variantId}:${l.gift ? "gift" : "item"}` : `${l.variantId}:${i}`, id: l.variantId, quantity: l.quantity, title: v.title, product_title: v.productTitle, variant_title: v.variantTitle, price: v.price, final_line_price: l.finalLinePrice ?? v.price * l.quantity, image: v.image, featured_image: v.image ? { url: v.image, alt: v.title } : null };
  });
  return { item_count: items.reduce((s, x) => s + x.quantity, 0), items, total_price: items.reduce((s, x) => s + x.final_line_price, 0), currency: spec.store.product.currency || "EUR" };
}

async function sectionsFor(spec: ThemeSpec, base: string, cart: PreviewCartLine[], names: string | null) {
  if (!names) return undefined;
  return renderNamedSections({ spec, base, cart }, names.split(",").slice(0, 5), "/");
}

/**
 * En-têtes communs : lecture par le document cloisonné (origine « null ») ; tout fichier ouvert directement
 * (page, SVG d'un thème importé…) reste lui aussi dans le bac à sable.
 */
function withCors(req: Request, res: Response) {
  previewCors(req, res.headers);
  if (!res.headers.has("Content-Security-Policy")) res.headers.set("Content-Security-Policy", previewCsp());
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}

export const OPTIONS = async (req: Request) =>
  new Response(null, {
    status: 204,
    headers: previewCors(req, new Headers({ "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type, Accept, X-Requested-With", "Access-Control-Max-Age": "600" })),
  });

export const GET = handle(async (req: Request, ctx: P) => withCors(req, await get(req, ctx)));
export const POST = handle(async (req: Request, ctx: P) => withCors(req, await post(req, ctx)));

async function get(req: Request, ctx: P): Promise<Response> {
  const { id, spec, segs, base, redirect } = await load(req, ctx);
  if (redirect) return new Response(null, { status: 307, headers: { Location: redirect, "Cache-Control": "no-store" } });
  const url = new URL(req.url);
  const path = "/" + segs.join("/");
  if (segs[0] === "assets") {
    const name = segs.slice(1).join("/");
    const bin = spec.files[name] ? await themeAssetBinary(spec, name, libraryLoader) : importedBinary(spec, name);
    if (bin) {
      let data = bin.data;
      const w = Number(url.searchParams.get("width"));
      if (w && bin.mime.startsWith("image/") && w < 2400) {
        const sharp = (await import("sharp")).default;
        data = await sharp(data).resize({ width: Math.max(80, Math.min(2400, w)), withoutEnlargement: true }).toBuffer();
      }
      return new Response(new Uint8Array(data), { headers: { "Content-Type": bin.mime, "Cache-Control": "private, max-age=600" } });
    }
    const text = compileTheme(spec).get(`assets/${name}`);
    if (text !== undefined) return new Response(text, { headers: { "Content-Type": name.endsWith(".css") ? "text/css; charset=utf-8" : name.endsWith(".js") ? "application/javascript; charset=utf-8" : name.endsWith(".svg") ? "image/svg+xml" : name.endsWith(".json") ? "application/json" : "text/plain", "Cache-Control": "no-cache" } });
    return new Response(L("Fichier introuvable", "File not found"), { status: 404 });
  }
  if (segs[0] === "__fonts") {
    const f = fontFilePath(segs[1] ?? "");
    if (!f) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(fs.readFileSync(f)), { headers: { "Content-Type": "font/ttf", "Cache-Control": "public, max-age=31536000, immutable" } });
  }
  if (path === "/cart/change" && url.searchParams.has("quantity")) {
    return post(new Request(req.url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: url.searchParams.toString() }), ctx);
  }
  let cart: PreviewCartLine[];
  try { cart = reconcileOfferCart(spec, await readCart(id)); } catch (e) { throw new HttpError(422, purchaseErrorMessage(e, spec.language ?? "fr")); }
  if (path === "/cart.js" || (path === "/cart" && req.headers.get("accept")?.includes("application/json"))) return Response.json(cartJson(spec, cart, base));
  if (url.searchParams.get("sections")) return Response.json(await sectionsFor(spec, base, cart, url.searchParams.get("sections")));
  const r = await renderPage({ spec, base, cart }, path, url.searchParams);
  const html = url.searchParams.get("es_raw") === "1" ? r.html : r.html.replace("</body>", `${previewTools(uiLang(), spec.store.business, spec.meta?.demo?.contactTest === true && spec.meta.demo.isDemo === true)}${stockBadgeTool(stockPhotosInTheme(spec, getAsset, uiLang()).map((x) => ({ file: x.file, label: stockPhotoLabel(x.source, uiLang()) })))}</body>`);
  return new Response(html, { status: r.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": previewCsp(), "Referrer-Policy": "no-referrer" } });
}

async function post(req: Request, ctx: P): Promise<Response> {
  const { id, spec, segs, base } = await load(req, ctx);
  const path = "/" + segs.join("/");
  if (path === "/contact") {
    if (Number(req.headers.get("content-length")) > 16000) throw new HttpError(413, "Request too large");
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 16000) throw new HttpError(413, "Request too large");
    let data: unknown;
    try { data = (req.headers.get("content-type") ?? "").includes("application/json") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw)); }
    catch { throw new HttpError(400, "Invalid form"); }
    return Response.json(recordPreviewContact(id, spec, data));
  }
  let cart: PreviewCartLine[];
  try { cart = rebindOfferLines(spec, await readCart(id)); } catch (e) { throw new HttpError(422, purchaseErrorMessage(e, spec.language ?? "fr")); }
  const ct = req.headers.get("content-type") ?? "";
  let data: Record<string, any>;
  if (ct.includes("application/json")) data = await req.json();
  else { const form = await req.formData(); data = Object.fromEntries(form.entries()); if (form.has("updates[]")) data.updates = form.getAll("updates[]").map(Number); }
  const table = variantTable(spec);
  if (path === "/cart/add" || path === "/cart/add.js") {
    try {
      if (data.offer) cart = addOfferToCart(spec, cart, { target: String(data.target ?? ""), offer: String(data.offer), variants: Array.isArray(data.variants) ? data.variants.map(Number) : [] });
      else {
        const items = Array.isArray(data.items) ? data.items : [{ id: data.id ?? data["items[0][id]"], quantity: data.quantity ?? 1 }];
        if (!items.length || items.length > 20) throw new Error("Quantité invalide.");
        for (const item of items) {
          const vid = Number(item.id), qty = Number(item.quantity);
          if (!table.has(vid) || !Number.isSafeInteger(qty) || qty < 1 || qty > 99) throw new Error("Variante ou quantité invalide.");
          const line = cart.find((l) => l.variantId === vid && !l.offerGroup);
          if (line) line.quantity += qty; else cart.push({ variantId: vid, quantity: qty });
        }
      }
    } catch (e) { return Response.json({ description: purchaseErrorMessage(e, spec.language ?? "fr") }, { status: 422 }); }
  } else if (path === "/cart/change" || path === "/cart/change.js") {
    const key = String(data.id ?? data.line ?? ""), qty = Number(data.quantity ?? 0);
    if (!Number.isSafeInteger(qty) || qty < 0 || qty > 99) return Response.json({ description: "Quantité invalide." }, { status: 422 });
    const json = cartJson(spec, cart, base);
    const exact = json.items.findIndex((item) => item.key === key);
    const n = Number(key), index = exact >= 0 ? exact : n >= 1 && n < 100 ? n - 1 : cart.findIndex((l) => l.variantId === n && !l.gift);
    if (cart[index]?.gift) return Response.json({ description: "Le cadeau est recalculé depuis son lot." }, { status: 422 });
    cart = cart.map((l, i) => i === index ? { ...l, quantity: qty } : l);
  } else if (path === "/cart/update" || path === "/cart/update.js" || (path === "/cart" && !Object.hasOwn(data, "checkout"))) {
    const updates = Array.isArray(data.updates) ? data.updates : Object.entries(data).filter(([k]) => k.startsWith("updates")).map(([, v]) => Number(v));
    if (updates.some((v) => !Number.isSafeInteger(v) || v < 0 || v > 99)) return Response.json({ description: "Quantité invalide." }, { status: 422 });
    cart = cart.map((l, i) => ({ ...l, quantity: updates[i] ?? l.quantity }));
  } else {
    return new Response(L("Action d'aperçu non prise en charge", "Preview action not supported"), { status: 404 });
  }
  try { cart = reconcileOfferCart(spec, cart); } catch (e) { return Response.json({ description: purchaseErrorMessage(e, spec.language ?? "fr") }, { status: 422 }); }
  if (cart.length > 20) return Response.json({ description: "Trop de lignes de panier." }, { status: 422 });
  await writeCart(id, cart);
  const sections = await sectionsFor({ ...spec }, base, cart, data.sections ?? null);
  if (ct.includes("application/json") || req.headers.get("accept")?.includes("application/json") || path.endsWith(".js") || data.sections) {
    return Response.json({ ...cartJson(spec, cart, base), sections });
  }
  return new Response(null, { status: 303, headers: { Location: `${base}/cart` } });
}
