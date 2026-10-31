// Recette #239 phase 2 sur l'instance isolée, comptes et entreprises FICTIFS.
// Salon : éditeur des prestations (intervenant, horaires, prix) → service réel → site publié → vraie réservation par
// l'API publique du site → prestation réservée : suppression refusée, prix changé sans toucher le rendez-vous.
// Restaurant : onglet Carte (catégories, plats, allergènes déclarés, photo, sélection du moment, indisponible) → aperçu
// → réservations (créneaux par défaut signalés) → site publié V1 → plat modifié → non publié → V2 → restauration V1.
import { browser, context, ids, login, open, save, shot, STUDIO, watch } from "./lib.mjs";
const out = {};
const P = (k) => (...a) => (out[k] = a.length === 1 ? a[0] : a);
const api = (page, path, method = "GET", body) => page.evaluate(async ([p, m, b]) => { const r = await fetch(p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, method, body]);
async function openPublish(page, pid) {
  await open(page, `${STUDIO}/studio/${pid}/boutique`);
  await page.waitForTimeout(2500);
  const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  if (!(await page.locator("[data-open-site-publication]").isVisible())) await page.getByText("Aperçu", { exact: true }).first().click();
  await page.locator("[data-open-site-publication]").click();
  await page.locator("[data-site-publication]").waitFor();
}
async function publishSite(page, pid) {
  const r = await api(page, `/api/projects/${pid}/site-publication`, "POST", { action: "publish" });
  return r.status === 200 ? { ok: true, numero: r.body.live.number, host: r.body.addresses.find((a) => a.kind === "studio").hostname } : { ok: false, statut: r.status, raisons: r.body.reasons ?? r.body.error };
}
async function openEditor(page, pid) {
  await open(page, `${STUDIO}/studio/${pid}/rendez-vous`);
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: "Prestations, horaires, fermetures, intervenants" }).click();
  await page.locator("[data-prestations-editor]").waitFor();
}
const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");

