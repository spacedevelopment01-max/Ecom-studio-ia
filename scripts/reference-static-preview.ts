/** Aperçu statique consultable des quatre démonstrations composées dans leur thème de référence (issue #137, mission E) :
 * FRAISE (gummies, boutique spécialisée), ONDE (casque, boutique spécialisée), ORBE (lampe, e-commerce), Atelier Rive
 * (décoration d'intérieur, prestations de services) et SILLON (machine à espresso nomade, boutique spécialisée, issue #148). Toutes les pages sont rendues par les vraies routes d'aperçu du
 * studio et exportées en fichiers HTML relatifs (images, logos, polices, scripts) ; pour les boutiques, le panier de
 * démonstration est pré-calculé : chaque état atteignable depuis l'interface est rendu par le serveur réel et rejoué
 * côté client par un petit script. Aucun paiement, aucun envoi de formulaire, aucune donnée réelle.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/reference-static-preview.ts <dossier-de-sortie> [--cross]
 *   Produit <sortie>/fraise, onde, orbe, rive ; avec --cross, aussi fraise-en-onde et onde-en-fraise (même catégorie :
 *   preuve d'adaptation d'une identité à un autre thème). Les visuels viennent de public/demo/<id>/ (kit privé, hors dépôt).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-static-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Réseau fournisseur interdit"); };
const args = process.argv.slice(2), cross = args.includes("--cross");
// --only=orbe,rive : n'exporter que ces compositions (reprise ciblée).
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").filter(Boolean) ?? null;
const out = path.resolve(args.find((a) => !a.startsWith("--")) ?? "reports/reference-static"); fs.mkdirSync(out, { recursive: true });
const { demoProject } = await import("../tests/demo-fixtures");
// Stories FRAISE / ONDE : un clip de test (mire générée, jamais une vraie vidéo produit) prouve le lecteur, comme au lot 2C.
const testVideo = path.join(out, "clip-test.webm"); try { execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=size=540x960:rate=24", "-t", "8", "-c:v", "libvpx-vp9", "-b:v", "400k", "-an", testVideo], { stdio: "ignore" }); } catch { console.warn("ffmpeg absent : stories sans clip de test"); }
type DemoId = "fraise" | "onde" | "orbe" | "rive" | "sillon";
const { createUser } = await import("../src/lib/auth");
const { saveThemeVersion } = await import("../src/lib/projects"); const { previewSegment } = await import("../src/lib/theme/preview-access");
const { GET, POST } = await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const { runWithLang } = await import("../src/lib/i18n-server");
const { variantId } = await import("../src/lib/theme/render"); const { purchaseConfig } = await import("../src/lib/theme/purchase-offers");
const user = await createUser("reference-static@example.invalid", "isolated-test-only", "Aperçu statique");
const ORIGIN = "http://127.0.0.1";
type Ctx = { params: Promise<{ id: string; vid: string; path: string[] }> };
function ctxFor(url: URL): Ctx { const m = url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/)!; return { params: Promise.resolve({ id: m[1], vid: m[2], path: (m[3] ?? "").split("/").filter(Boolean) }) }; }
async function get(pathAndQuery: string, headers: Record<string, string> = {}) { const url = new URL(pathAndQuery, ORIGIN); return GET(new Request(url, { headers }), ctxFor(url)); }
async function post(pathname: string, body: string, contentType: string) { const url = new URL(pathname, ORIGIN); return POST(new Request(url, { method: "POST", headers: { "content-type": contentType, accept: "application/json" }, body }), ctxFor(url)); }

const SHIM = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "lot2c-static-demo.js"), "utf8");
const runs: { id: DemoId; direction: DemoId; name: string }[] = [
  { id: "fraise", direction: "fraise", name: "fraise" }, { id: "onde", direction: "onde", name: "onde" }, { id: "orbe", direction: "orbe", name: "orbe" }, { id: "rive", direction: "rive", name: "rive" }, { id: "sillon", direction: "sillon", name: "sillon" },
  ...(cross ? [{ id: "fraise" as DemoId, direction: "onde" as DemoId, name: "fraise-en-onde" }, { id: "onde" as DemoId, direction: "fraise" as DemoId, name: "onde-en-fraise" }] : []),
];
const summary: Record<string, unknown>[] = [];
try {
  for (const run of runs.filter((r) => !only || only.includes(r.name))) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const f = await demoProject(user.id, run.id, run.direction === run.id ? { testVideo: fs.existsSync(testVideo) ? testVideo : undefined } : { direction: run.direction }), { spec, pid, services } = f, version = saveThemeVersion(pid, spec, "Aperçu statique", "user");
    const base = `/preview/${pid}/v/${previewSegment(version.id, user.id, pid)}`, dir = path.join(out, run.name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(path.join(dir, "assets"), { recursive: true }); fs.mkdirSync(path.join(dir, "fonts")); if (!services) fs.mkdirSync(path.join(dir, "panier"));
    const title = f.demo.brand, productHandle = services ? null : spec.store.product.handle, productTitle = services ? f.demo.brand : spec.store.product.title;
    const pageHandles = spec.store.pages.map((p) => p.handle);
    // Correspondance route → fichier plat (liens relatifs, aucun sous-dossier pour les pages).
    const fileFor = (p: string): string => {
      const [pathname] = p.split("?");
      if (pathname === "" || pathname === "/") return "accueil.html";
      if (pathname.startsWith("/assets/")) return pathname.slice(1);
      if (pathname.startsWith("/__fonts/")) return "fonts/" + pathname.slice(9);
      if (productHandle && pathname === `/products/${productHandle}`) return "produit.html";
      if (!services && pathname.startsWith("/collections/")) return "boutique.html";
      if (pathname.startsWith("/pages/")) { const h = pathname.slice(7); return pageHandles.includes(h) ? `page-${h}.html` : "404.html"; }
      if (!services && pathname === "/cart") return "panier.html";
      if (!services && (pathname === "/cart/add" || pathname === "/cart/add.js")) return "panier.html/add";
      if (!services && (pathname === "/cart/change" || pathname === "/cart/change.js")) return "panier.html/change";
      if (!services && (pathname === "/cart/update" || pathname === "/cart/update.js")) return "panier.html/update";
      if (pathname === "/search") return "recherche.html";
      if (pathname === "/policies" || pathname.startsWith("/policies/")) return pageHandles.includes("mentions-legales") ? "page-mentions-legales.html" : "404.html";
      if (pathname === "/contact") return pageHandles.includes("contact") ? "page-contact.html" : "404.html";
      return "404.html";
    };
    const assets = new Set<string>(), fonts = new Set<string>();
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rewrite = (text: string): string => text.replace(new RegExp(`${esc(base)}((?:/[^"'\\s)<>\\\\]*)?)`, "g"), (_, rest: string) => {
      const file = fileFor(decodeURIComponent(rest || "/").replace(/#.*$/, ""));
      if (file.startsWith("assets/")) assets.add(file.slice(7).split("?")[0]); else if (file.startsWith("fonts/")) fonts.add(file.slice(6));
      const hash = rest.match(/#[^"'\s)<>]*$/)?.[0] ?? ""; const query = rest.includes("?") ? "?" + rest.split("?")[1].replace(/#.*$/, "") : "";
      return (file.startsWith("panier.html/") ? file + query : file.split("?")[0]) + hash;
    });
    const inject = (html: string, extra = "") => html.replace("</body>", `<script>window.__esStaticProduct=${JSON.stringify(productTitle)};</script><script id="es-static-demo">${SHIM}</script>${extra}</body>`);
    async function pageHtml(route: string, status = 200) { const r = await get(`${base}${route}${route.includes("?") ? "&" : "?"}es_raw=1`); assert.equal(r.status, status, `${run.name} ${route} → ${r.status}`); return await r.text(); }
    // Pages.
    const routes: [string, string][] = [["accueil.html", "/"], ...(services ? [] : [["produit.html", `/products/${productHandle}`], ["boutique.html", "/collections/all"]] as [string, string][]), ...pageHandles.map((h) => [`page-${h}.html`, `/pages/${h}`] as [string, string])];
    for (const [file, route] of routes) fs.writeFileSync(path.join(dir, file), inject(rewrite(await pageHtml(route))));
    fs.writeFileSync(path.join(dir, "404.html"), inject(rewrite(await pageHtml("/page-inconnue", 404))));
    const q = encodeURIComponent(productTitle.split(" ")[0]);
    fs.writeFileSync(path.join(dir, "recherche.html"), inject(rewrite(await pageHtml("/search"))));
    fs.writeFileSync(path.join(dir, "recherche-aucun.html"), rewrite(await pageHtml("/search?q=xqzv")));
    fs.writeFileSync(path.join(dir, "recherche-resultat.html"), rewrite(await pageHtml(`/search?q=${q}`)));
    let cartStates = 0;
    if (!services) {
      // Panier : parcours exhaustif des états atteignables depuis l'interface, rendus par le serveur réel.
      type Item = { key: string; id: number; quantity: number; properties?: Record<string, unknown> };
      const cartJson = async () => JSON.parse(await (await get(`${base}/cart.js`, { accept: "application/json" })).text()) as { item_count: number; items: Item[] };
      const clear = async () => { for (let guard = 0; guard < 8; guard++) { const c = await cartJson(); if (!c.items.length) return; for (const item of c.items) if (!item.properties?._es_gift) await post(`${base}/cart/change`, JSON.stringify({ id: item.key, quantity: 0 }), "application/json"); } };
      const stateKey = (c: { items: Item[] }) => c.items.map((i) => `${i.key}x${i.quantity}`).sort().join("|") || "vide";
      const mainSection = Object.values(spec.templates.product.sections).find((sec) => sec.type === "main-product")!, purchase = purchaseConfig(mainSection), vid = variantId(0, 0);
      const adds: { action: string; body: string }[] = purchase?.offers?.length
        ? purchase.offers.map((o) => ({ action: `add:offer:${o.id}`, body: JSON.stringify({ offer: o.id, target: spec.store.product.contentTarget ?? "product:main", variants: Array(o.quantity).fill(vid) }) }))
        : [1, 2, 3].map((n) => ({ action: `add:id:${vid}:${n}`, body: JSON.stringify({ id: vid, quantity: n }) }));
      const states: Record<string, { cart: unknown; drawer: string; page: string }> = {}, edges: Record<string, Record<string, string>> = {}, queue: string[] = [];
      const capture = async (key: string) => { if (states[key]) return; const c = await cartJson(); const sections = JSON.parse(await (await get(`${base}/cart?sections=cart-drawer`)).text()) as Record<string, string>; assert.ok(sections["cart-drawer"], `tiroir non rendu pour ${key}`); const page = await pageHtml("/cart"); states[key] = { cart: JSON.parse(rewrite(JSON.stringify(c))), drawer: rewrite(sections["cart-drawer"] ?? ""), page: inject(rewrite(page).replace("<html", `<html data-static-state="${key}"`)) }; queue.push(key); };
      const MAX_ITEMS = 12, MAX_LINES = 3;
      const pathsTo: Record<string, { action: string; body: string; url: string }[]> = { vide: [] };
      await clear(); await capture("vide");
      while (queue.length) {
        const key = queue.shift()!; const replay = pathsTo[key];
        const replayAll = async () => { await clear(); for (const step of replay) await post(step.url, step.body, "application/json"); assert.equal(stateKey(await cartJson()), key, `rejeu de ${key}`); };
        await replayAll(); const current = await cartJson(); edges[key] = {};
        const candidates: { action: string; body: string; url: string }[] = [];
        if (current.items.length < MAX_LINES) for (const a of adds) candidates.push({ ...a, url: `${base}/cart/add` });
        for (const item of current.items) if (!item.properties?._es_gift) { for (const qty of [...new Set([item.quantity + 1, item.quantity - 1, 0])]) if (qty >= 0) candidates.push({ action: `change:${item.key}:${qty}`, body: JSON.stringify({ id: item.key, quantity: qty }), url: `${base}/cart/change` }); }
        for (const cand of candidates) {
          await replayAll(); const r = await post(cand.url, cand.body, "application/json"); if (r.status !== 200) { edges[key][cand.action] = key; continue; }
          const next = await cartJson(); if (next.item_count > MAX_ITEMS) { edges[key][cand.action] = key; continue; }
          const nk = stateKey(next); edges[key][cand.action] = nk; if (!states[nk]) { pathsTo[nk] = [...replay, cand]; await capture(nk); }
        }
      }
      await clear();
      for (const [key, st] of Object.entries(states)) fs.writeFileSync(path.join(dir, "panier", `${key.replace(/[^a-z0-9]/gi, "_")}.json`), JSON.stringify(st));
      fs.writeFileSync(path.join(dir, "panier", "transitions.json"), JSON.stringify({ edges, files: Object.fromEntries(Object.keys(states).map((k) => [k, `panier/${k.replace(/[^a-z0-9]/gi, "_")}.json`])) }));
      fs.writeFileSync(path.join(dir, "panier.html"), states.vide.page);
      cartStates = Object.keys(states).length;
    }
    // Ressources : images, logos, scripts, feuilles, polices (noms collectés pendant la réécriture, puis dans les CSS).
    const fetched = new Set<string>();
    const pull = async (name: string) => { if (fetched.has(name)) return; fetched.add(name); const r = await get(`${base}/assets/${name}`); if (r.status !== 200) { console.warn(`asset absent : ${name}`); return; } const buf = Buffer.from(await r.arrayBuffer()); if (/\.(css|js)$/.test(name)) { const text = rewrite(buf.toString("utf8")); fs.writeFileSync(path.join(dir, "assets", name), text); for (const m of text.matchAll(/url\(\s*["']?(?!data:|https?:|\/\/)([^"')?#]+)/g)) if (!m[1].startsWith("fonts/") && !m[1].startsWith("../")) assets.add(path.basename(m[1])); } else fs.writeFileSync(path.join(dir, "assets", name), buf); };
    for (let round = 0; round < 4; round++) for (const name of [...assets]) await pull(name);
    for (const file of fonts) { const r = await get(`${base}/__fonts/${file}`); if (r.status === 200) fs.writeFileSync(path.join(dir, "fonts", file), Buffer.from(await r.arrayBuffer())); else console.warn(`police absente : ${file}`); }
    const files = fs.readdirSync(dir, { recursive: true }).filter((x) => fs.statSync(path.join(dir, String(x))).isFile()).length;
    const size = fs.readdirSync(dir, { recursive: true }).reduce((n, x) => n + (fs.statSync(path.join(dir, String(x))).isFile() ? fs.statSync(path.join(dir, String(x))).size : 0), 0);
    const handoff = spec.meta?.handoff as { placed?: unknown[]; empty?: string[] } | undefined;
    summary.push({ demo: run.id, theme: run.direction, name: run.name, title, category: f.demo.category, services, pages: routes.length + 4, cartStates, assets: fetched.size, fonts: fonts.size, files, bytes: size, imagesInTheme: Object.keys(spec.files).length, missing: f.missing, handoff: handoff ? { placed: handoff.placed?.length ?? 0, empty: handoff.empty ?? [] } : null });
    console.log(JSON.stringify(summary.at(-1)));
  });
  fs.writeFileSync(path.join(out, "resume.json"), JSON.stringify({ commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), date: new Date().toISOString(), runs: summary }, null, 2) + "\n");
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
