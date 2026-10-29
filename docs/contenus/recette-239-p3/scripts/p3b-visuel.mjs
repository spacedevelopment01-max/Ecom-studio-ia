// Recette #239 phase 3 (contrôle visuel après corrections) : en-tête PHASE avec et sans réalisations (le chevauchement
// du nom existait-il avant ?), puis sites PHASE et Rive republiés : galerie, fiche, accueil, ordinateur et téléphone.
import { browser, context, ids, login, open, save, STUDIO, DIR } from "./lib.mjs";
const out = {};
const api = (page, path, method = "GET", body) => page.evaluate(async ([p, m, b]) => { const r = await fetch(p, { method: m, headers: b ? { "Content-Type": "application/json" } : undefined, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, body: await r.json().catch(() => ({})) }; }, [path, method, body]);
const refuse = async (p) => { const r = p.getByRole("button", { name: "Tout refuser" }); if (await r.count()) await r.first().click().catch(() => {}); };
const b = await browser();
const owner = await (await context(b)).newPage();
await login(owner, "proprio@recette.invalid");
const E = ids.electricien;
const proj = (await api(owner, `/api/projects/${E}`)).body;
const vid = proj.theme?.versionId ?? proj.project?.theme?.versionId;
const reals = (await api(owner, `/api/projects/${E}/realisations`)).body.realisations;
// Sans réalisation publiée : l'en-tête tel que le thème le compose pour ce client.
for (const r of reals) await api(owner, `/api/projects/${E}/realisations`, "POST", { action: "status", id: r.id, status: "withdrawn" });
const v = await (await context(b)).newPage();
await login(v, "proprio@recette.invalid");
await open(v, `${STUDIO}/preview/${E}/v/${vid}/`); await refuse(v);
await v.screenshot({ path: `${DIR}preuves/p3-30-phase-entete-sans-realisation.png`, clip: { x: 0, y: 0, width: 1440, height: 130 } });
out.menuSansRealisation = await v.locator("header a, nav a").allInnerTexts();
for (const r of reals) await api(owner, `/api/projects/${E}/realisations`, "POST", { action: "status", id: r.id, status: "published" });
await open(v, `${STUDIO}/preview/${E}/v/${vid}/`); await refuse(v);
await v.screenshot({ path: `${DIR}preuves/p3-31-phase-entete-avec-realisations.png`, clip: { x: 0, y: 0, width: 1440, height: 130 } });
// Sites republiés.
for (const key of ["electricien", "amenagement"]) {
  await open(owner, `${STUDIO}/studio/${ids[key]}/realisations`);
  const r = await api(owner, `/api/projects/${ids[key]}/site-publication`, "POST", { action: "publish" });
  const host = r.body.addresses.find((a) => a.kind === "studio").hostname;
  const list = (await api(owner, `/api/projects/${ids[key]}/realisations`)).body.realisations;
  out[key] = { publication: r.status, numero: r.body.live?.number };
  for (const kind of ["ordinateur", "telephone"]) {
    const p = await (await context(b, kind)).newPage();
    for (const [name, path] of [["accueil", "/"], ["galerie", "/pages/realisations"], ["fiche", `/pages/${list[0].handle}`]]) {
      await p.goto(`https://${host}:3943${path}`, { waitUntil: "networkidle" }); await refuse(p);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); }); await p.waitForTimeout(500);
      if (name === "fiche") out[`${key}_${kind}_boutons`] = await p.locator("a").filter({ hasText: /devis|contact/i }).evaluateAll((as) => [...new Set(as.map((a) => `${a.textContent.trim()} → ${a.getAttribute("href")}`))]);
      await p.screenshot({ path: `${DIR}preuves/p3-${key === "electricien" ? 2 : 3}${name === "accueil" ? 2 : name === "galerie" ? 3 : 4}-${key}-${name}-${kind}.png`, fullPage: true });
    }
    await p.context().close();
  }
}
save("p3b-visuel", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
