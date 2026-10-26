/**
 * Suivi #194 (constat de Codex) : dans l'onglet Boutique, le menu « … » d'une section MASQUÉE doit être utilisable
 * comme celui d'une section visible. Studio réel (Next.js en développement, base temporaire, aucune IA, aucun réseau),
 * démonstration Atelier Rive, une section de l'accueil masquée. Clic normal (jamais forcé) sur « Descendre » puis
 * « Monter », à l'ordinateur et au téléphone ; l'élément sous le pointeur doit être l'entrée du menu. Captures à chaque
 * étape et résumé JSON.
 *
 *   npx tsx scripts/section-masquee-studio-check.ts <dossier-captures>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-masquee-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/section-masquee"); fs.mkdirSync(out, { recursive: true });
const PORT = 3600 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const password = "masquee-" + Math.random().toString(36).slice(2), email = "masquee-studio@example.invalid";
const user = await createUser(email, password, "Vérification section masquée");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, "rive"));
// Une section de l'accueil, ni la première ni la dernière, est masquée (comme « Réalisations » chez Codex).
const index = f.spec.templates.index;
const hiddenId = index.order[2];
index.sections[hiddenId].disabled = true;
saveThemeVersion(f.pid, f.spec, "Vérification : section masquée", "user");
const { run } = await import("../src/lib/db");
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `masquee-${f.pid}`, "dominer", user.id, f.pid, Date.now(), Date.now());
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1", APP_URL: origin }, stdio: ["ignore", "pipe", "pipe"], detached: true });
const stopDev = () => { try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stopDev);
let log = ""; dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const results: Record<string, unknown>[] = [];
const { loadProject, currentTheme } = await import("../src/lib/projects");
const order = () => currentTheme(f.pid)!.spec.templates.index.order;
try {
  for (const [label, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["telephone", { width: 390, height: 844 }]] as const) {
    const context = await browser.newContext({ viewport, locale: "fr-FR" });
    const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); if (!login.ok()) throw new Error(`connexion : ${login.status()}`);
    const page: Page = await context.newPage();
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    const opsCalls: string[] = []; page.on("response", async (r) => { if (r.url().includes("/theme/ops")) opsCalls.push(`${r.status()} ${(await r.text().catch(() => "")).slice(0, 200)}`); });
    await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
    const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) await nudge.first().click();
    // Au téléphone, la structure est une vue à part.
    await page.screenshot({ path: path.join(out, `${label}-00-ouverture.png`) });
    const mark = () => page.evaluate(() => {
      const ps = [...document.querySelectorAll("p")].filter((e) => (e.textContent ?? "").trim() === "Masquée" && (e as HTMLElement).offsetParent !== null);
      const r = ps[0]?.closest("div.relative"); if (r) r.setAttribute("data-verif-masquee", ""); return { trouvees: ps.length, ligne: !!r };
    });
    let found = await mark();
    if (!found.ligne) { const structure = page.getByText("Structure", { exact: true }).filter({ visible: true }); if (await structure.count()) await structure.first().click(); await page.waitForTimeout(1500); found = await mark(); }
    if (!found.ligne) throw new Error(`ligne masquée introuvable (${label}) : ${JSON.stringify(found)}`);
    const row = page.locator("[data-verif-masquee]");
    await row.waitFor({ timeout: 60000 }); await row.scrollIntoViewIfNeeded();
    const name = (await row.getByRole("button", { name: /^Actions pour/ }).getAttribute("aria-label"))!;
    for (const action of ["Descendre", "Monter"] as const) {
      const before = order().indexOf(hiddenId);
      const item = page.getByRole("menuitem", { name: action });
      try { await row.getByRole("button", { name: /^Actions pour/ }).click({ timeout: 8000 }); await item.waitFor({ timeout: 10000 }); }
      catch (e) { results.push({ largeur: label, section: name, action, ouvertureDuMenu: false, erreur: (e as Error).message.split("\n")[0] }); await page.screenshot({ path: path.join(out, `${label}-${action.toLowerCase()}-menu-non-ouvert.png`) }); await page.mouse.click(5, 5).catch(() => {}); continue; }
      await page.waitForTimeout(400);
      const hit = await item.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { onItem: !!top && (top === el || el.contains(top)), top: top ? `${top.tagName.toLowerCase()} ${top.getAttribute("aria-label") ?? (top.textContent ?? "").trim().slice(0, 40)}` : null }; });
      await page.screenshot({ path: path.join(out, `${label}-${action.toLowerCase()}-menu-ouvert.png`) });
      let clicked = true, error = "";
      // En développement, la première mutation compile la route : on attend sa réponse avant de relire l'ordre.
      const response = page.waitForResponse((r) => r.url().includes("/theme/ops"), { timeout: 120000 }).catch(() => null);
      try { await item.click({ timeout: 8000 }); if (!(await response)) error = "aucune réponse de /theme/ops"; } catch (e) { clicked = false; error = (e as Error).message.split("\n")[0]; await page.keyboard.press("Escape").catch(() => {}); await page.mouse.click(5, 5).catch(() => {}); }
      await page.waitForTimeout(2500);
      const after = order().indexOf(hiddenId);
      const moved = action === "Descendre" ? after === before + 1 : after === before - 1;
      results.push({ largeur: label, section: name, action, appels: opsCalls.splice(0), entreeSousLePointeur: hit.onItem, elementSousLePointeur: hit.top, clicNormal: clicked, deplacee: moved, positionAvant: before, positionApres: after, erreur: error || undefined });
      await page.screenshot({ path: path.join(out, `${label}-${action.toLowerCase()}-apres.png`) });
    }
    // Témoin : le menu d'une section visible (première section de la page) reste entièrement accessible.
    const target = page.locator(`[data-section-row="${order().find((x) => x !== hiddenId)}"]`).getByRole("button", { name: /^Actions pour/ });
    await target.scrollIntoViewIfNeeded(); await target.click({ timeout: 8000 }); await page.waitForTimeout(400);
    const items = await page.getByRole("menuitem").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (top === el || el.contains(top)); }));
    await page.screenshot({ path: path.join(out, `${label}-temoin-section-visible.png`) });
    results.push({ largeur: label, temoin: await target.getAttribute("aria-label"), entreesAccessibles: `${items.filter(Boolean).length}/${items.length}` });
    await target.click({ timeout: 8000 }).catch(() => page.mouse.click(5, 5));
    results.push({ largeur: label, erreursJavaScript: errors });
    await context.close();
  }
} finally {
  await browser.close(); stopDev();
  fs.writeFileSync(path.join(out, "resultat.json"), JSON.stringify({ projet: loadProject(f.pid).name, sectionMasquee: hiddenId, resultats: results }, null, 1));
}
console.log(JSON.stringify(results, null, 1));
const ok = results.filter((r) => "temoin" in r).every((r) => /^(\d+)\/\1$/.test(String(r.entreesAccessibles)) && !String(r.entreesAccessibles).startsWith("0/")) && results.filter((r) => "action" in r).every((r) => r.entreeSousLePointeur && r.clicNormal && r.deplacee) && results.every((r) => !("erreursJavaScript" in r) || (r.erreursJavaScript as string[]).length === 0);
console.log(ok ? "RÉUSSI" : "ÉCHEC");
process.exit(ok ? 0 : 1);
