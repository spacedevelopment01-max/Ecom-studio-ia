/**
 * Captures du panneau Logo (logos complets de l'IA d'images) et de la planche d'identité, SANS aucun appel d'IA :
 * les « logos de l'IA » sont des images SIMULÉES dessinées ici (SVG), passées par le vrai moteur Logo V2 (styles,
 * contrôle, original conservé, essai écarté montré), puis un logo est choisi sur un second projet pour la planche.
 *   (serveur) DATA_DIR=/tmp/lart STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next start -p 3079
 *   DATA_DIR=/tmp/lart BASE=http://localhost:3079 npx tsx scripts/screens-logo-artwork.ts
 * Ne jamais lancer sur la base de production.
 */
import fs from "node:fs";
import sharp from "sharp";
import { chromium, type Page } from "playwright";
import { id, now, one, run } from "@/lib/db";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { JobContext } from "@/lib/jobs";
import { assetData, getAsset } from "@/lib/library";
import { runLogoEngineV2 } from "@/lib/logo-v2/engine";
import { chooseLogoV2 } from "@/lib/logo-v2/choose";
import { artworkPrompt } from "@/lib/logo-v2/artwork";
import { ART_CRITERIA } from "@/lib/logo-v2/types";
import { seedLogoFixture } from "../tests/logo-v2-fixtures";
import { mockAi } from "../tests/logo-v2-mock";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const BASE = process.env.BASE ?? "http://localhost:3079";
const OUT = "reports/screenshots/logo-artwork";
fs.mkdirSync(OUT, { recursive: true });
const PASSWORD = "motdepasse-demo-logo";
const email = `logo-${Date.now()}@demo.fr`;
const u = await createUser(email, PASSWORD, "Démo");
run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
run("INSERT OR IGNORE INTO subscriptions (user_id, status, stores, updated_at) VALUES (?,?,?,?)", u.id, "none", 1, Date.now());
run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

