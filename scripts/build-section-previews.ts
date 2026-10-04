/**
 * Aperçus de la bibliothèque de sections (public/sections/<type>.jpg), rendus avec une vraie boutique de démonstration.
 *   PID=<projet de démonstration> npx tsx scripts/build-section-previews.ts
 * Chaque section est ajoutée seule à la page d'accueil (réglages par défaut, plus un exemple pour celles
 * qui ont besoin de contenu), puis photographiée.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";
import { currentTheme } from "../src/lib/projects";
import { applyOps } from "../src/lib/theme/ops";
import { themeContext, chromiumPath } from "../src/lib/theme/snapshot";
import { SECTION_LIBRARY } from "../src/lib/theme/section-library";
import { withProjectMedia } from "../src/lib/theme/section-defaults";
import type { ThemeSpec } from "../src/lib/theme/spec";

const PID = process.env.PID;
if (!PID) throw new Error("PID manquant");
const cur = currentTheme(PID);
if (!cur) throw new Error("Projet sans boutique");
const OUT = path.join(process.cwd(), "public", "sections");
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.env.ONLY?.split(",");

const f = (re: RegExp) => Object.keys(cur.spec.files).find((k) => re.test(k)) ?? "";
const cut = f(/detoure/), detail = f(/detail-1/), pack = f(/packshot/), life = f(/en-situation/);
/** Contenu d'exemple pour les sections vides par défaut (aperçu du studio uniquement, jamais publié). */
const SAMPLES: Record<string, { settings?: Record<string, unknown>; blocks?: { type: string; settings?: Record<string, unknown> }[] }> = {
  "routine-steps": {
    settings: { eyebrow: "Mode d'emploi", heading: "Votre premier vol, en trois gestes.", watermark: "VOL", image_asset: cut, chip1: "Pliable", chip2: "Caméra orientable" },
    blocks: [{ type: "step", settings: { eyebrow: "Dépliez", title: "Bras dépliés, prêt à partir.", text: "<p>Les bras se replient pour le transport.</p>", image_asset: cut, label: "Bras pliables", label_x: 22, label_y: 30 } }, { type: "step" }, { type: "step" }],
  },
  testimonials: { blocks: [1, 2, 3].map(() => ({ type: "review", settings: { quote: "Votre client décrit ici son expérience, avec ses mots.", author: "Prénom", detail: "Ville", rating: "5" } })) },
  "immersive-reviews": { settings: { height: "medium" }, blocks: [1, 2, 3].map(() => ({ type: "review", settings: { quote: "Votre client décrit ici son expérience, avec ses mots.", author: "Prénom", detail: "Ville", rating: "5", verified: true } })) },
  countdown: { settings: { end_date: "2026-12-31", end_time: "23:59", text: "<p>Votre offre réelle et ses conditions.</p>" } },
  "trust-bar": { blocks: [["shield", "Paiement sécurisé"], ["return", "Retours"], ["chat", "Service client"], ["truck", "Livraison"]].map(([icon, title]) => ({ type: "item", settings: { icon, title, text: "Votre engagement réel" } })) },
  "custom-liquid": { settings: { custom_liquid: "<div style=\"padding:48px;border:1px dashed currentColor;border-radius:16px;text-align:center;opacity:.7\">Votre widget ou code personnalisé s'affiche ici.</div>" } },
  "before-after": { settings: { image_before_asset: pack, image_after_asset: life || detail } },
  "image-with-text": { settings: { image_asset: life || detail } },
};

async function placeholder(type: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#F4F5F8"/><rect x="40" y="60" width="560" height="240" rx="18" fill="none" stroke="#B9BFCC" stroke-width="3" stroke-dasharray="10 8"/><text x="320" y="190" font-family="Inter, sans-serif" font-size="24" fill="#5B6478" text-anchor="middle">${label}</text></svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(path.join(OUT, `${type}.jpg`));
}

const exe = chromiumPath();
if (!exe) throw new Error("Chromium introuvable");
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
for (const e of SECTION_LIBRARY) {
  if (ONLY && !ONLY.includes(e.type)) continue;
  if (e.type === "apps" || e.type === "product-reviews") {
    await placeholder(e.type, e.type === "apps" ? "Bloc de votre application" : "Avis de votre application d'avis");
    console.log(`✓ ${e.type} (emplacement)`);
    continue;
  }
  const spec: ThemeSpec = structuredClone(cur.spec);
  spec.templates.index.order = [];
  spec.templates.index.sections = {};
  // Comme un ajout depuis le studio (préréglage + médias du projet), complété par l'exemple éventuel.
  const sample = SAMPLES[e.type] ?? {};
  const filled = withProjectMedia(spec, e.type, sample.settings, sample.blocks);
  const res = applyOps(spec, [{ op: "add_section", template: "index", type: e.type, settings: filled.settings as any, blocks: filled.blocks as any, position: { index: 0 } } as any], { overrideLocks: true });
  if (!res.applied.length) {
    console.log(`✗ ${e.type} : ${res.rejected.map((r) => r.reason).join(" ; ")}`);
    continue;
  }
  const { context, url } = await themeContext(browser, res.spec, { width: 1280, height: 800 });
  const page = await context.newPage();
  await page.goto(url("/"), { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(async () => {
    document.querySelectorAll("[data-reveal]").forEach((x) => x.classList.add("is-in"));
    document.querySelectorAll(".es-pv-bar").forEach((x) => x.remove());
    // Seule la section compte : en-tête, bandeau et pied de page masqués.
    const st = document.createElement("style");
    st.textContent = '[data-es-section^="group:"],.es-fab{display:none!important} body{padding-top:0!important}';
    document.head.appendChild(st);
    for (const img of Array.from(document.images)) img.loading = "eager";
    await new Promise((r) => setTimeout(r, 900));
  });
  const el = page.locator(`[data-es-type="${e.type}"]`).first();
  const box = await el.boundingBox();
  if (!box || box.height < 20) {
    await placeholder(e.type, e.name);
    console.log(`~ ${e.type} (vide, emplacement)`);
  } else {
    const buf = await page.screenshot({ clip: { x: 0, y: box.y, width: 1280, height: Math.min(box.height, 760) }, type: "jpeg", quality: 85 });
    await sharp(buf).resize({ width: 640 }).jpeg({ quality: 74 }).toFile(path.join(OUT, `${e.type}.jpg`));
    console.log(`✓ ${e.type}`);
  }
  await context.close();
}
await browser.close();
