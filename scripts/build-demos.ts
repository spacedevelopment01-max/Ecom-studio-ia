/**
 * Génère les démonstrations de la page d'accueil avec le vrai studio
 * (serveur + worker lancés) : produits et marques FICTIFS, rendus 3D en entrée.
 *   BASE=http://localhost:3000 tsx scripts/build-demos.ts   (entrées : scripts/demo-renders/inputs)
 * Sortie : public/demo/<id>/…, public/demo/directions/<direction>.jpg, public/demo/manifest.json
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type BrowserContext } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const RENDERS = process.env.RENDERS ?? path.join(process.cwd(), "scripts", "demo-renders", "inputs");
const OUT = path.join(process.cwd(), "public", "demo");
const PASSWORD = "demo-studio-2026";

const PRODUCTS = [
  { id: "serum", sector: "Beauté", productName: "Sérum Éclat", brandName: "Maison Ondine", price: "34,90 €", description: "Sérum visage en flacon compte-gouttes en verre de 30 ml. Formule à la niacinamide et à l'acide hyaluronique. Texture légère, à appliquer matin et soir sur peau propre." },
  { id: "bougie", sector: "Maison", productName: "Bougie Figuier & Bois fumé", brandName: "Atelier Braise", price: "29 €", description: "Bougie parfumée de 220 g dans un pot en verre teinté avec couvercle en bois. Notes de figue et de bois fumé. Cire végétale et mèche en coton." },
  { id: "gourde", sector: "Sport", productName: "Gourde isotherme 750 ml", brandName: "Nordvik", price: "32 €", description: "Gourde en acier inoxydable à double paroi, 750 ml, bouchon vissé étanche. Garde les boissons froides ou chaudes. Sans BPA." },
  { id: "tasse", sector: "Maison", productName: "Tasse en grès émaillé", brandName: "Terre & Feu", price: "24 €", description: "Tasse en grès émaillé de 300 ml, tournée à la main dans notre atelier. Passe au lave-vaisselle. Chaque pièce présente de légères variations d'émail." },
];

async function api(ctx: BrowserContext, url: string, init?: { method?: string; body?: unknown }) {
  const r = await ctx.request.fetch(`${BASE}${url}`, { method: init?.method ?? (init?.body ? "POST" : "GET"), data: init?.body as any });
  const j = await r.json();
  if (!r.ok()) throw new Error(`${url} → ${r.status()} ${JSON.stringify(j)}`);
  return j;
}

async function waitIdle(ctx: BrowserContext, pid: string) {
  const t0 = Date.now();
  for (;;) {
    const r = await api(ctx, `/api/projects/${pid}`);
    if (!r.active?.length) return r;
    if (Date.now() - t0 > 600_000) throw new Error("délai dépassé");
    await new Promise((res) => setTimeout(res, 2500));
  }
}

async function saveImg(ctx: BrowserContext, url: string, dest: string, width = 1200) {
  const r = await ctx.request.get(`${BASE}${url}`);
  const buf = Buffer.from(await r.body());
  await sharp(buf).resize({ width, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true }).toFile(dest);
}
async function saveRaw(ctx: BrowserContext, url: string, dest: string) {
  const r = await ctx.request.get(`${BASE}${url}`);
  fs.writeFileSync(dest, Buffer.from(await r.body()));
}

async function shot(ctx: BrowserContext, url: string, dest: string, viewport: { width: number; height: number }, clipH?: number) {
  const page = await ctx.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: ".es-pv-bar{display:none!important}" });
  await page.evaluate(async () => { for (let y = 0; y < 2400; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(1200);
  // Capture plus haute que l'écran : page entière recadrée (le héros garde sa hauteur d'écran réelle).
  const full = await page.screenshot({ fullPage: !!clipH && clipH > viewport.height });
  const png = await sharp(full).extract({ left: 0, top: 0, width: viewport.width, height: Math.min(clipH ?? viewport.height, (await sharp(full).metadata()).height!) }).toBuffer();
  await sharp(png).resize({ width: Math.min(viewport.width, 1200) }).jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
  await page.close();
}

const ONLY_DIRECTIONS = process.env.ONLY_DIRECTIONS; // identifiant d'un projet existant : ne refait que les vignettes
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ reducedMotion: "reduce" });
async function shootDirections(pid: string) {
  const { DIRECTIONS } = await import("../src/lib/theme/directions");
  fs.mkdirSync(path.join(OUT, "directions"), { recursive: true });
  for (const d of DIRECTIONS) {
    await api(ctx, `/api/projects/${pid}/theme/build`, { body: { direction: d.id } });
    await waitIdle(ctx, pid);
    const theme = await api(ctx, `/api/projects/${pid}/theme`);
    await shot(ctx, `/preview/${pid}/v/${theme.current.versionId}/`, path.join(OUT, "directions", `${d.id}.jpg`), { width: 1280, height: 860 }, 1600);
    console.log(`  direction ${d.id} ✓`);
  }
}
if (ONLY_DIRECTIONS) {
  await api(ctx, "/api/auth/login", { body: { email: process.env.EMAIL, password: PASSWORD } });
  await shootDirections(ONLY_DIRECTIONS);
  await browser.close();
  process.exit(0);
}
const email = `demo-${Date.now()}@ecom-studio.local`;
await api(ctx, "/api/auth/register", { body: { email, password: PASSWORD, name: "Démonstrations" } });
// Le compte de démonstration a besoin de plusieurs boutiques : activation manuelle locale.
const { db } = await import("../src/lib/db");
const { syncAllowance, getSubscription } = await import("../src/lib/billing");
const me = await api(ctx, "/api/me");
getSubscription(me.user.id);
db().prepare("UPDATE subscriptions SET status = 'manual', stores = 10 WHERE user_id = ?").run(me.user.id);
syncAllowance(me.user.id);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "directions"), { recursive: true });
const demos: any[] = [];
let firstProject: { pid: string } | null = null;

for (const p of PRODUCTS) {
  console.log(`▶ ${p.id}`);
  const dir = path.join(OUT, p.id);
  fs.mkdirSync(dir, { recursive: true });
  const photoFile = [".png", ".jpg"].map((x) => path.join(RENDERS, `${p.id}-photo${x}`)).find((f) => fs.existsSync(f))!;
  const photo = fs.readFileSync(photoFile);
  const res = await ctx.request.post(`${BASE}/api/projects`, {
    multipart: { photos: { name: path.basename(photoFile), mimeType: photoFile.endsWith(".png") ? "image/png" : "image/jpeg", buffer: photo }, productName: p.productName, brandName: p.brandName, price: p.price, description: p.description, mode: "autopilot", platform: "shopify" },
  });
  const created = await res.json();
  if (!res.ok()) throw new Error(JSON.stringify(created));
  const pid = created.id ?? created.project?.id;
  const t0 = Date.now();
  const ov = await waitIdle(ctx, pid);
  console.log(`  pipeline ${Math.round((Date.now() - t0) / 1000)} s`, ov.pipeline?.job?.status);
  firstProject ??= { pid };

  const files = (await api(ctx, `/api/projects/${pid}/files?q=`)).assets as any[];
  const all = (await api(ctx, `/api/projects/${pid}/files`)).assets as any[];
  const assets = files.length ? files : all;
  const byRole = (r: string) => assets.filter((a) => a.role === r);
  await sharp(photo).resize({ width: 900 }).jpeg({ quality: 84 }).toFile(path.join(dir, "photo.jpg"));
  const images: { src: string; label: string }[] = [];
  const pick: [string, string, number][] = [["cutout", "Détourage", 1], ["packshot", "Packshot", 1], ["detail", "Détail", 1], ["scene", "Scène", 2], ["social", "Visuel social", 1], ["ad", "Publicité", 1], ["banner", "Bannière", 1]];
  for (const [role, label, n] of pick) {
    for (const [i, a] of byRole(role).slice(0, n).entries()) {
      const file = `${role}-${i + 1}.jpg`;
      if (role === "cutout") {
        const r = await ctx.request.get(`${BASE}${a.url}`);
        await sharp(Buffer.from(await r.body())).resize({ width: 900 }).webp({ quality: 86 }).toFile(path.join(dir, `${role}-${i + 1}.webp`));
        images.push({ src: `/demo/${p.id}/${role}-${i + 1}.webp`, label });
      } else {
        await saveImg(ctx, a.url, path.join(dir, file));
        images.push({ src: `/demo/${p.id}/${file}`, label });
      }
    }
  }
  const logo = byRole("logo-svg")[0] ?? byRole("logo")[0];
  const logoFile = logo?.mime === "image/svg+xml" ? "logo.svg" : "logo.png";
  if (logo) await saveRaw(ctx, logo.url, path.join(dir, logoFile));
  const videos = byRole("video");
  const vertical = videos.find((v) => v.meta?.format === "9:16") ?? videos[0];
  const wide = videos.find((v) => v.meta?.format === "16:9");
  if (vertical) await saveRaw(ctx, vertical.url, path.join(dir, "video.mp4"));
  if (wide) await saveRaw(ctx, wide.url, path.join(dir, "video-boutique.mp4"));
  const poster = byRole("video-poster").find((x) => x.sourceAssetId === vertical?.id);
  if (poster) await saveImg(ctx, poster.url, path.join(dir, "video-poster.jpg"), 720);

  const theme = await api(ctx, `/api/projects/${pid}/theme`);
  const vid = theme.current.versionId;
  await shot(ctx, `/preview/${pid}/v/${vid}/`, path.join(dir, "boutique-bureau.jpg"), { width: 1440, height: 900 });
  await shot(ctx, `/preview/${pid}/v/${vid}/`, path.join(dir, "boutique-mobile.jpg"), { width: 390, height: 844 });
  await shot(ctx, `/preview/${pid}/v/${vid}/products/${theme.current.product.handle}`, path.join(dir, "fiche-produit.jpg"), { width: 1440, height: 900 });

  demos.push({
    id: p.id,
    brand: ov.brand?.name ?? p.brandName,
    product: p.productName,
    sector: p.sector,
    direction: theme.current.direction,
    palette: Object.values(ov.brand?.palette ?? {}).slice(0, 5),
    photo: `/demo/${p.id}/photo.jpg`,
    logo: logo ? `/demo/${p.id}/${logoFile}` : "",
    shopDesktop: `/demo/${p.id}/boutique-bureau.jpg`,
    shopMobile: `/demo/${p.id}/boutique-mobile.jpg`,
    productPage: `/demo/${p.id}/fiche-produit.jpg`,
    images,
    video: vertical ? `/demo/${p.id}/video.mp4` : "",
    videoPoster: poster ? `/demo/${p.id}/video-poster.jpg` : "",
    shopVideo: wide ? `/demo/${p.id}/video-boutique.mp4` : undefined,
  });
}

// Toutes les directions de boutique, appliquées au premier produit.
await shootDirections(firstProject!.pid);

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), note: "Produits, marques et contenus fictifs générés par E-COM STUDIO IA (moteur intégré) à partir de rendus 3D.", demos }, null, 2));
console.log(`✓ ${demos.length} démonstrations → public/demo`);
await browser.close();
