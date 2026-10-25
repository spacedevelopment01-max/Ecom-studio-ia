/**
 * Transport des connecteurs de boutiques (protections du lot 9 appliquées aux boutiques de #190) : l'adresse est
 * résolue et contrôlée au moment même de la connexion (anti « DNS rebinding » : jamais une seconde réponse DNS vers
 * une adresse privée), aucune redirection n'est suivie (les accès de la boutique ne partent jamais ailleurs), la
 * réponse est limitée en taille et en durée.
 */
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { isPrivate } from "../../engine/import-link";
import { L } from "../../i18n-server";

const allowLocal = () => process.env.STORE_CONNECT_ALLOW_LOCAL === "1" && process.env.NODE_ENV !== "production";

function storeLookup(hostname: string, options: any, callback: (...args: any[]) => void) {
  const opts = typeof options === "number" ? { family: options } : (options ?? {});
  dns.lookup(hostname, { all: true, family: opts.family || 0 }).then((list) => {
    if (!list.length || (!allowLocal() && list.some((a) => isPrivate(a.address)))) {
      const err: NodeJS.ErrnoException = new Error(L("Cette adresse ne pointe pas vers une boutique publique.", "This address does not point to a public store."));
      err.code = "EPRIVATEADDR";
      return callback(err);
    }
    if (opts.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  }).catch((e) => callback(e));
}

export type StoreTransportLimits = { maxBytes: number; timeoutMs: number };
export const STORE_TRANSPORT_LIMITS: StoreTransportLimits = { maxBytes: 25_000_000, timeoutMs: 60_000 };

/** `fetch` des connecteurs : mêmes appels, avec les contrôles ci-dessus. */
export function storeFetch(limits: StoreTransportLimits = STORE_TRANSPORT_LIMITS): typeof fetch {
  return (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const req = new Request(input, { ...init, redirect: "manual" });
    const u = new URL(req.url);
    if (u.protocol !== "https:" && !(allowLocal() && u.protocol === "http:")) throw new Error(L("L'adresse de la boutique doit commencer par https://.", "The store address must start with https://."));
    const body = req.body ? Buffer.from(await req.arrayBuffer()) : null;
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    if (body) headers["content-length"] = String(body.length);
    headers["accept-encoding"] = "gzip, deflate, br";
    return new Promise<Response>((resolve, reject) => {
      const mod = u.protocol === "https:" ? https : http;
      let done = false;
      const fail = (e: Error) => { if (!done) { done = true; clearTimeout(timer); r.destroy(); reject(e); } };
      const r = mod.request(u, { method: req.method, headers, lookup: storeLookup as any }, (res) => {
        const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream: NodeJS.ReadableStream = enc === "gzip" ? res.pipe(zlib.createGunzip()) : enc === "deflate" ? res.pipe(zlib.createInflate()) : enc === "br" ? res.pipe(zlib.createBrotliDecompress()) : res;
        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (c: Buffer) => {
          size += c.length;
          if (size > limits.maxBytes) return fail(new Error(L("Réponse de la boutique trop volumineuse.", "Store response too large.")));
          chunks.push(c);
        });
        stream.on("error", (e) => fail(e as Error));
        stream.on("end", () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          const status = res.statusCode ?? 0;
          // Redirection : jamais suivie, signalée comme une erreur de la boutique.
          if (status >= 300 && status < 400) return reject(new Error(L("La boutique a répondu par une redirection : adresse refusée.", "The store answered with a redirect: address refused.")));
          const h = new Headers();
          for (const [k, v] of Object.entries(res.headers)) if (v !== undefined && k !== "content-encoding" && k !== "content-length") h.set(k, Array.isArray(v) ? v.join(", ") : v);
          resolve(new Response(status === 204 || status === 304 ? null : new Uint8Array(Buffer.concat(chunks)), { status, headers: h }));
        });
      });
      const timer = setTimeout(() => fail(new Error(L("La boutique ne répond pas (délai dépassé).", "The store did not answer (timed out)."))), limits.timeoutMs);
      r.on("error", (e) => fail(e));
      if (body) r.write(body);
      r.end();
    });
  }) as typeof fetch;
}
