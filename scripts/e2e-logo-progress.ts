/**
 * Parcours navigateur COMPLET du panneau Logo avec des fournisseurs SIMULÉS (aucun appel payant) : vrai site, vrai
 * worker, vraies tâches de fond, OpenAI et Anthropic remplacés par scripts/fake-ai-server.mjs.
 *  1. modèle des logos = GPT Image 2 (comme le projet réel) : « Créer les directions » → devis → étapes visibles →
 *     propositions validées ET écartée (avec image originale) ; aucune demande de fond transparent à GPT Image 2 ;
 *  2. rechargement de la page : tout est toujours affiché ;
 *  3. fournisseur qui refuse les images : chaque direction en échec avec la raison, rien ne disparaît.
 *
 *   node scripts/fake-ai-server.mjs &                                    (port 3999)
 *   (site + worker) DATA_DIR=/tmp/lp OPENAI_BASE_URL=http://localhost:3999/v1 ANTHROPIC_BASE_URL=http://localhost:3999 \
 *     OPENAI_API_KEY=sk-fake-local ANTHROPIC_API_KEY=sk-ant-fake-local npx next start -p 3080  &  npx tsx worker/index.ts
 *   DATA_DIR=/tmp/lp BASE=http://localhost:3080 FAKE=http://localhost:3999 npx tsx scripts/e2e-logo-progress.ts
 * Ne jamais lancer sur la base de production.
 */
import fs from "node:fs";
import { chromium, type Page } from "playwright";
import { one, run } from "@/lib/db";
import { createUser } from "@/lib/auth";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { runWithLang } from "@/lib/i18n-server";
import { getJsonSetting, setJsonSetting, setSetting } from "@/lib/settings";
import { seedLogoFixture } from "../tests/logo-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const BASE = process.env.BASE ?? "http://localhost:3080";
const FAKE = process.env.FAKE ?? "http://localhost:3999";
const OUT = "reports/screenshots/logo-progress";
fs.mkdirSync(OUT, { recursive: true });

// Compte client avec forfait, projet de démonstration, GPT Image 2 tarifé et confirmé pour « Logos » (tarif fictif local).
const PASSWORD = "motdepasse-e2e-logo";
const email = `e2e-logo-${Date.now()}@demo.fr`;
const u = await createUser(email, PASSWORD, "Démo");
run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
getSubscription(u.id);
run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
syncAllowance(u.id);
setSetting("ai.prices.checkedAt", String(Date.now()));
setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), "openai:gpt-image-2": { unit: "image", perImage: 0.2 } });
setJsonSetting("ai.media.models", { ...getJsonSetting<Record<string, unknown>>("ai.media.models", {}), "openai:gpt-image-2": { confirmedAt: Date.now(), enabled: true } });
setJsonSetting("ai.media.usage", { ...getJsonSetting<Record<string, unknown>>("ai.media.usage", {}), logo: { primary: "openai:gpt-image-2" } });
const pid = runWithLang({ ui: "fr", content: "fr" }, () => seedLogoFixture(u.id, "artisan"));

