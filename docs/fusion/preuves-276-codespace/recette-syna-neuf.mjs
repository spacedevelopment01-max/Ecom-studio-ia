// SYNA sur un projet NEUF (compte fictif, abonnement libre) : trois drapeaux à 1, aucun fournisseur IA. Aucun appel réel.
import fs from "node:fs";
import { browser, context, login, open, STUDIO, DIR } from "./lib.mjs";
const EMAIL = process.argv[2], OUTD = DIR + "preuves/", out = {}, log = [];
const b = await browser();
for (const kind of ["ordinateur", "telephone"]) {
  const page = await (await context(b, kind)).newPage();
  page.on("response", (r) => /conversation|studio-agent/.test(r.url()) && r.request().method() !== "GET" && log.push(`${kind} ${r.request().method()} ${r.status()} ${new URL(r.url()).pathname}`));
  await login(page, EMAIL);
  await open(page, `${STUDIO}/studio`); await page.waitForTimeout(2500);
  out[`${kind}_accueil`] = (await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 400);
  const box = page.locator("textarea").first();
  out[`${kind}_zone_saisie`] = await box.count();
  if (await box.count()) {
    await box.fill(kind === "ordinateur" ? "Je suis plâtrier à Lyon, je veux un site pour montrer mes chantiers." : "Salon de coiffure fictif à Lyon, je veux la réservation en ligne.");
    const send = page.getByRole("button", { name: /^Enregistrer$|Envoyer|Send/ }).first();
    if (await send.count()) await send.click().catch(() => box.press("Enter")); else await box.press("Enter");
    await page.waitForTimeout(8000);
  }
  out[`${kind}_apres_message`] = (await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 1200);
  await page.screenshot({ path: `${OUTD}isyna-neuf-${kind}.png` });
  await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(2500);
  out[`${kind}_apres_rechargement_historique`] = (await page.locator("main").innerText()).includes(kind === "ordinateur" ? "plâtrier à Lyon" : "Salon de coiffure fictif");
}
out.ecritures = log;
fs.writeFileSync(`${OUTD}isyna-neuf-recette.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
