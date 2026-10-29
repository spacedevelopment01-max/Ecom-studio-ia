// Recette #232 lot A : demandes envoyées par e-mail au professionnel, sur l'instance isolée, avec un serveur SMTP LOCAL
// (127.0.0.1:2525, aucun relais, destinataires fictifs). Sans SMTP → en attente ; SMTP activé → envoyé ; panne puis
// reprise par le worker sans doublon ; nouvelle adresse confirmée par lien ; compte étranger refusé ; anti-spam ;
// rendez-vous toujours fonctionnels. Captures ordinateur et téléphone, e-mails reçus rendus en image.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { browser, context, ids, login, open, save, shot, STUDIO, OUT, DIR, watch } from "./lib.mjs";

const SITE1 = "https://cle-de-fa-lyon.sites.recette.test:3943";
const SITE2 = "https://cabinet-souffle.sites.recette.test:3943";
const SITE3 = "https://agence-horizon-conseil.sites.recette.test:3943";
const out = {};
const sinkState = async () => (await fetch("http://127.0.0.1:2526/")).json();
const sinkMode = (m) => fetch(`http://127.0.0.1:2526/mode/${m}`).then((r) => r.json());
const smtp = (on) => execSync(`npx tsx ${DIR}smtp-config.mts ${on ? "on" : "off"}`, { cwd: DIR + "../wt-integ", env: { ...process.env, DATA_DIR: fs.readFileSync(DIR + "datadir.txt", "utf8").trim() } }).toString().trim();
const waitFor = async (cond, ms, label) => { const end = Date.now() + ms; for (;;) { const v = await cond(); if (v) return v; if (Date.now() > end) throw new Error(`délai dépassé : ${label}`); await new Promise((r) => setTimeout(r, 1000)); } };
const lastMails = (n) => fs.readdirSync(DIR + "mails").sort().slice(-n).map((f) => fs.readFileSync(DIR + "mails/" + f, "utf8"));

/** Visiteur anonyme : remplit le formulaire de la page (jamais le champ piège) et l'envoie. */
async function sendForm(page, url, values) {
  await page.goto(url, { waitUntil: "networkidle" });
  const r = page.getByRole("button", { name: "Tout refuser" }); if (await r.count()) await r.first().click().catch(() => {});
  const form = page.locator('form[action="/contact#contact_form"]').first();
  await form.scrollIntoViewIfNeeded();
  for (const el of await form.locator("input:visible, textarea:visible, select:visible").all()) {
    const type = await el.getAttribute("type"), name = (await el.getAttribute("name")) ?? "";
    if (type === "hidden" || type === "submit" || type === "file" || name === "contact[site_web]" || (await el.evaluate((e) => !!e.closest("[aria-hidden=true]")))) continue;
    if (type === "checkbox" || type === "radio") { await el.check().catch(() => {}); continue; }
    if ((await el.evaluate((e) => e.tagName)) === "SELECT") { const v = await el.locator("option").nth(1).getAttribute("value"); if (v) await el.selectOption(v); continue; }
    await el.fill(type === "email" || /email/.test(name) ? values.email : type === "tel" || /phone/.test(name) ? values.phone : /body|message/.test(name) ? values.message : values.name);
  }
  const sent = page.waitForResponse((x) => x.url().endsWith("/contact") && x.request().method() === "POST", { timeout: 30000 });
  await form.locator('button[type="submit"], input[type="submit"]').first().click();
  return (await sent).status();
}
async function openModal(page, key) {
  await open(page, `${STUDIO}/studio/${ids[key]}/boutique`);
  await page.waitForTimeout(2500);
  const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  await page.locator("[data-open-site-publication]").click();
  await page.locator("[data-site-publication]").waitFor();
}
const overview = (page, key) => page.evaluate(async (pid) => (await fetch(`/api/projects/${pid}/site-publication`)).json(), ids[key]);
/** Rend la partie HTML d'un e-mail reçu (fichier .eml du SMTP local) et en fait une capture. */
async function shotMail(b, raw, name) {
  const html = (() => {
    const i = raw.search(/Content-Type: text\/html/i); if (i < 0) return `<pre>${raw.replace(/</g, "&lt;")}</pre>`;
    const part = raw.slice(i), h = part.indexOf("\r\n\r\n"); let body = part.slice(h + 4); const end = body.search(/\r\n--[^\r\n]+/); if (end >= 0) body = body.slice(0, end);
    return Buffer.from(body.replace(/=\r\n/g, "").replace(/=([0-9A-F]{2})/gi, (_m, x) => String.fromCharCode(parseInt(x, 16))), "latin1").toString("utf8");
  })();
  const head = raw.split("\r\n\r\n")[0].replace(/\r\n[ \t]+/g, " ").split("\r\n").filter((l) => /^(From|To|Reply-To|Subject|Message-ID|Date):/i.test(l)).map((l) => l.replace(/=\?UTF-8\?Q\?([^?]*)\?=/gi, (_m, t) => Buffer.from(t.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_x, x) => String.fromCharCode(parseInt(x, 16))), "latin1").toString("utf8")));
  for (const kind of ["ordinateur", "telephone"]) {
    const p = await (await context(b, kind)).newPage();
    await p.setContent(`<div style="font:13px monospace;background:#eef1f5;padding:10px;border-bottom:1px solid #ccd">${head.map((l) => l.replace(/</g, "&lt;")).join("<br>")}<br><i>Reçu par le serveur SMTP LOCAL de recette (aucun envoi réel)</i></div>${html}`);
    await p.screenshot({ path: `${OUT}${name}-${kind}.png`, fullPage: true });
    await p.context().close();
  }
  return head;
}

