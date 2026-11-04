/**
 * Recette #301 « SYNA complète » — remplacer l'image d'une section par une image EXISTANTE du projet (contrat de Codex
 * `73c8865a`, commande image de la carte Site), Encre / Plein cadre, 1440 / 390 px. Le client désigne l'image (ordinateur :
 * outil natif « Désigner » + clic sur l'image dans l'aperçu ; téléphone : repère enregistré repris), puis
 * « Remplace l'image de cette section par la photo de l'atelier » → carte Gratuit — 0 €, miniatures avant / après, aucun
 * devis, rien d'écrit → confirmation → nouvelle version : le champ pointe sur l'image choisie, l'aperçu enregistré la
 * montre, aucune autre section ne change, aucun fichier créé ni supprimé. 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-image-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-image301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "image301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-image-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const sharp = (await import("sharp")).default;
const { saveAsset } = await import("../src/lib/library");
const { sectionSchema } = await import("../src/lib/theme/spec");
const { contextView, submitContext } = await import("../src/lib/orchestrator/conversation/context-session");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const ONLY = process.env.RECETTE_CAS; // ex. « encre-telephone » : rejouer un seul cas pour diagnostic
const ALL_CASES: { mode: Mode; format: Format; business: "products" | "services" }[] = [
  { mode: "encre", format: "ordinateur", business: "products" }, { mode: "encre", format: "telephone", business: "services" },
  { mode: "plein", format: "ordinateur", business: "services" }, { mode: "plein", format: "telephone", business: "products" },
];
const CASES = ALL_CASES.filter((k) => !ONLY || `${k.mode}-${k.format}` === ONLY);
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const prepared: (typeof CASES[number] & Awaited<ReturnType<typeof localSiteFixture>> & { token: string })[] = [];
for (const k of CASES) {
  const f = await runWithLang({ ui: "fr", content: "fr" }, () => localSiteFixture(k.business));
  const token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), f.u.id, now() + 3600000, now());
  writeSynaPrefs(f.u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  const photo = await saveAsset({ projectId: f.pid, userId: f.u.id, name: "photo de l'atelier.png", mime: "image/png", data: await sharp({ create: { width: 64, height: 48, channels: 3, background: "#285b46" } }).png().toBuffer(), origin: "upload" });
  const cur0 = currentTheme(f.pid)!.spec as unknown as { templates: { index: { order: string[]; sections: Record<string, { type: string; settings: Record<string, unknown> }> } }; files: Record<string, string> };
  const imgs = cur0.templates.index.order.flatMap((sid) => { const s = cur0.templates.index.sections[sid]; return (sectionSchema(cur0 as never, s.type)?.settings ?? []).filter((d) => d.type === "image_picker" && d.id && s.settings[d.id + "_asset"] && cur0.files[String(s.settings[d.id + "_asset"])]).map((d) => ({ sid, key: d.id! })); });
  if (!imgs.length) throw Error("aucune image native dans la démonstration");
  prepared.push({ ...k, ...f, token, photoId: photo.id, img: imgs[0], imgs } as never);
}

const port = 6300 + Math.floor(Math.random() * 90), origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"], { env: { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--import=${path.resolve("scripts/lot9/network-guard.mjs")}` }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = ""; server.stdout.on("data", (d) => { log += d; }); server.stderr.on("data", (d) => { log += d; });
const stop = () => { try { process.kill(-server.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; business: string; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (c: unknown, m: string) => { if (!c) throw Error(m); };
const spec = (pid: string) => currentTheme(pid)!.spec as unknown as { templates: { index: { order: string[]; sections: Record<string, { type: string; settings: Record<string, unknown> }> } } };

try {
  const start = Date.now();
  for (;;) { if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-800)); try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ } await new Promise((r) => setTimeout(r, 1000)); }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}-${k.business}`, steps: Step[] = [], desktop = k.format === "ordinateur";
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce" });
    await ctx.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await ctx.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await ctx.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await ctx.newPage(); page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    // Journal des confirmations gratuites : corps envoyé et réponse exacte du serveur (diagnostic, jamais d'assertion cachée).
    page.on("response", async (r) => { try { if (r.request().method() === "POST" && /\/api\/studio-agent\/conversations\/[^/]+$/.test(new URL(r.url()).pathname)) { const body = r.request().postDataJSON() as { action?: string; proposalId?: string; requestId?: string }; if (body?.action === "confirm-local" || body?.action === "message") { const j = await r.json().catch(() => null) as { localSite?: { state?: string; command?: string; proposalId?: string; version?: { number?: number } }; error?: string } | null; console.log(`    [http] ${label} ${body.action} ${body.proposalId ?? ""} → ${r.status()} ${j?.localSite?.state ?? j?.error ?? ""} ${j?.localSite?.command ?? ""} v${j?.localSite?.version?.number ?? "-"} prop=${j?.localSite?.proposalId ?? ""}`); } } } catch { /* journal seulement */ } });
    const panel = page.locator("#syna-panel:visible"), free = panel.getByRole("region", { name: "Retouche gratuite", exact: true });
    const frame = () => page.frameLocator('iframe[title^="Aperçu"]');
    const shot = async (n: string) => { const file = `${label}-${n}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const d = await fn(); steps.push({ etape, ok: true, ...(d ? { detail: d } : {}) }); console.log(`  ✓ ${label} · ${etape}${d ? " — " + d : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { for (let i = 0; i < 3 && !(await panel.count()); i++) { await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor({ timeout: 10000 }).catch(() => {}); } await panel.waitFor(); };
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SYNA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const noQuote = async (when: string) => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), `bouton de devis affiché (${when})`);
    const version = () => currentTheme(k.pid)!.version.number;
    // Couleur réellement peinte : l'élément de la section qui porte la classe du schéma (l'enveloppe data-es-section n'a pas de fond).
    const sectionBg = () => frame().locator(`[data-es-section="index:${k.section}"]`).first().evaluate((el) => { const t = (el.matches('[class*="color-"]') ? el : el.querySelector('[class*="color-"]')) as HTMLElement | null; if (!t) return "aucun élément coloré"; const s = getComputedStyle(t); return `${s.backgroundColor}|${s.color}|${t.className.match(/color-[\w-]+/)?.[0] ?? ""}`; });
    // Désignation : ordinateur = outil natif « Désigner » de l'aperçu ; téléphone = même désignation enregistrée
    // côté conversation (A2) puis « Reprendre le repère sauvegardé » dans le panneau, comme après un rechargement.
    const designate = async () => {
      if (desktop) {
        await closeSyna();
        const tab = page.getByRole("tab", { name: "Aperçu", exact: true }); if (await tab.count()) await tab.click();
        const heading = frame().locator(`[data-es-section="index:${k.section}"]`).getByRole("heading").first();
        await heading.waitFor(); await heading.scrollIntoViewIfNeeded();
        const tools = page.locator("[data-site-tools]"); if (!(await tools.getAttribute("open"))) await tools.locator(":scope > summary").click();
        await page.getByRole("button", { name: "Désigner", exact: true }).click();
        const close = page.getByRole("button", { name: "Fermer les outils", exact: true }); if (await close.isVisible()) await close.click();
        await heading.click(); await panel.waitFor();
      } else {
        k.select(false); await page.reload({ waitUntil: "networkidle" }); await openSyna();
        const resume = panel.getByRole("button", { name: /^Reprendre le repère sauvegardé/ });
        // isVisible n'attend pas : on attend réellement le bouton (jamais de faux succès, la désignation est vérifiée après).
        await resume.waitFor({ timeout: 20000 }); await resume.click();
      }
      await panel.locator("[data-agent-active-context]").getByText(/Section désignée/).waitFor();
    };
    // Avant une phrase ciblée : reprendre le repère sauvegardé s'il est proposé, sinon désigner de nouveau.
    const ensureDesignated = async () => {
      await openSyna();
      const ctxBox = panel.locator("[data-agent-active-context]");
      if (await ctxBox.getByText(/Section désignée/).count()) return "déjà désignée";
      const resume = panel.getByRole("button", { name: /^Reprendre le repère sauvegardé/ });
      if (await resume.waitFor({ timeout: 5000 }).then(() => true, () => false)) { await resume.click(); if (await ctxBox.getByText(/Section désignée/).waitFor({ timeout: 10000 }).then(() => true, () => false)) return "repère repris"; }
      await designate(); return "désignée de nouveau";
    };
    const say = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const confirmBtn = () => free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true });
    const kk = k as unknown as { photoId: string; img: { sid: string; key: string }; imgs: { sid: string; key: string }[] };
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const filesCount = () => one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id=?", k.pid)!.n;
    const designateImage = async () => {
      if (desktop) {
        await closeSyna();
        const tab = page.getByRole("tab", { name: "Aperçu", exact: true }); if (await tab.count()) await tab.click();
        // Première section dont l'image native est réellement visible dans l'aperçu (certaines la rendent autrement).
        await frame().locator("[data-es-section]").first().waitFor();
        let found: { sid: string; key: string } | undefined;
        for (const c of kk.imgs) if (await frame().locator(`[data-es-section="index:${c.sid}"] img`).first().isVisible().catch(() => false)) { found = c; break; }
        check(found, "aucune image native visible dans l'aperçu"); kk.img = found!;
        const im = frame().locator(`[data-es-section="index:${kk.img.sid}"] img`).first();
        await im.scrollIntoViewIfNeeded();
        const tools = page.locator("[data-site-tools]"); if (!(await tools.getAttribute("open"))) await tools.locator(":scope > summary").click();
        await page.getByRole("button", { name: "Désigner", exact: true }).click();
        const close = page.getByRole("button", { name: "Fermer les outils", exact: true }); if (await close.isVisible()) await close.click();
        await im.click({ force: true }); await panel.waitFor();
      } else {
        const v = contextView(k.u, k.c.id);
        submitContext(k.u, k.c.id, { action: "select", revision: v.revision, requestId: id(), context: { projectId: k.pid, tab: "boutique", target: { kind: "theme-field", versionId: currentTheme(k.pid)!.version.id, template: "index", section: kk.img.sid, key: kk.img.key, pagePath: "/" } } } as never);
        await page.reload({ waitUntil: "networkidle" }); await openSyna();
        const resume = panel.getByRole("button", { name: /^Reprendre le repère sauvegardé/ }); await resume.waitFor({ timeout: 20000 }); await resume.click();
      }
      await panel.locator("[data-agent-active-context]").getByText(/désign/i).first().waitFor();
      return (await panel.locator("[data-agent-active-context]").innerText()).split("\n").find((l) => /désign/i.test(l))?.trim();
    };
    try {
      await step("Site ouvert dans le mode du compte", async () => {
        await page.goto(`${origin}/studio/${k.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
      });
      await step("l'image est désignée (aperçu natif ou repère sauvegardé)", async () => {
        const d = await designateImage(); check(d && !/undefined/.test(d), `désignation : ${d}`); await shot("1-image-designee"); return d;
      });
      await step("« Remplace l'image de cette section par la photo de l'atelier » → miniatures avant / après, gratuit, rien d'écrit", async () => {
        const v = version(), n = filesCount();
        await say("Remplace l’image de cette section par la photo de l’atelier");
        await confirmBtn().waitFor(); const txt = await free.innerText();
        check(/Gratuit — 0 €/.test(txt) && /photo de l'atelier\.png/.test(txt), `carte : ${txt.slice(0, 300)}`);
        const media = free.locator("[data-syna-site-media]"); await media.waitFor();
        const after = media.getByRole("img", { name: /Après confirmation/ }); await after.waitFor();
        const loaded = () => after.evaluate((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0);
        await after.scrollIntoViewIfNeeded().catch(() => {});
        const end = Date.now() + 30000; while (Date.now() < end && !(await loaded())) await page.waitForTimeout(250);
        if (!(await loaded())) { const r = await page.request.get(`${origin}/api/files/${kk.photoId}`); throw Error(`miniature « après » non chargée (serveur ${r.status()} ${r.headers()["content-type"]})`); }
        check((await after.getAttribute("src")) === `/api/files/${kk.photoId}`, "miniature « après » ne montre pas l'image choisie");
        await noQuote("image"); check(version() === v && filesCount() === n, "écriture avant l'accord"); await noOverflow(); await shot("2-proposition");
      });
      await step("confirmation → nouvelle version : le champ pointe sur l'image choisie, aperçu relu, rien d'autre ne change", async () => {
        const before = structuredClone(spec(k.pid).templates.index), v = version(), n = filesCount();
        await confirmBtn().click(); await free.getByRole("status").getByText(/Résultat enregistré · version/).waitFor();
        check(version() === v + 1, `version ${v} → ${version()}`);
        const cur = currentTheme(k.pid)!, sp = cur.spec as unknown as { templates: { index: { order: string[]; sections: Record<string, { settings: Record<string, unknown> }> } }; files: Record<string, string> };
        const file = String(sp.templates.index.sections[kk.img.sid].settings[kk.img.key + "_asset"]); check(sp.files[file] === kk.photoId, `fichier du champ : ${file} → ${sp.files[file]}`);
        for (const id of before.order) if (id !== kk.img.sid) check(JSON.stringify(sp.templates.index.sections[id]) === JSON.stringify(before.sections[id]), `section ${id} modifiée`);
        check(filesCount() === n, "fichier créé ou supprimé");
        // Aperçu de la version enregistrée : l'image affichée dans la section a exactement les octets de la photo choisie.
        const viewer = await ctx.newPage(); await viewer.goto(`${origin}/preview/${k.pid}/v/${cur.version.id}/`, { waitUntil: "load" });
        const src = await viewer.locator(`[data-es-section="index:${kk.img.sid}"] img`).first().evaluate((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src).catch(() => "");
        await viewer.close(); check(src, "aucune image rendue dans la section enregistrée");
        const embedded = /^data:image\/[^;]+;base64,(.+)$/.exec(src);
        const shown = embedded ? Buffer.from(embedded[1], "base64") : await (await page.request.get(new URL(src, origin).toString())).body();
        const { assetData, getAsset } = await import("../src/lib/library");
        const expected = assetData(getAsset(kk.photoId)!);
        const px = async (b: Buffer) => { const r = await sharp(b).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: r.info.width, h: r.info.height, d: r.data }; };
        const [a1, b1] = await Promise.all([px(shown), px(expected)]);
        check(a1.w === b1.w && a1.h === b1.h && Buffer.compare(a1.d, b1.d) === 0, `pixels affichés ${a1.w}×${a1.h} ≠ photo choisie ${b1.w}×${b1.h} ; octets ${shown.length} ≠ photo choisie ${expected.length} (${src.slice(0, 120)})`);
        await noOverflow(); await shot("3-recu"); return `v${v} → v${version()}, ${file}`;
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, business: k.business, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await ctx.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`); if (jsErrors.length) errors.push(...jsErrors);
} catch (e) { errors.push(String(e)); console.error("✗ " + String(e)); }
finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-IMAGE-301.json"), JSON.stringify({ schema: "syna301-image-recette-1", results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
