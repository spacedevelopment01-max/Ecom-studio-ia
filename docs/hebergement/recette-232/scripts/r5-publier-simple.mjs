// Recette #232 : publication d'un site depuis l'onglet Site (vérification puis publication), compte propriétaire fictif.
// node r5-publier-simple.mjs <clé du site> <prefixe>
import { browser, context, ids, login, open, save, shot, STUDIO, watch } from "./lib.mjs";
const [, , key, pre] = process.argv;
const b = await browser();
const page = await (await context(b)).newPage();
const log = []; watch(page, log);
await login(page, "proprio@recette.invalid");
await open(page, `${STUDIO}/studio/${ids[key]}/boutique`);
await page.waitForTimeout(2500);
const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
await page.locator("[data-open-site-publication]").click();
await page.locator("[data-site-publication]").waitFor();
await page.getByRole("button", { name: "Vérifier avant de publier" }).click();
await page.locator("[data-publish-reasons], [data-publish-ready]").first().waitFor({ timeout: 120000 });
const reasons = await page.locator("[data-publish-reasons] li").allInnerTexts();
await page.getByRole("button", { name: "Publier la version actuelle" }).click();
await page.locator("[data-site-live]").waitFor({ timeout: 120000 });
await shot(page, `${pre}-publie`);
const out = { reasons, live: await page.locator("[data-site-live]").innerText(), address: await page.locator("[data-site-address]").innerText(), erreurs: log };
save(`${pre}-publication`, out);
console.log(JSON.stringify(out, null, 1));
await b.close();