const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");
const visitor = await (await context(b)).newPage();

// 1. Sans SMTP : la demande est gardée, l'e-mail attend.
out.smtpOff = smtp(false);
out.devisSansSmtp = await sendForm(visitor, `${SITE1}/pages/devis`, { name: "Camille Fictive", email: "camille.fictive@example.test", phone: "0600000001", message: "Bonjour, je souhaite un devis pour accorder un piano droit (demande fictive de recette, sans SMTP)." });
await openModal(owner, "artisan");
await owner.locator("[data-site-notifications]").scrollIntoViewIfNeeded();
await shot(owner, "a1-01-sans-smtp-adresses");
await owner.locator("[data-site-requests]").scrollIntoViewIfNeeded();
await shot(owner, "a1-02-sans-smtp-demande-en-attente");
out.etatSansSmtp = (await overview(owner, "artisan")).requests.slice(0, 1).map((r) => r.notification);
out.mailsSansSmtp = (await sinkState()).count;

// 2. SMTP local activé : le worker envoie l'e-mail en attente.
out.smtpOn = smtp(true);
await waitFor(async () => (await sinkState()).count >= 1, 90000, "e-mail en attente envoyé par le worker");
const m1 = lastMails(1)[0];
out.mail1 = await shotMail(b, m1, "a1-03-email-recu");
await openModal(owner, "artisan");
await owner.locator("[data-site-requests]").scrollIntoViewIfNeeded();
await owner.locator("[data-site-request]").first().locator("button").first().click();
await owner.waitForTimeout(1200);
await shot(owner, "a1-04-studio-email-envoye-detail");
out.etatApresSmtp = (await overview(owner, "artisan")).requests.slice(0, 1).map((r) => r.notification);

// 3. Panne du SMTP puis reprise automatique par le worker, sans doublon (site 3, agence).
await sinkMode("tempfail");
const before = (await sinkState()).count;
out.devisPanne = await sendForm(visitor, `${SITE3}/pages/contact`, { name: "Dominique Fictif", email: "dominique.fictif@example.test", phone: "0600000002", message: "Demande fictive envoyée pendant une panne du serveur d'e-mails." });
await owner.waitForTimeout(3000);
await openModal(owner, "agence");
await owner.locator("[data-site-requests]").scrollIntoViewIfNeeded();
await owner.locator("[data-site-request]").first().locator("button").first().click();
await owner.waitForTimeout(1200);
await shot(owner, "a1-05-panne-email-en-attente");
out.etatPendantPanne = (await overview(owner, "agence")).requests.slice(0, 1).map((r) => ({ etat: r.notification, motif: r.notification_error }));
await sinkMode("ok");
const t0 = Date.now();
await waitFor(async () => (await sinkState()).count > before, 180000, "reprise après panne");
out.repriseApresSecondes = Math.round((Date.now() - t0) / 1000);
await owner.waitForTimeout(40000); // deux passages du worker de plus : aucun doublon
out.mailsApresReprise = (await sinkState()).count - before;
await openModal(owner, "agence");
await owner.locator("[data-site-requests]").scrollIntoViewIfNeeded();
await shot(owner, "a1-06-reprise-email-envoye");
out.etatApresReprise = (await overview(owner, "agence")).requests.slice(0, 1).map((r) => r.notification);
out.mail3 = await shotMail(b, lastMails(1)[0], "a1-07-email-apres-reprise");

