/** Deux parcours UI réels contre le serveur local + test-harness ; aucune requête fournisseur. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";
import { chromium, type Page } from "playwright";
const dir = path.resolve(process.argv[2] || "");
if (!path.basename(dir).startsWith("ecs-preparation-test-"))
  throw new Error("Dossier isolé obligatoire");
const cfg = JSON.parse(
  fs.readFileSync(path.join(dir, "test-only.json"), "utf8"),
);
const base = "http://127.0.0.1:18100";
const out = path.join(dir, "captures");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results: any[] = fs.existsSync(path.join(out, "browser-proof.json"))
  ? JSON.parse(fs.readFileSync(path.join(out, "browser-proof.json"), "utf8"))
      .results
  : [];
const photo = path.join(dir, "source-synthetique.png");
await sharp(
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#ded8c8"/><rect x="210" y="60" width="380" height="450" rx="15" fill="#28504a"/><text x="400" y="560" font-size="22" text-anchor="middle">PHOTO SYNTHÉTIQUE DE TEST</text></svg>',
  ),
)
  .png()
  .toFile(photo);
for (const [index, c] of cfg.cases.entries()) {
  if (
    process.env.PREPARATION_CASE &&
    process.env.PREPARATION_CASE !== c.business
  )
    continue;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    locale: "fr-FR",
    recordVideo: { dir: out, size: { width: 1440, height: 960 } },
  });
  await context.addCookies([
    { name: "ecs_session", value: cfg.token, url: base },
    { name: "ecs-lang", value: "fr", url: base },
  ]);
  await context.addInitScript(() => {
    localStorage.setItem("ecs-lang", "fr");
    sessionStorage.setItem("ecsSeen", "1");
  });
  await context.route("**/*", (r) => {
    const u = new URL(r.request().url());
    return ["127.0.0.1", "localhost"].includes(u.hostname) ||
      ["data:", "blob:"].includes(u.protocol)
      ? r.continue()
      : r.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const slug = index ? "service" : "produit";
  let pid = "";
  const state = () =>
    page.evaluate(async (id) => {
      const r = await fetch(`/api/projects/${id}/preparation`);
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    }, pid);
  async function idle() {
    for (let i = 0; i < 160; i++) {
      const v = await state();
      if (!v.state.pending) {
        if (v.state.error) throw new Error(v.state.error.message);
        await page.waitForTimeout(350);
        return v;
      }
      await page.waitForTimeout(300);
    }
    throw new Error("Tâche non terminée");
  }
  async function shot(name: string) {
    console.log(slug, name);
    const history = page.locator("details[open]").filter({
      has: page.locator("summary", { hasText: "Versions enregistrées" }),
    });
    if (await history.count()) await history.locator("summary").click();
    const dismiss = page
      .locator("[data-tuto-nudge]")
      .getByRole("button", { name: "Masquer", exact: true });
    if (await dismiss.count()) await dismiss.click();
    await page.evaluate(async () => {
      for (const img of document.images) {
        img.loading = "eager";
        await img.decode().catch(() => {});
      }
      await document.fonts.ready;
      scrollTo({ top: 0, behavior: "instant" });
    });
    await page.screenshot({
      path: path.join(out, `${slug}-${name}.png`),
      fullPage: true,
    });
  }
  async function quotedClick(locator: any) {
    const action = (r: any, name: string) => {
      if (
        !r.url().endsWith(`/projects/${pid}/preparation`) ||
        r.request().method() !== "POST"
      )
        return false;
      try {
        return r.request().postDataJSON()?.action === name;
      } catch {
        return false;
      }
    };
    const quoted = page.waitForResponse((r) => action(r, "quote"));
    const generated = page.waitForResponse((r) => action(r, "generate"));
    void generated.catch(() => {});
    await locator.click();
    const response = await quoted;
    const result = await response.json();
    if (!response.ok()) throw new Error(result.error || "Devis refusé");
    if (result.quote.paid)
      await page
        .getByRole("dialog", { name: "Confirmer cet essai" })
        .getByRole("button", { name: "Confirmer cet essai", exact: true })
        .click();
    const started = await generated;
    if (!started.ok())
      throw new Error((await started.json()).error || "Préparation refusée");
    await idle();
    await page.waitForTimeout(700);
  }

  async function changeStep(n: number) {
    await page
      .locator("[data-preparation] ol")
      .first()
      .locator("button")
      .nth(n)
      .click();
  }
  await page.goto(base + "/studio", { waitUntil: "domcontentloaded" });
  if (index)
    await page
      .getByRole("button", { name: "Nouveau projet", exact: true })
      .click();
  await page.waitForSelector("input[name=businessType]", { state: "attached" });
  if (index) {
    await page
      .getByRole("radio", { name: /Le site de mon entreprise de services/ })
      .click();
  }
  await page.locator("#description").fill(c.description);
  await page.locator("#target").fill(c.target);
  await page.locator("#request").fill(c.constraints);
  await page.locator("input[name=photos]").setInputFiles(photo);
  if (!index) {
    await page
      .getByRole("button", { name: "Nom, marque, prix, logo…", exact: true })
      .click();
    await page.locator("#productName").fill(c.offerName);
    await page.locator("#brandName").fill(c.brandName);
    await page.locator("#price").fill(c.price);
  } else {
    await page.locator("#new-svc-name-0").fill(c.services.services[0].name);
    await page
      .getByLabel("Prestation 1 : description", { exact: true })
      .fill(c.services.services[0].description);
    await page
      .getByRole("button", { name: "Ajouter une prestation", exact: true })
      .click();
    await page.locator("#new-svc-name-1").fill(c.services.services[1].name);
    await page
      .getByLabel("Prestation 2 : description", { exact: true })
      .fill(c.services.services[1].description);
    const name = page.locator("#brandName");
    if (await name.count()) await name.fill(c.brandName);
  }
  await shot("01-saisie");
  await page
    .getByRole("button", { name: "Préparer mon projet", exact: true })
    .click();
  await page.waitForURL(/\/studio\/[^/]+\/pilote/, { timeout: 60000 });
  pid = page.url().split("/").at(-2)!;
  await page.waitForSelector("[data-brief-name]");
  // Les compléments sont remplis seulement si absents de la saisie initiale de l’ancien formulaire.
  if (index) {
    await page.locator("[data-brief-name]").fill(c.offerName);
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(c.services.email);
    await page
      .getByRole("textbox", { name: "Zone ou adresse", exact: true })
      .fill(c.services.area);
    await page
      .getByRole("combobox", {
        name: "Prochaine étape pour vos visiteurs",
        exact: true,
      })
      .selectOption("quote");
    await page.locator("[data-save-brief]").click();
    await page.waitForTimeout(500);
  }

  await quotedClick(
    page.getByRole("button", {
      name: "Analyser mes informations et mes photos par l’IA",
      exact: true,
    }),
  );
  await shot("02-offre-analysee");
  await page.locator("[data-approve-brief]").click();
  await page
    .getByRole("textbox", { name: "Références, un lien par ligne" })
    .fill(c.referenceUrls.join("\n"));
  await page
    .getByRole("button", { name: "Enregistrer ces références", exact: true })
    .click();
  await page.waitForTimeout(500);
  if (!index) {
    const correction = page.getByRole("textbox", {
      name: "Défaut précis à corriger pour un nouvel essai",
      exact: true,
    });
    await correction.fill(
      "[TEST_ECHEC_FOURNISSEUR] Vérifier le signalement d’une panne sans perte des données.",
    );
    await assert.rejects(
      () => quotedClick(page.locator("[data-generate-research]")),
      /Échec fournisseur simulé/,
    );
    await shot("03a-echec-fournisseur");
    await correction.fill(
      "Relire uniquement les mêmes références après la vérification de la panne.",
    );
  }
  await quotedClick(page.locator("[data-generate-research]"));
  await page
    .getByRole("textbox", {
      name: "Défaut précis à corriger pour un nouvel essai",
      exact: true,
    })
    .fill("");
  await page.locator("input[name=strategy][value=transparence]").check();
  await shot("03-recherche");
  await page.locator("[data-approve-research]").click();
  await quotedClick(page.locator("[data-generate-brand]"));
  await page.locator("[data-brand-name]").fill(c.brandName);
  await page.locator("[data-confirm-identity]").click();
  await page.waitForTimeout(500);
  await quotedClick(
    page.getByRole("button", {
      name: "Créer des propositions de logo",
      exact: true,
    }),
  );
  await page.locator("input[name=logo]").first().check();
  await shot("04-identite");
  await page.locator("[data-approve-brand]").click();
  await quotedClick(page.locator("[data-generate-content]"));
  await page
    .locator("[data-preparation] details")
    .first()
    .evaluate((el) => el.setAttribute("open", ""));
  await shot("05-contenus");
  await page.locator("[data-approve-content]").click();
  await page.locator("[data-approve-media]").waitFor();
  const slots = (await state()).state.stages.media.data.slots;
  for (let i = 0; i < slots.length; i++) {
    await quotedClick(
      page
        .getByRole("button", { name: "Créer ce visuel par l’IA", exact: true })
        .nth(i),
    );
    await page
      .getByRole("button", {
        name: "J’ai vérifié : utiliser cette image ici",
        exact: true,
      })
      .nth(i)
      .click();
    await page.waitForTimeout(450);
  }
  await page.locator("[data-approve-media]").click();
  await page
    .locator("[data-preparation] h1")
    .filter({ hasText: "Votre projet est prêt pour le thème" })
    .waitFor();
  let ready = (await state()).ready;
  assert(ready, JSON.stringify((await state()).blockers));
  assert.equal(ready.provenance, "simulation");
  await shot("06-pret");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Télécharger les données préparées",
      exact: true,
    })
    .click();
  const download = await downloaded;
  await download.saveAs(path.join(out, `${slug}-download.json`));
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(path.join(out, `${slug}-download.json`), "utf8"),
    ),
    ready,
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-preparation]");
  assert((await state()).ready);
  await shot("07-rechargement");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    storageState: await context.storageState(),
    locale: "fr-FR",
  });
  const mp = await mobile.newPage();
  await mp.goto(page.url(), { waitUntil: "domcontentloaded" });
  await mp.waitForSelector("[data-preparation]");
  await mp.waitForSelector("#ecs-splash", { state: "detached" });
  await mp.evaluate(async () => {
    for (const image of document.images) {
      image.loading = "eager";
      await image.decode().catch(() => {});
    }
    await document.fonts.ready;
    scrollTo({ top: 0, behavior: "instant" });
  });
  await mp.screenshot({
    path: path.join(out, `${slug}-08-mobile.png`),
    fullPage: true,
  });
  const overflow = await mp.evaluate(
    () => document.documentElement.scrollWidth - innerWidth,
  );
  assert(overflow <= 1, `Débordement mobile ${overflow}`);
  await mobile.close();
  fs.writeFileSync(
    path.join(out, `${slug}-ready.json`),
    JSON.stringify(ready, null, 2),
  );
  // Changer la cible sans perdre les résultats approuvés, vérification visuelle de l’obsolescence.
  await changeStep(0);
  await page
    .locator("[data-brief-target]")
    .fill(c.target + " — nouvelle cible de vérification");
  await page.locator("[data-save-brief]").click();
  await page.waitForTimeout(500);
  const changed = await state();
  assert.equal(changed.ready, null);
  assert.equal(changed.state.stages.content.status, "stale");
  await changeStep(3);
  await shot("09-choix-amont-modifie");
  results.push({
    case: slug,
    pid,
    readyRevision: ready.revision,
    persistedAfterReload: true,
    downloadedContractMatchesApi: true,
    staleAfterChange: true,
    overflowMobile: overflow,
    errors,
  });
  await context.close();
  fs.writeFileSync(
    path.join(out, "browser-proof.json"),
    JSON.stringify({ simulation: true, results }, null, 2),
  );
}
await browser.close();
fs.writeFileSync(
  path.join(out, "browser-proof.json"),
  JSON.stringify({ simulation: true, results }, null, 2),
);
console.log(JSON.stringify({ simulation: true, results }, null, 2));
