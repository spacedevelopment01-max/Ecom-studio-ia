// Recette #239 phase 1 : agence immobilière FICTIVE hébergée par le studio. Onglet Biens → publication V1 → visiteur
// anonyme (accueil, Acheter, Louer, fiches ; ordinateur et téléphone ; tous les liens) → modification d'un prix dans
// l'onglet Biens → site public inchangé + « modifications non publiées » → V2 → restauration V1 → compte étranger.
import { browser, context, ids, login, open, save, shot, STUDIO, watch } from "./lib.mjs";
const PID = ids.agence2;
const out = {};
const api = (page, path, body) => page.evaluate(async ([p, b]) => { const r = await fetch(p, b ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) } : undefined); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, body]);
const pub = (page, body) => api(page, `/api/projects/${PID}/site-publication`, body);
async function openModal(page) {
  await open(page, `${STUDIO}/studio/${PID}/boutique`);
  await page.waitForTimeout(2500);
  const close = page.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
  if (!(await page.locator("[data-open-site-publication]").isVisible())) await page.getByText("Aperçu", { exact: true }).first().click();
  await page.locator("[data-open-site-publication]").click();
  await page.locator("[data-site-publication]").waitFor();
}
const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");

// 1. Onglet Biens : statuts variés.
await open(owner, `${STUDIO}/studio/${PID}/biens`);
await owner.waitForTimeout(2500);
await shot(owner, "p1-01-onglet-biens", true);
const biens = (await api(owner, `/api/projects/${PID}/biens`)).body.biens;
out.biens = biens.map((x) => `${x.ref} ${x.status} ${x.handle}`);
const H = Object.fromEntries(biens.map((x) => [x.data.title, x.handle]));

// 2. Publication V1.
await openModal(owner);
await owner.getByRole("button", { name: "Publier la version actuelle" }).click();
await owner.locator("[data-site-live]").waitFor({ timeout: 180000 });
await owner.waitForTimeout(1500);
let ov = (await pub(owner)).body;
out.v1 = { numero: ov.live.number, pages: ov.live.pages, aJour: ov.freshness.upToDate };
const host = ov.addresses.find((a) => a.kind === "studio").hostname;
const SITE = `https://${host}:3943`;

