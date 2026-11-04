/**
 * Recette #282/#301 — publicité (#345/#347, convergence #348) et bibliothèque de prompts (#344), pilotées depuis SYNA dans
 * la coquille Encre / Plein cadre, ordinateur 1440 px et téléphone 390 px.
 *
 * Parcours publicitaire (créations du moteur V2 générées avec des outils SIMULÉS, aucun appel IA ; le titre est d'abord réduit
 * par le client dans l'éditeur natif, car sur la création brute du moteur l'agrandissement est refusé — limite vérifiée) :
 *   Publicités › Modifier → sélection du titre sur le canevas → « Désigner le titre pour SYNA » → (« Utiliser ce titre
 *   enregistré ») → « Agrandis le titre de la création sélectionnée » → carte gratuite : aperçus avant / après, effets,
 *   « Gratuit — 0 € », aucun devis, aucune écriture → [ordinateur : annulation persistante puis nouvelle proposition,
 *   attente réelle de 17 s] → « Confirmer gratuitement » → tâche native gratuite (worker réel) → reçu « Enregistré et relu ·
 *   version N » → export PNG → rechargement : reçu conservé → base : une seule nouvelle version, titre agrandi et seuls les
 *   calques annoncés déplacés verticalement, aucun nouveau chevauchement. Créations BRUTES du moteur, non aménagées.
 * Bibliothèque de prompts : « Montre ma bibliothèque de prompts » → carte « Lecture seule — 0 € », titres seulement ;
 *   « Exécute le premier prompt » → aucune exécution (aucune tâche, aucun appel).
 *
 * Stockage temporaire isolé, clés vides, réseau hors boucle locale refusé (serveur, worker et navigateur).
 * Usage : npx tsx scripts/syna301-pub-recette.ts <dossier de sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";

if (process.env.DATABASE_FILE || process.env.STORAGE_DIR || process.env.DATA_DIR) throw Error("Refus du stockage préexistant");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-pub301-"));
process.env.DATA_DIR = dir; process.env.STOCK_OFFLINE = "1"; process.env.APP_SECRET = "pub301-" + randomUUID();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
Object.assign(process.env, Object.fromEntries(["LOT_A", "AI", "UI", "SPECIALISTS", "TOOLS", "CONTEXT", "AD_DOCUMENT_LOCAL", "PROMPTS"].map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), { STUDIO_SYNA_SHELL: "1" });
const out = path.resolve(process.argv[2] ?? "work/recette-pub-301");
fs.mkdirSync(out, { recursive: true });

const { account } = await import("../tests/conversation209-fixtures");
const { createProjectWithSubscription } = await import("../src/lib/project-billing");
const { seedImageFixture, seedCutout } = await import("../tests/image-v2-fixtures");
const { mockAdDeps } = await import("../tests/ads-v2-mock");
const { runAdEngineV2 } = await import("../src/lib/ads-v2/engine");
const { runWithLang } = await import("../src/lib/i18n-server");
const { saveAsset, getAsset, assetData } = await import("../src/lib/library");
const { latestDoc } = await import("../src/lib/ad-doc/store");
const { applyOps: applyAdOps } = await import("../src/lib/ad-doc/ops");
const { localAdEdit } = await import("../src/lib/ad-doc/local-edit");
const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
const { emptyInput } = await import("../src/lib/orchestrator/conversation/store");
const { initialize } = await import("../src/lib/preparation/engine");
const { loadProject } = await import("../src/lib/projects");
const { writeSynaPrefs } = await import("../src/lib/syna-ui/prefs-store");
const { id, run, one, all, now } = await import("../src/lib/db");
const { sha256 } = await import("../src/lib/secrets");
const sharp = (await import("sharp")).default;
const { chromium } = await import("playwright");

type Mode = "encre" | "plein";
type Format = "ordinateur" | "telephone";
const CASES: { mode: Mode; format: Format }[] = [
  { mode: "encre", format: "ordinateur" }, { mode: "encre", format: "telephone" },
  { mode: "plein", format: "ordinateur" }, { mode: "plein", format: "telephone" },
];
const SIZE = { ordinateur: { width: 1440, height: 1000 }, telephone: { width: 390, height: 844 } } as const;
const WAIT = 17_000;

type Doc = { layers: { id: string; role: string; kind: string; visible: boolean; locked: boolean; x: number; y: number; w: number; h: number; font?: { size: number } }[]; width: number; height: number };
const prepared: (typeof CASES[number] & { pid: string; cid: string; token: string; docKey: string; docIndex: number; version: number; titleId: string; titleSize: number; expected: string[] })[] = [];
for (const k of CASES) {
  const u = await account();
  const pid = createProjectWithSubscription(u.id, null, () => { const p = seedImageFixture(u.id, "cosmetic"); return { projectId: p, result: p }; });
  const cutId = await seedCutout(u.id, pid);
  const logoPng = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><text x="200" y="82" font-family="sans-serif" font-size="64" font-weight="700" text-anchor="middle" fill="#1a1a1a">ÉCLAT</text></svg>`)).png().toBuffer();
  const logo = await saveAsset({ projectId: pid, userId: u.id, data: logoPng, name: "logo.png", mime: "image/png", role: "logo", origin: "generated" });
  const { deps } = mockAdDeps({ userId: u.id, projectId: pid, cutout: { id: cutId, data: assetData(getAsset(cutId)!) }, logo: { id: logo.id, data: logoPng } });
  await runWithLang({ ui: "fr", content: "fr" }, () => runAdEngineV2(null, pid, { count: 2, platforms: ["meta_feed"] }, deps));
  const docs = all<{ doc_key: string }>("SELECT DISTINCT doc_key FROM ad_documents WHERE project_id=? ORDER BY doc_key", pid);
  // Création éligible : un seul calque titre, texte visible et déverrouillé (limite explicite du contrat #345).
  // #301 v3 : création BRUTE du moteur V2, sans aucun aménagement (correctif #360 de Codex : les calques secondaires
  // déplacés par le moteur natif sont annoncés et montrés avant l'accord). Le moteur local donne la liste attendue.
  let chosen: { key: string; doc: Doc; version: number; expected: string[] } | null = null;
  for (const d of docs) {
    const l = latestDoc(pid, d.doc_key); if (!l) continue;
    const doc = l.doc as unknown as Doc; const titles = doc.layers.filter((x) => x.role === "title");
    if (!(titles.length === 1 && titles[0].kind === "text" && titles[0].visible && !titles[0].locked)) continue;
    const e = localAdEdit(l.doc, "agrandis le titre"); if (!e.local || !e.ops.length) continue;
    const after = applyAdOps(l.doc, e.ops), expected = after.layers.filter((x) => { const o = l.doc.layers.find((y) => y.id === x.id)!; return JSON.stringify(o) !== JSON.stringify(x); }).map((x) => x.id);
    chosen = { key: d.doc_key, doc, version: l.version.version, expected }; break;
  }
  if (!chosen) throw Error(`aucune création à titre unique pour ${k.mode}-${k.format}`);
  console.log(`  · ${k.mode}-${k.format} : création brute ${chosen.key} v${chosen.version}, calques que le moteur natif modifie : ${chosen.expected.join(", ")}`);
  const title = chosen.doc.layers.find((x) => x.role === "title")!;
  // Projet préparé (état Préparation présent) : sinon la conversation le reprend en lecture seule A1, sans outils.
  { const p = loadProject(pid); initialize(pid, { ...emptyInput(), business: p.business, offerName: p.product.name, description: p.product.summary, services: p.services }); }
  const c = openProjectConversation(u, pid);
  const token = id();
  run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(token), u.id, now() + 3600000, now());
  writeSynaPrefs(u.id, "account", null, { mode: k.mode, panel: "collapsed" });
  prepared.push({ ...k, pid, cid: c.id, token, docKey: chosen.key, docIndex: -1, version: chosen.version, titleId: title.id, titleSize: title.font?.size ?? 0, expected: chosen.expected });
}

const port = 5750 + Math.floor(Math.random() * 150), origin = `http://localhost:${port}`;
const guard = `--import=${path.resolve("scripts/lot9/network-guard.mjs")}`;
const env = { ...process.env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: guard };
let log = "";
const spawnLogged = (args: string[]): ChildProcess => { const p = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"], detached: true }); p.stdout!.on("data", (d) => { log += d; }); p.stderr!.on("data", (d) => { log += d; }); return p; };
const server = spawnLogged([path.resolve("node_modules/next/dist/bin/next"), "dev", "-p", String(port), "-H", "127.0.0.1"]);
const worker = spawnLogged(["--import", "tsx", path.resolve("worker/index.ts")]);
const stop = () => { for (const p of [server, worker]) try { process.kill(-p.pid!, "SIGTERM"); } catch { /* arrêté */ } };
process.on("exit", stop);

