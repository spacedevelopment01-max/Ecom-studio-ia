/**
 * Vérifications réelles de l'accueil public (refonte premium) dans Chromium, et captures du rapport
 * reports/homepage-premium-v2.md. Aucune IA, aucun compte : seule la page publique est visitée.
 *   (serveur) DATA_DIR=/tmp/hp STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next start -p 3090
 *   BASE=http://localhost:3090 npx tsx scripts/screens-homepage-v2.ts
 */
import fs from "node:fs";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3090";
const OUT = "reports/screenshots/homepage-premium-v2";
fs.mkdirSync(OUT, { recursive: true });

const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, detail = "") => (results.push([name, ok, detail]), console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`));
const errors: string[] = [];

const browser: Browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());

async function open(opts: BrowserContextOptions & { theme?: "light" | "dark" }, label: string): Promise<Page> {
  const { theme, ...ctxOpts } = opts;
  const ctx = await browser.newContext({ locale: "fr-FR", deviceScaleFactor: 1, ...ctxOpts });
  await ctx.addInitScript((th) => {
    try {
      sessionStorage.setItem("ecsSeen", "1"); // intro d'ouverture déjà vue : rien ne couvre la page
      if (th) localStorage.setItem("ecs-theme", th);
    } catch {}
  }, theme ?? null);
  // Le Chromium de test ne lit pas le H.264 du film d'origine : une copie WebM du MÊME film (TEST_WEBM, faite avec
  // ffmpeg) lui est servie à la même adresse. Le fichier du site n'est pas modifié.
  if (process.env.TEST_WEBM) await ctx.route("**/explainers/film-court.mp4", (r) => r.fulfill({ path: process.env.TEST_WEBM!, contentType: "video/webm" }));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${label} console: ${m.text()}`));
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(1500);
  return page;
}
/** Parcourt toute la page (déclenche les apparitions), puis remonte. */
async function sweep(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}
async function at(page: Page, sel: string, offset = 0) {
  await page.evaluate(([s, o]) => {
    const el = document.querySelector(s as string);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + Number(o));
  }, [sel, offset] as const);
  await page.waitForTimeout(1200);
}
const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector(".hp")!).backgroundColor);
const isDark = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number);
  return r + g + b < 120;
};
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = (page: Page, file: string, full = false) => page.screenshot({ path: `${OUT}/${file}.png`, fullPage: full });