const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, detail = "") => (results.push([name, ok, detail]), console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`));
const errors: string[] = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "fr-FR" });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("ecsSeen", "1");
    for (const t of ["pilote", "produit", "boutique", "site", "marque", "visuels", "images", "publicites", "calendrier", "videos", "blog"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
  } catch {}
});
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const dialogs: string[] = [];
page.on("dialog", (d) => (dialogs.push(d.message()), d.accept()));
await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", PASSWORD);
await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);

const panel = (p: Page) => p.locator("#logo-style").locator("xpath=ancestor::div[contains(@class,'p-5')][1]");
const fakeStats = async () => (await fetch(`${FAKE}/stats`)).json() as Promise<{ images: number; messages: number; imageBodies: { model: string; background: string | null }[] }>;
const lastJob = () => one<{ id: string; status: string; error: string | null }>("SELECT id, status, error FROM jobs WHERE project_id = ? AND type = 'brand.logo.v2' ORDER BY created_at DESC, rowid DESC LIMIT 1", pid);
async function waitJob(timeoutMs = 180_000) {
  const t0 = Date.now();
  for (;;) {
    const j = lastJob();
    if (j && ["done", "failed", "cancelled"].includes(j.status)) return j;
    if (Date.now() - t0 > timeoutMs) return j;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ---- 1. Série réussie (GPT Image 2) : devis, étapes, propositions validées et écartée
await page.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle" });
await page.waitForSelector("#logo-style");
await page.click("text=Créer les directions");
await page.waitForSelector("[data-testid=logo-series-progress]", { timeout: 30_000 });
check("Le devis est affiché avant tout appel payant", dialogs.some((d) => /Devis : .* au maximum/.test(d)), dialogs[0]?.slice(0, 140));
await page.waitForTimeout(1500);
await panel(page).screenshot({ path: `${OUT}/1-en-cours.png` });
// Réception en flux visible direction par direction (« aperçu reçu », « image reçue et sauvegardée »).
const streamSeen = await page.waitForSelector("[data-progress]", { timeout: 60_000 }).then(() => true).catch(() => false);
check("Génération en flux visible en direct (aperçus, réception, sauvegarde)", streamSeen, streamSeen ? await page.locator("[data-progress]").first().innerText() : "");
if (streamSeen) await panel(page).screenshot({ path: `${OUT}/1b-flux-en-cours.png` });
const j1 = await waitJob();
check("La tâche se termine (worker)", j1?.status === "done", `${j1?.status}${j1?.error ? ` — ${j1.error}` : ""}`);
await page.waitForTimeout(6500); // une interrogation du panneau (toutes les 5 s)
const text1 = await page.locator("main").innerText();
check("Étapes affichées : brief, génération OpenAI, réception et sauvegarde, contrôle qualité, résultat", /Brief et directions/.test(text1) && /Génération OpenAI/.test(text1) && /Réception et sauvegarde/.test(text1) && /Contrôle qualité/.test(text1) && /Résultat/.test(text1));
const states1 = await page.locator("[data-step]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-step")}:${e.getAttribute("data-state")}`));
check("Série réussie : les 5 étapes cochées", states1.join(",") === "prepare:done,images:done,receive:done,review:done,result:done", states1.join(","));
check("Propositions validées visibles", (await page.locator("text=Choisir ce logo").count()) >= 2, `${await page.locator("text=Choisir ce logo").count()} bouton(s)`);
check("Proposition écartée visible avec son image originale", /Logos complets écartés par le contrôle/.test(text1) && (await page.locator("img[alt='Signe épuré']").count()) > 0);
const s1 = await fakeStats();
check("GPT Image 2 : aucune demande de fond transparent", s1.imageBodies.length > 0 && s1.imageBodies.every((b) => b.model === "gpt-image-2" && b.background === null), JSON.stringify(s1.imageBodies.slice(0, 1)));
check("Demandes en flux avec 2 aperçus (méthode de l'essai réel)", s1.imageBodies.every((b: any) => b.stream === true && b.partials === 2));
check("3 images demandées (une par direction), aucune relance", s1.images === 3, `${s1.images} image(s)`);
await panel(page).screenshot({ path: `${OUT}/2-resultat.png` });

// ---- 2. Rechargement : tout reste affiché
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#logo-style");
await page.waitForTimeout(1500);
const text2 = await page.locator("main").innerText();
check("Après rechargement : propositions, essai écarté et étapes toujours affichés", (await page.locator("text=Choisir ce logo").count()) >= 2 && /Logos complets écartés/.test(text2) && /Contrôle qualité/.test(text2));
await panel(page).screenshot({ path: `${OUT}/3-apres-rechargement.png` });

