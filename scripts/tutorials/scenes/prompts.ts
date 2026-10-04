import type { SceneCtx } from "../../build-tutorials";

const PROMPT_ID = "hightech-accueil";

/** Onglet Prompts : recherche, filtres, ouverture, complétion (locale, quelques secondes), favori (retiré au nettoyage), insertion dans la Boutique. */
export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const search = main.getByRole("textbox", { name: t("Rechercher", "Search") });
  const items = main.locator("ul > li > button");
  await r.during(items.first().waitFor({ state: "visible", timeout: 120_000 }));

  await r.step(0, async () => {
    await r.spot(items.first().locator("xpath=ancestor::ul[1]"), 4);
    await r.point(items.nth(1));
    await r.wait(600);
    await r.point(items.nth(3));
    await r.wait(500);
    await r.spot(null);
    await r.spot(main.getByText(t("dans la bibliothèque", "in the library"), { exact: false }), 6);
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.type(search, t("accueil", "homepage"), { delay: 90 });
    await r.wait(600);
    await r.spot(items.first().locator("xpath=ancestor::ul[1]"), 4);
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(2, async () => {
    const sector = main.getByRole("combobox", { name: t("Secteur", "Sector") });
    await r.spot(sector.locator("xpath=.."), 6);
    await r.point(sector);
    await sector.selectOption("hightech");
    await r.wait(900);
    const task = main.getByRole("combobox", { name: t("Type de tâche", "Task type") });
    await r.point(task);
    await task.selectOption("accueil");
    await r.wait(900);
    await r.point(main.getByRole("combobox", { name: t("Filtre", "Filter") }));
    await r.wait(700);
    await r.spot(null);
  });
  const prompt = items.filter({ hasText: t("Rendre l'accueil spectaculaire", "Make the homepage stunning") }).first();
  const body = main.getByRole("textbox", { name: t("Contenu du prompt", "Prompt content") });
  await r.step(3, async () => {
    await r.click(prompt, { settle: 900 });
    await r.spot(body.locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]"), 4);
    await r.point(body, { dy: 120 });
    await r.wait(1000);
    await r.spot(null);
  });
  await r.step(4, async () => {
    const fill = p.waitForResponse((res) => res.url().includes("/prompt-fill") && res.request().method() === "POST", { timeout: 90_000 });
    await r.click(main.getByRole("button", { name: t("Compléter avec le projet", "Complete with the project") }), { settle: 200 });
    await r.during(fill);
    await r.wait(500);
    const done = main.getByText(t("Complété avec le produit, la marque et les médias du projet actif.", "Completed with the active project's product, brand and media."));
    await r.during(done.waitFor({ timeout: 30_000 }).catch(() => {}));
    await r.spot(body, 4);
    await r.wait(1400);
    await r.spot(null);
  }, { hold: 400 });
  await r.step(5, async () => {
    await r.click(main.getByRole("button", { name: t("Ajouter aux favoris", "Add to favorites") }), { settle: 300 });
    await r.during(main.getByRole("button", { name: t("Retirer des favoris", "Remove from favorites") }).waitFor({ timeout: 30_000 }).catch(() => {}));
    await r.wait(700);
    // Survol seulement : « Enregistrer » ouvre une fenêtre du navigateur pour nommer le prompt.
    await r.point(main.getByRole("button", { name: t("Enregistrer", "Save"), exact: true }));
    await r.wait(900);
  });
  await r.step(6, async () => {
    const insert = main.getByRole("button", { name: new RegExp(t("^Insérer dans", "^Insert into")) });
    await r.spot(insert, 6);
    await r.point(insert);
    await r.wait(1200);
    await r.spot(null);
    await r.click(insert, { settle: 300 });
  });
  await r.step(7, async () => {
    const box = p.getByRole("textbox", { name: t("Votre demande", "Your request") });
    await r.during(box.waitFor({ state: "visible", timeout: 120_000 }));
    await r.during(p.waitForFunction(() => { const b = document.querySelector("main textarea") as HTMLTextAreaElement | null; return !!b && b.value.length > 20; }, null, { timeout: 60_000 }).catch(() => {}));
    await r.during(p.waitForLoadState("networkidle").catch(() => {}));
    // Aperçu de la boutique chargé (images comprises) avant de filmer.
    await r.during(p.frameLocator("iframe").first().locator("img").first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {}));
    await r.during(p.waitForFunction(() => { const d = document.querySelector("iframe")?.contentDocument; return !!d && [...d.images].slice(0, 4).every((i) => i.complete); }, null, { timeout: 60_000 }).catch(() => {}));
    await r.wait(800);
    await r.spot(box, 6);
    await r.point(box);
    await r.wait(1600);
    // Survol seulement : l'envoi modifierait la boutique.
    await r.point(p.getByRole("button", { name: t("Envoyer", "Send") }));
    await r.wait(900);
    await r.spot(null);
    await box.fill("");
  }, { hold: 600 });
}

/** Retire le favori ajouté pendant le tournage. */
export async function cleanup({ r, base }: SceneCtx) {
  const api = r.page.context().request;
  await api.patch(`${base}/api/prompts/${encodeURIComponent(PROMPT_ID)}`, { data: { favorite: false } });
}
