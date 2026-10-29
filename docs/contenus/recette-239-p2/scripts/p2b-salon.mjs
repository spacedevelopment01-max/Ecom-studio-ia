// Recette #239 phase 2 (salon, deuxième passe après correctif f37805e9) sur l'instance isolée, comptes et entreprises FICTIFS.
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
// Intervenant, horaires et prix déjà saisis à la passe précédente : seule l'adresse est réenregistrée.
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
save("p2b-salon", out);
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
save("p2b-salon", out);


out.erreursStudio = log;
save("p2b-salon", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
