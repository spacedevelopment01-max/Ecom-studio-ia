// Recette #232 lot B (fin) : studio sur téléphone (onglet « Aperçu », puis « Publier votre site ») : versions purgées et diagnostic.
import { browser, context, ids, login, open, shot, STUDIO } from "./lib.mjs";
const b = await browser();
for (const kind of ["telephone", "ordinateur"]) {
  const p = await (await context(b, kind)).newPage();
  await login(p, "proprio@recette.invalid");
  await open(p, `${STUDIO}/studio/${ids.medias}/boutique`);
  await p.waitForTimeout(2500);
  const close = p.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  if (!(await p.locator("[data-open-site-publication]").isVisible())) await p.getByText("Aperçu", { exact: true }).first().click();
  await p.locator("[data-open-site-publication]").click();
  await p.locator("[data-site-publication]").waitFor();
  await p.getByRole("button", { name: "Vérifier le site en ligne" }).click();
  await p.locator("[data-diagnostics-result]").waitFor();
  await p.locator("[data-site-diagnostics]").scrollIntoViewIfNeeded();
  await shot(p, `b1-07-${kind}-diagnostic`);
  await p.locator("[data-publications]").scrollIntoViewIfNeeded();
  await shot(p, `b1-08-${kind}-versions-purgees`);
}
await b.close();
