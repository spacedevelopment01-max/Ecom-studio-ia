/** Navigation réelle du build local, données fictives, jamais de confirmation payante. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = process.env.DATA_DIR;
if (!dir || !path.basename(dir).startsWith("ecs-preparation-test-204-")) throw new Error("Recette isolée obligatoire");
const cases = JSON.parse(fs.readFileSync(path.join(dir, "private-session.json"), "utf8")) as { slug: string; pid: string; token: string; width: number }[];
const out = path.resolve(process.argv[2] || path.join(dir, "captures")); fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:18504";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
const checks: unknown[] = [];
try {
  for (const width of [1440, 390]) for (const c of cases.filter(c => c.width === width)) {
    const mobile = width < 500;
    const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 960 }, locale: "fr-FR", isMobile: mobile, hasTouch: mobile });
    const errors: string[] = [];
    await context.route("**/*", r => ["127.0.0.1", "localhost"].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
    await context.addCookies([{ name: "ecs_session", value: c.token, url: base }, { name: "ecs-lang", value: "fr", url: base }]);
    await context.addInitScript(() => { localStorage.setItem("ecs-lang", "fr"); sessionStorage.setItem("ecsSeen", "1"); });
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(`${base}/studio/${c.pid}/pilote`, { waitUntil: "networkidle" });
    await page.locator("[data-analysis-retry]").waitFor();
    const admin = await page.request.get(`${base}/api/admin/ai-calls?analysis=1&project=${c.pid}`);
    assert.equal(admin.status(), 403, "La consultation des coûts internes est réservée à l'administration");
    const dismiss = page.locator("[data-tuto-nudge]").getByRole("button", { name: "Masquer", exact: true });
    if (await dismiss.count()) await dismiss.click();
    assert.equal(await page.locator("[data-initial-authorization]").count(), 0);
    assert.equal(await page.locator("[data-initial-creatives]").count(), 0);
    const action = page.locator("[data-brief-analyze]");
    const shot = async (suffix: string) => {
      const file = `${c.slug}-${mobile ? "mobile" : "ordinateur"}-${suffix}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true, animations: "disabled" });
      return file;
    };
    const images: string[] = [];
    await page.locator("[data-analysis-retry]").scrollIntoViewIfNeeded();
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); });
    const focus = `${c.slug}-${mobile ? "mobile" : "ordinateur"}-action.png`;
    await page.screenshot({ path: path.join(out, focus), animations: "disabled" }); images.push(focus, await shot("fiche"));
    if (c.slug !== "produit") {
      assert.equal(await page.locator('[data-fiche-question="changed_process"]').count(), 0);
      assert.equal(await page.locator('[data-fiche-question="changed_custom"]').count(), 0);
      await page.locator('[data-fiche-question="quote_inputs"]').waitFor();
      assert.equal(await page.locator('[data-fiche-fact="new_free_quote"]').count(), 0);
      assert.match(await page.locator('[data-fiche-fact="quote_price_old"]').innerText(), /À préciser plus tard/);
      assert.equal(await action.isDisabled(), true);
      await page.locator("[data-analysis-retry] textarea").fill("Préserver toutes les réponses et ne demander que les informations encore absentes.");
      assert.equal(await action.isDisabled(), c.slug === "service-limite");
      if (c.slug === "service-reprise") {
        const [response] = await Promise.all([page.waitForResponse(r => r.url().endsWith(`/api/projects/${c.pid}/preparation`) && r.request().method() === "POST"), action.click()]);
        assert.equal(response.status(), 200, await response.text());
        const dialog = page.getByRole("dialog", { name: "Confirmer cet essai", exact: true });
        await dialog.waitFor(); await dialog.scrollIntoViewIfNeeded();
        const quoteText = await dialog.innerText();
        assert.match(quoteText, /Estimation de consommation/); assert.match(quoteText, /Maximum autorisé/);
        assert.doesNotMatch(quoteText, /[€$]/);
        images.push(await shot("devis-sans-confirmation"));
        await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
      }
      const q = page.locator('[data-fiche-question="quote_inputs"]');
      await q.locator("textarea").fill("Photos, dimensions, usage souhaité et budget indicatif.");
      await q.getByRole("button", { name: "Ajouter à ma fiche", exact: true }).click();
      await q.waitFor({ state: "detached" });
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("[data-analysis-retry]").waitFor();
      assert.match(await page.locator('[data-fiche-fact="quote_inputs"]').innerText(), /Photos, dimensions, usage souhaité/);
      images.push(await shot("reouverture"));
    } else assert.equal(await action.isDisabled(), false);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 1, `Débordement ${overflow}px`);
    assert.deepEqual(errors, []);
    const version = await page.evaluate(async () => (await fetch("/api/version")).json());
    checks.push({ simulation: true, slug: c.slug, viewport: { width, mobile }, images, overflow, pageErrors: errors, adminTraceAccessStatus: admin.status(), quoteConfirmed: false, version });
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(out, "browser-proof.json"), JSON.stringify({ simulation: true, realProviderCalls: 0, checks }, null, 2));
console.log(JSON.stringify({ cases: checks.length, realProviderCalls: 0, out }));
