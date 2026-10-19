/** Inspection ciblée du vrai studio. Aucune route de génération autorisée par ce harnais. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = path.resolve(process.env.DATA_DIR || "");
if (!path.basename(dir).startsWith("ecs-test-video-mission-")) throw Error("Dossier isolé requis");
const { token, ui } = JSON.parse(fs.readFileSync(path.join(dir, "private-ui.json"), "utf8"));
const out = path.join(dir, "public"), base = "http://localhost:3134";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const results: object[] = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
    await context.addCookies([{ name: "ecs_session", value: token, url: base }, { name: "ecs-lang", value: "fr", url: base }]);
    await context.addInitScript(() => { sessionStorage.setItem("ecsSeen", "1"); localStorage.setItem("ecs-lang", "fr"); });
    const page = await context.newPage(); const errors: string[] = [], blocked: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await context.route("**/*", async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== base) { blocked.push(`${req.method()} ${url.origin}${url.pathname}`); return route.abort(); }
      if (!["GET", "HEAD"].includes(req.method())) {
        const b = req.postDataJSON();
        if (!(url.pathname.endsWith("/creative/video") && b?.action === "quote")) throw Error(`Requête mutative interdite : ${req.method()} ${url.pathname}`);
      }
      return route.continue();
    });
    for (const item of ui) {
      const organic = item.slug.includes("organique"), name = `${item.slug}-${mobile ? "mobile" : "ordinateur"}`;
      await page.goto(`${base}/studio/${item.pid}/${organic ? "publications" : "publicites"}#video`, { timeout: 120000 });
      const section = page.locator(`[data-guided-video=${organic ? "post" : "ad"}]`);
      await section.waitFor({ timeout: 120000 });
      await section.locator("[data-guided-videos]").waitFor({ timeout: 120000 });
      const review = section.locator("[data-video-review]").first();
      await review.locator("summary").click();
      const dismiss = page.getByRole("button", { name: /Fermer|Close/ }).filter({ visible: true });
      if (await dismiss.count()) await dismiss.first().click().catch(() => {});
      await page.evaluate(() => { const el = document.createElement("div"); el.textContent = "TEST LOCAL — MIRES ET FOURNISSEURS SIMULÉS — 0 €"; el.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#704b16;color:white;text-align:center;padding:6px;font:12px sans-serif"; el.id = "video-proof-label"; document.body.append(el); });
      const warnings = await review.innerText();
      assert(warnings.includes("à vérifier")); assert(warnings.includes("Non vérifié"));
      const video = section.locator("video").first();
      await video.evaluate(async (el: HTMLVideoElement) => { el.muted = true; el.currentTime = 1; await el.play(); });
      await page.waitForTimeout(400); const currentTime = await video.evaluate((el: HTMLVideoElement) => { el.pause(); return el.currentTime; });
      assert(currentTime > 1);
      await section.screenshot({ path: path.join(out, `${name}.png`) });
      await video.screenshot({ path: path.join(out, `${name}-lecture.png`) });
      if (!organic && item.slug.startsWith("service")) {
        await section.locator('[data-video-scenes="1"]').click(); await section.locator('[data-video-duration="60"]').click();
        await section.locator("[data-video-price]").getByText(/davantage de scènes/).waitFor();
        assert(await section.locator("[data-guided-video-submit]").isDisabled());
        await section.screenshot({ path: path.join(out, `${name}-duree-refusee.png`) });
      }
      results.push({ name, warnings, playbackCurrentTime: currentTime, errors: [...errors], externalBlocked: [...blocked], generationRequestsAllowed: 0 });
    }
    await context.close();
  }
} finally { await browser.close(); }
assert(results.every((r: any) => r.errors.length === 0));
fs.writeFileSync(path.join(out, "validation-ui.json"), JSON.stringify({ scope: "navigation, limites visibles, lecture et refus d'une durée impossible ; pas de création IA depuis le navigateur", simulation: true, results }, null, 2));
console.log("Six inspections UI ordinateur/mobile ; lecture réelle et avertissements visibles ; aucune route de génération autorisée.");
