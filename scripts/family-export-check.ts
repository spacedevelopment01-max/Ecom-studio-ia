/** Interactions des sections de bibliothèque dans les thèmes EXPORTÉS WordPress / WooCommerce et PrestaShop (issue #145).
 *
 * Pour chaque famille (FRAISE, SILLON, NOCTIL et TRAVERSE : boutique spécialisée, ORBE : e-commerce, Atelier Rive : services), ajoute les
 * sections interactives de la bibliothèque (carrousels, repères produits, avant / après, stories), exporte le projet
 * par le vrai moteur d'export, puis assemble une page avec :
 *  - le HTML rendu par le moteur PHP livré dans le thème exporté (même moteur que WordPress et PrestaShop) ;
 *  - les feuilles et le script du ZIP exporté (assets/js/theme.js pour WordPress, assets/js/es-theme.js pour PrestaShop).
 * Chaque interaction est testée dans Chromium (clic, curseur, clavier), une fois avec le script exporté et une fois
 * avec l'ancien assemblage (4 scripts fixes, sans family.js ni conversion.js) pour montrer l'écart corrigé.
 * Limite : ce n'est pas une installation dans un WordPress ou un PrestaShop réel (pas de Docker dans cet environnement).
 * Aucun appel réseau, aucune IA, aucun paiement. Visuels : kit privé public/demo/<id>/ (hors dépôt).
 *
 *   npx tsx scripts/family-export-check.ts <dossier-de-sortie>
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-export-familles-")); process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/exports-familles"); fs.mkdirSync(out, { recursive: true });
const { unzipSync, strFromU8 } = await import("fflate");
const { chromium } = await import("playwright");
const { demoProject } = await import("../tests/demo-fixtures");
const { createUser } = await import("../src/lib/auth");
const { loadProject } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { applyOps } = await import("../src/lib/theme/ops");
const { projectKind } = await import("../src/lib/theme/project-kind");
const { compileTheme } = await import("../src/lib/theme/compile");
const { libraryLoader } = await import("../src/lib/theme/loader");
const { withProjectMedia } = await import("../src/lib/theme/section-defaults");
const { sectionContentContext } = await import("../src/lib/theme/section-content");
const { FAMILY_LIBRARY } = await import("../src/lib/theme/section-families");
const { cmsExport } = await import("../src/lib/cms-v2/export");
const { designLayer } = await import("../src/lib/cms-v2/design");
const { phpSections } = await import("./lib/cms-parity");
const { pageZones } = await import("../src/lib/cms-v2/adapters/prestashop");
const { renderPage } = await import("../src/lib/theme/render");
type ThemeSpec = import("../src/lib/theme/spec").ThemeSpec;
type Check = { id: string; label: string; run: string };
/** Élément de chaque contrôle (défilé jusqu'à lui, puis capturé). */
const TARGET: Record<string, string> = { "cv-hotspot": "[data-cv-hotspots]", "cv-gallery": "[data-cv-gallery]", "nomade": ".cv-hero", "fs-compare": "[data-fs-compare]", "fs-hotspot": "[data-fs-hotspots]", "cv-reviews": "[data-cv-reviews]", ctabs: "[data-ctabs]", ctable: "[data-ctable]", "fs-carousel": "[data-fs-carousel]", astral: ".cv-hero", itineraire: ".cv-banner", "cv-gallery-carousel": "[data-cv-gallery]" };

const OLD_SCRIPTS = ["theme.js", "reference-interactions.js", "purchase-offers.js", "editorial.js"];
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