// ---------------------------------------------------------------- Ordinateur, thème sombre
{
  const p = await open({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" }, "ordinateur-sombre");
  const src = await p.getAttribute("main video", "src");
  check("Vidéo d'entrée : fichier d'origine /explainers/film-court.mp4", src === "/explainers/film-court.mp4", String(src));
  const posterOk = (await p.getAttribute("main video", "poster")) === "/explainers/film-court.jpg";
  check("Vidéo d'entrée : image d'attente d'origine", posterOk);
  await p.waitForTimeout(1500);
  const playing = await p.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>("main video")!;
    return { paused: v.paused, muted: v.muted, t: v.currentTime, ready: v.readyState };
  });
  check("Vidéo d'entrée : lecture silencieuse automatique quand elle est visible", !playing.paused && playing.muted, JSON.stringify(playing));
  check("Thème système sombre appliqué à la première visite", isDark(await bg(p)), await bg(p));
  await shot(p, "accueil-ordinateur-sombre");
  await p.locator("main section").first().screenshot({ path: `${OUT}/video-hero-sombre.png` });
  // Bouton pause / lecture (la capture de la section a pu mettre la vidéo en pause : on part de l'état réel)
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  const wasPaused = await p.evaluate(() => document.querySelector<HTMLVideoElement>("main video")!.paused);
  await p.locator("main section").first().getByRole("button", { name: /Mettre la vidéo en pause|Lire la vidéo/ }).click();
  await p.waitForTimeout(400);
  const nowPaused = await p.evaluate(() => document.querySelector<HTMLVideoElement>("main video")!.paused);
  check("Vidéo d'entrée : bouton pause / lecture", wasPaused !== nowPaused, `${wasPaused} → ${nowPaused}`);
  // « Avec le son » relance depuis le début, avec les commandes
  await p.locator("main section").first().getByRole("button", { name: "Avec le son" }).click();
  await p.waitForTimeout(400);
  const sound = await p.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>("main video")!;
    return { muted: v.muted, controls: v.controls };
  });
  check("Vidéo d'entrée : « Avec le son » active le son et les commandes", !sound.muted && sound.controls, JSON.stringify(sound));
  // Ancres de la navigation et du pied de page
  const anchors = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='#'], a[href^='/#']")).map((a) => a.getAttribute("href")!.replace(/^\//, "")));
  const missingHere = await p.evaluate((list) => list.filter((h) => h !== "#" && !document.querySelector(h)), [...new Set(anchors)]);
  check("Toutes les ancres (en-tête, pied de page, boutons) ont leur section", missingHere.length === 0, missingHere.join(", "));
  // Liens vers d'autres pages
  const pages = await p.evaluate(() => [...new Set(Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='/']")).map((a) => a.getAttribute("href")!.split("#")[0]).filter((h) => h && h !== "/"))]);
  const bad: string[] = [];
  for (const href of pages) {
    const r = await p.request.get(BASE + href, { maxRedirects: 0 }).catch(() => null);
    if (!r || r.status() >= 400) bad.push(`${href} (${r?.status()})`);
  }
  check(`Liens vers les autres pages valides (${pages.length})`, bad.length === 0, bad.join(", ") || pages.join(" "));
  const ctaHref = await p.getByRole("link", { name: "Commencer mon projet" }).first().getAttribute("href");
  check("Bouton « Commencer mon projet » → inscription", ctaHref === "/inscription", String(ctaHref));
  check("Lien « Connexion » → /connexion", (await p.getByRole("link", { name: "Connexion", exact: true }).first().getAttribute("href")) === "/connexion");
  check("Bouton « Découvrir les fonctionnalités » → #fonctionnalites", (await p.getByRole("link", { name: "Découvrir les fonctionnalités" }).getAttribute("href")) === "#fonctionnalites");
  // SEO
  const meta = await p.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "", h1: document.querySelectorAll("h1").length, og: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "" }));
  check("SEO : titre, description, une seule balise h1, Open Graph", /E-COM STUDIO IA/.test(meta.title) && meta.desc.length > 60 && meta.h1 === 1 && !!meta.og, `${meta.title} · h1=${meta.h1}`);

  await sweep(p);
  // Parcours au défilement
  await at(p, "#module-ads", -250);
  const activeAds = await p.locator("nav[aria-label='Modules du studio'] [aria-current='step']").textContent();
  check("Parcours au défilement : le module affiché suit le texte lu (Publicités)", /Publicités/.test(activeAds ?? ""), String(activeAds));
  await shot(p, "parcours-publicites-ordinateur-sombre");
  await at(p, "#module-social", -250);
  check("Parcours au défilement : Réseaux sociaux en dernier", /Réseaux/.test((await p.locator("nav[aria-label='Modules du studio'] [aria-current='step']").textContent()) ?? ""));
  await shot(p, "parcours-reseaux-ordinateur-sombre");
  await at(p, "#fonctionnalites", 330);
  await shot(p, "parcours-marque-ordinateur-sombre");
  // Comment ça fonctionne : clic sur l'étape 3
  await at(p, "#fonctionnement", 250);
  await p.locator("#fonctionnement").getByRole("button", { name: /Vous personnalisez et vous validez/ }).click();
  await p.waitForTimeout(900);
  check("Comment ça fonctionne : une étape se choisit au clic", (await p.locator("[aria-current='step']").first().textContent())?.includes("personnalisez") ?? false);
  await shot(p, "fonctionnement-ordinateur-sombre");
  // Marque
  await at(p, "#marque", 300);
  await p.locator("#marque").getByRole("tab", { name: /Ostral/ }).click();
  await p.waitForTimeout(600);
  check("Création de marque : changement de marque de démonstration", (await p.locator("#marque [role=tabpanel] img").first().getAttribute("alt"))?.includes("Ostral") ?? false);
  await shot(p, "marque-ordinateur-sombre");
  // Boutique
  await at(p, "#boutiques", 300);
  await p.locator("#boutiques").getByRole("button", { name: "Téléphone" }).click();
  await p.waitForTimeout(600);
  check("Création de boutique : bascule ordinateur / téléphone", (await p.locator("#boutiques img[alt*='téléphone']").count()) > 0);
  await shot(p, "boutique-telephone-ordinateur-sombre");
  // Éditeur de publicité
  await at(p, "#editeur-publicite", -100);
  await p.locator("#visuels").getByLabel("Titre", { exact: true }).fill("Dormez mieux.");
  await p.locator("#visuels").getByRole("button", { name: "9:16" }).click();
  await p.locator("#visuels").getByRole("button", { name: "En haut à droite" }).click();
  await p.waitForTimeout(700);
  check("Éditeur de publicité : le titre saisi s'affiche sur la publicité", (await p.locator("#visuels button:has-text('Dormez mieux.')").count()) === 1);
  await shot(p, "editeur-publicite-ordinateur-sombre");
  // Vidéo
  await at(p, "#videos", 0);
  await shot(p, "video-ugc-ordinateur-sombre");
  // SEO
  await at(p, "#seo", -40);
  const firstEditable = p.locator("#seo article [contenteditable=true]").first();
  await firstEditable.click();
  await p.keyboard.type(" (modifié)");
  await p.waitForTimeout(300);
  check("SEO : texte modifiable, signalé « Modifié par vous »", /Modifié par vous/.test((await p.locator("#seo [aria-live=polite]").textContent()) ?? ""));
  await shot(p, "seo-ordinateur-sombre");
  // Réseaux sociaux
  await at(p, "#social", 250);
  const before = await p.locator("#social [aria-live=polite]").first().textContent();
  await p.locator("#social").getByRole("button", { name: "Approuver cette publication" }).click();
  await p.waitForTimeout(300);
  const after = await p.locator("#social [aria-live=polite]").first().textContent();
  check("Réseaux sociaux : approbation d'une publication", before !== after, `${before} → ${after}`);
  await shot(p, "reseaux-ordinateur-sombre");
  // Tout est connecté
  await at(p, "#connecte", 300);
  await p.locator("#connecte").getByRole("button", { name: "Publicités", exact: true }).click();
  await p.waitForTimeout(500);
  await shot(p, "tout-connecte-ordinateur-sombre");
  // Personnalisation
  await at(p, "#personnalisation", 250);
  await p.locator("#personnalisation").getByLabel("Titre de l'accueil").fill("Bien dormir, simplement.");
  await p.locator("#personnalisation").getByLabel("Coins arrondis").uncheck();
  await p.waitForTimeout(400);
  check("Personnalisation : l'aperçu suit les réglages", (await p.locator("#personnalisation p:has-text('Bien dormir, simplement.')").count()) === 1);
  await shot(p, "personnalisation-ordinateur-sombre");
  await at(p, "#plateformes", 0);
  await shot(p, "plateformes-ordinateur-sombre");
  await at(p, "#offre", 0);
  await shot(p, "tarifs-ordinateur-sombre");
  await at(p, "footer", -300);
  await shot(p, "pied-de-page-ordinateur-sombre");
  check("Ordinateur sombre : aucun débordement horizontal", (await overflow(p)) <= 0, `${await overflow(p)}px`);
  await p.context().close();
}

