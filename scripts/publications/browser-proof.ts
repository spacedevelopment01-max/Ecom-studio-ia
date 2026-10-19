import sharp from "sharp";
import { FORMATS } from "../../src/lib/image-v2/formats";
/** Real browser / real local API / simulated worker. No remote provider or social send. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = process.argv[2];
if (
  !dir ||
  !path.isAbsolute(dir) ||
  !path.basename(dir).startsWith("ecs-publication-test-")
)
  throw new Error("Dossier de test isolé requis");
const cases = JSON.parse(
  fs.readFileSync(path.join(dir, "private.json"), "utf8"),
);
const out = path.join(dir, "browser");
fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:18130",
  browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
const results = [];
for (const f of cases)
  for (const mobile of [false, true]) {
    const name = `${f.business}-${mobile ? "mobile" : "ordinateur"}`;
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
      locale: "fr-FR",
      reducedMotion: "reduce",
      recordVideo: {
        dir: out,
        size: mobile
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
      },
    });
    await context.addCookies([
      { name: "ecs_session", value: f.token, url: base },
      { name: "ecs-lang", value: "fr", url: base },
    ]);
    await context.addInitScript({
      content:
        "globalThis.__name=fn=>fn;localStorage.setItem('ecs-lang','fr');sessionStorage.setItem('ecsSeen','1');",
    });
    const external: string[] = [],
      errors: string[] = [];
    await context.route("**/*", (r) => {
      const u = new URL(r.request().url());
      if (
        ["localhost", "127.0.0.1"].includes(u.hostname) ||
        ["data:", "blob:"].includes(u.protocol)
      )
        return r.continue();
      external.push(u.hostname);
      return r.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on("pageerror", (e) => errors.push(e.message));
    const banner = async () =>
      page.evaluate(() => {
        if (document.querySelector("#simulation-proof")) return;
        const d = document.createElement("div");
        d.id = "simulation-proof";
        d.textContent =
          "PREUVE UI — FOURNISSEURS SIMULÉS — QUALITÉ CRÉATIVE NON VALIDÉE";
        d.style.cssText =
          "position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#704b16;color:white;padding:9px;text-align:center;font:12px sans-serif;pointer-events:none";
        document.body.append(d);
      });
    const shot = async (suffix: string) => {
      await banner();
      await page.screenshot({
        path: path.join(out, `${name}-${suffix}.png`),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(out, `${name}-${suffix}-vue.png`),
        fullPage: false,
      });
    };
    const ads = () =>
      page.evaluate(async (pid) => {
        const r = await fetch(
          `/api/projects/${pid}/campaigns/v2?_proof=${Date.now()}`,
          { cache: "no-store" },
        );
        if (!r.ok) throw new Error(`campaigns ${r.status}`);
        return r.json();
      }, f.pid);
    await page.goto(`${base}/studio/${f.pid}/publicites#image`);
    await page.locator("[data-ai-ad-creator]").waitFor();
    const dismiss = page
      .locator("[data-tuto-nudge]")
      .getByRole("button", { name: "Masquer", exact: true });
    if (await dismiss.count()) await dismiss.click();
    // Only the desktop pass creates; mobile verifies the same saved assets after a fresh browser login.
    if (!mobile) {
      await page
        .locator("[data-ai-ad-creator] [data-subject-request]")
        .fill(
          "Vérification isolée : conserver le sujet choisi et la charte. Lumière latérale, texte lisible. Aucun humain. Les visuels de ce test sont synthétiques.",
        );
      await shot("01-demande");
      await page.locator("[data-ai-ad-submit]").click();
      for (let tries = 0; tries < 180; tries++) {
        const state = await ads();
        if (state.aiAds?.length >= 1) break;
        await page.waitForTimeout(500);
      }
    }
    let data = await ads();
    assert(data.aiAds.length >= 1, "création rangée");
    const original = data.aiAds.at(-1);
    await page.reload();
    await page.locator("[data-ai-ads]").waitFor();
    await page.locator("[data-ai-ads]").scrollIntoViewIfNeeded();
    await shot("02-creation-enregistree");
    {
      const target = mobile ? "1:1" : "2:3";
      const card = page
        .locator("[data-ai-ads] > div")
        .filter({ has: page.locator(`img[src='/api/files/${original.id}']`) })
        .first();
      await card.locator("[data-ai-image-open]").click();
      await card.getByRole("radio", { name: target, exact: true }).click();
      await card
        .getByRole("textbox", { name: /Modification souhaitée|Change wanted/ })
        .fill(
          "Éclaircir la lumière ; conserver le sujet, le logo et les textes.",
        );
      await card.locator("[data-ai-image-redo]").waitFor({ state: "visible" });
      await shot("03-retouche-format");
      await card.locator("[data-ai-image-redo]").click();
      for (let tries = 0; tries < 180; tries++) {
        const state = await ads();
        if (state.aiAds?.some((a: any) => a.aspect === target)) break;
        await page.waitForTimeout(500);
      }
    }
    data = await ads();
    assert(
      data.aiAds.some((a: any) => a.id === original.id),
      "original conservé",
    );
    const edited = data.aiAds.find(
      (a: any) => a.aspect === (mobile ? "1:1" : "2:3"),
    );
    assert(edited, "nouveau format sauvegardé");
    await page.reload();
    await page.locator("[data-ai-ads]").waitFor();
    await page.locator("[data-ai-ads]").scrollIntoViewIfNeeded();
    await shot("04-reprise");
    // Native files actually downloaded through the authenticated file API.
    const downloads = [];
    for (const a of [original, edited]) {
      const r = await context.request.get(`${base}${a.url}?download=1`);
      assert(r.ok());
      const bytes = await r.body();
      const file = `${f.business}-${a.aspect.replace(":", "x")}-SIMULATION.png`;
      fs.writeFileSync(path.join(out, file), bytes);
      const dims = await sharp(bytes).metadata();
      const expected = FORMATS[a.aspect as keyof typeof FORMATS];
      assert.equal(dims.width, expected.width);
      assert.equal(dims.height, expected.height);
      assert.equal(dims.format, "png");
      downloads.push({
        aspect: a.aspect,
        file,
        bytes: bytes.length,
        width: dims.width,
        height: dims.height,
      });
    }
    await page.goto(`${base}/studio/${f.pid}/fichiers`);
    await page
      .getByRole("textbox", { name: /Rechercher|Search/, exact: true })
      .fill("publicite-ia");
    await page.waitForTimeout(700);
    await shot("05-bibliotheque");
    const overflow = await page.evaluate(
      (width) => document.documentElement.scrollWidth - width,
      mobile ? 390 : 1440,
    );
    assert(overflow <= 1, `débordement ${overflow}px`);
    const video = page.video()!;
    await context.close();
    const file = path.join(out, `${name}.webm`);
    await video.saveAs(file);
    results.push({
      case: f.business,
      mobile,
      simulation: true,
      created: !mobile,
      retouchedAndReformatted: true,
      saved: true,
      reloaded: true,
      originalPreserved: true,
      downloads,
      externalBlocked: external,
      errors,
      overflow,
      video: path.basename(file),
    });
  }
await browser.close();
fs.writeFileSync(
  path.join(out, "browser-proof.json"),
  JSON.stringify(
    { simulation: true, providerCalls: 0, actualProviderCostMicro: 0, results },
    null,
    2,
  ),
);
console.log(
  "Parcours navigateur vérifiés (fournisseurs simulés, aucun appel réel).",
);
