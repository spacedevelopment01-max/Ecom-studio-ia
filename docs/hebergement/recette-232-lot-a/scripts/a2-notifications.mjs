// Recette #232 lot A (suite, studio f6e0d559) : panne avec motif affiché puis reprise, lien de l'e-mail qui ouvre la
// demande (ordinateur et téléphone), « traitée », compte étranger refusé, bilan anti-spam. SMTP LOCAL uniquement.
import fs from "node:fs";
import { browser, context, ids, login, open, save, shot, STUDIO, DIR, watch } from "./lib.mjs";

const SITE3 = "https://agence-horizon-conseil.sites.recette.test:3943";
const out = {};
const sinkState = async () => (await fetch("http://127.0.0.1:2526/")).json();
const sinkMode = (m) => fetch(`http://127.0.0.1:2526/mode/${m}`).then((r) => r.json());
const waitFor = async (cond, ms, label) => { const end = Date.now() + ms; for (;;) { const v = await cond(); if (v) return v; if (Date.now() > end) throw new Error(`délai dépassé : ${label}`); await new Promise((r) => setTimeout(r, 1000)); } };
const overview = (page, key) => page.evaluate(async (pid) => (await fetch(`/api/projects/${pid}/site-publication`)).json(), ids[key]);
const openRequest = async (page, key, reqId) => {
  await open(page, `${STUDIO}/studio/${ids[key]}/boutique?demande=${reqId}`);
  await page.locator(`[data-site-request="${reqId}"] [data-request-detail]`).waitFor({ timeout: 30000 });
  await page.locator(`[data-site-request="${reqId}"]`).scrollIntoViewIfNeeded();
};

const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");
const visitor = await (await context(b)).newPage();

// Panne : motif affiché, puis reprise automatique (une seule fois).
await sinkMode("tempfail");
const before = (await sinkState()).count;
await visitor.goto(`${SITE3}/pages/contact`, { waitUntil: "networkidle" });
const r = visitor.getByRole("button", { name: "Tout refuser" }); if (await r.count()) await r.first().click().catch(() => {});
const form = visitor.locator('form[action="/contact#contact_form"]').first();
await form.locator('[name="contact[name]"]').fill("Sacha Fictif");
await form.locator('[name="contact[email]"]').fill("sacha.fictif@example.test");
await form.locator('[name="contact[phone]"]').fill("0600000004").catch(() => {});
await form.locator('[name="contact[body]"]').fill("Devis fictif envoyé pendant une panne du serveur d'e-mails (deuxième essai de recette).");
const sent = visitor.waitForResponse((x) => x.url().endsWith("/contact") && x.request().method() === "POST");
await form.locator('button[type="submit"]').first().click();
out.envoiVisiteur = (await sent).status();
await owner.waitForTimeout(4000);
await open(owner, `${STUDIO}/studio`);
const req = (await overview(owner, "agence")).requests[0];
out.pendantPanne = { visiteur: req.fields.name, type: req.kind, etat: req.notification, motif: req.notification_error };
await openRequest(owner, "agence", req.id);
await shot(owner, "a2-01-panne-motif-et-nouvel-essai");
await sinkMode("ok");
const t0 = Date.now();
await waitFor(async () => (await sinkState()).count > before, 180000, "reprise");
out.repriseApresSecondes = Math.round((Date.now() - t0) / 1000);
await owner.waitForTimeout(35000);
out.emailsPourCetteDemande = (await sinkState()).count - before;
await openRequest(owner, "agence", req.id);
await shot(owner, "a2-02-reprise-envoye");
out.apresReprise = (await overview(owner, "agence")).requests[0].notification;