// ---------------------------------------------------------------- Ordinateur, thème clair (système), bascule et mémorisation
{
  const p = await open({ viewport: { width: 1440, height: 900 }, colorScheme: "light" }, "ordinateur-clair");
  check("Thème système clair appliqué à la première visite", !isDark(await bg(p)), await bg(p));
  await shot(p, "accueil-ordinateur-clair");
  await p.locator("main section").first().screenshot({ path: `${OUT}/video-hero-clair.png` });
  await sweep(p);
  for (const [sel, off, file] of [["#fonctionnement", 250, "fonctionnement-ordinateur-clair"], ["#fonctionnalites", 330, "parcours-marque-ordinateur-clair"], ["#module-store", -250, "parcours-boutique-ordinateur-clair"], ["#marque", 300, "marque-ordinateur-clair"], ["#boutiques", 300, "boutique-ordinateur-clair"], ["#themes", 0, "themes-ordinateur-clair"], ["#visuels", 0, "images-ordinateur-clair"], ["#editeur-publicite", -100, "editeur-publicite-ordinateur-clair"], ["#seo", -40, "seo-ordinateur-clair"], ["#social", 250, "reseaux-ordinateur-clair"], ["#connecte", 300, "tout-connecte-ordinateur-clair"], ["#personnalisation", 250, "personnalisation-ordinateur-clair"], ["#plateformes", 0, "plateformes-ordinateur-clair"], ["#demonstrations", 0, "demonstrations-ordinateur-clair"], ["#offre", 0, "tarifs-ordinateur-clair"], ["#questions", 0, "faq-ordinateur-clair"]] as const) {
    await at(p, sel, off);
    await shot(p, file);
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  // Bascule vers le sombre
  await p.getByRole("button", { name: "Passer en thème sombre" }).first().click();
  await p.waitForTimeout(700);
  const stored = await p.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem("ecs-theme")]);
  check("Bascule clair → sombre (soleil / lune)", stored[0] === "dark" && stored[1] === "dark" && isDark(await bg(p)), stored.join(" / "));
  // Rechargement : le choix est conservé, sans flash (thème posé avant l'affichage)
  await p.reload({ waitUntil: "domcontentloaded" });
  const early = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
  check("Thème mémorisé et appliqué dès le chargement (pas de flash)", early.theme === "dark", JSON.stringify(early));
  await p.waitForLoadState("load");
  await p.waitForTimeout(800);
  check("Thème mémorisé l'emporte sur le thème système", isDark(await bg(p)), await bg(p));
  await p.getByRole("button", { name: "Passer en thème clair" }).first().click();
  await p.waitForTimeout(700);
  check("Bascule sombre → clair", !isDark(await bg(p)) && (await p.evaluate(() => localStorage.getItem("ecs-theme"))) === "light");
  // Navigation au clavier : lien d'évitement en premier (page rechargée, aucun élément actif)
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(800);
  await p.keyboard.press("Tab");
  const firstFocus = await p.evaluate(() => document.activeElement?.textContent?.trim());
  check("Clavier : premier arrêt « Aller au contenu »", firstFocus === "Aller au contenu", String(firstFocus));
  // Vidéo indisponible : affichage de secours
  await p.context().unroute("**/explainers/film-court.mp4");
  await p.context().route("**/explainers/film-court.mp4", (r) => r.abort());
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(2000);
  const fallback = await p.locator("text=La vidéo n'a pas pu être chargée.").count();
  check("Vidéo indisponible : image et lien de secours affichés", fallback === 1);
  await p.locator("main section").first().screenshot({ path: `${OUT}/video-secours-clair.png` });
  await p.context().close();
}

