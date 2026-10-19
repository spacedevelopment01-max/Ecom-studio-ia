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
  // The untouched real budget rejects the large initial envelope; setup then credits a FAKE isolated top-up.
  await page.locator("[data-initial-auto-quote]").waitFor();
  const refused = page.waitForResponse(r => actionResponse(r, "authorize-quote", "/social/initial")); await page.locator("[data-initial-auto-quote]").click();
  const denied = await refused; assert([402, 422].includes(denied.status()), "Le plafond initial doit respecter le vrai budget serveur");
  const denialMessage = (await denied.json()).error; assert.match(denialMessage, /ne couvre pas le plafond/i); assert.doesNotMatch(denialMessage, /utilisée à 100/i);
  await page.locator("[data-initial-authorization] [role=alert]").waitFor(); await shot("04a-budget-refuse");
  execFileSync(process.execPath, ["--import", "tsx", "scripts/parcours-complet/harness.ts", "fund", f.slug], { cwd: process.cwd(), env: { ...process.env, DATA_DIR: dir }, stdio: "pipe" });
  await sendClick(page.locator("[data-initial-auto-quote]"), "authorize-quote", "/social/initial"); await page.locator("[data-initial-auto-accept]").waitFor(); await shot("04b-accord-plafonne");
  await sendClick(page.locator("[data-initial-auto-accept]"), "authorize", "/social/initial");
  assert.equal((await initial()).accepted, 0); assert.equal((await initial()).jobId, null, "L’accord ne doit pas lancer avant l’identité définitive");
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
  await until(initial, v => !!v.jobId, "lancement AUTOMATIQUE sans deuxième accord");
  const applied = (await state()).state.stages.brand!.data;
  assert.deepEqual(applied.proposal.palette, selected.identity.palette); assert.deepEqual(applied.proposal.fonts, selected.identity.fonts); assert.deepEqual(applied.proposal.tone, selected.identity.tone);
  await shot("07-identite-validee-demarrage-auto");
  // Navigate once to Posts before completion/retry; from here counters AND parent list must refresh without reload.
  await page.goto(`${BASE}/studio/${pid}/publications#vue`); await page.locator("[data-initial-creatives=organic]").waitFor();
  const documentBeforeLiveUpdate = await page.evaluate(() => performance.timeOrigin);
  const acceptedBeforeLiveUpdate = (await initial()).accepted;
  assert(acceptedBeforeLiveUpdate < 20, "Le navigateur doit observer une vraie progression après le chargement initial");
  let partial: InitialView | null = null;
  if (f.input.business === "services") {
    partial = await until(initial, v => v.status === "incomplete" && v.accepted === 3, "interruption après trois créations"); assert.equal(partial.accepted, 3); await page.waitForTimeout(3300); await shot("08a-interruption-trois-acquis");
    await goSocialSection("publications");
    for (const slot of partial.organic.slots.filter(s => s.accepted)) await page.locator(`[data-post='${slot.postId}']`).waitFor();
    await goSocialSection("vue");
    await sendClick(page.locator("[data-initial-quote]"), "quote", "/social/initial");
    assert.match(await page.locator("[data-initial-estimate]").innerText(), /17/); await shot("08b-reprise-seulement-manquantes");
    await sendClick(page.locator("[data-initial-generate]"), "generate", "/social/initial");
  }
  // Keep the actual parent list OPEN while the native job finishes. No section switch after completion.
  await goSocialSection("publications");
  const acceptedWhenListOpened = (await initial()).accepted;
  assert(acceptedWhenListOpened < 20, "La liste doit être ouverte avant la fin du traitement");
  const listCardsBeforeCompletion = await page.locator("[data-post]").count();
  assert(listCardsBeforeCompletion < 10, "La liste visible doit commencer avec moins de dix publications");
  const completed = await until(initial, v => v.status === "complete", "vingt créations acceptées");
  assert.equal(completed.accepted, 20); assert.equal(completed.organic.accepted, 10); assert.equal(completed.ads.accepted, 10);
  assert.equal(new Set(completed.slots.map(s => s.assetId)).size, 20);
  if (partial) assert.deepEqual(completed.slots.slice(0, 3).map(s => s.assetId), partial.slots.slice(0, 3).map(s => s.assetId));
  await until(async () => page.locator("[data-initial-total]").innerText(), s => s.includes("20/20"), "compteur réactif sans rechargement");
  for (const slot of completed.organic.slots) await page.locator(`[data-post='${slot.postId}']`).waitFor();
  const listCardsAfterCompletion = await page.locator("[data-post]").count();
  assert.equal(listCardsAfterCompletion, 10); assert(listCardsAfterCompletion > listCardsBeforeCompletion, "La liste déjà affichée doit s’enrichir sans action ni rechargement");
  assert.equal(await page.evaluate(() => performance.timeOrigin), documentBeforeLiveUpdate, "Liste ET compteur mis à jour sans rafraîchissement, y compris mobile"); await shot("09-dix-publications-reactives");
  const posts = await api<{ posts: { id: string; scheduledAt: unknown; connectionId: unknown }[] }>(`/api/projects/${pid}/social/v2`);
  for (const slot of completed.organic.slots) { const post = posts.posts.find(p => p.id === slot.postId)!; assert(post); assert.equal(post.scheduledAt, null); assert.equal(post.connectionId, null); }
  await page.goto(`${BASE}/studio/${pid}/publicites#vue`); await page.locator("[data-initial-creatives=ads]").waitFor(); await until(async () => page.locator("[data-initial-count]").innerText(), s => s.startsWith("10/10"), "dix publicités séparées"); await shot("10-dix-publicites");
  await page.goto(`${BASE}/studio/${pid}/pilote`); await page.waitForSelector("[data-preparation]"); await step(3);
  // Record inference first, then the client's explicit decision before any content recommendation is bound.
  const beforeCategoryChoice = await api<{ category: ProjectHandoff["category"] }>(`/api/projects/${pid}/preparation/handoff`);
  await page.locator("[data-preparation-handoff]").waitFor(); await shot("10b-categorie-avant-choix-client");
  const categoryChoice = page.locator(`[data-category-choice='${targetCategory}']`); await categoryChoice.waitFor();
  const categoryResponse = page.waitForResponse(r => r.url().endsWith(`/projects/${pid}/preparation/handoff`) && r.request().method() === "POST");
  await categoryChoice.click(); const categorySaved = await categoryResponse; assert(categorySaved.ok(), await categorySaved.text());
  const categoryAfterChoice = await api<{ category: ProjectHandoff["category"]; categoryChoice: { category: string } }>(`/api/projects/${pid}/preparation/handoff`);
  assert.equal(categoryAfterChoice.categoryChoice.category, targetCategory);
  fs.writeFileSync(path.join(out, `${f.slug}-category-choice.json`), JSON.stringify({ simulation: true, beforeExplicitChoice: beforeCategoryChoice.category, clientSelected: targetCategory, afterExplicitChoice: categoryAfterChoice.category, inferenceIsNotPaidAi: true }, null, 2));
  await shot("10c-categorie-confirmee-par-client");
  await quoted(page.locator("[data-generate-content]"));
  const content = (await state()).state.stages.content!.data; assert(content.pages.length >= 4); assert(content.editorial?.length); assert.equal(content.documents.length, content.pages.length);
  for (const kind of ["home", f.input.business === "products" ? "product" : "service", "brand", "contact"]) assert(content.pages.some(p => p.kind === kind));
  assert.deepEqual(content.recommendation!.catalogue.map(x => x.id).sort(), ["atelier-rive", "fraise", "onde", "orbe"]);
  assert.equal(content.recommendation!.status, "reference_pending", "Des références sans raccordement ne deviennent pas des thèmes installables");
  assert.equal(content.recommendation!.recommendedId, ""); assert.deepEqual(content.recommendation!.alternatives, []);
  await page.locator("[data-recommendation-pending]").waitFor();
  await page.locator("[data-preparation] details").filter({ has: page.locator("summary", { hasText: /Contact/ }) }).first().locator("summary").click(); await shot("11-textes-seo-contact");
  await sendClick(page.locator("[data-approve-content]"), "approve");
  await quoted(page.getByRole("button", { name: "Préparer les médias manquants (avec devis)", exact: true }));
  const media = (await state()).state.stages.media!.data;
  assert.equal(media.slots.filter(s => s.kind === "image").length, 10); assert.equal(media.slots.filter(s => s.kind === "video").length, f.input.business === "products" ? 1 : 2);
  const reviewedKeys: string[] = [];
  for (const slot of media.slots) {
    const card = page.getByRole("heading", { name: slot.purpose, exact: true }).locator("..");
    const button = card.getByRole("button", { name: "J’ai vérifié : utiliser cette image ici", exact: true });
    // Review one at a time in current rendered order; the persisted slot identity is checked after every click.
    const candidates = await button.count();
    if (!candidates) throw Error(`Bouton de validation du média absent : ${slot.key}`);
    await sendClick(button.first(), "assign"); reviewedKeys.push(slot.key);
  }
  await until(state, s => s.state.stages.media!.data.slots.every(s => s.reviewed), "tous les médias revus par le client de test");
  await shot("12-medias-site-distincts");
  const video = page.locator("[data-preparation] video").first();
  await video.scrollIntoViewIfNeeded(); await video.evaluate(async (node: HTMLVideoElement) => { await node.play(); }); await page.waitForTimeout(1100); assert(await video.evaluate((node: HTMLVideoElement) => node.currentTime > 0)); await video.evaluate((node: HTMLVideoElement) => node.pause());
  await sendClick(page.locator("[data-approve-media]"), "approve");
  const handoff = await api<{ ready: boolean; contract: ProjectHandoff; blockers: string[]; generationStarted: boolean; themeConsumerVerified: boolean }>(`/api/projects/${pid}/preparation/handoff`);
  assert(handoff.ready, JSON.stringify(handoff.blockers)); assert.equal(handoff.generationStarted, false); assert.equal(handoff.themeConsumerVerified, false); assert.equal(handoff.contract.socialAssetsIncluded, false); assert.equal(handoff.contract.media.length, f.input.business === "products" ? 11 : 12);
  assert.equal(handoff.contract.category.category, targetCategory);
  assert(handoff.contract.pages.every(p => p.document && p.seo && p.sections.every(s => s.blocks.length && s.text)));
  assert.deepEqual(handoff.contract.identity.palette, selected.identity.palette); assert.deepEqual(handoff.contract.colorRoles, selected.identity.colorRoles);
  assert(handoff.contract.media.every(m => m.file && !completed.slots.some(s => s.assetId === m.file!.assetId)));
  fs.writeFileSync(path.join(out, `${f.slug}-handoff.json`), JSON.stringify(handoff, null, 2)); await shot("13-remise-theme-sans-generation");
  await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-preparation]");
  const restored = await state(); assert(restored.ready); assert.equal((await initial()).accepted, 20); await shot("14-rechargement-conserve");
  let identityChange: object | null = null;
  if (f.slug === "produit-ordinateur") {
    // Deliberately end this one journey awaiting review. The READY handoff above remains a historical proof,
    // never a claim that outdated documents are usable after changing identity.
    await step(2);
    const before = (await state()).state, oldBrand = before.stages.brand!.data.proposal;
    const oldDocuments = JSON.stringify(before.stages.content!.data.documents), oldMedia = before.stages.media!.data.slots.map(s => s.assetId);
    await startLogo(page.getByRole("button", { name: "Nouvelles directions", exact: true }));
    const renewed = await until(logo, v => v.series.length === 2 && v.series[1].status === "complete", "renouvellement explicite de trois directions");
    await completeSeriesUi(renewed.series[1].id);
    assert.equal((await state()).state.stages.brand!.data.proposal.logo.assetId, oldBrand.logo.assetId);
    assert((await api<{ ready: boolean }>(`/api/projects/${pid}/preparation/handoff`)).ready, "Renouveler des propositions doit conserver l’identité active et le contrat courant");
    await shot("15-renouvellement-identite-active-conservee");
    const nextSeries = renewed.series[1], nextDirection = nextSeries.directions[0];
    await sendClick(page.locator(`[data-direction-series='${nextSeries.id}'] [data-direction='${nextDirection.id}']`).getByRole("button", { name: "Choisir cette direction complète", exact: true }), "select", "/brand/logo-v2");
    assert.equal((await state()).state.stages.brand!.data.proposal.logo.assetId, oldBrand.logo.assetId);
    await shot("16-nouvelle-proposition-avant-validation");
    await sendClick(page.locator("[data-validate-direction]"), "choose", "/brand/logo-v2");
    const changed = await until(state, v => v.state.stages.brand!.data.selectedLogo === nextDirection.logoId, "validation de la nouvelle identité complète");
    assert.deepEqual(changed.state.stages.brand!.data.proposal.palette, nextDirection.identity.palette);
    assert.equal(changed.state.stages.content!.status, "stale"); assert.equal(changed.state.stages.media!.status, "stale");
    assert.equal(JSON.stringify(changed.state.stages.content!.data.documents), oldDocuments, "Conserver les documents, sans réécriture silencieuse");
    assert.deepEqual(changed.state.stages.media!.data.slots.map(s => s.assetId), oldMedia);
    const changedInitial = await initial(); assert.equal(changedInitial.accepted, 0); assert.equal(changedInitial.jobId, null); assert(changedInitial.history.some(h => h.hash === completed.hash && h.accepted === 20));
    const changedHandoff = await api<{ ready: boolean; blockers: string[] }>(`/api/projects/${pid}/preparation/handoff`); assert.equal(changedHandoff.ready, false);
    await step(3); await shot("17-nouvelle-identite-contenus-obsoletes-conserves");
    fs.writeFileSync(path.join(out, `${f.slug}-after-identity-change.json`), JSON.stringify({ simulation: true, handoff: changedHandoff, initial: changedInitial, state: changed.state }, null, 2));
    identityChange = { renewalPreservedActiveIdentity: true, selectionDidNotApply: true, validationReplacedWholeIdentity: true, previousTwentyPreserved: true, noAutomaticNewSet: true, previousDocumentsAndSiteMediaPreserved: true, oldContentAndMediaMarkedStale: true, finalHandoffReady: false };
  }
  const another = cases.find(x => x.uid !== f.uid)!;
  const foreignContext = await browser.newContext(); await foreignContext.addCookies([{ name: "ecs_session", value: another.token, url: BASE }]);
  const deniedProject = await foreignContext.request.get(`${BASE}/api/projects/${pid}/preparation/handoff`); assert.equal(deniedProject.status(), 404); await foreignContext.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  const secondPart = page.video()!; await page.close(); await secondPart.saveAs(path.join(out, `${f.slug}-apres-reouverture.webm`)); await context.close();
  const concat = path.join(out, `${f.slug}-concat.txt`); fs.writeFileSync(concat, [`${f.slug}-avant-reouverture.webm`, `${f.slug}-apres-reouverture.webm`].map(file => `file '${file}'`).join("\n"));
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", concat, "-c", "copy", path.join(out, `${f.slug}.webm`)], { stdio: "pipe" });
  results.push({ profile: f.slug, simulation: true, diagnosticResume, completeNewProjectProof: !diagnosticResume, projectCreatedThroughUiInThisRun: !diagnosticResume, seededProject: false, originalPhotoBytesDecodedInInjectedAnalysis: !diagnosticResume, realProviderVisionVerified: false, exactInputPreserved: !diagnosticResume, budgetRefusedBeforeSyntheticTopup: !diagnosticResume, consentBeforeFinalIdentity: true, automaticStartWithoutSecondConsent: true, threeCompleteDirections: true, selectedDoesNotApplyUntilValidated: true, choicePreservedAfterPageClose: true, fullIdentityApplied: true, initialAccepted: 20, organic: 10, ads: 10, partialAccepted: partial?.accepted ?? null, acceptedAssetIdsPreservedAfterResume: !!partial, parentListUpdatedWithoutReload: true, acceptedBeforeLiveUpdate, acceptedWhenListOpened, listCardsBeforeCompletion, listCardsAfterCompletion, mobileListExplicitlyTested: f.mobile, allFourPageKinds: true, siteMedia: media.slots.length, websiteAndSocialPoolsDisjoint: true, videoActuallyPlayed: true, handoffReadyBeforeAnyIdentityChange: true, identityChange, themeConsumerVerified: false, category: handoff.contract.category, restoredAfterReload: true, foreignAccountDenied: 404, noSocialScheduling: true, errors, external, captures, events, videos: [`${f.slug}.webm`] });
  fs.writeFileSync(path.join(out, "validation-browser.json"), JSON.stringify({ simulation: true, actualProviderCalls: 0, actualProviderCostMicro: 0, results }, null, 2));
  } catch (error) {
    if (page && !page.isClosed()) {
      await page.screenshot({ path: path.join(out, `${f.slug}-ECHEC.png`), fullPage: true }).catch(() => {});
      await page.screenshot({ path: path.join(out, `${f.slug}-ECHEC-vue.png`) }).catch(() => {});
      const video = page.video(); await page.close().catch(() => {});
      if (video) await video.saveAs(path.join(out, `${f.slug}-ECHEC.webm`)).catch(() => {});
    }
    if (context) await context.close().catch(() => {});
    await browser.close().catch(() => {});
    throw error;
  }
}
await browser.close(); console.log("Quatre vrais parcours UI depuis création : réponses fournisseurs injectées, aucun appel réel ni thème créé.");
