// Recette SYNA (#276) : trois drapeaux à 1, AUCUN fournisseur IA configuré, base de recette fictive. Aucun appel réel.
import fs from "node:fs";
import { browser, context, ids, login, open, STUDIO, DIR } from "./lib.mjs";
const OUTD = DIR + "preuves/", out = {}, log = [];
const b = await browser();
for (const kind of ["ordinateur", "telephone"]) {
  const page = await (await context(b, kind)).newPage();
  page.on("response", (r) => r.url().includes("/conversation") && log.push(`${kind} ${r.request().method()} ${r.status()} ${new URL(r.url()).pathname}`));
  await login(page, "proprio@recette.invalid");
  await open(page, `${STUDIO}/studio`);
  out[`${kind}_accueil_studio_syna`] = await page.getByText(/SYNA/).count();
  await page.screenshot({ path: `${OUTD}isyna-${kind}-studio.png` });
  await open(page, `${STUDIO}/studio/${ids.platrier}/pilote`);
  const dock = page.getByRole("button", { name: "SYNA", exact: true });
  out[`${kind}_bouton_syna`] = await dock.count();
  await dock.click(); await page.waitForTimeout(2500);
  const panel = page.locator("#central-agent-panel");
  out[`${kind}_panneau_ouvert`] = await panel.isVisible();
  const openBtn = panel.getByRole("button", { name: /Ouvrir le dialogue de ce projet/ });
  if (await openBtn.count()) { await openBtn.click(); await page.waitForTimeout(3000); }
  out[`${kind}_apres_ouverture`] = (await panel.innerText()).replace(/\s+/g, " ").slice(0, 500);
  const box = panel.locator("textarea").first();
  out[`${kind}_zone_saisie`] = await box.count();
  if (await box.count()) {
    await box.fill(kind === "ordinateur" ? "Bonjour SYNA, peux-tu résumer mon site ?" : "Que peux-tu faire pour mes réalisations ?");
    await box.press("Enter").catch(() => {});
    const send = panel.getByRole("button", { name: /Envoyer|Send/ });
    if (await send.count() && await send.first().isEnabled().catch(() => false)) await send.first().click().catch(() => {});
    await page.waitForTimeout(6000);
  }
  out[`${kind}_texte_panneau`] = (await panel.innerText()).replace(/\s+/g, " ").slice(0, 900);
  await page.screenshot({ path: `${OUTD}isyna-${kind}-panneau.png` });
  // Navigation puis réouverture : l'historique est conservé.
  await page.keyboard.press("Escape");
  await open(page, `${STUDIO}/studio/${ids.platrier}/realisations`);
  await page.getByRole("button", { name: "SYNA", exact: true }).click(); await page.waitForTimeout(2500);
  out[`${kind}_historique_apres_navigation`] = (await page.locator("#central-agent-panel").innerText()).includes(kind === "ordinateur" ? "résumer mon site" : "mes réalisations");
  await page.screenshot({ path: `${OUTD}isyna-${kind}-apres-navigation.png` });
  // Publication du site et section domaine (onglet Site, bouton globe).
  await page.keyboard.press("Escape");
  await open(page, `${STUDIO}/studio/${ids.platrier}/boutique`); await page.waitForTimeout(2000);
  const pub = await page.evaluate(async (pid) => { const r = await fetch(`/api/projects/${pid}/site-publication`); const j = await r.json().catch(() => ({})); return { status: r.status, configured: j.configured ?? null, live: !!j.live }; }, ids.platrier);
  out[`${kind}_site_publication`] = pub;
  const globe = page.getByRole("button", { name: /Publier votre site/ });
  out[`${kind}_bouton_globe`] = await globe.count();
  if (await globe.count()) { await globe.first().click(); await page.waitForTimeout(1500); out[`${kind}_section_domaine`] = await page.getByText(/Votre propre nom de domaine/).count(); await page.screenshot({ path: `${OUTD}isyna-${kind}-publication.png` }); }
}
out.reponses = log;
fs.writeFileSync(`${OUTD}isyna-recette.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await b.close();
