/**
 * Banc LOCAL des exports CMS (phase 11A) — aucune IA, aucune boutique réelle, aucun paiement réel.
 *
 *   sh scripts/cms-v2/env.sh up                       (WordPress + WooCommerce, PrestaShop, MariaDB : environnement isolé)
 *   DATA_DIR=/tmp/bench npx tsx scripts/cms-v2-bench.ts [--only cosmetic,artisan] [--platforms shopify,woocommerce,prestashop]
 *
 * Pour chacun des 5 projets de référence (tests/theme-v2-fixtures.ts, version V2 la plus récente) et chaque plateforme :
 *  - export par le CMS Engine V2 + contrôles statiques (Theme Check pour Shopify) ;
 *  - A = aperçu du studio (vrai moteur d'aperçu) ; B = thème exporté (Shopify : fichiers du ZIP rendus ; WordPress :
 *    parité HTML des sections rendues par le moteur PHP livré) ; C = thème INSTALLÉ dans WordPress / PrestaShop locaux ;
 *  - mêmes pages, mêmes largeurs (1440 px et 390 px), mêmes médias : captures, écart de pixels, structure (suite des
 *    sections), textes conservés, typographies, couleurs, images, animations, débordements, erreurs JavaScript ;
 *  - fonctions : navigation (liens du menu et des sections), formulaire (enregistrement vérifié en base), panier et
 *    commande natifs (boutique avec prix confirmé), modification native dans l'éditeur de WordPress (puis vérification
 *    sur le site) ;
 *  - Quality Gate « cms_export_v2 » avec la provenance de chaque mesure, verdict enregistré (quality_checks).
 * Résultats : reports/screenshots/cms-v2/<plateforme>/<projet>/ (captures + resultat.json) et reports/cms-v2-matrix.json.
 * Ne jamais lancer sur la base de production.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import sharp from "sharp";
import { chromium, type Browser, type Page } from "playwright";
import { all, one } from "@/lib/db";
import { compileTheme, type ThemeFiles } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import { runWithLang } from "@/lib/i18n-server";
import { storeProducts, type ThemeSpec } from "@/lib/theme/spec";
import { checkCmsExport, cmsExport } from "@/lib/cms-v2/export";
import { gateCmsExport, verdictMessage, type CriterionKey, type Measure } from "@/lib/cms-v2/quality";
import type { CmsPlatform, PlatformExport } from "@/lib/cms-v2/types";
import { saveCheck } from "@/lib/quality/store";
import { THEME_SCENARIOS, THEME_SCENARIO_LABEL, type ThemeScenario } from "../tests/theme-v2-fixtures";
import { serveStudio } from "./lib/studio-server";
import { keyboardCheck, visualCheck, type Finding } from "./lib/visual-check";
import { parity } from "./lib/cms-parity";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const OUT = opt("--out") ?? "reports/screenshots/cms-v2";
const only = (opt("--only")?.split(",") ?? THEME_SCENARIOS) as ThemeScenario[];
const platforms = (opt("--platforms")?.split(",") ?? ["shopify", "woocommerce", "prestashop"]) as CmsPlatform[];
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "cms-v2-bench-"));
const WP = { container: process.env.WP_CONTAINER ?? "wp-es", url: process.env.WP_URL ?? "http://localhost:8081", pass: process.env.ES_ADMIN_PASS ?? "es-admin-local1", db: process.env.WP_DB ?? "wp_es" };
const PS = { container: process.env.PS_CONTAINER ?? "ps-es", url: process.env.PS_URL ?? "http://localhost:8082", db: process.env.PS_DB ?? "ps_es" };
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const ids = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, "theme-bench.json"), "utf8")) as Record<ThemeScenario, string>;

// ------------------------------------------------------------------ commandes de l'environnement local
const sh = (cmd: string, a: string[], input?: string) => execFileSync(cmd, a, { encoding: "utf8", input, stdio: ["pipe", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const wp = (...a: string[]) => sh("docker", ["exec", "-u", "www-data", WP.container, "wp", ...a]);
const dockerExec = (c: string, cmd: string, user = "root") => sh("docker", ["exec", "-u", user, c, "sh", "-c", cmd]);
const mysql = (db: string, q: string) => sh("mysql", ["-uroot", "-N", db, "-e", q]);

type PageDef = { name: string; a: string; c: string | null };
type Shot = { file: string; full: string };
type PageResult = { name: string; device: string; a: string; c: string | null; status?: number; findings: Finding[]; diff?: number; structure?: { a: string[]; c: string[]; same: boolean }; texts?: { total: number; kept: number; missing: string[] }; fonts?: { a: string[]; c: string[] }; colors?: { a: string[]; c: string[] }; images?: { a: number; c: number; broken: number }; reveal?: { a: number; c: number; hidden: number }; perf?: { loadMs: number; kb: number; requests: number }; seo?: Record<string, unknown> };

// ------------------------------------------------------------------ navigateur
const still = "html,body{scroll-behavior:auto!important}*{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}[data-reveal],[data-reveal] .es-w,[data-scroll-words] .es-w{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}";

async function open(browser: Browser, url: string, mobile: boolean, errors: string[], storage?: string) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, locale: "fr-FR", deviceScaleFactor: 1, storageState: storage });
  const page = await ctx.newPage();
  const net = { bytes: 0, requests: 0 };
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on("response", async (r) => { net.requests++; net.bytes += Number(r.headers()["content-length"] ?? 0) || (await r.body().catch(() => Buffer.alloc(0))).length; });
  const t0 = Date.now();
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  return { ctx, page, net, loadMs: Date.now() - t0, status: res?.status() ?? 0 };
}

/** Défile la page (révélations au défilement), charge toutes les images, puis capture (écran + page complète, JPEG). */
async function shoot(page: Page, base: string): Promise<Shot> {
  // Défilement instantané (PrestaShop / Classic active le défilement doux : la capture partirait avant le retour en haut).
  await page.evaluate(`(async () => { document.documentElement.style.scrollBehavior = "auto"; for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 90)); } scrollTo({ top: 0, behavior: "instant" }); })()`);
  await page.evaluate(`Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.complete && i.naturalWidth ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }); }))`);
  await page.addStyleTag({ content: still }).catch(() => {});
  await page.evaluate(`scrollTo({ top: 0, behavior: "instant" })`);
  await page.waitForTimeout(600);
  const file = `${base}.jpg`;
  const full = `${base}-complet.jpg`;
  await page.screenshot({ path: file, type: "jpeg", quality: 78 });
  const buf = await page.screenshot({ fullPage: true, type: "png" });
  await sharp(buf).resize({ width: Math.min(720, (await sharp(buf).metadata()).width!) }).jpeg({ quality: 72 }).toFile(full);
  return { file, full };
}