// 4. Nouvelle adresse : rien avant confirmation, puis reçoit.
await openModal(owner, "artisan");
await owner.locator('input[aria-label="Adresse qui recevra les demandes"]').fill("secretariat.cle-de-fa@example.test");
await owner.getByRole("button", { name: "Ajouter l'adresse" }).click();
await owner.locator('[data-recipient="secretariat.cle-de-fa@example.test"]').waitFor();
await owner.locator("[data-site-notifications]").scrollIntoViewIfNeeded();
await shot(owner, "a1-08-adresse-en-attente-de-confirmation");
const verifyMail = await waitFor(async () => lastMails(3).find((r) => /To: secretariat\.cle-de-fa@example\.test/.test(r)), 30000, "lien de confirmation");
const link = verifyMail.replace(/=\r\n/g, "").replace(/=3D/g, "=").match(/https:\/\/studio\.recette\.test:3943\/confirmer-notifications\?jeton=[\w-]+/)[0];
const pro = await (await context(b)).newPage();
await pro.goto(link, { waitUntil: "networkidle" });
await shot(pro, "a1-09-page-confirmation");
await pro.getByRole("button", { name: "Confirmer" }).click();
await pro.locator("[data-notify-confirmed]").waitFor();
await shot(pro, "a1-10-adresse-confirmee");
const c2 = (await sinkState()).count;
out.devisDeuxAdresses = await sendForm(visitor, `${SITE1}/pages/contact`, { name: "Alex Fictif", email: "alex.fictif@example.test", phone: "0600000003", message: "Deuxième demande fictive : elle doit arriver aux deux adresses confirmées." });
await waitFor(async () => (await sinkState()).count >= c2 + 2, 60000, "deux e-mails");
out.destinatairesDemande = (await sinkState()).messages.slice(c2).map((m) => m.to[0]).sort();
await openModal(owner, "artisan");
await owner.locator("[data-site-notifications]").scrollIntoViewIfNeeded();
await shot(owner, "a1-11-deux-adresses-confirmees");

// 5. Compte étranger : ni lecture, ni ajout d'adresse.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = await stranger.evaluate(async (pid) => {
  const post = (body) => fetch(`/api/projects/${pid}/site-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.status);
  return { lecture: (await fetch(`/api/projects/${pid}/site-publication`)).status, ajoutAdresse: await post({ action: "recipient-add", email: "pirate@example.test" }), traitee: await post({ action: "request-handled", id: "x", handled: true }) };
}, ids.artisan);

// 6. Anti-spam : champ piège (rien d'enregistré ni d'envoyé) et rafale (refus au-delà de 5 en 10 min).
const c3 = (await sinkState()).count, n3 = (await overview(owner, "reservation")).requests.length;
await visitor.goto(`${SITE2}/pages/contact`, { waitUntil: "networkidle" });
out.antiSpam = await visitor.evaluate(async () => {
  const post = (fields) => fetch("/contact", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ form_type: "contact", ...fields }) }).then((r) => r.status);
  const piege = await post({ "contact[email]": "robot@example.test", "contact[body]": "spam", "contact[site_web]": "http://spam.example" });
  const rafale = [];
  for (let i = 0; i < 7; i++) rafale.push(await post({ "contact[name]": `Rafale ${i}`, "contact[email]": `rafale${i}@example.test`, "contact[body]": "Demande fictive de rafale (anti-abus)." }));
  return { piege, rafale };
});
await owner.waitForTimeout(20000);
out.antiSpam.demandesEnregistrees = (await overview(owner, "reservation")).requests.length - n3;
out.antiSpam.emailsEnvoyes = (await sinkState()).count - c3;

// 7. Téléphone : fenêtre du studio et e-mail reçu.
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await openModal(phone, "artisan");
await phone.locator("[data-site-notifications]").scrollIntoViewIfNeeded();
await shot(phone, "a1-12-telephone-adresses");
await phone.locator("[data-site-requests]").scrollIntoViewIfNeeded();
await phone.locator("[data-site-request]").first().locator("button").first().click();
await phone.waitForTimeout(1200);
await shot(phone, "a1-13-telephone-demande");
// Lien de l'e-mail : ouvre la demande dans le studio.
const reqId = (await overview(owner, "artisan")).requests[0].id;
await open(owner, `${STUDIO}/studio/${ids.artisan}/boutique?demande=${reqId}`);
await owner.locator(`[data-site-request="${reqId}"] [data-request-detail]`).waitFor({ timeout: 30000 });
await owner.locator(`[data-site-request="${reqId}"]`).scrollIntoViewIfNeeded();
await shot(owner, "a1-14-lien-email-ouvre-la-demande");
// Traitement : « traitée » puis masquée de la liste des nouvelles.
await owner.locator(`[data-site-request="${reqId}"]`).getByRole("button", { name: "Marquer comme traitée" }).click();
await owner.waitForTimeout(1500);
out.traitee = (await overview(owner, "artisan")).requests.find((r) => r.id === reqId).handled_at !== null;
await shot(owner, "a1-15-demande-traitee");

out.sink = await sinkState();
out.erreursStudio = log;
save("a1-notifications", out);
console.log(JSON.stringify({ ...out, sink: { count: out.sink.count } }, null, 1));
await b.close();
