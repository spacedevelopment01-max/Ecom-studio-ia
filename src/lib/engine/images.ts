/**
 * Création du jeu d'images d'un projet : détourage, packshots, détails réels,
 * mises en scène (décor IA si disponible, sinon studio local), bannières,
 * visuels sociaux et publicitaires. Chaque fichier est rangé, nommé et lié.
 * Entreprise de services : pas de détourage ni de packshot — voir ./service-media
 * (photos réelles de l'activité ou visuels typographiques, offre réelle).
 */
import { renderProCreatives } from "../media/creative-html";
import sharp from "sharp";
import { loadImage } from "@napi-rs/canvas";
import { all, one } from "../db";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, type Project } from "../projects";
import { detailCrops } from "../media/cutout";
import { ensureCutouts } from "./cutouts";
import { FORMATS, renderCreative, renderPackshot, renderScene, renderBanner, type FormatId, type Layout, type SceneStyle, type Typo } from "../media/compose";
import { canvasFamily } from "../media/fonts";
import { aiImageBrief, aiQcImage } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { geminiPlate, imageProviderAvailable, openaiScene, refundMediaQuota } from "../ai/media-providers";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { directionById } from "../theme/directions";
import { C, L } from "../i18n-server";
import { generateServiceImageSet, generateServiceSingleImage, isServices, type ServiceSingleRequest } from "./service-media";

export function latestAsset(projectId: string, role: string): Asset | undefined {
  return one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role);
}
export function assetsByRole(projectId: string, role: string, limit = 20): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?", projectId, role, limit);
}

export function brandTypo(p: Project): Typo {
  const d = directionById(p.brand?.direction ?? "atelier");
  const heading = canvasFamily(p.brand?.fonts.heading ?? d.fonts.heading, "Cormorant");
  const body = canvasFamily(p.brand?.fonts.body ?? d.fonts.body, "Jost");
  const heavy = ["brut", "elan", "pop"].includes(d.id);
  return { heading, body, headingWeight: heavy ? 800 : 500, uppercase: d.id === "brut" || d.id === "elan" };
}

export function palette(p: Project) {
  return p.brand?.palette ?? { primary: "#6E5644", secondary: "#E6DACB", accent: "#B98B5E", light: "#F6F2EC", dark: "#1C1713" };
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || C("produit", "product");

/** Ligne d'accroche courte pour les visuels (au plus ~60 caractères, coupée sur une virgule ou un mot). */
export function shortLine(text: string, max = 60): string {
  const first = text.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, "").trim();
  if (first.length <= max) return first;
  const clause = first.split(",")[0].trim();
  if (clause.length >= 20 && clause.length <= max) return clause;
  return first.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "");
}

/** Détourages triés, contrôlés et utilisables (voir ./cutouts) : les détourages refusés ne servent jamais. */
export { ensureCutouts, validCutouts } from "./cutouts";

type ImgCtx = { userId: string; projectId: string; jobId?: string | null };

