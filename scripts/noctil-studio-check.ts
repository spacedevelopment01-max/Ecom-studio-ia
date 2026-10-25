/** NOCTIL (maquettes du 23 octobre, PR #167) : preuve d'édition depuis l'interface réelle du studio (Next.js en
 * développement, base temporaire, aucune IA, aucun réseau).
 *  1. La galerie « Boutique spécialisée » propose chaque composition NOCTIL avec un aperçu réel.
 *  2. Le produit en surplomb de l'accueil est réglé dans le panneau « Réglages » : taille et débordement modifiés, l'aperçu
 *     suit (le produit remonte davantage sur la photo d'ouverture).
 *  3. Un second « Produit en surplomb » est ajouté depuis la galerie en bas de page (après les questions) : il ne déborde
 *     pas sur la section du dessus ; il est dupliqué et déplacé ; après rechargement complet, tout est conservé.
 *  4. Un projet client fictif, avec son propre produit détouré (dessin d'essai à fond transparent, créé pour ce contrôle),
 *     est habillé en NOCTIL : son détourage remonte sur sa propre photo d'ouverture ; aucune photo, aucun texte, aucun
 *     prix de la démonstration.
 *
 *   npx tsx scripts/noctil-studio-check.ts <dossier-captures>      (VIDEO_DIR=<dossier> : vidéo du parcours)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { chromium, type Page, type FrameLocator } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-noctil-studio-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/noctil-studio"); fs.mkdirSync(out, { recursive: true });
/** Compositions des maquettes : fonction de la galerie, disposition, sélecteur attendu dans l'aperçu. */
const GALLERY = [
  ["Présentation principale", "night", ".cv-banner--night"],
  ["Présentation principale", "dark-right", ".cv-banner--veil-right"],
  ["Achat et offres", "rise", ".cv-rise--auto"],
  ["Achat et offres", "rise-final", ".cv-rise--media-right"],
  ["Bénéfices du produit", "row", "[data-layout='row']"],
  ["Détails du produit", "columns-carousel", ".cv-cards--mcarousel"],
  ["Situations d'utilisation", "grid-carousel", ".cv-gallery--mcarousel"],
  ["Histoire de la marque", "journal-pages", ".fs-journal--grid"],
  ["Histoire de la marque", "journal-list", ".fs-journal--list"],
  ["Questions fréquentes", "pair", ".es-faq--pair"],
  ["Questions fréquentes", "topic-titles", ".es-faq__topic"],
  ["Contact", "form-subject", "select[name='contact[subject]']"],
] as const;
const PORT = 3600 + Math.floor(Math.random() * 300), origin = `http://127.0.0.1:${PORT}`;
const { demoProject } = await import("../tests/demo-fixtures");
const { clientFixture } = await import("../tests/mission154-fixtures");
const { createUser } = await import("../src/lib/auth"); const { saveThemeVersion, currentTheme } = await import("../src/lib/projects"); const { runWithLang } = await import("../src/lib/i18n-server");
const { buildShop } = await import("../src/lib/engine/shop");
const { saveAsset } = await import("../src/lib/library");
const password = "noctil-" + Math.random().toString(36).slice(2), email = "noctil-studio@example.invalid";
const user = await createUser(email, password, "Vérification NOCTIL");
const fr = <T,>(fn: () => T) => runWithLang({ content: "fr", ui: "fr" }, fn);
const f = await fr(() => demoProject(user.id, "noctil"));
saveThemeVersion(f.pid, f.spec, "Démonstration NOCTIL — vérification de l'édition", "user");
const { run } = await import("../src/lib/db");
const plan = process.env.CHECK_PLAN ?? "dominer";
run("INSERT INTO subscriptions (user_id,status,plan,owner_user_id,project_id,source,created_at,updated_at) VALUES (?,'active',?,?,?,'admin',?,?)", `noctil-check-${f.pid}`, plan, user.id, f.pid, Date.now(), Date.now());
// Projet client fictif (théière Anse) avec SON produit détouré : dessin d'essai à fond transparent créé pour ce contrôle
// (aucune IA, aucune image de la démonstration), rangé comme un détourage du client.
const client = await clientFixture({ brand: "Céramor" });
const cut = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900"><path d="M250 330 Q450 250 650 330 L640 640 Q450 720 260 640 Z" fill="#325d67"/><path d="M640 400 Q790 420 760 540 Q740 600 640 600" fill="none" stroke="#325d67" stroke-width="42"/><path d="M260 420 L130 330" stroke="#325d67" stroke-width="44" stroke-linecap="round"/><ellipse cx="450" cy="300" rx="150" ry="34" fill="#2a4f58"/><circle cx="450" cy="250" r="30" fill="#2a4f58"/></svg>`)).png().toBuffer();
const cutTop = await (async () => { const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * info.channels + 3] > 24) return y / info.height; return 0; })();
const cutAsset = await saveAsset({ projectId: client.pid, userId: client.user.id, data: cut, name: "theiere-anse-detouree.png", mime: "image/png", origin: "upload", role: "cutout", status: "approved", meta: { width: 900, height: 900, alt: "Théière Anse détourée (dessin d'essai du contrôle)" } });
await fr(() => buildShop(null, client.pid, { direction: "noctil", useAi: false }));
const clientTheme = currentTheme(client.pid)!, clientSpec = clientTheme.spec;
assert.equal(clientSpec.direction, "noctil");
const clientRise = Object.values(clientSpec.templates.index.sections).find((s) => s.type === "cv-rise");
assert.ok(clientRise, "section « Produit en surplomb » dans l'accueil du client");
assert.equal(clientRise!.settings.overlap, "auto", "débordement actif avec le détourage du client");
assert.ok(String(clientRise!.settings.image_asset).length > 0 && clientSpec.files[String(clientRise!.settings.image_asset)] === cutAsset.id, `détourage du client utilisé (${clientRise!.settings.image_asset})`);
const dev = spawn("npx", ["next", "dev", "-p", String(PORT), "-H", "127.0.0.1"], { env: { ...process.env, DATA_DIR: temp, STOCK_OFFLINE: "1", NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], detached: true });
let log = "";
const stopDev = () => { try { fs.writeFileSync(path.join(out, "studio-dev.log"), log.slice(-20000)); } catch { /* sans journal */ } try { process.kill(-dev.pid!, "SIGTERM"); } catch { /* arrêté */ } }; process.on("exit", stopDev); dev.stdout.on("data", (d) => { log += d; }); dev.stderr.on("data", (d) => { log += d; });
const started = Date.now();
for (;;) { if (Date.now() - started > 240000) throw new Error("Studio non démarré :\n" + log.slice(-2000)); try { const r = await fetch(`${origin}/connexion`); if (r.ok) break; } catch { /* pas prêt */ } await new Promise((r) => setTimeout(r, 1500)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
const shot = async (page: Page, name: string) => { await page.screenshot({ path: path.join(out, `noctil-${name}.png`) }); };
/** Mesures du produit en surplomb dans un aperçu : débordement actif, haut visible du produit au-dessus du bas de la photo. */
const riseMetrics = (frame: FrameLocator, nth = 0) => frame.locator(".cv-rise").nth(nth).evaluate((r) => {
  const cs = getComputedStyle(r), img = r.querySelector(".cv-rise__img")!.getBoundingClientRect();
  const prev = r.closest(".shopify-section")?.previousElementSibling?.getBoundingClientRect();
  return { on: cs.getPropertyValue("--rise-on").trim(), rise: cs.getPropertyValue("--rise").trim(), width: Math.round(img.width), overlap: prev ? Math.round(prev.bottom - (img.top + img.height * 0.0885)) : null };
});
type Structure = { template: string; sections: { id: string; type: string; name: string }[] }[];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", ...(process.env.VIDEO_DIR ? { recordVideo: { dir: process.env.VIDEO_DIR, size: { width: 1440, height: 900 } } } : {}) }); const page = await context.newPage();
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  const login = await context.request.post(`${origin}/api/auth/login`, { data: { email, password } }); assert.ok(login.ok(), `connexion : ${login.status()}`);
  const theme = async () => ((await (await context.request.get(`${origin}/api/projects/${f.pid}/theme`)).json()) as { current: { structure: Structure } }).current.structure;
  const index = async () => (await theme()).find((t) => t.template === "index")!.sections;
  const section = async (id: string) => (await (await context.request.get(`${origin}/api/projects/${f.pid}/theme/section?template=index&section=${id}`)).json()) as Record<string, unknown>;
  await page.goto(`${origin}/studio/${f.pid}/boutique`, { waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500);
  const frame = () => page.frameLocator("iframe[src*='/preview/']").first();
  await frame().locator("body").waitFor({ timeout: 120000 });
  const nudge = page.locator("[data-tuto-nudge]").getByRole("button", { name: /^(Masquer|Dismiss)$/ }); if (await nudge.count()) { await nudge.click(); await page.waitForTimeout(300); }
  await frame().locator(".cv-rise__img").first().waitFor({ timeout: 120000 }); await page.waitForTimeout(1200);
  await shot(page, "01-studio");
  const initial = await index();
  const homeRise = initial.find((s) => s.type === "cv-rise")!;
  const m0 = await riseMetrics(frame());
  assert.equal(m0.on, "1", "le produit déborde sur l'ouverture dans l'aperçu du studio"); assert.ok((m0.overlap ?? 0) > 20, `débordement visible (${m0.overlap} px)`);
  steps.push({ step: "aperçu du studio : le projecteur déborde sur l'ouverture", ok: true, ...m0 });
  // 1. Galerie : chaque composition des maquettes, avec son aperçu réel.
  const addButtons = page.getByRole("button", { name: /^Ajouter une section$/ }); await addButtons.last().scrollIntoViewIfNeeded(); await addButtons.last().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor();
  const search = dialog.getByPlaceholder("Rechercher des sections");
  for (const [entry, disp, sel] of GALLERY) {
    await search.fill(entry); await page.waitForTimeout(400);
    await dialog.getByRole("option", { name: entry }).first().focus();
    const chips = dialog.locator(`[data-disposition$="~${disp}"]`);
    assert.equal(await chips.count(), 1, `« ${entry} › ${disp} » proposée une seule fois`);
    await chips.click(); await page.waitForTimeout(500);
    const src = await dialog.locator("iframe").first().getAttribute("src");
    assert.ok(src && decodeURIComponent(src).includes(`~${disp}`), `aperçu : adresse sans la disposition « ${disp} » (${src})`);
    const served = await (await context.request.get(new URL(src!, origin).toString(), { timeout: 240000 })).text();
    assert.ok(!/theme-assets\/noctil\//.test(served), "aucune photo de la démonstration dans l'aperçu de galerie");
    const shown = async (ms: number) => dialog.frameLocator("iframe").first().locator(sel).first().waitFor({ state: "attached", timeout: ms }).then(() => true, () => false);
    if (!(await shown(45000))) { await dialog.locator("[data-disposition]").first().click(); await page.waitForTimeout(1500); await chips.click(); assert.ok(await shown(120000), `aperçu « ${disp} » absent après un nouvel essai`); }
    await page.locator("text=Aperçu dans votre boutique…").waitFor({ state: "hidden", timeout: 120000 }).catch(() => {}); await page.waitForTimeout(1500);
    await shot(page, `02-galerie-${disp}`); steps.push({ step: `galerie : « ${entry} › ${disp} » avec aperçu`, ok: true });
  }
  // 2. Ajout d'un « Produit en surplomb » en bas de page (après les questions) : aucun débordement ici.
  await search.fill("Achat et offres"); await page.waitForTimeout(400);
  await dialog.getByRole("option", { name: "Achat et offres" }).first().focus();
  await dialog.locator(`[data-disposition$="~rise"]`).click(); await dialog.frameLocator("iframe").first().locator(".cv-rise").first().waitFor({ timeout: 120000 });
  await dialog.getByRole("button", { name: /^Ajouter cette section$/ }).click(); await dialog.waitFor({ state: "hidden", timeout: 120000 }); await page.waitForTimeout(2500);
  const afterAdd = await index(); assert.equal(afterAdd.length, initial.length + 1, "une section ajoutée");
  const added = afterAdd.find((s) => !initial.some((x) => x.id === s.id))!; assert.equal(added.type, "cv-rise");
  const at = afterAdd.findIndex((s) => s.id === added.id);
  assert.notEqual(afterAdd[at - 1]?.type, "cv-banner", "ajoutée après une section qui n'est pas une grande photo");
  await frame().locator(".cv-rise").nth(1).waitFor({ timeout: 120000 }); await page.waitForTimeout(1500);
  const mAdded = await riseMetrics(frame(), 1);
  assert.equal(mAdded.on, "0", `aucun débordement après « ${afterAdd[at - 1]?.type} » (--rise-on = ${mAdded.on})`);
  await frame().locator(".cv-rise").nth(1).scrollIntoViewIfNeeded(); await page.waitForTimeout(1500); await shot(page, "03-ajout-sans-debordement");
  steps.push({ step: `« Produit en surplomb » ajouté après « ${afterAdd[at - 1]?.type} » : reste dans sa section`, ok: true, ...mAdded });
  // 3. Réglages du produit en surplomb de l'accueil : taille et débordement.
  const actions = async (id: string) => { const list = await index(); const s = list.find((x) => x.id === id)!; const nth = list.filter((x) => x.name === s.name).findIndex((x) => x.id === id); return page.getByRole("button", { name: `Actions pour « ${s.name} »` }).nth(nth); };
  await (await actions(homeRise.id)).click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click();
  const panel = page.locator("[data-setting='rise']").first().locator("xpath=ancestor::*[@data-section-settings][1]"); await panel.waitFor({ timeout: 180000 }); await page.waitForTimeout(600);
  // Curseur placé directement sur la valeur voulue (comme à la souris), puis quitté : le studio enregistre le réglage.
  // (Aux flèches du clavier, seul le premier cran est enregistré : limite de l'éditeur commun, signalée dans le rapport.)
  const slide = async (key: string, steps: number) => { const r = panel.locator(`[data-setting='${key}'] input[type=range]`); await r.focus(); await r.evaluate((el, d) => { const input = el as HTMLInputElement; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, String(Number(input.value) + d)); input.dispatchEvent(new Event("input", { bubbles: true })); }, steps); await page.waitForTimeout(400); const saved = page.waitForResponse((res) => /\/theme\/ops/.test(res.url()) && res.request().method() === "POST", { timeout: 120000 }); await r.blur(); await saved; await page.waitForTimeout(1500); };
  const before = JSON.stringify(await section(homeRise.id));
  const rise0 = Number(before.match(/"rise":(\d+)/)![1]), width0 = Number(before.match(/"media_width":(\d+)/)![1]);
  await slide("rise", 10); await slide("media_width", -4);
  const saved = JSON.stringify(await section(homeRise.id)); console.log("réglages enregistrés :", saved.match(/"rise":\d+/)?.[0], saved.match(/"media_width":\d+/)?.[0]);
  await frame().locator(`.cv-rise[style*="--rise:${rise0 + 10};"]`).first().waitFor({ timeout: 120000 }).catch(async (e) => { await shot(page, "04-echec"); console.log("aperçu :", await frame().locator(".cv-rise").first().getAttribute("style").catch(() => "?"), await page.locator("iframe[src*='/preview/']").count()); throw e; }); await page.waitForTimeout(1500);
  const m1 = await riseMetrics(frame());
  assert.ok((m1.overlap ?? 0) > (m0.overlap ?? 0), `le produit remonte davantage (${m0.overlap} → ${m1.overlap} px)`);
  assert.ok(m1.width < m0.width, `le produit est plus petit (${m0.width} → ${m1.width} px)`);
  await frame().locator(".cv-rise").first().scrollIntoViewIfNeeded(); await frame().locator("body").evaluate(() => scrollBy(0, -260)); await page.waitForTimeout(1200);
  await shot(page, "04-reglages-debordement"); steps.push({ step: "réglages : débordement et taille du produit modifiés, l'aperçu suit", ok: true, rise: `${rise0} → ${rise0 + 10}`, media_width: `${width0} → ${width0 - 4}`, overlap: `${m0.overlap} → ${m1.overlap} px` });
  await page.getByRole("button", { name: /^(← Structure)$/ }).click().catch(() => {});
  // 4. Duplication puis déplacement de la section ajoutée.
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /^Dupliquer$/ }).click(); await page.waitForTimeout(2500);
  const afterDup = await index(); assert.equal(afterDup.length, afterAdd.length + 1, "section dupliquée");
  const copy = afterDup.find((s) => !afterAdd.some((x) => x.id === s.id))!;
  steps.push({ step: "section dupliquée", ok: true, copy: copy.id });
  const pos = afterDup.findIndex((s) => s.id === added.id);
  await (await actions(added.id)).click(); await page.getByRole("menuitem", { name: /^Monter$/ }).click(); await page.waitForTimeout(2500);
  const moved = (await index()).findIndex((s) => s.id === added.id); assert.equal(moved, pos - 1, "section remontée d'un rang");
  steps.push({ step: "section déplacée", ok: true, from: pos, to: moved });
  // 5. Rechargement complet : tout est conservé.
  await page.reload({ waitUntil: "networkidle", timeout: 240000 }); await page.waitForTimeout(1500); await frame().locator(".cv-rise__img").first().waitFor({ timeout: 120000 });
  const final = await index();
  assert.equal(final.findIndex((s) => s.id === added.id), moved, "ordre conservé");
  assert.ok(final.some((s) => s.id === copy.id), "copie conservée");
  const raw = JSON.stringify(await section(homeRise.id));
  assert.ok(raw.includes(`"rise":${rise0 + 10}`) && raw.includes(`"media_width":${width0 - 4}`), "réglages du débordement conservés après rechargement");
  const m2 = await riseMetrics(frame()); assert.equal(m2.overlap, m1.overlap, "débordement identique après rechargement");
  steps.push({ step: "rechargement : réglages, ajout, copie et ordre conservés", ok: true, structure: final.map((s) => s.type), overlap: m2.overlap });
  await frame().locator(".cv-rise").first().scrollIntoViewIfNeeded(); await frame().locator("body").evaluate(() => scrollBy(0, -260)); await page.waitForTimeout(1500); await shot(page, "05-apres-rechargement");
  await page.getByTitle(/^(Téléphone|Phone)$/).click(); await page.waitForTimeout(2500);
  await frame().locator(".cv-rise").first().scrollIntoViewIfNeeded(); await frame().locator("body").evaluate(() => scrollBy(0, -220)); await page.waitForTimeout(1500); await shot(page, "06-telephone");
  const mPhone = await riseMetrics(frame()); assert.equal(mPhone.on, "1"); assert.ok((mPhone.overlap ?? 0) > 20, `débordement sur téléphone (${mPhone.overlap} px)`);
  steps.push({ step: "aperçu téléphone du studio : le projecteur déborde sur l'ouverture", ok: true, ...mPhone });
  // 6. Projet client habillé en NOCTIL : son détourage, sa photo d'ouverture, rien de la démonstration.
  const clientCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", reducedMotion: "reduce" });
  assert.ok((await clientCtx.request.post(`${origin}/api/auth/login`, { data: { email: client.user.email, password: "fictitious-client-154" } })).ok(), "connexion du compte client");
  await page.close();
  const preview = await clientCtx.newPage(); preview.on("pageerror", (e) => errors.push(e.message));
  for (const w of [1440, 390]) {
    await preview.setViewportSize({ width: w, height: w > 500 ? 900 : 844 });
    await preview.goto(`${origin}/preview/${client.pid}/v/${clientTheme.version.id}/`, { waitUntil: "networkidle", timeout: 240000 });
    await preview.evaluate(async () => { document.querySelectorAll("img[loading=lazy]").forEach((i) => ((i as HTMLImageElement).loading = "eager")); await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
    const html = await preview.content();
    assert.ok(html.includes("Céramor"), "marque du client");
    assert.ok(!/theme-assets\/noctil|noctil-(produit|projecteur|hero|logo|tipi|peluches|chambre|bibliotheque)/.test(html), "aucune photo de la démonstration");
    const visible = await preview.evaluate(() => document.body.innerText);
    const leak = visible.match(/NOCTIL|galaxie|projecteur|petit monde|ciel immense|Prix de démonstration|69 €/i);
    assert.ok(!leak, `aucun texte ni prix de la démonstration (trouvé : ${leak?.[0]})`);
    // Haut VISIBLE du produit du client (première ligne non transparente du fichier), au-dessus du bas de sa photo d'ouverture.
    const m = await preview.locator(".cv-rise").first().evaluate((r, top) => { const img = r.querySelector(".cv-rise__img") as HTMLImageElement; const b = img.getBoundingClientRect(); const prev = r.closest(".shopify-section")!.previousElementSibling!.getBoundingClientRect(); return { on: getComputedStyle(r).getPropertyValue("--rise-on").trim(), src: img.getAttribute("src"), above: Math.round(prev.bottom - b.top), visible: Math.round(prev.bottom - (b.top + b.height * top)) }; }, cutTop);
    assert.ok(m.visible > 20, `le haut visible du produit du client dépasse sur sa photo (${m.visible} px)`);
    assert.equal(m.on, "1", "débordement actif sur la photo d'ouverture du client");
    assert.ok(m.src && m.src.includes(String(clientRise!.settings.image_asset).replace(/\.[a-z]+$/, "")), `détourage du client affiché (${m.src})`);
    await preview.locator(".cv-rise").first().scrollIntoViewIfNeeded(); await preview.evaluate(() => scrollBy(0, -260)); await preview.waitForTimeout(800);
    await preview.screenshot({ path: path.join(out, `noctil-07-client-jonction-${w}.png`) });
    steps.push({ step: `projet client en NOCTIL (${w} px) : son détourage remonte sur sa photo d'ouverture, rien de la démonstration`, ok: true, ...m });
  }
  await preview.close(); await clientCtx.close();
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, "noctil-studio.json"), JSON.stringify({ demo: "noctil", origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps: steps.map((s) => s.step) }));
  await context.close();
} finally {
  await browser.close(); stopDev();
}
