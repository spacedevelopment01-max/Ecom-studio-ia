import type { SceneCtx } from "../../build-tutorials";

/** Onglet Produit : rien n'est enregistré (saisies de démonstration effacées, aucun clic sur « Enregistrer »). */
export default async function ({ r, t }: SceneCtx) {
  const p = r.page;
  const main = p.locator("main");
  const card = (text: string) => main.getByText(text, { exact: true }).first().locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");
  const sheet = card(t("Fiche produit", "Product sheet"));
  await r.during(sheet.getByLabel(t("Valeur", "Value")).first().waitFor({ state: "visible", timeout: 120_000 }));
  await r.during(main.getByRole("radiogroup").waitFor({ timeout: 120_000 }).catch(() => {}));
  await r.during(p.waitForFunction(() => { const imgs = [...document.querySelectorAll("main img")] as HTMLImageElement[]; return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 120_000 }).catch(() => {}));

  await r.step(0, async () => {
    await r.spot(sheet, 4);
    await r.point(sheet.getByText(t("Fiche produit", "Product sheet"), { exact: true }));
    await r.wait(1500);
    await r.spot(null);
  });
  await r.step(1, async () => {
    const name = sheet.getByLabel(t("Nom du produit", "Product name"));
    await r.spot(name.locator("xpath=ancestor::div[contains(@class,'sm:grid-cols-2')][1]"), 8);
    await r.point(name);
    await r.wait(900);
    await r.point(sheet.getByLabel(t("Prix TTC (€)", "Price incl. tax (€)")));
    await r.wait(900);
    await r.spot(null);
  });
  const rows = sheet.locator("ul > li");
  await r.step(2, async () => {
    const row = rows.first();
    await r.spot(row, 4);
    await r.type(row.getByLabel(t("Valeur", "Value")), t("Expédition sous 48 h", "Ships within 48 hours"), { delay: 55 });
    await r.wait(400);
    await r.point(row.getByLabel(t("Statut", "Status")));
    await r.wait(700);
    await r.spot(null);
  }, { hold: 400 });
  await r.step(3, async () => {
    const status = sheet.getByLabel(t("Statut", "Status"));
    await r.spot(status.first().locator("xpath=ancestor::ul[1]"), 4);
    await r.point(status.nth(0));
    await r.wait(900);
    await r.point(status.nth(1));
    await r.wait(900);
    await r.spot(null);
  }, { hold: 400 });
  await r.step(4, async () => {
    const count = await rows.count();
    await r.click(sheet.getByRole("button", { name: t("Ajouter une information", "Add information") }), { settle: 600 });
    const added = rows.nth(count);
    await r.type(added.getByLabel(t("Information", "Information")), t("Garantie", "Warranty"), { delay: 60 });
    await r.click(added.getByRole("button", { name: t("Supprimer", "Delete") }), { settle: 600 });
    await r.spot(sheet.getByRole("button", { name: t("Enregistrer", "Save"), exact: true }), 6);
    await r.point(sheet.getByRole("button", { name: t("Enregistrer", "Save"), exact: true }));
    await r.wait(900);
    await r.spot(null);
  });
  await r.step(5, async () => {
    const photo = card(t("Ce que montre la photo", "What the photo shows"));
    await r.spot(photo, 4);
    await r.point(photo.locator("span[title]").first());
    await r.wait(1200);
    await r.spot(null);
  });
  await r.step(6, async () => {
    const photos = card(t("Photos du produit", "Product photos"));
    await r.spot(photos, 4);
    await r.point(photos.getByRole("button", { name: t("Ajouter", "Add"), exact: true }));
    await r.wait(1000);
    const life = card(t("Photos en situation", "Lifestyle photos"));
    await r.spot(life, 4);
    // Survol seulement : le clic ouvrirait le sélecteur de fichiers.
    await r.point(life.getByRole("button", { name: t("Ajouter", "Add"), exact: true }));
    await r.wait(1000);
    await r.spot(null);
  });
  await r.step(7, async () => {
    const variants = card(t("Variantes", "Variants"));
    await r.reveal(variants);
    await r.spot(variants, 4);
    await r.type(variants.getByLabel(t("Nom de la variante", "Variant name")), t("Coloris", "Color"), { delay: 60 });
    await r.type(variants.getByLabel(t("Valeurs", "Values")), t("Gris, Noir", "Grey, Black"), { delay: 60 });
    await r.point(variants.getByRole("button", { name: t("Enregistrer les variantes", "Save variants") }));
    await r.wait(1000);
    await variants.getByLabel(t("Nom de la variante", "Variant name")).fill("");
    await variants.getByLabel(t("Valeurs", "Values")).fill("");
    await r.spot(null);
  });
  await r.step(8, async () => {
    const types = main.getByRole("radiogroup");
    await r.reveal(types);
    await r.spot(types, 8);
    for (const n of [0, 1, 2]) {
      await r.point(types.getByRole("radio").nth(n));
      await r.wait(700);
    }
    await r.spot(null);
  });
}
