/**
 * Audit des animations de l'accueil (lecture seule : aucun fichier de l'application n'est modifié).
 * Mesure dans Chromium l'évolution réelle des styles calculés pendant les animations, et enregistre des vidéos
 * du navigateur. Sorties : reports/homepage-animation-audit/mesures.json et videos/*.webm.
 *   (serveur) DATA_DIR=/tmp/hp STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next start -p 3091
 *   BASE=http://localhost:3091 TEST_WEBM=/tmp/hp/film-court.webm npx tsx reports/homepage-animation-audit/audit.ts
 * TEST_WEBM : copie WebM du film d'entrée pour le Chromium de test (qui ne lit pas le H.264 du fichier d'origine).
 */
import fs from "node:fs";
import { chromium, type BrowserContext, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3091";
const DIR = "reports/homepage-animation-audit";
const VID = `${DIR}/videos`;
fs.mkdirSync(VID, { recursive: true });
const out: Record<string, unknown> = {};
const results: [string, boolean, string][] = [];
const check = (n: string, ok: boolean, d = "") => (results.push([n, ok, d]), console.log(`${ok ? "✓" : "✗"} ${n}${d ? ` — ${d}` : ""}`));
const errors: string[] = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function ctxFor(opts: Parameters<typeof browser.newContext>[0], record?: string): Promise<BrowserContext> {
  const ctx = await browser.newContext({ locale: "fr-FR", deviceScaleFactor: 1, ...opts, ...(record ? { recordVideo: { dir: `${VID}/${record}`, size: opts!.viewport as { width: number; height: number } } } : {}) });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} });
  if (process.env.TEST_WEBM) await ctx.route("**/explainers/film-court.mp4", (r) => r.fulfill({ path: process.env.TEST_WEBM!, contentType: "video/webm" }));
  return ctx;
}
async function load(ctx: BrowserContext, label: string) {
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  return p;
}
/** Échantillonne une expression dans la page toutes les `step` ms pendant `ms` ms. */
async function sample<T>(p: Page, expr: string, ms: number, step = 60): Promise<{ t: number; v: T }[]> {
  return p.evaluate(async ([e, total, st]) => {
    const f = new Function(`return (${e})`) as () => any;
    const res: { t: number; v: any }[] = [];
    const t0 = performance.now();
    while (performance.now() - t0 <= (total as number)) {
      res.push({ t: Math.round(performance.now() - t0), v: f() });
      await new Promise((r) => setTimeout(r, st as number));
    }
    return res;
  }, [expr, ms, step] as const);
}
const distinct = (a: { v: unknown }[]) => new Set(a.map((x) => JSON.stringify(x.v))).size;
/** Défilement « humain » à la molette (petits crans), comme un visiteur. */
async function wheelTo(p: Page, y: number, stepPx = 110, pause = 45) {
  for (let i = 0; i < 400; i++) {
    const cur = await p.evaluate(() => window.scrollY);
    if (Math.abs(cur - y) < stepPx) break;
    await p.mouse.wheel(0, cur < y ? stepPx : -stepPx);
    await p.waitForTimeout(pause);
  }
}
const topOf = (p: Page, sel: string) => p.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().top + window.scrollY, sel);