async function aiBackground(ictx: ImgCtx, project: Project, cut: Buffer, style: string, formatId: FormatId, key: string, lifestyle?: string): Promise<{ image: Buffer; provider: string; qc?: unknown } | null> {
  const provider = imageProviderAvailable();
  if (!provider) return null;
  const brief = llmConfigured()
    ? await aiImageBrief({ ...ictx, usageKey: `${key}:brief` }, project, lifestyle ? C(`PHOTO EN SITUATION (vie de tous les jours) : ${lifestyle}, format ${FORMATS[formatId].label}`, `LIFESTYLE PHOTO (everyday life): ${lifestyle}, ${FORMATS[formatId].label} format`) : C(`${style}, format ${FORMATS[formatId].label}`, `${style}, ${FORMATS[formatId].label} format`))
    : lifestyle
      ? { prompt: `Authentic everyday lifestyle photograph: ${lifestyle}. Natural daylight, real home or outdoor setting, candid editorial style, shallow depth of field. People may appear naturally around the product without covering it. No text, no logos, no other branded products.`, surface: "", lightFrom: "left" as const }
      : { prompt: `${style} product photography set, soft natural light, ${project.brand?.palette.secondary ?? "neutral"} tones`, surface: "", lightFrom: "left" as const };
  const f = FORMATS[formatId];
  if (provider === "openai") {
    // Cadre à la taille OpenAI la plus proche, produit placé, masque du produit.
    const size = f.w > f.h * 1.2 ? "1536x1024" : f.h > f.w * 1.2 ? "1024x1536" : "1024x1024";
    const [W, H] = size.split("x").map(Number);
    const prod = await sharp(cut).resize({ height: Math.round(H * 0.6), width: Math.round(W * 0.7), fit: "inside" }).png().toBuffer();
    const pm = await sharp(prod).metadata();
    const left = Math.round((W - (pm.width ?? 0)) / 2);
    const top = Math.round(H * 0.82 - (pm.height ?? 0));
    const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 235, g: 230, b: 224, alpha: 1 } } });
    const composite = await base.composite([{ input: prod, left, top }]).png().toBuffer();
    const mask = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: prod, left, top }]).png().toBuffer();
    const painted = await openaiScene({ ...ictx, usageKey: `${key}:openai` }, { composite, productMask: mask, prompt: brief.prompt, size: size as any });
    // On replace exactement les pixels du produit d'origine par-dessus.
    const restored = await sharp(painted).resize(W, H).composite([{ input: prod, left, top }]).png().toBuffer();
    return { image: restored, provider: "openai" };
  }
  const aspect = f.w > f.h * 1.5 ? "16:9" : f.h > f.w * 1.5 ? "9:16" : f.h > f.w * 1.1 ? "4:5" : "1:1";
  const plate = await geminiPlate({ ...ictx, usageKey: `${key}:gemini` }, { prompt: brief.prompt, reference: cut, aspect });
  return { image: plate, provider: "google-plate" };
}

/** Situations de la vie de tous les jours, par secteur (consignes pour le modèle d'image). */
const LIFESTYLE: Record<string, [string, string]> = {
  beaute: ["on a sunlit bathroom shelf among everyday toiletries, morning routine", "held near a vanity mirror in a bright bedroom, getting ready"],
  mode: ["laid on a bed next to sneakers and a tote bag, bright apartment, getting dressed", "hanging in an entryway by the door, keys and plants nearby, city apartment"],
  bijoux: ["on a wooden dresser next to a hand, soft morning light through linen curtains", "on a café table beside a cup of coffee and a notebook, city morning"],
  maison: ["in a cosy lived-in bedroom on an unmade bed with linen sheets, warm morning light", "in a bright living room on a sofa with a throw blanket and a book, afternoon light"],
  hightech: ["outdoors on a wooden picnic table with a backpack, hills in the background, golden hour", "on a tidy home desk next to a laptop and a coffee mug, daylight"],
  sport: ["on a forest trail next to running shoes and a backpack, early morning", "on a gym bench beside a towel and a water bottle, natural light"],
  alimentation: ["on a sunny café terrace table next to a glass with ice, summer afternoon", "in a picnic basket on a blanket in a park, friends blurred in the background"],
  enfants: ["on a playroom rug among wooden toys, soft daylight", "on a child's bedside table next to a picture book, evening lamp light"],
  animaux: ["on a light grey sofa with a relaxed cat nearby, cosy living room, daylight", "on a wooden floor in a bright living room with a dog resting nearby"],
  artisanat: ["on a wooden workshop table among tools and paper, window light", "on a shelf in a bright home studio next to plants and ceramics"],
};

export type ImageSetOptions = { scenes?: SceneStyle[]; withAi?: boolean; social?: boolean; banner?: boolean };

