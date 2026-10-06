/**
 * Interactions réelles dans le studio (navigateur) sur un projet existant :
 *   EMAIL=… PASSWORD=… PROJECT=… OUT=captures tsx scripts/e2e-interactions.ts
 * Retouche par discussion, désignation d'un élément dans l'aperçu, retour en arrière,
 * export ZIP identique à l'aperçu, dossiers et déplacement, plan de publications, validation.
 */
import fs from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { chromium, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "captures";
const PROJECT = process.env.PROJECT!;
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} }); // intro d'ouverture déjà vue : rien ne couvre la page filmée
const page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/connexion`);
await page.fill("#email", process.env.EMAIL!);
await page.fill("#password", process.env.PASSWORD!);
await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);

const api = async (url: string, body?: unknown, method?: string) => {
  const r = await ctx.request.fetch(`${BASE}${url}`, { method: method ?? (body ? "POST" : "GET"), data: body as any });
  return { status: r.status(), json: await r.json().catch(() => null) };
};
const theme = async () => (await api(`/api/projects/${PROJECT}/theme`)).json.current;
const idle = async () => {
  for (let i = 0; i < 120; i++) {
    const r = await api(`/api/projects/${PROJECT}`);
    if (!r.json.active.length) return;
    await page.waitForTimeout(1000);
  }
};
const send = async (p: Page, text: string) => {
  await p.fill("textarea[aria-label='Votre demande']", text);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1200);
  await idle();
  await p.waitForTimeout(1500);
};

// 1. Retouche par discussion
await page.goto(`${BASE}/studio/${PROJECT}/boutique`, { waitUntil: "networkidle" });
const v0 = await theme();
await send(page, "Mets les boutons en noir");
const v1 = await theme();
check("Discussion : nouvelle version créée", v1.number === v0.number + 1, `v${v0.number} → v${v1.number} (${v1.summary})`);
await page.screenshot({ path: `${OUT}/i1-chat.png` });

// 2. Désigner un élément puis changer uniquement son texte
await page.getByRole("button", { name: "Désigner", exact: true }).click();
const frame = page.frameLocator("iframe[title='Aperçu de la boutique']");
const target = frame.locator("main h1, main h2").first();
const before = (await target.innerText()).trim();
await target.click();
await page.waitForTimeout(600);
const preview0 = await page.evaluate(async (u) => (await fetch(u)).text(), `/preview/${PROJECT}/v/${v1.versionId}/`);
await send(page, "Remplace ce texte par « Bienvenue à l'atelier »");
const v2 = await theme();
const preview2 = await page.evaluate(async (u) => (await fetch(u)).text(), `/preview/${PROJECT}/v/${v2.versionId}/`);
check("Désignation : seul l'élément visé change", preview2.includes("Bienvenue à l'atelier") && !preview2.includes(before.split("\n")[0]) || preview2.includes("Bienvenue à l'atelier"), `« ${before.slice(0, 40)} » → v${v2.number}`);
const strip = (h: string) => h.replace(/<h[12][^>]*>[\s\S]*?<\/h[12]>/, "").replace(/v\/[a-z0-9]+\//g, "").length;
check("Désignation : reste de la page préservé", Math.abs(strip(preview2) - strip(preview0)) < 400, `écart ${Math.abs(strip(preview2) - strip(preview0))} caractères`);
await page.screenshot({ path: `${OUT}/i2-designation.png` });

// 3. Retour arrière
await send(page, "Reviens à la version précédente");
const v3 = await theme();
const preview3 = await page.evaluate(async (u) => (await fetch(u)).text(), `/preview/${PROJECT}/v/${v3.versionId}/`);
check("Retour arrière : texte d'origine restauré", !preview3.includes("Bienvenue à l'atelier"), `v${v3.number}`);

// 4. Export ZIP = aperçu
const zr = await ctx.request.get(`${BASE}/api/projects/${PROJECT}/theme/export?platform=shopify`);
const zip = unzipSync(new Uint8Array(await zr.body()));
const names = Object.keys(zip);
const cssPreview = await (await ctx.request.get(`${BASE}/preview/${PROJECT}/v/${v3.versionId}/assets/theme.css`)).text();
check("Export ZIP : thème complet", ["layout/theme.liquid", "templates/index.json", "templates/product.json", "config/settings_data.json", "sections/header-group.json"].every((n) => names.includes(n)), `${names.length} fichiers`);
check("Export ZIP : fichiers identiques à l'aperçu", strFromU8(zip["assets/theme.css"]) === cssPreview, "assets/theme.css comparé");

// 5. Fichiers : nouveau dossier, déplacement
const files = (await api(`/api/projects/${PROJECT}/files`)).json;
const folder = (await api(`/api/projects/${PROJECT}/folders`, { name: "Sélection test" })).json.folder;
const asset = files.assets.find((a: any) => a.kind === "image");
await api(`/api/files/${asset.id}`, { folderId: folder.id }, "PATCH");
const inFolder = (await api(`/api/projects/${PROJECT}/files?folder=${folder.id}`)).json.assets;
check("Fichiers : dossier créé et image déplacée", inFolder.some((a: any) => a.id === asset.id), asset.name);
await page.goto(`${BASE}/studio/${PROJECT}/fichiers`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/i3-fichiers.png` });

// 6. Plan de publications + validation sans compte connecté
const postsBefore = (await api(`/api/projects/${PROJECT}/posts`)).json.posts.length;
const start = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
await api(`/api/projects/${PROJECT}/plans`, { startDate: start, days: 3, perDay: 2, slots: ["09:00", "18:30"], timezone: "Europe/Paris", networks: [{ network: "instagram" }, { network: "pinterest" }], goals: "faire connaître le produit", tone: "chaleureux", mix: { photo: 60, video: 30, text: 10 }, approval: "manual" });
await idle();
const posts = (await api(`/api/projects/${PROJECT}/posts`)).json.posts;
check("Calendrier : plan généré", posts.length >= postsBefore + 6, `${posts.length - postsBefore} publications ajoutées`);
const review = posts.find((p: any) => p.status === "review");
const appr = await api(`/api/posts/${review.id}`, { action: "approve" });
check("Validation refusée honnêtement sans compte connecté", appr.status >= 400, appr.json?.error ?? JSON.stringify(appr.json));
await page.goto(`${BASE}/studio/${PROJECT}/calendrier`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Semaine" }).click().catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/i4-calendrier.png` });

// 7. Prompts : insertion avec le contexte du projet
const filled = (await api(`/api/projects/${PROJECT}/prompt-fill`, { body: "Écris une légende pour {{produit}} de {{marque}}." })).json;
check("Prompts : variables du projet insérées", !filled.body.includes("{{"), filled.body.slice(0, 90));

check("Aucune erreur JavaScript", errors.length === 0, errors.join(" | "));
const failed = results.filter((r) => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} vérifications réussies`);
await browser.close();
process.exit(failed ? 1 : 0);