/** Mesures comparables entre A et C, prises DANS la page (chaîne évaluée telle quelle). */
const MEASURE = `(() => {
  const main = document.querySelector("main") || document.body;
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; };
  // Adaptations documentées : tiroir panier de Shopify (panier natif de la plateforme) et contenu des pages simples
  // (« main-page » : contenu natif de la page dans WordPress / PrestaShop) hors comparaison de structure.
  const types = [...document.querySelectorAll("[data-es-type]")].filter((e) => !e.parentElement.closest("[data-es-type]")).map((e) => e.getAttribute("data-es-type")).filter((t) => t !== "cart-drawer" && t !== "main-page");
  // Typographie de la plateforme (apostrophes, tirets) et consignes « à compléter » adaptées (src/lib/cms-v2/adapt.ts).
  const norm = (t) => t.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201c\u201d\u00ab\u00bb]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/\u2026/g, "...").replace(/\u00a0|\u202f/g, " ").replace(/\\[(À compléter|To complete) (dans|in) [^\\]]*\\]/g, "[$1 …]");
  const textOf = (root) => [...root.querySelectorAll("h1,h2,h3,h4,p,li,a,button,summary,blockquote,dd,dt,span,label")].filter((e) => vis(e) && !e.closest("script,style,[aria-hidden=true],.visually-hidden,.skip-link,[class*=skip-link],#shopify-section-cart-drawer,[data-es-type=cart-drawer]")).map((e) => norm([...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(" ")).replace(/\\s+/g, " ").trim()).filter((t) => t.length >= 4 && !/^[\\d\\s.,:€%–-]+$/.test(t));
  const font = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim() : ""; };
  const sections = [...document.querySelectorAll("[data-es-type]")].filter((e) => !e.parentElement.closest("[data-es-type]"));
  const bg = sections.map((s) => { let n = s; while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return c; n = n.firstElementChild && n.firstElementChild.getBoundingClientRect().height >= n.getBoundingClientRect().height * 0.9 ? n.firstElementChild : null; } return getComputedStyle(document.body).backgroundColor; });
  const imgs = [...document.querySelectorAll("main img, header img, footer img, [data-es-type] img")];
  const reveal = [...document.querySelectorAll("[data-reveal]")];
  const meta = (n) => (document.querySelector('meta[name="' + n + '"]') || {}).content || "";
  return {
    types,
    texts: textOf(document.body),
    fonts: [font("h1") || font("h2"), font("h2"), font("p"), font("body")],
    colors: bg,
    images: { total: imgs.length, loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src")).slice(0, 5) },
    reveal: { total: reveal.length, hidden: reveal.filter((e) => Number(getComputedStyle(e).opacity) < 0.5).length },
    seo: { title: document.title, description: meta("description"), h1: document.querySelectorAll("h1").length, lang: document.documentElement.lang, canonical: !!document.querySelector('link[rel="canonical"]'), viewport: !!document.querySelector('meta[name="viewport"]'), alt: imgs.filter((i) => !i.hasAttribute("alt")).length },
    links: [...document.querySelectorAll("header a[href], main a[href], footer a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
    height: document.documentElement.scrollHeight,
  };
})()`;
type Measured = { types: string[]; texts: string[]; fonts: string[]; colors: string[]; images: { total: number; loaded: number; broken: string[] }; reveal: { total: number; hidden: number }; seo: Record<string, any>; links: string[]; height: number };

/** Écart moyen de pixels (0 = identique, 1 = opposé) entre deux captures, à la même largeur, sur la hauteur commune. */
async function pixelDiff(a: string, c: string): Promise<number> {
  const W = 360;
  const [ia, ic] = await Promise.all([sharp(a).resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true }), sharp(c).resize({ width: W }).greyscale().raw().toBuffer({ resolveWithObject: true })]);
  const h = Math.min(ia.info.height, ic.info.height);
  let sum = 0;
  for (let i = 0; i < W * h; i++) sum += Math.abs(ia.data[i] - ic.data[i]);
  return Math.round((sum / (W * h * 255)) * 1000) / 1000;
}

/** Planche A | C (ou A | B) côte à côte, titrée, à partir des vraies captures (aucune retouche). */
async function board(left: string, right: string, file: string, title: string, labels: [string, string]) {
  const width = 520;
  const maxH = 1400;
  const panel = async (f: string) => {
    const { data, info } = await sharp(f).resize({ width }).png().toBuffer({ resolveWithObject: true });
    return info.height > maxH ? sharp(data).extract({ left: 0, top: 0, width, height: maxH }).png().toBuffer() : data;
  };
  const [pa, pc] = await Promise.all([panel(left), panel(right)]);
  const H = Math.max((await sharp(pa).metadata()).height!, (await sharp(pc).metadata()).height!);
  const gap = 20;
  const top = 76;
  const W = width * 2 + gap * 3;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${top}"><text x="${gap}" y="30" font-family="Helvetica, Arial" font-size="17" font-weight="700" fill="#111">${esc(title)}</text><text x="${gap}" y="62" font-family="Helvetica, Arial" font-size="14" fill="#555">${esc(labels[0])}</text><text x="${gap * 2 + width}" y="62" font-family="Helvetica, Arial" font-size="14" fill="#555">${esc(labels[1])}</text></svg>`;
  await sharp({ create: { width: W, height: H + top + gap, channels: 3, background: "#ECECEC" } })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }, { input: pa, top, left: gap }, { input: pc, top, left: gap * 2 + width }])
    .jpeg({ quality: 78 })
    .toFile(file);
}

// ------------------------------------------------------------------ installation locale
const LEGAL = /mention|condition|politique|cgv|legal|terms|privacy|confidential|livraison|shipping|retour|refund/i;
function contentPage(spec: ThemeSpec) {
  return spec.store.pages.find((p) => !LEGAL.test(p.handle) && !LEGAL.test(p.title) && !/contact/.test(p.handle)) ?? spec.store.pages[0];
}
function pricedProduct(spec: ThemeSpec) {
  const p = storeProducts(spec)[0];
  return p && p.price !== null && p.price !== undefined ? p : null;
}

