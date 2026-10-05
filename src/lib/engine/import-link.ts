/**
 * Import d'une fiche produit ou d'un site : source d'information et
 * d'inspiration uniquement. Protections : http(s) seulement, adresses
 * privées refusées (SSRF), taille et délai limités, redirections vérifiées.
 * Le texte extrait est transmis à l'IA comme donnée, jamais comme consigne.
 */
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import { C, L } from "../i18n-server";

export type LinkImport = {
  url: string;
  title: string;
  description: string;
  text: string;
  images: string[];
  product: { name?: string; brand?: string; description?: string; price?: number; currency?: string; images?: string[]; variants?: { title: string; price?: number }[]; sku?: string } | null;
  platform: string | null;
};

/** Adresse IPv4 (texte) → 4 octets, ou null. */
function v4bytes(ip: string): number[] | null {
  if (!net.isIPv4(ip)) return null;
  return ip.split(".").map(Number);
}

/** Adresse IPv6 (texte, éventuellement avec IPv4 finale) → 16 octets, ou null. */
function v6bytes(ip: string): number[] | null {
  let v = ip.toLowerCase().replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  if (!net.isIPv6(v)) return null;
  const tail = v.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const b = v4bytes(tail[1]);
    if (!b) return null;
    v = v.slice(0, -tail[1].length) + `${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const [head, rest] = v.split("::");
  const h = head ? head.split(":") : [];
  const r = rest !== undefined ? (rest ? rest.split(":") : []) : [];
  const groups = rest !== undefined ? [...h, ...Array(8 - h.length - r.length).fill("0"), ...r] : h;
  if (groups.length !== 8) return null;
  return groups.flatMap((g) => {
    const n = parseInt(g || "0", 16);
    return [n >> 8, n & 255];
  });
}

function privateV4([a, b, c]: number[]) {
  return (
    a === 0 || // « ce réseau »
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // lien local (métadonnées cloud)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // bancs de test
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multidiffusion, réservé, diffusion
  );
}

/**
 * Adresse non publique (anti-SSRF). Les adresses IPv4 encapsulées en IPv6 (`::ffff:a9fe:a9fe`, NAT64 `64:ff9b::`,
 * compatibles `::a.b.c.d`, 6to4 `2002::`) sont ramenées à leur IPv4 avant le test, quelle que soit leur écriture.
 */
export function isPrivate(ip: string): boolean {
  const b4 = v4bytes(ip);
  if (b4) return privateV4(b4);
  const b = v6bytes(ip);
  if (!b) return true; // illisible : refusé
  const zero = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);
  // ::/128, ::1, ::ffff:0:0/96 (IPv4 encapsulée), ::/96 (IPv4 compatible)
  if (zero(0, 10) && ((b[10] === 0xff && b[11] === 0xff) || (b[10] === 0 && b[11] === 0))) {
    if (b[10] === 0 && zero(12, 15) && b[15] <= 1) return true; // :: et ::1
    return privateV4(b.slice(12, 16));
  }
  // NAT64 64:ff9b::/96 et 64:ff9b:1::/48 : IPv4 traduite
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) return true;
  // 6to4 2002::/16 : IPv4 dans les octets 2 à 5
  if (b[0] === 0x20 && b[1] === 0x02) return privateV4(b.slice(2, 6));
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true; // Teredo
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // documentation
  if (b[0] === 0x01 && b[1] === 0x00 && zero(2, 8)) return true; // 100::/64 (rejet)
  if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 (adresses uniques locales)
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 (lien local)
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0xc0) return true; // fec0::/10 (site local, obsolète)
  if (b[0] === 0xff) return true; // multidiffusion
  return false;
}

const allowLocal = () => process.env.SITE_IMPORT_ALLOW_LOCAL === "1" && process.env.NODE_ENV !== "production";

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(L("Lien invalide.", "Invalid link."));
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error(L("Seuls les liens http et https sont acceptés.", "Only http and https links are accepted."));
  if (u.username || u.password) throw new Error(L("Les liens contenant des identifiants sont refusés.", "Links containing credentials are not allowed."));
  const host = u.hostname.replace(/^\[|\]$/g, "");
  // Sites de démonstration locaux (tests/fixtures/sites, servis par scripts/serve-site-fixtures.ts) :
  // une adresse locale n'est acceptée QUE si le drapeau explicite est posé ET hors production.
  // Sans ces deux conditions, la protection anti-SSRF s'applique normalement.
  if (allowLocal()) return u;
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (!addrs.length || addrs.some(isPrivate)) throw new Error(L("Ce lien pointe vers une adresse privée : import refusé.", "This link points to a private address: import refused."));
  return u;
}

/**
 * Résolution DNS vérifiée au moment même de la connexion (anti « DNS rebinding ») : la connexion part vers
 * l'adresse contrôlée, jamais vers une seconde réponse DNS différente. L'en-tête Host et le nom TLS restent ceux du lien.
 */
export function checkedLookup(hostname: string, options: any, callback: (...args: any[]) => void) {
  const opts = typeof options === "number" ? { family: options } : (options ?? {});
  dns
    .lookup(hostname, { all: true, family: opts.family || 0 })
    .then((list) => {
      const ok = allowLocal() ? list : list.filter((a) => !isPrivate(a.address));
      if (!list.length || ok.length !== list.length) {
        const err: NodeJS.ErrnoException = new Error(L("Ce lien pointe vers une adresse privée : import refusé.", "This link points to a private address: import refused."));
        err.code = "EPRIVATEADDR";
        return callback(err);
      }
      if (opts.all) return callback(null, ok);
      return callback(null, ok[0].address, ok[0].family);
    })
    .catch((e) => callback(e));
}

type RawResponse = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };

/** Une requête GET (sans suivre les redirections), connexion à l'adresse vérifiée, taille et délai limités. */
function getOnce(u: URL, headers: Record<string, string>, maxBytes: number, timeoutMs = 15_000): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, { method: "GET", headers: { ...headers, "Accept-Encoding": "gzip, deflate, br" }, lookup: checkedLookup as any, timeout: timeoutMs }, (res) => {
      const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
      const stream: NodeJS.ReadableStream = enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
      const chunks: Buffer[] = [];
      let size = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) });
      };
      const timer = setTimeout(() => {
        req.destroy();
        finish();
      }, timeoutMs);
      stream.on("data", (c: Buffer) => {
        if (done) return;
        size += c.length;
        if (size > maxBytes) {
          req.destroy();
          return finish();
        }
        chunks.push(c);
      });
      stream.on("end", finish);
      stream.on("error", (e) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(e);
      });
    });
    req.on("timeout", () => req.destroy(new Error(L("Délai dépassé.", "Timed out."))));
    req.on("error", reject);
    req.end();
  });
}

export async function safeFetch(raw: string, opts: { maxBytes?: number; accept?: string } = {}): Promise<{ url: string; status: number; type: string; body: Buffer }> {
  let url = raw;
  for (let hop = 0; hop < 5; hop++) {
    const u = await assertPublicUrl(url);
    const r = await getOnce(
      u,
      { "User-Agent": "Mozilla/5.0 (compatible; EcomStudioIA/1.0; +analyse de fiche produit)", Accept: opts.accept ?? "text/html,application/json;q=0.9,*/*;q=0.5", "Accept-Language": C("fr-FR,fr;q=0.9,en;q=0.6", "en-US,en;q=0.9,fr;q=0.6") },
      opts.maxBytes ?? 3_000_000,
    );
    const location = r.headers.location;
    if (r.status >= 300 && r.status < 400 && location) {
      url = new URL(Array.isArray(location) ? location[0] : location, u).toString();
      continue;
    }
    return { url: u.toString(), status: r.status, type: String(r.headers["content-type"] ?? ""), body: r.body };
  }
  throw new Error(L("Trop de redirections.", "Too many redirects."));
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
  if (page.status >= 400) throw new Error(L(`La page a répondu ${page.status}. Vérifiez le lien ou décrivez le produit.`, `The page responded with ${page.status}. Check the link or describe the product.`));
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
