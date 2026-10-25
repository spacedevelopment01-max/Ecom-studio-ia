/**
 * Le Coven des Charmes — aperçu de développement ISOLÉ (aucun projet réel, aucune base existante, aucun réseau).
 *
 *   npx tsx clients/le-coven-des-charmes/scripts/apercu.ts --kit <dossier COVEN_CLIENT> --out <dossier de sortie>
 *
 * Une base temporaire reçoit un compte de test et un projet « Le Coven des Charmes » ; les médias du kit privé sont
 * rangés dans la bibliothèque de CE projet ; le site est posé dans son thème (applyCoven), puis chaque page est rendue
 * par la vraie route d'aperçu du studio et écrite en fichiers HTML relatifs. Le panier, la commande, le compte et les
 * formulaires sont des simulations marquées : aucun paiement, aucun envoi, aucune donnée réelle. La base temporaire
 * est supprimée à la fin. Les fichiers produits contiennent les médias privés du client : ne pas les versionner.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée : l'aperçu du Coven utilise une base temporaire.");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "coven-apercu-"));
process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Réseau interdit dans l'aperçu du Coven"); };

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; };
const kit = path.resolve(arg("kit") ?? "");
const out = path.resolve(arg("out") ?? "reports/coven-apercu");
const visuels = path.resolve(arg("visuels") ?? path.join(out, "..", "visuels"));
const mode = (arg("mode") ?? "client") as "client" | "controle";
if (!fs.existsSync(path.join(kit, "VERIFIER_COVEN.py"))) throw new Error("Indiquez le dossier COVEN_CLIENT extrait : --kit <chemin>/COVEN_CLIENT");

const sharp = (await import("sharp")).default;
const { covenMedia, COVEN_DIR, applyCoven, COVEN_NAME } = await import("../coven-spec");
const { covenSprite } = await import("../icones-ajustees");
const COVEN_MEDIA = covenMedia();
const { PRODUCT_HANDLE, COVEN_PAGES } = await import("../coven-pages");
const { createUser } = await import("../../../src/lib/auth");
const { run, now, id } = await import("../../../src/lib/db");
const { saveAsset } = await import("../../../src/lib/library");
const { saveThemeVersion, loadProject } = await import("../../../src/lib/projects");
const { composeShop } = await import("../../../src/lib/engine/shop");
const { validateSpec } = await import("../../../src/lib/theme/ops");
const { emptyProduct } = await import("../../../src/lib/project-types");
const { localBrand } = await import("../../../src/lib/engine/local");
const { previewSegment } = await import("../../../src/lib/theme/preview-access");
const { GET } = await import("../../../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const { runWithLang } = await import("../../../src/lib/i18n-server");

const ORIGIN = "http://127.0.0.1";
type Ctx = { params: Promise<{ id: string; vid: string; path: string[] }> };
const ctxFor = (url: URL): Ctx => { const m = url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/)!; return { params: Promise.resolve({ id: m[1], vid: m[2], path: (m[3] ?? "").split("/").filter(Boolean) }) }; };
const get = async (p: string) => { const url = new URL(p, ORIGIN); return GET(new Request(url), ctxFor(url)); };

try {
  await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const user = await createUser("coven-apercu@example.invalid", "isolated-preview-only", "Aperçu Coven");
    // Projet de développement isolé : nom et produit du client, rien d'autre (aucune donnée de vente inventée).
    const product = { ...emptyProduct(), name: "Bracelet de charms surprise", nameStatus: "provided" as const, category: "Bracelets de charms", sector: "autre" as never, summary: "Bracelet de charms surprise — les charms sont tirés au sort au scoop, puis assemblés sur le bracelet après la commande." };
    const { brand, strategy } = localBrand(product, COVEN_NAME, { business: "products" });
    const pid = id();
    run("INSERT INTO projects (id,user_id,name,status,platform,product_json,brand_json,strategy_json,settings_json,sources_json,business_type,business_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, user.id, COVEN_NAME, "draft", "shopify", JSON.stringify(product), JSON.stringify({ ...brand, name: COVEN_NAME, generatedBy: "local" }), JSON.stringify(strategy), "{}", "[]", "products", "null", now(), now());
    // Médias dans la bibliothèque du projet (photos du client converties pour le web, sans retouche des pixels).
    const ids: Record<string, string> = {}; const missing: string[] = [];
    for (const m of COVEN_MEDIA) {
      const src = m.origin === "police" ? path.join(COVEN_DIR, "theme", m.source) : m.origin === "maquette" ? path.join(visuels, m.source) : path.join(kit, m.source);
      if (!fs.existsSync(src)) { missing.push(m.file); continue; }
      let data = fs.readFileSync(src); let mime = "image/png";
      if (m.file.endsWith(".jpg")) { data = await sharp(data).jpeg({ quality: 90, mozjpeg: true }).toBuffer(); mime = "image/jpeg"; }
      else if (m.file.endsWith(".svg")) { data = Buffer.from(covenSprite(data.toString("utf8"))); mime = "image/svg+xml"; }
      else if (m.file.endsWith(".ttf")) mime = "font/ttf";
      const a = await saveAsset({ projectId: pid, userId: user.id, data, mime, name: m.file, origin: "upload", role: m.origin === "client" ? "scene" : "detail", status: "approved", meta: { alt: m.alt, provenance: m.origin === "maquette" ? "Extrait de maquette aux pixels natifs (visuel provisoire)" : m.origin === "client" ? "Fichier du client" : m.origin } as never });
      ids[m.file] = a.id;
    }
    const built = await composeShop(pid, "orbe" as never, null, false);
    const spec = applyCoven(built.spec, ids, { preview: true, mode });
    const problems = validateSpec(spec); assert.deepEqual(problems, [], problems.join("\n"));
    const version = saveThemeVersion(pid, spec, "Le Coven des Charmes — aperçu de développement", "system");
    const base = `/preview/${pid}/v/${previewSegment(version.id, user.id, pid)}`;
    // Theme Check (outil officiel de Shopify) sur le thème réellement compilé pour ce projet (sections du Coven comprises).
    if (process.argv.includes("--theme-check")) {
      const { compileTheme } = await import("../../../src/lib/theme/compile");
      const { check } = await import("@shopify/theme-check-node");
      const tdir = path.join(temp, "theme-check");
      for (const [p, c] of compileTheme(spec)) { fs.mkdirSync(path.dirname(path.join(tdir, p)), { recursive: true }); fs.writeFileSync(path.join(tdir, p), c); }
      for (const f of Object.keys(spec.files)) fs.writeFileSync(path.join(tdir, "assets", f), "");
      const offenses = await check(tdir);
      const errors = offenses.filter((o) => o.severity === 0);
      const own = offenses.filter((x) => x.uri.includes("es-custom-coven"));
      const kinds = [...new Set(own.map((o) => o.check))].join(", ");
      console.log(`Theme Check, sections du Coven : ${own.filter((o) => o.severity === 0).length} erreur(s), ${own.length} remarque(s) (${kinds || "aucune"})`);
      console.log(`Theme Check, thème complet : ${errors.length} erreur(s), ${offenses.length - errors.length} avertissement(s)`);
      if (errors.length) { for (const o of errors) console.log("ERREUR", o.check, o.uri.replace(/.*theme-check\//, ""), o.message); process.exitCode = 1; }
    }
    void loadProject;

    // Export en fichiers plats.
    fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, "assets"), { recursive: true }); fs.mkdirSync(path.join(out, "fonts"), { recursive: true });
    const handles = (COVEN_PAGES as { handle: string }[]).map((x) => x.handle);
    const fileFor = (p: string): string => {
      const [pathname] = p.split("?");
      if (pathname === "" || pathname === "/") return "accueil.html";
      if (pathname.startsWith("/assets/")) return pathname.slice(1);
      if (pathname.startsWith("/__fonts/")) return "fonts/" + pathname.slice(9);
      if (pathname === `/products/${PRODUCT_HANDLE}` || pathname.startsWith("/collections")) return "produit.html";
      if (pathname.startsWith("/pages/")) { const h = pathname.slice(7); return handles.includes(h) ? `page-${h}.html` : "404.html"; }
      if (pathname === "/cart") return "panier.html";
      if (pathname.startsWith("/account")) return "page-compte.html";
      return "404.html";
    };
    const assets = new Set<string>(), fonts = new Set<string>();
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rewrite = (text: string) => text.replace(new RegExp(`${esc(base)}((?:/[^"'\\s)<>\\\\]*)?)`, "g"), (_, rest: string) => {
      const file = fileFor(decodeURIComponent(rest || "/").replace(/#.*$/, ""));
      if (file.startsWith("assets/")) assets.add(file.slice(7).split("?")[0]); else if (file.startsWith("fonts/")) fonts.add(file.slice(6));
      const hash = rest.match(/#[^"'\s)<>]*$/)?.[0] ?? "";
      return file.split("?")[0] + hash;
    });
    // Fichiers ouverts sans serveur (file://) : le sprite d'icônes est joint à la page au lieu d'être chargé.
    const spriteFile = COVEN_MEDIA.find((m) => m.file === "coven-icones.svg")!;
    const sprite = fs.existsSync(path.join(kit, spriteFile.source)) ? covenSprite(fs.readFileSync(path.join(kit, spriteFile.source), "utf8")) : "";
    const inject = (html: string) => html.replace("</head>", () => `<script>window.__covenSprite=${JSON.stringify(sprite).replace(/</g, "\\u003c")};</script></head>`);
    const routes: [string, string, number][] = [["accueil.html", "/", 200], ["produit.html", `/products/${PRODUCT_HANDLE}`, 200], ["panier.html", "/cart", 200], ["404.html", "/page-introuvable", 404], ...handles.map((h) => [`page-${h}.html`, `/pages/${h}`, 200] as [string, string, number])];
    for (const [file, route, status] of routes) {
      const r = await get(`${base}${route}?es_raw=1`); assert.equal(r.status, status, `${route} → ${r.status}`);
      fs.writeFileSync(path.join(out, file), inject(rewrite(await r.text())));
    }
    const pulled = new Set<string>();
    for (let round = 0; round < 3; round++) for (const name of [...assets]) {
      if (pulled.has(name)) continue; pulled.add(name);
      const r = await get(`${base}/assets/${name}`); if (r.status !== 200) { console.warn(`asset absent : ${name}`); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(path.join(out, "assets", name), /\.(css|js)$/.test(name) ? rewrite(buf.toString("utf8")) : buf);
      if (/\.css$/.test(name)) for (const m of buf.toString("utf8").matchAll(/url\(["']?([^"')]+)["']?\)/g)) { const u = m[1]; if (u.startsWith(base)) rewrite(u); }
    }
    for (const file of fonts) { const r = await get(`${base}/__fonts/${file}`); if (r.status === 200) fs.writeFileSync(path.join(out, "fonts", file), Buffer.from(await r.arrayBuffer())); }
    const commit = (() => { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "inconnu"; } })();
    const dirty = (() => { try { return execFileSync("git", ["status", "--porcelain", "clients/le-coven-des-charmes"], { encoding: "utf8" }).trim() ? "+modifications locales" : ""; } catch { return ""; } })();
    fs.writeFileSync(path.join(out, "apercu.json"), JSON.stringify({ client: "le-coven-des-charmes", commit, etat: dirty, date: new Date().toISOString(), mode, pages: routes.map((r) => r[0]), medias: Object.keys(ids).length, manquants: missing, simulation: true }, null, 2) + "\n");
    console.log(JSON.stringify({ out, commit, pages: routes.length, medias: Object.keys(ids).length, manquants: missing }));
  });
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
