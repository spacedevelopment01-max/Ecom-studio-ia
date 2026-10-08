/**
 * Test navigateur réel de l'éditeur visuel des publicités (ordinateur puis téléphone), sans aucun appel d'IA :
 *   EMAIL=… PASSWORD=… PROJECT=… OUT=reports/screenshots/ad-editor npx tsx scripts/e2e-ad-editor.ts
 * Projet de démonstration : scripts/seed-ad-editor-demo.ts. Parcours : onglet Publicités → Modifier → titre
 * (double-clic + clavier), déplacement du logo (glisser), couleur du bouton, remplacement de la photo, ajout d'une
 * forme → enregistrer → recharger la page (tout est conservé) → exporter (PNG) ; aperçu du navigateur comparé à
 * l'export du serveur ; puis interface tactile au format téléphone (double-tap, clavier, glisser au doigt).
 */
import fs from "node:fs";
import sharp from "sharp";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "reports/screenshots/ad-editor";
const PROJECT = process.env.PROJECT!;
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];

async function login(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", process.env.EMAIL!);
  await page.fill("#password", process.env.PASSWORD!);
  await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
  return page;
}
const api = async (ctx: BrowserContext, url: string) => (await ctx.request.get(`${BASE}${url}`)).json();

/** Ouvre la première création dans l'éditeur et attend le rendu (polices et images chargées). */
async function openEditor(page: Page, docKey: string) {
  await page.goto(`${BASE}/studio/${PROJECT}/publicites`, { waitUntil: "networkidle" });
  // La liste suit l'ordre des dernières modifications : on retrouve la création par sa clé.
  const docs = (await api(page.context(), `/api/projects/${PROJECT}/ads/docs`)).docs as any[];
  await page.getByTestId("edit-creative").nth(docs.findIndex((d) => d.docKey === docKey)).click();
  await page.locator("[data-testid=ad-editor][data-ready='1']").waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
}
/** Position écran d'un point du document (coordonnées de la publicité). */
async function at(page: Page, docW: number, x: number, y: number) {
  const b = (await page.getByTestId("ad-canvas").boundingBox())!;
  const s = b.width / docW;
  return { x: b.x + x * s, y: b.y + y * s, s };
}
const center = (l: any) => ({ x: l.x + l.w / 2, y: l.y + l.h / 2 });

// ───────────────────────────── Ordinateur ─────────────────────────────
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, locale: "fr-FR" });
const page = await login(desk);
await page.goto(`${BASE}/studio/${PROJECT}/publicites`, { waitUntil: "networkidle" });
const n = await page.getByTestId("creative").count();
check("Onglet Publicités : créations V2 listées avec « Modifier »", n > 0 && (await page.getByTestId("edit-creative").count()) === n, `${n} création(s)`);
check("Onglet Publicités : bouton « Créer des publicités »", await page.getByTestId("create-ads").isVisible());
await page.screenshot({ path: `${OUT}/01-onglet-publicites.png`, fullPage: false });

// « Créer des publicités » : vraie tâche de fond (moteur local gratuit, sans IA sur cette installation).
await page.getByTestId("create-ads").click();
await page.getByTestId("confirm-create-ads").waitFor();
await page.screenshot({ path: `${OUT}/01b-creer-des-publicites.png` });
await page.getByTestId("confirm-create-ads").click();
let created = n;
for (let i = 0; i < 90 && created <= n; i++) {
  await page.waitForTimeout(1000);
  created = await page.getByTestId("creative").count();
}
check("« Créer des publicités » : nouvelles propositions affichées (sans IA)", created > n, `${n} → ${created} création(s)`);
await page.screenshot({ path: `${OUT}/01c-propositions.png` });

const list = (await api(desk, `/api/projects/${PROJECT}/ads/docs`)).docs as any[];
// Création à modifier : la première qui porte un logo (toutes les mises en page n'en ont pas).
let idx = 0;
let before: any = null;
for (let i = 0; i < list.length; i++) {
  const v = await api(desk, `/api/projects/${PROJECT}/ads/docs/${list[i].docKey}`);
  if (v.doc.layers.some((l: any) => l.role === "logo")) {
    idx = i;
    before = v;
    break;
  }
}
before ??= await api(desk, `/api/projects/${PROJECT}/ads/docs/${list[0].docKey}`);
const key = list[idx].docKey as string;
const doc0 = before.doc;
const L = (role: string) => doc0.layers.find((l: any) => l.role === role);
await openEditor(page, key);
check("Éditeur ouvert : canevas, calques, propriétés", (await page.getByTestId("ad-canvas").isVisible()) && (await page.getByTestId("layers-panel").isVisible()) && (await page.getByTestId("properties-panel").isVisible()));
await page.screenshot({ path: `${OUT}/02-editeur-ouvert.png` });

