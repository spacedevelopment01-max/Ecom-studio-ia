// Recette #232 lot B : site FICTIF riche en médias publié et visité (ordinateur, téléphone : toutes les images chargées),
// diagnostic, purge bornée après 12 publications, restauration intacte, purgée refusée, altération détectée puis
// corrigée, sauvegarde + vérification + contrôle (scripts), publication interrompue nettoyée.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { browser, context, ids, login, open, save, shot, STUDIO, DIR, watch } from "./lib.mjs";

const DATA = fs.readFileSync(DIR + "datadir.txt", "utf8").trim();
const out = {};
const api = (page, body) => page.evaluate(async ([pid, b]) => { const r = await fetch(`/api/projects/${pid}/site-publication`, b ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) } : undefined); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [ids.medias, body]);
const tsx = (args) => { try { return execSync(`npx tsx scripts/sites-backup.ts ${args}`, { cwd: DIR + "../wt-integ", env: { ...process.env, DATA_DIR: DATA, STOCK_OFFLINE: "1" } }).toString().trim(); } catch (e) { return `CODE ${e.status}\n${e.stdout}`; } };
async function openModal(page) {
  await open(page, `${STUDIO}/studio/${ids.medias}/boutique`);
  await page.waitForTimeout(2500);
  const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  // Téléphone : la barre d'outils du site est dans l'onglet « Aperçu ».
  if (!(await page.locator("[data-open-site-publication]").isVisible())) await page.getByRole("button", { name: /Aperçu/ }).first().click();
  await page.locator("[data-open-site-publication]").click();
  await page.locator("[data-site-publication]").waitFor();
  save("b1-fiabilite", out);
}

const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");

// 1. Publication du site riche en médias.
await openModal(owner);
await owner.getByRole("button", { name: "Publier la version actuelle" }).click();
await owner.locator("[data-site-live]").waitFor({ timeout: 180000 });
const ov = (await api(owner)).body;
out.publication = { adresse: ov.addresses.find((a) => a.kind === "studio").hostname, pages: ov.live.pages, octets: ov.publications[0].bytes, stockage: ov.storage };
await shot(owner, "b1-01-publie-riche-en-medias");
const SITE = `https://${out.publication.adresse}:3943`;

// 2. Visiteur anonyme : toutes les images chargées, ordinateur et téléphone.
out.visiteur = {};
for (const kind of ["ordinateur", "telephone"]) {
  const ctx = await context(b, kind);
  const v = await ctx.newPage();
  const bad = [];
  v.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  out.visiteur[kind] = {};
  for (const p of ["/", "/pages/realisations", "/pages/prestations"]) {
    const r = await v.goto(SITE + p, { waitUntil: "networkidle" });
    const rf = v.getByRole("button", { name: "Tout refuser" }); if (await rf.count()) await rf.first().click().catch(() => {});
    await v.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await v.waitForTimeout(1500);
    const imgs = await v.$$eval("img", (els) => els.map((e) => ({ src: e.currentSrc || e.src, ok: e.complete && e.naturalWidth > 0, w: e.naturalWidth })));
    out.visiteur[kind][p] = { statut: r.status(), images: imgs.length, chargees: imgs.filter((i) => i.ok).length, nonChargees: imgs.filter((i) => !i.ok).map((i) => i.src).slice(0, 5), largeurs: [...new Set(imgs.map((i) => i.w))].slice(0, 8) };
    await v.screenshot({ path: `${DIR}preuves/b1-02-visiteur-${kind}-${p === "/" ? "accueil" : p.split("/").pop()}.png`, fullPage: true });
  }
  out.visiteur[kind].erreurs = bad;
  await ctx.close();
}

// 3. Diagnostic.
await openModal(owner);
await owner.getByRole("button", { name: "Vérifier le site en ligne" }).click();
await owner.locator("[data-diagnostics-result]").waitFor();
await owner.locator("[data-site-diagnostics]").scrollIntoViewIfNeeded();
await shot(owner, "b1-03-diagnostic-ok");
out.diagnostic1 = (await api(owner, { action: "diagnose" })).body.diagnostics.checks.map((c) => `${c.ok ? "OK" : "À VOIR"} ${c.key} : ${c.detail}`);

