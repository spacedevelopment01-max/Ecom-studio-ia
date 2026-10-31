// Recette #232, site 2 : un visiteur ANONYME réserve sur le site publié ; l'appel part vers l'API publique du studio
// (autre origine, HTTPS) ; la réservation apparaît ensuite dans l'onglet Rendez-vous du studio.
import { browser, context, ids, login, open, save, shot, STUDIO, watch } from "./lib.mjs";
const out = { appels: [] };
const b = await browser();
const v = await (await context(b)).newPage();
const log = []; watch(v, log);
v.on("response", (r) => r.url().includes("/api/public/cabinet/") && out.appels.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https:\/\/([^/]+).*\/api/, "$1 …/api").slice(0, 140)}`));
const SITE = "https://cabinet-souffle.sites.recette.test:3943";
await v.goto(SITE + "/pages/prendre-rendez-vous", { waitUntil: "networkidle" });
const refuse = v.getByRole("button", { name: "Tout refuser" }); if (await refuse.count()) await refuse.first().click();
// Choix comme un visiteur : clic sur la carte (le bouton radio est masqué visuellement).
await v.locator("label:has(input[data-pa-service])").first().click();
await v.locator('label:has(input[data-pa-mode][value="cabinet"])').first().click();
await shot(v, "s2-05-etape1-prestation");
await v.locator("button[data-pa-next]:visible").first().click();
await v.waitForTimeout(3000);
await shot(v, "s2-06-etape2-creneaux");
// Premier jour proposé puis premier créneau libre.
const days = v.locator("button.pa-cal__day[data-date]:not([aria-disabled=true]):not(.is-off)");
// Mois suivants si le mois en cours n'a plus de jour ouvert.
for (let m = 0; m < 3 && !(await days.count()); m++) { await v.getByRole("button", { name: "Mois suivant" }).first().click().catch(() => {}); await v.waitForTimeout(2000); }
out.jours = await days.count();
if (out.jours) { await days.first().click(); await v.waitForTimeout(2000); }
const slots = v.locator("[data-pa-slots] button:not([disabled])");
out.creneaux = await slots.count();
if (out.creneaux) await slots.first().click();
await shot(v, "s2-07-creneau-choisi");
await v.locator("button[data-pa-next]:visible").first().click().catch(() => {});
await v.waitForTimeout(1500);
await v.locator('input[name="firstName"]').fill("Camille");
await v.locator('input[name="lastName"]').fill("Fictive");
await v.locator('input[name="email"]').fill("camille.fictive@example.test");
await v.locator('label:has(input[name="terms"])').first().click();
await shot(v, "s2-08-coordonnees");
await v.locator("button[data-pa-mnext]:visible, button[data-pa-submit]:visible").first().click();
await v.waitForTimeout(1500);
if (await v.locator("button[data-pa-submit]:visible").count()) await v.locator("button[data-pa-submit]:visible").first().click();
await v.waitForTimeout(3000);
await shot(v, "s2-09-confirmation");
out.texteConfirmation = (await v.locator("[data-pa-booking]").first().innerText()).slice(0, 600);
out.erreurs = log;
// Côté studio : la réservation est dans l'onglet Rendez-vous.
const o = await (await context(b)).newPage();
await login(o, "proprio@recette.invalid");
await open(o, `${STUDIO}/studio/${ids.reservation}/rendez-vous`);
await o.waitForTimeout(3000);
await shot(o, "s2-10-studio-rendez-vous-recu");
out.studio = (await o.locator("main").innerText()).match(/Camille[^\n]*/g) ?? [];
save("s2-reservation-visiteur", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