// Aperçu du navigateur = export du serveur (même moteur, mêmes polices) : comparaison pixel à pixel.
const shot = await page.evaluate(() => (document.querySelector("[data-testid=ad-editor] canvas") as HTMLCanvasElement).toDataURL("image/png"));
const browserPng = Buffer.from(shot.split(",")[1], "base64");
const serverPng = Buffer.from(await (await desk.request.get(`${BASE}/api/projects/${PROJECT}/ads/docs/${key}?export=png`)).body());
const raw = async (b: Buffer) => sharp(b).resize(doc0.width, doc0.height).removeAlpha().raw().toBuffer();
const [ra, rb] = await Promise.all([raw(browserPng), raw(serverPng)]);
let diff = 0;
let big = 0;
for (let i = 0; i < ra.length; i++) {
  const d = Math.abs(ra[i] - rb[i]);
  diff += d;
  if (d > 48) big++;
}
const mean = diff / ra.length;
const bigShare = big / ra.length;
check("Fidélité : aperçu du navigateur ≈ export du serveur", mean < 3 && bigShare < 0.01, `écart moyen ${mean.toFixed(2)}/255, pixels très différents ${(bigShare * 100).toFixed(2)} %`);
fs.writeFileSync(`${OUT}/fidelite-navigateur.png`, browserPng);
fs.writeFileSync(`${OUT}/fidelite-serveur.png`, serverPng);

// 1. Titre : double-clic sur le texte puis saisie au clavier.
const title = L("title");
const NEW_TITLE = "Titre modifié à la main";
let p = await at(page, doc0.width, center(title).x, center(title).y);
await page.mouse.dblclick(p.x, p.y);
await page.getByTestId("inline-text").waitFor();
await page.keyboard.press("ControlOrMeta+a");
await page.keyboard.type(NEW_TITLE);
await page.screenshot({ path: `${OUT}/03-titre-saisie.png` });
await page.keyboard.press("ControlOrMeta+Enter");
await page.waitForTimeout(300);
check("Titre modifié par double-clic + clavier", (await page.getByTestId("prop-text").inputValue()) === NEW_TITLE);

// 2. Déplacer le logo (glisser à la souris).
const logo = L("logo") ?? L("product");
p = await at(page, doc0.width, center(logo).x, center(logo).y);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(p.x + (i * 90 * p.s) / 10, p.y + (i * 140 * p.s) / 10);
await page.mouse.up();
await page.waitForTimeout(200);
const lx = Number(await page.getByTestId("prop-x").inputValue());
const ly = Number(await page.getByTestId("prop-y").inputValue());
check(`${logo.role === "logo" ? "Logo" : "Produit (pas de logo dans cette mise en page)"} déplacé en le glissant`, Math.abs(lx - logo.x) > 40 && Math.abs(ly - logo.y) > 80, `(${logo.x}, ${logo.y}) → (${lx}, ${ly})`);

// 3. Couleur du bouton.
const cta = L("cta");
p = await at(page, doc0.width, center(cta).x, center(cta).y);
await page.mouse.click(p.x, p.y);
await page.getByTestId("prop-fill").fill("#1f8a4c");
await page.waitForTimeout(200);
check("Couleur du bouton changée", (await page.getByTestId("prop-fill").inputValue()).toLowerCase() === "#1f8a4c");

// 4. Remplacer la photo (bibliothèque du projet, gratuit).
// Photo à remplacer : la photo de fond si la mise en page en a une, sinon l'image du produit.
const photo = doc0.layers.find((l: any) => l.kind === "image" && (l.role === "image" || l.role === "background") && l.assetId) ?? L("product");
const row = doc0.layers.length - 1 - doc0.layers.indexOf(photo);
await page.getByTestId("layers-panel").locator(":scope > div").nth(row).locator("button").first().click();
await page.getByTestId("replace-image").click();
await page.getByPlaceholder(/Rechercher/).fill("photo-verte");
await page.waitForTimeout(800);
await page.locator("[role=dialog] button[aria-pressed]").first().click();
await page.getByRole("button", { name: "Utiliser ce média" }).click();
await page.waitForTimeout(1200);