/** Test d'une interaction dans la page : renvoie true si l'élément réagit comme dans le thème Shopify. */
const CAROUSEL = (sel: string) => `(async () => { const root = document.querySelector(${JSON.stringify(sel)}); if (!root) return 'absent';
  const track = root.querySelector('[data-fs-track], [data-cv-track], .cv-track, [data-track]') || root; const next = root.querySelector('[data-fs-next], [data-cv-next], [data-next], button[aria-label*="uivant"], button[aria-label*="ext"]');
  if (!next) return 'pas de bouton suivant'; const max = track.scrollWidth - track.clientWidth; if (max <= 2) return 'rien à faire défiler (' + track.children.length + ' éléments)'; const before = track.scrollLeft; next.click(); await new Promise(r => setTimeout(r, 900)); return track.scrollLeft > before ? true : 'aucun défilement'; })()`;
const COMPARE = `(async () => { const fig = document.querySelector('[data-fs-compare]'); if (!fig) return 'absent'; const r = fig.querySelector('[data-fs-compare-range]'); const st = fig.querySelector('.fs-compare__stage');
  r.value = '80'; r.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(x => setTimeout(x, 100)); return st.style.getPropertyValue('--fs-pos') === '80%' ? true : 'curseur sans effet'; })()`;
const HOTSPOT = (attr: string) => `(async () => { const b = document.querySelector('[${attr}]'); if (!b) return 'absent'; b.click(); await new Promise(x => setTimeout(x, 100));
  const c = document.getElementById(b.getAttribute('aria-controls') || ''); return b.getAttribute('aria-expanded') === 'true' && c && !c.hidden ? true : 'repère sans effet'; })()`;
const TABS = `(async () => { const s = document.querySelector('[data-ctabs]'); if (!s) return 'absent'; const tabs = s.querySelectorAll('[data-ctabs-tab]'); if (tabs.length < 2) return 'un seul onglet';
  if (s.querySelector('[data-ctabs-list]').hidden) return 'onglets masqués (script absent)'; tabs[1].click(); await new Promise(x => setTimeout(x, 100)); return tabs[1].getAttribute('aria-selected') === 'true' && !s.querySelectorAll('[data-ctabs-panel]')[1].hidden ? true : 'onglet sans effet'; })()`;
const CTABLE = `(() => { const f = document.querySelector('[data-ctable]'); if (!f) return 'absent'; return f.__ct === true ? true : 'script du tableau absent'; })()`;
const STORY = `(async () => { const s = document.querySelector('[data-cv-stories]'); if (!s) return 'absent'; const open = s.querySelector('[data-cv-story-open], [data-story-open], button'); if (!open) return 'pas de bouton';
  open.click(); await new Promise(x => setTimeout(x, 300)); const d = document.querySelector('dialog[open], [data-cv-story-modal]:not([hidden]), .cv-story-modal.is-open'); return d ? true : 'lecteur non ouvert'; })()`;

/** Visionneuse de la galerie (conversion.js) : un clic sur une image ouvre la visionneuse plein écran. */
const LIGHTBOX = `(async () => { const g = document.querySelector('[data-cv-gallery]'); if (!g) return 'absent'; const o = g.querySelector('[data-cv-gallery-open]'); if (!o) return 'pas de vignette'; o.click(); await new Promise(x => setTimeout(x, 300));
  const d = document.querySelector('[data-cv-lightbox]'); return d && (d.open || !d.hidden) ? true : 'visionneuse non ouverte'; })()`;
/** Profil graphique « nomade » appliqué (classes du <body> dans WordPress / PrestaShop) : halo cuivré de l'ouverture. */
const NOMADE = `(() => { const h = document.querySelector('.cv-hero'); if (!h) return 'absent'; return getComputedStyle(h).backgroundImage.includes('radial-gradient') ? true : 'profil « nomade » non appliqué'; })()`;
/** Profil graphique appliqué dans WordPress / PrestaShop (classe du <body> et règles du profil réellement actives) : NOCTIL, TRAVERSE. */
const PROFILE = (id: string, radius: string) => `(() => { if (!document.body.classList.contains('es-conversion-${id}')) return 'classe es-conversion-${id} absente (' + document.body.className + ')';
  const r = getComputedStyle(document.body).getPropertyValue('--cv-radius').trim(); return r === '${radius}' ? true : 'règles du profil non appliquées (--cv-radius = ' + r + ')'; })()`;
