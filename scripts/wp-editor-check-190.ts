/**
 * Mission #190, point 6 — sections modifiables dans l'éditeur de WordPress (Apparence › Éditeur), sur une boutique de
 * test : connexion, ouverture de l'éditeur de site (si ses scripts sont complets), sections du studio présentes comme
 * blocs dans le modèle d'accueil, modification d'un réglage texte enregistrée par l'API des modèles (celle de l'éditeur),
 * puis lecture du site public.
 *
 *   npx tsx scripts/wp-editor-check-190.ts <adresse> <identifiant> <mot de passe> <dossier de sortie>
 *
 * Accès de la boutique de TEST seulement, passés en arguments (jamais écrits dans le dépôt).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const [base, user, pass, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const out: Record<string, unknown> = {};
try {
  await page.goto(`${base}/wp-login.php`);
  await page.fill("#user_login", user);
  await page.fill("#user_pass", pass);
  await page.click("#wp-submit");
  await page.waitForURL(/wp-admin/);
  const theme = await page.evaluate(async () => (await (await fetch("/wp-json/wp/v2/themes?status=active", { headers: { "X-WP-Nonce": (window as any).wpApiSettings?.nonce ?? "" } })).json())[0]?.stylesheet ?? "");
  out.theme = theme;
  // Éditeur de site : ouvert si possible (sur la boutique de test hors ligne, ses scripts 6.5 sont incomplets).
  const editorErrors: string[] = [];
  page.on("pageerror", (e) => editorErrors.push(e.message.slice(0, 120)));
  await page.goto(`${base}/wp-admin/site-editor.php?postType=wp_template&postId=${encodeURIComponent(`${theme}//front-page`)}&canvas=edit`);
  out.editorOpened = await page.waitForFunction(() => (window as any).wp?.data?.select("core/block-editor")?.getBlocks()?.length > 0, null, { timeout: 30_000 }).then(() => true, () => false);
  out.editorErrors = editorErrors.slice(0, 3);
  // Enregistrement par l'API des modèles (celle qu'utilise l'éditeur pour sauvegarder) : un réglage texte d'une section.
  const nonce = await (await page.request.get(`${base}/wp-admin/admin-ajax.php?action=rest-nonce`)).text();
  const id = `${theme}//front-page`;
  const tpl = await (await page.request.get(`${base}/wp-json/wp/v2/templates/${encodeURIComponent(id)}?context=edit`, { headers: { "X-WP-Nonce": nonce } })).json() as { content: { raw: string } };
  const raw = tpl.content.raw;
  const blocks = [...raw.matchAll(/<!-- wp:es\/section (\{.*?\}) \/-->/g)];
  out.sectionBlocks = blocks.length;
  out.types = [...new Set(blocks.map((m) => { try { return JSON.parse(m[1]).type; } catch { return "?"; } }))];
  let changed: string | null = null, before = "";
  const next = raw.replace(/<!-- wp:es\/section (\{.*?\}) \/-->/g, (all, json: string) => {
    if (changed) return all;
    const a = JSON.parse(json);
    const k = Object.keys(a.settings ?? {}).find((x) => /^(heading|title)$/.test(x) && typeof a.settings[x] === "string" && a.settings[x].length > 2);
    if (!k) return all;
    before = a.settings[k]; a.settings[k] = `${before} (modifié dans WordPress)`; changed = `${a.type}.${k}`;
    return `<!-- wp:es/section ${JSON.stringify(a).replace(/--/g, "\\u002d\\u002d").replace(/</g, "\\u003c").replace(/>/g, "\\u003e")} /-->`;
  });
  out.changed = changed;
  const save = await page.request.post(`${base}/wp-json/wp/v2/templates/${encodeURIComponent(id)}`, { headers: { "X-WP-Nonce": nonce, "Content-Type": "application/json" }, data: { content: next } });
  out.saveStatus = save.status();
  const html = await (await page.request.get(`${base}/?nocache=${Date.now()}`)).text();
  out.savedAndShown = html.includes("dans WordPress)"); // « é » peut être écrit &eacute; par WordPress
  out.before = before.slice(0, 80);
} catch (e) { out.error = (e as Error).message.slice(0, 300); }
fs.writeFileSync(path.join(outDir, "editeur.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out));
await browser.close();
