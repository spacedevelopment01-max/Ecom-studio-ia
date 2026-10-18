/** Restauration par les vrais boutons : choix conservés, zéro demande de génération. Données de test uniquement. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const dir = path.resolve(process.argv[2] || "");
if (!path.basename(dir).startsWith("ecs-preparation-test-"))
  throw new Error("Dossier de test isolé obligatoire.");
const cfg = JSON.parse(
  fs.readFileSync(path.join(dir, "test-only.json"), "utf8"),
);
const original = JSON.parse(
  fs.readFileSync(path.join(dir, "captures/browser-proof.json"), "utf8"),
).results;
const base = "http://127.0.0.1:18100";
const out = path.join(dir, "captures");
const code =
  process.env.CODE_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const results = [];
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
for (const entry of original) {
  const expected = JSON.parse(
    fs.readFileSync(path.join(out, `${entry.case}-ready.json`), "utf8"),
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "fr-FR",
    recordVideo: { dir: out, size: { width: 1440, height: 960 } },
  });
  await context.addCookies([
    { name: "ecs_session", value: cfg.token, url: base },
    { name: "ecs-lang", value: "fr", url: base },
  ]);
  await context.addInitScript(() => sessionStorage.setItem("ecsSeen", "1"));
  await context.route("**/*", (r) => {
    const u = new URL(r.request().url());
    return ["127.0.0.1", "localhost"].includes(u.hostname) ||
      ["data:", "blob:"].includes(u.protocol)
      ? r.continue()
      : r.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors: string[] = [];
  const actions: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/preparation"))
      try {
        actions.push(r.postDataJSON().action);
      } catch {}
  });
  const state = () =>
    page.evaluate(async (id) => {
      const r = await fetch(`/api/projects/${id}/preparation`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    }, entry.pid);
  await page.goto(`${base}/studio/${entry.pid}/pilote`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-preparation]");
  await page
    .locator("[data-preparation] ol")
    .first()
    .locator("button")
    .nth(0)
    .click();
  const savedTarget = (await state()).state.stages.brief.data.input.target;
  await page
    .locator("[data-brief-target]")
    .fill(savedTarget + " — non enregistré");
  assert(
    await page.locator("[data-approve-brief]").isDisabled(),
    "Une saisie non enregistrée ne doit pas être ignorée.",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-preparation]");
  await page
    .locator("summary")
    .filter({ hasText: "Versions enregistrées" })
    .click();
  await page
    .locator("li")
    .filter({ hasText: new RegExp(`^Version ${entry.readyRevision} —`) })
    .getByRole("button", { name: "Reprendre pour vérification", exact: true })
    .click();
  await page.waitForFunction(
    (target) =>
      (document.querySelector("[data-brief-target]") as HTMLInputElement)
        ?.value === target,
    expected.clientBrief.target,
  );
  await page.locator("[data-approve-brief]").click();
  await page.locator("[data-approve-research]").waitFor();
  const selected = (await state()).state.stages.research.data.selectedId;
  assert(
    await page
      .locator("input[name=strategy]")
      .evaluateAll(
        (els, id) =>
          els.some(
            (e) =>
              (e as HTMLInputElement).value === id &&
              (e as HTMLInputElement).checked,
          ),
        selected,
      ),
  );
  const refs = page.getByRole("textbox", {
    name: "Références, un lien par ligne",
    exact: true,
  });
  const savedRefs = (
    await state()
  ).state.stages.brief.data.input.referenceUrls.join("\n");
  await refs.fill(
    savedRefs + "\nhttps://example.test/reference-non-enregistree",
  );
  assert(await page.locator("[data-generate-research]").isDisabled());
  assert(await page.locator("[data-approve-research]").isDisabled());
  await refs.fill(savedRefs);
  await page.locator("[data-approve-research]").click();
  await page.locator("[data-approve-brand]").waitFor();
  assert.equal(
    (await state()).state.stages.research.data.selectedId,
    selected,
    "La stratégie restaurée doit rester celle affichée.",
  );
  const name = expected.brand.name;
  await page.locator("[data-brand-name]").fill(name + " non enregistré");
  assert(await page.locator("[data-approve-brand]").isDisabled());
  assert(
    await page
      .getByRole("button", {
        name: "Créer des propositions de logo",
        exact: true,
      })
      .isDisabled(),
  );
  await page.locator("[data-brand-name]").fill(name);
  await page.locator("[data-approve-brand]").click();
  await page.locator("[data-approve-content]").waitFor();
  await page.locator("[data-approve-content]").click();
  await page.locator("[data-approve-media]").waitFor();
  const consent = page.getByRole("combobox", {
    name: "Présence humaine dans cette utilisation",
    exact: true,
  });
  await consent.nth(0).selectOption("this_slot");
  assert(
    await page
      .getByRole("button", { name: "Créer ce visuel par l’IA", exact: true })
      .nth(0)
      .isDisabled(),
  );
  await consent.nth(0).selectOption("none_confirmed");
  for (let i = 0; i < expected.media.length; i++) {
    await consent
      .nth(i)
      .selectOption(expected.media[i].peopleConsent || "none_confirmed");
    await page
      .getByRole("button", {
        name: "J’ai vérifié : utiliser cette image ici",
        exact: true,
      })
      .nth(i)
      .click();
  }
  await page.locator("[data-approve-media]").click();
  await page
    .locator("[data-preparation] h1")
    .filter({ hasText: "Votre projet est prêt pour le thème" })
    .waitFor();
  const ready = (await state()).ready;
  assert(ready);
  assert.deepEqual(ready.strategy, expected.strategy);
  assert.deepEqual(ready.documents, expected.documents);
  assert.deepEqual(
    ready.media.map((x: any) => x.assetId),
    expected.media.map((x: any) => x.assetId),
  );
  assert(!actions.some((x) => x === "generate" || x === "quote"));
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Télécharger les données préparées",
      exact: true,
    })
    .click();
  const dl = await downloadPromise;
  await dl.saveAs(path.join(out, `${entry.case}-restored-download.json`));
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(
        path.join(out, `${entry.case}-restored-download.json`),
        "utf8",
      ),
    ),
    ready,
  );
  const nudge = page
    .locator("[data-tuto-nudge]")
    .getByRole("button", { name: "Masquer", exact: true });
  if (await nudge.count()) await nudge.click();
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: path.join(out, `${entry.case}-10-restauration-validee.png`),
    fullPage: true,
  });
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "fr-FR",
    storageState: await context.storageState(),
  });
  await mobile.addInitScript(() => sessionStorage.setItem("ecsSeen", "1"));
  const mp = await mobile.newPage();
  await mp.goto(page.url(), { waitUntil: "domcontentloaded" });
  await mp.waitForSelector("[data-preparation]");
  await mp.screenshot({
    path: path.join(out, `${entry.case}-11-restauration-mobile.png`),
    fullPage: true,
  });
  await mp
    .getByRole("heading", {
      name: "Prêt pour le moteur de thèmes",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await mp.screenshot({
    path: path.join(out, `${entry.case}-12-telechargement-mobile.png`),
  });
  await mobile.close();
  fs.writeFileSync(
    path.join(out, `${entry.case}-restored-ready.json`),
    JSON.stringify(ready, null, 2),
  );
  results.push({
    case: entry.case,
    pid: entry.pid,
    revision: ready.revision,
    selectedChoicePreserved: true,
    documentsAndMediaPreserved: true,
    unsavedBriefBlocked: true,
    unsavedIdentityBlocked: true,
    unsavedReferencesBlocked: true,
    unsavedConsentBlocksGeneration: true,
    generationRequests: 0,
    downloadMatchesApi: true,
    errors,
  });
  await context.close();
  console.log(entry.case, "restauration validée, aucune génération");
}
await browser.close();
const proof = { code, simulation: true, results };
fs.writeFileSync(
  path.join(out, "restoration-proof.json"),
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof, null, 2));
