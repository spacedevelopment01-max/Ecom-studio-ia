// Recette #281 : galerie réelle, démos générées par le vrai préparateur (Rive services, Onde et Fraise produits).
import fs from "node:fs";
import { browser, context, ids, login, open, STUDIO, DIR } from "./lib.mjs";
const R = process.argv[2], OUTD = DIR + "preuves/", out = {};
const PUBLIC_SHOTS = new Set(["rive"]); // médias suivis dans le dépôt ; Onde/Fraise : kit privé, captures non publiées
const b = await browser();
const status = async (page) => page.evaluate(async () => (await (await fetch("/api/theme-demos")).json()).demos.filter((d) => ["rive", "onde", "fraise"].includes(d.id)).map(({ id, ready, stale, preparing, version, missing, failed }) => ({ id, ready, stale, preparing, version: version?.slice(0, 8), missing: missing?.length ?? 0, failed: !!failed })));
const cards = async (page) => { const r = {}; for (const id of ["rive", "onde", "fraise"]) { const btn = page.locator(`[data-open-demo="${id}"]`); await btn.waitFor({ timeout: 30000 }); r[id] = { bouton: (await btn.innerText()).trim(), actif: await btn.isEnabled(), visuelsAbsents: await page.locator(`[data-demo-missing="${id}"]`).count() > 0 }; } return r; };
for (const kind of ["ordinateur", "telephone"]) {
  const page = await (await context(b, kind)).newPage();
  await login(page, "proprio@recette.invalid");
  await open(page, `${STUDIO}/studio/${ids.platrier}/boutique?themes`);
  out[`${kind}_api`] = await status(page);
  out[`${kind}_cartes`] = await cards(page);
  for (const id of ["rive", "onde"]) {
    await page.locator(`[data-open-demo="${id}"]`).click();
    const frame = page.frameLocator(`iframe[src*="/api/theme-demos/${id}"]`);
    await frame.locator("h1, h2").first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(2000);
    out[`${kind}_demo_${id}`] = (await frame.locator("h1, h2").first().innerText()).trim().replace(/\s+/g, " ");
    await page.screenshot({ path: `${OUTD}${PUBLIC_SHOTS.has(id) ? "" : "PRIVE-"}i281-${kind}-demo-${id}.png` });
    await page.keyboard.press("Escape"); await page.waitForTimeout(800);
  }
  // Rive périmée pendant sa régénération : verrou actif, ancienne version jamais « prête ».
  const meta = JSON.parse(fs.readFileSync(`${R}/rive/demo.json`, "utf8"));
  fs.writeFileSync(`${R}/rive/demo.json`, JSON.stringify({ ...meta, version: "version-precedente-0000" }));
  fs.writeFileSync(`${R}/.preparation.json`, JSON.stringify({ pid: process.pid, started: Date.now(), themes: ["rive"] }));
  await open(page, `${STUDIO}/studio/${ids.platrier}/boutique?themes`);
  out[`${kind}_rive_perimee_api`] = (await status(page)).find((d) => d.id === "rive");
  const btn = page.locator('[data-open-demo="rive"]'); await btn.waitFor(); await btn.scrollIntoViewIfNeeded(); await page.waitForTimeout(600);
  out[`${kind}_rive_perimee`] = (await btn.innerText()).trim();
  await page.screenshot({ path: `${OUTD}PRIVE-i281-${kind}-galerie-rive-actualisation.png` });
  await btn.locator("xpath=ancestor::*[.//img][1]").screenshot({ path: `${OUTD}i281-${kind}-carte-rive-actualisation.png` });
  fs.writeFileSync(`${R}/rive/demo.json`, JSON.stringify(meta)); fs.rmSync(`${R}/.preparation.json`, { force: true });
}
fs.writeFileSync(`${OUTD}i281-recette.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
