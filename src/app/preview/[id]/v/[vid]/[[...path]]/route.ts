/**
 * Aperçu de la boutique : exécute les fichiers du thème compilé (ceux du ZIP)
 * avec LiquidJS. Gère pages, médias, polices et panier de démonstration.
 */
import fs from "node:fs";
import { HttpError, currentUser, ownedProject } from "@/lib/auth";
import { handle } from "@/lib/http";
import { currentTheme, themeVersion } from "@/lib/projects";
import { compileTheme, importedBinary, themeAssetBinary } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import { fontFilePath, renderNamedSections, renderPage, variantId, type PreviewCartLine } from "@/lib/theme/render";
import { storeProducts } from "@/lib/theme/spec";
import { previewTools } from "@/lib/theme/preview-tools";
import { L, uiLang } from "@/lib/i18n-server";
import { PREVIEW_SANDBOX_CSP, previewCors, previewSegment, splitPreviewSegment, verifyPreview } from "@/lib/theme/preview-access";
import type { ThemeSpec } from "@/lib/theme/spec";

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
function variantTable(spec: ThemeSpec) {
  const map = new Map<number, { title: string; price: number }>();
  storeProducts(spec).forEach((p, pi) => {
    const variants = p.variants.length ? p.variants : [{ title: "Default Title", options: ["Default Title"], price: p.price, available: true }];
    variants.forEach((v, vi) => map.set(variantId(pi, vi), { title: v.title === "Default Title" ? p.title : `${p.title} - ${v.title}`, price: v.price ?? p.price ?? 0 }));
  });
  return map;
}
async function writeCart(id: string, cart: PreviewCartLine[]) {
  carts.delete(id);
  carts.set(id, cart.filter((l) => l.quantity > 0).slice(0, 20));
  if (carts.size > 500) carts.delete(carts.keys().next().value!);
}

function cartJson(spec: ThemeSpec, cart: PreviewCartLine[]) {
  const table = variantTable(spec);
  const items = cart.filter((l) => table.has(l.variantId)).map((l, i) => {
    const v = table.get(l.variantId)!;
    return { key: `${l.variantId}:${i}`, id: l.variantId, quantity: l.quantity, title: v.title, price: v.price, final_line_price: v.price * l.quantity };
  });
  return { item_count: items.reduce((s, x) => s + x.quantity, 0), items, total_price: items.reduce((s, x) => s + x.final_line_price, 0), currency: "EUR" };
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
  if (!res.headers.has("Content-Security-Policy")) res.headers.set("Content-Security-Policy", PREVIEW_SANDBOX_CSP);
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
  const cart = await readCart(id);
  if (path === "/cart.js" || (path === "/cart" && req.headers.get("accept")?.includes("application/json"))) return Response.json(cartJson(spec, cart));
  if (url.searchParams.get("sections")) return Response.json(await sectionsFor(spec, base, cart, url.searchParams.get("sections")));
  const r = await renderPage({ spec, base, cart }, path, url.searchParams);
  const html = url.searchParams.get("es_raw") === "1" ? r.html : r.html.replace("</body>", `${previewTools(uiLang(), spec.store.business)}</body>`);
  return new Response(html, { status: r.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": PREVIEW_SANDBOX_CSP, "Referrer-Policy": "no-referrer" } });
}

async function post(req: Request, ctx: P): Promise<Response> {
  const { id, spec, segs, base } = await load(req, ctx);
  const path = "/" + segs.join("/");
  let cart = await readCart(id);
  const ct = req.headers.get("content-type") ?? "";
  const data: Record<string, any> = ct.includes("application/json") ? await req.json() : Object.fromEntries((await req.formData()).entries());
  const table = variantTable(spec);
  if (path === "/cart/add" || path === "/cart/add.js") {
    const requested = Number(data.id ?? data["items[0][id]"] ?? 1000);
    const vid = table.has(requested) ? requested : 1000;
    const qty = Math.max(1, Math.min(99, Number(data.quantity ?? 1)));
    const line = cart.find((l) => l.variantId === vid);
    if (line) line.quantity += qty;
    else cart.push({ variantId: vid, quantity: qty });
  } else if (path === "/cart/change" || path === "/cart/change.js") {
    const key = String(data.id ?? data.line ?? "");
    const qty = Math.max(0, Number(data.quantity ?? 0));
    // Clé « variante:rang », identifiant de variante, ou numéro de ligne (1, 2, …).
    const n = Number(key);
    const vid = key.includes(":") ? Number(key.split(":")[0]) : n >= 1 && n < 100 ? cart[n - 1]?.variantId : n;
    cart = cart.map((l) => (l.variantId === vid ? { ...l, quantity: qty } : l));
  } else if (path === "/cart/update" || path === "/cart/update.js") {
    const updates = Object.entries(data).filter(([k]) => k.startsWith("updates")).map(([, v]) => Number(v));
    cart = cart.map((l, i) => ({ ...l, quantity: updates[i] ?? l.quantity }));
  } else {
    return new Response(L("Action d'aperçu non prise en charge", "Preview action not supported"), { status: 404 });
  }
  await writeCart(id, cart);
  const sections = await sectionsFor({ ...spec }, base, cart, data.sections ?? null);
  if (ct.includes("application/json") || req.headers.get("accept")?.includes("application/json") || path.endsWith(".js") || data.sections) {
    return Response.json({ ...cartJson(spec, cart), sections });
  }
  return new Response(null, { status: 303, headers: { Location: `${base}/cart` } });
}
