/**
 * Logo complet dessiné par l'IA d'images (OpenAI de préférence) : le directeur artistique (modèle de texte) décrit
 * l'entreprise en détail et écrit trois briefs de logo différents ; l'IA d'images dessine le logo entier, nom compris ;
 * un contrôle visuel lit le nom lettre par lettre et note le logo, puis la barrière de qualité décide : FINAL (8/10
 * au moins, nom exact, aucun texte en trop), reprise ciblée sur diagnostic, ou refus. Seuls les logos non refusés
 * sont proposés ; seul un FINAL peut être appliqué automatiquement. Fichier PNG haute définition.
 */
import { markBrandLogo, recordBrandDecision } from "../brain/brand-locks";
import sharp from "sharp";
import { z } from "zod";
import { all, one, run } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject, saveBrand, type Project } from "../projects";
import { fullLogoImage, imageProviderAvailable, imageUnavailableReason, refundMediaQuota } from "../ai/media-providers";
import { llmConfigured, llmJson } from "../ai/llm";
import { brainView } from "../ai/context";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { C, L } from "../i18n-server";
import { stableKey } from "../ai/keys";
import { withCandidate } from "../ai/trace";
import { decide, type GateDecision } from "../quality/gate";
import { gateMeta, saveCheck, statusFor } from "../quality/store";
import { manuallySelectable } from "../quality/usable";

type Ictx = { userId: string; projectId: string; jobId?: string | null };

/** Trois briefs de logo complets, rédigés d'après tout le projet (métier, clientèle, ton, couleurs). */
async function briefs(ictx: Ictx, p: Project, usageKey: string): Promise<{ concept: string; brief: string; descriptor?: string }[]> {
  const pal = p.brand?.palette;
  const view = brainView(p, "logo");
  // Palette et direction déjà dans le contexte du Brain (scope logo) : pas répétées dans la demande.
  const palette = view.kept.includes("brand.palette") ? "" : ` Palette : ${pal ? Object.entries(pal).map(([k, v]) => `${k} ${v}`).join(", ") : "à choisir"}.`;
  const direction = view.kept.includes("brand.direction") ? "" : ` Direction : ${p.brand?.direction ?? ""}.`;
  const r = await llmJson(
    {
      task: "logo_symbol",
      ...ictx,
      usageKey,
      system: `Rôle : directeur artistique senior d'une agence de branding. Tu écris, pour un illustrateur (une IA d'images), trois briefs de LOGO COMPLET (symbole + nom de la marque) vraiment différents, comme un vrai designer : le symbole naît de la logique du métier ou du produit (fonction, geste, outil, matière, bénéfice, origine), jamais un cliché du secteur ; typographie décrite précisément (famille, graisse, casse, interlettrage) ; composition (symbole à gauche, au-dessus, emblème…) ; couleurs : UNIQUEMENT celles de la palette de la marque (codes hexadécimaux donnés), le logo doit correspondre à la charte graphique. Aucune promesse, aucun slogan dans le logo. Briefs EN ANGLAIS, 70 à 140 mots chacun ; « concept » en français, une phrase.`,
      context: view.stable,
      prompt: `Marque : « ${p.brand?.name ?? p.name} ».${palette}${direction}
Trois propositions ORIGINALES et vraiment différentes (idée, composition, typographie, couleurs), du niveau des logos professionnels de commerçants et d'artisans, par exemple : 1) une icône illustrée et colorée qui montre le métier au premier regard, au-dessus du nom ; 2) un emblème ou un badge ; 3) une typographie travaillée (script élégant ou capitales fortes) avec un petit symbole. Choisis ce qui sert le mieux cette entreprise ; jamais la copie d'un logo existant. « descriptor » : la ligne du métier sous le nom, en français, 1 à 3 mots en capitales (ex. « PLÂTRIER PEINTRE »), ou vide pour un logo sans cette ligne.
Réponds { "logos": [ { "concept": "…", "brief": "…", "descriptor": "…" }, { "concept": "…", "brief": "…", "descriptor": "…" }, { "concept": "…", "brief": "…", "descriptor": "…" } ] }.`,
      maxTokens: 6000,
    },
    z.object({ logos: z.array(z.object({ concept: z.string(), brief: z.string(), descriptor: z.string().max(40).optional().catch(undefined) })).min(1).max(3) }),
  );
  return r.logos;
}