type Step = { etape: string; ok: boolean; detail?: string; capture?: string };
const results: { mode: Mode; format: Format; steps: Step[]; ok: boolean }[] = [];
const errors: string[] = [], forbidden: string[] = [], jsErrors: string[] = [];
const check = (cond: unknown, message: string) => { if (!cond) throw Error(message); };

try {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > 240000) throw Error("Next non prêt : " + log.slice(-1200));
    try { if ((await fetch(origin + "/connexion", { signal: AbortSignal.timeout(3000) })).ok) break; } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const b = await chromium.launch({ args: ["--no-sandbox", "--disable-background-networking"] });
  for (const k of prepared) {
    const label = `${k.mode}-${k.format}`, steps: Step[] = [], desktop = k.format === "ordinateur";
    const context = await b.newContext({ viewport: SIZE[k.format], locale: "fr-FR", reducedMotion: "reduce" });
    await context.addInitScript(() => { (globalThis as { __name?: unknown }).__name = (t: unknown) => t; try { sessionStorage.setItem("ecsSeen", "1"); } catch { /* */ } });
    await context.addCookies([{ name: "ecs_session", value: k.token, url: origin }]);
    await context.route("**/*", (r) => { if (new URL(r.request().url()).origin === origin) return r.continue(); forbidden.push(r.request().url()); return r.abort(); });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => jsErrors.push(`${label} : ${e.message}`));
    const adConfirms: Record<string, unknown>[] = [];
    page.on("request", (r) => { if (r.method() === "POST" && /\/ad-documents$/.test(new URL(r.url()).pathname) && /"action":"confirm"/.test(r.postData() ?? "")) adConfirms.push(JSON.parse(r.postData()!)); });
    const panel = page.locator("#syna-panel:visible"), card = panel.getByRole("region", { name: "Modification gratuite de la création", exact: true });
    const prompts = panel.getByRole("region", { name: "Bibliothèque de prompts", exact: true });
    const shot = async (name: string) => { const file = `${label}-${name}.png`; await page.screenshot({ path: path.join(out, file) }); return file; };
    const step = async (etape: string, fn: () => Promise<string | void>) => {
      try { const detail = await fn(); steps.push({ etape, ok: true, ...(detail ? { detail } : {}) }); console.log(`  ✓ ${label} · ${etape}${detail ? " — " + detail : ""}`); }
      catch (e) { steps.push({ etape, ok: false, detail: String(e).slice(0, 400), capture: await shot("echec-" + steps.length).catch(() => undefined) }); console.log(`  ✗ ${label} · ${etape} : ${String(e).slice(0, 300)}`); throw e; }
    };
    const openSyna = async () => { if (!(await panel.count())) await page.locator('[aria-controls="syna-panel"]:visible').first().click(); await panel.waitFor(); };
    const send = async (text: string) => { await openSyna(); await panel.getByRole("textbox", { name: "Décrivez votre projet ou posez votre question à SYNA" }).fill(text); await panel.getByRole("button", { name: "Enregistrer", exact: true }).click(); };
    const versions = () => all<{ version: number }>("SELECT version FROM ad_documents WHERE project_id=? AND doc_key=? ORDER BY version", k.pid, k.docKey).map((r) => r.version);
    const noOverflow = async () => check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "débordement horizontal");
    const imgLoaded = (name: string) => card.getByRole("img", { name }).evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
    try {
      await step("Publicités : créations listées, mode du compte appliqué", async () => {
        await page.goto(`${origin}/studio/${k.pid}/publicites#image`, { waitUntil: "networkidle", timeout: 180000 });
        const splash = page.locator("#ecs-splash"); await splash.waitFor({ state: "hidden" }).catch(() => {});
        const nudge = page.locator("[data-tuto-nudge]"); if (await nudge.isVisible()) await nudge.locator("button").last().click();
        const mode = await page.locator("[data-syna-shell]").first().getAttribute("data-syna-shell");
        check(mode === k.mode, `mode ${mode}`);
        await page.getByTestId("edit-creative").first().waitFor();
        await noOverflow();
        await shot("0-publicites");
        return `${await page.getByTestId("edit-creative").count()} création(s)`;
      });
      const designateTitle = async (shotPrefix = "") => {
        const docs = await (await page.request.get(`${origin}/api/projects/${k.pid}/ads/docs`)).json() as { docs: { docKey: string }[] };
        const idx = docs.docs.findIndex((d) => d.docKey === k.docKey); check(idx >= 0, "création introuvable dans la liste native");
        await page.getByTestId("edit-creative").nth(idx).click();
        await page.locator("[data-testid=ad-editor][data-ready='1']").waitFor({ timeout: 120000 });
        const doc = latestDoc(k.pid, k.docKey)!.doc as unknown as Doc, t = doc.layers.find((l) => l.id === k.titleId)!;
        const box = (await page.getByTestId("ad-canvas").boundingBox())!, s = box.width / doc.width;
        await page.mouse.click(box.x + (t.x + t.w / 2) * s, box.y + (t.y + Math.min(t.h, 60) / 2) * s);
        // Téléphone : la zone de demande (et la désignation) est dans la feuille « Plus » de l'éditeur.
        if (!desktop) await page.getByRole("button", { name: "Plus", exact: true }).click();
        const designate = page.getByRole("button", { name: "Désigner le titre pour SYNA", exact: true });
        await designate.waitFor({ timeout: 15000 });
        await shot(shotPrefix + "1-editeur-titre");
        await designate.click();
        await panel.waitFor();
        // Contrat #347 : la désignation partagée est confirmée explicitement dans la conversation.
        const use = panel.getByRole("button", { name: "Utiliser ce titre enregistré", exact: true });
        await use.waitFor({ timeout: 90000 });
        await use.click();
        await panel.getByText("Titre enregistré désigné. Vous pouvez demander sa retouche gratuite.", { exact: true }).waitFor();
      };
      await step("éditeur : titre sélectionné, « Désigner le titre pour SYNA »", async () => {
        await designateTitle();
        await shot("2-titre-designe");
      });
      const propose = async () => {
        await send("Agrandis le titre de la création sélectionnée");
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor({ timeout: 60000 });
      };
      await step("proposition : aperçus avant / après, Gratuit — 0 €, aucun devis, aucune écriture", async () => {
        const before = versions();
        await propose();
        const txt = await card.innerText();
        check(/Gratuit — 0 €/.test(txt) && /Aucun appel IA ni publication/.test(txt), `carte incomplète : ${txt.slice(0, 300)}`);
        await card.getByRole("img", { name: "Création avant modification" }).waitFor();
        await card.getByRole("img", { name: "Aperçu exact après confirmation" }).waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("#syna-panel img")].every((i) => i.complete));
        check(await imgLoaded("Création avant modification") && await imgLoaded("Aperçu exact après confirmation"), "aperçus non chargés");
        check(!(await panel.getByRole("button", { name: "Voir le devis de la réponse de SYNA" }).count()), "bouton de devis pour un acte gratuit");
        check(JSON.stringify(versions()) === JSON.stringify(before), "écriture avant l'accord");
        // Calques secondaires : annoncés avant l'accord, jamais « seul le titre » si d'autres bougent.
        const secondary = k.expected.filter((id) => id !== k.titleId);
        if (secondary.length) check(/ajustement supplémentaire/.test(txt) && /ajuste aussi les calques/.test(txt), "calques secondaires non annoncés avant accord");
        await noOverflow();
        await shot("3-proposition");
        return txt.split("\n").filter((l) => /Avant :|Après confirmation :/.test(l)).join(" | ").slice(0, 200);
      });
      if (desktop) {
        await step("annulation : aucune écriture, état conservé au rechargement", async () => {
          const before = versions();
          await card.getByRole("button", { name: "Annuler", exact: true }).click();
          await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).waitFor({ state: "detached" });
          check(JSON.stringify(versions()) === JSON.stringify(before), "écriture malgré l'annulation");
          await page.reload({ waitUntil: "networkidle" }); await openSyna();
          check(!(await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).count()), "proposition annulée ressuscitée au rechargement");
          const etat = (await card.innerText().catch(() => "")).match(/État du reçu : [^\n]*/)?.[0] ?? "";
          check(!/cancelled|stale|queued|running|failed/.test(etat), `état technique affiché au client : ${etat}`);
          await shot("4-annulation");
        });
        await step("nouvelle proposition, attente réelle de 17 s, la confirmation reste possible", async () => {
          // Après rechargement hors de l'éditeur, le client reprend le repère sauvegardé puis confirme la désignation.
          const resume = panel.getByRole("button", { name: /^Reprendre le repère sauvegardé/ });
          if (await resume.isVisible({ timeout: 5000 }).catch(() => false)) await resume.click();
          const use = panel.getByRole("button", { name: "Utiliser ce titre enregistré", exact: true });
          // Le bouton n'apparaît que si la désignation affichée diffère du repère sauvegardé (sinon elle est déjà valide).
          if (await use.isVisible({ timeout: 8000 }).catch(() => false)) { await use.click(); await use.waitFor({ state: "detached" }).catch(() => {}); }
          await panel.getByText(/Titre de création désigné/).first().waitFor({ timeout: 15000 });
          await shot("4b-repere-repris");
          await propose();
          await page.waitForTimeout(WAIT);
          check(await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).isEnabled(), "confirmation désactivée après 17 s");
          await shot("5-apres-17s");
        });
      }
      await step("confirmation : tâche gratuite, reçu relu, export PNG", async () => {
        const before = versions();
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · version/).waitFor({ timeout: 120000 });
        const after = versions();
        check(after.length === before.length + 1, `versions ${before} → ${after}`);
        const href = await card.getByRole("link", { name: "Exporter cette version PNG" }).getAttribute("href");
        check(href, "lien d'export absent");
        const r = await page.request.get(origin + href!);
        check(r.ok() && (r.headers()["content-type"] ?? "").includes("image/png") && (await r.body()).length > 1000, `export ${r.status()} ${r.headers()["content-type"]}`);
        await noOverflow();
        await shot("6-recu");
        return `versions ${before.at(-1)} → ${after.at(-1)}, PNG ${(await r.body()).length} octets`;
      });
      await step("base : titre agrandi, seuls les calques annoncés ont bougé (position verticale), aucun nouveau chevauchement", async () => {
        const rows = all<{ version: number; doc_json: string }>("SELECT version, doc_json FROM ad_documents WHERE project_id=? AND doc_key=? ORDER BY version DESC LIMIT 2", k.pid, k.docKey);
        const [n, o] = rows.map((r) => JSON.parse(r.doc_json) as Doc);
        const tn = n.layers.find((l) => l.id === k.titleId)!, to = o.layers.find((l) => l.id === k.titleId)!;
        check((tn.font?.size ?? 0) > (to.font?.size ?? 0), `taille ${to.font?.size} → ${tn.font?.size}`);
        const moved = n.layers.filter((l) => JSON.stringify(l) !== JSON.stringify(o.layers.find((x) => x.id === l.id))).map((l) => l.id);
        check(JSON.stringify(moved.sort()) === JSON.stringify([...k.expected].sort()), `calques modifiés ${moved} ≠ annoncés ${k.expected}`);
        for (const id of moved.filter((m) => m !== k.titleId)) { const a = n.layers.find((l) => l.id === id) as Record<string, unknown>, b = o.layers.find((l) => l.id === id) as Record<string, unknown>; check(Object.keys(a).every((key) => key === "y" || key === "userEdited" || JSON.stringify(a[key]) === JSON.stringify(b[key])), `${id} : autre chose que la position verticale`); }
        const boxes = (d: Doc) => d.layers.filter((l) => l.visible && (l.kind === "text" || l.kind === "button")), hit = (a: Doc["layers"][number], b: Doc["layers"][number]) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const pairs = (d: Doc) => { const r = new Set<string>(); const bx = boxes(d); bx.forEach((a, i) => bx.slice(i + 1).forEach((b) => { if (hit(a, b)) r.add(a.id + "|" + b.id); })); return r; };
        const before = pairs(o), added = [...pairs(n)].filter((x) => !before.has(x));
        check(!added.length, `nouveaux chevauchements : ${added}`);
        return `taille du titre ${to.font?.size} → ${tn.font?.size} ; calques modifiés : ${moved.join(", ")} ; nouveaux chevauchements : 0`;
      });
      await step("rechargement : reçu et version conservés", async () => {
        await page.reload({ waitUntil: "networkidle" }); await openSyna();
        await card.getByRole("status").getByText(/Enregistré et relu · version/).waitFor();
        await shot("7-apres-rechargement");
      });
      await step("ancien accord resté en mémoire + rechargement : seule la nouvelle proposition est confirmée", async () => {
        const stale = adConfirms.at(-1); check(stale?.proposalId, "corps de confirmation non relevé");
        const key = `syna-free-ad-document:${k.cid}`;
        await page.evaluate(([kk, v]) => sessionStorage.setItem(kk, v), [key, JSON.stringify(stale)] as const);
        await page.reload({ waitUntil: "networkidle" });
        // Après un reçu, l'ancien repère vise une version dépassée : le client désigne de nouveau le titre dans l'éditeur.
        await designateTitle("8a-");
        const before = versions(), sentBefore = adConfirms.length;
        await propose();
        await card.getByRole("button", { name: "Confirmer gratuitement", exact: true }).click();
        await card.getByRole("status").getByText(/Enregistré et relu · version/).waitFor({ timeout: 120000 });
        const sent = adConfirms.slice(sentBefore);
        check(sent.length === 1 && sent[0].proposalId !== stale!.proposalId && sent[0].requestId !== stale!.requestId, `envois : ${JSON.stringify(sent)}`);
        check(versions().length === before.length + 1, `versions ${before} → ${versions()}`);
        await shot("8-ancien-accord-ecarte"); return `envoyé ${sent[0].proposalId}, ancien ${stale!.proposalId} écarté`;
      });
      await step("bibliothèque de prompts : lecture seule, aucune exécution", async () => {
        const jobs = one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE project_id=?", k.pid)!.n;
        await send("Montre ma bibliothèque de prompts");
        await prompts.getByText("Lecture seule — 0 €", { exact: true }).waitFor();
        const txt = await prompts.innerText();
        check(/aucun prompt n’est exécuté/.test(txt), "mention de lecture seule absente");
        check(!(await prompts.getByRole("button").count()), "bouton d'action dans la bibliothèque en lecture seule");
        await shot("8-prompts");
        await send("Exécute le premier prompt de ma bibliothèque");
        await page.waitForTimeout(1500);
        check(one<{ n: number }>("SELECT COUNT(*) n FROM jobs WHERE project_id=?", k.pid)!.n === jobs, "une tâche a été lancée");
        return (txt.match(/(\d+) affichés sur (\d+)/)?.[0] ?? "liste vide") + " ; exécution refusée (aucune tâche)";
      });
    } catch (e) { errors.push(`${label} : ${String(e).slice(0, 300)}`); }
    results.push({ mode: k.mode, format: k.format, steps, ok: steps.length > 0 && steps.every((s) => s.ok) });
    await context.close();
  }
  await b.close();
  const calls = one<{ n: number }>("SELECT COUNT(*) n FROM ai_calls")!.n;
  console.log(`· appels IA : ${calls} · requêtes refusées hors boucle locale : ${forbidden.length} · erreurs JS : ${jsErrors.length}`);
  if (calls) errors.push(`ai_calls = ${calls}`);
  if (jsErrors.length) errors.push(...jsErrors);
} catch (e) {
  errors.push(String(e));
  console.error("✗ " + String(e));
} finally {
  stop();
  fs.writeFileSync(path.join(out, "RESUME-PUB-301.json"), JSON.stringify({ schema: "syna301-pub-recette-1", results, errors, forbidden: [...new Set(forbidden)], coutIA: 0 }, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "serveur-local.log"), log.slice(-200000));
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = results.filter((r) => r.ok).length;
  console.log(`${ok}/${results.length} parcours réussis`);
  if (errors.length || ok !== results.length) process.exitCode = 1;
}