type Plan = { demo: "fraise" | "orbe" | "rive" | "sillon" | "noctil" | "traverse"; family: "specialty" | "catalog" | "services"; label: string; add: { key: string; disp: string }[]; checks: Check[] };
const PLANS: Plan[] = [
  { demo: "fraise", family: "specialty", label: "FRAISE (boutique spécialisée)",
    add: [{ key: "results", disp: "before-after" }, { key: "specs", disp: "tabs" }, { key: "comparison", disp: "table" }],
    checks: [
      { id: "ctabs", label: "Onglets (script de section)", run: TABS },
      { id: "ctable", label: "Tableau comparatif (script de section)", run: CTABLE },
      { id: "cv-reviews", label: "Carrousel d'avis (thème FRAISE)", run: CAROUSEL("[data-cv-reviews]") },
      { id: "fs-compare", label: "Avant / après (bibliothèque)", run: COMPARE },
    ] },
  { demo: "orbe", family: "catalog", label: "ORBE (e-commerce)",
    add: [{ key: "lookbook", disp: "markers" }, { key: "collections", disp: "carousel" }],
    checks: [
      { id: "fs-hotspot", label: "Repères produits du lookbook (bibliothèque)", run: HOTSPOT("data-fs-hotspot") },
      { id: "fs-carousel", label: "Carrousel de collections (bibliothèque)", run: CAROUSEL("[data-fs-carousel]") },
    ] },
  { demo: "sillon", family: "specialty", label: "SILLON (boutique spécialisée, issue #148)", add: [],
    checks: [
      { id: "nomade", label: "Profil graphique « nomade » appliqué", run: NOMADE },
      { id: "cv-hotspot", label: "Repères sur le produit (thème SILLON)", run: HOTSPOT("data-cv-hotspot") },
      { id: "cv-gallery", label: "Visionneuse de la mosaïque (thème SILLON)", run: LIGHTBOX },
    ] },
  { demo: "noctil", family: "specialty", label: "NOCTIL (boutique spécialisée, issue #152)", add: [],
    checks: [
      { id: "astral", label: "Profil graphique « astral » appliqué", run: PROFILE("astral", "18px") },
      { id: "cv-gallery-carousel", label: "Carrousel des pièces (thème NOCTIL)", run: CAROUSEL("[data-cv-gallery]") },
      { id: "cv-gallery", label: "Visionneuse du carrousel (thème NOCTIL)", run: LIGHTBOX },
    ] },
  { demo: "traverse", family: "specialty", label: "TRAVERSE (boutique spécialisée, issue #152)", add: [],
    checks: [
      { id: "itineraire", label: "Profil graphique « itinéraire » appliqué", run: PROFILE("itineraire", "2px") },
      { id: "cv-hotspot", label: "Repères sur le sac (thème TRAVERSE)", run: HOTSPOT("data-cv-hotspot") },
    ] },
  { demo: "rive", family: "services", label: "Atelier Rive (services)",
    add: [{ key: "testimonials", disp: "carousel" }],
    checks: [{ id: "fs-carousel", label: "Carrousel de témoignages (bibliothèque)", run: CAROUSEL("[data-fs-carousel]") }] },
];