/** Le nom est-il écrit exactement, sans autre texte ? Logo propre et professionnel ? */
async function checkFullLogo(ictx: Ictx & { usageKey: string }, img: Buffer, name: string, descriptor?: string) {
  return llmJson(
    {
      task: "quality_control",
      ...ictx,
      system: "Rôle : contrôleur qualité de logos (agence). Tu lis le texte du logo lettre par lettre et tu vérifies sa qualité.",
      images: [{ data: await sharp(img).flatten({ background: "#ffffff" }).resize(1024, 1024, { fit: "inside" }).png().toBuffer(), label: "logo à contrôler" }],
      prompt: `Nom attendu, à l'identique (lettres, accents, espaces) : « ${name} ».${descriptor ? ` Ligne du métier autorisée, à l'identique : « ${descriptor} » (ce n'est pas du texte en trop).` : ""}
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

/** Logos complets proposés au client : jamais les essais refusés par la barrière (gardés pour le diagnostic). */
export function fullLogos(projectId: string): Asset[] {
  return all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-ai-full' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 6", projectId);
}

/** Essais refusés par la barrière (non proposés). */
export function rejectedFullLogos(projectId: string): number {
  return one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'logo-ai-full' AND deleted_at IS NULL AND status = 'rejected'", projectId)?.n ?? 0;
}

type FullLogoQc = Awaited<ReturnType<typeof checkFullLogo>>;

/** Contrôle d'un logo complet traduit pour la barrière : nom inexact et texte en trop sont bloquants. */
export function fullLogoDecision(qc: FullLogoQc | null, name: string, attempt: number, error?: string): GateDecision {
  if (!qc) return decide("logo_full", { checker: "ai", score: null, error: error || "contrôle sans réponse" }, { attempt });
  return decide(
    "logo_full",
    {
      checker: "ai",
      score: qc.score,
      codes: [!qc.nameExact && "name_mismatch", qc.extraText && "extra_text"].filter((x): x is string => !!x),
      issues: [!qc.nameExact && L(`nom lu « ${qc.text} » au lieu de « ${name} »`, `name read "${qc.text}" instead of "${name}"`), qc.extraText && L("texte en trop dans le logo", "extra text in the logo"), ...qc.issues].filter((x): x is string => !!x),
    },
    { attempt },
  );
}

/**
 * Crée trois logos complets, chacun passé par la barrière de qualité (une reprise ciblée au plus, sur diagnostic).
 * Chaque génération et chaque contrôle est un point de reprise (une tâche reprise ne repaie rien de terminé).
 */
export async function generateFullLogos(ctx: JobContext | null, projectId: string, opts: { autoApply?: boolean } = {}): Promise<Asset[]> {
  const p = loadProject(projectId);
  if (!p.brand) throw new UserFacingError(L("La marque doit exister avant le logo.", "The brand must exist before the logo."));
  if (!llmConfigured() || !imageProviderAvailable()) throw new UserFacingError(L(`Logo complet par IA indisponible : ${imageUnavailableReason() ?? "IA de rédaction non active"}.`, `AI full logo unavailable: ${imageUnavailableReason() ?? "writing AI not active"}.`));
  const name = p.brand.name;
  const colors = [p.brand.palette.primary, p.brand.palette.accent, p.brand.palette.secondary, p.brand.palette.dark];
  const ictx = { userId: p.userId, projectId, jobId: ctx?.job.id ?? null };
  const scope = ctx?.job.id ?? stableKey(projectId, crypto.randomUUID());
  const step = <T,>(key: string, fn: () => Promise<T>) => (ctx ? ctx.step(key, fn) : fn());
  ctx?.progress(0.1, L("Brief du logo complet (directeur artistique)", "Full logo brief (art director)"));
  const list = await step("full-logo:briefs", () => briefs(ictx, p, stableKey(scope, "full-logo", "briefs")));
  const out: Asset[] = [];
  const offered: { a: Asset; d: GateDecision }[] = [];
  for (const [i, b] of list.entries()) {
    ctx?.progress(0.25 + i * 0.25, L(`Logo complet ${i + 1} dessiné par l'IA d'images`, `Full logo ${i + 1} drawn by the image AI`));
    const candidate = stableKey(projectId, "full-logo", scope, i);
    const descriptor = b.descriptor?.trim() || undefined;
    let feedback = "";
    let prevCheck: string | null = null;
    try {
      for (let attempt = 0; ; attempt++) {
        const key = stableKey(scope, "full-logo", i, attempt);
        // Image enregistrée dès sa réception (point de reprise) : une reprise ne la repaie pas.
        let fresh: { asset: Asset; png: Buffer } | null = null;
        const assetId = await step(`full-logo:${i}:${attempt}:image`, () =>
          withCandidate(candidate, attempt, async () => {
            const img = await fullLogoImage({ ...ictx, usageKey: key }, { brief: feedback ? `${b.brief} Fix these defects of a previous attempt: ${feedback}.` : b.brief, name, descriptor, colors });
            const png = await clean(img);
            const a = await saveAsset({ projectId, userId: p.userId, data: png, name: C(`logo-complet-ia-${i + 1}.png`, `ai-full-logo-${i + 1}.png`), mime: "image/png", role: "logo-ai-full", folderKey: "brand.logos", origin: "generated", meta: { concept: b.concept, brief: b.brief, aiGenerated: true, attempt, recipe: L("Logo complet dessiné par l'IA d'images d'après le brief du directeur artistique", "Full logo drawn by the image AI from the art director's brief"), qcWarning: L("contrôle en attente", "check pending") }, status: "review" });
            fresh = { asset: a, png };
            return a.id;
          }),
        );
        const got = fresh as { asset: Asset; png: Buffer } | null;
        const asset = got?.asset ?? getAsset(assetId)!;
        const qcRes = await step(`full-logo:${i}:${attempt}:qc`, () =>
          withCandidate(candidate, attempt, async () => {
            try {
              return { qc: await checkFullLogo({ ...ictx, usageKey: `${key}:qc` }, got?.png ?? assetData(asset), name, descriptor), error: "" };
            } catch (e) {
              if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
              return { qc: null, error: (e as Error).message };
            }
          }),
        );
        const d = fullLogoDecision(qcRes.qc, name, attempt, qcRes.error);
        prevCheck = saveCheck(d, { userId: p.userId, projectId, jobId: ictx.jobId, candidateId: candidate, assetId, previousCheckId: prevCheck });
        // Avertissement toujours explicite quand le logo n'est pas FINAL.
        const warning = d.verdict === "FINAL" ? null : [d.reason, d.feedback].filter(Boolean).join(L(" — ", " — "));
        const meta: Record<string, unknown> = { ...json(asset.meta), qc: qcRes.qc, gate: gateMeta(d, prevCheck) };
        if (warning) meta.qcWarning = warning;
        else delete meta.qcWarning;
        // Raté corrigeable : le dessin n'est ni proposé ni décompté au client ; une reprise ciblée suit.
        const retry = d.verdict === "RETRY" && d.action === "regenerate";
        const status = retry ? "rejected" : statusFor(d);
        run("UPDATE assets SET meta = ?, status = ? WHERE id = ?", JSON.stringify(meta), status, assetId);
        const updated = { ...asset, meta: JSON.stringify(meta), status } as Asset;
        if (status === "rejected") refundMediaQuota(p.userId, key);
        if (retry) {
          // Consigne de reprise pour l'IA d'images (en anglais), tirée des défauts relevés.
          const qc = qcRes.qc;
          feedback = [qc && !qc.nameExact && `the name was written "${qc.text}" instead of "${name}"`, qc?.extraText && "remove every extra word or letter", ...(qc?.issues ?? [])].filter(Boolean).join("; ") || d.feedback;
          continue;
        }
        if (status !== "rejected") {
          out.push(updated);
          offered.push({ a: updated, d });
        }
        break;
      }
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[logo complet] indisponible :", (e as Error).message);
      if (!out.length && i === list.length - 1 && !offered.length) throw new UserFacingError(L(`Logo complet par IA impossible : ${(e as Error).message}`, `AI full logo failed: ${(e as Error).message}`));
    }
  }
  // Pendant la création : seul un logo FINAL (barrière franchie) peut devenir le logo de la marque, sauf choix du client.
  if (opts.autoApply) {
    const fresh = loadProject(projectId).brand;
    const best = offered.filter((x) => x.d.verdict === "FINAL").sort((x, y) => (y.d.score ?? 0) - (x.d.score ?? 0))[0];
    if (best && fresh && fresh.logo.status !== "validated" && fresh.logo.status !== "provided" && !(fresh.validated ?? []).includes("logo")) await useFullLogo(projectId, best.a.id, { validate: false, auto: true });
  }
  return out;
}

/** Utiliser un logo complet de l'IA : il devient le logo de la marque partout (site, favicon, charte). */
export async function useFullLogo(projectId: string, assetId: string, opts: { validate?: boolean; auto?: boolean } = {}) {
  const p = loadProject(projectId);
  const a = getAsset(assetId);
  if (!p.brand || !a || a.project_id !== projectId || a.role !== "logo-ai-full") throw new UserFacingError(L("Logo introuvable.", "Logo not found."));
  // Essai refusé (ou défaut fatal) : jamais utilisé ; application automatique : seulement un FINAL.
  const gate = json(a.meta).gate as { verdict?: string } | undefined;
  if (a.status === "rejected" || !manuallySelectable(a)) throw new UserFacingError(L("Ce logo a été refusé par le contrôle de qualité : il ne peut pas être utilisé.", "This logo was rejected by the quality check: it can't be used."));
  if (opts.auto && gate?.verdict !== "FINAL") throw new UserFacingError(L("Logo non validé par le contrôle de qualité : application automatique refusée.", "Logo not validated by the quality check: automatic use refused."));
  const src = assetData(a);
  const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, meta: { concept: json(a.meta).concept, fullLogo: a.id } };
  const main = await saveAsset({ ...base, data: src, name: C("logo-principal.png", "logo-main.png"), mime: "image/png", role: "logo", sourceAssetId: a.id, status: "approved" });
  // Version claire (fonds sombres) : mêmes formes, en blanc.
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  const light = await saveAsset({ ...base, data: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), name: C("logo-clair.png", "logo-light.png"), mime: "image/png", role: "logo-light", sourceAssetId: main.id });
  // Favicon : le logo centré dans un carré (lisible surtout grâce au symbole).
  const fav = await saveAsset({ ...base, data: await sharp(src).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), name: "favicon.png", mime: "image/png", role: "favicon", sourceAssetId: main.id });
  const validated = opts.validate !== false;
  // Choix explicite du client : le logo devient la décision active (verrou « logo »), l'ancien reste dans l'historique.
  saveBrand(projectId, { ...p.brand, validated: validated ? [...new Set([...(p.brand.validated ?? []), "logo"])] : p.brand.validated, logo: { ...p.brand.logo, assetId: main.id, concept: `${C("Logo complet dessiné par l'IA", "Full logo drawn by AI")} — ${json(a.meta).concept ?? ""}`, status: validated ? "validated" : "proposed", proposal: undefined, proposalId: a.id, route: undefined, provisional: false, engine: undefined } });
  markBrandLogo(projectId, main.id);
  if (validated && !opts.auto) recordBrandDecision(projectId, "logo", `Logo complet dessiné par l'IA (${a.id})`);
  const { swapThemeLogos } = await import("./identity");
  swapThemeLogos(projectId, { logo: main.id, light: light.id, favicon: fav.id });
  const { saveBrandBook, saveBrandGuide } = await import("./brand");
  await saveBrandGuide(projectId).catch(() => null);
  await saveBrandBook(projectId).catch(() => null);
  return { main: main.id };
}

const json = (m: unknown) => (typeof m === "string" ? (() => { try { return JSON.parse(m); } catch { return {}; } })() : (m as any) ?? {});
