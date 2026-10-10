/**
 * Test RÉEL des logos dans le VRAI studio (site + worker + base + stockage), piloté dans un navigateur comme un client :
 * Studio → projet Sébastien Blanc → Marque → « Créer les directions ».
 *   mode « devis »  : clique, lit le devis affiché par le studio, REFUSE (rien n'est envoyé) ;
 *   mode « lancer » : accepte le devis (appels payants réels), suit la série, vérifie l'affichage, rechargement compris,
 *                     et exporte les preuves (captures, originaux, demandes envoyées, traces des appels, coûts, contrôle) ;
 *   mode « choisir N » : choisit la proposition N (1, 2 ou 3) → identité complète, capture de la planche.
 *   DATA_DIR=<base de démonstration> BASE=http://localhost:3080 npx tsx scripts/real-logo-test-browser.ts devis|lancer|choisir 2
 * Ne jamais lancer sur la base de production.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { all, json, one } from "@/lib/db";
import { assetData, getAsset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { artworkPrompt } from "@/lib/logo-v2/artwork";
import { brandDiscovery } from "@/lib/logo-v2/discovery";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration).");
const [mode, arg] = process.argv.slice(2);
if (!["devis", "lancer", "choisir"].includes(mode)) throw new Error("Mode : devis | lancer | choisir N");
const BASE = process.env.BASE ?? "http://localhost:3080";
const EMAIL = "test-logo-reel@demo.fr";
const PASSWORD = process.env.TEST_PASSWORD || "motdepasse-test-logo";
const user = one<{ id: string }>("SELECT id FROM users WHERE email = ?", EMAIL)!;
const pid = one<{ id: string }>("SELECT id FROM projects WHERE user_id = ? ORDER BY created_at DESC", user.id)!.id;
const OUT = path.resolve("reports/logo-quality/studio-reel");
fs.mkdirSync(OUT, { recursive: true });
const log = (m: string) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "fr-FR" });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("ecsSeen", "1");
    for (const t of ["pilote", "produit", "boutique", "site", "marque", "visuels", "images", "publicites", "calendrier", "videos", "blog"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
  } catch {}
});
const page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const dialogs: string[] = [];
page.on("dialog", (d) => {
  dialogs.push(d.message());
  log(`Boîte de dialogue : ${d.message().slice(0, 300)}`);
  // Devis : refusé en mode « devis », accepté en mode « lancer » (accord explicite du propriétaire) et « choisir ».
  if (mode === "devis") void d.dismiss();
  else void d.accept();
});
await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
await page.fill("#email", EMAIL);
await page.fill("#password", PASSWORD);
await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
await page.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle" });
await page.waitForSelector("#logo-style");
const panel = () => page.locator("#logo-style").locator("xpath=ancestor::div[contains(@class,'p-5')][1]");
const jobs = () => all<{ id: string; type: string; status: string; error: string | null }>("SELECT id, type, status, error FROM jobs WHERE project_id = ? ORDER BY created_at", pid);

if (mode === "devis") {
  const before = jobs().length;
  await page.click("text=Créer les directions");
  await page.waitForTimeout(4000);
  const after = jobs().length;
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls WHERE project_id = ?", pid)!.n;
  console.log(JSON.stringify({ devis: dialogs, tachesCreees: after - before, appelsIA: calls }, null, 2));
  await browser.close();
  process.exit(0);
}

if (mode === "lancer") {
  const t0 = Date.now();
  await page.click("text=Créer les directions");
  await page.waitForSelector("[data-testid=logo-series-progress]", { timeout: 60_000 });
  let shot = 0;
  const job = () => one<{ id: string; status: string; error: string | null; message: string }>("SELECT id, status, error, message FROM jobs WHERE project_id = ? AND type = 'brand.logo.v2' ORDER BY created_at DESC LIMIT 1", pid);
  for (;;) {
    const j = job();
    if (j && ["done", "failed", "cancelled"].includes(j.status)) break;
    if (Date.now() - t0 > 25 * 60_000) throw new Error("Série trop longue (25 min) : arrêt de la surveillance, la tâche continue côté worker.");
    if (Date.now() - t0 > shot * 60_000) {
      await panel().screenshot({ path: `${OUT}/en-cours-${shot}.png` }).catch(() => {});
      log(`${j?.status ?? "?"} — ${j?.message ?? ""}`);
      shot++;
    }
    await page.waitForTimeout(5000);
  }
  const j = job()!;
  log(`Tâche ${j.status}${j.error ? ` — ${j.error}` : ""} en ${Math.round((Date.now() - t0) / 1000)} s`);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await panel().screenshot({ path: `${OUT}/resultat-apres-rechargement.png` });
  // Preuves : originaux, demandes envoyées (même code, même direction, même marque), contrôle, coûts, traces.
  const brief = runWithLang({ ui: "fr", content: "fr" }, () => brandDiscovery(loadProject(pid)));
  const rows = all<{ id: string; role: string; meta: string }>("SELECT id, role, meta FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-trial','logo-v2-studio') AND json_extract(meta, '$.run') = ? ORDER BY created_at", pid, j.id);
  const items = rows.map((a, i) => {
    const m = json<any>(a.meta, {});
    const orig = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND source_asset_id = ?", pid, a.id);
    const file = `${i + 1}-original.png`;
    if (orig) fs.writeFileSync(path.join(OUT, file), assetData(getAsset(orig.id)!));
    return { n: i + 1, assetId: a.id, role: a.role, file: orig ? file : null, direction: m.territory?.name, style: m.territory?.style, concept: m.territory?.concept, imageBrief: m.territory?.imageBrief ?? null, colors: m.territory?.colors ?? null, provider: m.artwork?.provider, costEur: typeof m.artwork?.costMicro === "number" ? m.artwork.costMicro / 1e6 : null, verdict: m.gate?.verdict, score: m.gate?.score, reason: m.gate?.reason, codes: m.gate?.codes, criteria: m.artwork?.criteria, issues: m.artwork?.issues, fix: m.artwork?.fix, prompt: m.territory ? runWithLang({ ui: "fr", content: "fr" }, () => artworkPrompt(m.territory, brief)) : null };
  });
  const calls = all<any>("SELECT task, provider, served_model, requested_model, status, input_tokens, output_tokens, cost, latency_ms, estimated, error_kind, created_at FROM ai_calls WHERE job_id = ? ORDER BY created_at", j.id);
  const reservations = all<any>("SELECT status, provider, model, amount, actual FROM ai_reservations WHERE user_id = ? ORDER BY created_at", user.id);
  const cardImgs = await page.locator("main img[alt]").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src).filter((u) => /\/api\/files\//.test(u)));
  const proof = { jobId: j.id, status: j.status, error: j.error, durationS: Math.round((Date.now() - t0) / 1000), devis: dialogs, cartesImagesDistinctes: new Set(cardImgs).size, erreursJS: errors, items, calls, reservations, totalCoutFournisseurEur: calls.reduce((s: number, c: any) => s + (c.cost ?? 0), 0) / 1e6 };
  fs.writeFileSync(path.join(OUT, "preuves.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ ...proof, items: items.map(({ prompt, imageBrief, ...x }) => x), calls: calls.map((c: any) => `${c.task} ${c.provider}:${c.served_model ?? c.requested_model} ${c.status} ${c.cost / 1e6} €`) }, null, 2));
  await browser.close();
  process.exit(0);
}

// mode « choisir N »
const n = Number(arg ?? "1");
const buttons = page.locator("text=/^(Choisir ce logo|Choisir quand même)$/");
const count = await buttons.count();
if (n < 1 || n > count) throw new Error(`Proposition ${n} introuvable (${count} bouton(s) de choix).`);
await buttons.nth(n - 1).click();
const t0 = Date.now();
for (;;) {
  const j = one<{ status: string; error: string | null }>("SELECT status, error FROM jobs WHERE project_id = ? AND type = 'brand.logo.v2.choose' ORDER BY created_at DESC LIMIT 1", pid);
  if (j && ["done", "failed"].includes(j.status)) {
    log(`Choix : ${j.status}${j.error ? ` — ${j.error}` : ""}`);
    break;
  }
  if (Date.now() - t0 > 180_000) throw new Error("Choix trop long.");
  await page.waitForTimeout(2000);
}
await page.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
const card = page.locator("[data-testid=brand-board]").locator("xpath=ancestor::div[contains(@class,'p-5')][1]");
await card.screenshot({ path: `${OUT}/identite-onglet-marque.png` }).catch(() => {});
const board = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'brand-board' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", pid);
if (board) fs.writeFileSync(path.join(OUT, "planche-identite.png"), assetData(getAsset(board.id)!));
const roles = all<{ role: string; name: string }>("SELECT role, name FROM assets WHERE project_id = ? AND deleted_at IS NULL AND role IN ('logo','logo-webp','logo-light','logo-light-webp','logo-mono','logo-white','logo-mark','logo-mark-webp','logo-mark-svg','logo-svg','favicon','brand-board','brand-guide','brand-book')", pid);
const b = loadProject(pid).brand!;
console.log(JSON.stringify({ palette: b.palette, fonts: b.fonts, logo: { status: b.logo.status, proposalId: b.logo.proposalId }, fichiers: roles.map((r) => `${r.role}: ${r.name}`), erreursJS: errors }, null, 2));
await browser.close();