// Lien « Retrouver cette demande dans le studio » : ordinateur puis téléphone ; « traitée ».
const reqA = (await overview(owner, "artisan")).requests[0];
await openRequest(owner, "artisan", reqA.id);
await shot(owner, "a2-03-lien-email-ordinateur");
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await openRequest(phone, "artisan", reqA.id);
await shot(phone, "a2-04-lien-email-telephone");
await phone.locator("[data-site-notifications]").scrollIntoViewIfNeeded();
await shot(phone, "a2-05-telephone-adresses");
await owner.locator(`[data-site-request="${reqA.id}"]`).getByRole("button", { name: "Marquer comme traitée" }).click();
await owner.waitForTimeout(1500);
out.traitee = !!(await overview(owner, "artisan")).requests.find((x) => x.id === reqA.id).handled_at;
await owner.locator("[data-site-requests], [data-site-notifications]").last().scrollIntoViewIfNeeded();
await shot(owner, "a2-06-traitee-masquee");

// Troisième adresse : page de confirmation (après l'animation d'accueil du studio, passée), puis confirmée.
await open(owner, `${STUDIO}/studio/${ids.artisan}/boutique?demande=${reqA.id}`);
await owner.locator("[data-site-notifications]").waitFor();
const cBefore = (await sinkState()).count;
await owner.locator('input[aria-label="Adresse qui recevra les demandes"]').fill("comptabilite.cle-de-fa@example.test");
await owner.getByRole("button", { name: "Ajouter l'adresse" }).click();
await owner.locator('[data-recipient="comptabilite.cle-de-fa@example.test"]').waitFor();
await waitFor(async () => (await sinkState()).count > cBefore, 30000, "lien");
const mail = fs.readdirSync(DIR + "mails").sort().slice(-3).map((f) => fs.readFileSync(DIR + "mails/" + f, "utf8")).find((x) => /To: comptabilite/.test(x));
const link = mail.replace(/=\r\n/g, "").replace(/=3D/g, "=").match(/https:\/\/studio\.recette\.test:3943\/confirmer-notifications\?jeton=[\w-]+/)[0];
const pro = await (await context(b)).newPage();
await pro.goto(link, { waitUntil: "networkidle" });
const skip = pro.getByRole("button", { name: "Passer" }); if (await skip.count()) await skip.first().click().catch(() => {});
await pro.waitForTimeout(2500);
await shot(pro, "a2-08-page-confirmation");
out.avantConfirmation = (await overview(owner, "artisan")).notifications.recipients.map((x) => `${x.email} ${x.status}`);
await pro.getByRole("button", { name: "Confirmer" }).click();
await pro.locator("[data-notify-confirmed]").waitFor();
await shot(pro, "a2-09-adresse-confirmee");
out.apresConfirmation = (await overview(owner, "artisan")).notifications.recipients.map((x) => `${x.email} ${x.status}`);
await owner.reload(); await owner.locator("[data-site-notifications]").waitFor(); await owner.locator("[data-site-notifications]").scrollIntoViewIfNeeded();
await shot(owner, "a2-10-trois-adresses-maximum");

// Compte étranger.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = await stranger.evaluate(async ([pid, rid]) => {
  const post = (body) => fetch(`/api/projects/${pid}/site-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.status);
  return { lecture: (await fetch(`/api/projects/${pid}/site-publication`)).status, ajoutAdresse: await post({ action: "recipient-add", email: "pirate@example.test" }), traitee: await post({ action: "request-handled", id: rid, handled: false }), renvoi: await post({ action: "request-retry", id: rid }) };
}, [ids.artisan, reqA.id]);
await open(stranger, `${STUDIO}/studio/${ids.artisan}/boutique?demande=${reqA.id}`);
await stranger.waitForTimeout(2000);
await shot(stranger, "a2-07-compte-etranger");

// Bilan anti-spam de la première passe (site 2) : champ piège et rafale.
const reqs2 = (await overview(owner, "reservation")).requests;
out.antiSpam = { rafaleEnregistrees: reqs2.filter((x) => /^Rafale/.test(x.fields.name ?? "")).length, piegeEnregistre: reqs2.some((x) => x.email === "robot@example.test") };
out.sink = (await sinkState()).count;
out.erreursStudio = log;
save("a2-notifications", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
