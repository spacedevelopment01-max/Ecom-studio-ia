/** Scénario de persistance et de restauration depuis l'INTERFACE du studio (Next.js de développement, base temporaire),
 * sur un thème FRAISE ou ONDE :
 *   0. navigation dans l'aperçu : un lien du pied de page ouvre la nouvelle page EN HAUT, puis retour à l'accueil ;
 *   1. ajout d'une section depuis le bouton « Sections » ;  2. panneau « Modifier les réglages » : citation, fichier image
 *   du thème, image de « Mes images », disposition ;  3. déplacement (menu « … » › Monter) ;  4. duplication puis
 *   modification de la COPIE seule ;  5. masquage de la copie ;  6. suppression de la copie (confirmation) ;
 *   7. restauration de la version précédente depuis « Versions » ;  8. pied de page et en-tête par le même panneau ;
 *   9. story vidéo : fichier vidéo et poster choisis dans le panneau du bloc ;  10. rechargement complet : ordre,
 *   réglages, références de médias, indépendance original / copie et historique conservés. Captures et vidéo.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-persistence-check.ts <dossier-captures> <dossier-du-kit-extrait> [fraise|onde]
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, type FrameLocator, type Page } from "playwright";
import { bootStudio, openBoutique } from "./lot2c-studio-harness";

const out = path.resolve(process.argv[2] ?? "reports/lot2c-persistence"); fs.mkdirSync(out, { recursive: true });
const pack = process.argv[3]; const kind = (process.argv[4] ?? "fraise") as "fraise" | "onde";
const studio = await bootStudio(kind, pack, { testVideo: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const steps: Record<string, unknown>[] = [];
let n = 0; const shot = async (page: Page, name: string) => { n += 1; await page.screenshot({ path: path.join(out, `${kind}-${String(n).padStart(2, "0")}-${name}.png`) }); };
type Section = { id: string; type: string; name: string; disabled?: boolean };
type Theme = { current: { versionId: string; structure: { template: string; sections: Section[] }[] }; versions: unknown[] };
try {
  const { context, page, errors } = await openBoutique(browser, studio);
  const api = async <T,>(url: string) => (await (await context.request.get(`${studio.origin}${url}`)).json()) as T;
  const theme = () => api<Theme>(`/api/projects/${studio.pid}/theme`);
  const sectionData = (template: string, id: string) => api<{ settings: Record<string, unknown>; blocks: { id: string; settings: Record<string, unknown> }[]; disabled: boolean }>(`/api/projects/${studio.pid}/theme/section?template=${template}&section=${id}`);
  const frame = (): FrameLocator => page.frameLocator("iframe[src*='/preview/']").first();
  const quotes = () => frame().locator("[data-cv-quote]");
  // Clic dans l'aperçu « Ordinateur » (réduit par une transformation CSS pour tenir dans la colonne, ce qui fausse les
  // coordonnées d'un clic automatisé) : déclenché sur l'élément lui-même, comme le ferait un doigt ou une souris dessus.
  const clickIn = (loc: ReturnType<FrameLocator["locator"]>) => loc.first().evaluate((el) => (el as HTMLElement).click());
  const closeOverlay = async () => { const overlay = page.getByRole("button", { name: /^(Fermer le menu|Close the menu)$/ }); if (await overlay.count()) await overlay.click(); };
  const openSettings = async (actionsName: RegExp, index = 0) => { await closeOverlay(); await page.getByRole("button", { name: actionsName }).nth(index).click(); await page.getByRole("menuitem", { name: /Modifier les réglages/ }).click(); };
  const versionsBefore = (await theme()).versions.length;

  // 0. Navigation dans l'aperçu du studio : pied de page → page FAQ ouverte en haut (pas de restauration de l'ancienne position).
  await frame().locator("body").evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(900);
  const bottom = await frame().locator("body").evaluate(() => scrollY); assert.ok(bottom > 1000, `aperçu défilé en bas (${bottom})`);
  await clickIn(frame().locator("footer a[href*='/pages/faq']")); await frame().locator("[data-section-type='main-page'], .es-faq, main").first().waitFor({ timeout: 90000 }); await page.waitForTimeout(1500);
  const navY = await frame().locator("body").evaluate(() => scrollY), navPath = await frame().locator("body").evaluate(() => location.pathname);
  assert.match(navPath, /\/pages\/faq$/, `page FAQ ouverte (${navPath})`); assert.equal(navY, 0, `nouvelle page ouverte en haut (scrollY ${navY})`);
  await shot(page, "navigation-faq-en-haut"); steps.push({ step: "aperçu du studio : lien du pied de page → nouvelle page en haut", ok: true, scrollY: navY, path: navPath });
  // Retour à l'accueil par le logo de l'en-tête (lien interne), lui aussi ouvert en haut.
  await clickIn(frame().locator("header a.es-header__logo")); await quotes().or(frame().locator("[data-cv-stories]")).first().waitFor({ timeout: 90000 }).catch(() => null); await page.waitForTimeout(1500);
  assert.match(await frame().locator("body").evaluate(() => location.pathname), /\/preview\/[^/]+\/v\/[^/]+\/?$/, "retour à l'accueil");

  // 1. Ajout depuis le bouton « Ajouter une section » : Témoignage à la une.
  const addButtons = page.getByRole("button", { name: /^Ajouter une section$/ }); await addButtons.last().scrollIntoViewIfNeeded(); await addButtons.last().click();
  const dialog = page.getByRole("dialog"); await dialog.waitFor(); await dialog.getByPlaceholder("Rechercher des sections").fill("Témoignage à la une"); await page.waitForTimeout(600);
  await dialog.getByRole("option", { name: /témoignage à la une/i }).first().click(); await dialog.waitFor({ state: "hidden", timeout: 90000 });
  await quotes().first().waitFor({ timeout: 90000 }); await page.waitForTimeout(800); await shot(page, "section-ajoutee");
  let t = await theme(); const index = () => t.current.structure.find((x) => x.template === "index")!;
  const added = index().sections.filter((s) => s.type === "cv-quote"); assert.equal(added.length, 1); const original = added[0].id; const posAdded = index().sections.findIndex((s) => s.id === original);
  steps.push({ step: "ajout depuis le bouton Sections", ok: true, id: original, position: posAdded });

  // 2. Panneau : citation, fichier image du thème, image de « Mes images », disposition.
  await openSettings(/Actions pour « .*témoignage à la une »/i, 0);
  const panel = page.locator("[data-section-settings='cv-quote']"); await panel.waitFor({ timeout: 30000 }); await page.waitForTimeout(500); await shot(page, "panneau-temoignage");
  const quoteField = panel.locator("[data-setting='quote'] textarea"); await quoteField.fill("Citation d'origine, modifiée à la main."); await quoteField.blur();
  await quotes().first().locator(".cv-quote__text", { hasText: /Citation d'origine/ }).waitFor({ timeout: 90000 });
  const themeImage = Object.keys(studio.spec.files).find((k) => /scene|banniere|detail/.test(k) && k.endsWith(".webp"))!;
  await panel.locator("[data-setting='image_asset'] select").selectOption(themeImage); await quotes().first().locator(`img[src*='${themeImage}']`).waitFor({ timeout: 90000 });
  await panel.locator("[data-setting='image_asset']").getByRole("button", { name: /Mes images/ }).click(); const grid = panel.locator("[data-setting='image_asset'] ul[role=list] button"); await grid.first().waitFor({ timeout: 30000 });
  const myImageName = await grid.first().getAttribute("title"); await grid.first().click();
  await quotes().first().locator("img[src*='es-']").waitFor({ timeout: 90000 }); const myImageSrc = await quotes().first().locator("img").first().getAttribute("src");
  await panel.locator("[data-setting='layout'] select").selectOption("split"); await frame().locator(".cv-quote--split").first().waitFor({ timeout: 90000 }); await page.waitForTimeout(500); await shot(page, "panneau-applique");
  let d = await sectionData("index", original); assert.equal(d.settings.layout, "split"); assert.match(String(d.settings.image_asset), /^es-.*\.(jpg|png)$/); assert.match(String(d.settings.quote), /Citation d'origine/);
  steps.push({ step: "panneau : citation, fichier du thème, image de « Mes images », disposition", ok: true, themeImage, myImage: myImageName, image_asset: d.settings.image_asset, src: myImageSrc });
  await page.getByRole("button", { name: /^← Structure$/ }).click(); await page.waitForTimeout(400);

  // 3. Déplacement : Monter.
  await page.getByRole("button", { name: /Actions pour « .*témoignage à la une »/i }).first().click(); await page.getByRole("menuitem", { name: /^Monter$/ }).click(); await page.waitForTimeout(2500);
  t = await theme(); const posMoved = index().sections.findIndex((s) => s.id === original); assert.equal(posMoved, posAdded - 1, `section remontée (${posAdded} → ${posMoved})`);
  const orderInFrame = await frame().locator("[data-section-type], .es-section").evaluateAll((els) => els.map((e) => e.getAttribute("data-section-type") ?? e.className.split(" ")[1]));
  steps.push({ step: "déplacement (Monter)", ok: true, from: posAdded, to: posMoved, renderedOrderSample: orderInFrame.slice(Math.max(0, posMoved - 1), posMoved + 2) });

  // 4. Duplication, puis modification de la copie seule.
  await closeOverlay(); await page.getByRole("button", { name: /Actions pour « .*témoignage à la une »/i }).first().click(); await page.getByRole("menuitem", { name: /^Dupliquer$/ }).click();
  await quotes().nth(1).waitFor({ timeout: 90000 }); await page.waitForTimeout(800);
  t = await theme(); const both = index().sections.filter((s) => s.type === "cv-quote"); assert.equal(both.length, 2); const copy = both.find((s) => s.id !== original)!.id;
  const copyIndex = both.findIndex((s) => s.id === copy);
  await openSettings(/Actions pour « .*témoignage à la une »/i, copyIndex);
  const panelCopy = page.locator("[data-section-settings='cv-quote']"); await panelCopy.waitFor({ timeout: 30000 });
  const copyField = panelCopy.locator("[data-setting='quote'] textarea"); await copyField.fill("Citation de la COPIE, indépendante."); await copyField.blur();
  await quotes().nth(copyIndex).locator(".cv-quote__text", { hasText: /COPIE/ }).waitFor({ timeout: 90000 }); await page.waitForTimeout(400);
  const o = await sectionData("index", original), c = await sectionData("index", copy); assert.match(String(o.settings.quote), /Citation d'origine/); assert.match(String(c.settings.quote), /COPIE/); assert.equal(c.settings.layout, "split"); assert.equal(c.settings.image_asset, o.settings.image_asset);
  await shot(page, "copie-modifiee"); steps.push({ step: "duplication puis modification de la copie seule (original intact)", ok: true, original: o.settings.quote, copy: c.settings.quote });
  await page.getByRole("button", { name: /^← Structure$/ }).click(); await page.waitForTimeout(400);

  // 5. Masquage de la copie (icône œil de la colonne Structure).
  await page.getByRole("button", { name: /Masquer « .*témoignage à la une »/i }).nth(copyIndex).click(); await quotes().nth(1).waitFor({ state: "detached", timeout: 90000 }); await page.waitForTimeout(600);
  assert.equal(await quotes().count(), 1); assert.equal((await sectionData("index", copy)).disabled, true); await shot(page, "copie-masquee"); steps.push({ step: "masquage de la copie", ok: true });

  // 6. Suppression de la copie (boîte de confirmation du navigateur acceptée).
  page.once("dialog", (dlg) => { void dlg.accept(); });
  await closeOverlay(); await page.getByRole("button", { name: /Actions pour « .*témoignage à la une »/i }).nth(copyIndex).click(); await page.getByRole("menuitem", { name: /Supprimer la section/ }).click(); await page.waitForTimeout(2500);
  t = await theme(); assert.equal(index().sections.filter((s) => s.type === "cv-quote").length, 1, "copie supprimée"); const versionAfterDelete = t.current.versionId; steps.push({ step: "suppression de la copie", ok: true });

  // 7. Restauration de la version précédant la suppression, depuis « Versions » : la copie revient, masquée, avec SON texte.
  await closeOverlay(); await page.getByTitle(/^(Versions|Versions)$/).click(); const history = page.getByRole("dialog"); await history.waitFor(); await page.waitForTimeout(500); await shot(page, "versions");
  const restoreButtons = history.getByRole("button", { name: /^Restaurer$/ }); assert.ok((await restoreButtons.count()) >= 2, "au moins deux versions restaurables");
  // La version courante (« supprimée ») n'a pas de bouton ; la précédente est celle du masquage : c'est elle que l'on restaure.
  await history.locator("li", { hasText: /masquée/ }).first().getByRole("button", { name: /^Restaurer$/ }).click(); await history.waitFor({ state: "hidden", timeout: 60000 }); await page.waitForTimeout(3000);
  t = await theme(); const restored = index().sections.filter((s) => s.type === "cv-quote"); assert.equal(restored.length, 2, "la copie supprimée est revenue"); assert.notEqual(t.current.versionId, versionAfterDelete, "la restauration crée une nouvelle version");
  const restoredCopy = restored.find((s) => s.id !== original)!; const rc = await sectionData("index", restoredCopy.id); assert.equal(rc.disabled, true, "la copie restaurée reste masquée"); assert.match(String(rc.settings.quote), /COPIE/);
  assert.match(String((await sectionData("index", original)).settings.quote), /Citation d'origine/); await shot(page, "version-restauree");
  steps.push({ step: "restauration depuis Versions : copie revenue (masquée, texte propre), original intact, nouvelle version créée", ok: true });

  // 8. Pied de page et en-tête par le même panneau.
  t = await theme(); const footerTpl = t.current.structure.find((x) => x.template === "group:footer")!, headerTpl = t.current.structure.find((x) => x.template === "group:header")!;
  const footerSec = footerTpl.sections.find((s) => s.type === "footer")!, headerSec = headerTpl.sections.find((s) => s.type === "header")!;
  await openSettings(new RegExp(`Actions pour « ${footerSec.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} »`, "i"), 0);
  const footerPanel = page.locator("[data-section-settings='footer']"); await footerPanel.waitFor({ timeout: 30000 });
  const tagline = footerPanel.locator("[data-setting='tagline'] input"); await tagline.fill("Phrase du pied de page modifiée à la main"); await tagline.press("Enter");
  await frame().locator("footer", { hasText: /Phrase du pied de page modifiée/ }).first().waitFor({ timeout: 90000 }); await shot(page, "pied-de-page-modifie");
  await page.getByRole("button", { name: /^← Structure$/ }).click(); await page.waitForTimeout(400);
  await openSettings(new RegExp(`Actions pour « ${headerSec.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} »`, "i"), 0);
  const headerPanel = page.locator("[data-section-settings='header']"); await headerPanel.waitFor({ timeout: 30000 });
  const headerSelect = headerPanel.locator("[data-setting] select").first(); const headerSetting = await headerSelect.locator("xpath=ancestor::*[@data-setting]").getAttribute("data-setting");
  const headerOptions = await headerSelect.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value)); const headerBefore = await headerSelect.inputValue(); const headerNew = headerOptions.find((v) => v && v !== headerBefore)!;
  await headerSelect.selectOption(headerNew); await page.waitForTimeout(2500); const hd = await sectionData("group:header", headerSec.id); assert.equal(String(hd.settings[headerSetting!]), headerNew, "réglage d'en-tête appliqué");
  await shot(page, "en-tete-modifie"); steps.push({ step: "pied de page (phrase) et en-tête (liste) modifiés par le panneau", ok: true, headerSetting, headerBefore, headerNew });
  await page.getByRole("button", { name: /^← Structure$/ }).click(); await page.waitForTimeout(400);

  // 9. Story vidéo : fichier vidéo et poster choisis dans le panneau du bloc (fichiers du thème), vérifiés dans l'aperçu.
  const storiesSec = index().sections.find((s) => s.type === "cv-stories");
  if (storiesSec) {
    await openSettings(new RegExp(`Actions pour « ${storiesSec.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} »`, "i"), 0);
    const sp = page.locator("[data-section-settings='cv-stories']"); await sp.waitFor({ timeout: 30000 });
    const block2 = sp.locator("[data-block]").nth(1); await block2.locator("button[aria-expanded]").first().click(); await page.waitForTimeout(400);
    const videoSelect = block2.locator("[data-setting='video_asset'] select"); await videoSelect.waitFor({ timeout: 30000 });
    const videoOptions = await videoSelect.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    assert.ok(videoOptions.some((v) => /\.webm$/.test(v)), `fichiers vidéo du thème proposés (${videoOptions.join(", ")})`);
    const clip = videoOptions.find((v) => /\.webm$/.test(v))!; await videoSelect.selectOption(clip);
    await frame().locator(`[data-cv-story-open][data-src*='${clip}']`).nth(1).waitFor({ timeout: 90000 });
    const posterSelect = block2.locator("[data-setting='poster_asset'] select"); const posterBefore = await posterSelect.inputValue(); const posterNew = Object.keys(studio.spec.files).find((k) => k.endsWith(".webp") && k !== posterBefore)!;
    await posterSelect.selectOption(posterNew); await frame().locator(`[data-cv-story-open][data-poster*='${posterNew}']`).first().waitFor({ timeout: 90000 });
    // « Mes vidéos » : la mire importée dans le projet est proposée et applicable (opération use_media sur video_asset).
    await block2.locator("[data-setting='video_asset']").getByRole("button", { name: /Mes vidéos/ }).click(); const myVideos = block2.locator("[data-setting='video_asset'] ul[role=list] button"); await myVideos.first().waitFor({ timeout: 30000 });
    const myVideoName = await myVideos.first().getAttribute("title"); await myVideos.first().click(); await page.waitForTimeout(3000);
    const sd = await sectionData("index", storiesSec.id); const b2 = sd.blocks[1]; assert.match(String(b2.settings.video_asset), /^es-.*\.webm$/, `vidéo de « Mes vidéos » appliquée (${b2.settings.video_asset})`); assert.equal(b2.settings.poster_asset, posterNew);
    await frame().locator(`[data-cv-story-open][data-src*='${b2.settings.video_asset}']`).first().waitFor({ timeout: 90000 });
    // Lecture réelle : la carte s'ouvre, la vidéo du bloc 2 est chargée dans le lecteur. L'aperçu vient d'être rechargé avec la
    // nouvelle version : on attend qu'il soit stable (plus de rechargement pendant 2 s) avant de cliquer.
    for (let i = 0; i < 10; i++) { await frame().locator("body").evaluate(() => { (window as unknown as { __esStable?: number }).__esStable = 1; }); await page.waitForTimeout(2000); if (await frame().locator("body").evaluate(() => (window as unknown as { __esStable?: number }).__esStable === 1)) break; }
    await frame().locator("[data-cv-stories]").first().scrollIntoViewIfNeeded(); await clickIn(frame().locator(`[data-cv-story-open][data-src*='${b2.settings.video_asset}']`));
    const player = frame().locator("[data-cv-player]"); await player.locator("[data-cv-video][src*='es-']").waitFor({ timeout: 10000 }).catch(() => null); await page.waitForTimeout(600);
    assert.ok(await player.evaluate((el) => (el as HTMLDialogElement).open), "lecteur ouvert"); assert.match((await player.locator("[data-cv-video]").getAttribute("src")) ?? "", /es-.*\.webm/);
    await shot(page, "story-video-poster"); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
    steps.push({ step: "story : fichier vidéo du thème, poster, puis vidéo de « Mes vidéos » appliqués depuis le panneau du bloc ; lecteur ouvert", ok: true, clip, posterNew, myVideo: myVideoName, video_asset: b2.settings.video_asset });
    await page.getByRole("button", { name: /^← Structure$/ }).click(); await page.waitForTimeout(400);
  } else steps.push({ step: "story vidéo", ok: false, reason: "aucune section stories dans ce thème" });

  // 10. Rechargement complet : tout est conservé.
  await page.reload({ waitUntil: "networkidle", timeout: 180000 }); await page.waitForTimeout(1500); await frame().locator("body").waitFor({ timeout: 120000 }); await quotes().first().waitFor({ timeout: 60000 });
  t = await theme(); const finalQuotes = index().sections.filter((s) => s.type === "cv-quote");
  const fo = await sectionData("index", original), fc = await sectionData("index", finalQuotes.find((s) => s.id !== original)!.id), ff = await sectionData("group:footer", footerSec.id);
  assert.equal(index().sections.findIndex((s) => s.id === original), posMoved, "ordre conservé"); assert.equal(fo.settings.layout, "split"); assert.match(String(fo.settings.quote), /Citation d'origine/); assert.match(String(fo.settings.image_asset), /^es-/);
  assert.match(String(fc.settings.quote), /COPIE/); assert.equal(fc.disabled, true); assert.equal(await quotes().count(), 1, "une seule citation rendue (la copie masquée ne l'est pas)");
  assert.match(String(ff.settings.tagline), /modifiée à la main/); assert.ok(await frame().locator("footer", { hasText: /Phrase du pied de page modifiée/ }).count());
  assert.ok(await frame().locator(".cv-quote--split img[src*='es-']").count(), "image de « Mes images » rendue après rechargement");
  const versionCount = t.versions.length;
  await page.getByTitle(/^(Versions)$/).click(); await page.getByRole("dialog").waitFor(); const listed = await page.getByRole("dialog").getByRole("button", { name: /^Restaurer$/ }).count(); await shot(page, "apres-rechargement-versions"); await page.keyboard.press("Escape");
  steps.push({ step: "rechargement complet : ordre, réglages, médias, indépendance original/copie, pied de page, historique", ok: true, versionsBefore, versionsListed: listed, versionCount });
  assert.ok(listed >= 10, `historique conservé (${listed} versions listées)`);
  assert.deepEqual(errors.filter((e) => !/ResizeObserver/.test(e)), [], "erreurs de page du studio");
  fs.writeFileSync(path.join(out, `${kind}-persistance.json`), JSON.stringify({ kind, origin: "studio Next.js de développement, base temporaire", steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, kind, steps: steps.map((s) => s.step) }));
} catch (e) { try { const pages = browser.contexts().flatMap((c) => c.pages()); if (pages[0]) await pages[0].screenshot({ path: path.join(out, `${kind}-99-echec.png`) }); } catch { /* capture impossible */ } console.error("journal studio :", studio.logs().slice(-1500)); throw e; } finally { await browser.close(); await studio.stop(); }
