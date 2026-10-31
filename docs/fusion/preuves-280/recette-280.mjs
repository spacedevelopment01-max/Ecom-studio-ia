// Recette #280 : galerie des thèmes, carte Atelier Rive, trois états de sa démo (ancienne version, échec, à jour).
import fs from "node:fs";
import { browser, context, ids, login, open, STUDIO, DIR } from "./lib.mjs";
const R = process.argv[2], OUTD = DIR + "preuves/"; const out = {};
const meta = JSON.parse(fs.readFileSync(`${R}/rive/demo.json`, "utf8")), current = meta.version;
const setState = (s) => {
  fs.writeFileSync(`${R}/rive/demo.json`, JSON.stringify({ ...meta, version: s === "a-jour" ? current : "version-precedente-0000" }));
  const f = `${R}/.echec-rive.json`;
  const lock = `${R}/.preparation.json`;
  if (s === "actualisation") fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, started: Date.now(), themes: ["rive"] })); else fs.rmSync(lock, { force: true });
  if (s === "echec") fs.writeFileSync(f, JSON.stringify({ version: current, date: new Date().toISOString(), message: "export incomplet (accueil absent)" })); else fs.rmSync(f, { force: true });
};
const b = await browser();
for (const kind of ["ordinateur", "telephone"]) {
  const page = await (await context(b, kind)).newPage();
  await login(page, "proprio@recette.invalid");
  for (const s of ["ancienne", "actualisation", "echec", "a-jour"]) {
    setState(s);
    await open(page, `${STUDIO}/studio/${ids.platrier}/boutique?themes`);
    const btn = page.locator('[data-open-demo="rive"]');
    await btn.waitFor({ timeout: 30000 });
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const card = btn.locator("xpath=ancestor::*[.//img][1]");
    out[`${kind}_${s}`] = { bouton: (await btn.innerText()).trim(), actif: await btn.isEnabled(), note: (await page.locator('[data-demo-failed="rive"]').count()) ? (await page.locator('[data-demo-failed="rive"]').innerText()).trim() : null };
    await card.screenshot({ path: `${OUTD}i280-${kind}-${s}.png` });
    if (s === "a-jour") {
      await btn.click();
      const frame = page.frameLocator('iframe[src*="/api/theme-demos/rive"]');
      await frame.locator("h1").first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(2500);
      out[`${kind}_${s}`].demoTitre = await frame.locator("h1").first().innerText().catch(() => null);
      await page.screenshot({ path: `${OUTD}i280-${kind}-demo-ouverte.png` });
    }
  }
}
setState("a-jour");
fs.writeFileSync(`${OUTD}i280-recette.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
