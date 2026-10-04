import type { SceneCtx } from "../../build-tutorials";

/** Début du tournage : les campagnes créées après cet instant sont retirées par cleanup. */
let startedAt = 0;

export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  startedAt = Date.now() - 1000;
  const modal = p.getByRole("dialog", { name: t("Nouvelle campagne", "New campaign") });
  await r.step(0, async () => {
    await r.spot(p.getByText(t("Aucune dépense publicitaire n'est engagée depuis le studio", "No ad spend is committed from the studio")).locator(".."), 6);
    await r.wait(2600);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.click(p.getByRole("button", { name: t("Nouvelle campagne", "New campaign") }), { settle: 1200 });
    await r.during(modal.waitFor({ state: "visible" }));
    await r.point(modal.getByRole("textbox", { name: t("Angle", "Angle") }).first());
  });
  await r.step(2, async () => {
    await r.point(modal.getByLabel(t("Nom", "Name"), { exact: true }));
    await r.wait(900);
    await r.point(modal.getByLabel(t("Objectif", "Objective"), { exact: true }));
    await r.wait(900);
    const tiktok = modal.getByRole("checkbox", { name: "TikTok" });
    await r.click(tiktok, { settle: 900 });
    await r.click(tiktok, { settle: 600 });
  });
  await r.step(3, async () => {
    await r.point(modal.getByLabel(t("Audience", "Audience"), { exact: true }));
    await r.wait(1200);
    await r.point(modal.getByLabel(t("Indicateurs suivis", "Tracked metrics"), { exact: true }));
  });
  await r.step(4, async () => {
    const btn = modal.getByRole("button", { name: t("Proposer les annonces dans cette langue", "Draft ads in this language") });
    await r.spot(btn.locator(".."), 6);
    await r.wait(1200);
    await r.spot(null);
    const reply = p.waitForResponse((res) => res.url().includes("/campaigns/draft") && res.request().method() === "POST", { timeout: 60_000 });
    await r.click(btn, { settle: 300 });
    await r.during(reply);
    await r.wait(1500);
  });
  await r.step(5, async () => {
    const first = modal.getByRole("textbox", { name: t("Texte principal", "Primary text") }).first();
    await r.point(modal.getByRole("textbox", { name: t("Angle", "Angle") }).first());
    await r.wait(600);
    await r.point(first);
    await r.wait(600);
    await r.point(modal.getByRole("textbox", { name: t("Titre", "Headline") }).first());
    await r.wait(500);
    await r.point(modal.getByRole("combobox", { name: t("Bouton", "Call to action") }).first());
    await r.wait(500);
    await r.click(modal.getByRole("button", { name: t("Choisir des créations", "Choose creatives") }).first(), { settle: 600 });
    const lib = p.getByRole("dialog", { name: t("Choisir dans la bibliothèque", "Choose from the library") });
    const tiles = lib.locator("button[aria-pressed]");
    await r.during(tiles.first().waitFor({ state: "visible", timeout: 60_000 }));
    await r.during(p.waitForFunction((label) => { const imgs = [...document.querySelectorAll(`[role=dialog][aria-label="${label}"] img`)].slice(0, 12) as HTMLImageElement[]; return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0); }, t("Choisir dans la bibliothèque", "Choose from the library"), { timeout: 40_000 }).catch(() => {}));
    await r.wait(400);
    await r.click(tiles.nth(0), { settle: 500 });
    await r.click(lib.getByRole("button", { name: t("Utiliser ce média", "Use this media") }), { settle: 900 });
  }, { hold: 600 });
  const card = p.getByRole("button", { name: t("Ouvrir", "Open"), exact: true }).first().locator("xpath=ancestor::div[contains(@class,'p-5')][1]");
  await r.step(6, async () => {
    const save = modal.getByRole("button", { name: t("Enregistrer", "Save"), exact: true });
    await r.point(modal.getByRole("button", { name: t("Créer les publications organiques", "Create organic posts") }));
    await r.wait(1500);
    const saved = p.waitForResponse((res) => res.url().endsWith("/campaigns") && res.request().method() === "POST", { timeout: 90_000 });
    await r.click(save, { settle: 300 });
    await r.during(saved);
    await r.during(modal.waitFor({ state: "hidden" }));
    await r.during(card.waitFor({ state: "visible", timeout: 30_000 }));
    await r.wait(800);
  });
  await r.step(7, async () => {
    await r.spot(card, 6);
    await r.wait(1500);
    await r.point(p.getByRole("button", { name: t("Export pour le gestionnaire de publicités", "Export for the ads manager") }).first());
    await r.wait(800);
    await r.spot(null);
  }, { hold: 800 });
}

/** Retire la campagne créée pendant le tournage (le studio n'a pas de bouton de suppression de campagne). */
export async function cleanup({ projectId }: SceneCtx) {
  const { run } = await import("../../../src/lib/db");
  run("DELETE FROM campaigns WHERE project_id = ? AND created_at >= ?", projectId, startedAt);
}