type Install = { ok: boolean; log: string[]; productUrl: string | null; purchasable: boolean; error?: string; themeDir?: string; pageUrls?: Record<string, string> };

function installWordPress(spec: ThemeSpec, exp: PlatformExport, zip: string): Install {
  const services = spec.store.business === "services";
  const log: string[] = [];
  const slug = exp.files[0].split("/")[0];
  sh("mysql", ["-uroot", "-e", `DROP DATABASE IF EXISTS ${WP.db}; CREATE DATABASE ${WP.db};`]);
  wp("core", "install", `--url=${WP.url}`, "--title=ES", "--admin_user=admin", `--admin_password=${WP.pass}`, "--admin_email=demo@exemple.fr", "--skip-email");
  wp("rewrite", "structure", "/%postname%/", "--hard");
  wp("option", "update", "WPLANG", "");
  log.push("WordPress réinitialisé (base vide), permaliens /%postname%/");
  if (!services) {
    wp("plugin", "activate", "woocommerce");
    for (const [k, v] of [["woocommerce_coming_soon", "no"], ["woocommerce_store_pages_only", "no"], ["woocommerce_currency", "EUR"], ["woocommerce_default_country", "FR"], ["woocommerce_onboarding_profile", '{"skipped":true}']]) wp("option", "update", k, v, ...(v.startsWith("{") ? ["--format=json"] : []));
    wp("wc", "tool", "run", "install_pages", "--user=admin");
    // Moyen de paiement de test hors ligne (virement : aucune transaction) pour afficher la page de commande complète.
    wp("option", "update", "woocommerce_bacs_settings", JSON.stringify({ enabled: "yes", title: "Virement bancaire (test local)" }), "--format=json");
    log.push("WooCommerce 9.3.3 activé (pages natives panier / commande / compte, EUR, virement de test hors ligne)");
  }
  sh("docker", ["cp", zip, `${WP.container}:/tmp/theme.zip`]);
  wp("theme", "install", "/tmp/theme.zip", "--activate", "--force");
  const active = wp("theme", "list", "--status=active", "--field=name");
  log.push(`thème installé et activé : ${active}`);
  let productUrl: string | null = null;
  let purchasable = false;
  if (!services) {
    const dir = `/var/www/html/wp-content/themes/${slug}`;
    const p = storeProducts(spec)[0];
    sh("docker", ["cp", path.join(process.cwd(), "scripts/cms-v2/wp-import.php"), `${WP.container}:/tmp/wp-import.php`]);
    const out = JSON.parse(wp("eval-file", "/tmp/wp-import.php", `${dir}/import/produits-woocommerce.csv`, `${dir}/assets/es`, (p?.images ?? []).filter((f) => exp.media.includes(f)).join(","), "--user=admin").split("\n").pop()!);
    log.push(`CSV livré importé par l'importateur de WooCommerce : ${out.products.length} produit(s), ${out.errors} erreur(s) ; photos du dossier assets/es, produits publiés (étapes du mode d'emploi)`);
    productUrl = out.products[0]?.url?.replace(/^https?:\/\/[^/]+/, WP.url) ?? null;
    purchasable = !!out.products[0]?.purchasable;
    log.push(`produit : ${out.products.map((x: any) => `${x.slug} (${x.type}, prix ${x.price || "aucun"}, achetable : ${x.purchasable ? "oui" : "non"})`).join(", ")}`);
  }
  // Adresses réelles des pages créées par le thème (une page existante non publiée n'est jamais écrasée).
  const pageUrls: Record<string, string> = {};
  for (const line of wp("eval", 'foreach ((array) get_option("es_pages", []) as $h => $id) echo $h, "\t", get_permalink($id), "\n";').split("\n")) {
    const [h, u] = line.split("\t");
    if (h && u) pageUrls[h] = u.replace(/^https?:\/\/[^/]+/, WP.url);
  }
  return { ok: active === slug, log, productUrl, purchasable, themeDir: slug, pageUrls };
}

function installPrestaShop(spec: ThemeSpec, exp: PlatformExport, zip: string): Install {
  const services = spec.store.business === "services";
  const log: string[] = [];
  const yml = strFromU8(unzipSync(new Uint8Array(exp.zip))["config/theme.yml"]);
  const name = yml.match(/^name:\s*(\S+)/m)![1];
  sh("docker", ["cp", path.join(process.cwd(), "scripts/cms-v2/ps-theme.php"), `${PS.container}:/tmp/ps-theme.php`]);
  sh("docker", ["cp", path.join(process.cwd(), "scripts/cms-v2/ps-product.php"), `${PS.container}:/tmp/ps-product.php`]);
  try { sh("docker", ["exec", "-u", "www-data", PS.container, "php", "/tmp/ps-theme.php", "enable", "classic"]); } catch {}
  // Seuls les DOSSIERS de thèmes ajoutés sont retirés (themes/core.js, javascript.tpl… sont des fichiers de PrestaShop).
  for (const t of dockerExec(PS.container, "find themes -mindepth 1 -maxdepth 1 -type d -printf '%f\\n'").split(/\s+/)) if (t && !["classic", "_core", "_libraries"].includes(t)) dockerExec(PS.container, `rm -rf themes/${t}`);
  dockerExec(PS.container, "rm -rf modules/esstudio var/cache/prod/*");
  mysql(PS.db, "DELETE FROM ps_module WHERE name='esstudio'; DELETE FROM ps_authorization_role WHERE slug LIKE 'ROLE_MOD_MODULE_ESSTUDIO_%'; DELETE FROM ps_configuration WHERE name='ES_FORM_ENTRIES';");
  log.push("PrestaShop 8.1.7 : thème Classic réactivé, thème et module précédents retirés");
  sh("docker", ["cp", zip, `${PS.container}:/tmp/theme.zip`]);
  const inst = sh("docker", ["exec", "-u", "www-data", PS.container, "php", "/tmp/ps-theme.php", "install", "/tmp/theme.zip"]);
  const en = sh("docker", ["exec", "-u", "www-data", PS.container, "php", "/tmp/ps-theme.php", "enable", name]);
  dockerExec(PS.container, "rm -rf var/cache/prod/*");
  const mod = mysql(PS.db, "SELECT active FROM ps_module WHERE name='esstudio'");
  log.push(`gestionnaire de thèmes de PrestaShop : ${inst} / ${en} ; module compagnon esstudio actif : ${mod === "1" ? "oui" : "non"}`);
  let productUrl: string | null = null;
  let purchasable = false;
  if (!services) {
    const p = storeProducts(spec)[0];
    const img = (p.images ?? []).find((f) => exp.media.includes(f));
    const data = { handle: p.handle, name: p.title, description: p.description_html, price: p.price === null || p.price === undefined ? null : p.price / 100, image: img ? `/var/www/html/themes/${name}/assets/es/${img}` : null, options: p.options.length && p.variants.length > 1 ? { name: p.options[0], values: p.variants.map((v) => v.options[0]) } : null };
    sh("docker", ["exec", "-i", PS.container, "sh", "-c", "cat > /tmp/product.json"], JSON.stringify(data));
    const out = JSON.parse(sh("docker", ["exec", "-u", "www-data", PS.container, "php", "/tmp/ps-product.php", "/tmp/product.json"]).split("\n").pop()!);
    dockerExec(PS.container, "rm -rf var/cache/prod/*");
    productUrl = out.url.replace(/^https?:\/\/[^/]+/, PS.url);
    purchasable = data.price !== null;
    log.push(`produit créé comme dans Catalogue › Produits (adresse simplifiée « ${p.handle} », prix ${data.price ?? "aucun : non vendable"}, ${data.options ? `${data.options.values.length} déclinaisons` : "sans déclinaison"})`);
  }
  return { ok: /installed/.test(inst) && /enabled/.test(en) && mod === "1", log, productUrl, purchasable, themeDir: name };
}

