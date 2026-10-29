// Recette #232, site 1 : demande reçue visible dans le studio ; correction → V2 en ligne ; restauration V1 ; changement
// d'adresse ; domaine personnalisé (DNS fictif : vérification refusée honnêtement) ; compte étranger refusé.
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
await owner.locator("[data-site-publication]").waitFor();
await owner.locator("[data-site-requests]").scrollIntoViewIfNeeded();
await shot(owner, "s1-06-demande-recue-dans-le-studio");
out.demandes = await owner.locator("[data-site-requests] li").allInnerTexts();
const visitor = await (await context(b)).newPage();
const SITE = "https://atelier-cle-de-fa.sites.recette.test:3943";
const legalText = async (base = SITE) => { await visitor.goto(`${base}/policies/legal-notice`, { waitUntil: "networkidle" }); return visitor.locator("main, body").first().innerText(); };
out.v1 = (await legalText()).includes("1 rue de l'Exemple");
// Correction de la page légale (V2) puis publication.
const legal = owner.locator('[data-policy="legal-notice"]');
await legal.scrollIntoViewIfNeeded();
await legal.getByRole("button", { name: "Rédiger" }).click();
await legal.locator("textarea").fill("Mentions légales d'Atelier Clé de Fa — VERSION 2 (entreprise fictive de recette).\n\nÉditeur : Atelier Clé de Fa, 12 avenue Fictive, 69003 Lyon.\n\nHébergement : E-com Studio IA (prototype de recette).");
await legal.getByRole("button", { name: "Enregistrer" }).click();
await owner.waitForTimeout(1500);
await owner.getByRole("button", { name: "Publier la version actuelle" }).click();
await owner.getByText("Publication 2").first().waitFor({ timeout: 120000 });
out.v2EnLigne = (await legalText()).includes("VERSION 2");
await visitor.screenshot({ path: new URL("./preuves/s1-07-visiteur-v2.png", import.meta.url).pathname });
await owner.locator("[data-publications]").scrollIntoViewIfNeeded();
await shot(owner, "s1-08-studio-v2-en-ligne");
// Restauration de la publication 1.
await owner.locator('[data-publication="1"]').getByRole("button", { name: "Remettre en ligne" }).click();
await owner.waitForTimeout(1500);
const t = await legalText();
out.v1Restauree = t.includes("1 rue de l'Exemple") && !t.includes("VERSION 2");
await visitor.screenshot({ path: new URL("./preuves/s1-09-visiteur-v1-restauree.png", import.meta.url).pathname });
await owner.locator("[data-publications]").scrollIntoViewIfNeeded();
await shot(owner, "s1-10-studio-v1-restauree");
// Changement d'adresse : la nouvelle répond, l'ancienne plus.
await owner.locator('input[aria-label="Adresse du site"]').fill("cle-de-fa-lyon");
await owner.getByRole("button", { name: "Changer l'adresse" }).click();
await owner.waitForTimeout(1500);
out.nouvelleAdresse = (await visitor.goto("https://cle-de-fa-lyon.sites.recette.test:3943/")).status();
out.ancienneAdresse = (await visitor.goto(SITE + "/")).status();
await owner.locator("[data-site-address]").scrollIntoViewIfNeeded();
await shot(owner, "s1-11-adresse-changee");
// Domaine personnalisé fictif : instructions DNS puis vérification refusée (aucun DNS réel derrière).
await owner.locator('input[aria-label="Nom de domaine"]').fill("www.cle-de-fa.example");
await owner.locator("[data-site-publication]").getByRole("button", { name: "Ajouter", exact: true }).click();
await owner.locator('[data-custom-domain="www.cle-de-fa.example"]').waitFor();
await owner.locator('[data-custom-domain="www.cle-de-fa.example"]').getByRole("button", { name: "Vérifier" }).click();
await owner.waitForTimeout(3000);
await owner.locator('[data-custom-domain="www.cle-de-fa.example"]').scrollIntoViewIfNeeded();
await shot(owner, "s1-12-domaine-personnalise");
out.domaine = await owner.locator('[data-custom-domain="www.cle-de-fa.example"]').innerText();
// Compte étranger : ni la gestion de la publication ni le projet.
const stranger = await (await context(b)).newPage();
await login(stranger, "etranger@recette.invalid");
const api = await stranger.evaluate(async (pid) => { const r = await fetch(`/api/projects/${pid}/site-publication`); return { status: r.status, body: (await r.text()).slice(0, 200) }; }, ids.artisan);
const post = await stranger.evaluate(async (pid) => { const r = await fetch(`/api/projects/${pid}/site-publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unpublish" }) }); return r.status; }, ids.artisan);
out.compteEtranger = { lecture: api, retrait: post };
await open(stranger, `${STUDIO}/studio/${ids.artisan}/boutique`);
await stranger.waitForTimeout(2000);
await shot(stranger, "s1-13-compte-etranger");
out.siteToujoursEnLigne = (await visitor.goto("https://cle-de-fa-lyon.sites.recette.test:3943/")).status();
out.erreursStudio = log;
save("s1-versions", out);
console.log(JSON.stringify(out, null, 1));
await b.close();
