// Recette #239 phase 3 sur l'instance isolée, comptes et entreprises FICTIFS, photos générées, SMTP LOCAL uniquement.
// APLAT (plâtrier) : onglet Réalisations par le formulaire (3 réalisations : 2 publiées dont une avec avant/après, 1
// brouillon) → aperçu galerie, filtre et fiche (ordinateur et téléphone) → site publié V1 → visiteur anonyme : galerie,
// fiche, liens, brouillon absent, demande de devis depuis une fiche → e-mail reçu par le SMTP local → réalisation
// modifiée : site inchangé et « non publié » → V2 → restauration V1. PHASE (électricien) et Atelier Rive (aménagement) :
// réalisations saisies par l'API du studio, site publié, accueil / galerie / fiche sur ordinateur et téléphone.
// Compte étranger : refusé.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { browser, context, ids, login, open, save, shot, STUDIO, DIR, watch } from "./lib.mjs";
const out = {};
const api = (page, path, method = "GET", body) => page.evaluate(async ([p, m, b]) => { const r = await fetch(p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, method, body]);
const smtp = (on) => execSync(`npx tsx ${DIR}smtp-config.mts ${on ? "on" : "off"}`, { cwd: DIR + "../wt-integ", env: { ...process.env, DATA_DIR: fs.readFileSync(DIR + "datadir.txt", "utf8").trim() } }).toString().trim();
const sinkState = async () => (await fetch("http://127.0.0.1:2526/")).json();
const waitFor = async (cond, ms, label) => { const end = Date.now() + ms; for (;;) { const v = await cond(); if (v) return v; if (Date.now() > end) throw new Error(`délai dépassé : ${label}`); await new Promise((r) => setTimeout(r, 1000)); } };
const refuse = async (p) => { const r = p.getByRole("button", { name: "Tout refuser" }); if (await r.count()) await r.first().click().catch(() => {}); };
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
const assetsOf = async (page, pid) => Object.fromEntries((await api(page, `/api/projects/${pid}/files`)).body.assets.map((a) => [a.name.replace(/\.jpg$/, ""), a.id]));

/** Saisie d'une réalisation par le formulaire de l'onglet (photos choisies dans la médiathèque du projet). */
async function fillRealisation(page, r) {
  await page.getByRole("button", { name: "Ajouter une réalisation" }).click();
  const f = page.locator("[data-realisation-form]");
  await f.waitFor();
  await f.getByLabel("Titre du projet *").fill(r.title);
  await f.getByLabel("Résumé (une phrase, affichée sur les vignettes)").fill(r.summary);
  if (r.need) await f.getByLabel("La demande du client (facultatif)").fill(r.need);
  if (r.work) await f.getByLabel("Le travail réalisé").fill(r.work);
  await f.getByLabel("Catégorie (filtre)").fill(r.category);
  if (r.location) await f.getByLabel("Lieu ou zone (facultatif)").fill(r.location);
  if (r.period) await f.getByLabel("Date (facultatif)").fill(r.period);
  await f.getByRole("button", { name: "Ajouter des photos du projet" }).click();
  let dlg = page.getByRole("dialog").last();
  for (const name of r.photos) await dlg.locator("button[aria-pressed]", { hasText: name }).first().click();
  await dlg.getByRole("button", { name: r.photos.length > 1 ? `Utiliser ${r.photos.length} médias` : "Utiliser ce média" }).click();
  if (r.alt) await f.getByLabel("Description de la photo 1").fill(r.alt);
  if (r.before) {
    await f.getByRole("button", { name: "Choisir la photo « avant »" }).click();
    dlg = page.getByRole("dialog").last();
    await dlg.locator("button[aria-pressed]", { hasText: r.before }).first().click();
    await dlg.getByRole("button", { name: "Utiliser ce média" }).click();
  }
  if (r.shot) await shot(page, r.shot);
  await f.getByRole("button", { name: r.publish ? "Enregistrer et publier" : "Enregistrer" }).first().click();
  await f.waitFor({ state: "detached", timeout: 20000 });
  await page.waitForTimeout(800);
}

out.smtp = smtp(true);
const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");

// ───────── APLAT : saisie par le formulaire
const A = ids.platrier;
await open(owner, `${STUDIO}/studio/${A}/realisations`);
await owner.locator("[data-tab-realisations]").waitFor({ timeout: 60000 });
out.ongletVisibleDansLeMenu = await owner.getByRole("link", { name: /Réalisations/ }).count();
const already = (await api(owner, `/api/projects/${A}/realisations`)).body.realisations.length;
if (!already) {
await shot(owner, "p3-01-aplat-onglet-vide");
await fillRealisation(owner, { title: "Séjour repris du sol au plafond", summary: "Enduits et peinture d'un séjour de 28 m².", need: "Des murs fissurés et un plafond jauni à remettre à neuf, sans déménager le séjour.", work: "Protection du mobilier, rebouchage des fissures, enduit de lissage, deux couches de peinture mate sur les murs et le plafond.", category: "Peinture", location: "Villeurbanne", period: "Septembre 2026", photos: ["Séjour après", "Angle repris"], alt: "Séjour repeint, murs clairs", before: "Séjour avant", publish: true, shot: "p3-02-aplat-formulaire" });
await fillRealisation(owner, { title: "Cloison de bureau", summary: "Une cloison en plaques de plâtre pour créer un bureau.", work: "Ossature métallique, plaques de plâtre, bandes et enduit, plafond jointoyé.", category: "Plâtrerie", photos: ["Cloison posée", "Bureau fini", "Plafond jointoyé"], publish: true });
await fillRealisation(owner, { title: "Couloir rafraîchi", summary: "Couloir en cours de rédaction.", category: "Peinture", photos: ["Couloir après"], before: "Couloir avant", publish: false });
}
await shot(owner, "p3-03-aplat-trois-realisations");
const reals = (await api(owner, `/api/projects/${A}/realisations`)).body.realisations;
out.aplatSaisies = reals.map((r) => ({ titre: r.title, etat: r.status, adresse: r.handle, photos: r.photos.length, avant: !!r.before }));
const [R1, R2, R3] = reals;

// Aperçu du studio : galerie, filtre, fiche (ordinateur et téléphone), brouillon en aperçu seul.
const vid = (await api(owner, `/api/projects/${A}`)).body.theme?.versionId ?? (await api(owner, `/api/projects/${A}`)).body.project?.theme?.versionId;
out.versionId = !!vid;
const PREV = `${STUDIO}/preview/${A}/v/${vid}`;
await open(owner, `${PREV}/pages/realisations`);
await refuse(owner);
out.apercuGalerie = { cartes: await owner.locator("[data-ap-item]").count(), filtres: await owner.locator("[data-ap-filter]").allInnerTexts() };
await shot(owner, "p3-04-aplat-apercu-galerie-ordinateur", true);
await owner.locator('[data-ap-filter="platrerie"]').first().click();
await owner.waitForTimeout(600);
out.apercuFiltrePlatrerie = await owner.locator("[data-ap-item]:visible").allInnerTexts();
await shot(owner, "p3-05-aplat-apercu-filtre-platrerie");
await open(owner, `${PREV}/pages/${R1.handle}`);
await refuse(owner);
const fiche = await owner.locator("body").innerText();
out.apercuFiche = { titre: fiche.includes("Séjour repris du sol au plafond"), demande: fiche.includes("Des murs fissurés"), travail: fiche.includes("deux couches de peinture mate"), lieu: fiche.includes("Villeurbanne"), date: fiche.includes("Septembre 2026"), avantApres: (await owner.locator(".ap-compare, [data-ap-compare]").count()) > 0 };
await shot(owner, "p3-06-aplat-apercu-fiche-ordinateur", true);
out.apercuBrouillon = (await owner.goto(`${PREV}/pages/realisations?es_realisation=${R3.id}`, { waitUntil: "networkidle" }), (await owner.locator("body").innerText()).includes("Couloir rafraîchi"));
const ph = await (await context(b, "telephone")).newPage();
await login(ph, "proprio@recette.invalid");
await open(ph, `${PREV}/pages/realisations`); await refuse(ph);
await shot(ph, "p3-07-aplat-apercu-galerie-telephone", true);
await open(ph, `${PREV}/pages/${R1.handle}`); await refuse(ph);
await shot(ph, "p3-08-aplat-apercu-fiche-telephone", true);
await open(ph, `${STUDIO}/studio/${A}/realisations`); await ph.waitForTimeout(2500);
await shot(ph, "p3-09-telephone-onglet-realisations");

// Site publié V1 : visiteur anonyme.
await open(owner, `${STUDIO}/studio/${A}/realisations`);
const v1 = await publishSite(owner, A);
out.v1 = v1;
const SITE = `https://${v1.host}:3943`;
for (const kind of ["ordinateur", "telephone"]) {
  const v = await (await context(b, kind)).newPage();
  const g = await v.goto(`${SITE}/pages/realisations`, { waitUntil: "networkidle" }); await refuse(v);
  const gt = await v.locator("body").innerText();
  const home = await (await v.goto(`${SITE}/`, { waitUntil: "networkidle" }), v.locator("body").innerText());
  await v.screenshot({ path: `${DIR}preuves/p3-10-aplat-site-accueil-${kind}.png`, fullPage: kind === "ordinateur" });
  await v.goto(`${SITE}/pages/realisations`, { waitUntil: "networkidle" });
  await v.screenshot({ path: `${DIR}preuves/p3-11-aplat-site-galerie-${kind}.png`, fullPage: true });
  const d = await v.goto(`${SITE}/pages/${R1.handle}`, { waitUntil: "networkidle" });
  await v.screenshot({ path: `${DIR}preuves/p3-12-aplat-site-fiche-${kind}.png`, fullPage: true });
  out[`site_${kind}`] = { galerie: g.status(), sejour: gt.includes("Séjour repris du sol au plafond"), cloison: gt.includes("Cloison de bureau"), brouillonAbsent: !gt.includes("Couloir rafraîchi"), accueil: home.includes("Séjour repris du sol au plafond"), menu: (await v.locator('a[href="/pages/realisations"]').count()) > 0, fiche: d.status() };
  await v.context().close();
}
const visitor = await (await context(b)).newPage();
out.brouillonSurLeSite = (await visitor.goto(`${SITE}/pages/${R3.handle}`)).status();
// Tous les liens internes des pages visitées répondent.
const links = new Set();
for (const p of ["/", "/pages/realisations", `/pages/${R1.handle}`, `/pages/${R2.handle}`]) { await visitor.goto(SITE + p, { waitUntil: "networkidle" }); for (const h of await visitor.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href").split("#")[0].split("?")[0]))) links.add(h); }
const broken = [];
for (const l of links) { const st = await visitor.evaluate(async (u) => (await fetch(u, { redirect: "manual" })).status, l); if (st >= 400) broken.push(`${st} ${l}`); }
out.liens = { verifies: links.size, casses: broken };

// Demande de devis depuis la fiche (bouton de la fiche) → e-mail au SMTP local.
await visitor.goto(`${SITE}/pages/${R1.handle}`, { waitUntil: "networkidle" }); await refuse(visitor);
const ctaHref = await visitor.locator(".ap-cta a, [class*=ap-cta] a").first().getAttribute("href");
out.boutonDevisDeLaFiche = ctaHref;
const before = (await sinkState()).count;
await visitor.goto(SITE + ctaHref, { waitUntil: "networkidle" }); await refuse(visitor);
const form = visitor.locator('form[action="/contact#contact_form"]').first();
for (const el of await form.locator("input:visible, textarea:visible, select:visible").all()) {
  const type = await el.getAttribute("type"), name = (await el.getAttribute("name")) ?? "";
  if (type === "hidden" || type === "submit" || type === "file" || name === "contact[site_web]") continue;
  if (type === "checkbox" || type === "radio") { await el.check().catch(() => {}); continue; }
  if ((await el.evaluate((e) => e.tagName)) === "SELECT") { const v = await el.locator("option").nth(1).getAttribute("value"); if (v) await el.selectOption(v); continue; }
  await el.fill(type === "email" || /email/.test(name) ? "camille.fictive@example.test" : type === "tel" || /phone|tel/.test(name) ? "0600000009" : /code_postal/.test(name) ? "69100" : /commune/.test(name) ? "Villeurbanne" : /body|message|projet|description/.test(name) ? "Demande fictive de recette : un séjour comme « Séjour repris du sol au plafond », environ 25 m²." : "Camille Fictive");
}
await shot(visitor, "p3-13-aplat-devis-rempli", true);
const sent = visitor.waitForResponse((x) => x.url().endsWith("/contact") && x.request().method() === "POST", { timeout: 30000 });
await form.locator('button[type="submit"]').first().click();
out.devisEnvoi = (await sent).status();
await visitor.waitForTimeout(1500);
await shot(visitor, "p3-14-aplat-devis-envoye");
const mail = await waitFor(async () => { const s = await sinkState(); return s.count > before ? s.messages.at(-1) : null; }, 60000, "e-mail de la demande");
out.emailDevis = { a: mail.to, sujet: mail.subject };

// Réalisation modifiée dans l'onglet : site inchangé, « non publié », V2, restauration V1.
const summaryOnSite = async () => { await visitor.goto(`${SITE}/pages/realisations`, { waitUntil: "networkidle" }); const t = await visitor.locator("body").innerText(); return t.includes("Enduits, peinture et boiseries") ? "V2" : t.includes("Enduits et peinture d'un séjour") ? "V1" : "?"; };
await open(owner, `${STUDIO}/studio/${A}/realisations`);
await owner.locator(`[data-realisation="${R1.title}"]`).getByRole("button", { name: "Modifier" }).click();
await owner.locator("[data-realisation-form]").getByLabel("Résumé (une phrase, affichée sur les vignettes)").fill("Enduits, peinture et boiseries d'un séjour de 28 m².");
await owner.locator("[data-realisation-save]").click();
await owner.waitForTimeout(1500);
out.siteAvantRepublication = await summaryOnSite();
await openPublish(owner, A);
await owner.locator("[data-site-pending]").waitFor({ timeout: 30000 });
out.nonPublie = await owner.locator("[data-site-pending]").innerText();
await shot(owner, "p3-15-aplat-modification-non-publiee");
const v2 = await publishSite(owner, A);
out.v2 = v2.numero;
out.siteApresV2 = await summaryOnSite();
const pubs = (await api(owner, `/api/projects/${A}/site-publication`)).body.publications;
out.restauration = (await api(owner, `/api/projects/${A}/site-publication`, "POST", { action: "restore", publicationId: pubs.find((p) => p.number === v1.numero).id })).status;
out.siteApresRestauration = await summaryOnSite();
save("p3-realisations", out);

// ───────── PHASE et Atelier Rive : réalisations par l'API du studio, site publié, accueil / galerie / fiche.
const SEED = {
  electricien: [
    { title: "Tableau électrique remis à neuf", summary: "Remplacement d'un tableau ancien dans une maison des années 70.", need: "Un tableau ancien sans protection différentielle.", work: "Dépose, nouveau tableau avec interrupteurs différentiels, repérage des circuits.", category: "Tableau", location: "Caluire-et-Cuire", period: "2026", photos: ["Tableau neuf", "Détail variateur"], before: "Tableau avant" },
    { title: "Cuisine et jardin éclairés", summary: "Spots encastrés dans la cuisine et éclairage du jardin.", work: "Six spots sur variateur, deux bornes extérieures sur minuterie.", category: "Éclairage", photos: ["Cuisine éclairée", "Jardin la nuit"] },
  ],
  amenagement: [
    { title: "Salon ouvert sur la cuisine", summary: "Un séjour réorganisé autour d'une grande table.", need: "Recevoir à huit sans encombrer le séjour.", work: "Plan d'aménagement, choix des matières, banquette sur mesure.", category: "Appartements", location: "Lyon 6e", photos: ["Salon fictif", "Détail bois"] },
    { title: "Chambre apaisée", summary: "Des rangements intégrés et une lumière douce.", work: "Tête de lit et placards sur mesure.", category: "Maisons", photos: ["Chambre fictive"] },
    { title: "Cuisine compacte", summary: "Tout trouver sans se gêner dans 6 m².", category: "Appartements", photos: ["Cuisine fictive"] },
  ],
};
for (const key of ["electricien", "amenagement"]) {
  const pid = ids[key];
  const assets = await assetsOf(owner, pid);
  const made = [];
  for (const r of SEED[key]) {
    const c = await api(owner, `/api/projects/${pid}/realisations`, "POST", { action: "create", realisation: { ...r, photos: r.photos.map((n) => ({ assetId: assets[n], alt: n })), before: r.before ? { assetId: assets[r.before], alt: r.before } : null } });
    const s = await api(owner, `/api/projects/${pid}/realisations`, "POST", { action: "status", id: c.body.realisation.id, status: "published" });
    made.push({ titre: r.title, creation: c.status, publication: s.status, adresse: c.body.realisation.handle });
  }
  const pub = await publishSite(owner, pid);
  out[`${key}`] = { saisies: made, publication: pub };
  if (!pub.ok) continue;
  const S = `https://${pub.host}:3943`;
  for (const kind of ["ordinateur", "telephone"]) {
    const v = await (await context(b, kind)).newPage();
    const res = {};
    for (const [name, path] of [["accueil", "/"], ["galerie", "/pages/realisations"], ["fiche", `/pages/${made[0].adresse}`]]) {
      const r = await v.goto(S + path, { waitUntil: "networkidle" }); await refuse(v);
      res[name] = { statut: r.status(), projet: (await v.locator("body").innerText()).includes(SEED[key][0].title) };
      await v.screenshot({ path: `${DIR}preuves/p3-2${key === "electricien" ? 0 : 5}-${key}-${name}-${kind}.png`, fullPage: name !== "accueil" || kind === "ordinateur" });
    }
    out[`${key}_${kind}`] = res;
    await v.context().close();
  }
}

// Compte étranger.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = { lecture: (await api(stranger, `/api/projects/${A}/realisations`)).status, ajout: (await api(stranger, `/api/projects/${A}/realisations`, "POST", { action: "create", realisation: { title: "Pirate" } })).status, onglet: (await stranger.goto(`${STUDIO}/studio/${A}/realisations`), stranger.url()) };
out.erreursStudio = log;
save("p3-realisations", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
