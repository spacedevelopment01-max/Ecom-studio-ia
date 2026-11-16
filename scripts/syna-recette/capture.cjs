// Capture d'écran du Studio privé d'essai, connecté comme un compte fictif.
// node scripts/syna-recette/capture.cjs <email> <chemin de page> <fichier.png> [sélecteur à cadrer] [largeur] [n]
const { chromium } = require("playwright");
const [, , email, url, out, selector, width = "1440", nth = "0"] = process.argv;
const origin = process.env.ORIGINE ?? "http://localhost:3493", password = process.env.MOT_DE_PASSE ?? "Recette-492-fictif";
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: Number(width), height: Number(process.env.HAUTEUR ?? 1000) }, deviceScaleFactor: Number(process.env.ECHELLE ?? 1) });
  const r = await ctx.request.post(origin + "/api/auth/login", { data: { email, password }, headers: { origin } });
  if (!r.ok()) throw new Error("connexion refusée " + r.status());
  const p = await ctx.newPage();
  let path = url;
  if (url.includes("{projet}")) { const list = await (await ctx.request.get(origin + "/api/projects")).json(); path = url.replace("{projet}", list.projects[0].id); }
  await p.goto(origin + path, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(3500);
  if (selector) { const el = p.locator(selector).nth(Number(nth)); await el.waitFor({ timeout: 30000 }); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await el.screenshot({ path: out }); }
  else await p.screenshot({ path: out, fullPage: process.env.ENTIER === "1" });
  console.log("capture", out, selector ? await p.locator(selector).count() : "");
  await b.close();
})().catch((e) => { console.error("ERREUR", String(e.message).slice(0, 400)); process.exit(1); });