// 5. Ajouter une forme.
await page.getByTestId("add-rect").click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-modifications.png` });

// Annuler / rétablir sur la dernière action.
await page.getByTestId("undo").click();
const afterUndo = await page.getByTestId("layers-panel").innerText();
await page.getByTestId("redo").click();
const afterRedo = await page.getByTestId("layers-panel").innerText();
check("Annuler / rétablir", afterUndo !== afterRedo);

// Enregistrer.
await page.getByTestId("save").click();
await page.waitForFunction(() => (document.querySelector("[data-testid=save]") as HTMLButtonElement).disabled, null, { timeout: 30_000 });
await page.waitForTimeout(500);
const saved = (await api(desk, `/api/projects/${PROJECT}/ads/docs/${key}`)) as any;
const S = (role: string) => saved.doc.layers.find((l: any) => l.role === role);
const sPhoto = saved.doc.layers.find((l: any) => l.id === photo.id);
check("Enregistré : nouvelle version créée", saved.version.version === before.version.version + 1, `v${before.version.version} → v${saved.version.version}`);
check("Enregistré : titre", S("title").text === NEW_TITLE);
check("Enregistré : élément déplacé", saved.doc.layers.find((l: any) => l.id === logo.id).x === lx && saved.doc.layers.find((l: any) => l.id === logo.id).y === ly);
check("Enregistré : couleur du bouton", String(S("cta").fill).toLowerCase() === "#1f8a4c");
check("Enregistré : photo remplacée", sPhoto && sPhoto.assetId !== photo.assetId, `${photo.assetId} → ${sPhoto?.assetId}`);
check("Enregistré : forme ajoutée", saved.doc.layers.length === doc0.layers.length + 1);
check("Enregistré : aucun appel d'IA", saved.version.source === "user");

// Recharger la page : le travail est conservé.
await page.reload({ waitUntil: "networkidle" });
await openEditor(page, key);
await page.screenshot({ path: `${OUT}/05-apres-rechargement.png` });
const listAfter = (await api(desk, `/api/projects/${PROJECT}/ads/docs`)).docs as any[];
check("Après rechargement : version enregistrée rouverte", (await page.getByTestId("layers-panel").innerText()).includes(saved.doc.layers.at(-1).name));
check("Liste : badge « Modifiée »", listAfter.find((d) => d.docKey === key)?.edited === true);

// Versions : restaurer l'originale (sans rien perdre : la restauration crée une nouvelle version).
await page.getByTestId("open-versions").click();
await page.getByTestId("versions").waitFor();
await page.screenshot({ path: `${OUT}/06-versions.png` });
await page.keyboard.press("Escape");

// Exporter (PNG et JPEG).
await page.getByTestId("open-export").click();
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-png").click()]);
const pngPath = `${OUT}/07-export.png`;
await dl.saveAs(pngPath);
const meta = await sharp(pngPath).metadata();
check("Export PNG téléchargé aux dimensions du format", meta.format === "png" && meta.width === saved.doc.width && meta.height === saved.doc.height, `${meta.width}×${meta.height}`);
await page.waitForTimeout(500);
const jpg = await desk.request.get(`${BASE}/api/projects/${PROJECT}/ads/docs/${key}?export=jpeg`);
check("Export JPEG", jpg.headers()["content-type"]?.includes("jpeg") ?? false);

// Retouche en langage naturel simple : faite sur place, gratuitement.
await openEditor(page, key);
const sizeBefore = saved.doc.layers.find((l: any) => l.role === "title").font.size;
const titleNow = saved.doc.layers.find((l: any) => l.role === "title");
p = await at(page, saved.doc.width, center(titleNow).x, center(titleNow).y);
await page.locator("input[placeholder^='Demander une retouche']").fill("Agrandis le titre");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
await page.mouse.click(p.x, p.y);
const sizeAfter = Number(await page.getByTestId("prop-size").inputValue());
check("« Agrandis le titre » : fait localement, sans IA", sizeAfter > sizeBefore, `${sizeBefore} → ${sizeAfter} px`);
await page.screenshot({ path: `${OUT}/08-retouche-langage-naturel.png` });

// Demandes qui exigent l'IA : jamais lancées sans accord (ici, le client refuse).
const jobsBefore = (await api(desk, `/api/projects/${PROJECT}/jobs`)).jobs.length;
await page.locator("input[placeholder^='Demander une retouche']").fill("Remplace la photographie par une ambiance de salle de bain");
await page.keyboard.press("Enter");
await page.getByRole("button", { name: "Choisir dans la bibliothèque (gratuit)" }).waitFor();
await page.screenshot({ path: `${OUT}/09-photo-bibliotheque-ou-ia.png` });
await page.keyboard.press("Escape");
page.once("dialog", (d) => d.dismiss());
await page.locator("input[placeholder^='Demander une retouche']").fill("Fais une version plus élégante");
await page.keyboard.press("Enter");
await page.waitForTimeout(1500);
const jobsAfter = (await api(desk, `/api/projects/${PROJECT}/jobs`)).jobs.length;
check("Demandes IA (photo, nouvelle version) : choix proposé, rien lancé sans accord", jobsAfter === jobsBefore, `${jobsBefore} → ${jobsAfter} tâche(s)`);
await desk.close();

// ───────────────────────────── Téléphone (tactile) ─────────────────────────────
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, locale: "fr-FR" });
const mp = await login(phone);
const key2 = list.find((d) => d.docKey !== key).docKey as string;
await openEditor(mp, key2);
const m0 = (await api(phone, `/api/projects/${PROJECT}/ads/docs/${key2}`)) as any;
check("Téléphone : interface tactile (barre d'outils en bas, pas de panneaux latéraux)", (await mp.getByTestId("mobile-toolbar").isVisible()) && !(await mp.getByTestId("layers-panel").isVisible().catch(() => false)));
const bodyW = await mp.evaluate(() => document.documentElement.scrollWidth);
check("Téléphone : aucun défilement horizontal", bodyW <= 390, `${bodyW}px`);
await mp.screenshot({ path: `${OUT}/10-mobile-editeur.png` });

// Double-tap sur le titre → clavier.
const mt = m0.doc.layers.find((l: any) => l.role === "title");
let q = await at(mp, m0.doc.width, center(mt).x, center(mt).y);
await mp.touchscreen.tap(q.x, q.y);
await mp.waitForTimeout(120);
await mp.touchscreen.tap(q.x, q.y);
await mp.getByTestId("inline-text").waitFor({ timeout: 5000 });
await mp.getByTestId("inline-text").fill("Au doigt");
await mp.screenshot({ path: `${OUT}/11-mobile-texte-clavier.png` });
// Validation en quittant la zone de saisie (comme en touchant ailleurs sur le téléphone).
await mp.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
await mp.waitForTimeout(300);

// Glisser au doigt (événements tactiles réels via le protocole du navigateur).
const cdp = await phone.newCDPSession(mp);
const mlogo = m0.doc.layers.find((l: any) => l.role === "logo") ?? m0.doc.layers.find((l: any) => l.role === "product");
q = await at(mp, m0.doc.width, center(mlogo).x, center(mlogo).y);
const touch = (type: string, x: number, y: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] } as any);
await touch("touchStart", q.x, q.y);
for (let i = 1; i <= 12; i++) await touch("touchMove", q.x + i * 4, q.y + i * 8);
await touch("touchEnd", q.x + 48, q.y + 96);
await mp.waitForTimeout(300);
await mp.screenshot({ path: `${OUT}/12-mobile-glisser.png` });

// Tiroir des réglages, puis enregistrer.
await mp.getByTestId("m-props").tap();
await mp.getByTestId("sheet-props").waitFor();
await mp.screenshot({ path: `${OUT}/13-mobile-reglages.png` });
await mp.getByTestId("m-props").tap().catch(() => undefined);
await mp.getByTestId("m-add").tap();
await mp.getByTestId("sheet-add").waitFor();
await mp.screenshot({ path: `${OUT}/14-mobile-ajouter.png` });
await mp.getByTestId("sheet-add").getByText("Rectangle", { exact: true }).tap();
await mp.waitForTimeout(300);
await mp.getByTestId("save").tap();
await mp.waitForFunction(() => (document.querySelector("[data-testid=save]") as HTMLButtonElement).disabled, null, { timeout: 30_000 });
const m1 = (await api(phone, `/api/projects/${PROJECT}/ads/docs/${key2}`)) as any;
const ml = m1.doc.layers.find((l: any) => l.id === mlogo.id);
check("Téléphone : texte saisi au clavier enregistré", m1.doc.layers.find((l: any) => l.id === mt.id)?.text === "Au doigt");
check("Téléphone : élément déplacé au doigt", ml.x !== mlogo.x || ml.y !== mlogo.y, `(${mlogo.x}, ${mlogo.y}) → (${ml.x}, ${ml.y})`);
check("Téléphone : forme ajoutée et enregistrée", m1.doc.layers.length === m0.doc.layers.length + 1 && m1.version.version === m0.version.version + 1);
await mp.screenshot({ path: `${OUT}/15-mobile-enregistre.png` });
await phone.close();

await browser.close();
check("Aucune erreur JavaScript dans la page", errors.length === 0, errors.slice(0, 3).join(" | "));
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(results.map(([name, ok, detail]) => ({ name, ok, detail })), null, 2));
const failed = results.filter((r) => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} vérifications réussies`);
process.exit(failed ? 1 : 0);
