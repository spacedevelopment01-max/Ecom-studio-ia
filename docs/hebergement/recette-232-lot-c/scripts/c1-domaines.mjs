// Recette #232 lot C : relier un domaine FICTIF déjà « possédé » (www.cle-de-fa.example et cle-de-fa.example) au site
// de l'artisan. Le « fournisseur DNS » du client est simulé par un serveur DNS LOCAL (dns-local.mjs, zone
// dns-zone.json) ; le studio l'interroge réellement (SITES_DNS_SERVERS). Preuve, pointage, actif, servi, question du
// proxy avant certificat, domaine nu, désactivation, perte (revérification du worker), conflit avec un autre compte.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { browser, context, ids, login, open, save, shot, STUDIO, DIR, watch } from "./lib.mjs";
const Database = createRequire(import.meta.url)("../wt-integ/node_modules/better-sqlite3");
const DATA = fs.readFileSync(DIR + "datadir.txt", "utf8").trim();
const ZONE = DIR + "dns-zone.json";
const zone = (fn) => { const z = JSON.parse(fs.readFileSync(ZONE, "utf8")); fn(z); fs.writeFileSync(ZONE, JSON.stringify(z, null, 1)); };
const WWW = "www.cle-de-fa.example", APEX = "cle-de-fa.example", SITE = "cle-de-fa-lyon.sites.recette.test";
const out = {};
const api = (page, body) => page.evaluate(async ([pid, b]) => { const r = await fetch(`/api/projects/${pid}/site-publication`, b ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) } : undefined); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [ids.artisan, body]);
const dom = async (page, h) => (await api(page)).body.domains.find((d) => d.hostname === h);
const visit = async (b, host) => { const p = await (await context(b)).newPage(); const r = await p.goto(`https://${host}:3943/`).catch((e) => ({ status: () => `erreur ${String(e).slice(0, 60)}` })); return { p, status: r.status() }; };
const askStatus = async (host, token) => (await fetch(`http://127.0.0.1:3912/api/site-domains/ask?domain=${host}${token ? `&token=${token}` : ""}`)).status;
async function openModal(page) {
  await open(page, `${STUDIO}/studio/${ids.artisan}/boutique`);
  await page.waitForTimeout(2500);
  const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  if (!(await page.locator("[data-open-site-publication]").isVisible())) await page.getByText("Aperçu", { exact: true }).first().click();
  await page.locator("[data-open-site-publication]").click();
  await page.locator("[data-site-publication]").waitFor();
}
const domainShot = async (page, h, name) => { await page.locator(`[data-custom-domain="${h}"]`).scrollIntoViewIfNeeded(); await shot(page, name); save("c1-domaines", out); };

fs.writeFileSync(ZONE, "{}");
const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");

// 1. Le domaine www (ajouté au prototype) : étape 1 à faire.
if (!(await dom(owner, WWW))) await api(owner, { action: "domain-add", hostname: WWW });
await openModal(owner);
out.etape1 = (await dom(owner, WWW)).state;
out.visiteAvant = (await visit(b, WWW)).status;
await domainShot(owner, WWW, "c1-01-etape1-preuve-a-ajouter");
// 2. Le client ajoute le TXT chez son « fournisseur » : propriété prouvée, pointage à faire.
const token = (await dom(owner, WWW)).dns.txt.value;
zone((z) => { z[`_ecs-verif.${WWW}`] = { TXT: [token] }; });
await owner.locator(`[data-custom-domain="${WWW}"]`).getByRole("button", { name: "Vérifier" }).click();
await owner.locator(`[data-custom-domain="${WWW}"][data-domain-state="pointing"]`).waitFor({ timeout: 30000 });
out.etape2 = { etat: (await dom(owner, WWW)).state, message: (await dom(owner, WWW)).checkError };
await domainShot(owner, WWW, "c1-02-propriete-prouvee-pointage-a-faire");
// 3. Puis le CNAME : actif, servi, certificat autorisé.
zone((z) => { z[WWW] = { CNAME: [SITE] }; });
await owner.locator(`[data-custom-domain="${WWW}"]`).getByRole("button", { name: "Vérifier" }).click();
await owner.locator(`[data-custom-domain="${WWW}"][data-domain-state="active"]`).waitFor({ timeout: 30000 });
out.etape3 = (await dom(owner, WWW)).state;
await domainShot(owner, WWW, "c1-03-actif");
const v = await visit(b, WWW);
out.visiteActif = v.status;
await v.p.screenshot({ path: `${DIR}preuves/c1-04-visiteur-sur-son-domaine.png` });
out.ask = { avecJeton: await askStatus(WWW, "jeton-ask-recette-local"), sansJeton: await askStatus(WWW), domaineInconnu: await askStatus("inconnu.example", "jeton-ask-recette-local"), adresseStudio: await askStatus(SITE, "jeton-ask-recette-local") };

