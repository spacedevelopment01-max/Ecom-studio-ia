/**
 * Audit de l'onglet Marque comme un client, SANS aucun appel d'IA : un projet de SERVICES (artisan) et un projet de
 * PRODUITS (gourde), logos complets SIMULÉS passés par le vrai moteur Logo V2, un logo choisi (déclinaisons, planche,
 * charte), puis captures de l'onglet en français et en anglais, sur ordinateur (1440 px) et téléphone (390 px).
 *   (serveur) DATA_DIR=/tmp/marque STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next dev -p 3079
 *   DATA_DIR=/tmp/marque BASE=http://localhost:3079 npx tsx scripts/screens-onglet-marque.ts
 * Ne jamais lancer sur la base de production.
 */
import fs from "node:fs";
import sharp from "sharp";
import { chromium } from "playwright";
import { all, id, now, one, run } from "@/lib/db";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { JobContext } from "@/lib/jobs";
import { assetData, getAsset } from "@/lib/library";
import { runLogoEngineV2 } from "@/lib/logo-v2/engine";
import { chooseLogoV2 } from "@/lib/logo-v2/choose";
import { ART_CRITERIA } from "@/lib/logo-v2/types";
import { seedLogoFixture } from "../tests/logo-v2-fixtures";
import { mockAi } from "../tests/logo-v2-mock";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const BASE = process.env.BASE ?? "http://localhost:3079";
const OUT = process.env.OUT ?? "reports/screenshots/onglet-marque";
fs.mkdirSync(OUT, { recursive: true });
const PASSWORD = "motdepasse-audit-marque";
const email = `marque-${Date.now()}@audit.fr`;
const u = await createUser(email, PASSWORD, "Audit");
run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
run("INSERT OR IGNORE INTO subscriptions (user_id, status, stores, updated_at) VALUES (?,?,?,?)", u.id, "none", 1, Date.now());
run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

// Logos SIMULÉS (aucun appel) : le nom et la ligne d'activités sont écrits par le gabarit, comme le ferait l'IA.
const svg = (body: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#FFFFFF"/>${body}</svg>`)).png().toBuffer();
const draw = (style: string, name: string, desc: string | null) => {
  const N = name.toLocaleUpperCase("fr-FR");
  const d = desc ? `<text x="512" y="830" font-family="DejaVu Sans" font-size="34" fill="#5A5A60" text-anchor="middle" letter-spacing="4">${desc}</text>` : "";
  if (style === "illustrated") return svg(`<path d="M300 470 L512 280 L724 470" fill="none" stroke="#2E2E33" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/><circle cx="512" cy="520" r="70" fill="#C8A27A"/><text x="512" y="740" font-family="DejaVu Sans" font-size="80" font-weight="700" fill="#2E2E33" text-anchor="middle" letter-spacing="6">${N}</text>${d}`);
  if (style === "minimal") return svg(`<rect x="380" y="240" width="264" height="264" rx="40" fill="#2E2E33"/><path d="M420 460 L604 280" stroke="#C8A27A" stroke-width="40" stroke-linecap="round"/><text x="512" y="700" font-family="DejaVu Sans" font-size="80" font-weight="700" fill="#2E2E33" text-anchor="middle" letter-spacing="4">${N}</text>${d}`);
  return svg(`<text x="512" y="560" font-family="DejaVu Serif" font-size="120" font-weight="700" fill="#2E2E33" text-anchor="middle">${name}</text>${d}`);
};
const DRAFTS = (desc: string | null) => (b: any) =>
  [
    { name: "Atelier", markType: "symbol_wordmark", composition: "stacked", construction: "illustrative", sobriety: 4, style: "illustrated", symbolIdea: "un toit et un soleil", descriptor: desc },
    { name: "Signe net", markType: "abstract_mark", composition: "stacked", construction: "geometric", sobriety: 1, style: "minimal", symbolIdea: "un angle net en négatif", descriptor: desc },
    { name: "Signature", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 2, style: "typographic", symbolIdea: null, descriptor: null },
  ].map((o) => ({ concept: `${o.name} : une direction pour ${b.name}.`, whyItFits: "Traduit la personnalité de la marque pour sa clientèle.", typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [], ...o }));
const ai = (desc: string | null) => ({
  ...mockAi({ calls: [] } as any, { drafts: DRAFTS(desc) as any }),
  artworkRoute: () => ({ provider: "simulé", model: "aucun appel" }),
  drawArtwork: async (t: any, b: any) => draw(t.style, b.name, t.descriptor),
  reviewArtwork: async (_b: Buffer, _t: any, _br: any, e: any) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, 8.6])), textRead: [e.name, e.descriptor].filter(Boolean).join(" "), nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, person: false, issues: [], needsSimplifiedMark: true, genericConcept: false, fix: { target: "none", instruction: "" } }),
});
const job = (pid: string, type: string) => {
  const jid = id();
  run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, type, type, JSON.stringify({ projectId: pid }), "running", now(), now(), now());
  return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
};
const done = (c: JobContext) => run("UPDATE jobs SET status = 'done' WHERE id = ?", c.job.id);