// 3. Visiteur anonyme, ordinateur et téléphone.
out.visiteur = {};
for (const kind of ["ordinateur", "telephone"]) {
  const ctx = await context(b, kind);
  const v = await ctx.newPage();
  const errors = [];
  v.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url().replace(SITE, "")}`));
  const res = {};
  for (const p of ["/", "/pages/acheter", "/pages/louer", `/pages/bien/${H["Maison familiale avec jardin"]}`, `/pages/bien/${H["Loft sous les toits"]}`]) {
    const r = await v.goto(SITE + p, { waitUntil: "networkidle" });
    const rf = v.getByRole("button", { name: "Tout refuser" }); if (await rf.count()) await rf.first().click().catch(() => {});
    const txt = await v.locator("body").innerText();
    res[p] = { statut: r.status(), maison: /Maison familiale/.test(txt), studio: /Studio lumineux/.test(txt), vendu: /[Vv]endu/.test(txt), brouillon: /Villa avec piscine/.test(txt), retire: /Terrain à bâtir/.test(txt), prix485: /485\s?000/.test(txt) };
    await v.screenshot({ path: `${new URL("./preuves/", import.meta.url).pathname}p1-02-${kind}-${p === "/" ? "accueil" : p.split("/").pop().slice(0, 30)}.png`, fullPage: kind === "telephone" ? false : true });
  }
  // Tous les liens internes des pages visitées répondent.
  const links = new Set();
  for (const p of ["/", "/pages/acheter", "/pages/louer"]) { await v.goto(SITE + p, { waitUntil: "networkidle" }); for (const h of await v.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href").split("#")[0]))) links.add(h); }
  const broken = [];
  const status = (path) => v.evaluate(async (u) => (await fetch(u, { method: "GET" })).status, path);
  for (const l of links) { const st = await status(l); if (st >= 400) broken.push(`${st} ${l}`); }
  res.liens = { total: links.size, casses: broken };
  res.brouillonDirect = await status(`/pages/bien/${H["Villa avec piscine (brouillon)"]}`);
  res.retireDirect = await status(`/pages/bien/${H["Terrain à bâtir (retiré)"]}`);
  res.erreurs = errors;
  out.visiteur[kind] = res;
  await ctx.close();
}

// 4. Modification du prix de la maison dans l'onglet Biens (formulaire réel).
await open(owner, `${STUDIO}/studio/${PID}/biens`);
await owner.waitForTimeout(2000);
const row = owner.locator("li, article, div").filter({ hasText: "Maison familiale avec jardin" }).filter({ has: owner.getByRole("button", { name: "Modifier" }) }).last();
await row.getByRole("button", { name: "Modifier" }).click();
const price = owner.getByLabel("Prix (€) *");
await price.fill("465000");
await owner.getByRole("button", { name: "Enregistrer", exact: true }).click();
await owner.waitForTimeout(2500);
await owner.keyboard.press("Escape").catch(() => {});
await open(owner, `${STUDIO}/studio/${PID}/biens`);
await owner.locator("[data-biens-pending]").waitFor({ timeout: 30000 });
await shot(owner, "p1-03-onglet-biens-modification-non-publiee");
out.bandeauBiens = await owner.locator("[data-biens-pending]").innerText();
const v = await (await context(b)).newPage();
await v.goto(`${SITE}/pages/bien/${H["Maison familiale avec jardin"]}`, { waitUntil: "networkidle" });
out.publicAvantRepublication = /485\s?000/.test(await v.locator("body").innerText());
await openModal(owner);
await owner.locator("[data-site-pending]").waitFor();
await shot(owner, "p1-04-modifications-non-publiees");
out.etatModale = await owner.locator("[data-site-pending]").innerText();

// 5. V2 puis restauration de V1.
await owner.getByRole("button", { name: "Publier la version actuelle" }).click();
await owner.waitForTimeout(8000);
ov = (await pub(owner)).body;
out.v2 = { numero: ov.live.number, aJour: ov.freshness.upToDate };
await v.goto(`${SITE}/pages/bien/${H["Maison familiale avec jardin"]}`, { waitUntil: "networkidle" });
out.publicApresV2 = /465\s?000/.test(await v.locator("body").innerText());
await v.screenshot({ path: `${new URL("./preuves/", import.meta.url).pathname}p1-05-fiche-v2.png` });
const v1 = ov.publications.find((p) => p.number === out.v1.numero);
const r = await pub(owner, { action: "restore", publicationId: v1.id });
out.restauration = { statut: r.status, enLigne: r.body.live?.number, aJour: r.body.freshness?.upToDate };
await v.goto(`${SITE}/pages/bien/${H["Maison familiale avec jardin"]}`, { waitUntil: "networkidle" });
out.publicApresRestauration = /485\s?000/.test(await v.locator("body").innerText());
await v.screenshot({ path: `${new URL("./preuves/", import.meta.url).pathname}p1-06-fiche-v1-restauree.png` });

// 6. Compte étranger.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = { biens: (await api(stranger, `/api/projects/${PID}/biens`)).status, publication: (await api(stranger, `/api/projects/${PID}/site-publication`)).status };

// 7. Téléphone : onglet Biens.
const phone = await (await context(b, "telephone")).newPage();
await login(phone, "proprio@recette.invalid");
await open(phone, `${STUDIO}/studio/${PID}/biens`);
await phone.waitForTimeout(2500);
await shot(phone, "p1-07-telephone-onglet-biens");
out.erreursStudio = log;
save("p1-biens", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