// ---------------------------------------------------------------- Téléphone (sombre et clair) et tablette
for (const [label, theme] of [["sombre", "dark"], ["clair", "light"]] as const) {
  const p = await open({ viewport: { width: 390, height: 844 }, theme, isMobile: true, hasTouch: true }, `telephone-${label}`);
  await shot(p, `accueil-telephone-${label}`);
  await p.locator("main section").first().screenshot({ path: `${OUT}/video-hero-telephone-${label}.png` });
  // Menu
  await p.getByRole("button", { name: "Ouvrir le menu" }).click();
  await p.waitForTimeout(400);
  const dialog = p.getByRole("dialog", { name: "Menu" });
  check(`Téléphone ${label} : menu ouvert (liens, langue, thème, connexion)`, (await dialog.isVisible()) && (await dialog.getByRole("link").count()) >= 5 && (await dialog.getByRole("button", { name: /Passer en thème/ }).count()) === 1);
  await shot(p, `menu-telephone-${label}`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  check(`Téléphone ${label} : Échap ferme le menu`, !(await dialog.isVisible()));
  // Thème depuis le menu
  await p.getByRole("button", { name: "Ouvrir le menu" }).click();
  await dialog.getByRole("button", { name: /Passer en thème/ }).click();
  await p.waitForTimeout(600);
  const switched = await p.evaluate(() => localStorage.getItem("ecs-theme"));
  check(`Téléphone ${label} : bascule du thème depuis le menu`, switched === (theme === "dark" ? "light" : "dark"), String(switched));
  await dialog.getByRole("button", { name: /Passer en thème/ }).click();
  await dialog.getByRole("link", { name: /Tarifs/ }).click();
  await p.waitForTimeout(1200);
  check(`Téléphone ${label} : un lien du menu ferme le menu et mène à la section`, !(await dialog.isVisible()) && (await p.evaluate(() => Math.abs(document.querySelector("#offre")!.getBoundingClientRect().top) < 140)));
  await sweep(p);
  for (const [sel, off, file] of [["#fonctionnement", 600, "fonctionnement"], ["#module-brand", -120, "parcours-marque"], ["#module-store", -120, "parcours-boutique"], ["#module-video", -120, "parcours-videos"], ["#marque", 300, "marque"], ["#editeur-publicite", -60, "editeur-publicite"], ["#social", 650, "reseaux"], ["#plateformes", 450, "plateformes"], ["#offre", 380, "tarifs"]] as const) {
    await at(p, sel, off);
    await shot(p, `${file}-telephone-${label}`);
  }
  await at(p, "#module-store", -120);
  check(`Téléphone ${label} : rail des modules fixé pendant le parcours`, await p.evaluate(() => { const el = document.querySelector("[aria-label='Modules du studio'][role=list]")!; const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < 160; }));
  check(`Téléphone ${label} : aucun débordement horizontal`, (await overflow(p)) <= 0, `${await overflow(p)}px`);
  const small = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("main a, main button, header a, header button")).filter((e) => e.parentElement?.tagName !== "P").filter((e) => { const w = e.offsetWidth, h = e.offsetHeight; return w > 0 && h > 0 && (h < 43.5 || w < 43.5) && getComputedStyle(e).visibility !== "hidden" && !e.closest("[aria-hidden=true]"); }).map((e) => (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 24)));
  check(`Téléphone ${label} : commandes tactiles d'au moins 44 × 44 px (liens dans le texte exceptés)`, small.length === 0, small.slice(0, 6).join(" | "));
  await p.context().close();
}
for (const [w, h, name] of [[768, 1024, "tablette"], [1024, 768, "portable"], [360, 740, "petit-telephone"]] as const) {
  const p = await open({ viewport: { width: w, height: h }, colorScheme: "dark" }, name);
  await sweep(p);
  check(`${name} (${w}px) : aucun débordement horizontal`, (await overflow(p)) <= 0, `${await overflow(p)}px`);
  await shot(p, `accueil-${name}-sombre`);
  await p.context().close();
}