async function seed(kind: "artisan" | "product", lang: "fr" | "en") {
  const pid = fr(() => seedLogoFixture(u.id, kind));
  if (lang === "en") run("UPDATE projects SET settings_json = json_set(settings_json, '$.language', 'en') WHERE id = ?", pid);
  const L = <T,>(fn: () => T) => runWithLang({ ui: lang, content: lang }, fn);
  const c1 = job(pid, "brand.logo.v2");
  const r = await L(() => runLogoEngineV2(c1, pid, { ai: ai(kind === "artisan" ? "PLÂTRERIE • PEINTURE" : null) as any }));
  done(c1);
  const c2 = job(pid, "brand.logo.v2.choose");
  await L(() => chooseLogoV2(c2, pid, r.shown[0].assetId!));
  done(c2);
  for (const a of all<{ id: string; role: string; mime: string }>("SELECT id, role, mime FROM assets WHERE project_id = ? AND role IN ('brand-board','brand-book') AND deleted_at IS NULL", pid))
    fs.writeFileSync(`${OUT}/${kind}-${lang}-${a.role}.${a.mime === "application/pdf" ? "pdf" : "png"}`, assetData(getAsset(a.id)!));
  console.log(`${kind} ${lang} : ${r.shown.length} proposition(s), ${r.discarded.length} écartée(s)`);
  return pid;
}
const projects = { service: await seed("artisan", "fr"), produit: await seed("product", "fr"), produitEn: await seed("product", "en") };

const errors: string[] = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
async function shot(name: string, pid: string, ui: "fr" | "en", viewport: { width: number; height: number }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: ui === "en" ? "en-US" : "fr-FR" });
  await ctx.addCookies([{ name: "ecs-lang", value: ui, url: BASE }]);
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["pilote", "produit", "boutique", "site", "marque", "visuels", "images", "publicites", "calendrier", "videos", "blog"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${name} (console): ${m.text().slice(0, 200)}`));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([page.waitForURL(/studio/, { timeout: 120000 }), page.click("button[type=submit]")]);
  await page.goto(`${BASE}/studio/${pid}/marque`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2500);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  fs.writeFileSync(`${OUT}/${name}.txt`, await page.locator("main").innerText().catch(() => ""));
  console.log(`${name} : débordement horizontal ${over} px`);
  await ctx.close();
}
for (const [vp, w, h] of [["ordinateur", 1440, 900], ["telephone", 390, 844]] as const) {
  await shot(`service-fr-${vp}`, projects.service, "fr", { width: w, height: h });
  await shot(`produit-fr-${vp}`, projects.produit, "fr", { width: w, height: h });
  await shot(`produit-en-${vp}`, projects.produitEn, "en", { width: w, height: h });
}
console.log(`erreurs JavaScript : ${errors.length}${errors.length ? `\n${errors.slice(0, 12).join("\n")}` : ""}`);
await browser.close();
process.exit(0);