// ───────── SALON
const S = ids.salon;
await openEditor(owner, S);
await owner.waitForTimeout(800);
await shot(owner, "p2-01-salon-editeur-sans-intervenant");
out.salonAvant = (await api(owner, `/api/projects/${S}/prestations`)).body;
await owner.getByRole("button", { name: "Ajouter un intervenant" }).click();
await owner.getByLabel("Prénom").last().fill("Inès");
await owner.getByLabel("Spécialité").last().fill("Coiffeuse coloriste");
for (const d of ["Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]) await owner.getByLabel(`Horaires ${d}`).fill("09:00-12:00, 14:00-19:00");
await owner.getByLabel("Adresse de l'établissement").fill("8 place Fictive, 69002 Lyon");
const firstPrice = owner.getByLabel("Prix (€)").first();
await firstPrice.fill("38");
await owner.getByLabel("Durée (min)").first().fill("45");
await owner.locator("[data-prestations-save]").click();
await owner.waitForTimeout(2500);
await owner.locator("[data-prestations-editor]").scrollIntoViewIfNeeded();
await shot(owner, "p2-02-salon-editeur-enregistre");
const salonApres = (await api(owner, `/api/projects/${S}/prestations`)).body;
out.salonApres = { services: salonApres.services.map((s) => `${s.id} ${s.duration}min ${s.price}€`), staff: salonApres.staff.map((m) => `${m.id} ${m.name}`), hours: salonApres.hours };
await owner.keyboard.press("Escape").catch(() => {});
// Service réel puis publication du site.
P("salonLive")((await api(owner, `/api/projects/${S}/rendez-vous`, "POST", { action: "live", live: true })).status);
const pubS = await publishSite(owner, S);
out.salonPublication = pubS;
save("p2-prestations-carte", out);
// Vraie réservation depuis le site publié (même appel que le calendrier du site, autre origine).
if (pubS.ok) {
  const visitor = await (await context(b)).newPage();
  await visitor.goto(`https://${pubS.host}:3943/`, { waitUntil: "networkidle" });
  const svc = salonApres.services[0].id;
  const month = await visitor.evaluate(async ([pid, svc]) => (await fetch(`https://studio.recette.test:3943/api/public/salon/${pid}/month?month=2026-11&service=${svc}&staff=any`)).json(), [S, svc]);
  const day = Object.entries(month.days ?? {}).find(([, s]) => s === "open")?.[0];
  const slots = day ? await visitor.evaluate(async ([pid, svc, d]) => (await fetch(`https://studio.recette.test:3943/api/public/salon/${pid}/availability?date=${d}&service=${svc}&staff=any`)).json(), [S, svc, day]) : null;
  const time = (slots?.slots ?? []).find((s) => s.available)?.time;
  out.salonReservation = await visitor.evaluate(async ([pid, svc, d, t]) => { const r = await fetch(`https://studio.recette.test:3943/api/public/salon/${pid}/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: svc, staff: "any", date: d, time: t, firstName: "Camille", lastName: "Fictive", email: "camille.fictive@example.test", phone: "0600000009", terms: true, idem: "recette-p2-0001" }) }); return { status: r.status, body: await r.json() }; }, [S, svc, day, time]);
  out.salonReservation.jour = day; out.salonReservation.heure = time;
  // Prestation réservée : badge, suppression refusée, prix changé → rendez-vous intact.
  await openEditor(owner, S);
  await owner.waitForTimeout(800);
  await shot(owner, "p2-03-salon-prestation-reservee");
  const cur = (await api(owner, `/api/projects/${S}/prestations`)).body;
  const without = { services: cur.services.filter((s) => s.id !== svc).map(({ upcoming, ...s }) => s), staff: cur.staff, hours: cur.hours, closures: cur.closures };
  out.salonSuppressionRefusee = await api(owner, `/api/projects/${S}/prestations`, "PUT", without).then((r) => ({ status: r.status, message: r.body.error }));
  const changed = { services: cur.services.map(({ upcoming, ...s }) => (s.id === svc ? { ...s, price: 42, duration: 60 } : s)), staff: cur.staff, hours: cur.hours, closures: cur.closures };
  out.salonPrixChange = await api(owner, `/api/projects/${S}/prestations`, "PUT", changed).then((r) => ({ status: r.status, version: r.body.number, avertissements: r.body.warnings }));
  const list = await api(owner, `/api/projects/${S}/rendez-vous?du=2026-10-01&au=2027-01-31`);
  out.salonRendezVousIntact = (list.body.bookings ?? []).map((x) => `${x.number} ${x.service} ${x.start}-${x.end}`);
  await open(owner, `${STUDIO}/studio/${S}/rendez-vous`);
  await owner.waitForTimeout(2000);
  await shot(owner, "p2-04-salon-onglet-rendez-vous-prix-corrige", true);
}
save("p2-prestations-carte", out);

// ───────── RESTAURANT
const R = ids.restaurant;
await open(owner, `${STUDIO}/studio/${R}/carte`);
await owner.waitForTimeout(2500);
out.ongletCarteVisible = await owner.locator("[data-tab-carte]").isVisible();
for (const c of ["Entrées", "Plats", "Desserts"]) { await owner.getByLabel("Nouvelle catégorie").fill(c); await owner.getByRole("button", { name: "Ajouter la catégorie" }).click(); await owner.waitForTimeout(800); }
const dish = async (cat, name, price, opts = {}) => {
  await owner.locator(`[data-carte-category="${cat}"]`).getByRole("button", { name: "Ajouter un plat" }).click();
  const f = owner.locator("[data-carte-form]");
  await f.getByLabel("Nom du plat *").fill(name);
  if (opts.description) await f.getByLabel("Description").fill(opts.description);
  if (price) await f.getByLabel("Prix (€)").fill(price);
  if (opts.mention) await f.getByLabel("Ou mention de prix").fill(opts.mention);
  if (opts.allergens) await f.getByLabel("Allergènes déclarés (facultatif)").fill(opts.allergens);
  if (opts.veg) await f.getByLabel("Végétarien").check();
  if (opts.featured) {
    await f.getByLabel("Sélection du moment (avec photo)").check();
    await f.getByRole("button", { name: "Choisir une photo du projet" }).click();
    const dlg = owner.getByRole("dialog").last();
    await dlg.locator("button img, [role=option] img, img").first().click();
    await dlg.getByRole("button", { name: "Utiliser ce média" }).click();
    await owner.waitForTimeout(800);
  }
  await f.getByRole("button", { name: "Enregistrer et publier" }).click();
  await owner.waitForTimeout(1200);
};
await dish("Entrées", "Velouté de potimarron", "9", { description: "Crème légère, graines torréfiées", allergens: "lait, graines de courge", veg: true });
await dish("Entrées", "Tartare de truite", "12,50", { allergens: "poisson" });
await dish("Plats", "Daube provençale", "", { mention: "selon arrivage", allergens: "céleri", featured: true });
await dish("Desserts", "Tarte fine aux pommes", "8", { allergens: "gluten, lait, œuf" });
// Le tartare devient indisponible (disparaît du site sans être supprimé).
await owner.locator('[data-carte-item="Tartare de truite"]').getByRole("button", { name: "Marquer indisponible" }).click();
await owner.waitForTimeout(1200);
await shot(owner, "p2-05-onglet-carte", true);
out.carte = (await api(owner, `/api/projects/${R}/carte`)).body.items.map((i) => `${i.name} ${i.price ?? i.priceText} ${i.status}${i.available ? "" : " indisponible"}${i.featured ? " sélection" : ""}${i.photo ? " photo" : ""}`);
// Aperçu de la page « La carte », ordinateur et téléphone.
const versionId = (await api(owner, `/api/projects/${R}`)).body?.theme?.versionId;
for (const kind of ["ordinateur", "telephone"]) {
  const p = await (await context(b, kind)).newPage();
  await login(p, "proprio@recette.invalid");
  await open(p, `${STUDIO}/preview/${R}/v/current/pages/la-carte?es_raw=1`);
  await p.waitForTimeout(2000);
  const txt = await p.locator("body").innerText();
  out[`apercuCarte_${kind}`] = { velouté: txt.includes("Velouté de potimarron"), tartareMasque: !txt.includes("Tartare de truite"), allergenes: txt.includes("Allergènes : lait, graines de courge"), mention: txt.includes("selon arrivage") };
  await p.screenshot({ path: new URL(`./preuves/p2-06-apercu-carte-${kind}.png`, import.meta.url).pathname, fullPage: true });
  await p.context().close();
}
out.versionId = versionId;
save("p2-prestations-carte", out);
// Réservations du restaurant : créneaux par défaut signalés, confirmés.
await openEditor(owner, R);
await owner.waitForTimeout(800);
out.restaurantDefautsSignales = await owner.locator("[data-defaults]").isVisible();
await shot(owner, "p2-07-restaurant-creneaux-par-defaut");
await owner.getByLabel("Couverts par créneau").fill("32");
await owner.getByLabel("Adresse de l'établissement").fill("4 rue Fictive, 69001 Lyon");
await owner.locator("[data-prestations-save]").click();
await owner.waitForTimeout(2500);
out.restaurantApres = (await api(owner, `/api/projects/${R}/prestations`)).body.restaurant;
await owner.keyboard.press("Escape").catch(() => {});
out.restaurantLive = (await api(owner, `/api/projects/${R}/rendez-vous`, "POST", { action: "live", live: true })).status;
const v1 = await publishSite(owner, R);
out.restaurantV1 = v1;
save("p2-prestations-carte", out);
if (v1.ok) {
  const page = (await api(owner, `/api/projects/${R}/carte`)).body;
  const SITE = `https://${v1.host}:3943`;
  for (const kind of ["ordinateur", "telephone"]) {
    const v = await (await context(b, kind)).newPage();
    const r = await v.goto(`${SITE}/pages/la-carte`, { waitUntil: "networkidle" });
    const rf = v.getByRole("button", { name: "Tout refuser" }); if (await rf.count()) await rf.first().click().catch(() => {});
    const txt = await v.locator("body").innerText();
    out[`siteCarte_${kind}`] = { statut: r.status(), velouté: txt.includes("Velouté de potimarron"), prix9: /9\s?€/.test(txt), tartareMasque: !txt.includes("Tartare de truite") };
    await v.screenshot({ path: new URL(`./preuves/p2-08-site-carte-${kind}.png`, import.meta.url).pathname, fullPage: kind === "ordinateur" });
    await v.context().close();
  }
  // Prix modifié dans l'onglet Carte : site inchangé, « non publié », V2, restauration V1.
  const velouté = page.items.find((i) => i.name === "Velouté de potimarron");
  await api(owner, `/api/projects/${R}/carte`, "POST", { action: "item-update", id: velouté.id, item: { price: 10.5 } });
  const vis = await (await context(b)).newPage();
  const priceOnSite = async () => { await vis.goto(`${SITE}/pages/la-carte`, { waitUntil: "networkidle" }); const t = await vis.locator("body").innerText(); return t.includes("10,50 €") ? "10,50" : /9\s?€/.test(t) ? "9" : "?"; };
  out.siteAvantRepublication = await priceOnSite();
  await openPublish(owner, R);
  await owner.locator("[data-site-pending]").waitFor({ timeout: 30000 });
  out.nonPublie = await owner.locator("[data-site-pending]").innerText();
  await shot(owner, "p2-09-carte-modification-non-publiee");
  const v2 = await publishSite(owner, R);
  out.siteApresV2 = await priceOnSite();
  const pubs = (await api(owner, `/api/projects/${R}/site-publication`)).body.publications;
  out.restauration = (await api(owner, `/api/projects/${R}/site-publication`, "POST", { action: "restore", publicationId: pubs.find((p) => p.number === v1.numero).id })).status;
  out.siteApresRestauration = await priceOnSite();
  out.v2 = v2.numero;
}
// Compte étranger.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = { carte: (await api(stranger, `/api/projects/${R}/carte`)).status, prestations: (await api(stranger, `/api/projects/${S}/prestations`)).status, ajoutPlat: (await api(stranger, `/api/projects/${R}/carte`, "POST", { action: "category-add", title: "Pirate" })).status };
// Téléphone : onglet Carte.
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await open(phone, `${STUDIO}/studio/${R}/carte`);
await phone.waitForTimeout(2500);
await shot(phone, "p2-10-telephone-onglet-carte");
out.erreursStudio = log;
save("p2-prestations-carte", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