/**
 * Jeu d'images complet. Idempotent par étape (points de reprise du job) :
 * une reprise ne refait pas — et ne repaie pas — ce qui est déjà produit.
 */
export async function generateImageSet(ctx: JobContext, projectId: string, opts: ImageSetOptions = {}) {
  let project = loadProject(projectId);
  if (isServices(project)) return generateServiceImageSet(ctx, projectId, opts);
  const ictx: ImgCtx = { userId: project.userId, projectId, jobId: ctx.job.id };
  const cutouts = await ensureCutouts(ctx, project);
  if (!cutouts.length) throw new Error(L("Aucune photo du produit : importez au moins une photo pour créer les images.", "No product photo: upload at least one photo to create the images."));
  project = loadProject(projectId);
  const main = cutouts[0];
  const cutBuf = assetData(main);
  const product = await loadImage(cutBuf);
  const pal = palette(project);
  const typo = brandTypo(project);
  const base = slug(project.product.name || project.name);
  const created: string[] = [];
  const save = async (data: Buffer, name: string, role: string, folderKey: string, meta: Record<string, unknown>, mime = "image/jpeg") => {
    const a = await saveAsset({ projectId, userId: project.userId, data, name, mime, role, folderKey, origin: "generated", sourceAssetId: main.id, meta, status: "review" });
    created.push(a.id);
    return a.id;
  };

  await ctx.step("packshots", async () => {
    ctx.progress(0.38, L("Packshots fond blanc et fond de marque", "Packshots on white and on brand background"));
    const ids = [
      await save(await renderPackshot(product), `${base}-packshot-${C("blanc", "white")}.jpg`, "packshot", "images.packshots", { recipe: L("Packshot fond blanc, ombre de contact", "Packshot on white, contact shadow"), fidelity: L("pixels d'origine du produit", "original product pixels") }),
      await save(await renderPackshot(product, { background: pal.light }), `${base}-packshot-${C("fond-marque", "brand-background")}.jpg`, "packshot", "images.packshots", { recipe: L("Packshot fond de marque", "Packshot on brand background"), fidelity: L("pixels d'origine du produit", "original product pixels") }),
    ];
    return ids;
  });

  await ctx.step("details", async () => {
    ctx.progress(0.45, L("Détails produit (recadrages de la photo originale)", "Product details (crops of the original photo)"));
    const original = one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!;
    const meta = JSON.parse(main.meta || "{}");
    const regions = project.product.visual && (project.product as any).detailRegions;
    const crops = await detailCrops(assetData(original), { png: cutBuf, width: product.width, height: product.height, bbox: meta.bbox, sourceW: meta.source.w, sourceH: meta.source.h, method: "model" }, regions);
    const ids: string[] = [];
    for (const [i, c] of crops.entries()) ids.push(await save(c, `${base}-detail-${i + 1}.jpg`, "detail", "images.details", { recipe: L("Recadrage haute définition de la photo originale (aucune génération)", "High-resolution crop of the original photo (nothing generated)") }));
    return ids;
  });

  const styles = opts.scenes ?? (["everyday", "arch", "studio"] as SceneStyle[]);
  const withAi = opts.withAi !== false && !!imageProviderAvailable();
  for (const [i, style] of styles.entries()) {
    await ctx.step(`scene:${style}`, async () => {
      ctx.progress(0.5 + i * 0.08, L(`Mise en scène « ${style} »${withAi ? " (décor généré)" : ""}`, `Staging "${style}"${withAi ? " (generated set)" : ""}`));
      let bg: Buffer | null = null;
      let provider = "local";
      let qc: unknown = null;
      if (withAi && i === 0) {
        try {
          const r = await aiBackground(ictx, project, cutBuf, style, "product", `${ctx.job.id}:scene:${style}`);
          if (r) {
            if (r.provider === "openai") {
              // Vérification de fidélité par vision, puis repli local si échec.
              if (llmConfigured()) {
                const check = await aiQcImage({ ...ictx, usageKey: `${ctx.job.id}:qc:${style}` }, assetData(one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!), r.image);
                qc = check;
                if (!check.sameProduct || check.score < 6) throw new Error(L(`Contrôle de fidélité non concluant : ${check.issues.join(" ; ")}`, `Fidelity check failed: ${check.issues.join("; ")}`));
              }
              const id = await save(await sharp(r.image).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}-${C("ia", "ai")}.jpg`, "scene", "images.scenes", { recipe: L(`Décor peint par IA autour du produit réel (${style})`, `AI-painted set around the real product (${style})`), provider: "OpenAI", qc });
              return [id];
            }
            bg = r.image;
            provider = L("Gemini (décor) + composition locale", "Gemini (set) + local compositing");
          }
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          // Image IA écartée (fidélité non concluante…) : remplacée par une scène locale, le visuel n'est pas décompté.
          refundMediaQuota(ictx.userId, `${ctx.job.id}:scene:${style}`);
          qc = { fallback: (e as Error).message };
        }
      }
      const s = await renderScene({ product, palette: pal, style, format: FORMATS.product, seed: 7 + i, background: bg ? await loadImage(bg) : null });
      return [await save(await sharp(s.png).jpeg({ quality: 92 }).toBuffer(), `${base}-scene-${style}.jpg`, "scene", "images.scenes", { recipe: L(`Mise en scène ${style}`, `Staging: ${style}`), provider, qc })];
    });
  }

  // Photos en situation, dans la vie de tous les jours (IA d'image requise) : elles ouvrent la boutique.
  if (withAi) {
    const contexts = LIFESTYLE[project.product.sector ?? ""] ?? LIFESTYLE.maison;
    for (const [i, situation] of contexts.entries()) {
      await ctx.step(`lifestyle:${i}`, async () => {
        ctx.progress(0.7 + i * 0.02, L("Photos du produit en situation", "Lifestyle product photos"));
        try {
          const r = await aiBackground(ictx, project, cutBuf, "lifestyle", i === 0 ? "landscape" : "product", `${ctx.job.id}:lifestyle:${i}`, situation);
          if (!r) return [];
          if (r.provider !== "openai") {
            // Gemini : décor de vie généré, produit réel posé dessus par la composition locale (ombres, sol).
            const s = await renderScene({ product, palette: pal, style: "spotlight", format: i === 0 ? FORMATS.landscape : FORMATS.product, seed: 31 + i, background: await loadImage(r.image) });
            return [await save(await sharp(s.png).jpeg({ quality: 92 }).toBuffer(), `${base}-${C("en-situation", "lifestyle")}-${i + 1}.jpg`, "lifestyle", "images.scenes", { recipe: L(`Photo en situation : décor généré (${situation}) et produit réel composé`, `Lifestyle photo: generated set (${situation}) with the real product composited`), provider: L("Gemini + composition locale", "Gemini + local compositing") })];
          }
          let qc: unknown = null;
          if (llmConfigured()) {
            const check = await aiQcImage({ ...ictx, usageKey: `${ctx.job.id}:qc:lifestyle:${i}` }, assetData(one<Asset>("SELECT * FROM assets WHERE id = ?", main.source_asset_id)!), r.image);
            qc = check;
            if (!check.sameProduct || check.score < 6) {
              // Photo refusée par le contrôle de fidélité : ni enregistrée ni montrée, donc pas décomptée.
              refundMediaQuota(ictx.userId, `${ctx.job.id}:lifestyle:${i}`);
              return [];
            }
          }
          return [await save(await sharp(r.image).jpeg({ quality: 92 }).toBuffer(), `${base}-${C("en-situation", "lifestyle")}-${i + 1}.jpg`, "lifestyle", "images.scenes", { recipe: L(`Photo en situation générée autour du produit réel : ${situation}`, `Lifestyle photo generated around the real product: ${situation}`), provider: "OpenAI", qc })];
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          console.warn("[images] photo en situation indisponible :", (e as Error).message);
          refundMediaQuota(ictx.userId, `${ctx.job.id}:lifestyle:${i}`);
          return [];
        }
      });
    }
  }

  // Bannière publicitaire 16:9 de niveau agence (texte, produit, informations confirmées).
  const proBanner = async () => {
    const r = await renderProCreatives({ product: cutBuf, palette: pal, typo: brandTypo(project), brand: project.brand?.name ?? project.name, headline: project.brand?.tagline || project.product.name || project.name, subline: shortLine(project.product.name || ""), keyword: keywordFor(project), facts: confirmedFacts(project), cta: C("Découvrir", "Shop now") }, [{ template: "signature", format: "landscape" }]).catch(() => null);
    return r?.length ? [await save(r[0].jpg, `${base}-${C("banniere-publicite", "ad-banner")}-16x9.jpg`, "banner", "images.banners", { recipe: L("Bannière publicitaire 16:9 (mise en page agence)", "16:9 ad banner (agency layout)") })] : [];
  };
  if (opts.banner !== false) {
    await ctx.step("banner", async () => {
      ctx.progress(0.75, L("Bannières de boutique", "Store banners"));
      return [
        await save(await renderBanner(product, pal, "studio", FORMATS.banner, 21), `${base}-${C("banniere", "banner")}-studio.jpg`, "banner", "images.banners", { recipe: L("Bannière 2:1 sans texte (textes dans le thème)", "2:1 banner without text (text lives in the theme)") }),
        await save(await renderBanner(product, pal, "color", FORMATS.landscape, 22), `${base}-${C("banniere-couleur", "banner-color")}.jpg`, "banner", "images.banners", { recipe: L("Bannière 16:9 fond de marque", "16:9 banner on brand background") }),
        ...(await proBanner()),
      ];
    });
  }

  if (opts.social !== false) {
    await ctx.step("social", async () => {
      ctx.progress(0.85, L("Visuels réseaux sociaux et publicités", "Social media and ad visuals"));
      const headline = project.brand?.tagline || project.product.name || project.brand?.name || C("Découvrir", "Discover");
      const sub = shortLine(project.product.summary ?? "");
      const brandName = project.brand?.name ?? project.name;
      const logoAsset = latestAsset(projectId, "logo");
      const logo = logoAsset ? await loadImage(assetData(logoAsset)) : null;
      const variants: [FormatId, Layout, string, string][] = [
        ["portrait", "editorial", "images.social", "social"],
        ["square", "centered", "images.social", "social"],
        ["story", "centered", "images.ads", "ad"],
        ["square", "bold", "images.ads", "ad"],
      ];
      const ids: string[] = [];
      // Visuels de niveau agence (mise en page HTML) quand un navigateur est disponible.
      const pro = await renderProCreatives(
        { product: cutBuf, palette: pal, typo, brand: brandName, logo: null, headline, subline: shortLine(project.product.name || ""), keyword: keywordFor(project), facts: confirmedFacts(project), cta: C("Découvrir", "Shop now") },
        [
          { template: "signature", format: "portrait" },
          { template: "editorial", format: "square" },
          { template: "signature", format: "story" },
          { template: confirmedFacts(project).length >= 3 ? "arguments" : "editorial", format: confirmedFacts(project).length >= 3 ? "square" : "story" },
        ],
      ).catch(() => null);
      if (pro?.length) {
        for (const [k, r] of pro.entries()) {
          const role = k < 2 ? "social" : "ad";
          ids.push(await save(r.jpg, `${base}-${role === "ad" ? C("publicite", "ad") : "post"}-${r.label.replace(":", "x")}-${r.template}.jpg`, role, role === "ad" ? "images.ads" : "images.social", { recipe: L(`Visuel ${r.label} (${r.template})`, `${r.label} visual (${r.template})`), text: { headline }, format: r.label }));
        }
        return ids;
      }
      for (const [fmt, layout, folder, role] of variants) {
        const r = await renderCreative({ product, palette: pal, typo, format: FORMATS[fmt], layout, headline, subline: sub, cta: role === "ad" ? C("Découvrir", "Shop now") : undefined, brand: brandName, logo, seed: ids.length + 3 });
        ids.push(await save(r.jpg, `${base}-${role === "ad" ? C("publicite", "ad") : "post"}-${FORMATS[fmt].label.replace(":", "x")}-${layout}.jpg`, role, folder, { recipe: L(`Visuel ${FORMATS[fmt].label} (${layout})`, `${FORMATS[fmt].label} visual (${layout})`), text: { headline, sub }, safeArea: r.safe, minFontPx: r.minFontPx, format: FORMATS[fmt].label }));
      }
      return ids;
    });
  }
  ctx.progress(0.98, L("Images prêtes", "Images ready"));
  return { created };
}

/** Informations confirmées, très courtes, pour les pastilles des visuels (jamais d'allégation inventée). */
export function confirmedFacts(p: Project): string[] {
  const out: string[] = [];
  const cat = (p.product as any).category as string | undefined;
  if (cat && cat.length <= 24) out.push(cat);
  for (const f of p.product.facts) {
    if (f.status === "unknown" || !f.value || f.key === "price") continue;
    const v = f.value.replace(/\.$/, "").trim();
    if (v.length <= 28) out.push(v);
  }
  for (const v of p.product.variants ?? []) if (v.values.length > 1) out.push(C(`${v.values.length} ${v.name.toLowerCase()}${/[sx]$/.test(v.name) ? "" : "s"} au choix`, `${v.values.length} ${v.name.toLowerCase()}${/s$/i.test(v.name) ? "" : "s"} available`));
  // Peu d'informations confirmées : le nom du produit sert de repère (jamais d'argument inventé).
  if (out.length < 2 && p.product.name) {
    // Nom long : les premiers mots, sans couper un mot.
    let short = "";
    for (const w of p.product.name.split(/\s+/)) if ((short + " " + w).trim().length <= 26) short = (short + " " + w).trim(); else break;
    if (short) out.unshift(short.replace(C(/\s+(à|de|du|des|et|en|pour|avec)$/i, /\s+(a|an|the|of|and|in|for|with|to)$/i), ""));
  }
  return [...new Set(out)].slice(0, 3);
}

/** Mot court pour le filigrane : dernier mot distinctif du nom (saveur, modèle), sinon la marque. */
function keywordFor(p: Project): string {
  const all = (p.product.name || "").split(/\s+/).filter(Boolean);
  // Nom court (« Thé glacé Pêche ») : son dernier mot ; nom descriptif long : la marque.
  const last = all.at(-1) ?? "";
  return all.length <= 3 && last.length >= 3 && last.length <= 10 ? last : p.brand?.name ?? last;
}

/** Génère une image unique à la demande (studio Images). */
export async function generateSingleImage(ctx: JobContext, projectId: string, req: { kind: "packshot" | "scene" | "social" | "ad" | "banner" | ServiceSingleRequest["kind"]; style?: SceneStyle; format?: FormatId; layout?: Layout; headline?: string; subline?: string; cta?: string; useAi?: boolean; sourceCutoutId?: string; serviceIndex?: number; items?: string[]; usePhoto?: boolean; photoId?: string }) {
  const project = loadProject(projectId);
  if (isServices(project)) return generateServiceSingleImage(ctx, projectId, { ...req, kind: req.kind === "packshot" ? "banner" : req.kind });
  if (!["packshot", "scene", "social", "ad", "banner"].includes(req.kind)) throw new Error(L("Ce type d'image est réservé aux entreprises de services.", "This image type is for service businesses only."));
  const cutouts = await ensureCutouts(ctx, project);
  const cut = (req.sourceCutoutId && cutouts.find((c) => c.id === req.sourceCutoutId)) || cutouts[0];
  if (!cut) throw new Error(L("Importez d'abord une photo du produit.", "Upload a product photo first."));
  const product = await loadImage(assetData(cut));
  const pal = palette(project);
  const fmt = FORMATS[req.format ?? (req.kind === "banner" ? "banner" : req.kind === "packshot" ? "packshot" : "portrait")];
  const base = slug(project.product.name || project.name);
  const ictx: ImgCtx = { userId: project.userId, projectId, jobId: ctx.job.id };
  let data: Buffer;
  let meta: Record<string, unknown> = {};
  let role: string = req.kind;
  let folder = "images.scenes";
  ctx.progress(0.3, L("Composition de l'image", "Composing the image"));
  if (req.kind === "packshot") {
    data = await renderPackshot(product, { format: fmt });
    folder = "images.packshots";
    meta = { recipe: "Packshot" };
  } else if (req.kind === "scene" || req.kind === "banner") {
    let bg: Buffer | null = null;
    if (req.useAi) {
      const r = await ctx.step("ai-bg", async () => {
        const out = await aiBackground(ictx, project, assetData(cut), req.style ?? "studio", req.format ?? "product", `${ctx.job.id}:single`);
        return out ? { b64: out.image.toString("base64"), provider: out.provider } : null;
      });
      if (r?.provider === "openai") {
        data = await sharp(Buffer.from(r.b64, "base64")).jpeg({ quality: 92 }).toBuffer();
        const a = await saveAsset({ projectId, userId: project.userId, data, name: `${base}-scene-${C("ia", "ai")}-${Date.now()}.jpg`, mime: "image/jpeg", role: "scene", folderKey: "images.scenes", origin: "generated", sourceAssetId: cut.id, meta: { recipe: L("Décor peint par IA autour du produit réel", "AI-painted set around the real product"), provider: "OpenAI" }, status: "review" });
        return { assetId: a.id };
      }
      if (r) bg = Buffer.from(r.b64, "base64");
    }
    const s = await renderScene({ product, palette: pal, style: req.style ?? "studio", format: fmt, seed: Date.now() % 1000, background: bg ? await loadImage(bg) : null, offsetX: req.kind === "banner" ? 0.18 : 0 });
    data = await sharp(s.png).jpeg({ quality: 92 }).toBuffer();
    folder = req.kind === "banner" ? "images.banners" : "images.scenes";
    meta = { recipe: L(`Scène ${req.style ?? "studio"}`, `Scene: ${req.style ?? "studio"}`), provider: bg ? L("Décor IA + composition", "AI set + compositing") : "local" };
  } else {
    const logoAsset = latestAsset(projectId, "logo");
    const r = await renderCreative({ product, palette: pal, typo: brandTypo(project), format: fmt, layout: req.layout ?? "editorial", headline: req.headline || project.brand?.tagline || project.product.name, subline: req.subline, cta: req.cta, brand: project.brand?.name ?? project.name, logo: logoAsset ? await loadImage(assetData(logoAsset)) : null, scene: req.style, seed: Date.now() % 1000 });
    data = r.jpg;
    folder = req.kind === "ad" ? "images.ads" : "images.social";
    role = req.kind;
    meta = { recipe: L(`Visuel ${fmt.label}`, `${fmt.label} visual`), safeArea: r.safe, minFontPx: r.minFontPx, text: { headline: req.headline, sub: req.subline, cta: req.cta } };
  }
  const a = await saveAsset({ projectId, userId: project.userId, data, name: `${base}-${role}-${fmt.label.replace(":", "x")}-${Date.now().toString(36)}.jpg`, mime: "image/jpeg", role, folderKey: folder, origin: "generated", sourceAssetId: cut.id, meta: { ...meta, format: fmt.label }, status: "review" });
  return { assetId: a.id };
}
