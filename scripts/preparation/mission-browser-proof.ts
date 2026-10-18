/** Navigateur réel, données mission-seed et fournisseurs bloqués. Aucune génération ni publication. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = path.resolve(process.argv[2] || "");
if (!path.basename(dir).startsWith("ecs-preparation-test-")) throw new Error("Dossier synthétique obligatoire.");
const fixtures = JSON.parse(fs.readFileSync(path.join(dir, "mission-private.json"), "utf8"));
const out = path.join(dir, "mission-browser"); fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:18100";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const results = [];
for (const f of fixtures) for (const mobile of [false, true]) {
  const name = `${f.business === "products" ? "produit" : "service"}-${mobile ? "mobile" : "ordinateur"}`;
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, locale: "fr-FR", reducedMotion: "reduce", recordVideo: { dir: out, size: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } } });
  await context.addCookies([{ name: "ecs_session", value: f.token, url: base }, { name: "ecs-lang", value: "fr", url: base }]);
  await context.addInitScript(() => { localStorage.setItem("ecs-lang", "fr"); sessionStorage.setItem("ecsSeen", "1"); });
  const external: string[] = [], errors: string[] = [];
  await context.route("**/*", route => {
    const u = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(u.hostname) || ["data:", "blob:"].includes(u.protocol)) return route.continue();
    external.push(u.hostname); return route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on("pageerror", e => errors.push(e.message));
  const state = () => page.evaluate(async id => { const r = await fetch(`/api/projects/${id}/preparation`); if (!r.ok) throw new Error(`Préparation HTTP ${r.status}`); return r.json(); }, f.pid);
  const step = async (i: number) => { await page.locator("[data-preparation] ol").first().locator("button").nth(i).click(); await page.waitForTimeout(400); };
  const banner = async () => page.evaluate(() => {
    if (!document.getElementById("proof-simulation")) {
      const label = document.createElement("div"); label.id = "proof-simulation"; label.textContent = "PREUVE UI — DONNÉES ET VERDICTS SIMULÉS — AUCUN FOURNISSEUR APPELÉ";
      label.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#503a12;color:white;text-align:center;font:12px sans-serif;padding:8px";
      document.body.append(label); document.documentElement.style.paddingTop = "42px";
    }
  });
  const shot = async (suffix: string) => {
    const dismiss = page.locator("[data-tuto-nudge]").getByRole("button", { name: "Masquer", exact: true }); if (await dismiss.count()) await dismiss.click();
    await banner();
    await page.evaluate(async () => { for (const img of document.images) { img.loading = "eager"; await img.decode().catch(() => {}); } await document.fonts.ready; scrollTo(0, 0); });
    await page.screenshot({ path: path.join(out, `${name}-${suffix}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    assert.equal(overflow, false, `${name}/${suffix} : débordement horizontal`);
  };
  await page.goto(`${base}/studio/${f.pid}/pilote`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-preparation]"); await banner();
  const initial = await state(); assert.equal(initial.ready, null);
  assert.equal(initial.state.stages.media.data.slots.length, f.business === "products" ? 11 : 12);
  await step(2);
  assert.equal(await page.locator("[data-direction]").count(), 3);
  await shot("directions");
  await page.locator("[data-direction]").last().scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
  await step(3);
  await page.getByRole("heading", { name: "Choisir le thème recommandé avant composition", exact: true }).waitFor();
  const contact = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Contact —/ }) }).first();
  await contact.locator("summary").click(); await shot("contenus-contact");
  await contact.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await step(4); await shot("medias");
  const video = page.locator("[data-preparation] video").first();
  await video.scrollIntoViewIfNeeded();
  await video.evaluate(async (node: HTMLVideoElement) => { await node.play(); }); await page.waitForTimeout(900);
  assert.equal(await video.evaluate((node: HTMLVideoElement) => node.currentTime > 0), true);
  await video.evaluate((node: HTMLVideoElement) => node.pause());
  let placementSaved = false;
  if (!mobile) {
    const field = page.getByLabel("Affectation dans les pages", { exact: true }).first();
    const current = await field.inputValue();
    const options = await field.locator("option").evaluateAll(nodes => nodes.map(n => (n as HTMLOptionElement).value));
    const chosen = options.find(v => v !== current && v.startsWith("brand|"))!; assert.ok(chosen);
    await field.selectOption(chosen);
    const response = page.waitForResponse(r => r.url().endsWith(`/projects/${f.pid}/preparation`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Enregistrer l’affectation et revérifier", exact: true }).first().click();
    assert.equal((await response).ok(), true);
    await page.reload({ waitUntil: "networkidle" });
    const after = await state(), slot = after.state.stages.media.data.slots[0];
    assert.equal(`${slot.pageKey}|${slot.sectionKey}`, chosen); assert.equal(slot.reviewed, false); assert.equal(after.ready, null);
    placementSaved = true;
  }
  assert.deepEqual(errors, []);
  results.push({ case: name, simulation: true, directions: 3, ready: false, videoPlayedAndPaused: true, placementSavedAfterReload: placementSaved, externalRequestsBlocked: external, pageErrors: errors });
  const videoPath = await page.video()!.path(); await context.close(); fs.renameSync(videoPath, path.join(out, `${name}.webm`));
}
await browser.close();
fs.writeFileSync(path.join(out, "browser-proof.json"), JSON.stringify({ simulation: true, results }, null, 2));
console.log("12 captures et 4 vidéos du navigateur ; interface réelle, contenu synthétique, aucun appel fournisseur.");
