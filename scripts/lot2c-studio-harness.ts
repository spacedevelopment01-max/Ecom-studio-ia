/** Démarrage du VRAI studio (Next.js en développement + worker des tâches de fond) sur une base temporaire, avec un projet
 * FRAISE ou ONDE composé par les fixtures du lot 2C et un utilisateur connecté. Utilisé par le scénario de persistance
 * (`lot2c-persistence-check.ts`) ; `lot2c-studio-check.ts` garde son démarrage propre. Aucune base existante n'est touchée.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import type { Browser, BrowserContext, Page } from "playwright";

export type Studio = { origin: string; pid: string; spec: { files: Record<string, string> }; email: string; password: string; temp: string; logs: () => string; stop: () => Promise<void> };

export async function bootStudio(kind: "fraise" | "onde", pack: string | undefined, options: { testVideo?: boolean } = {}): Promise<Studio> {
  if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
  // Mire vidéo (8 s, sans son) pour exercer un vrai fichier vidéo dans les stories, quand ffmpeg est disponible.
  let testVideo: string | undefined;
  if (options.testVideo) { testVideo = path.join(temp, "mire.webm"); try { execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=size=540x960:rate=24", "-t", "8", "-c:v", "libvpx-vp9", "-b:v", "400k", "-an", testVideo], { stdio: "ignore" }); } catch { testVideo = undefined; console.warn("ffmpeg absent : pas de fichier vidéo de test"); } }
  const PORT = 3123 + Math.floor(Math.random() * 500), origin = `http://127.0.0.1:${PORT}`;
  const { conversionProject } = await import("../tests/lot2c-fixtures");
  const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
  const password = "studio-check-" + Math.random().toString(36).slice(2), email = "studio-check@example.invalid";
  const user = await createUser(email, password, "Vérification studio");
  const f = await runWithLang({ content: "fr", ui: "fr" }, () => conversionProject(user.id, kind, pack, { testVideo }));
  saveThemeVersion(f.pid, f.spec, "Thème référence — vérification studio", "user");
  const env = { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" };
  // Serveur Next.js de développement (pas le lanceur « npm run dev », qui démarre aussi le worker) et worker séparé : la
  // discussion « shop.chat » y est traitée par le moteur local, sans IA connectée. Groupes de processus propres, arrêtés à la fin.
  const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  const worker = spawn("npx", ["tsx", "worker/index.ts"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  let log = ""; for (const ch of [dev, worker]) { ch.stdout!.on("data", (d) => { log += d; }); ch.stderr!.on("data", (d) => { log += d; }); }
  const kill = (sig: NodeJS.Signals) => { for (const ch of [dev, worker] as ChildProcess[]) { try { process.kill(-ch.pid!, sig); } catch { /* déjà arrêté */ } } };
  process.on("exit", () => kill("SIGTERM"));
  const started = Date.now();
  for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas encore prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
  return { origin, pid: f.pid, spec: f.spec as { files: Record<string, string> }, email, password, temp, logs: () => log, stop: async () => { kill("SIGTERM"); await new Promise((r) => setTimeout(r, 1500)); kill("SIGKILL"); fs.rmSync(temp, { recursive: true, force: true }); } };
}

/** Connexion par l'API du studio (cookie de session posé dans le navigateur) et ouverture de l'onglet Boutique. */
export async function openBoutique(browser: Browser, studio: Studio, viewport = { width: 1440, height: 900 }): Promise<{ context: BrowserContext; page: Page; errors: string[] }> {
  const context = await browser.newContext({ viewport, locale: "fr-FR" }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${studio.origin}/api/auth/login`, { data: { email: studio.email, password: studio.password } });
  if (!login.ok()) throw new Error(`connexion : ${login.status()}`);
  await page.goto(`${studio.origin}/studio/${studio.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 }); await page.waitForTimeout(1500);
  await page.frameLocator("iframe[src*='/preview/']").first().locator("body").waitFor({ timeout: 120000 });
  // Invitation au tutoriel vidéo (coin de l'écran) : fermée comme le ferait l'utilisateur, sinon elle couvre des boutons.
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  return { context, page, errors };
}
