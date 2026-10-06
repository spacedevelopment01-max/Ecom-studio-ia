/**
 * Tutoriels vidéo des onglets du studio, filmés sur le vrai studio (serveur + worker lancés) :
 *   npx tsx scripts/tutorials/setup.ts                 compte et projets de démonstration (une fois)
 *   npx tsx scripts/build-tutorials.ts                 tous les tutoriels, en français
 *   LANG=en npx tsx scripts/build-tutorials.ts         version anglaise (interface et projets en anglais)
 *   ONLY=boutique,images npx tsx scripts/build-tutorials.ts
 * Sortie : public/tutorials/<id>[.en].mp4 (1280×800, H.264), <id>[.en].jpg (affiche) et <id>[.en].json
 * (durée et début de chaque étape, pour la liste cliquable sous la vidéo).
 * Chaque scène (scripts/tutorials/scenes/<id>.ts) joue les gestes ; les sous-titres viennent de src/lib/tutorials.
 * Ensuite, la voix off (voix d'homme qui lit chaque étape) : scripts/narrate-tutorials.ts.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { TUTORIALS, TUTORIAL_IDS, tutorialBusiness, tutorialSlug, tutorialTab, type TutorialId } from "../src/lib/tutorials";
import { OVERLAY, Recorder, VIEWPORT } from "./tutorials/recorder";
import { BASE, EMAIL, PASSWORD, readProjects } from "./tutorials/setup";

const LANG: "fr" | "en" = process.env.LANG === "en" ? "en" : "fr";
const OUT = path.join(process.cwd(), "public", "tutorials");
const ids = (process.env.ONLY?.split(",") as TutorialId[] | undefined) ?? TUTORIAL_IDS;
const projects = readProjects();
fs.mkdirSync(OUT, { recursive: true });

export type SceneCtx = { r: Recorder; lang: "fr" | "en"; projectId: string; base: string; t: (fr: string, en: string) => string };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
for (const id of ids) {
  const def = TUTORIALS[id];
  if (!def?.steps.length) { console.log(`${id} : pas d'étapes, ignoré`); continue; }
  const projectId = projects[`${tutorialBusiness(id)}-${LANG}` as keyof typeof projects];
  if (!projectId) throw new Error("projets absents : lancez d'abord scripts/tutorials/setup.ts");
  const mod = await import(`./tutorials/scenes/${id}.ts`);
  const scene = mod.default as (c: SceneCtx) => Promise<void>;
  const cleanup = mod.cleanup as ((c: SceneCtx) => Promise<void>) | undefined;
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: LANG === "en" ? "en-US" : "fr-FR", colorScheme: "light" });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} }); // intro d'ouverture déjà vue : rien ne couvre la page filmée
  await ctx.addCookies([{ name: "ecs-lang", value: LANG, url: BASE }]);
  const login = await ctx.request.post(`${BASE}/api/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  if (!login.ok()) throw new Error(`connexion : ${await login.text()}`);
  // Langue de l'interface enregistrée côté serveur, comme le fait le sélecteur FR/EN : les réponses des tâches (worker) la suivent.
  await ctx.request.post(`${BASE}/api/me/lang`, { data: { lang: LANG } });
  // tsx (esbuild) nomme les fonctions avec un utilitaire « __name » absent du navigateur.
  await ctx.addInitScript({ content: "window.__name = window.__name || ((f) => f);" });
  await ctx.addInitScript(OVERLAY);
  // Menu latéral déplié, thème clair, conseils de première visite masqués.
  await ctx.addInitScript(() => { try { localStorage.setItem("ecs-theme", "light"); localStorage.setItem("ecs-sidebar", "open"); } catch {} });
  const page = await ctx.newPage();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `tuto-${id}-`));
  const captions = def.steps.map((s) => s[LANG]);
  const r = new Recorder(page, tmp, LANG, captions);
  await page.goto(`${BASE}/studio/${projectId}/${tutorialTab(id)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await r.start();
  const t = (fr: string, en: string) => (LANG === "en" ? en : fr);
  await r.card(t("Tutoriel", "Tutorial"), def.title[LANG], def.summary[LANG], 3800);
  await scene({ r, lang: LANG, projectId, base: BASE, t });
  await r.captionOff();
  await r.spot(null);
  await r.card(t("À vous de jouer", "Your turn"), def.title[LANG], t("Revoyez ce tutoriel à tout moment avec le bouton « Tutoriel », en haut de l'onglet.", "Watch this tutorial again anytime with the \"Tutorial\" button at the top of the tab."), 3200);
  await r.stop();
  const end = r.now();
  const suffix = LANG === "en" ? ".en" : "";
  const offset = await r.encode(path.join(OUT, `${tutorialSlug(id)}${suffix}.mp4`), path.join(OUT, `${tutorialSlug(id)}${suffix}.jpg`), 4.6);
  void offset;
  const round = (x: number) => Math.round(x * 10) / 10;
  const duration = round(r.videoTime(end));
  fs.writeFileSync(path.join(OUT, `${tutorialSlug(id)}${suffix}.json`), JSON.stringify({ duration, steps: r.stepTimes.map((s) => round(r.videoTime(s))) }));
  fs.rmSync(tmp, { recursive: true, force: true });
  // Remise en état du projet de démonstration (une scène peut créer des versions, des brouillons…).
  if (cleanup) await cleanup({ r, lang: LANG, projectId, base: BASE, t });
  console.log(`${id}${suffix} ✓ ${duration} s, ${r.frames.length} images`);
  await ctx.close();
}
await browser.close();
