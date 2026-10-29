// Recette #239 phase 4 sur l'instance isolée, comptes et entreprises FICTIFS.
// 1. Menus du studio par métier (agence, restaurant, salon, plâtrier) : ordinateur et téléphone.
// 2. API native des contenus avec la session du professionnel : manifeste, création, publication refusée sans
//    accord (428), version périmée refusée (409), publication avec accord, site en ligne non modifié par l'API.
// 3. Adresse unique : profil d'activité du salon modifié → réservation du site à jour (nouvelle version).
// 4. Export Shopify du plâtrier : avertissement « contenus copiés, sans synchronisation ».
// 5. Compte étranger : 404 sur toutes les routes de l'API.
import { browser, context, ids, login, open, save, shot, STUDIO, DIR } from "./lib.mjs";
const out = {};
const api = (page, path, method = "GET", body) => page.evaluate(async ([p, m, b]) => { const r = await fetch(p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, method, body]);
const b = await browser();
const owner = await (await context(b)).newPage();
await login(owner, "proprio@recette.invalid");

// 1. Menus par métier.
for (const key of ["agence2", "restaurant", "salon", "platrier"]) {
  await open(owner, `${STUDIO}/studio/${ids[key]}/pilote`);
  await owner.waitForTimeout(2500);
  const nav = await owner.locator("aside nav a, aside a[href*='/studio/']").evaluateAll((as) => [...new Set(as.map((a) => (a.getAttribute("href") ?? "").split("/").pop()))].filter(Boolean));
  out[`menu_${key}`] = nav;
  await shot(owner, `p4-01-menu-${key}`);
}
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await open(phone, `${STUDIO}/studio/${ids.platrier}/pilote`);
await phone.waitForTimeout(2500);
const more = phone.getByRole("button", { name: /Plus|Tous les espaces|Menu/ }).last();
if (await more.count()) { await more.click().catch(() => {}); await phone.waitForTimeout(800); }
out.menuTelephonePlatrier = await phone.locator("[role=dialog] a").evaluateAll((as) => as.map((a) => (a.getAttribute("href") ?? "").split("/").pop())).catch(() => []);
await shot(phone, "p4-02-menu-telephone-platrier");

// 2. API native (artisan électricien, déjà publié en V2).
const E = ids.electricien;
await open(owner, `${STUDIO}/studio/${E}/realisations`);
out.manifeste = (await api(owner, `/api/projects/${E}/contenus`)).body;
const assets = Object.fromEntries((await api(owner, `/api/projects/${E}/files`)).body.assets.map((a) => [a.name.replace(/\.jpg$/, ""), a.id]));
const c = await api(owner, `/api/projects/${E}/contenus/realisations`, "POST", { action: "create", data: { title: "Prises de garage", summary: "Trois prises et un éclairage étanche dans un garage.", category: "Éclairage", photos: [{ assetId: assets["Détail variateur"], alt: "Détail" }] } });
out.creation = { statut: c.status, etat: c.body.item?.status, version: !!c.body.item?.version };
const rid = c.body.item.id;
out.publierSansAccord = (await api(owner, `/api/projects/${E}/contenus/realisations/${rid}`, "POST", { action: "publish" })).status;
const v1 = c.body.item.version;
await owner.waitForTimeout(20);
out.modification = (await api(owner, `/api/projects/${E}/contenus/realisations/${rid}`, "PATCH", { data: { summary: "Trois prises, un éclairage étanche." }, ifVersion: v1 })).status;
out.versionPerimee = (await api(owner, `/api/projects/${E}/contenus/realisations/${rid}`, "PATCH", { data: { summary: "Autre" }, ifVersion: v1 })).status;
const pub = await api(owner, `/api/projects/${E}/contenus/realisations/${rid}`, "POST", { action: "publish", confirm: true });
out.publierAvecAccord = { statut: pub.status, etat: pub.body.item?.status, site: pub.body.site };
const host = "volt-fictif-electricite.sites.recette.test";
const vis = await (await context(b)).newPage();
await vis.goto(`https://${host}:3943/pages/realisations`, { waitUntil: "networkidle" });
out.siteEnLigneInchange = !(await vis.locator("body").innerText()).includes("Prises de garage");
await openPublish(owner, E);
out.bandeauNonPublie = await owner.locator("[data-site-pending]").innerText().catch(() => null);
await shot(owner, "p4-03-api-modification-non-publiee");
// Retour à l'état publié : la réalisation de test est retirée (avec accord) pour ne pas laisser de différence.
out.retrait = (await api(owner, `/api/projects/${E}/contenus/realisations/${rid}`, "POST", { action: "withdraw", confirm: true })).status;

// 3. Adresse unique (salon) : profil d'activité → réservation.
const S = ids.salon;
await open(owner, `${STUDIO}/studio/${S}/produit`);
const proj = (await api(owner, `/api/projects/${S}`)).body;
const sv = proj.services ?? proj.project?.services;
const before = (await api(owner, `/api/projects/${S}/contenus/prestations/prestations`)).body.item;
out.adresseAvant = { profil: sv.address, reservation: before.data.address, version: before.version };
const patched = await api(owner, `/api/projects/${S}`, "PATCH", { services: { ...sv, address: "14 rue des Ciseaux Fictifs, 69002 Lyon", services: sv.services.map((s) => ({ name: s.name, description: s.description })) } });
const after = (await api(owner, `/api/projects/${S}/contenus/prestations/prestations`)).body.item;
out.adresseApres = { patch: patched.status, reservation: after.data.address, nouvelleVersion: after.version !== before.version };
await open(owner, `${STUDIO}/studio/${S}/rendez-vous`);
await owner.waitForTimeout(2000);
await owner.getByRole("button", { name: "Prestations, horaires, fermetures, intervenants" }).click().catch(() => {});
await owner.locator("[data-prestations-editor]").waitFor({ timeout: 15000 }).catch(() => {});
out.adresseDansEditeur = await owner.getByLabel("Adresse de l'établissement").inputValue().catch(() => null);
await owner.getByLabel("Adresse de l'établissement").scrollIntoViewIfNeeded().catch(() => {});
await shot(owner, "p4-04-adresse-unique-editeur");

// 4. Export Shopify du plâtrier (contenus copiés).
const A = ids.platrier;
await open(owner, `${STUDIO}/studio/${A}/boutique`);
const exp = await owner.evaluate(async (pid) => { const r = await fetch(`/api/projects/${pid}/theme/export?platform=shopify`); return { status: r.status, verdict: r.headers.get("X-ES-Verdict"), taille: (await r.arrayBuffer()).byteLength }; }, A);
out.exportShopify = exp;
const files = (await api(owner, `/api/projects/${A}/files`)).body.assets.filter((a) => a.role === "theme-export").map((a) => ({ nom: a.name, problemes: (a.meta?.issues ?? []).filter((i) => /Contenus métier/.test(i)) }));
out.exportEnregistre = files.slice(0, 2);

// 5. Compte étranger.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = {
  manifeste: (await api(stranger, `/api/projects/${E}/contenus`)).status,
  liste: (await api(stranger, `/api/projects/${E}/contenus/realisations`)).status,
  lecture: (await api(stranger, `/api/projects/${E}/contenus/realisations/${rid}`)).status,
  publication: (await api(stranger, `/api/projects/${E}/contenus/realisations/${rid}`, "POST", { action: "publish", confirm: true })).status,
};
save("p4-integration", out);
console.log(JSON.stringify(out, null, 1));
await b.close();

async function openPublish(page, pid) {
  await open(page, `${STUDIO}/studio/${pid}/boutique`);
  await page.waitForTimeout(2500);
  const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  if (!(await page.locator("[data-open-site-publication]").isVisible())) await page.getByText("Aperçu", { exact: true }).first().click();
  await page.locator("[data-open-site-publication]").click();
  await page.locator("[data-site-publication]").waitFor();
}
