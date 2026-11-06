/**
 * Recette #301 « SINA complète », lot 8 — lecture des services réservables (#408) et corbeille depuis Images (#409, #413) de
 * Codex dans la conversation SINA du Studio, Encre / Plein cadre × 1440 / 390 px, projet de services avec réservation native :
 *  1. « Peux-tu me montrer les services réservables du site ? » → carte en lecture seule, mêmes services que la
 *     configuration native, aucun bouton, lien vers Rendez-vous suivi ;
 *  2. Images : image mise à la corbeille par la route native → « Montre la corbeille des images » → seule l'image est
 *     listée → « Restaurer » remplit la phrase → accord gratuit → image relue, mêmes octets, lien « Voir dans Images ».
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-lot8-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot8-301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "lot8-301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE", "BOOKING_READ"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-lot8-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, loadProject, saveServices } = await import("../src/lib/projects");
const { saveAsset, getAsset, assetData } = await import("../src/lib/library");
const { saveThemeVersion } = await import("../src/lib/projects");
const { serviceSpec } = await import("../tests/fixtures");
const native = await import("../src/lib/contenus/prestations");
const { createHash } = await import("node:crypto");
const { emptyServiceProfile } = await import("../src/lib/project-types");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const sharp = (await import("sharp")).default;
const { chromium } = await import("playwright");
const { prepareProject, realAiCalls, simulatedFixtureCalls, PREPARED } = await import("./syna301-recette-preparee");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS;
const ALL_CASES: { mode: Mode; format: Format; business: "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "services" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "services" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || ONLY.split(",").includes(`${k.mode}-${k.format}`));
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  saveThemeVersion(f.pid, serviceSpec("atelier-nuance" as never), "Réservation de démonstration", "user");
  prepareProject(f.u as never, f.c.id, f.pid);
  saveServices(f.pid, { ...emptyServiceProfile(), hours: "Lundi 09–17", phone: "04 00 00 00 00", email: "atelier@example.test", area: "Lyon", services: [{ name: "Diagnostic", description: "Examen fourni", price: "50 €", duration: "30 min" }] } as never);
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, ...f, token });
}
const photoFile = path.join(dir, "photo-atelier-recette.png");
fs.writeFileSync(photoFile, await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 120, b: 90 } } }).png().toBuffer());

const port = 6800 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; business: string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [], constats: string[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [];
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce", ...(k.format === "telephone" ? { hasTouch: true, isMobile: true } : {}) });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const panel = page.locator("#syna-panel:visible");
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => {
      for (let i = 0; i < 3 && !(await panel.count()); i++) {
        const trigger = page.locator('[aria-controls="syna-panel"]:visible').first();
        try { await trigger.click({ timeout: 20000 }); }
        catch (e) {
          // Diagnostic : qui reçoit le toucher à la place du bouton « Sina » ?
          const who = await trigger.evaluate((el) => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, top = document.elementFromPoint(x, y); return `bouton ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} · fenêtre ${innerWidth}×${innerHeight} · reçu par ${top ? top.tagName + "." + String(top.className).slice(0, 80) + (el.contains(top) ? " (le bouton)" : "") : "rien"}`; }).catch((x) => String(x));
          throw Error(`bouton Sina inaccessible : ${who} · ${String(e).slice(0, 120)}`);
        }
        await panel.waitFor({ timeout: 10000 }).catch(() => {});
      }
      await panel.waitFor();
    };
    const box = () => panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SINA" });
    const say = async (text: string) => { await openSyna(); await box().fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const noQuote = async () => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SINA" }).count()), "bouton de devis affiché");
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const goto = async (tab: string) => { await page.goto(`${origin}/studio/${k.pid}/${tab}`, { waitUntil: "networkidle", timeout: 180000 }); await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {}); const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click(); };
    const cur = () => currentTheme(k.pid)!;
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { try { bodies.push(r.postDataJSON()); } catch { /* multipart */ } } });
    const confirm = async (card: ReturnType<typeof panel.getByRole>, receipt: RegExp) => { await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click(); await card.getByRole("status").getByText(receipt).waitFor(); };
    try {
      const svc = (native.readPrestations(k.pid) as { services: { id: string; name: string }[] } | null)?.services ?? [];
      check(svc.length > 0, "aucune prestation native dans le thème de réservation");
      await step("« Peux-tu me montrer les services réservables du site ? » → lecture seule, mêmes services que la réservation native", async () => {
        await goto("rendez-vous"); check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        const before = JSON.stringify(native.readPrestations(k.pid)), profile = JSON.stringify(loadProject(k.pid).services);
        const card = panel.getByRole("region", { name: "Services réservables — lecture seule", exact: true });
        await say("Peux-tu me montrer les services réservables du site ?"); await card.getByText("Lecture seule — 0 €", { exact: true }).waitFor();
        const ids = await card.locator("[data-syna-booking-service]").evaluateAll((els) => els.map((e) => e.getAttribute("data-syna-booking-service")));
        check(JSON.stringify(ids) === JSON.stringify(svc.slice(0, 20).map((x) => x.id)), `services : ${ids.join(",")}`);
        const txt = await card.innerText(); check(txt.includes(svc[0].name), `nom absent : ${txt.slice(0, 200)}`);
        check(!(await card.getByRole("button").count()), "bouton d'action dans une lecture"); await noQuote(); await noOverflow();
        check(JSON.stringify(native.readPrestations(k.pid)) === before && JSON.stringify(loadProject(k.pid).services) === profile, "écriture pendant une lecture");
        await shot("1-services");
        await card.getByRole("link", { name: "Ouvrir Rendez-vous", exact: true }).click(); await page.waitForURL(`**/studio/${k.pid}/rendez-vous`);
        await page.getByText(svc[0].name, { exact: false }).first().waitFor({ timeout: 30000 }).catch(() => constats.push(`${label} : la page Rendez-vous ne montre pas « ${svc[0].name} »`));
        return `${ids.length} services`;
      });
      const data = fs.readFileSync(photoFile), digest = (buf: Buffer) => createHash("sha256").update(buf).digest("hex");
      const img = await saveAsset({ projectId: k.pid, userId: k.u.id, name: "vitrine-atelier.png", mime: "image/png", data, origin: "upload", role: "original" } as never);
      const doc = await saveAsset({ projectId: k.pid, userId: k.u.id, name: "devis-conserve.txt", mime: "text/plain", data: Buffer.from("Contenu fourni"), origin: "upload" } as never);
      const version = getAsset(img.id)!.version;
      const card = panel.getByRole("region", { name: "Corbeille — gratuit", exact: true });
      await step("Images : image et document mis à la corbeille par la route native → « Montre la corbeille des images » → seule l'image", async () => {
        await goto("images");
        for (const x of [img.id, doc.id]) { const st = await page.evaluate(async (id) => (await fetch(`/api/files/${id}`, { method: "DELETE" })).status, x); check(st === 200 && getAsset(x)!.deleted_at, `suppression native : ${st}`); }
        await say("Montre la corbeille des images"); const list = card.getByRole("list", { name: "Fichiers de la corbeille", exact: true }); await list.waitFor();
        const txt = await list.innerText(); check(/vitrine-atelier\.png/.test(txt) && !/devis-conserve/.test(txt), `liste : ${txt}`);
        check(!(await card.getByRole("button", { name: "Confirmer gratuitement" }).count()), "accord proposé sur une liste"); await noQuote(); await noOverflow(); await shot("2-corbeille-images");
      });
      await step("« Restaurer » → « Restaure l’image « id » de la corbeille » → accord → image relue, mêmes octets, lien vers Images", async () => {
        await card.getByRole("button", { name: "Restaurer vitrine-atelier.png", exact: true }).click();
        check((await box().inputValue()) === `Restaure l’image « ${img.id} » de la corbeille`, `phrase : ${await box().inputValue()}`);
        await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        check(getAsset(img.id)!.deleted_at, "restauré avant l'accord"); check(/De retour dans les images/.test(await card.innerText()), "diff absent"); await noQuote(); await shot("3-proposition");
        await confirm(card, /Enregistré et relu · reçu/);
        const r = getAsset(img.id)!; check(!r.deleted_at && r.version === version && digest(assetData(r)) === digest(data), "image mal restaurée");
        check(getAsset(doc.id)!.deleted_at, "le document a été restauré aussi");
        check((await card.getByRole("link", { name: "Voir dans Images", exact: true }).getAttribute("href")) === `/studio/${k.pid}/images`, "lien vers Images");
        await noOverflow(); await shot("4-restauree");
        await page.reload({ waitUntil: "networkidle" });
        const tiles = await page.locator(`img[alt="vitrine-atelier.png"]`).count(); if (!tiles) constats.push(`${label} : image restaurée non retrouvée dans la Banque Images après rechargement`);
        return tiles ? "image revenue dans la Banque après rechargement" : undefined;
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const calls = realAiCalls();
  console.log(`· projet ${PREPARED ? "PRÉPARÉ" : "neuf"} · lignes simulées : ${simulatedFixtureCalls()} · appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-LOT8-301.json"), JSON.stringify({ schema: "syna301-lot8-recette-1", results, errors, constats, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`); if (constats.length) console.log("Constats :\n" + constats.join("\n"));
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