// ------------------------------------------------------------------ tests fonctionnels sur le site installé
async function linkCheck(page: Page, links: string[]) {
  const uniq = [...new Set(links.map((l) => l.split("#")[0]))].filter((l) => !/wp-admin|admin-es|logout|add-to-cart|\?|\/feed/.test(l)).slice(0, 40);
  const bad: string[] = [];
  for (const l of uniq) {
    const r = await page.request.get(l, { maxRedirects: 5 }).catch(() => null);
    if (!r || r.status() >= 400) bad.push(`${r?.status() ?? "erreur"} ${l}`);
  }
  return { checked: uniq.length, bad };
}

async function formTest(browser: Browser, platform: CmsPlatform, urls: string[]): Promise<{ ok: boolean; detail: string }> {
  const before = platform === "woocommerce" ? entriesWp() : entriesPs();
  for (const url of urls) {
    const errors: string[] = [];
    const { ctx, page } = await open(browser, url, false, errors);
    const form = page.locator("form:has(input[type=email])").first();
    if (!(await form.count())) { await ctx.close(); continue; }
    await form.scrollIntoViewIfNeeded();
    await form.locator("input[type=email]").first().fill(`test-${Date.now()}@exemple.fr`);
    for (const t of await form.locator("input[type=text]:visible, textarea:visible").all()) await t.fill("Message de test local").catch(() => {});
    await Promise.all([page.waitForNavigation({ timeout: 20000 }).catch(() => null), form.locator("[type=submit], button:not([type=button])").first().click()]);
    await page.waitForTimeout(800);
    const notice = (await page.locator(".es-form-notice").first().textContent().catch(() => "")) ?? "";
    const after = platform === "woocommerce" ? entriesWp() : entriesPs();
    await ctx.close();
    return { ok: after > before && /es_form=ok/.test(page.url()), detail: `formulaire de ${url.replace(/^https?:\/\/[^/]+/, "")} : ${after - before} message enregistré en base, retour « ${notice.trim().slice(0, 60)} »` };
  }
  return { ok: false, detail: "aucun formulaire avec adresse e-mail trouvé" };
}
const entriesWp = () => { try { return JSON.parse(wp("option", "get", "es_form_entries", "--format=json")).length; } catch { return 0; } };
const entriesPs = () => { try { return JSON.parse(mysql(PS.db, "SELECT value FROM ps_configuration WHERE name='ES_FORM_ENTRIES'") || "[]").length; } catch { return 0; } };

