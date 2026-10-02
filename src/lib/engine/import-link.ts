/**
 * Import d'une fiche produit ou d'un site : source d'information et
 * d'inspiration uniquement. Protections : http(s) seulement, adresses
 * privées refusées (SSRF), taille et délai limités, redirections vérifiées.
 * Le texte extrait est transmis à l'IA comme donnée, jamais comme consigne.
 */
import dns from "node:dns/promises";
import net from "node:net";

export type LinkImport = {
  url: string;
  title: string;
  description: string;
  text: string;
  images: string[];
  product: { name?: string; brand?: string; description?: string; price?: number; currency?: string; images?: string[]; variants?: { title: string; price?: number }[]; sku?: string } | null;
  platform: string | null;
};

function isPrivate(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Lien invalide.");
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Seuls les liens http et https sont acceptés.");
  if (u.username || u.password) throw new Error("Les liens contenant des identifiants sont refusés.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (!addrs.length || addrs.some(isPrivate)) throw new Error("Ce lien pointe vers une adresse privée : import refusé.");
  return u;
}

export async function safeFetch(raw: string, opts: { maxBytes?: number; accept?: string } = {}): Promise<{ url: string; status: number; type: string; body: Buffer }> {
  let url = raw;
  for (let hop = 0; hop < 5; hop++) {
    const u = await assertPublicUrl(url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const r = await fetch(u, {
      redirect: "manual",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EcomStudioIA/1.0; +analyse de fiche produit)", Accept: opts.accept ?? "text/html,application/json;q=0.9,*/*;q=0.5", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.6" },
    }).finally(() => clearTimeout(timer));
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      url = new URL(r.headers.get("location")!, u).toString();
      continue;
    }
    const max = opts.maxBytes ?? 3_000_000;
    const reader = r.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > max) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    return { url: u.toString(), status: r.status, type: r.headers.get("content-type") ?? "", body: Buffer.concat(chunks) };
  }
  throw new Error("Trop de redirections.");
}

const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

function meta(html: string, name: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag ? decode(tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "") : "";
}

function textOf(html: string) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function jsonLdProduct(html: string): LinkImport["product"] {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  for (const b of blocks) {
    try {
      const data = JSON.parse(b.trim());
      const items = (Array.isArray(data) ? data : data["@graph"] ?? [data]) as any[];
      const p = items.find((x) => x && (x["@type"] === "Product" || (Array.isArray(x["@type"]) && x["@type"].includes("Product"))));
      if (!p) continue;
      const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers?.offers?.[0] ?? p.offers;
      const imgs = (Array.isArray(p.image) ? p.image : p.image ? [p.image] : []).map((i: any) => (typeof i === "string" ? i : i?.url)).filter(Boolean);
      return {
        name: p.name,
        brand: typeof p.brand === "string" ? p.brand : p.brand?.name,
        description: p.description ? textOf(String(p.description)) : undefined,
        price: offer?.price ? Math.round(Number(offer.price) * 100) : undefined,
        currency: offer?.priceCurrency,
        images: imgs,
        sku: p.sku,
      };
    } catch {
      /* JSON-LD invalide : ignoré */
    }
  }
  return null;
}

export async function importLink(raw: string): Promise<LinkImport> {
  const page = await safeFetch(raw);
  if (page.status >= 400) throw new Error(`La page a répondu ${page.status}. Vérifiez le lien ou décrivez le produit.`);
  const html = page.body.toString("utf8");
  const base = new URL(page.url);
  const abs = (s: string) => {
    try {
      return new URL(s.startsWith("//") ? `https:${s}` : s, base).toString();
    } catch {
      return "";
    }
  };
  let product = jsonLdProduct(html);
  let platform: string | null = /cdn\.shopify\.com|Shopify\.theme/i.test(html) ? "shopify" : /woocommerce/i.test(html) ? "woocommerce" : /prestashop/i.test(html) ? "prestashop" : /wix\.com|wixstatic/i.test(html) ? "wix" : /squarespace/i.test(html) ? "squarespace" : null;

  // Fiche Shopify : le point d'accès public « .js » donne les variantes et images.
  const m = base.pathname.match(/\/products\/([^/?#]+)/);
  if (platform === "shopify" && m) {
    try {
      const js = await safeFetch(new URL(`/products/${m[1]}.js`, base).toString(), { accept: "application/json" });
      if (js.status === 200) {
        const j = JSON.parse(js.body.toString("utf8"));
        product = {
          name: j.title,
          brand: j.vendor,
          description: textOf(j.description ?? ""),
          price: j.price,
          currency: undefined,
          images: (j.images ?? []).map((s: string) => abs(s)),
          variants: (j.variants ?? []).map((v: any) => ({ title: v.title, price: v.price })),
          sku: j.variants?.[0]?.sku,
        };
      }
    } catch {
      /* repli sur les données de la page */
    }
  }
  const ogImages = [...html.matchAll(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/gi)].map((x) => abs(decode(x[1])));
  const images = [...new Set([...(product?.images ?? []).map(abs), ...ogImages])].filter((s) => /^https?:/.test(s)).slice(0, 8);
  return {
    url: page.url,
    title: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? ""),
    description: meta(html, "description") || meta(html, "og:description"),
    text: textOf(html).slice(0, 20000),
    images,
    product,
    platform,
  };
}

/** Télécharge une image importée (taille limitée, type vérifié). */
export async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const r = await safeFetch(url, { maxBytes: 15_000_000, accept: "image/*" });
    if (r.status !== 200 || !/^image\//.test(r.type)) return null;
    return r.body;
  } catch {
    return null;
  }
}
