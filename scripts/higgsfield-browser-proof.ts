/** Real native UI/API/storage, simulated upstream only. No route interception. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
const root = process.env.DATA_DIR;
if (!root?.startsWith("/tmp/ecs-higgsfield-proof-"))
  throw Error("Isolated proof required");
const base = "http://127.0.0.1:3192",
  out = path.resolve("reports/higgsfield-192");
fs.mkdirSync(out, { recursive: true });
const { token } = JSON.parse(
  fs.readFileSync(path.join(root, "session.json"), "utf8"),
);
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  locale: "fr-FR",
  recordVideo: {
    dir: path.join(root, "video"),
    size: { width: 1440, height: 1080 },
  },
});
await ctx.addCookies([{ name: "ecs_session", value: token, url: base }]);
const anonymous = await browser.newContext();
const unauthenticated = await anonymous.request.get(
  `${base}/api/admin/higgsfield`,
);
if (unauthenticated.status() !== 401)
  throw Error("Admin endpoint must reject an anonymous reader");
await anonymous.close();
const page = await ctx.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/admin`, { waitUntil: "networkidle", timeout: 120000 });
await page
  .getByRole("button", { name: "Fournisseurs IA", exact: true })
  .click();
const card = page.getByTestId("higgsfield-admin");
await card.waitFor({ timeout: 120000 });
async function capture(name: string) {
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    if (document.querySelector("#proof-label")) return;
    const label = document.createElement("div");
    label.id = "proof-label";
    label.textContent =
      "PREUVE SIMULÉE · interface et API natives · aucun fournisseur réel · aucun appel payant";
    Object.assign(label.style, {
      background: "#892b31",
      color: "white",
      padding: "8px",
      font: "14px sans-serif",
      textAlign: "center",
    });
    document.querySelector('[data-testid="higgsfield-admin"]')!.prepend(label);
  });
  const b = await card.boundingBox();
  if (b) {
    await page.setViewportSize({
      width: page.viewportSize()!.width,
      height: Math.ceil(b.height) + 180,
    });
    await card.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(350);
  await page
    .getByText("Enregistré.", { exact: true })
    .waitFor({ state: "hidden", timeout: 10000 })
    .catch(() => {});
  await card.evaluate((el) =>
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 96),
  );
  await card.screenshot({ path: path.join(out, name) });
}
await capture("01-admin-avant-import-simule.png");
await page
  .getByRole("button", {
    name: "Récupérer / actualiser les tarifs",
    exact: true,
  })
  .click();
await card.getByText(/810\/810 tarifs acquis/).waitFor({ timeout: 120000 });
await page
  .getByRole("textbox", { name: "Filtrer les tarifs", exact: true })
  .fill("1080p");
await capture("02-tarifs-configurations-simules.png");
const checkboxes = card.getByRole("checkbox");
await checkboxes.nth(0).check();
await checkboxes.nth(3).check();
await page
  .getByRole("button", {
    name: "Confirmer les tarifs et activer les modèles sélectionnés",
    exact: true,
  })
  .click();
await card.getByText(/Version approuvée/).waitFor();
await capture("03-approbation-groupee-simulee.png");
await page
  .getByRole("button", { name: "Images & Vidéos", exact: true })
  .click();
const modelRow = page
  .getByRole("row")
  .filter({ hasText: "Seedance 2 · référence produit" });
await modelRow
  .getByRole("button", { name: "Choisir comme principal", exact: true })
  .click();
await modelRow.getByText("principal", { exact: true }).waitFor();
const overviewCheck = await page.evaluate(async () => {
  const response = await fetch("/api/admin/overview");
  return response.json();
});
if (
  overviewCheck.pricing.missing.some(
    (x: { task: string }) => x.task === "video_generation",
  )
)
  throw Error("Approved configuration tariff falsely reported missing");
if (
  overviewCheck.tasks.find((x: { id: string }) => x.id === "video_generation")
    ?.price?.unit !== "configuration"
)
  throw Error("Configuration pricing not reflected in native administration");
await page
  .getByRole("button", { name: "Fournisseurs IA", exact: true })
  .click();
await card.waitFor();

const status = await page.evaluate(async () => {
  const r = await fetch("/api/admin/higgsfield");
  return r.json();
});
if (
  JSON.stringify(status).includes("simulated-key-secret") ||
  JSON.stringify(status).includes("credentialFingerprint")
)
  throw Error("Secret leaked");
await page
  .getByRole("button", {
    name: "Récupérer / actualiser les tarifs",
    exact: true,
  })
  .click();
await page.waitForTimeout(2000);
await capture("04-actualisation-conserve-approbation.png");
await page.setViewportSize({ width: 390, height: 844 });
await capture("05-admin-mobile-simule.png");
const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
if (mobileOverflow) throw Error("Unexpected horizontal page overflow");
if (errors.length) throw Error(errors.join("\n"));
const video = page.video();
await ctx.close();
if (video) await video.saveAs(path.join(out, "parcours-admin-simule.webm"));
await browser.close();
fs.writeFileSync(
  path.join(out, "browser-result.json"),
  JSON.stringify(
    {
      method:
        "Native browser, API and database; mocked upstream via separate process preload",
      paidCalls: 0,
      realProviderCalls: 0,
      routeInterception: false,
      desktop: [1440, 1080],
      mobile: [390, 844],
      approvedModels: 2,
      errors,
      captures: 5,
    },
    null,
    2,
  ),
);
console.log(
  "Native admin import, bulk confirmation, refresh and mobile proof completed.",
);
