/**
 * Recette #301 v3 — retouches gratuites du site par phrase naturelle (contrat #359 de Codex : couleur de section, FAQ
 * après une section, annulation native), dans la conversation SINA du Studio, Encre et Plein cadre, 1440 et 390 px.
 *
 * Par cas : section désignée → « Mets le fond de cette section en bleu » → carte Gratuit — 0 €, avant / après, aucun
 * bouton de devis, rien d'écrit → Annuler (cancel-local) : rien d'écrit, rien au rechargement → nouvelle proposition,
 * attente réelle de 17 s → confirmation unique → reçu, couleur réellement changée dans l'aperçu, seule cette section
 * modifiée en base → rechargement : reçu conservé → « Change la couleur principale du site en #1e3a8a » : clarification,
 * ni bouton de confirmation ni devis, rien d'écrit → « Ajoute une section FAQ après cette section » → confirmation
 * (ordinateur : réponse réseau perdue après l'écriture, vérification sans double écriture) → FAQ visible après la
 * section → « Annule la dernière retouche du site » → confirmation → FAQ retirée (même modèle qu'avant) → ordinateur :
 * conflit (modification manuelle entre proposition et accord) → refus, la modification manuelle est conservée.
 *
 * Phrases d'origine, non aménagées. Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-site-gratuit-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-site301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "site301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-site-gratuit-301");
fs.mkdirSync(out, { recursive: true });

const { localSiteFixture } = await import("../tests/conversation284-b1-fixtures");
const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { id, run, one, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
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
  prepared.push({ ...k, ...f, token });
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
    const closeSyna = async () => { if (await panel.count()) await panel.getByRole("button", { name: "Replier SINA", exact: true }).first().click(); await page.locator("#syna-panel:visible").waitFor({ state: "detached" }).catch(() => {}); };
    const noQuote = async (when: string) => check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SINA" }).count()), `bouton de devis affiché (${when})`);
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
    const say = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SINA" }).fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const confirmBtn = () => free.getByRole("button", { name: "Confirmer la modification gratuite", exact: true });
    try {
      await step("Site ouvert, mode du compte, section désignée", async () => {
        await page.goto(`${origin}/studio/${k.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
        await designate(); await shot("1-designee");
      });
      const v0 = version(), bg0 = desktop ? await sectionBg() : "";
      await step("« Mets le fond de cette section en bleu » : Gratuit — 0 €, avant / après, aucun devis, rien d'écrit", async () => {
        await say("Mets le fond de cette section en bleu"); await confirmBtn().waitFor();
        await free.getByText("Après confirmation", { exact: true }).first().waitFor();
        const txt = await free.innerText(); check(/Gratuit — 0 €/.test(txt) && /Avant/.test(txt) && /Après confirmation/.test(txt) && /Fond : #[0-9A-F]{6}/i.test(txt) && !/[{}]/.test(txt), "carte incomplète ou JSON brut : " + txt.slice(0, 300));
        await noQuote("proposition couleur"); check(version() === v0, "écriture avant l'accord"); await shot("2-proposition-couleur");
        return txt.split("\n").filter((l) => /#[0-9A-F]{6}/i.test(l)).slice(0, 4).join(" | ").slice(0, 200);
      });
      await step("Annuler : rien d'écrit, rien au rechargement", async () => {
        await free.getByRole("button", { name: "Annuler la modification gratuite", exact: true }).click();
        await confirmBtn().waitFor({ state: "detached" }); check(version() === v0, "écriture malgré l'annulation");
        await page.reload({ waitUntil: "networkidle" }); await openSyna(); check(!(await confirmBtn().count()), "proposition annulée ressuscitée");
        await shot("3-annulation");
      });
      await step("nouvelle proposition, attente réelle de 17 s, confirmation unique, reçu", async () => {
        await ensureDesignated();
        await say("Mets le fond de cette section en bleu"); await confirmBtn().waitFor();
        await page.waitForTimeout(17000); check(await confirmBtn().isEnabled(), "confirmation désactivée après 17 s");
        let posts = 0; page.on("request", (r) => { if (r.method() === "POST" && r.postData()?.includes('"confirm-local"')) posts++; });
        await confirmBtn().dblclick().catch(() => confirmBtn().click());
        await free.getByText(/Résultat enregistré · version/).waitFor();
        check(posts === 1, `${posts} confirmations envoyées`); check(version() === v0 + 1, `versions ${v0} → ${version()}`);
        await shot("4-recu-couleur");
        return `version ${v0} → ${version()}`;
      });
      await step("résultat réel : seule la section désignée a changé en base, couleur visible dans l'aperçu", async () => {
        const rows = one<{ n: number }>("SELECT COUNT(*) n FROM theme_versions WHERE project_id=?", k.pid)!.n; check(rows >= 2, "versions");
        const prev = JSON.parse(one<{ spec: string }>("SELECT spec FROM theme_versions WHERE project_id=? AND number=?", k.pid, v0)!.spec), cur = spec(k.pid);
        const changed = Object.keys(cur.templates.index.sections).filter((s) => JSON.stringify(cur.templates.index.sections[s]) !== JSON.stringify(prev.templates.index.sections[s]));
        check(JSON.stringify(changed) === JSON.stringify([k.section]), `sections modifiées : ${changed}`);
        check(JSON.stringify(cur.templates.index.order) === JSON.stringify(prev.templates.index.order), "ordre modifié");
        if (desktop) { await closeSyna(); const end = Date.now() + 30000; let bg1 = await sectionBg(); while (bg1 === bg0 && Date.now() < end) { await page.waitForTimeout(500); bg1 = await sectionBg(); } check(bg1 !== bg0, "couleur inchangée dans l'aperçu"); await shot("5-apercu-couleur"); return `aperçu fond / texte ${bg0.split("|").slice(0, 2).join(" / ")} → ${bg1.split("|").slice(0, 2).join(" / ")} (${bg1.split("|")[2]})`; }
        return `réglages modifiés : ${Object.keys(cur.templates.index.sections[k.section].settings).filter((s) => JSON.stringify(cur.templates.index.sections[k.section].settings[s]) !== JSON.stringify(prev.templates.index.sections[k.section].settings[s])).join(", ")}`;
      });
      await step("rechargement : reçu conservé", async () => { await page.reload({ waitUntil: "networkidle" }); await openSyna(); await free.getByText(/Résultat enregistré · version/).waitFor(); });
      await step("« Change la couleur principale du site en #1e3a8a » : clarification, ni confirmation ni devis, rien d'écrit", async () => {
        const v = version(); await say("Change la couleur principale du site en #1e3a8a");
        await free.getByText(/couleur globale/i).first().waitFor(); check(!(await confirmBtn().count()), "bouton de confirmation pour une cible ambiguë");
        await noQuote("couleur globale"); check(version() === v, "écriture"); await shot("6-couleur-globale");
      });
      let beforeFaq: string[] = [];
      await step("« Ajoute une section FAQ après cette section »" + (desktop ? " — réponse réseau perdue, vérification sans double écriture" : ""), async () => {
        await ensureDesignated();
        beforeFaq = [...spec(k.pid).templates.index.order]; const v = version();
        await say("Ajoute une section FAQ après cette section"); await confirmBtn().waitFor().catch(async () => { throw Error("aucune proposition FAQ : " + (await panel.innerText()).slice(-400)); }); await noQuote("FAQ"); check(version() === v, "écriture avant l'accord");
        await shot("7-proposition-faq");
        const bodies: unknown[] = []; let lose = desktop;
        await page.route(`**/api/studio-agent/conversations/${k.c.id}`, async (route) => { const r = route.request(); if (r.method() === "POST" && r.postDataJSON()?.action === "confirm-local") { bodies.push(r.postDataJSON()); if (lose) { lose = false; await route.fetch(); await route.abort("failed"); return; } } await route.continue(); });
        await confirmBtn().click();
        if (desktop) { await free.getByRole("button", { name: "Vérifier l’enregistrement", exact: true }).click(); }
        await free.getByText(/Résultat enregistré · version/).waitFor();
        await page.unroute(`**/api/studio-agent/conversations/${k.c.id}`);
        check(version() === v + 1, `versions ${v} → ${version()} (double écriture ?)`);
        const order = spec(k.pid).templates.index.order, i = order.indexOf(k.section), added = order.filter((s) => !beforeFaq.includes(s));
        check(added.length === 1 && order[i + 1] === added[0] && /faq/i.test(spec(k.pid).templates.index.sections[added[0]].type), `FAQ : ${added} après ${order[i]}`);
        if (desktop) { await closeSyna(); await frame().locator(`[data-es-section="index:${added[0]}"]`).first().waitFor({ timeout: 30000 }); await shot("8-apercu-faq"); }
        return `${added[0]} (${spec(k.pid).templates.index.sections[added[0]].type}) après ${k.section}${desktop ? ` ; ${bodies.length} envoi(s) identique(s) : ${bodies.length === 1 || JSON.stringify(bodies[0]) === JSON.stringify(bodies[1])}` : ""}`;
      });
      await step("« Annule la dernière retouche du site » : proposition, confirmation, FAQ retirée", async () => {
        const v = version(); await say("Annule la dernière retouche du site"); await confirmBtn().waitFor(); await noQuote("annulation"); check(version() === v, "écriture avant l'accord");
        await shot("9-proposition-annulation"); await confirmBtn().click(); await free.getByText(/Résultat enregistré · version/).waitFor();
        check(JSON.stringify(spec(k.pid).templates.index.order) === JSON.stringify(beforeFaq), "ordre non restauré");
        // L'aperçu se recharge sur la nouvelle version : on attend (30 s au plus) qu'il n'affiche plus la FAQ, jamais de faux succès.
        if (desktop) { await closeSyna(); const end = Date.now() + 30000; let ids: (string | null)[] = []; do { ids = await frame().locator('main [data-es-section^="index:"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-es-section"))).catch(() => []); if (ids.length === beforeFaq.length) break; await page.waitForTimeout(500); } while (Date.now() < end); check(ids.length === beforeFaq.length, `FAQ encore visible dans l'aperçu après 30 s (${ids.length} sections)`); }
        await shot("10-apres-annulation"); return `version ${v} → ${version()}`;
      });
      if (desktop) await step("conflit : modification manuelle entre proposition et accord → refus, la modification manuelle reste", async () => {
        await ensureDesignated();
        await say("Mets le fond de cette section en vert"); await confirmBtn().waitFor();
        const manual = structuredClone(currentTheme(k.pid)!.spec) as unknown as ReturnType<typeof spec>; manual.templates.index.sections[k.section].settings.heading = "Titre humain à préserver";
        saveThemeVersion(k.pid, manual as never, "Modification manuelle fictive", "user"); const v = version();
        await confirmBtn().click();
        await free.getByText(/La cible ou sa version a changé|changé|conflit/i).first().waitFor();
        check(version() === v, "écriture malgré le conflit"); check(spec(k.pid).templates.index.sections[k.section].settings.heading === "Titre humain à préserver", "modification manuelle perdue");
        await shot("11-conflit");
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
  fs.writeFileSync(path.join(out, "RESUME-SITE-GRATUIT-301.json"), JSON.stringify({ schema: "syna301-site-gratuit-recette-1", results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
