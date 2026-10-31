// Recette #232, site 1 (suite) : état des publications, domaine personnalisé fictif (vérification DNS refusée honnêtement),
// compte étranger refusé, site toujours en ligne.
import { browser, context, ids, login, open, save, shot, STUDIO, watch } from "./lib.mjs";
const out = {};
const b = await browser();
const owner = await (await context(b)).newPage();
const log = []; watch(owner, log);
await login(owner, "proprio@recette.invalid");
await open(owner, `${STUDIO}/studio/${ids.artisan}/boutique`);
await owner.waitForTimeout(2500);
const close = owner.getByRole("button", { name: /Fermer/ }); if (await close.count()) await close.first().click().catch(() => {});
await owner.locator("[data-open-site-publication]").click();
const modal = owner.locator("[data-site-publication]");
await modal.waitFor();
const state = await owner.evaluate(async (pid) => (await fetch(`/api/projects/${pid}/site-publication`)).json(), ids.artisan);
out.enLigne = state.live && { numero: state.live.number ?? state.live.id, pages: state.live.pages };
out.historique = (state.history ?? []).map((h) => `${h.action} → ${h.publication_id ?? h.publicationId ?? ""} ${h.at ?? h.created_at ?? ""}`);
out.adresses = (state.addresses ?? []).map((a) => `${a.kind ?? ""} ${a.hostname} ${a.status ?? ""}`);
out.demandes = (state.requests ?? []).length;
const visitor = await (await context(b)).newPage();
out.nouvelleAdresse = (await visitor.goto("https://cle-de-fa-lyon.sites.recette.test:3943/")).status();
out.ancienneAdresse = (await visitor.goto("https://atelier-cle-de-fa.sites.recette.test:3943/")).status();
await visitor.goto("https://cle-de-fa-lyon.sites.recette.test:3943/policies/legal-notice", { waitUntil: "networkidle" });
const t = await visitor.locator("body").innerText();
out.v1EnLigne = t.includes("1 rue de l'Exemple") && !t.includes("VERSION 2");
await visitor.screenshot({ path: new URL("./preuves/s1-11b-visiteur-nouvelle-adresse-v1.png", import.meta.url).pathname });
await modal.locator('input[aria-label="Nom de domaine"]').fill("www.cle-de-fa.example");
await modal.getByRole("button", { name: "Ajouter", exact: true }).click();
const dom = owner.locator('[data-custom-domain="www.cle-de-fa.example"]');
await dom.waitFor();
await dom.getByRole("button", { name: "Vérifier" }).click();
await owner.waitForTimeout(3000);
await dom.scrollIntoViewIfNeeded();
await shot(owner, "s1-12-domaine-personnalise");
out.domaine = await dom.innerText();
out.domaineServi = await visitor.goto("https://www.cle-de-fa.example/").then((r) => r.status()).catch((e) => `injoignable (${String(e).slice(0, 60)})`);
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
out.compteEtranger = {
  lecture: await stranger.evaluate(async (pid) => { const r = await fetch(`/api/projects/${pid}/site-publication`); return { status: r.status, body: (await r.text()).slice(0, 160) }; }, ids.artisan),
  retrait: await stranger.evaluate(async (pid) => (await fetch(`/api/projects/${pid}/site-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish" }) })).status, ids.artisan),
  restauration: await stranger.evaluate(async (pid) => (await fetch(`/api/projects/${pid}/site-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", publicationId: "x" }) })).status, ids.artisan),
};
await open(stranger, `${STUDIO}/studio/${ids.artisan}/boutique`);
await stranger.waitForTimeout(2000);
await shot(stranger, "s1-13-compte-etranger");
out.compteEtrangerPage = (await stranger.locator("body").innerText()).slice(0, 200);
out.siteToujoursEnLigne = (await visitor.goto("https://cle-de-fa-lyon.sites.recette.test:3943/")).status();
out.erreursStudio = log;
save("s1-versions", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
