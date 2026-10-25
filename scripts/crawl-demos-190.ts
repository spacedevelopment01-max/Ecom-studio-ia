/**
 * Mission #190, point 3 — contrôle des pages, liens et boutons de chaque thème sur maquette, sur sa démonstration
 * complète (export statique fait par scripts/prepare-theme-demos.ts, mêmes gabarits que l'aperçu du studio).
 *
 *   npx tsx scripts/crawl-demos-190.ts <dossier-des-démos> <sortie.json> [theme,theme…]
 *
 * Pour chaque page du plan (pages.json) + panier, recherche et 404, à 1440 px et 390 px :
 *  - erreurs JavaScript et ressources introuvables ;
 *  - liens internes : la page visée existe (sinon « lien cassé ») ; ancres : la cible existe ou le lien pilote un
 *    élément (aria-controls, data-*) ; liens externes listés ;
 *  - images non chargées (après défilement complet), débordement horizontal ;
 *  - boutons : sans nom accessible ; menu du téléphone (bouton aria-expanded) qui s'ouvre ;
 *  - fiche produit : choix d'une autre variante, « Ajouter au panier » (le panier de démonstration doit changer).
 * Aucun formulaire n'est réellement envoyé (la démonstration les intercepte).
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium, type Page } from "playwright";

const [root, outFile, onlyArg] = process.argv.slice(2);
if (!root || !outFile) throw new Error("usage : crawl-demos-190.ts <dossier> <sortie.json> [thèmes]");
const only = onlyArg?.split(",") ?? null;
const themes = fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, "pages.json")) && (!only || only.includes(d)));

const MIME: Record<string, string> = { html: "text/html; charset=utf-8", js: "text/javascript", css: "text/css", json: "application/json", webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", woff2: "font/woff2", woff: "font/woff", webm: "video/webm", mp4: "video/mp4" };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url!, "http://x").pathname);
  const file = path.join(root, p);
  if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("absent"); }
  res.setHeader("Content-Type", MIME[file.split(".").pop()!] ?? "application/octet-stream");
  fs.createReadStream(file).pipe(res);
});
await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch();

type PageResult = { file: string; width: number; errors: string[]; missing: string[]; broken: string[]; anchors: string[]; external: string[]; images: string[]; overflow: number; unnamedButtons: number; buttons: number; links: number; menu?: string; cart?: string; variant?: string };
const report: Record<string, { pages: PageResult[]; summary: Record<string, number> }> = {};

async function check(page: Page, theme: string, file: string, width: number): Promise<PageResult> {
  const errors: string[] = [], missing: string[] = [];
  page.removeAllListeners("pageerror"); page.removeAllListeners("response"); page.removeAllListeners("console");
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  page.on("response", (r) => { if (r.status() >= 400 && r.url().startsWith(origin)) missing.push(r.url().slice(origin.length)); });
  await page.setViewportSize({ width, height: width > 800 ? 900 : 844 });
  await page.goto(`${origin}/${theme}/${file}`, { waitUntil: "load" });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(300);
  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")];
    const anchors: string[] = [], external: string[] = [], internal: string[] = [];
    for (const a of links) {
      const raw = a.getAttribute("href") ?? "";
      if (/^(mailto|tel|sms):/.test(raw)) continue;
      if (raw.startsWith("#")) {
        const id = raw.slice(1);
        // « #cookies » : rouvre le bandeau des cookies (écouteur global du thème) ; aria-controls / data-* : piloté par le thème.
        const controls = raw === "#cookies" || a.hasAttribute("aria-controls") || [...a.attributes].some((x) => x.name.startsWith("data-")) || a.getAttribute("role") === "button";
        if (id && !document.getElementById(id) && !controls) anchors.push(raw);
        if (!id && !controls) anchors.push(`${raw} « ${(a.textContent ?? "").trim().slice(0, 40)} »`);
        continue;
      }
      const u = new URL(raw, location.href);
      if (u.origin !== location.origin) external.push(u.href); else internal.push(u.pathname);
    }
    const images = [...document.images].filter((i) => i.currentSrc && i.complete && i.naturalWidth === 0).map((i) => i.currentSrc.replace(location.origin, ""));
    const buttons = [...document.querySelectorAll<HTMLElement>("button, [role=button]")].filter((b) => b.offsetParent !== null);
    const unnamed = buttons.filter((b) => !(b.getAttribute("aria-label") || b.textContent?.trim() || b.getAttribute("title") || b.querySelector("img[alt]:not([alt=''])"))).length;
    return { anchors, external: [...new Set(external)], internal: [...new Set(internal)], images, overflow: document.documentElement.scrollWidth - innerWidth, buttons: buttons.length, unnamed, links: links.length };
  });
  const broken = info.internal.filter((p) => !/\/panier\.html\/(add|change|update)$/.test(p)).filter((p) => { const f = path.join(root, decodeURIComponent(p)); return !fs.existsSync(f) && !fs.existsSync(f.replace(/\/$/, "")); });
  const r: PageResult = { file, width, errors, missing: [...new Set(missing)], broken, anchors: info.anchors, external: info.external, images: info.images, overflow: info.overflow, unnamedButtons: info.unnamed, buttons: info.buttons, links: info.links };
  // Menu du téléphone : premier bouton visible de l'en-tête qui pilote un panneau (aria-expanded).
  if (width < 800 && file === "accueil.html") {
    const toggle = page.locator("header button[aria-expanded], [data-es-header] button[aria-expanded], .es-header button[aria-expanded]").filter({ visible: true }).first();
    if (await toggle.count()) {
      await toggle.click().catch(() => undefined);
      await page.waitForTimeout(400);
      r.menu = (await toggle.getAttribute("aria-expanded")) === "true" ? "s'ouvre" : "ne s'ouvre pas";
    } else r.menu = "aucun bouton de menu trouvé";
  }
  if (file.startsWith("produit")) {
    const before = await page.evaluate(() => localStorage.getItem("es-static-cart") ?? "vide");
    const select = page.locator("form[action*='/add'] select, [data-product-form] select, variant-selects select").filter({ visible: true }).first();
    const radio = page.locator("form[action*='/add'] input[type=radio]:not(:checked), form[action*='/add'] label:has(input[type=radio]:not(:checked))").first();
    if (await select.count()) { const opts = await select.locator("option").count(); if (opts > 1) { await select.selectOption({ index: 1 }).catch(() => undefined); r.variant = "liste changée"; } }
    else if (await radio.count()) { await radio.check({ force: true }).catch(() => undefined); r.variant = "option changée"; }
    const add = page.locator("form[action*='/add'] button[type=submit], form[action*='/add'] button:not([type]), button[name=add], [data-add-button]").filter({ visible: true }).first();
    if (await add.count()) {
      await add.click().catch(() => undefined);
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => localStorage.getItem("es-static-cart") ?? "vide");
      const drawer = await page.locator(".es-drawer.is-open, dialog[open], [data-cart-drawer][aria-hidden=false]").count();
      r.cart = after !== before ? `panier changé (${before} → ${after})` : drawer ? "tiroir du panier ouvert" : page.url().includes("panier") ? "page panier ouverte" : "aucun effet visible";
    } else r.cart = "aucun bouton d'ajout trouvé";
  }
  return r;
}

for (const theme of themes) {
  const plan = JSON.parse(fs.readFileSync(path.join(root, theme, "pages.json"), "utf8")) as { pages: { file: string }[]; services: boolean };
  const files = [...new Set([...plan.pages.map((p) => p.file), "404.html", "recherche.html", ...(plan.services ? [] : ["panier.html"])])].filter((f) => fs.existsSync(path.join(root, theme, f)));
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const pages: PageResult[] = [];
  for (const width of [1440, 390]) for (const f of files) { try { pages.push(await check(page, theme, f, width)); } catch (e) { pages.push({ file: f, width, errors: [`contrôle impossible : ${(e as Error).message.slice(0, 120)}`], missing: [], broken: [], anchors: [], external: [], images: [], overflow: 0, unnamedButtons: 0, buttons: 0, links: 0 }); } }
  await ctx.close();
  const sum = (k: keyof PageResult) => pages.reduce((n, p) => n + (Array.isArray(p[k]) ? (p[k] as unknown[]).length : 0), 0);
  report[theme] = { pages, summary: { pages: files.length, checks: pages.length, errors: sum("errors"), missing: sum("missing"), broken: sum("broken"), anchors: sum("anchors"), images: sum("images"), overflow: pages.filter((p) => p.overflow > 1).length, unnamedButtons: pages.reduce((n, p) => n + p.unnamedButtons, 0), buttons: pages.reduce((n, p) => n + p.buttons, 0), links: pages.reduce((n, p) => n + p.links, 0) } };
  console.log(`[contrôle] ${theme} : ${JSON.stringify(report[theme].summary)} · menu ${pages.find((p) => p.menu)?.menu ?? "—"} · panier ${pages.filter((p) => p.cart).map((p) => p.cart).join(" | ") || "—"}`);
}
fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + "\n");
await browser.close();
server.close();