const MODE = process.env.MODE ?? "tout";
if (MODE !== "videos") {
// ===================================================================== 1. Ordinateur, sombre : mesures
{
  const ctx = await ctxFor({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
  const p = await load(ctx, "mesures-ordinateur");
  await p.mouse.move(700, 450);

  // 1a. Apparition d'une section (.reveal : opacité 0 → 1 et translation 28px → 0 en 0,9 s)
  const target = "#marque .hp-eyebrow";
  const before = await p.evaluate((s) => { const e = document.querySelector(s)!; const c = getComputedStyle(e); return { opacity: c.opacity, transform: c.transform, cls: e.className }; }, target);
  await p.evaluate((s) => window.scrollTo(0, document.querySelector(s)!.getBoundingClientRect().top + window.scrollY - 400), target);
  const reveal = await sample<{ o: number; ty: number }>(p, `(() => { const c = getComputedStyle(document.querySelector("${target}")); const m = new DOMMatrix(c.transform); return { o: +(+c.opacity).toFixed(2), ty: Math.round(m.m42) }; })()`, 1300, 80);
  out.apparition = { element: target, avant: before, pendant: reveal };
  check("Apparition au défilement : opacité et position évoluent progressivement (0,9 s)", before.opacity === "0" && reveal[0].v.o < 1 && reveal.at(-1)!.v.o === 1 && distinct(reveal) >= 5, `${reveal.map((r) => `${r.t}ms:${r.v.o}/${r.v.ty}px`).slice(0, 8).join(" ")}`);

  // 1b. Titres mot à mot ? (non utilisés dans la refonte) — on vérifie seulement la classe .reveal sur les titres
  out.nombreElementsReveal = await p.evaluate(() => document.querySelectorAll(".reveal").length);

  // 1c. Effet lié au défilement : inclinaison de la vidéo d'entrée (--p posé par ScrollFX)
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(400);
  const tilt: { y: number; p: string; transform: string }[] = [];
  for (const y of [0, 120, 240, 360, 480]) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(150);
    tilt.push(await p.evaluate((yy) => { const e = document.querySelector<HTMLElement>("[data-sfx]")!; return { y: yy, p: e.style.getPropertyValue("--p"), transform: getComputedStyle(e).transform }; }, y));
  }
  out.inclinaisonHero = tilt;
  check("Ordinateur : l'inclinaison de la vidéo d'entrée varie au défilement", new Set(tilt.map((x) => x.transform)).size >= 4, tilt.map((x) => `${x.y}px→--p ${x.p} ${x.transform === "none" || /matrix\(1, 0, 0, 1/.test(x.transform) ? "(à plat)" : ""}`).join(", "));

  // 1d. Parcours des 7 modules : le panneau actif change avec le texte lu, avec un fondu mesuré
  const modules = ["brand", "store", "images", "ads", "video", "seo", "social"];
  const seen: string[] = [];
  const fades: unknown[] = [];
  for (const m of modules) {
    const y = (await topOf(p, `#module-${m}`)) - 300;
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    const f = await sample<number[]>(p, `Array.from(document.querySelectorAll(".hp-panel")).map((e) => +(+getComputedStyle(e).opacity).toFixed(2))`, 700, 70);
    fades.push({ module: m, opacites: f.map((x) => ({ t: x.t, v: x.v })) });
    seen.push((await p.locator("nav[aria-label='Modules du studio'] [aria-current='step']").textContent())?.trim() ?? "");
    await p.waitForTimeout(200);
  }
  out.parcours = { ordreAffiche: seen, fondus: fades };
  check("Parcours Marque → Boutique → Images → Publicités → Vidéos → SEO → Réseaux sociaux dans cet ordre", seen.join(">") === "Marque>Boutique>Images>Publicités>Vidéos>SEO>Réseaux sociaux", seen.join(" > "));
  const fadeStore = (fades[1] as any).opacites as { v: number[] }[];
  check("Parcours : fondu progressif entre panneaux (valeurs intermédiaires mesurées)", fadeStore.some((x) => x.v.some((o) => o > 0.05 && o < 0.95)), JSON.stringify(fadeStore.slice(0, 5).map((x) => x.v.filter((o) => o > 0))));
  const sticky = await p.evaluate(() => { const w = document.querySelector("nav[aria-label='Modules du studio']")!.closest(".sticky")!; return getComputedStyle(w).position; });
  check("Parcours : fenêtre du studio fixée (position sticky) pendant la lecture", sticky === "sticky", sticky);

  // 1e. « Comment ça fonctionne » : enchaînement automatique des étapes (6,5 s) et barre de temps
  await p.evaluate(() => window.scrollTo(0, document.querySelector("#fonctionnement")!.getBoundingClientRect().top + window.scrollY + 200));
  const steps = await sample<string>(p, `document.querySelector("#fonctionnement [aria-current=step]")?.textContent?.slice(0, 40) ?? ""`, 14500, 500);
  const bar = await p.evaluate(() => { const b = document.querySelector<HTMLElement>("#fonctionnement .hp-fill"); return b ? getComputedStyle(b).animationName : null; });
  out.fonctionnement = { etapes: steps, animationBarre: bar };
  check("Comment ça fonctionne : les étapes s'enchaînent seules (au moins 2 changements en 14 s)", distinct(steps) >= 3, [...new Set(steps.map((s) => s.v.slice(0, 22)))].join(" | "));

  // 1f. Démonstrations : transitions mesurées
  await p.evaluate(() => window.scrollTo(0, document.querySelector("#editeur-publicite")!.getBoundingClientRect().top + window.scrollY - 100));
  await p.waitForTimeout(800);
  await p.locator("#visuels").getByRole("button", { name: "En haut à droite" }).click();
  const logo = await sample<number>(p, `Math.round(document.querySelector("#visuels button[aria-label='Sélectionner le logo']").getBoundingClientRect().left)`, 700, 50);
  check("Éditeur de publicité : le logo glisse vers sa nouvelle place (positions intermédiaires)", distinct(logo) >= 4, logo.map((x) => x.v).join(" → "));
  await p.locator("#visuels").getByRole("button", { name: "9:16" }).click();
  const ratio = await sample<number>(p, `(() => { const r = document.querySelector("#visuels button[aria-label='Sélectionner la photo']").parentElement.getBoundingClientRect(); return +(r.height / r.width).toFixed(2); })()`, 700, 50);
  check("Éditeur de publicité : changement de format animé (4:5 → 9:16)", distinct(ratio) >= 3, ratio.map((x) => x.v).join(" → "));
  out.editeurPublicite = { logoGauche: logo, rapportHauteurLargeur: ratio };

  await p.evaluate(() => window.scrollTo(0, document.querySelector("#connecte")!.getBoundingClientRect().top + window.scrollY + 300));
  const hub = await sample<string>(p, `document.querySelector("#connecte button[aria-pressed=true]")?.textContent ?? ""`, 7500, 400);
  const dash = await p.evaluate(() => { const l = document.querySelector("#connecte .hp-flow"); return l ? getComputedStyle(l).animationName + " " + getComputedStyle(l).animationDuration : null; });
  out.toutConnecte = { noeudActif: hub, animationLien: dash };
  check("Tout est connecté : rotation automatique du module mis en avant et lien animé", distinct(hub) >= 2 && !!dash?.startsWith("hp-dash"), `${[...new Set(hub.map((h) => h.v))].join(" → ")} ; ${dash}`);

  await p.evaluate(() => window.scrollTo(0, document.querySelector("#personnalisation")!.getBoundingClientRect().top + window.scrollY + 250));
  await p.waitForTimeout(600);
  await p.locator("#personnalisation").getByLabel("Coins arrondis").uncheck();
  const radius = await sample<string>(p, `getComputedStyle(document.querySelector("#personnalisation img")).borderTopLeftRadius`, 450, 40);
  check("Personnalisation : arrondis qui changent en douceur", distinct(radius) >= 3, radius.map((x) => x.v).join(" → "));
  out.personnalisation = radius;

  // 1g. Bascule de thème : couleur du fond et durée de chaque image pendant le fondu (0,45 s prévus)
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(500);
  const theme = (await p.evaluate(`(async () => {
    const btn = document.querySelector("header button[aria-label^='Passer en thème']");
    const hp = document.querySelector(".hp");
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(performance.now())));
    await frame();
    const t0 = performance.now();
    btn.click();
    const res = [];
    for (let i = 0; i < 30; i++) { const t = await frame(); res.push({ t: Math.round(t - t0), bg: getComputedStyle(hp).backgroundColor }); }
    return res;
  })()`)) as { t: number; bg: string }[];
  const gaps = theme.map((x, i) => x.t - (i ? theme[i - 1].t : 0));
  out.basculeTheme = { images: theme, ecartsMs: gaps, nombreElementsPage: await p.evaluate(() => document.querySelectorAll("*").length) };
  const inter = new Set(theme.map((x) => x.bg)).size;
  check("Bascule clair / sombre : le fondu existe (couleurs intermédiaires)", inter >= 3, `${inter} couleurs différentes`);
  check("Bascule clair / sombre : fondu fluide (images ≤ 50 ms)", Math.max(...gaps) <= 50, `écarts entre images : ${gaps.slice(0, 12).join(", ")} ms`);
  await p.getByRole("button", { name: "Passer en thème sombre" }).first().click();
  await p.waitForTimeout(1500);

  // 1h. Défilement non bloqué et fluidité
  const blockers = await p.evaluate(() => ({ html: getComputedStyle(document.documentElement).overflowY, body: getComputedStyle(document.body).overflowY, snap: getComputedStyle(document.documentElement).scrollSnapType }));
  const startY = await p.evaluate(() => window.scrollY);
  for (let i = 0; i < 40; i++) await p.mouse.wheel(0, 300);
  await p.waitForTimeout(400);
  const endY = await p.evaluate(() => window.scrollY);
  check("Défilement jamais bloqué : la molette fait défiler la page (aucun overflow caché, aucun aimantage)", endY - startY > 8000 && blockers.body !== "hidden" && blockers.snap === "none", `${startY} → ${endY}px ; ${JSON.stringify(blockers)}`);
  // Mesure d'images par seconde pendant un défilement continu de toute la page
  await p.evaluate(() => window.scrollTo(0, 0));
  const perf = (await p.evaluate(`(async () => {
    const frames = []; let longTasks = 0;
    try { new PerformanceObserver((l) => (longTasks += l.getEntries().length)).observe({ type: "longtask" }); } catch (e) {}
    const H = document.body.scrollHeight - innerHeight;
    let last = performance.now(); const t0 = last;
    await new Promise((done) => {
      const tick = (t) => { frames.push(t - last); last = t; const k = Math.min(1, (t - t0) / 12000); window.scrollTo(0, H * k); k < 1 ? requestAnimationFrame(tick) : done(); };
      requestAnimationFrame(tick);
    });
    frames.shift();
    const s = [...frames].sort((a, b) => a - b);
    return { images: frames.length, ips: +(1000 / (frames.reduce((a, b) => a + b, 0) / frames.length)).toFixed(1), p95ms: +s[Math.floor(s.length * 0.95)].toFixed(1), maxms: +s[s.length - 1].toFixed(1), tachesLongues: longTasks, hauteurPage: H };
  })()`)) as { images: number; ips: number; p95ms: number; maxms: number; tachesLongues: number; hauteurPage: number };
  out.fluidite = perf;
  check("Fluidité (Chromium de test, sans carte graphique) : défilement de toute la page mesuré", perf.ips >= 30, `${perf.ips} images/s, 95e centile ${perf.p95ms} ms, max ${perf.maxms} ms, ${perf.tachesLongues} tâches longues, page ${perf.hauteurPage}px`);
  await ctx.close();
}

// ===================================================================== 2. Téléphone : mesures
{
  const ctx = await ctxFor({ viewport: { width: 390, height: 844 }, colorScheme: "light", isMobile: true, hasTouch: true });
  const p = await load(ctx, "mesures-telephone");
  const tiltM: { y: number; transform: string }[] = [];
  for (const y of [0, 100, 200, 300, 400]) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(150);
    tiltM.push({ y, transform: await p.evaluate(() => getComputedStyle(document.querySelector("[data-sfx]")!).transform) });
  }
  out.inclinaisonHeroTelephone = tiltM;
  check("Téléphone : l'inclinaison de la vidéo d'entrée varie au défilement", new Set(tiltM.map((x) => x.transform)).size >= 4, tiltM.map((x) => `${x.y}px`).join(", "));
  const pills: string[] = [];
  const rails: number[] = [];
  for (const m of ["brand", "store", "images", "ads", "video", "seo", "social"]) {
    await p.evaluate((s) => window.scrollTo(0, document.querySelector(s)!.getBoundingClientRect().top + window.scrollY - 120), `#module-${m}`);
    await p.waitForTimeout(700);
    pills.push((await p.locator("[role=list][aria-label='Modules du studio'] [aria-current=step]").textContent())?.trim() ?? "");
    rails.push(await p.evaluate(() => Math.round(document.querySelector("[role=list][aria-label='Modules du studio']")!.scrollLeft)));
  }
  out.telephoneParcours = { pastilleActive: pills, defilementRail: rails };
  check("Téléphone : la pastille active du rail suit les 7 modules, et le rail défile pour la montrer", pills.join(">") === "Marque>Boutique>Images>Publicités>Vidéos>SEO>Réseaux sociaux" && new Set(rails).size >= 3, `${pills.join(" > ")} ; rail ${rails.join("/")}px`);
  const panelVisible = await p.evaluate(() => { const w = document.querySelector("#module-store .hp-window")!; const c = getComputedStyle(w); return c.display !== "none" && w.getBoundingClientRect().height > 200; });
  check("Téléphone : chaque module a son aperçu sous le texte", panelVisible);
  // Défilement tactile (glisser) non bloqué
  const y0 = await p.evaluate(() => window.scrollY);
  const cdp = await ctx.newCDPSession(p);
  // Glisser au doigt : vrais événements tactiles (Input.synthesizeScrollGesture ne fait rien dans ce Chromium, même sur une page vide)
  for (let k = 0; k < 6; k++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 700 }] });
    for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200, y: 700 - i * 50 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(150);
  }
  const y1 = await p.evaluate(() => window.scrollY);
  check("Téléphone : défilement au doigt fluide et non bloqué", y1 - y0 > 2000, `${y0} → ${y1}px`);
  // Menu : ouverture et blocage volontaire du défilement de la page sous le menu, rétabli à la fermeture
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.getByRole("button", { name: "Ouvrir le menu" }).click();
  const locked = await p.evaluate(() => document.body.style.overflow);
  await p.keyboard.press("Escape");
  const unlocked = await p.evaluate(() => document.body.style.overflow);
  check("Téléphone : le menu ouvert fige la page en dessous, puis le défilement revient à la fermeture", locked === "hidden" && unlocked === "", `${locked || "—"} → ${unlocked || "rétabli"}`);
  await ctx.close();
}