// ---- images SIMULÉES (aucun appel) : trois styles, et un logo moyen qui sera écarté par le contrôle
const png = (w: number, h: number, body: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#FFFFFF"/>${body}</svg>`)).png().toBuffer();
const IMAGES: Record<string, () => Promise<Buffer>> = {
  illustrated: () =>
    png(1024, 1024, `<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#C8A27A"/><stop offset="1" stop-color="#8A6A4A"/></linearGradient></defs>
      <path d="M300 470 L512 280 L724 470" fill="none" stroke="#2E2E33" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M560 300 C 640 250, 720 300, 760 240" fill="none" stroke="url(#g)" stroke-width="34" stroke-linecap="round"/>
      <text x="512" y="610" font-family="DejaVu Serif, serif" font-size="210" font-weight="700" fill="#2E2E33" text-anchor="middle">S<tspan fill="#C8A27A">B</tspan></text>
      <text x="512" y="760" font-family="DejaVu Sans, sans-serif" font-size="70" font-weight="700" fill="#2E2E33" text-anchor="middle" letter-spacing="6">SÉBASTIEN <tspan fill="#C8A27A">BLANC</tspan></text>
      <text x="512" y="830" font-family="DejaVu Sans, sans-serif" font-size="30" fill="#5A5A60" text-anchor="middle" letter-spacing="4">PLÂTRERIE • PEINTURE • ENDUITS</text>`),
  minimal: () =>
    png(1024, 1024, `<rect x="380" y="260" width="264" height="264" rx="20" fill="#2E2E33"/><rect x="512" y="260" width="132" height="132" fill="#C8A27A"/>
      <text x="512" y="700" font-family="DejaVu Sans, sans-serif" font-size="78" font-weight="700" fill="#2E2E33" text-anchor="middle" letter-spacing="4">SÉBASTIEN BLANC</text>`),
  typographic: () =>
    png(1024, 1024, `<text x="512" y="520" font-family="DejaVu Serif, serif" font-size="120" font-weight="700" fill="#2E2E33" text-anchor="middle">Sébastien</text>
      <text x="512" y="650" font-family="DejaVu Serif, serif" font-size="120" font-style="italic" fill="#C8A27A" text-anchor="middle">Blanc</text>`),
  emblem: () =>
    png(1024, 1024, `<circle cx="512" cy="512" r="330" fill="none" stroke="#2E2E33" stroke-width="16"/><text x="512" y="540" font-family="DejaVu Sans, sans-serif" font-size="64" fill="#2E2E33" text-anchor="middle">SÉBASTIEN BLANC</text>`),
};
const DRAFTS = (b: any) =>
  [
    { name: "Atelier du geste", markType: "monogram", composition: "stacked", construction: "illustrative", sobriety: 4, style: "illustrated", symbolIdea: "les initiales SB sous un toit dont la ligne devient un coup de pinceau", descriptor: "PLÂTRERIE • PEINTURE • ENDUITS" },
    { name: "Angle juste", markType: "abstract_mark", composition: "stacked", construction: "geometric", sobriety: 1, style: "minimal", symbolIdea: "un angle de mur net, en négatif" },
    { name: "Signature", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 2, style: "typographic", symbolIdea: null },
    { name: "Sceau d'artisan", markType: "emblem", composition: "badge", construction: "organic", sobriety: 3, style: "emblem", symbolIdea: "un sceau circulaire" },
  ].map((o) => ({ concept: `${o.name} : une direction pour ${b.name}, artisan des finitions intérieures.`, whyItFits: "Traduit la précision du geste et la confiance pour des particuliers qui rénovent.", typography: { style: o.markType === "wordmark" ? "classic_serif" : "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [], ...o }));
const review = (score: number, name: string, issues: string[] = []) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, score])), textRead: name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues, needsSimplifiedMark: true });
const ai = {
  ...mockAi({ calls: [] }, { drafts: DRAFTS as any }),
  artworkRoute: () => ({ provider: "simulé", model: "aucun appel" }),
  async drawArtwork(t: any, b: any) {
    artworkPrompt(t, b);
    return IMAGES[t.style]();
  },
  async reviewArtwork(_board: Buffer, t: any, _b: any, exp: any) {
    return t.style === "minimal" ? review(6.8, exp.name, ["composition trop sage", "symbole peu mémorable"]) : review(t.style === "illustrated" ? 8.9 : 8.4, exp.name);
  },
};
const job = (pid: string, type = "brand.logo.v2") => {
  const jid = id();
  run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, type, type, JSON.stringify({ projectId: pid }), "running", now(), now(), now());
  return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
};
const finish = (ctx: JobContext) => run("UPDATE jobs SET status = 'done' WHERE id = ?", ctx.job.id);
const pid = fr(() => seedLogoFixture(u.id, "artisan"));
const c1 = job(pid);
await fr(() => runLogoEngineV2(c1, pid, { ai: ai as any }));
finish(c1);
// Second projet : un logo complet choisi → déclinaisons et planche d'identité.
const pid2 = fr(() => seedLogoFixture(u.id, "artisan"));
const c2 = job(pid2);
const r2 = await fr(() => runLogoEngineV2(c2, pid2, { ai: ai as any }));
finish(c2);
const c3 = job(pid2, "brand.logo.v2.choose");
await fr(() => chooseLogoV2(c3, pid2, r2.shown[0].assetId!));
finish(c3);
const board = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'brand-board' ORDER BY created_at DESC", pid2)!;
fs.writeFileSync(`${OUT}/planche-identite.png`, assetData(getAsset(board.id)!));

const errors: string[] = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
async function session(viewport: { width: number; height: number }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "fr-FR" });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["pilote", "produit", "boutique", "site", "marque", "visuels", "images", "publicites", "calendrier", "videos", "blog"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
  return page;
}
async function shot(page: Page, file: string, mobile = false) {
  await page.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const panel = page.locator("section, div").filter({ has: page.locator("#logo-style") }).last();
  const text = await page.locator("main").innerText();
  console.log(`${file} : style ${/Laisser l'IA proposer/.test(text) ? "✓" : "✗"} · dessiné par l'IA ${/Dessiné par l'IA d'images/.test(text) ? "✓" : "✗"} · écarté montré ${/Logos complets écartés/.test(text) ? "✓" : "✗"}`);
  if (mobile) console.log(`débordement horizontal : ${await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)} px`);
  const card = page.locator("#logo-style").locator("xpath=ancestor::div[contains(@class,'p-5')][1]");
  await (await card.count() ? card : panel).screenshot({ path: `${OUT}/${file}.png` });
}
await shot(await session({ width: 1440, height: 900 }), "panneau-logo-ordinateur");
await shot(await session({ width: 390, height: 844 }), "panneau-logo-telephone", true);
console.log(`erreurs JavaScript : ${errors.length}${errors.length ? ` — ${errors.slice(0, 3).join(" | ")}` : ""}`);
await browser.close();
process.exit(0);
