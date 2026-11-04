/**
 * Recette #301 « SYNA complète » — nouvelles fonctions de Codex dans la conversation SYNA du Studio (Encre / Plein cadre,
 * 1440 / 390 px), phrases naturelles d'origine des contrats, rien d'aménagé :
 *  - SEO (#367) : « Remplace le titre SEO de la page d'accueil par « … » » → carte « Retouche SEO gratuite », avant /
 *    après, aucun devis, rien d'écrit avant l'accord → confirmation → reçu, nouvelle version, titre relu dans la page de
 *    la version enregistrée ; « Modifie la métadescription… » → Annuler → rien d'écrit ;
 *  - Pages (#370) : « Ajoute une page « Nos garanties » » → modèles natifs proposés (aperçu) → « Choisir » remplit la
 *    phrase du client, qu'il envoie → proposition → confirmation → page relue dans la version (brouillon) ;
 *  - Sections (#368) : section désignée dans l'aperçu (téléphone : toucher réel, écran tactile) → « Masque cette section » → confirmation → section masquée, seule elle change.
 * Stockage isolé, clés vides, réseau hors boucle locale refusé, 0 appel IA exigé.
 * Usage : npx tsx scripts/syna301-seo-pages-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-seopages301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "seopages301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "CONTEXT", "LOCAL_SITE"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-seo-pages-301");
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
    const ctx = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce", ...(k.format === "telephone" ? { hasTouch: true, isMobile: true } : {}) });
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
      // Ordinateur et téléphone : outil natif « Désigner » de l'aperçu, puis clic (ordinateur) ou toucher réel (téléphone).
      if (true) {
        await closeSyna();
        const tab = page.getByRole("tab", { name: "Aperçu", exact: true }); if (await tab.count()) await tab.click();
        const heading = frame().locator(`[data-es-section="index:${k.section}"]`).getByRole("heading").first();
        await heading.waitFor(); await heading.scrollIntoViewIfNeeded();
        const tools = page.locator("[data-site-tools]"); if (!(await tools.getAttribute("open"))) await tools.locator(":scope > summary").click();
        await page.getByRole("button", { name: "Désigner", exact: true }).click();
        const close = page.getByRole("button", { name: "Fermer les outils", exact: true }); if (await close.isVisible()) await close.click();
        if (desktop) await heading.click(); else await heading.tap(); await panel.waitFor();
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
    const seoCard = panel.getByRole("region", { name: "Retouche SEO gratuite", exact: true }), pagesCard = panel.getByRole("region", { name: "Pages du site — gratuit", exact: true });
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "débordement horizontal");
    const html = async (href: string) => { const r = await page.request.get(origin + href); check(r.ok(), `aperçu ${href} : ${r.status()}`); return r.text(); };
    try {
      await step("Site ouvert dans le mode du compte", async () => {
        await page.goto(`${origin}/studio/${k.pid}/boutique`, { waitUntil: "networkidle", timeout: 180000 });
        await page.locator("#ecs-splash").waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        check((await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell")) === k.mode, "mode");
      });
      const TITLE = `Atelier recette ${k.mode} ${k.format} — accueil`;
      await step("SEO : phrase naturelle → carte gratuite, avant / après, aucun devis, rien d'écrit", async () => {
        const v = version();
        await say(`Remplace le titre SEO de la page d’accueil par « ${TITLE} »`);
        await seoCard.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await seoCard.innerText();
        check(/Gratuit — 0 €/.test(txt) && /Avant/.test(txt) && /Après confirmation/.test(txt) && txt.includes(TITLE) && /Titre SEO/.test(txt), `carte : ${txt}`);
        await noQuote("SEO"); check(version() === v, "écriture avant l'accord"); await noOverflow(); await shot("1-seo-proposition");
        return txt.split("\n").filter((l) => /Page|Avant|Après/.test(l)).join(" | ").slice(0, 200);
      });
      await step("SEO : confirmation gratuite → reçu, nouvelle version, titre relu dans la page enregistrée", async () => {
        const v = version();
        await seoCard.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        const status = seoCard.getByRole("status"); await status.getByText(/Enregistré et relu · reçu/).waitFor();
        check(version() === v + 1, `version ${v} → ${version()}`);
        const href = await status.getByRole("link", { name: "Voir la page" }).getAttribute("href"); check(href, "lien vers la page absent");
        await html(href!);
        const viewer = await ctx.newPage(); await viewer.goto(origin + href!, { waitUntil: "domcontentloaded" }); const title = await viewer.title(); await viewer.close();
        check(title === TITLE || title.startsWith(TITLE), `onglet de la page : « ${title} »`);
        await shot("2-seo-recu"); return `v${v} → v${version()}, <title> ${title.slice(0, 60)}`;
      });
      await step("SEO : métadescription → Annuler → rien d'écrit", async () => {
        const v = version();
        await say("Modifie la métadescription de la page d’accueil par « Description à ne pas garder »");
        await seoCard.getByRole("button", { name: "Annuler", exact: true }).waitFor(); await seoCard.getByText(/Méta-description/).waitFor();
        await seoCard.getByRole("button", { name: "Annuler", exact: true }).click();
        await seoCard.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor({ state: "detached" });
        check(version() === v, "écriture malgré l'annulation");
      });
      await step("Pages : « Ajoute une page » → modèles natifs proposés, aperçu, choix rempli dans la phrase du client", async () => {
        await say("Ajoute une page « Nos garanties »");
        await pagesCard.getByRole("list", { name: "Modèles de page natifs" }).waitFor();
        const items = pagesCard.getByRole("listitem"); const n = await items.count(); check(n > 0, "aucun modèle");
        const pick = (await items.filter({ hasText: /propos/i }).count()) ? items.filter({ hasText: /propos/i }).first() : items.first();
        const name = (await pick.locator("span").first().innerText()).trim();
        const preview = await pick.getByRole("link", { name: "Aperçu" }).getAttribute("href"); check(preview, "aperçu du modèle absent");
        await pick.getByRole("button", { name: "Choisir" }).click();
        const box = panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" });
        check((await box.inputValue()).includes(name), `phrase non remplie : ${await box.inputValue()}`);
        await noQuote("pages ambigu"); await noOverflow(); await shot("3-pages-modeles");
        await panel.getByRole("button", { name: "Enregistrer", exact: true }).click();
        await pagesCard.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor();
        const txt = await pagesCard.innerText(); check(/Nouvelle page/.test(txt) && /Après confirmation/.test(txt), `proposition : ${txt}`);
        await shot("4-pages-proposition"); return `${n} modèles, choisi « ${name} »`;
      });
      await step("Pages : confirmation → reçu, page relue dans la version enregistrée (brouillon)", async () => {
        const v = version();
        await pagesCard.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        const status = pagesCard.getByRole("status"); await status.getByText(/Enregistré et relu · reçu/).waitFor();
        check(version() === v + 1, `version ${v} → ${version()}`);
        const href = await status.getByRole("link", { name: "Voir la page" }).getAttribute("href"); check(href, "lien absent");
        check((await html(href!)).includes("Nos garanties"), "page sans son titre"); await shot("5-pages-recu"); return href!;
      });
      await step("Section : « Masque cette section » → confirmation → seule cette section est masquée", async () => {
        await ensureDesignated();
        const before = structuredClone(spec(k.pid).templates.index), v = version();
        await say("Masque cette section");
        await confirmBtn().waitFor(); const txt = await free.innerText(); check(/masquée/i.test(txt), `carte : ${txt}`);
        await noQuote("masquer"); check(version() === v, "écriture avant l'accord"); await shot("6-masquer-proposition");
        await confirmBtn().click(); await free.getByRole("status").getByText(/Résultat enregistré · version/).waitFor();
        await free.getByText(/Section masquée : elle n’est plus désignée/).waitFor();
        check(!(await free.getByText(/La cible ou sa version a changé/).count()), "alerte de cible changée après un masquage réussi");
        const after = spec(k.pid).templates.index, s = after.sections[k.section] as unknown as { disabled?: boolean };
        check(!after.order.includes(k.section) || s?.disabled === true, "section toujours visible");
        for (const id of before.order) if (id !== k.section) check(JSON.stringify(after.sections[id]) === JSON.stringify(before.sections[id]), `section ${id} modifiée`);
        await noOverflow(); await shot("7-masquer-recu"); return `v${v} → v${version()}`;
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
  fs.writeFileSync(path.join(out, "RESUME-SEO-PAGES-301.json"), JSON.stringify({ schema: "syna301-seo-pages-recette-1", results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length; console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