// ===================================================================== 3. Mouvement réduit
{
  const ctx = await ctxFor({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
  const p = await load(ctx, "mouvement-reduit");
  const r = await p.evaluate(() => {
    const e = document.querySelector("#marque .hp-eyebrow")!;
    const panel = document.querySelector(".hp-panel")!;
    return { revealOpacity: getComputedStyle(e).opacity, revealDuree: getComputedStyle(e).transitionDuration, panelDuree: getComputedStyle(panel).transitionDuration, sfx: getComputedStyle(document.querySelector("[data-sfx]")!).transform };
  });
  await p.evaluate(() => window.scrollTo(0, document.querySelector("#fonctionnement")!.getBoundingClientRect().top + window.scrollY + 200));
  const st = await sample<string>(p, `document.querySelector("#fonctionnement [aria-current=step]")?.textContent?.slice(0, 20) ?? ""`, 8000, 1000);
  out.mouvementReduit = { ...r, etapes: st };
  check("Mouvement réduit : contenu visible d'emblée, transitions coupées, pas d'enchaînement automatique", r.revealOpacity === "1" && parseFloat(r.revealDuree) < 0.001 && distinct(st) === 1, JSON.stringify(r));
  await ctx.close();
}

}
// ===================================================================== 4. Enregistrements vidéo du navigateur
async function recordDesktop(theme: "dark" | "light", name: string) {
  const ctx = await ctxFor({ viewport: { width: 1280, height: 720 }, colorScheme: theme }, name);
  const p = await load(ctx, name);
  await p.mouse.move(640, 360);
  await p.waitForTimeout(2500); // vidéo d'entrée qui joue
  await wheelTo(p, (await topOf(p, "#fonctionnement")) + 150);
  await p.waitForTimeout(7500); // enchaînement automatique d'une étape
  await wheelTo(p, (await topOf(p, "#fonctionnalites")) + 200);
  await wheelTo(p, (await topOf(p, "#module-social")) + 100, 70, 70); // parcours des 7 modules, lentement
  await p.waitForTimeout(800);
  await wheelTo(p, (await topOf(p, "#marque")) + 250);
  for (const b of ["Ostral", "Ronron"]) { await p.locator("#marque").getByRole("tab", { name: new RegExp(b) }).click(); await p.waitForTimeout(900); }
  await wheelTo(p, (await topOf(p, "#boutiques")) + 250);
  await p.locator("#boutiques").getByRole("button", { name: "Téléphone" }).click(); await p.waitForTimeout(1000);
  await p.locator("#boutiques").getByRole("button", { name: "Ordinateur" }).click(); await p.waitForTimeout(800);
  await wheelTo(p, (await topOf(p, "#themes")) + 50);
  await wheelTo(p, (await topOf(p, "#visuels")) + 500); // galerie horizontale fixée traversée
  await wheelTo(p, (await topOf(p, "#editeur-publicite")) - 60);
  await p.locator("#visuels").getByLabel("Titre", { exact: true }).fill("Dormez mieux.");
  for (const n of ["En haut à droite", "9:16", "1:1", "En bas", "4:5"]) { await p.locator("#visuels").getByRole("button", { name: n }).click(); await p.waitForTimeout(700); }
  await wheelTo(p, (await topOf(p, "#seo")) - 40);
  await p.locator("#seo").getByRole("tab", { name: "Article de blog" }).click(); await p.waitForTimeout(900);
  await wheelTo(p, (await topOf(p, "#social")) + 250);
  await p.locator("#social").getByRole("button", { name: "Approuver cette publication" }).click(); await p.waitForTimeout(900);
  await wheelTo(p, (await topOf(p, "#connecte")) + 250);
  await p.waitForTimeout(4000);
  await wheelTo(p, (await topOf(p, "#personnalisation")) + 250);
  await p.locator("#personnalisation").getByLabel("Coins arrondis").uncheck(); await p.waitForTimeout(700);
  await p.locator("#personnalisation").getByRole("button", { name: /^#/ }).nth(1).click(); await p.waitForTimeout(800);
  await wheelTo(p, 0, 400, 30);
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: /Passer en thème/ }).first().click(); await p.waitForTimeout(1300);
  await p.getByRole("button", { name: /Passer en thème/ }).first().click(); await p.waitForTimeout(1300);
  const v = p.video();
  await ctx.close();
  return v?.path();
}
async function recordPhone(theme: "dark" | "light", name: string) {
  const ctx = await ctxFor({ viewport: { width: 390, height: 844 }, colorScheme: theme, isMobile: true, hasTouch: true }, name);
  const p = await load(ctx, name);
  const cdp = await ctx.newCDPSession(p);
  const swipe = async (n: number, dist = 380) => {
    for (let k = 0; k < n; k++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 700 }] });
      for (let i = 1; i <= 12; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200, y: 700 - (i * dist) / 12 }] }); await p.waitForTimeout(16); }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await p.waitForTimeout(300);
    }
  };
  await p.waitForTimeout(2000);
  await p.getByRole("button", { name: "Ouvrir le menu" }).click(); await p.waitForTimeout(900);
  await p.getByRole("dialog").getByRole("button", { name: /Passer en thème/ }).click(); await p.waitForTimeout(1100);
  await p.getByRole("dialog").getByRole("button", { name: /Passer en thème/ }).click(); await p.waitForTimeout(900);
  await p.getByRole("button", { name: "Fermer le menu" }).click(); await p.waitForTimeout(600);
  await swipe(4);
  await p.waitForTimeout(3000);
  const target = (await topOf(p, "#module-social")) + 300;
  for (let i = 0; i < 40 && (await p.evaluate(() => window.scrollY)) < target; i++) await swipe(1, 300); // parcours des modules au doigt (borné)
  await swipe(6);
  await p.locator("#marque").getByRole("tab", { name: /Somnéa/ }).click().catch(() => {});
  await p.waitForTimeout(800);
  await swipe(5);
  await p.locator("#boutiques").getByRole("button", { name: "Téléphone" }).click().catch(() => {});
  await p.waitForTimeout(900);
  await swipe(12);
  const v = p.video();
  await ctx.close();
  return v?.path();
}
if (MODE !== "mesures") {
  const vids = {
    ordinateurSombre: await recordDesktop("dark", "ordinateur-sombre"),
    ordinateurClair: await recordDesktop("light", "ordinateur-clair"),
    telephoneClair: await recordPhone("light", "telephone-clair"),
    telephoneSombre: await recordPhone("dark", "telephone-sombre"),
  };
  out.videos = vids;
  check("Vidéos du navigateur enregistrées", Object.values(vids).every((v) => v && fs.existsSync(v)), Object.values(vids).join(", "));
}
check("Aucune erreur JavaScript pendant l'audit", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
out.resultats = results;
fs.writeFileSync(`${DIR}/${MODE === "videos" ? "videos" : "mesures"}.json`, JSON.stringify(out, null, 1));
console.log(`${results.filter((r) => r[1]).length}/${results.length} vérifications réussies`);
