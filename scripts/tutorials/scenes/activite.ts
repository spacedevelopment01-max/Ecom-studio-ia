import type { SceneCtx } from "../../build-tutorials";

/** Rien n'est enregistré : les saisies montrées restent locales à la page (aucun clic sur « Enregistrer »). */
export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const name = p.locator("#act-name");
  await r.during(name.waitFor({ state: "visible", timeout: 30_000 }));
  await r.during(p.waitForFunction(() => !!(document.querySelector("#act-name") as HTMLInputElement | null)?.value, null, { timeout: 30_000 }).catch(() => {}));
  const sectionCard = (title: string) => main.locator("div.rounded-3xl").filter({ has: p.getByRole("heading", { name: title }) }).first();

  await r.step(0, async () => {
    const intro = main.getByText(t("Ce que vous écrivez ici est considéré comme confirmé", "What you write here is treated as confirmed"));
    await r.spot(intro, 8);
    await r.wait(2400);
    await r.spot(null);
  });
  await r.step(1, async () => {
    await r.point(name);
    await r.wait(700);
    await r.point(p.locator("#act-cat"));
    await r.wait(700);
    await r.point(p.locator("#act-sum"));
    await r.wait(500);
  });
  await r.step(2, async () => {
    await r.click(main.getByRole("button", { name: t("Ajouter une information", "Add information") }), { settle: 500 });
    const label = main.getByRole("textbox", { name: t("Information", "Information"), exact: true }).last();
    await r.type(label, t("Séance découverte", "Discovery session"));
    await r.type(main.getByRole("textbox", { name: t("Valeur", "Value"), exact: true }).last(), t("Offerte", "Free"));
    await r.wait(1000);
    // Ligne de démonstration retirée aussitôt (rien n'est enregistré).
    await r.click(main.getByRole("button", { name: t("Supprimer", "Delete"), exact: true }).last(), { settle: 500 });
  });
  await r.step(3, async () => {
    const card = sectionCard(t("Prestations", "Services"));
    await r.reveal(card.locator("li").first());
    await r.spot(card.locator("li").first(), 6);
    await r.point(p.getByRole("textbox", { name: t("Prestation 1 : nom", "Service 1: name") }));
    await r.wait(600);
    await r.point(p.getByRole("textbox", { name: t("Prestation 1 : description", "Service 1: description") }));
    await r.wait(500);
    await r.point(p.getByRole("textbox", { name: t("Prestation 1 : prix", "Service 1: price") }));
    await r.wait(500);
    await r.point(p.getByRole("textbox", { name: t("Prestation 1 : durée", "Service 1: duration") }));
    await r.wait(500);
    await r.spot(null);
    await r.point(p.getByRole("textbox", { name: t("Prestation 3 : prix", "Service 3: price") }));
    await r.wait(500);
  });
  await r.step(4, async () => {
    await r.point(p.locator("#act-area"));
    await r.wait(500);
    await r.point(p.locator("#act-phone"));
    await r.wait(400);
    await r.point(p.locator("#act-email"));
    await r.wait(400);
    await r.point(p.locator("#act-hours"));
    await r.wait(500);
  });
  await r.step(5, async () => {
    const group = p.getByRole("radiogroup", { name: t("Mode de contact", "Contact method") });
    await r.reveal(p.locator("#act-booking"));
    await r.click(group.getByRole("radio", { name: t("Demande de devis", "Quote request") }), { settle: 900 });
    await r.click(group.getByRole("radio", { name: t("Rendez-vous en ligne", "Online booking") }), { settle: 700 });
    await r.point(p.locator("#act-booking"));
    await r.wait(900);
  });
  await r.step(6, async () => {
    await r.scroll(-4000);
    const aside = main.locator("div.grid.content-start").nth(1);
    await r.spot(aside.locator("div.rounded-3xl").first(), 6);
    await r.wait(1400);
    const photos = sectionCard(t("Photos de l'activité", "Business photos"));
    await r.spot(photos, 6);
    await r.point(photos.getByRole("button", { name: t("Ajouter", "Add"), exact: true }));
    await r.wait(1400);
    await r.spot(null);
  });
  await r.step(7, async () => {
    const save = main.getByRole("button", { name: t("Enregistrer", "Save"), exact: true });
    const bar = save.locator("..");
    await r.spot(bar, 6);
    await r.point(save);
    await r.wait(1300);
    await r.point(main.getByRole("button", { name: t("Enregistrer et mettre à jour le site", "Save and update the website") }));
    await r.wait(1500);
    await r.spot(null);
  }, { hold: 400 });
}
