/**
 * Captures d'écran d'un thème compilé, sans lancer le studio : accueil (haut et pied de page), fiche produit,
 * menu ouvert au survol (ordinateur) et menu burger ouvert (téléphone). Signale tout débordement horizontal.
 *
 *   npx tsx scripts/theme-screens.ts <dossier-de-sortie> [direction] [mono|multi|niche|services] [fr|en]
 *   ex. npx tsx scripts/theme-screens.ts /tmp/captures atelier multi fr
 *
 * Réglages d'en-tête ou de pied de page à essayer : HEADER='{"mega_menu":"cards"}' FOOTER='{"style":"split"}'.
 */
import fs from "node:fs";
import http from "node:http";
import { chromium } from "playwright";
import { compileTheme } from "../src/lib/theme/compile";
import { renderPage, fontFilePath } from "../src/lib/theme/render";
import { sampleSpec, serviceSpec } from "../tests/fixtures";
import type { DirectionId } from "../src/lib/theme/directions";

const [out = "/tmp/theme-screens", direction = "atelier", kind = "multi", lang = "fr"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const spec: any = kind === "services" ? serviceSpec(direction as DirectionId, lang as "fr" | "en") : sampleSpec(direction as DirectionId, kind as "mono" | "multi" | "niche");
if (kind !== "services") spec.language = lang;
const groupSection = (g: "header" | "footer") => {
  const grp = spec.groups[g];
  return grp.sections[grp.order.find((k: string) => grp.sections[k].type === g)];
};
if (process.env.HEADER) Object.assign(groupSection("header").settings, JSON.parse(process.env.HEADER));
if (process.env.FOOTER) Object.assign(groupSection("footer").settings, JSON.parse(process.env.FOOTER));
const files = compileTheme(spec);

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url!, "http://x");
  const p = u.pathname.replace(/^\/p/, "") || "/";
  if (p.startsWith("/assets/")) {
    const t = files.get("assets/" + p.slice(8));
    res.writeHead(t ? 200 : 404, { "Content-Type": p.endsWith(".css") ? "text/css" : p.endsWith(".js") ? "application/javascript" : "image/svg+xml" });
    return res.end(t ?? "");
  }
  if (p.startsWith("/__fonts/")) {
    const f = fontFilePath(p.slice(9));
    if (!f) return res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "font/ttf" });
    return res.end(fs.readFileSync(f));
  }
  const r = await renderPage({ spec, base: "/p", files, cart: [] }, p, u.searchParams);
  res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(r.html);
});
await new Promise<void>((r) => server.listen(0, r));
const base = `http://localhost:${(server.address() as any).port}/p`;
// Animations figées et révélations au défilement affichées : captures stables.
const still = "*{animation:none!important;transition:none!important}[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important}";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const problems: string[] = [];
const product = spec.store.product?.handle;
const pages = [["accueil", "/"], ...(kind !== "services" && product ? [["produit", `/products/${product}`]] : [])];
for (const [device, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["telephone", { width: 390, height: 844 }]] as const) {
  const mobile = device === "telephone";
  for (const [name, path] of pages) {
    const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile });
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: still });
    await page.screenshot({ path: `${out}/${name}-${device}.png` });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (sw > 1) problems.push(`${name} (${device}) : la page déborde de ${sw} px en largeur`);
    if (name === "accueil") {
      if (mobile) {
        await page.click("[data-menu-open]").catch(() => {});
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${out}/menu-${device}.png` });
      } else if (await page.locator(".es-nav__item--parent .es-nav__link").first().isVisible()) {
        // Menu visible sur ordinateur (pas en disposition « minimal », où il est rangé dans le tiroir).
        await page.hover(".es-nav__item--parent .es-nav__link");
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${out}/menu-${device}.png` });
      }
    }
    // Pied de page en dernier : le défilement jusqu'en bas ne doit pas gêner les captures du menu.
    if (mobile) await page.keyboard.press("Escape").catch(() => {});
    await page.locator("footer").last().screenshot({ path: `${out}/${name}-pied-${device}.png` }).catch(() => {});
    await page.close();
  }
}
await browser.close();
server.close();
console.log(`Captures dans ${out} : ${fs.readdirSync(out).filter((f) => f.endsWith(".png")).join(", ")}`);
if (problems.length) {
  console.log(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log("✓ Aucun débordement horizontal.");