// ---------------------------------------------------------------- Interface anglaise
for (const [w, h, name] of [[1440, 900, "ordinateur"], [390, 844, "telephone"]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: "light", locale: "en-US", deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: "ecs-lang", value: "en", url: BASE }]);
  await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} });
  if (process.env.TEST_WEBM) await ctx.route("**/explainers/film-court.en.mp4", (r) => r.fulfill({ path: process.env.TEST_WEBM!.replace(/\.webm$/, ".en.webm"), contentType: "video/webm" }));
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`anglais-${name}: ${e.message}`));
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  const h1 = (await p.locator("h1").textContent())?.replace(/\s+/g, " ").trim();
  check(`Anglais (${name}) : accroche traduite`, h1 === "Your entire e‑commerce business. One studio.", String(h1));
  await shot(p, `accueil-${name}-anglais-clair`);
  await sweep(p);
  check(`Anglais (${name}) : aucun débordement horizontal`, (await overflow(p)) <= 0);
  await at(p, "#fonctionnalites", 330);
  await shot(p, `parcours-${name}-anglais-clair`);
  await ctx.close();
}

// ---------------------------------------------------------------- Mouvement réduit
{
  const p = await open({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" }, "mouvement-reduit");
  const v = await p.evaluate(() => ({ paused: document.querySelector<HTMLVideoElement>("main video")!.paused, controls: document.querySelector<HTMLVideoElement>("main video")!.controls }));
  check("Mouvement réduit : la vidéo ne démarre pas seule, commandes affichées", v.paused && v.controls, JSON.stringify(v));
  await at(p, "#demonstrations", 0);
  const hidden = await p.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>(".reveal")).filter((e) => getComputedStyle(e).opacity === "0").length);
  check("Mouvement réduit : tout le contenu est visible sans animation", hidden === 0, `${hidden} masqué(s)`);
  await p.context().close();
}

check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
await browser.close();
const ok = results.filter((r) => r[1]).length;
fs.writeFileSync(`${OUT}/verifications.txt`, results.map(([n, k, d]) => `${k ? "OK " : "ÉCHEC "} ${n}${d ? ` — ${d}` : ""}`).join("\n") + `\n\n${ok}/${results.length} vérifications réussies\n`);
console.log(`${ok}/${results.length} vérifications réussies`);
process.exit(ok === results.length ? 0 : 1);