async function commerceTest(browser: Browser, platform: CmsPlatform, inst: Install, dir: string): Promise<{ ok: boolean | null; detail: string[] }> {
  if (!inst.productUrl) return { ok: null, detail: ["aucun produit"] };
  if (!inst.purchasable) return { ok: null, detail: ["produit sans prix confirmé dans le studio : non vendable (aucun prix inventé) ; ajout au panier et commande non testables"] };
  const errors: string[] = [];
  const detail: string[] = [];
  const { ctx, page } = await open(browser, inst.productUrl, false, errors);
  if (platform === "woocommerce") {
    const sel = page.locator("form.variations_form select").first();
    if (await sel.count()) await sel.selectOption({ index: 1 });
    await page.locator("button.single_add_to_cart_button").first().click();
    await page.waitForLoadState("networkidle");
  } else {
    const radio = page.locator(".product-variants input[type=radio]").first();
    if (await radio.count()) await radio.check().catch(() => {});
    await page.locator("button.add-to-cart").first().click();
    await page.locator("#blockcart-modal").waitFor({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  const count = Number((await page.locator("[data-cart-count]").first().textContent().catch(() => "0"))?.trim() || 0);
  detail.push(`ajout au panier depuis la fiche produit native : compteur de l'en-tête du thème = ${count}`);
  await page.screenshot({ path: path.join(dir, "C-ajout-panier.jpg"), type: "jpeg", quality: 75 });
  const cartUrl = platform === "woocommerce" ? `${WP.url}/cart/` : `${PS.url}/cart?action=show`;
  await page.goto(cartUrl, { waitUntil: "networkidle" });
  const rows = await page.locator(platform === "woocommerce" ? ".wc-block-cart-items__row, .cart_item" : ".cart-item").count();
  detail.push(`panier natif : ${rows} ligne(s)`);
  await page.screenshot({ path: path.join(dir, "C-panier.jpg"), type: "jpeg", quality: 75, fullPage: true });
  const checkoutUrl = platform === "woocommerce" ? `${WP.url}/checkout/` : `${PS.url}/order`;
  await page.goto(checkoutUrl, { waitUntil: "networkidle" });
  const checkout = await page.locator(platform === "woocommerce" ? ".wc-block-checkout, form.checkout" : "#checkout, #checkout-personal-information-step").count();
  detail.push(`page de commande native : ${checkout ? "affichée" : "ABSENTE"} (aucune commande passée, aucun paiement)`);
  await page.screenshot({ path: path.join(dir, "C-commande.jpg"), type: "jpeg", quality: 75, fullPage: true });
  await ctx.close();
  if (errors.length) detail.push(`erreurs JavaScript : ${errors.slice(0, 2).join(" | ")}`);
  return { ok: count > 0 && rows > 0 && checkout > 0 && !errors.length, detail };
}

/** Modification NATIVE dans l'éditeur de site de WordPress (bloc « Section E-COM STUDIO »), puis vérification sur le site. */
async function wpEditorTest(browser: Browser, slug: string, dir: string): Promise<{ ok: boolean; detail: string; stable: boolean }> {
  const errors: string[] = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${WP.url}/wp-login.php`);
  await page.fill("#user_login", "admin");
  await page.fill("#user_pass", WP.pass);
  await Promise.all([page.waitForNavigation(), page.click("#wp-submit")]);
  const before = await (await page.request.get(`${WP.url}/`)).text();
  const typesBefore = [...before.matchAll(/data-es-type="([^"]+)"/g)].map((m) => m[1]);
  await page.goto(`${WP.url}/wp-admin/site-editor.php?postType=wp_template&postId=${encodeURIComponent(`${slug}//front-page`)}&canvas=edit`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  for (const b of await page.locator('button:has-text("Get started"), button[aria-label="Close"]').all()) await b.click().catch(() => {});
  const canvas = page.frameLocator('iframe[name="editor-canvas"]');
  const blocks = canvas.locator('[data-type="es/section"]');
  await blocks.first().waitFor({ timeout: 60000 });
  const n = await blocks.count();
  // Premier bloc dont la barre latérale propose un champ texte rempli, présent dans le rendu du bloc.
  let edited = "";
  let newText = "";
  for (let i = 0; i < Math.min(n, 4) && !edited; i++) {
    await blocks.nth(i).click({ position: { x: 20, y: 20 } }).catch(() => {});
    await page.waitForTimeout(800);
    const fields = page.locator(".block-editor-block-inspector input[type=text], .block-editor-block-inspector textarea");
    for (let j = 0; j < (await fields.count()); j++) {
      const f = fields.nth(j);
      const v = (await f.inputValue().catch(() => "")).trim();
      if (v.length < 6 || /^https?:|^\/|^#|\[À compléter/.test(v) || v.includes("<")) continue;
      if (!(await blocks.nth(i).innerText().catch(() => "")).includes(v)) continue;
      newText = `${v} — modifié dans WordPress`;
      await f.fill(newText);
      edited = v;
      break;
    }
  }
  if (!edited) { await ctx.close(); return { ok: false, detail: "aucun champ texte modifiable trouvé dans la barre latérale du bloc", stable: false }; }
  await page.waitForTimeout(1500);
  await page.locator(".editor-header__settings button:has-text('Save'), .edit-site-save-button__button").first().click();
  const confirm = page.locator(".entities-saved-states__panel button:has-text('Save'), .editor-entities-saved-states__save-button");
  if (await confirm.first().isVisible({ timeout: 4000 }).catch(() => false)) await confirm.first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(dir, "C-editeur-wordpress.jpg"), type: "jpeg", quality: 75 });
  const after = await (await page.request.get(`${WP.url}/`)).text();
  const typesAfter = [...after.matchAll(/data-es-type="([^"]+)"/g)].map((m) => m[1]);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const visible = after.includes(esc(newText)) || after.includes(newText) || after.includes(newText.replace(/—/g, "&#8212;"));
  const stable = typesAfter.join(",") === typesBefore.join(",");
  const errs = errors.filter((e) => !/ResizeObserver/.test(e));
  await ctx.close();
  return { ok: visible && stable && !errs.length, stable, detail: `texte « ${edited.slice(0, 50)} » modifié dans Apparence › Éditeur (barre latérale du bloc), enregistré : ${visible ? "visible sur le site" : "NON visible sur le site"} ; sections avant/après : ${stable ? "identiques" : "MODIFIÉES"}${errs.length ? ` ; erreurs : ${errs.slice(0, 2).join(" | ")}` : ""}` };
}

// ------------------------------------------------------------------ banc
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const matrix: Record<string, Record<string, unknown>> = {};
for (const s of only) {
  const projectId = ids[s];
  const spec = all<{ spec: string }>("SELECT spec FROM theme_versions WHERE project_id = ? ORDER BY number DESC", projectId).map((r) => JSON.parse(r.spec) as ThemeSpec).find((x) => (x as any).meta?.engine === "v2");
  if (!spec) throw new Error(`${s} : aucune version V2 (lancer scripts/theme-v2-bench.ts shoot --engine v2)`);
  const userId = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId)!.user_id;
  const services = spec.store.business === "services";
  const studio = await serveStudio(spec, compileTheme(spec));
  const cp = contentPage(spec);
  const product = storeProducts(spec)[0];
  const policy = spec.store.policies?.[0];
  matrix[s] = {};
  for (const platform of platforms) {
    const dir = path.join(OUT, platform, s);
    fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now();
    const exp = await fr(() => cmsExport(platform, spec, libraryLoader, { projectId }));
    const zip = path.join(WORK, `${s}-${platform}.zip`);
    fs.writeFileSync(zip, exp.zip);
    const exportMs = Date.now() - t0;
    const st = await fr(() => checkCmsExport(platform, exp, spec, { projectId }));
    const result: Record<string, any> = { scenario: s, label: THEME_SCENARIO_LABEL[s], platform, services, export: { name: exp.name, kb: Math.round(exp.zip.length / 1024), files: exp.files.length, ms: exportMs, issues: exp.issues }, static: { codes: st.static.codes, issues: st.static.issues, stats: st.static.stats, verdict: st.gate.decision.verdict, scope: st.gate.scope }, pages: [] as PageResult[] };
    const measures: Partial<Record<CriterionKey, Measure>> = { ...st.static.measures };
    const codes = new Set<string>(st.static.codes);
    const issues: string[] = [...st.static.issues];
    let inst: Install | null = null;
    let cBase: string | null = null;

    // B (export) — Shopify : les fichiers du ZIP rendus par le moteur d'aperçu ; WordPress : parité PHP des sections.
    let bServer: { base: string; close: () => void } | null = null;
    if (platform === "shopify") {
      const files: ThemeFiles = new Map();
      for (const [k, v] of Object.entries(unzipSync(new Uint8Array(exp.zip)))) if (/\.(liquid|json|css|js|svg)$/.test(k)) files.set(k, strFromU8(v));
      bServer = await serveStudio(spec, files);
    }
    if (platform === "woocommerce") {
      const par = await fr(() => parity(spec));
      result.parity = { sections: par.length, identical: par.filter((p) => p.same).length, different: par.filter((p) => !p.same).map((p) => `${p.where}:${p.type}`) };
    }

    if (platform === "woocommerce" || platform === "prestashop") {
      try {
        inst = platform === "woocommerce" ? installWordPress(spec, exp, zip) : installPrestaShop(spec, exp, zip);
        cBase = platform === "woocommerce" ? WP.url : PS.url;
      } catch (e) {
        inst = { ok: false, log: [], productUrl: null, purchasable: false, error: String((e as Error).message).slice(0, 400) };
      }
      result.install = inst;
      if (!inst.ok) { codes.add("install_failed"); issues.push(`installation échouée : ${inst.error ?? inst.log.join(" ; ")}`); }
    }

    const cPath = (p: string): string | null => {
      if (!cBase || !inst?.ok) return null;
      if (p === "/") return `${cBase}/`;
      const m = p.match(/^\/(pages|policies)\/([\w-]+)$/);
      if (m) return platform === "woocommerce" ? inst.pageUrls?.[m[2]] ?? `${cBase}/${m[2]}/` : `${cBase}${p}`;
      if (p.startsWith("/products/")) return inst.productUrl;
      return null;
    };
    const pages: PageDef[] = [{ name: "accueil", a: "/", c: cPath("/") }];
    if (cp) pages.push({ name: "page", a: `/pages/${cp.handle}`, c: cPath(`/pages/${cp.handle}`) });
    if (!services && product) pages.push({ name: "produit", a: `/products/${product.handle}`, c: cPath(`/products/${product.handle}`) });
    if (policy) pages.push({ name: "legal", a: `/policies/${policy.handle}`, c: cPath(`/policies/${policy.handle}`) });

    const fidelity: { diff: number[]; struct: boolean[]; textRatio: number[]; fonts: boolean[]; colors: number[]; imgOk: boolean[]; reveal: boolean[]; mobileBlocking: number; desktopBlocking: number; jsErrors: string[]; seo: number[]; a11y: Finding[]; loadRatio: number[]; links: string[] } = { diff: [], struct: [], textRatio: [], fonts: [], colors: [], imgOk: [], reveal: [], mobileBlocking: 0, desktopBlocking: 0, jsErrors: [], seo: [], a11y: [], loadRatio: [], links: [] };
    for (const pg of pages) {
      const right = platform === "shopify" ? (bServer ? bServer.base + pg.a : null) : pg.c;
      for (const mobile of [false, true]) {
        const dev = mobile ? "mobile" : "desktop";
        const pr: PageResult = { name: pg.name, device: dev, a: pg.a, c: right, findings: [] };
        const eA: string[] = [];
        const A = await open(browser, studio.base + pg.a, mobile, eA);
        const shotA = await shoot(A.page, path.join(dir, `A-${pg.name}-${dev}`));
        const mA = (await A.page.evaluate(MEASURE)) as Measured;
        await A.ctx.close();
        if (!right) { pr.findings.push({ check: "c", severity: "warning", detail: "non installé : pas de capture C" }); result.pages.push(pr); continue; }
        const eC: string[] = [];
        const C = await open(browser, right, mobile, eC);
        pr.status = C.status;
        const findings = await visualCheck(C.page, dev, { home: pg.name === "accueil" });
        const shotC = await shoot(C.page, path.join(dir, `${platform === "shopify" ? "B" : "C"}-${pg.name}-${dev}`));
        const mC = (await C.page.evaluate(MEASURE)) as Measured;
        if (!mobile && pg.name === "accueil" && platform !== "shopify") fidelity.a11y.push(...(await keyboardCheck(C.page)));
        if (!mobile) fidelity.links.push(...mC.links);
        await C.ctx.close();
        pr.findings = findings.filter((f) => f.check !== "broken-link");
        pr.diff = await pixelDiff(shotA.file, shotC.file);
        const comparable = pg.name !== "produit" || platform === "shopify"; // fiche produit : native WooCommerce / PrestaShop (adaptation documentée)
        pr.structure = { a: mA.types, c: mC.types, same: mA.types.join(",") === mC.types.join(",") };
        const cText = mC.texts.join(" \n ");
        const missing = mA.texts.filter((t) => !cText.includes(t));
        pr.texts = { total: mA.texts.length, kept: mA.texts.length - missing.length, missing: missing.slice(0, 8) };
        pr.fonts = { a: mA.fonts, c: mC.fonts };
        const n = Math.min(mA.colors.length, mC.colors.length);
        const sameColors = mA.colors.slice(0, n).filter((c, i) => c === mC.colors[i]).length;
        pr.colors = { a: mA.colors, c: mC.colors };
        pr.images = { a: mA.images.loaded, c: mC.images.loaded, broken: mC.images.broken.length };
        pr.reveal = { a: mA.reveal.total, c: mC.reveal.total, hidden: mC.reveal.hidden };
        pr.perf = { loadMs: C.loadMs, kb: Math.round(C.net.bytes / 1024), requests: C.net.requests };
        pr.seo = mC.seo;
        if (comparable) {
          fidelity.diff.push(pr.diff);
          fidelity.struct.push(pr.structure.same);
          fidelity.textRatio.push(mA.texts.length ? pr.texts.kept / pr.texts.total : 1);
          fidelity.fonts.push(mA.fonts[0] === mC.fonts[0] && mA.fonts[2] === mC.fonts[2]);
          fidelity.colors.push(n ? sameColors / n : 1);
          fidelity.reveal.push(mA.reveal.total === 0 || (mC.reveal.total >= mA.reveal.total * 0.8 && mC.reveal.hidden === 0));
          fidelity.loadRatio.push(C.loadMs / Math.max(A.loadMs, 1));
        }
        fidelity.imgOk.push(mC.images.broken.length === 0);
        // Débordements et éléments hors écran : critère « responsive » ; autres défauts bloquants (contraste, chevauchement,
        // image manquante…) : accessibilité / images, comptés à part.
        const layoutChecks = ["overflow", "offscreen-element", "overlap"];
        const blocking = pr.findings.filter((f) => f.severity === "blocking" && layoutChecks.includes(f.check)).length;
        fidelity.a11y.push(...pr.findings.filter((f) => f.severity === "blocking" && !layoutChecks.includes(f.check)));
        if (mobile) fidelity.mobileBlocking += blocking; else fidelity.desktopBlocking += blocking;
        fidelity.jsErrors.push(...eC.map((e) => `${pg.name}/${dev} : ${e.slice(0, 160)}`));
        const seo = mC.seo;
        fidelity.seo.push([seo.title, seo.h1 === 1, seo.lang, seo.viewport, seo.alt === 0].filter(Boolean).length / 5);
        if (C.status >= 400) { codes.add("missing_page"); issues.push(`${pg.name} : statut ${C.status}`); }
        await board(shotA.full, shotC.full, path.join(dir, `comparaison-${pg.name}-${dev}.jpg`), `${THEME_SCENARIO_LABEL[s]} — ${pg.name} (${dev}) — écart de pixels ${pr.diff}`, ["A — aperçu du studio", platform === "shopify" ? "B — thème exporté (fichiers du ZIP)" : `C — thème installé (${platform === "woocommerce" ? "WordPress 6.6 + WooCommerce 9.3.3" : "PrestaShop 8.1.7"}, local)`]);
        result.pages.push(pr);
      }
    }
    bServer?.close();

    // Mesures du Quality Gate, avec leur provenance.
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const ratio = (xs: boolean[]) => (xs.length ? xs.filter(Boolean).length / xs.length : 0);
    const clamp = (x: number) => Math.max(0, Math.min(10, Math.round(x * 10) / 10));
    const prov = platform === "shopify" ? "browser_local" : "installed_local";
    if (platform === "shopify" || inst?.ok) {
      if (inst?.ok) {
        measures.installation = { score: 10, provenance: "installed_local", detail: inst.log.join(" ; ") };
        measures.structure = { score: st.static.measures.structure?.score ?? 10, provenance: "installed_local", detail: "accepté et activé par le gestionnaire de thèmes de la plateforme" };
        measures.compatibility = { score: st.static.measures.compatibility?.score ?? 10, provenance: "installed_local", detail: platform === "woocommerce" ? "WordPress 6.6 / WooCommerce 9.3.3" : "PrestaShop 8.1.7 (thème enfant de Classic)" };
      }
      const diff = avg(fidelity.diff);
      measures.page_fidelity = { score: clamp(10 * (1 - diff * 4) * (0.5 + 0.5 * avg(fidelity.textRatio))), provenance: prov, detail: `écart de pixels moyen ${diff.toFixed(3)}, textes conservés ${(avg(fidelity.textRatio) * 100).toFixed(0)} %` };
      measures.section_fidelity = { score: clamp(10 * ratio(fidelity.struct)), provenance: prov, detail: `suite des sections identique sur ${fidelity.struct.filter(Boolean).length}/${fidelity.struct.length} pages comparables` };
      measures.typography = { score: clamp(10 * ratio(fidelity.fonts)), provenance: prov };
      measures.colors = { score: clamp(10 * avg(fidelity.colors)), provenance: prov };
      measures.images = { score: clamp(10 * ratio(fidelity.imgOk)), provenance: prov };
      measures.animations = { score: clamp(10 * ratio(fidelity.reveal)), provenance: prov };
      measures.responsive = { score: fidelity.mobileBlocking ? clamp(10 - 3 * fidelity.mobileBlocking) : 10, provenance: prov, detail: `${fidelity.mobileBlocking} défaut(s) bloquant(s) sur téléphone` };
      measures.data_preservation = { score: clamp(10 * avg(fidelity.textRatio)), provenance: prov };
      measures.seo = { score: clamp(10 * avg(fidelity.seo)), provenance: prov, detail: "titre, un seul H1, langue, viewport, textes alternatifs (le référencement réel n'est pas mesuré)" };
      const a11yBlocking = [...new Set(fidelity.a11y.filter((f) => f.severity === "blocking").map((f) => `${f.check} : ${f.detail}`))];
      measures.accessibility = { score: a11yBlocking.length ? Math.max(3, 9 - a11yBlocking.length) : 9, provenance: prov, detail: a11yBlocking.length ? a11yBlocking.slice(0, 4).join(" ; ") : "clavier, contrastes, textes alternatifs : aucun défaut bloquant détecté" };
      if (a11yBlocking.length) issues.push(...a11yBlocking.slice(0, 3));
      measures.performance = { score: clamp(10 - Math.max(0, avg(fidelity.loadRatio) - 1.5) * 2), provenance: prov, detail: `temps de chargement local ${avg(fidelity.loadRatio).toFixed(2)}× celui de l'aperçu (aucun score Lighthouse)` };
      if (fidelity.mobileBlocking) codes.add("mobile_overflow");
      if (fidelity.jsErrors.length) { codes.add("js_error"); issues.push(...fidelity.jsErrors.slice(0, 3)); }
      if (ratio(fidelity.struct) < 0.75 || diff > 0.12) { codes.add("layout_mismatch"); issues.push(`mise en page différente de l'aperçu (sections identiques ${fidelity.struct.filter(Boolean).length}/${fidelity.struct.length}, écart ${diff.toFixed(3)})`); }
      if (avg(fidelity.colors) < 0.6 || !ratio(fidelity.fonts)) { codes.add("styles_lost"); issues.push("styles perdus (couleurs ou typographies)"); }
      if (fidelity.imgOk.some((x) => !x)) issues.push("image(s) cassée(s) sur le site");
      result.fidelity = { diff: Number(diff.toFixed(3)), structure: `${fidelity.struct.filter(Boolean).length}/${fidelity.struct.length}`, texts: Number(avg(fidelity.textRatio).toFixed(3)), fonts: ratio(fidelity.fonts), colors: Number(avg(fidelity.colors).toFixed(2)), mobileBlocking: fidelity.mobileBlocking, desktopBlocking: fidelity.desktopBlocking, jsErrors: fidelity.jsErrors.slice(0, 5) };
    }
    if (inst?.ok) {
      // Liens du menu et des sections, sur le site installé.
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const lc = await linkCheck(page, fidelity.links);
      await ctx.close();
      result.links = lc;
      measures.navigation = { score: clamp(10 * (1 - lc.bad.length / Math.max(lc.checked, 1)) - (lc.bad.length ? 2 : 0)), provenance: "installed_local", detail: `${lc.checked} liens vérifiés, ${lc.bad.length} en erreur` };
      measures.buttons = { ...measures.navigation };
      if (lc.bad.length > lc.checked / 4) codes.add("navigation_unusable");
      if (lc.bad.length) issues.push(...lc.bad.slice(0, 3).map((b) => `lien en erreur : ${b}`));
      // Formulaire.
      const contact = spec.store.pages.find((p) => /contact/.test(p.handle));
      const ft = await formTest(browser, platform, [contact ? cPath(`/pages/${contact.handle}`) : null, cPath(cp ? `/pages/${cp.handle}` : "/"), cPath("/")].filter(Boolean) as string[]);
      result.form = ft;
      measures.forms = { score: ft.ok ? 10 : 3, provenance: "installed_local", detail: ft.detail };
      // E-commerce.
      if (!services) {
        const ct = await commerceTest(browser, platform, inst, dir);
        result.commerce = ct;
        if (ct.ok === null) issues.push(`e-commerce non vérifiable : ${ct.detail.join(" ; ")}`);
        else {
          measures.ecommerce = { score: ct.ok ? 10 : 2, provenance: "installed_local", detail: ct.detail.join(" ; ") };
          if (!ct.ok) codes.add("cart_broken");
        }
      }
      // Sécurité et médias, sur les pages servies.
      const served = (await Promise.all(pages.filter((p) => p.c).map(async (p) => (await fetch(p.c!)).text()))).join("\n");
      const leaked = Object.entries(process.env).filter(([k, v]) => /KEY|SECRET|TOKEN|PASSWORD|PRIVATE/i.test(k) && v && v.length >= 12 && served.includes(v)).map(([k]) => k);
      measures.security = { score: leaked.length ? 0 : 10, provenance: "installed_local", detail: leaked.length ? `secrets exposés : ${leaked.join(", ")}` : "aucun secret du studio dans les pages servies ; scripts du thème seulement" };
      if (leaked.length) codes.add("secret_exposed");
      measures.media_integrity = { score: fidelity.imgOk.every(Boolean) && !exp.issues.some((i) => i.code === "rejected_media") ? 10 : 4, provenance: "installed_local", detail: "images servies chargées ; médias refusés exclus de l'export" };
      // Modification native.
      if (platform === "woocommerce") {
        const ed = await wpEditorTest(browser, inst.themeDir!, dir).catch((e) => ({ ok: false, stable: false, detail: `test interrompu : ${String((e as Error).message).slice(0, 200)}` }));
        result.nativeEditing = ed;
        measures.native_editing = { score: ed.ok ? 9 : 3, provenance: "installed_local", detail: ed.detail };
        measures.edit_stability = { score: ed.stable ? 10 : 3, provenance: "installed_local" };
        if (!ed.ok) codes.add("native_edit_lost");
      } else {
        // PrestaShop n'a pas d'éditeur visuel de thème : produits, catégories, prix, stocks, messages et réglages se
        // modifient dans l'administration ; les textes des sections, dans les gabarits Smarty du module (fichiers).
        result.nativeEditing = { ok: false, detail: "PrestaShop : catalogue, prix, stocks, commandes et messages modifiables dans l'administration ; textes et mise en page des sections seulement dans les fichiers du thème/module (pas d'éditeur visuel)" };
        measures.native_editing = { score: 5, provenance: "installed_local", detail: result.nativeEditing.detail };
      }
    }
    if (platform === "shopify") {
      issues.push("Shopify : aucune installation sur une boutique réelle (NON VÉRIFIÉ) — Theme Check et rendu local des fichiers exportés seulement");
    }
    // Limite propre à la plateforme (PrestaShop n'a pas d'éditeur visuel de thème) : une reprise ne peut pas la lever,
    // la décision est donc prise comme après la reprise permise (au mieux PROVISOIRE, jamais FINAL).
    const platformLimit = platform === "prestashop" && (measures.native_editing?.score ?? 10) < 6;
    const gate = gateCmsExport({ platform, services, measures, codes: [...codes], issues, attempt: platformLimit ? 1 : 0 });
    const checkId = fr(() => saveCheck(gate.decision, { userId, projectId, candidateId: `${platform}:bench` }));
    result.platformLimit = platformLimit ? "modification native limitée (pas d'éditeur visuel de thème dans PrestaShop)" : null;
    result.gate = { verdict: gate.decision.verdict, scope: gate.scope, scopeLabel: gate.scopeLabel.fr, score: gate.score, dimensions: gate.dimensions, unmeasured: gate.unmeasured, codes: [...codes], reason: gate.decision.reason, checkId, message: verdictMessage(platform, gate, "fr") };
    result.measures = measures;
    result.issues = issues;
    fs.writeFileSync(path.join(dir, "resultat.json"), JSON.stringify(result, null, 2));
    matrix[s][platform] = {
      export: exp.name,
      structure: st.static.codes.includes("invalid_structure") ? "KO" : "OK",
      installAttempted: platform !== "shopify",
      installed: inst?.ok ?? false,
      pages: result.pages.filter((p: PageResult) => p.c && (p.status ?? 200) < 400).length / 2,
      fidelity: result.fidelity ?? null,
      nativeEditing: result.nativeEditing?.ok ?? null,
      commerce: services ? "sans objet (site de services)" : result.commerce ? (result.commerce.ok === null ? "non vérifiable" : result.commerce.ok ? "OK" : "KO") : "non installé",
      seo: measures.seo?.score ?? null,
      blocking: [...codes],
      verdict: gate.decision.verdict,
      scope: gate.scope,
      score: gate.score,
    };
    console.log(`${gate.decision.verdict.padEnd(11)} ${s} ${platform} — ${gate.scopeLabel.fr}, note ${gate.score} ; défauts : ${[...codes].join(", ") || "aucun"}${gate.unmeasured.length ? ` ; non mesuré : ${gate.unmeasured.join(", ")}` : ""}`);
  }
  studio.close();
}
await browser.close();
fs.writeFileSync("reports/cms-v2-matrix.json", JSON.stringify({ generatedAt: new Date().toISOString(), environment: { wordpress: "6.6 (php 8.2)", woocommerce: "9.3.3", prestashop: "8.1.7", shopify: "Theme Check (aucune boutique réelle)" }, matrix }, null, 2));
fs.rmSync(WORK, { recursive: true, force: true });
process.exit(0);
