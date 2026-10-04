/**
 * Aperçu de la boutique : exécute les fichiers du thème compilé (ceux du ZIP)
 * avec LiquidJS. Gère pages, médias, polices et panier de démonstration.
 */
import fs from "node:fs";
import { cookies } from "next/headers";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { currentTheme, themeVersion } from "@/lib/projects";
import { compileTheme, importedBinary, themeAssetBinary } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import { fontFilePath, renderNamedSections, renderPage, variantId, type PreviewCartLine } from "@/lib/theme/render";
import { storeProducts } from "@/lib/theme/spec";
import { previewTools } from "@/lib/theme/preview-tools";
import { L, uiLang } from "@/lib/i18n-server";
import type { ThemeSpec } from "@/lib/theme/spec";

export const runtime = "nodejs";

type P = { params: Promise<{ id: string; vid: string; path?: string[] }> };

async function load(ctx: P) {
  const user = await requireUser();
  const { id, vid, path } = await ctx.params;
  ownedProject(user, id);
  const v = vid === "current" ? currentTheme(id) : themeVersion(id, vid);
  if (!v) throw new HttpError(404, L("Version de boutique introuvable.", "Store version not found."));
  return { id, vid, spec: v.spec as ThemeSpec, segs: path ?? [], base: `/preview/${id}/v/${vid}` };
}

const CART_COOKIE = (id: string) => `es_cart_${id}`;
async function readCart(id: string): Promise<PreviewCartLine[]> {
  try {
    const raw = JSON.parse((await cookies()).get(CART_COOKIE(id))?.value ?? "[]") as any[];
    // Anciens paniers (un seul produit) : rang de variante → identifiant global.
    return raw.map((l) => ({ variantId: Number(l.variantId ?? 1000 + Number(l.variantIndex ?? 0)), quantity: Number(l.quantity) || 0 }));
  } catch {
    return [];
  }
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
  (await cookies()).set(CART_COOKIE(id), JSON.stringify(cart.filter((l) => l.quantity > 0).slice(0, 20)), { path: `/preview/${id}`, httpOnly: true, sameSite: "lax" });
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

export const GET = handle(async (req: Request, ctx: P) => {
  const { id, spec, segs, base } = await load(ctx);
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
  return new Response(html, { status: r.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN" } });
});

export const POST = handle(async (req: Request, ctx: P) => {
  const { id, spec, segs, base } = await load(ctx);
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
  return Response.redirect(new URL(`${base}/cart`, req.url), 303);
});