// ---- 3. Fournisseur qui refuse les images : échec visible direction par direction, rien ne disparaît
await fetch(`${FAKE}/mode`, { method: "POST", body: JSON.stringify({ mode: "refuse" }), headers: { "content-type": "application/json" } });
await page.click("text=Nouvelles directions");
await page.waitForTimeout(2000);
const j3 = await waitJob();
await page.waitForTimeout(6500);
const text3 = await page.locator("main").innerText();
check("Refus du fournisseur : chaque direction en échec avec la vraie raison", /Directions sans image/.test(text3) && /Requête refusée par OpenAI/.test(text3) && !/Aucun fournisseur d'images configuré/.test(text3), `tâche ${j3?.status}`);
check("Refus : message clair à la place des propositions", /Aucune proposition : les images n'ont pas pu être produites/.test(text3));
const states3 = await page.locator("[data-step]").evaluateAll((els) => els.map((e) => `${e.getAttribute("data-step")}:${e.getAttribute("data-state")}`));
check("Refus : l'étape « Génération OpenAI » est en échec (jamais cochée en vert)", states3.includes("images:failed") && states3.includes("result:failed"), states3.join(","));
await panel(page).screenshot({ path: `${OUT}/4-refus-fournisseur.png` });
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#logo-style");
await page.waitForTimeout(1500);
check("Refus : toujours affiché après rechargement", /Directions sans image/.test(await page.locator("main").innerText()));

// ---- 4. Tâche qui échoue (erreur hors du moteur) : erreur affichée, jamais une barre qui disparaît
run("UPDATE jobs SET status = 'failed', error = ?, message = ? WHERE id = ?", "Délai dépassé : le worker a été arrêté pendant la tâche.", "Échec", lastJob()!.id);
run("UPDATE memory SET value = json_set(value, '$.stage', 'failed', '$.error', 'Délai dépassé : le worker a été arrêté pendant la tâche.') WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_live'", pid);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#logo-style");
await page.waitForTimeout(1500);
const text4 = await page.locator("main").innerText();
check("Tâche échouée : erreur compréhensible affichée", /La création des logos a échoué/.test(text4) && /Délai dépassé/.test(text4));
await panel(page).screenshot({ path: `${OUT}/5-tache-echouee.png` });

// ---- 5. Choix du VRAI logo OpenAI (série 1) → identité complète visible dans l'onglet Marque
const realAsset = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2' AND json_extract(meta, '$.run') = ? ORDER BY created_at LIMIT 1", pid, j1!.id);
const chosen = realAsset ? await page.evaluate(async ([p, a]) => (await fetch(`/api/projects/${p}/brand/logo-v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "choose", assetId: a }) })).status, [pid, realAsset.id] as const) : 0;
const jc = await (async () => {
  const t0 = Date.now();
  for (;;) {
    const j = one<{ status: string; error: string | null }>("SELECT status, error FROM jobs WHERE project_id = ? AND type = 'brand.logo.v2.choose' ORDER BY created_at DESC LIMIT 1", pid);
    if ((j && ["done", "failed"].includes(j.status)) || Date.now() - t0 > 120_000) return j;
    await new Promise((r) => setTimeout(r, 1000));
  }
})();
check("Choix du logo : déclinaisons et planche créées (tâche terminée)", chosen === 200 && jc?.status === "done", `${chosen} ${jc?.status ?? ""} ${jc?.error ?? ""}`);
await page.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
check("Onglet Marque : planche d'identité, symbole seul et exports WebP visibles", (await page.locator("[data-testid=brand-board] img").count()) === 1 && (await page.locator("img[alt='Symbole seul']").count()) > 0 && /logo-principal\.webp/.test(await page.locator("main").innerText()));
const board = page.locator("[data-testid=brand-board]").locator("xpath=ancestor::div[contains(@class,'p-5')][1]");
if (await board.count()) await board.screenshot({ path: `${OUT}/6-identite-marque.png` });

const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", storageState: await ctx.storageState() });
const pp = await phone.newPage();
await pp.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle" });
await pp.waitForTimeout(1500);
check("Téléphone : pas de débordement horizontal", (await pp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 2).join(" | "));
await browser.close();
const ok = results.filter((r) => r[1]).length;
console.log(`${ok}/${results.length} vérifications réussies`);
process.exit(ok === results.length ? 0 : 1);
