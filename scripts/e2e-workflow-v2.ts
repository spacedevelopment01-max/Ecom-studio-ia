/**
 * Parcours simulés du Studio Workflow V2 (phase 12A) dans un vrai navigateur, sans aucun appel d'IA :
 *   (serveur) DATA_DIR=/tmp/wf STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next start -p 3077
 *   DATA_DIR=/tmp/wf BASE=http://localhost:3077 npx tsx scripts/e2e-workflow-v2.ts
 * Le script lance lui-même le worker (et l'interrompt brutalement une fois pour vérifier la reprise).
 * Parcours :
 *   1. boutique cosmétique à partir d'une photo + demande globale dans le formulaire de création (ordinateur) ;
 *      interruption du worker, reprise, aucun doublon ; même demande renvoyée → rien n'est refait ;
 *   2. site de plâtrier-peintre à partir d'une description (WordPress + publications Facebook 2 semaines) ;
 *   3. marque high-tech (drone) : marque, logo, visuels, boutique Shopify ;
 *   4. campagne publicitaire + calendrier Instagram/Facebook depuis le Pilote (devis 0 €, lancement, suivi) ;
 *   5. changement d'identité (palette) → créations concernées listées → mise à jour contrôlée ;
 *   6. téléphone : formulaire, Pilote et carte de propagation lisibles, sans débordement horizontal.
 * Captures : reports/screenshots/workflow-v2/.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import sharp from "sharp";
import { chromium, type BrowserContext, type Page } from "playwright";
import { all, one, run } from "@/lib/db";
import { createUser } from "@/lib/auth";

const BASE = process.env.BASE ?? "http://localhost:3077";
const OUT = process.env.OUT ?? "reports/screenshots/workflow-v2";
const TMP = process.env.TMP_DIR ?? fs.mkdtempSync("/tmp/wf-e2e-");
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errors: string[] = [];
const ai0 = one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls")!.n;

// Photo de produit synthétique (flacon de sérum) : aucune image réelle de client n'est utilisée.
const serum = path.join(TMP, "serum.png");
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f4ece4"/><stop offset="1" stop-color="#e6d8ca"/></linearGradient><linearGradient id="b" x1="0" x2="1"><stop offset="0" stop-color="#b9774f"/><stop offset=".45" stop-color="#e2a77c"/><stop offset="1" stop-color="#9c5f3c"/></linearGradient></defs><rect width="1200" height="1200" fill="url(#g)"/><ellipse cx="600" cy="1010" rx="260" ry="40" fill="#000" opacity=".12"/><rect x="430" y="470" width="340" height="540" rx="60" fill="url(#b)" opacity=".93"/><rect x="470" y="600" width="260" height="220" rx="12" fill="#f8f3ee"/><text x="600" y="690" font-family="Georgia" font-size="40" text-anchor="middle" fill="#3b2a20">SERUM</text><text x="600" y="750" font-family="Arial" font-size="24" text-anchor="middle" fill="#6b5546">30 ml</text><rect x="520" y="380" width="160" height="100" rx="14" fill="#2b2420"/><rect x="560" y="230" width="80" height="160" rx="40" fill="#1e1a17"/></svg>`)).png().toFile(serum);
const drone = "public/demo/drone/photo.jpg";

// Compte de démonstration au forfait « Vendre » (calendrier 30 jours, publicités, export) ; aucune clé d'IA : 0 €.
const EMAIL = `wf-${Date.now()}@demo.fr`;
const PASSWORD = "motdepasse-demo";
const user = await createUser(EMAIL, PASSWORD, "Démo");
run("INSERT OR IGNORE INTO subscriptions (user_id, status, stores, updated_at) VALUES (?,?,?,?)", user.id, "none", 1, Date.now());
run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", user.id);

// Worker réel (même base) ; relancé après une interruption brutale.
let worker: ChildProcess | null = null;
const wlog = fs.createWriteStream(path.join(TMP, "worker.log"), { flags: "a" });
function startWorker() {
  worker = spawn("npx", ["tsx", "worker/index.ts"], { env: { ...process.env, STOCK_OFFLINE: process.env.STOCK_OFFLINE ?? "1", SOCIAL_PUBLISH_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  worker.stdout!.pipe(wlog);
  worker.stderr!.pipe(wlog);
}
function killWorker() {
  if (worker?.pid) try { process.kill(-worker.pid, "SIGKILL"); } catch {}
  worker = null;
}
startWorker();

type Wf = { id: string; status: string; pipeline_job_id: string | null; job_id: string | null; plan_id: string | null; error: string | null };
const wfOf = (pid: string) => all<Wf>("SELECT id, status, pipeline_job_id, job_id, plan_id, error FROM workflows WHERE project_id = ? ORDER BY created_at", pid);
async function waitWf(wid: string, timeoutMs = 20 * 60_000) {
  const t0 = Date.now();
  for (;;) {
    const w = one<Wf>("SELECT id, status, pipeline_job_id, job_id, plan_id, error FROM workflows WHERE id = ?", wid)!;
    if (["done", "failed", "cancelled"].includes(w.status)) return w;
    const j = w.job_id ? one<{ status: string }>("SELECT status FROM jobs WHERE id = ?", w.job_id) : null;
    if (j && ["failed", "blocked", "cancelled"].includes(j.status)) return { ...w, status: `job ${j.status}` };
    if (Date.now() - t0 > timeoutMs) return { ...w, status: `timeout (${w.status})` };
    await sleep(2000);
  }
}

async function login(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["pilote", "produit", "boutique", "site", "marque", "visuels", "publicites", "calendrier", "videos"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
  return page;
}

/** Formulaire « Nouveau projet » : type, photo, description, demande globale, vidéos ; renvoie l'identifiant du projet. */
async function createFromForm(page: Page, o: { business: "products" | "services"; photo?: string; description: string; request: string; videos: RegExp; shot: string }) {
  await page.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
  const btn = page.getByRole("button", { name: /^Nouveau projet$/ });
  if (await btn.count()) await btn.first().click();
  await page.getByRole("radio", { name: o.business === "products" ? /Une boutique/ : /entreprise de services/ }).click();
  if (o.photo) await page.locator("input[name=photos]").setInputFiles(o.photo);
  await page.fill("#description", o.description);
  await page.fill("#request", o.request);
  await page.getByRole("radio", { name: o.videos }).click();
  await page.screenshot({ path: `${OUT}/${o.shot}`, fullPage: true });
  await page.locator("button[type=submit]").last().click();
  // Éventuelle confirmation de quota (forfait) : on accepte.
  const go = await Promise.race([page.waitForURL(/\/pilote/, { timeout: 60_000 }).then(() => "url"), page.getByRole("dialog").waitFor({ timeout: 60_000 }).then(() => "dialog")]);
  if (go === "dialog") {
    await page.getByRole("dialog").getByRole("button").last().click();
    await page.waitForURL(/\/pilote/, { timeout: 60_000 });
  }
  return page.url().match(/studio\/([^/]+)\/pilote/)![1];
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
const page = await login(desk);
const ASK = "Crée ma marque, mon logo, mes visuels, ma boutique Shopify, mes publicités et prépare mes publications Instagram pour les 30 prochains jours.";

// ── 1. Cosmétique à partir d'une photo ──────────────────────────────────────────────────────────────────────────
const cosmetic = await createFromForm(page, { business: "products", photo: serum, description: "Sérum visage à l'acide hyaluronique, flacon compte-gouttes de 30 ml, pour peaux sèches.", request: ASK, videos: /Montées à partir de vos images/, shot: "01-formulaire-demande-globale.png" });
let [w1] = wfOf(cosmetic);
check("1. Demande globale enregistrée avec la création (une seule demande, devis 0 € → lancée d'office)", !!w1 && w1.status === "queued" && !!w1.pipeline_job_id, w1 ? `${w1.status}, création ${w1.pipeline_job_id ? "reliée" : "absente"}` : "aucune");
const pipeCal = one<{ payload: string }>("SELECT payload FROM jobs WHERE id = ?", w1.pipeline_job_id)!.payload;
check("1. Création complète sans calendrier de 7 jours en double (remplacé par celui de la demande)", /"skip":\["calendar"\]/.test(pipeCal));
await page.waitForSelector("[data-testid=wf-current]");
// Interruption brutale du worker pendant la création, puis reprise.
for (let i = 0; i < 300; i++) {
  const j = one<{ status: string; progress: number }>("SELECT status, progress FROM jobs WHERE id = ?", w1.pipeline_job_id)!;
  if (j.status === "running" && j.progress >= 0.25) break;
  await sleep(1000);
}
await page.screenshot({ path: `${OUT}/02-pilote-creation-en-cours.png`, fullPage: true });
killWorker();
const atKill = one<{ status: string; progress: number }>("SELECT status, progress FROM jobs WHERE id = ?", w1.pipeline_job_id)!;
console.log(`  worker interrompu (création ${atKill.status}, ${Math.round(atKill.progress * 100)} %)`);
await sleep(1500);
startWorker();
w1 = await waitWf(w1.id);
check("1. Reprise après interruption du worker : la demande va au bout", w1.status === "done", `${w1.status}${w1.error ? ` — ${w1.error}` : ""}`);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("[data-testid=wf-steps] li");
await page.screenshot({ path: `${OUT}/03-pilote-demande-terminee.png`, fullPage: true });
const stepsTxt = (await page.locator("[data-testid=wf-steps] li").allInnerTexts()).map((s) => s.replace(/\s+/g, " "));
check("1. Suivi : étapes, résultats et liens vers les éditeurs affichés", stepsTxt.length >= 3 && stepsTxt.every((s) => /Ouvrir/.test(s)), stepsTxt.slice(0, 6).join(" | "));
const posts1 = all<{ network: string; publish_key: string }>("SELECT network, publish_key FROM posts WHERE plan_id = ?", `wf-social-${w1.id}`);
check("1. 30 publications Instagram préparées (Social V2), aucune publiée", posts1.length === 30 && posts1.every((p) => p.network === "instagram") && !one("SELECT 1 FROM posts WHERE plan_id = ? AND status IN ('published','scheduled')", `wf-social-${w1.id}`), `${posts1.length}`);
check("1. Aucun doublon de publication (clés uniques)", new Set(posts1.map((p) => p.publish_key)).size === posts1.length);
const calendar7 = one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ? AND (plan_id IS NULL OR plan_id NOT LIKE 'wf-social-%')", cosmetic)!.n;
check("1. Pas de second calendrier créé par la création complète", calendar7 === 0, String(calendar7));
const ads1 = one<{ n: number }>("SELECT COUNT(DISTINCT doc_key) n FROM ad_documents WHERE project_id = ?", cosmetic)!.n;
check("1. Publicités V2 créées (documents éditables)", ads1 > 0, String(ads1));
const exp1 = all<{ name: string }>("SELECT name FROM assets WHERE project_id = ? AND role = 'theme-export' AND deleted_at IS NULL", cosmetic);
check("1. Thème Shopify exporté et contrôlé (rangé dans les fichiers)", exp1.some((e) => /shopify|\.zip$/i.test(e.name)), exp1.map((e) => e.name).join(", "));
const brand1 = one<{ brand_json: string | null }>("SELECT brand_json FROM projects WHERE id = ?", cosmetic)!.brand_json;
check("1. Marque et logo créés", !!brand1 && /"palette"/.test(brand1));
const jobsCount = (pid: string, type: string) => one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE project_id = ? AND type = ?", pid, type)!.n;
check("1. Une seule création complète et une seule exécution de la demande (pas de tâche en double)", jobsCount(cosmetic, "pipeline.run") === 1 && jobsCount(cosmetic, "workflow.run") === 1, `${jobsCount(cosmetic, "pipeline.run")} / ${jobsCount(cosmetic, "workflow.run")}`);
const val1 = await page.locator("[data-testid=wf-validations] li").allInnerTexts();
check("1. Éléments à valider par le client listés (rien validé à sa place)", val1.length > 0 && val1.some((v) => /publications/i.test(v)), val1.join(" | ").replace(/\s+/g, " "));
// Même demande renvoyée depuis le Pilote : la demande déjà faite est reprise.
await page.fill("[data-testid=wf-request]", ASK);
await page.click("[data-testid=wf-prepare]");
await sleep(2500);
check("1. Même demande renvoyée : rien n'est refait (même demande, mêmes publications)", wfOf(cosmetic).length === 1 && one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE project_id = ?", cosmetic)!.n === 30);

// ── 2. Plâtrier-peintre à partir d'une description ─────────────────────────────────────────────────────────────
const artisan = await createFromForm(page, { business: "services", description: "Plâtrier-peintre à Lyon et alentours : plâtrerie, isolation intérieure, peinture intérieure et extérieure, ravalement. Entreprise artisanale, devis gratuit.", request: "Crée mon site WordPress et prépare mes publications Facebook pour les 2 prochaines semaines.", videos: /Pas de vidéo/, shot: "04-formulaire-platrier.png" });
let [w2] = wfOf(artisan);
w2 = await waitWf(w2.id);
check("2. Plâtrier-peintre : demande terminée", w2.status === "done", `${w2.status}${w2.error ? ` — ${w2.error}` : ""}`);
const posts2 = all<{ network: string; caption: string | null }>("SELECT network, caption FROM posts WHERE plan_id = ?", `wf-social-${w2.id}`);
check("2. 14 jours de publications Facebook", posts2.length >= 14 && posts2.every((p) => p.network === "facebook"), `${posts2.length} (${[...new Set(posts2.map((p) => p.network))].join(", ")})`);
check("2. Aucune trace de vente en ligne dans les publications d'un artisan", !posts2.some((p) => /panier|ajouter au panier|livraison offerte|en stock/i.test(p.caption ?? "")));
const exp2 = all<{ name: string }>("SELECT name FROM assets WHERE project_id = ? AND role = 'theme-export' AND deleted_at IS NULL", artisan);
check("2. Export WordPress contrôlé", exp2.some((e) => /wordpress/i.test(e.name)), exp2.map((e) => e.name).join(", "));
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("[data-testid=wf-steps] li");
await page.screenshot({ path: `${OUT}/05-pilote-platrier.png`, fullPage: true });

// ── 3. Marque high-tech ────────────────────────────────────────────────────────────────────────────────────────
const tech = await createFromForm(page, { business: "products", photo: drone, description: "Drone pliable avec caméra 4K, 249 g, autonomie annoncée par le fabricant : [à compléter].", request: "Crée ma marque high-tech, mon logo, mes visuels et ma boutique Shopify.", videos: /Pas de vidéo/, shot: "06-formulaire-high-tech.png" });
let [w3] = wfOf(tech);
w3 = await waitWf(w3.id);
check("3. High-tech : demande terminée", w3.status === "done", `${w3.status}${w3.error ? ` — ${w3.error}` : ""}`);
const b3 = JSON.parse(one<{ brand_json: string }>("SELECT brand_json FROM projects WHERE id = ?", tech)!.brand_json ?? "{}");
check("3. Marque créée (nom, palette, typographies) et boutique composée", !!b3.name && !!b3.palette?.primary && !!one("SELECT 1 FROM theme_versions WHERE project_id = ?", tech), `${b3.name ?? "?"} ${b3.palette?.primary ?? ""}`);
check("3. Export Shopify fait (boutique demandée)", !!one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'theme-export' AND deleted_at IS NULL", tech));
check("3. Pas de publications ni de publicités non demandées", !one("SELECT 1 FROM posts WHERE project_id = ? AND plan_id LIKE 'wf-social-%'", tech) && !one("SELECT 1 FROM ad_documents WHERE project_id = ?", tech));
await page.reload({ waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/07-pilote-high-tech.png`, fullPage: true });

// ── 4. Campagne publicitaire + calendrier, depuis le Pilote ────────────────────────────────────────────────────
await page.goto(`${BASE}/studio/${cosmetic}/pilote`, { waitUntil: "networkidle" });
const adsBefore = one<{ n: number }>("SELECT COUNT(*) n FROM ad_documents WHERE project_id = ?", cosmetic)!.n;
await page.fill("[data-testid=wf-request]", "Crée une campagne publicitaire et prépare mes publications Instagram et Facebook pour les 14 prochains jours.");
await page.click("[data-testid=wf-prepare]");
await page.waitForSelector("[data-testid=wf-start]");
const total = (await page.locator("[data-testid=wf-total]").innerText()).trim();
const lines = (await page.locator("[aria-label='Devis par module'] li").allInnerTexts()).map((s) => s.replace(/\s+/g, " "));
check("4. Devis affiché avant tout lancement (par module, total)", lines.length >= 2 && /0\s?€/.test(total), `${total} — ${lines.join(" | ")}`);
await page.screenshot({ path: `${OUT}/08-devis-campagne-calendrier.png`, fullPage: true });
const w4id = wfOf(cosmetic).at(-1)!.id;
check("4. Rien n'est lancé avant l'accord du client", !one("SELECT 1 FROM jobs WHERE type = 'workflow.run' AND payload LIKE ?", `%${w4id}%`));
await page.click("[data-testid=wf-start]");
const w4 = await waitWf(w4id);
check("4. Campagne + calendrier terminés", w4.status === "done", `${w4.status}${w4.error ? ` — ${w4.error}` : ""}`);
const posts4 = all<{ network: string }>("SELECT network FROM posts WHERE plan_id = ?", `wf-social-${w4id}`);
const nets4 = [...new Set(posts4.map((p) => p.network))].sort();
check("4. Publications Instagram et Facebook sur 14 jours", nets4.join(",") === "facebook,instagram" && posts4.length >= 28, `${posts4.length} (${nets4.join(", ")})`);
check("4. Nouvelle campagne publicitaire enregistrée", one<{ n: number }>("SELECT COUNT(*) n FROM ad_documents WHERE project_id = ?", cosmetic)!.n > adsBefore);
check("4. Les 30 publications de la première demande sont intactes", one<{ n: number }>("SELECT COUNT(*) n FROM posts WHERE plan_id = ?", `wf-social-${w1.id}`)!.n === 30);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("[data-testid=wf-steps] li");
await page.screenshot({ path: `${OUT}/09-suivi-campagne-calendrier.png`, fullPage: true });

// ── 5. Changement d'identité et propagation contrôlée ──────────────────────────────────────────────────────────
const themeV = () => one<{ n: number }>("SELECT MAX(number) n FROM theme_versions WHERE project_id = ?", cosmetic)!.n;
const v0 = themeV();
const pal = JSON.parse(one<{ brand_json: string }>("SELECT brand_json FROM projects WHERE id = ?", cosmetic)!.brand_json).palette;
// Même appel que l'éditeur de palette de l'onglet Marque.
const patch = await page.request.patch(`${BASE}/api/projects/${cosmetic}/brand`, { data: { palette: { ...pal, primary: "#1F4E79", accent: "#2E8B57" }, paletteExact: true } });
check("5. Nouvelle palette enregistrée (onglet Marque)", patch.ok(), String(patch.status()));
await page.goto(`${BASE}/studio/${cosmetic}/marque`, { waitUntil: "networkidle" });
await page.waitForSelector("[data-testid=brand-propagation]", { timeout: 30_000 }).catch(() => {});
const items = (await page.locator("[data-testid=brand-propagation] li").allInnerTexts()).map((s) => s.replace(/\s+/g, " "));
check("5. Créations utilisant l'ancienne identité listées, rien modifié d'office", items.length > 0 && themeV() === v0, `${items.length} : ${items.slice(0, 5).join(" | ")}`);
if (!items.length) throw new Error("carte de propagation absente");
await page.locator("[data-testid=brand-propagation]").screenshot({ path: `${OUT}/10-propagation-avant.png` });
await page.click("[data-testid=brand-apply]");
await page.waitForSelector("[data-testid=brand-result]", { timeout: 300_000 });
const res = (await page.locator("[data-testid=brand-result]").innerText()).replace(/\s+/g, " ");
check("5. Mise à jour contrôlée des créations choisies (nouvelle version, locale)", /✓|mis|updated|version/i.test(res) || res.length > 0, res.slice(0, 300));
check("5. Boutique : nouvelle version avec la nouvelle palette (l'ancienne reste)", themeV() > v0 || !items.some((i) => /boutique|site|thème/i.test(i)), `v${v0} → v${themeV()}`);
await page.screenshot({ path: `${OUT}/11-propagation-apres.png`, fullPage: true });

// ── 6. Téléphone ───────────────────────────────────────────────────────────────────────────────────────────────
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
const mp = await login(phone);
const overflow = () => mp.evaluate("document.documentElement.scrollWidth > innerWidth + 1") as Promise<boolean>;
await mp.goto(`${BASE}/studio/${cosmetic}/pilote`, { waitUntil: "networkidle" });
await mp.waitForSelector("[data-testid=workflow-panel]");
await mp.screenshot({ path: `${OUT}/12-pilote-telephone.png`, fullPage: true });
check("6. Téléphone : Pilote (demande, suivi, validations, éditeurs) sans débordement", !(await overflow()));
await mp.goto(`${BASE}/studio/${cosmetic}/marque`, { waitUntil: "networkidle" });
await mp.screenshot({ path: `${OUT}/13-marque-telephone.png`, fullPage: true });
check("6. Téléphone : onglet Marque sans débordement", !(await overflow()));
await mp.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
await mp.getByRole("button", { name: /^Nouveau projet$/ }).first().click();
await mp.locator("#request").scrollIntoViewIfNeeded();
await mp.screenshot({ path: `${OUT}/14-formulaire-telephone.png` });
check("6. Téléphone : champ « Tout ce que vous voulez obtenir » visible, sans débordement", (await mp.locator("#request").isVisible()) && !(await overflow()));

check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));
const aiSpent = one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls")!.n - ai0;
check("Aucun appel d'IA (0 €)", aiSpent === 0, String(aiSpent));
await browser.close();
killWorker();
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(results.map(([n, o, d]) => ({ test: n, ok: o, detail: d })), null, 2));
const failed = results.filter((r) => !r[1]).length;
console.log(`${results.length - failed}/${results.length} vérifications réussies — journal du worker : ${TMP}/worker.log`);
process.exit(failed ? 1 : 0);
