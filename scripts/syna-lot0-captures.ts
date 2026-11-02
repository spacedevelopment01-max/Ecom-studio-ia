/**
 * Mission #282, lot 0 — captures et contrôles de la vitrine des fondations SYNA dans un vrai navigateur.
 *
 *   npx tsx scripts/syna-lot0-captures.ts <dossier-captures> [adresse-du-studio]
 *
 * Le studio doit tourner en développement (la vitrine `/syna-fondations` est fermée en production). Aucune donnée,
 * aucun appel IA, aucun coût. Pour chaque taille (360, 390, 1024, 1440), chaque mode (Encre, Plein cadre) et chaque
 * apparence (clair, sombre) : capture pleine page, débordement horizontal, erreurs JavaScript, polices chargées,
 * contraste mesuré de chaque texte visible. Puis : focus au clavier, cibles tactiles, animations réduites et bascule
 * de mode qui garde le brouillon, la sélection et la tâche. Résultat : `rapport.json` dans le dossier.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const out = path.resolve(process.argv[2] ?? "reports/syna-lot0");
const origin = (process.argv[3] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
fs.mkdirSync(out, { recursive: true });

const SIZES = [
  { label: "telephone-360", width: 360, height: 780, mobile: true },
  { label: "telephone-390", width: 390, height: 844, mobile: true },
  { label: "tablette-1024", width: 1024, height: 1366, mobile: false },
  { label: "ordinateur-1440", width: 1440, height: 900, mobile: false },
] as const;
const MODES = ["encre", "plein"] as const;
const SCHEMES = ["light", "dark"] as const;

async function open(browser: Browser, size: (typeof SIZES)[number], query: string, extra: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, locale: "fr-FR", hasTouch: size.mobile, isMobile: size.mobile, ...extra });
  // `__name` : aide ajoutée par tsx autour des fonctions nommées passées au navigateur ; l'intro du Studio est déjà vue.
  await context.addInitScript({ content: "window.__name=function(f){return f};try{sessionStorage.setItem('ecsSeen','1')}catch(e){}" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  await page.goto(`${origin}/syna-fondations?${query}`, { waitUntil: "networkidle", timeout: 240000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return { page, errors, close: () => context.close() };
}

/** Contraste réel : couleur calculée du texte contre le fond effectif (fonds semi-transparents composés). */
function measureContrast(page: Page) {
  return page.evaluate(() => {
    const parse = (c: string) => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const over = (top: ReturnType<typeof parse>, under: ReturnType<typeof parse>) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
    function background(el: Element | null): ReturnType<typeof parse> | null {
      const layers: ReturnType<typeof parse>[] = [];
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.backgroundImage !== "none" && !cs.backgroundImage.startsWith("linear-gradient")) return null; // texte sur image : non mesuré ici
        const c = parse(cs.backgroundColor);
        if (c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      }
      let acc = { r: 255, g: 255, b: 255, a: 1 };
      for (const l of layers.reverse()) acc = over(l, acc);
      return acc;
    }
    const results: { text: string; ratio: number; min: number }[] = [];
    let skipped = 0;
    for (const el of document.querySelectorAll(".syna-ui *")) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => n.textContent!.trim()).join(" ");
      if (!own) continue;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === "hidden" || Number(cs.opacity) === 0 || el.closest("[aria-hidden='true'] svg")) continue;
      if ((el as HTMLElement).closest("button:disabled")) continue; // inactif : exempté par WCAG
      const bg = background(el);
      if (!bg) { skipped++; continue; }
      const fg = over(parse(cs.color), bg);
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
      results.push({ text: own.slice(0, 40), ratio: (hi + 0.05) / (lo + 0.05), min: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5 });
    }
    const fails = results.filter((x) => x.ratio < x.min);
    return { measured: results.length, skipped, min: Math.min(...results.map((x) => x.ratio)), fails: fails.slice(0, 12).map((x) => `${x.text} : ${x.ratio.toFixed(2)}`) };
  });
}

