/** Four browser journeys FROM NEW PROJECT CREATION. Isolated provider answers, never real creative output. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium, type Page, type BrowserContext, type Locator, type Response } from "playwright";
import { BASE } from "./cases";
import type { Input, State, ReadyContract } from "../../src/lib/preparation/types";
import type { initialCreativesView } from "../../src/lib/social-v2/initial";
import type { DirectionSeries } from "../../src/lib/logo-v2/direction-series";
import type { ProjectHandoff } from "../../src/lib/project-handoff/contract";
const dir = path.resolve(process.argv[2] || "");
if (!path.isAbsolute(dir) || !path.basename(dir).startsWith("ecs-parcours-test-")) throw Error("Dossier de preuve isolé requis.");
const cases: { uid: string; token: string; slug: string; mobile: boolean; input: Input }[] = JSON.parse(fs.readFileSync(path.join(dir, "private.json"), "utf8"));
const seed = JSON.parse(fs.readFileSync(path.join(dir, "seed-public.json"), "utf8"));
assert.equal(seed.projectCountAfterSeed, 0, "Le harnais ne doit pas précompléter de projet.");
const out = path.join(dir, "browser"); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] });
type PreparationView = { state: State; ready: ReadyContract | null; blockers: string[] };
type InitialView = NonNullable<ReturnType<typeof initialCreativesView>>;
const results: object[] = [];
const diagnosticResume = process.env.PARCOURS_DIAGNOSTIC_RESUME === "1";
if (diagnosticResume && !process.env.PARCOURS_CASE) throw Error("La reprise de diagnostic exige PARCOURS_CASE ; elle n’est jamais une preuve finale neuve.");

for (const f of cases) {
  if (process.env.PARCOURS_CASE && process.env.PARCOURS_CASE !== f.slug) continue;
  const size = { width: f.mobile ? 390 : 1440, height: f.mobile ? 844 : 1000 };
  const targetCategory = f.input.business === "services" ? "services" : f.slug === "produit-mobile" ? "specialized" : "ecommerce";
  let context!: BrowserContext, page!: Page, pid = "", navigations = 0;
  const errors: string[] = [], external: string[] = [], captures: string[] = [], events: object[] = [];
  const boot = async (record = true) => {
    context = await browser.newContext({ viewport: size, isMobile: f.mobile, hasTouch: f.mobile, locale: "fr-FR", reducedMotion: "reduce", ...(record ? { recordVideo: { dir: out, size } } : {}) });
    await context.addCookies([{ name: "ecs_session", value: f.token, url: BASE }, { name: "ecs-lang", value: "fr", url: BASE }]);
    await context.addInitScript({ content: `globalThis.__name=fn=>fn;localStorage.setItem('ecs-lang','fr');sessionStorage.setItem('ecsSeen','1');function markProof(){if(!document.body||document.getElementById('parcours-proof'))return;const el=document.createElement('div');el.id='parcours-proof';el.textContent='PARCOURS UI — FOURNISSEURS ET VERDICTS SIMULÉS — AUCUN COÛT RÉEL';el.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#704b16;color:#fff;padding:8px;text-align:center;font:12px sans-serif;pointer-events:none';document.body.append(el);}addEventListener('DOMContentLoaded',markProof);setInterval(markProof,500);` });
    await context.route("**/*", route => { const u = new URL(route.request().url()); if (["localhost", "127.0.0.1"].includes(u.hostname) || ["data:", "blob:"].includes(u.protocol)) return route.continue(); external.push(u.hostname); return route.abort(); });
    page = await context.newPage(); page.setDefaultTimeout(60_000); page.setDefaultNavigationTimeout(60_000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
    page.on("dialog", dialog => dialog.accept());
  };
  try {
  await boot();
  const api = async <T,>(route: string): Promise<T> => { const response = await context.request.get(BASE + route); assert(response.ok(), `GET ${route}: ${response.status()}`); return response.json(); };
  const state = () => api<PreparationView>(`/api/projects/${pid}/preparation`);
  const initial = async () => (await api<{ initial: InitialView }>(`/api/projects/${pid}/social/initial`)).initial;
  const logo = () => api<{ series: DirectionSeries[]; applied: string | null; rights: { used: number }; selection: { logoId: string; status: string } }>(`/api/projects/${pid}/brand/logo-v2`);
  async function until<T>(read: () => Promise<T>, test: (value: T) => boolean, description: string, timeout = 90_000): Promise<T> {
    const end = Date.now() + timeout; let last: T;
    do { last = await read(); if (test(last)) return last; await page.waitForTimeout(350); } while (Date.now() < end);
    throw Error(`Attente expirée : ${description}. Dernier état : ${JSON.stringify(last!) .slice(0, 1600)}`);
  }
  async function idle(expectFailure = false) {
    const value = await until(state, s => !s.state.pending, "fin de la tâche de préparation");
    if (!expectFailure && value.state.error) throw Error(value.state.error.message);
    await page.waitForTimeout(500); return value;
  }
  async function completeSeriesUi(seriesId: string) {
    const rendered = page.locator(`[data-direction-series='${seriesId}']`);
    await rendered.waitFor();
    await until(async () => ({ text: await rendered.innerText(), cards: await rendered.locator("[data-direction]").count() }), value => /3\/3/.test(value.text) && value.cards === 3, "série affichée complète : libellé 3/3 et trois cartes réelles");
    for (const card of await rendered.locator("[data-direction]").all()) await card.waitFor({ state: "visible" });
  }
  async function shot(suffix: string) {
    const dismiss = page.locator("[data-tuto-nudge]").getByRole("button", { name: "Masquer", exact: true }); if (await dismiss.count()) await dismiss.click();
    await page.evaluate(async () => { await document.fonts.ready; for (const image of document.images) { image.loading = "eager"; await image.decode().catch(() => {}); } });
    const file = `${f.slug}-${suffix}`; await page.screenshot({ path: path.join(out, file + ".png"), fullPage: true }); await page.screenshot({ path: path.join(out, file + "-vue.png") });
    captures.push(file + ".png", file + "-vue.png");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${file} : débordement horizontal`);
    console.log(`PREUVE ${file}`);
  }
  const actionResponse = (r: Response, action: string, suffix = "/preparation") => r.url().endsWith(`/projects/${pid}${suffix}`) && r.request().method() === "POST" && r.request().postDataJSON()?.action === action;
  async function sendClick(locator: Locator, action: string, suffix = "/preparation") {
    const response = page.waitForResponse(r => actionResponse(r, action, suffix)); await locator.click(); const r = await response; const body = await r.json(); assert(r.ok(), JSON.stringify(body)); return body;
  }
  async function quoted(locator: Locator, expectFailure = false) {
    const quotation = page.waitForResponse(r => actionResponse(r, "quote"));
    const generation = page.waitForResponse(r => actionResponse(r, "generate")); void generation.catch(() => {});
    await locator.click(); const r = await quotation, body = await r.json(); assert(r.ok(), JSON.stringify(body));
    if (body.quote.paid) await page.getByRole("dialog", { name: "Confirmer cet essai", exact: true }).getByRole("button", { name: "Confirmer cet essai", exact: true }).click();
    const generated = await generation; assert(generated.ok(), await generated.text()); return idle(expectFailure);
  }
  async function startLogo(locator: Locator) {
    const quote = page.waitForResponse(r => actionResponse(r, "quote", "/brand/logo-v2"));
    const started = page.waitForResponse(r => actionResponse(r, "generate", "/brand/logo-v2")); void started.catch(() => {});
    await locator.click(); const checked = await quote; assert(checked.ok(), `Devis logo HTTP ${checked.status()} : ${await checked.text()}`);
    const queued = await started; assert(queued.ok(), `Génération logo HTTP ${queued.status()} : ${await queued.text()}`);
  }
  const step = async (index: number) => { await page.locator("[data-preparation] ol").first().locator("button").nth(index).click(); await page.waitForTimeout(250); };
  const goSocialSection = async (section: "publications" | "vue") => {
    if (f.mobile) await page.getByRole("combobox", { name: "Rubrique", exact: true }).selectOption(section);
    else await page.locator(`[data-section='${section}']`).click();
  };

  if (!diagnosticResume) {
  // ZERO seeded projects: the native form, native POST, attachment save and native preparation initialization.
  const empty = await api<{ projects: object[] }>("/api/projects"); assert.equal(empty.projects.length, 0);
  await page.goto(BASE + "/studio", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[name=businessType]", { state: "attached" });
  if (f.input.business === "services") await page.getByRole("radio", { name: /Le site de mon entreprise de services/ }).click();
  await page.locator("#description").fill(f.input.description); await page.locator("#target").fill(f.input.target); await page.locator("#request").fill(f.input.constraints);
  await page.locator("input[name=photos]").setInputFiles(path.join(dir, "photo-test.png"));
  if (f.input.business === "products") {
    await page.getByRole("button", { name: "Nom, marque, prix, logo…", exact: true }).click();
    await page.locator("#productName").fill(f.input.offerName); await page.locator("#brandName").fill(f.input.brandName); await page.locator("#price").fill(f.input.price);
  } else for (const [index, service] of f.input.services.services.entries()) {
    if (index) await page.getByRole("button", { name: "Ajouter une prestation", exact: true }).click();
    await page.locator(`#new-svc-name-${index}`).fill(service.name);
    await page.getByLabel(`Prestation ${index + 1} : description`, { exact: true }).fill(service.description || "");
  }
  await shot("01-description-photo");
  const created: Promise<Response> = page.waitForResponse(r => new URL(r.url()).pathname === "/api/projects" && r.request().method() === "POST");
  await page.getByRole("button", { name: "Préparer mon projet", exact: true }).click();
  const creation: Response = await created, creationBody: { id: string; jobId: string | null } = await creation.json(); assert(creation.ok(), JSON.stringify(creationBody)); pid = creationBody.id;
  assert.equal(creationBody.jobId, null, "L’enregistrement du projet n’attend aucune génération");
  await page.waitForURL(`**/studio/${pid}/pilote`); await page.waitForSelector("[data-brief-name]");
  assert.equal((await state()).state.stages.brief!.data.input.photoIds.length, 1);
  await page.locator("[data-brief-name]").fill(f.input.offerName);
  if (f.input.business === "services") {
    for (const [name, value] of [["E-mail", f.input.services.email], ["Téléphone", f.input.services.phone], ["Zone ou adresse", f.input.services.area]] as const) if (value) await page.getByRole("textbox", { name, exact: true }).fill(value);
    await page.getByRole("combobox", { name: "Prochaine étape pour vos visiteurs", exact: true }).selectOption(f.input.services.contactMode);
  }
  await sendClick(page.locator("[data-save-brief]"), "edit-brief");
  const savedInput = (await state()).state.stages.brief!.data.input;
  assert.equal(savedInput.description, f.input.description); assert.equal(savedInput.target, f.input.target); assert.equal(savedInput.constraints, f.input.constraints);
  await quoted(page.getByRole("button", { name: "Analyser mes informations et mes photos par l’IA", exact: true }));
  assert.equal((await state()).state.stages.brief!.data.provenance, "simulation"); await shot("02-comprehension");
  await sendClick(page.locator("[data-approve-brief]"), "approve");
  await page.getByRole("textbox", { name: "Références, un lien par ligne", exact: true }).fill(f.input.referenceUrls.join("\n"));
  await sendClick(page.getByRole("button", { name: "Enregistrer ces références", exact: true }), "references");
  if (f.slug === "produit-ordinateur") {
    await page.getByRole("textbox", { name: "Défaut précis à corriger pour un nouvel essai", exact: true }).fill("[TEST_ECHEC_FOURNISSEUR] Vérifier une panne, sans relance et sans perte de la photo.");
    const failed = await quoted(page.locator("[data-generate-research]"), true); assert.match(failed.state.error!.message, /ÉCHEC FOURNISSEUR SIMULÉ/); assert.equal(failed.state.stages.brief!.status, "approved"); await shot("03a-echec-conserve");
    await page.getByRole("textbox", { name: "Défaut précis à corriger pour un nouvel essai", exact: true }).fill("Reprendre cette recherche sur les références de test après la panne simulée.");
  }
  await quoted(page.locator("[data-generate-research]"));
  await page.getByRole("textbox", { name: "Défaut précis à corriger pour un nouvel essai", exact: true }).fill("");
  const researched = (await state()).state.stages.research!.data;
  await page.locator(`input[name=strategy][value='${researched.recommendedId}']`).check(); await shot("03-recherche-strategie");
  await sendClick(page.locator("[data-approve-research]"), "approve");
  execFileSync(process.execPath,["--import","tsx","scripts/parcours-complet/harness.ts","fund",f.slug],{cwd:process.cwd(),env:{...process.env,DATA_DIR:dir},stdio:"pipe"});
  await quoted(page.locator("[data-generate-brand]")); await page.locator("[data-brand-name]").fill(f.input.brandName); await sendClick(page.locator("[data-confirm-identity]"), "identity");
  // Same native logo form as the Logo tab. Browser accepts the displayed quote, provider responses are injected.
  await startLogo(page.getByRole("button", { name: "Créer les directions", exact: true }));
  } else {
    const existing = await api<{ projects: { id: string }[] }>("/api/projects"); assert.equal(existing.projects.length, 1);
    pid = existing.projects[0].id;
    await page.goto(`${BASE}/studio/${pid}/pilote`); await page.waitForSelector("[data-preparation]"); await step(2);
    console.log("DIAGNOSTIC UNIQUEMENT : reprise d’un parcours interrompu, pas une réception finale depuis création.");
  }
  const directions = await until(logo, value => value.series.some(s => s.status === "complete" && s.directions.length === 3), "trois directions entières");
  const series = directions.series.at(-1)!;
  assert.equal(new Set(series.directions.map(d => d.logoId)).size, 3); assert.equal(new Set(series.directions.map(d => d.identity.signature)).size, 3);
  assert.equal(series.name, f.input.brandName); await completeSeriesUi(series.id); await shot("05-trois-directions");
  const selected = series.directions[f.mobile ? 2 : 1];
  await sendClick(page.locator(`[data-direction-series='${series.id}'] [data-direction='${selected.id}']`).getByRole("button", { name: "Choisir cette direction complète", exact: true }), "select", "/brand/logo-v2");
  assert.notEqual((await logo()).applied, selected.logoId, "Choisir ne remplace pas encore l’identité active"); await shot("06-proposition-non-active");
  // Close the real page and reopen it BEFORE validation: the pending choice is persisted, not component state.
  const firstPart = page.video()!; await page.close(); await firstPart.saveAs(path.join(out, `${f.slug}-avant-reouverture.webm`));
  page = await context.newPage(); page.setDefaultTimeout(60_000); page.on("pageerror", e => errors.push(e.message)); page.on("dialog", d => d.accept());
  page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
  await page.goto(`${BASE}/studio/${pid}/pilote`); await page.waitForSelector("[data-preparation]"); await step(2); await page.locator("[data-validate-direction]").waitFor();
  assert.equal((await logo()).selection.logoId, selected.logoId); assert.equal((await initial()).jobId, null);
  await sendClick(page.locator("[data-validate-direction]"), "choose", "/brand/logo-v2");
  await until(state, v => v.state.stages.brand?.status === "approved", "validation complète et kit local");

  const applied = (await state()).state.stages.brand!.data;
  assert.deepEqual(applied.proposal.palette, selected.identity.palette); assert.deepEqual(applied.proposal.fonts, selected.identity.fonts); assert.deepEqual(applied.proposal.tone, selected.identity.tone);
  await shot("07-identite-validee-demarrage-auto");

  await page.goto(`${BASE}/studio/${pid}/pilote`);await page.waitForSelector('[data-preparation]');await step(3);
  await quoted(page.locator('[data-generate-content]'));await sendClick(page.locator('[data-approve-content]'),'approve');
  const {verifyBeginnerVideoUi}=await import('../video-beginners/ui-case');
  const videoResult=await verifyBeginnerVideoUi({page,context,pid,base:BASE,out,slug:f.slug,mobile:f.mobile});
  await shot('video-fin');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const video=page.video()!;await page.close();await video.saveAs(path.join(out,`${f.slug}-video.webm`));await context.close();
  results.push({profile:f.slug,simulation:true,projectCreatedThroughUi:!diagnosticResume,diagnosticResume,...videoResult,errors,external,captures});
  fs.writeFileSync(path.join(out,'validation-video-beginners.json'),JSON.stringify({actualProviderCalls:0,actualProviderCostMicro:0,results},null,2));
  } catch(error){if(page&&!page.isClosed()){await page.screenshot({path:path.join(out,`${f.slug}-ECHEC.png`),fullPage:true}).catch(()=>{});const video=page.video();await page.close();if(video)await video.saveAs(path.join(out,`${f.slug}-ECHEC.webm`));}if(context)await context.close();await browser.close();throw error;}
}
await browser.close();console.log('Quatre parcours vidéo initiale et ultérieure depuis création : simulations fournisseurs, encodage réel.');
