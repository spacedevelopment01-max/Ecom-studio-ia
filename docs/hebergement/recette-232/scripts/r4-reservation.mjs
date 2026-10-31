// Recette #232, site 2 (cabinet avec réservation native, thème PARENTHÈSE) : publication refusée tant que la réservation
// est en démonstration ; activation du service réel dans l'onglet Rendez-vous ; publication ; page de réservation du site
// publié, qui interroge l'API publique du studio (autre origine, HTTPS).
import { browser, context, ids, login, open, save, shot, STUDIO, watch } from "./lib.mjs";
const out = {};
const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");
const openModal = async () => {
  await open(owner, `${STUDIO}/studio/${ids.reservation}/boutique`);
  await owner.waitForTimeout(2500);
  const close = owner.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  await owner.locator("[data-open-site-publication]").click();
  await owner.locator("[data-site-publication]").waitFor();
};
await openModal();
await owner.getByRole("button", { name: "Publier la version actuelle" }).click();
await owner.locator("[data-publish-reasons]").waitFor({ timeout: 120000 });
out.refus = await owner.locator("[data-publish-reasons] li").allInnerTexts();
await owner.locator("[data-publish-reasons]").scrollIntoViewIfNeeded();
await shot(owner, "s2-01-refus-reservation-demonstration");
await open(owner, `${STUDIO}/studio/${ids.reservation}/rendez-vous`);
await owner.waitForTimeout(2500);
await owner.getByRole("button", { name: "Activer les réservations réelles" }).click();
await owner.getByText("Service réel activé").first().waitFor({ timeout: 60000 });
await shot(owner, "s2-02-reservations-reelles-activees");
await openModal();
await owner.getByRole("button", { name: "Publier la version actuelle" }).click();
await owner.locator("[data-site-live]").waitFor({ timeout: 120000 });
out.enLigne = await owner.locator("[data-site-live]").innerText();
out.adresse = await owner.locator("[data-site-address]").innerText();
await shot(owner, "s2-03-publie");
// Visiteur anonyme : page de réservation du site publié.
const visitor = await (await context(b)).newPage();
const vlog = []; watch(visitor, vlog);
const api = [];
visitor.on("response", (r) => r.url().includes("/api/public/cabinet/") && api.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https:\/\/[^/]+/, "")}`));
const SITE = `https://${out.adresse}:3943`;
await visitor.goto(SITE + "/", { waitUntil: "networkidle" });
const links = await visitor.$$eval("a[href^='/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
out.liens = links;
const bookingPath = links.find((l) => /rendez|reserv|prendre/.test(l)) ?? null;
out.pageReservation = bookingPath;
if (bookingPath) {
  await visitor.goto(SITE + bookingPath, { waitUntil: "networkidle" });
  await visitor.waitForTimeout(2000);
  await shot(visitor, "s2-04-visiteur-page-reservation");
  out.structure = await visitor.$$eval("[data-pa-booking] input, [data-pa-booking] button, [data-pa-booking] [data-pa-day], [data-pa-booking] [data-pa-slot]", (els) => els.slice(0, 60).map((e) => `${e.tagName.toLowerCase()} ${[...e.attributes].filter((a) => /^(data-|name|type|value)/.test(a.name)).map((a) => `${a.name}=${a.value}`).join(" ")} ${(e.textContent || "").trim().slice(0, 30)}`));
}
out.appelsApi = api;
out.erreursVisiteur = vlog;
save("s2-reservation", out);
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
await b.close();