// 4. Domaine nu : instructions A vers le serveur.
await api(owner, { action: "domain-add", hostname: APEX });
await openModal(owner);
out.apexInstructions = (await dom(owner, APEX)).dns.pointing;
await domainShot(owner, APEX, "c1-05-domaine-nu-instructions-A");
const atoken = (await dom(owner, APEX)).dns.txt.value;
zone((z) => { z[`_ecs-verif.${APEX}`] = { TXT: [atoken] }; z[APEX] = { A: ["198.51.100.77"] }; });
await api(owner, { action: "domain-verify", hostname: APEX });
out.apexMauvaiseIp = (await dom(owner, APEX)).state;
zone((z) => { z[APEX] = { A: ["203.0.113.10"] }; });
await api(owner, { action: "domain-verify", hostname: APEX });
out.apexBonneIp = (await dom(owner, APEX)).state;
out.visiteApex = (await visit(b, APEX)).status;

// 5. Désactiver puis réactiver www.
await openModal(owner);
await owner.locator(`[data-custom-domain="${WWW}"]`).getByRole("button", { name: "Désactiver" }).click();
await owner.locator(`[data-custom-domain="${WWW}"][data-domain-state="disabled"]`).waitFor();
out.desactive = { etat: (await dom(owner, WWW)).state, visite: (await visit(b, WWW)).status, ask: await askStatus(WWW, "jeton-ask-recette-local") };
await domainShot(owner, WWW, "c1-06-desactive");
await owner.locator(`[data-custom-domain="${WWW}"]`).getByRole("button", { name: "Réactiver" }).click();
await owner.locator(`[data-custom-domain="${WWW}"][data-domain-state="active"]`).waitFor({ timeout: 30000 });
out.reactive = { etat: (await dom(owner, WWW)).state, visite: (await visit(b, WWW)).status };

// 6. Domaine « expiré » : preuve retirée ; le worker revérifie (3 passages simulant 3 jours) → perdu, plus servi.
zone((z) => { delete z[`_ecs-verif.${APEX}`]; });
const db = new Database(path.join(DATA, "studio.db"));
for (let i = 0; i < 3; i++) {
  db.prepare("UPDATE site_addresses SET checked_at = 0 WHERE hostname = ?").run(APEX);
  const t0 = Date.now();
  while (db.prepare("SELECT checked_at FROM site_addresses WHERE hostname = ?").get(APEX).checked_at === 0) { if (Date.now() - t0 > 60000) throw new Error("worker inactif"); await new Promise((r) => setTimeout(r, 1000)); }
}
db.close();
out.perdu = { etat: (await dom(owner, APEX)).state, message: (await dom(owner, APEX)).checkError, visite: (await visit(b, APEX)).status, ask: await askStatus(APEX, "jeton-ask-recette-local") };
await openModal(owner);
await domainShot(owner, APEX, "c1-07-perdu-preuve-disparue");

// 7. Autre compte : ne peut pas prendre le domaine ; ne voit rien.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.conflit = await stranger.evaluate(async ([pid, h]) => {
  const projects = await (await fetch("/api/projects")).json().catch(() => null);
  const mine = (projects?.projects ?? projects ?? []).find?.((p) => p.business === "services" || p.id)?.id;
  const add = mine ? await fetch(`/api/projects/${mine}/site-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "domain-add", hostname: h }) }).then(async (r) => ({ status: r.status, message: (await r.json().catch(() => ({}))).error })) : "aucun projet";
  return { lectureProjetArtisan: (await fetch(`/api/projects/${pid}/site-publication`)).status, ajoutSurSonProjet: add };
}, [ids.artisan, WWW]);

// 8. Téléphone.
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await openModal(phone);
await phone.locator(`[data-custom-domain="${WWW}"]`).scrollIntoViewIfNeeded();
await shot(phone, "c1-08-telephone-domaine-actif");
out.journalDns = fs.readFileSync(DIR + "dns-journal.txt", "utf8").trim().split("\n").slice(-12);
out.erreursStudio = log;
save("c1-domaines", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