// 4. Douze publications : purge bornée (en ligne + 10 plus récentes).
for (let i = 0; i < 11; i++) { const r = await api(owner, { action: "publish" }); if (r.status !== 200) { out.publishErreur = r; break; } }
const ov2 = (await api(owner)).body;
out.apresDouze = { publications: ov2.publications.length, purgees: ov2.publications.filter((p) => p.purged).map((p) => p.number), restaurables: ov2.publications.filter((p) => !p.purged).length, stockage: ov2.storage };
await openModal(owner);
await owner.locator("[data-publications]").scrollIntoViewIfNeeded();
await shot(owner, "b1-04-purge-anciennes-versions");
// Restauration d'une version purgée : refusée ; d'une version gardée : acceptée (fichiers vérifiés).
const purged = ov2.publications.find((p) => p.purged), kept = ov2.publications.find((p) => !p.purged && !p.live);
out.restaurerPurgee = await api(owner, { action: "restore", publicationId: purged.id }).then((r) => ({ statut: r.status, message: r.body.error }));
out.restaurerGardee = await api(owner, { action: "restore", publicationId: kept.id }).then((r) => ({ statut: r.status, enLigne: r.body.live?.number }));

// 5. Altération d'un fichier de la version en ligne : diagnostic → « À voir » ; republication → corrigé.
const live = (await api(owner)).body.live;
const man = JSON.parse(fs.readFileSync(path.join(DATA, "sites", ids.medias, live.id, "manifest.json"), "utf8"));
const rel = Object.keys(man.files).find((k) => /^assets\/rich-/.test(k));
fs.appendFileSync(path.join(DATA, "sites", ids.medias, live.id, "files", rel), "altération de recette");
await openModal(owner);
await owner.getByRole("button", { name: "Vérifier le site en ligne" }).click();
await owner.locator('[data-diagnostics-result="problems"]').waitFor();
await owner.locator("[data-site-diagnostics]").scrollIntoViewIfNeeded();
await shot(owner, "b1-05-diagnostic-fichier-altere");
out.diagnosticAltere = (await api(owner, { action: "diagnose" })).body.diagnostics.checks.filter((c) => !c.ok).map((c) => `${c.key} : ${c.detail}`);
out.restaurerAlteree = await api(owner, { action: "restore", publicationId: live.id }).then((r) => ({ statut: r.status, message: r.body.error }));
await api(owner, { action: "publish" });
out.diagnosticApresRepublication = (await api(owner, { action: "diagnose" })).body.diagnostics.checks.filter((c) => !c.ok).map((c) => c.key);

// 6. Publication interrompue simulée, puis sauvegarde, vérification et contrôle par le script d'exploitation.
const tmp = path.join(DATA, "sites", ids.medias, ".tmp-interrompue");
fs.mkdirSync(path.join(tmp, "files"), { recursive: true });
const old = new Date(Date.now() - 2 * 3600_000); fs.utimesSync(tmp, old, old);
const dest = path.join(DIR, "sauvegarde-recette");
fs.rmSync(dest, { recursive: true, force: true });
out.scriptSauvegarder = tsx(`sauvegarder ${dest}`);
out.scriptVerifier = tsx(`verifier ${dest}`);
out.scriptControler = tsx("controler");
out.interrompueNettoyee = !fs.existsSync(tmp);
// Altération dans la sauvegarde : détectée.
const anyPub = fs.readdirSync(path.join(dest, "sites", ids.medias))[0];
const anyHtml = path.join(dest, "sites", ids.medias, anyPub, "files", "index.html");
fs.appendFileSync(anyHtml, "<!-- altéré -->");
out.scriptVerifierApresAlteration = tsx(`verifier ${dest}`);

await openModal(owner);
await owner.getByRole("button", { name: "Vérifier le site en ligne" }).click();
await owner.locator("[data-diagnostics-result]").waitFor();
await owner.locator("[data-site-diagnostics]").scrollIntoViewIfNeeded();
await shot(owner, "b1-06-diagnostic-final");
out.diagnosticFinal = (await api(owner, { action: "diagnose" })).body.diagnostics.checks.map((c) => `${c.ok ? "OK" : "À VOIR"} ${c.key} : ${c.detail}`);
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await openModal(phone);
await phone.getByRole("button", { name: "Vérifier le site en ligne" }).click();
await phone.locator("[data-diagnostics-result]").waitFor();
await phone.locator("[data-site-diagnostics]").scrollIntoViewIfNeeded();
await shot(phone, "b1-07-telephone-diagnostic");
out.erreursStudio = log;
save("b1-fiabilite", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