const report: Record<string, unknown> = { origin, date: new Date().toISOString(), pages: [] as unknown[] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
try {
  for (const size of SIZES) for (const mode of MODES) for (const scheme of SCHEMES) {
    const { page, errors, close } = await open(browser, size, `mode=${mode}&appearance=${scheme}`);
    const file = `${size.label}--${mode}--${scheme === "light" ? "clair" : "sombre"}.png`;
    await page.screenshot({ path: path.join(out, file), fullPage: true });
    const shell = page.locator(".sv-shell-box");
    await shell.screenshot({ path: path.join(out, `coquille--${size.label}--${mode}--${scheme === "light" ? "clair" : "sombre"}.png`) });
    // Polices du mode affiché (les polices de l'autre mode ne sont chargées que lorsqu'il est choisi).
    const wanted = mode === "encre" ? ["Syna Newsreader", "Syna Geist", "Syna Geist Mono"] : ["Syna Onest", "Syna Bricolage", "Syna Geist Mono"];
    const facts = await page.evaluate((fonts) => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      fontsMissing: fonts.filter((f) => ![...document.fonts].some((ff) => ff.family.replace(/"/g, "") === f && ff.status === "loaded")),
    }), wanted);
    const contrast = await measureContrast(page);
    (report.pages as unknown[]).push({ file, errors, ...facts, contrast });
    console.log(`${file} : débordement ${facts.overflow}, erreurs ${errors.length}, polices manquantes ${facts.fontsMissing.length}, contraste min ${contrast.min.toFixed(2)} (${contrast.measured} textes, ${contrast.fails.length} sous le seuil)`);
    await close();
  }

  // Clavier : chaque élément atteint par Tab montre un anneau de focus.
  {
    const { page, close } = await open(browser, SIZES[3], "mode=encre&appearance=light");
    const seen: { tag: string; text: string; outline: boolean }[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      seen.push(await page.evaluate(() => {
        const a = document.activeElement as HTMLElement;
        const cs = getComputedStyle(a);
        // La zone de saisie montre son focus par l'anneau de son cadre (`:focus-within`), pas sur le champ lui-même.
        const frame = a.closest(".sy-composer");
        const ring = frame ? getComputedStyle(frame).boxShadow.includes("0px 0px 0px 2px") : false;
        return { tag: a.tagName, text: (a.getAttribute("aria-label") ?? a.textContent ?? "").trim().slice(0, 30), outline: ring || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) };
      }));
    }
    await page.keyboard.press("Shift+Tab");
    await page.screenshot({ path: path.join(out, "clavier--focus.png"), clip: { x: 0, y: 0, width: 1440, height: 900 } });
    report.keyboard = { reached: seen.length, withoutRing: seen.filter((s) => !s.outline && s.tag !== "BODY") };
    console.log(`Clavier : ${seen.length} arrêts, ${(report.keyboard as { withoutRing: unknown[] }).withoutRing.length} sans anneau de focus`);
    await close();
  }

  // Cibles tactiles au téléphone (pointeur grossier) : au moins 40 px de haut, 44 px pour les boutons principaux.
  for (const mode of MODES) {
    const { page, close } = await open(browser, SIZES[1], `mode=${mode}&appearance=light`);
    const small = await page.evaluate(() => [...document.querySelectorAll(".syna-ui button")].map((b) => {
      const r = b.getBoundingClientRect(), x = getComputedStyle(b, "::after");
      const pad = x.content !== "none" && x.position === "absolute" ? 18 : 0; // zone de toucher élargie par ::after
      return { text: (b.getAttribute("aria-label") ?? b.textContent ?? "").trim().slice(0, 30), h: Math.round(r.height + pad), w: Math.round(r.width + pad), visible: r.width > 0 };
    }).filter((b) => b.visible && (b.h < 40 || b.w < 40)));
    (report as Record<string, unknown>)[`touch-${mode}`] = small;
    console.log(`Cibles tactiles (${mode}) : ${small.length} sous 40 px`);
    await close();
  }

  // Animations réduites : rien ne tourne ni ne glisse.
  {
    const { page, close } = await open(browser, SIZES[3], "mode=encre", { reducedMotion: "reduce" });
    report.reducedMotion = await page.evaluate(() => [".sy-state[data-state='running'] .sy-icon", ".sy-progress[data-indeterminate] > i", ".sy-card[data-state='running']"].map((s) => {
      const el = document.querySelector(s)!;
      const cs = getComputedStyle(el, s.endsWith("]") && s.startsWith(".sy-card") ? "::before" : undefined);
      return { s, duration: cs.animationDuration };
    }));
    console.log("Animations réduites :", JSON.stringify(report.reducedMotion));
    await close();
  }

  // Bascule de mode : brouillon, sélection, tâche et page restent identiques.
  for (const size of [SIZES[1], SIZES[3]]) {
    const { page, errors, close } = await open(browser, size, "mode=encre&appearance=light&view=conversation");
    const draft = "Rends le titre plus court, sans changer la photo";
    await page.locator(".sy-composer textarea").first().fill(draft);
    const snap = () => page.evaluate(() => ({
      mode: document.querySelector(".syna-ui")!.getAttribute("data-syna-mode"),
      draft: (document.querySelector(".sy-composer textarea") as HTMLTextAreaElement).value,
      chip: document.querySelector(".sy-convo .sy-chip-name")?.textContent ?? null,
      task: document.querySelector(".sy-convo .sy-card .sy-state")?.textContent ?? null,
      url: location.pathname + location.search,
      scroll: Math.round(scrollY),
    }));
    const before = await snap();
    await page.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Plein cadre" }).click();
    const during = await snap();
    await page.screenshot({ path: path.join(out, `bascule--${size.label}--plein.png`) });
    await page.getByRole("group", { name: "Mode" }).getByRole("button", { name: "Encre" }).click();
    const after = await snap();
    const ok = during.mode === "plein" && after.mode === "encre" && [during, after].every((s) => s.draft === draft && s.chip === before.chip && s.task === before.task && s.url === before.url);
    (report as Record<string, unknown>)[`bascule-${size.label}`] = { ok, before, during, after, errors };
    console.log(`Bascule ${size.label} : ${ok ? "brouillon, sélection, tâche et page conservés" : "ÉCHEC"}`);
    await close();
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, "rapport.json"), JSON.stringify(report, null, 2));
}