const user = await createUser("exports-familles@example.invalid", "isolated-test-only", "Contrôle des exports");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const results: Record<string, unknown>[] = [];
try {
  for (const plan of PLANS) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const f = await demoProject(user.id, plan.demo);
    let spec: ThemeSpec = JSON.parse(JSON.stringify(f.spec));
    const project = loadProject(f.pid);
    const added: string[] = [];
    for (const a of plan.add) {
      const entry = FAMILY_LIBRARY[plan.family].find((e) => e.key === `${plan.family}.${a.key}`);
      const d = entry?.dispositions.find((x) => x.id === a.disp);
      if (!d) { console.warn(`disposition introuvable ${plan.family}.${a.key}~${a.disp}`); continue; }
      const filled = withProjectMedia(spec, d.type, { ...(d.settings ?? {}) }, undefined, sectionContentContext(project, spec, false, "index"));
      const r = applyOps(spec, [{ op: "add_section", template: "index", type: d.type, settings: { ...filled.settings, ...(d.settings ?? {}) } as never, blocks: filled.blocks as never } as never], { targeted: new Set(), storeKind: projectKind(project) });
      if (!r.applied.length) { console.warn(`refus ${plan.demo} ${a.key}~${a.disp} : ${r.rejected.map((x) => x.reason).join(" ; ")}`); continue; }
      spec = r.spec; added.push(spec.templates.index.order.at(-1)!);
      // Contenus de CONTRÔLE (page de test seulement, jamais dans un projet) : les démonstrations n'ont ni photos avant /
      // après, ni plusieurs collections, ni témoignages (rien n'est inventé dans un projet). Pour tester le curseur et le
      // défilement, des éléments étiquetés « contrôle » sont posés ici avec des images du projet.
      const sec = spec.templates.index.sections[added.at(-1)!], imgs = Object.keys(spec.files).filter((k) => /\.(jpe?g|png|webp)$/i.test(k));
      const control = (type: string, list: Record<string, unknown>[]) => { sec.blocks = {}; sec.block_order = []; list.forEach((settings, i) => { sec.blocks![`ctl_${i}`] = { type, settings: settings as never }; sec.block_order!.push(`ctl_${i}`); }); };
      if (d.type === "fs-results" && imgs.length >= 2) control("pair", [{ image_before_asset: imgs[0], image_after_asset: imgs[1], label_before: "Avant (contrôle)", label_after: "Après (contrôle)" }]);
      if (d.type === "fs-collections") control("collection", [1, 2, 3, 4, 5].map((n) => ({ title: `Collection de contrôle ${n}`, image_asset: imgs[n % Math.max(1, imgs.length)] })));
      if (d.type === "fs-reviews") control("review", [1, 2, 3, 4, 5].map((n) => ({ rating: 5, title: `Témoignage de contrôle ${n}`, quote: "Texte de contrôle technique, pas un avis réel.", author: `Contrôle ${n}` })));
    }
    const files = compileTheme(spec);
    const design = await designLayer(spec, files);
    const order = spec.templates.index.order.filter((id) => !spec.templates.index.sections[id].disabled && spec.templates.index.sections[id].type !== "featured-product");
    const list = order.map((id) => ({ id, s: spec.templates.index.sections[id] }));
    const html = phpSections(spec, list, files);
    // PrestaShop : les pages sont rendues à l'export par le moteur du studio (gabarits .tpl), pas par le moteur PHP.
    const psMain = pageZones((await renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams())).html).main;
    for (const platform of ["woocommerce", "prestashop"] as const) {
      const exp = await cmsExport(platform, spec, libraryLoader, { projectId: f.pid });
      const z = unzipSync(new Uint8Array(exp.zip));
      const prefix = platform === "woocommerce" ? `${Object.keys(z)[0].split("/")[0]}/` : "";
      const jsPath = platform === "woocommerce" ? "assets/js/theme.js" : "assets/js/es-theme.js";
      const bundle = strFromU8(z[prefix + jsPath] ?? new Uint8Array());
      const cssFiles = Object.keys(z).filter((k) => k.startsWith(`${prefix}assets/css/`) && k.endsWith(".css")).map((k) => k.slice(prefix.length));
      const old = OLD_SCRIPTS.map((n) => files.get(`assets/${n}`)).filter(Boolean).join("\n;\n");
      for (const variant of ["export", "ancien"] as const) {
        const dir = path.join(out, plan.demo, platform, variant); fs.mkdirSync(dir, { recursive: true });
        const bodyCls = design.body.classes.join(" ");
        const sectionsHtml = platform === "prestashop" ? psMain : list.map(({ id, s }, i) => `<div id="shopify-section-${id}" class="shopify-section" data-es-type="${s.type}">${html[i] ?? ""}</div>`).join("\n");
        const page = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${plan.label} — ${platform} (${variant})</title>
${cssFiles.map((c) => `<link rel="stylesheet" href="/${c}">`).join("\n")}
<script>window.themeSettings = { motion: true };</script></head>
<body class="${bodyCls}" data-ds="${design.body.ds}" data-density="${design.body.density}"><main>${sectionsHtml}</main><script src="/bundle.js" defer></script></body></html>`;
        fs.writeFileSync(path.join(dir, "page.html"), page);
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const pg = await ctx.newPage();
        const errors: string[] = [];
        pg.on("pageerror", (e) => errors.push(e.message));
        await pg.route("**/*", (route) => {
          const u = new URL(route.request().url()); const p = decodeURIComponent(u.pathname).replace(/^\//, "");
          if (p === "" || p === "index.html") return route.fulfill({ contentType: "text/html", body: page });
          if (p === "bundle.js") return route.fulfill({ contentType: "application/javascript", body: variant === "export" ? bundle : old });
          const name = p.replace(/^assets\//, "");
          const hit = [prefix + p, `${prefix}assets/es/${name}`, `${prefix}assets/css/${name}`, `${prefix}assets/fonts/${name}`, `${prefix}assets/fonts/${path.basename(name)}`].find((k) => z[k]);
          if (!hit) return route.fulfill({ status: 404, body: "" });
          const ext = path.extname(hit).slice(1);
          const type = ({ css: "text/css", js: "application/javascript", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", ttf: "font/ttf", mp4: "video/mp4" } as Record<string, string>)[ext] ?? "application/octet-stream";
          return route.fulfill({ contentType: type, body: Buffer.from(z[hit]) });
        });
        await pg.goto("http://export.local/index.html", { waitUntil: "load" });
        await pg.waitForTimeout(600);
        const checks: Record<string, unknown> = {};
        for (const c of plan.checks) {
          await pg.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(TARGET[c.id])}); if (el) el.scrollIntoView({ block: 'center' }); })()`);
          await pg.waitForTimeout(300);
          checks[c.id] = await pg.evaluate(c.run);
          const el = pg.locator(TARGET[c.id]).first();
          if (variant === "export" && await el.count()) await el.screenshot({ path: path.join(dir, `${c.id}-390.png`) }).catch(() => {});
        }
        const overflow = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
        if (variant === "export") {
          await pg.setViewportSize({ width: 1440, height: 900 }); await pg.waitForTimeout(400);
          for (const c of plan.checks) { const el = pg.locator(TARGET[c.id]).first(); if (await el.count()) await el.screenshot({ path: path.join(dir, `${c.id}-1440.png`) }).catch(() => {}); }
        }
        await ctx.close();
        results.push({ demo: plan.demo, label: plan.label, platform, variant, scriptsInBundle: variant === "export" ? design.scripts : OLD_SCRIPTS, familyJs: variant === "export" ? bundle.includes("Sections de bibliothèque par famille") : false, conversionJs: variant === "export" ? bundle.includes("Profil « conversion »") : false, checks, overflow390: overflow, errors, addedSections: added.map((id) => spec.templates.index.sections[id].type) });
        console.log(`${plan.demo} ${platform} ${variant}: ${JSON.stringify(checks)} débordement=${overflow} erreurs=${errors.length}`);
      }
    }
  });
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out, "resultats.json"), JSON.stringify({ commit, date: new Date().toISOString(), nature: "thème exporté rendu par son moteur PHP + script exporté, dans Chromium (pas d'installation WordPress / PrestaShop réelle)", results }, null, 2));
  fs.rmSync(process.env.DATA_DIR!, { recursive: true, force: true });
}
