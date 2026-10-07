/**
 * Logo complet dessiné par l'IA d'images (OpenAI de préférence) : le directeur artistique (modèle de texte) décrit
 * l'entreprise en détail et écrit deux briefs de logo différents ; l'IA d'images dessine le logo entier, nom compris ;
 * un contrôle visuel vérifie que le nom est écrit exactement (une reprise corrigée sinon). Le client choisit ensuite
 * s'il l'utilise : il remplace alors le logo partout (site, favicon, charte). Fichier PNG haute définition.
 */
import sharp from "sharp";
import { z } from "zod";
import { all, one } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject, saveBrand, type Project } from "../projects";
import { fullLogoImage, imageProviderAvailable, imageUnavailableReason, refundMediaQuota } from "../ai/media-providers";
import { llmConfigured, llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { C, L } from "../i18n-server";

type Ictx = { userId: string; projectId: string; jobId?: string | null };

/** Deux briefs de logo complets, rédigés d'après tout le projet (métier, clientèle, ton, couleurs). */
async function briefs(ictx: Ictx, p: Project): Promise<{ concept: string; brief: string }[]> {
  const pal = p.brand?.palette;
  const r = await llmJson(
    {
      task: "logo_symbol",
      ...ictx,
      usageKey: `${ictx.jobId ?? "logo"}:full-logo-briefs:${Date.now().toString(36)}`,
      system: `Rôle : directeur artistique senior d'une agence de branding. Tu écris, pour un illustrateur (une IA d'images), deux briefs de LOGO COMPLET (symbole + nom de la marque) vraiment différents, comme un vrai designer : le symbole naît de la logique du métier ou du produit (fonction, geste, outil, matière, bénéfice, origine), jamais un cliché du secteur ; typographie décrite précisément (famille, graisse, casse, interlettrage) ; composition (symbole à gauche, au-dessus, emblème…) ; couleurs données en codes hexadécimaux de la palette. Aucune promesse, aucun slogan dans le logo. Briefs EN ANGLAIS, 70 à 140 mots chacun ; « concept » en français, une phrase.`,
      context: projectContext(p, "brand"),
      prompt: `Marque : « ${p.brand?.name ?? p.name} ». Palette : ${pal ? Object.entries(pal).map(([k, v]) => `${k} ${v}`).join(", ") : "à choisir"}. Direction : ${p.brand?.direction ?? ""}.
Réponds { "logos": [ { "concept": "…", "brief": "…" }, { "concept": "…", "brief": "…" } ] }.`,
      maxTokens: 6000,
    },
    z.object({ logos: z.array(z.object({ concept: z.string(), brief: z.string() })).min(1).max(2) }),
  );
  return r.logos;
}

/** Le nom est-il écrit exactement, sans autre texte ? Logo propre et professionnel ? */
async function checkFullLogo(ictx: Ictx & { usageKey: string }, img: Buffer, name: string) {
  return llmJson(
    {
      task: "quality_control",
      ...ictx,
      system: "Rôle : contrôleur qualité de logos (agence). Tu lis le texte du logo lettre par lettre et tu vérifies sa qualité.",
      images: [{ data: await sharp(img).flatten({ background: "#ffffff" }).resize(1024, 1024, { fit: "inside" }).png().toBuffer(), label: "logo à contrôler" }],
      prompt: `Nom attendu, à l'identique (lettres, accents, espaces) : « ${name} ».
Réponds { "text": "texte lu exactement", "nameExact": true|false, "extraText": true|false, "score": 0-10, "issues": ["…"] } — score : 9-10 logo d'agence ; 7-8 bon ; 5-6 défauts visibles ; 0-4 inutilisable (texte déformé, symbole confus, rendu amateur).`,
      maxTokens: 2500,
    },
    z.object({ text: z.string().catch(""), nameExact: z.boolean().catch(false), extraText: z.boolean().catch(false), score: z.coerce.number().catch(0), issues: z.array(z.string()).catch([]) }),
  );
}

/** Fond blanc retiré (Gemini ne fait pas de transparence) puis recadrage serré avec une marge. */
async function clean(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  let png = img;
  if (!meta.hasAlpha) {
    const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) data[i + 3] = 0;
    png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  }
  const trimmed = await sharp(png).trim({ threshold: 5 }).png().toBuffer().catch(() => png);
  return sharp(trimmed).extend({ top: 40, bottom: 40, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

export function fullLogos(projectId: string): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-ai-full' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 6", projectId);
}

/** Crée deux logos complets (avec une reprise corrigée si le nom est mal écrit). Renvoie les fichiers créés. */
export async function generateFullLogos(ctx: JobContext | null, projectId: string): Promise<Asset[]> {
  const p = loadProject(projectId);
  if (!p.brand) throw new UserFacingError(L("La marque doit exister avant le logo.", "The brand must exist before the logo."));
  if (!llmConfigured() || !imageProviderAvailable()) throw new UserFacingError(L(`Logo complet par IA indisponible : ${imageUnavailableReason() ?? "IA de rédaction non active"}.`, `AI full logo unavailable: ${imageUnavailableReason() ?? "writing AI not active"}.`));
  const name = p.brand.name;
  const ictx = { userId: p.userId, projectId, jobId: ctx?.job.id ?? null };
  ctx?.progress(0.1, L("Brief du logo complet (directeur artistique)", "Full logo brief (art director)"));
  const list = await briefs(ictx, p);
  const out: Asset[] = [];
  for (const [i, b] of list.entries()) {
    ctx?.progress(0.25 + i * 0.35, L(`Logo complet ${i + 1} dessiné par l'IA d'images`, `Full logo ${i + 1} drawn by the image AI`));
    const key = `${ictx.jobId ?? "logo"}:full-logo:${i}:${Date.now().toString(36)}`;
    try {
      let img = await fullLogoImage({ ...ictx, usageKey: key }, { brief: b.brief, name });
      let qc = await checkFullLogo({ ...ictx, usageKey: `${key}:qc` }, img, name);
      if (!qc.nameExact || qc.extraText || qc.score < 5) {
        // Nom mal écrit ou rendu raté : une reprise avec le défaut précis ; le raté n'est ni gardé ni décompté.
        refundMediaQuota(p.userId, key);
        const fix = [!qc.nameExact && `the name was written "${qc.text}" instead of "${name}"`, qc.extraText && "remove every extra word or letter", ...qc.issues].filter(Boolean).join("; ");
        img = await fullLogoImage({ ...ictx, usageKey: `${key}:retry` }, { brief: `${b.brief} Fix these defects of a previous attempt: ${fix}.`, name });
        qc = await checkFullLogo({ ...ictx, usageKey: `${key}:retry:qc` }, img, name);
      }
      const warning = !qc.nameExact ? L(`nom lu « ${qc.text} » au lieu de « ${name} »`, `name read "${qc.text}" instead of "${name}"`) : qc.extraText ? L("texte en trop dans le logo", "extra text in the logo") : qc.score < 7 ? qc.issues.join(L(" ; ", "; ")) : "";
      out.push(
        await saveAsset({
          projectId,
          userId: p.userId,
          data: await clean(img),
          name: C(`logo-complet-ia-${i + 1}.png`, `ai-full-logo-${i + 1}.png`),
          mime: "image/png",
          role: "logo-ai-full",
          folderKey: "brand.logos",
          origin: "generated",
          meta: { concept: b.concept, brief: b.brief, qc, aiGenerated: true, recipe: L("Logo complet dessiné par l'IA d'images d'après le brief du directeur artistique", "Full logo drawn by the image AI from the art director's brief"), ...(warning ? { qcWarning: warning } : {}) },
          status: "review",
        }),
      );
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[logo complet] indisponible :", (e as Error).message);
      if (!out.length && i === list.length - 1) throw new UserFacingError(L(`Logo complet par IA impossible : ${(e as Error).message}`, `AI full logo failed: ${(e as Error).message}`));
    }
  }
  return out;
}

/** Utiliser un logo complet de l'IA : il devient le logo de la marque partout (site, favicon, charte). */
export async function useFullLogo(projectId: string, assetId: string) {
  const p = loadProject(projectId);
  const a = getAsset(assetId);
  if (!p.brand || !a || a.project_id !== projectId || a.role !== "logo-ai-full") throw new UserFacingError(L("Logo introuvable.", "Logo not found."));
  const src = assetData(a);
  const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, meta: { concept: json(a.meta).concept, fullLogo: a.id } };
  const main = await saveAsset({ ...base, data: src, name: C("logo-principal.png", "logo-main.png"), mime: "image/png", role: "logo", sourceAssetId: a.id, status: "approved" });
  // Version claire (fonds sombres) : mêmes formes, en blanc.
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  const light = await saveAsset({ ...base, data: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), name: C("logo-clair.png", "logo-light.png"), mime: "image/png", role: "logo-light", sourceAssetId: main.id });
  // Favicon : le logo centré dans un carré (lisible surtout grâce au symbole).
  const fav = await saveAsset({ ...base, data: await sharp(src).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), name: "favicon.png", mime: "image/png", role: "favicon", sourceAssetId: main.id });
  saveBrand(projectId, { ...p.brand, logo: { ...p.brand.logo, assetId: main.id, concept: `${C("Logo complet dessiné par l'IA", "Full logo drawn by AI")} — ${json(a.meta).concept ?? ""}`, status: "validated", proposal: undefined, proposalId: a.id, route: undefined } });
  const { swapThemeLogos } = await import("./identity");
  swapThemeLogos(projectId, { logo: main.id, light: light.id, favicon: fav.id });
  const { saveBrandBook, saveBrandGuide } = await import("./brand");
  await saveBrandGuide(projectId).catch(() => null);
  await saveBrandBook(projectId).catch(() => null);
  return { main: main.id };
}

const json = (m: unknown) => (typeof m === "string" ? (() => { try { return JSON.parse(m); } catch { return {}; } })() : (m as any) ?? {});
