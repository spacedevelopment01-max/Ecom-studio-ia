/** Transport d'aperçu : aucune ressource ne requiert le cookie du proxy depuis l'origine opaque. */
import fs from "node:fs";
import { compileTheme, importedBinary, themeAssetBinary } from "./compile";
import { fontFilePath } from "./render";
import { libraryLoader } from "./loader";
import type { ThemeSpec } from "./spec";
import { getSetting } from "../settings";

/** Origine publique de confiance derrière un proxy ; aucun en-tête fourni par le navigateur. */
export function previewParentOrigin(requestOrigin:string):string {
  try { return new URL(getSetting("app.url") || process.env.APP_URL || requestOrigin).origin; }
  catch { return requestOrigin; }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function portablePreview(html: string, spec: ThemeSpec, base: string, parentOrigin: string, fragment=false): Promise<string> {
  parentOrigin=previewParentOrigin(parentOrigin);
  const files = compileTheme(spec);
  const cache = new Map<string, string>();
  const missing = new Set<string>();
  let total = Buffer.byteLength(html);
  async function resource(kind: string, name: string, stack: string[]): Promise<string | null> {
    const key = `${kind}/${name}`;
    if (cache.has(key)) return cache.get(key)!;
    if (stack.includes(key) || stack.length > 8) throw new Error("Dépendance circulaire dans les ressources d’aperçu / Circular preview resource");
    let data: Buffer | undefined, mime = "application/octet-stream";
    if (kind === "__fonts") {
      const f = fontFilePath(name); if (f) { data = fs.readFileSync(f); mime = "font/ttf"; }
    } else {
      const bin = spec.files[name] ? await themeAssetBinary(spec, name, libraryLoader) : importedBinary(spec, name);
      if (bin) { data = bin.data; mime = bin.mime; }
      else if (files.has(`assets/${name}`)) {
        mime = name.endsWith(".css") ? "text/css" : name.endsWith(".js") ? "application/javascript" : name.endsWith(".svg") ? "image/svg+xml" : "text/plain";
        let text = files.get(`assets/${name}`)!;
        // Adaptation de transport de l'aperçu uniquement ; le JavaScript exporté reste identique.
        if(mime==="application/javascript"&&["purchase-offers.js","theme.js"].includes(name)){
          text=text.replace(/window\.location\.assign\(/g,"window.__ecsPreviewNavigate(").replace(/window\.location\.href\s*=\s*routes\.cart\s*;/g,"window.__ecsPreviewNavigate(routes.cart);");
        }
        if (mime === "text/css") {
          // CSS natif et thèmes importés : références relatives aux médias/polices locaux seulement.
          const matches = [...text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)];
          for (const m of matches) {
            if (/^(?:data:|https?:|\/\/|#)/i.test(m[2])) continue;
            const url = new URL(m[2], `https://preview.invalid${base}/assets/${name}`);
            const prefix = `${base}/assets/`;
            if (url.pathname.startsWith(prefix)) {
              const asset = await resource("assets", decodeURIComponent(url.pathname.slice(prefix.length)), [...stack, key]);
              if (asset) text = text.split(m[0]).join(`url("${asset}")`);
            }
          }
        }
        text = await replace(text, [...stack, key]);
        data = Buffer.from(text);
      }
    }
    if (!data) { missing.add(key); return null; }
    total += data.length;
    if (total > 128 * 1048576) throw new Error("Aperçu autonome trop volumineux / Self-contained preview too large");
    const url = `data:${mime};base64,${data.toString("base64")}`;
    cache.set(key, url);
    return url;
  }
  async function replace(text: string, stack: string[] = []) {
    const re = new RegExp(`${escape(base)}/(assets|__fonts)/([\\w%./-]+)(?:\\?[^\\s"'<>)]*)?`, "g");
    const replacements=new Map<string,string>();
    for (const m of [...text.matchAll(re)]) {
      const asset = await resource(m[1], decodeURIComponent(m[2]), stack);
      if (asset) replacements.set(m[0],asset);
    }
    // Une URL sans query peut être le préfixe d'une autre : remplacer une seule fois
    // dans le texte d'origine, sinon un data URI reçoit un suffixe « ?width » invalide.
    return text.replace(re,match=>replacements.get(match)??match);
  }
  html = await replace(html);
  if(fragment)return html;
  if (missing.size) html = html.replace("</body>", `<aside role="status" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:10px;background:#fff4db;color:#472c00;font:13px system-ui">${missing.size} ressource(s) manquante(s) dans ce thème / Missing theme resources. Aucun média de remplacement / No replacement media.</aside></body>`);
  const config = JSON.stringify({ base, parentOrigin }).replace(/</g, "\\u003c");
  return html.replace(/<head(?:\s[^>]*)?>/i, `$&<script>(${previewClient.toString()})(${config})</script>`);
}

/** Exécuté dans l'iframe opaque, jamais exporté. Le parent ne transmet que les routes du même aperçu. */
function previewClient(config: { base: string; parentOrigin: string }) {
  const nativeFetch = window.fetch.bind(window);
  let next = 0;
  const pending = new Map<number, { resolve: (r: Response) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  (window as any).__ecsPreviewNavigate=(target:string)=>{
    const url=new URL(target,location.href);
    if(parent!==window&&url.origin===config.parentOrigin&&url.pathname.startsWith(config.base+"/"))parent.postMessage({channel:"ecs-preview-navigate",url:url.href},config.parentOrigin);
    else window.location.assign(url.href);
  };
  document.addEventListener("click",e=>{
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const anchor=(e.target as Element)?.closest?.("a");
    if(!anchor||anchor.target==="_blank"||anchor.hasAttribute("download")||!anchor.href)return;
    const url=new URL(anchor.href,location.href);
    if(parent!==window&&url.origin===config.parentOrigin&&url.pathname.startsWith(config.base+"/")&&(url.pathname!==location.pathname||url.search!==location.search)){
      e.preventDefault();(window as any).__ecsPreviewNavigate(url.href);
    }
  });
  window.addEventListener("message", e => {
    if (e.source !== parent || e.origin !== config.parentOrigin || e.data?.channel !== "ecs-preview-response") return;
    const p = pending.get(e.data.id); if (!p) return;
    pending.delete(e.data.id); clearTimeout(p.timer);
    if (e.data.error) p.reject(new Error("Action d’aperçu refusée / Preview action refused"));
    else p.resolve(new Response(e.data.body, { status: e.data.status, headers: { "content-type": e.data.contentType } }));
  });
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href), init);
    const url = new URL(req.url);
    if (url.origin !== config.parentOrigin || !url.pathname.startsWith(config.base + "/")) return nativeFetch(input, init);
    if (parent === window) return nativeFetch(req, { credentials: "include" });
    let body: string | undefined;
    if (!["GET", "HEAD"].includes(req.method)) {
      if (req.headers.get("content-type")?.includes("multipart/form-data")) {
        const fields = await req.formData(); const params = new URLSearchParams();
        for (const [k, v] of fields) { if (typeof v !== "string") throw new Error("Preview files refused"); params.append(k, v); }
        body = params.toString(); req.headers.set("content-type", "application/x-www-form-urlencoded");
      } else body = await req.text();
    }
    const id = ++next;
    return new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("Aperçu : délai dépassé / Preview timeout")); }, 20000);
      pending.set(id, { resolve, reject, timer });
      parent.postMessage({ channel: "ecs-preview-request", id, url: req.url, method: req.method, contentType: req.headers.get("content-type"), accept: req.headers.get("accept"), body }, config.parentOrigin);
    });
  };
}
