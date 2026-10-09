/**
 * Choix du client (Logo V2) → décision du Project Brain → déclinaisons → système de marque.
 * Seulement APRÈS le choix : variantes utiles (principale, horizontale, empilée si pertinente, marque réduite, noir
 * seul, blanc sur fond sombre, petite taille), typographies de la marque, charte et planches de mise en situation.
 */
import sharp from "sharp";
import type { JobContext } from "../jobs";
import { UserFacingError } from "../jobs";
import { getAsset, saveAsset } from "../library";
import { json } from "../db";
import { loadProject, saveBrand } from "../projects";
import { logoPng, buildLogo, type LogoSpec } from "../media/logo";
import { SHOPIFY_TO_CANVAS } from "../media/fonts";
import { recordBrandDecision } from "../brain/brand-locks";
import { applyLogo, type LogoProposal } from "../engine/identity";
import { C, L } from "../i18n-server";
import type { Territory } from "./types";

const KEY: Record<Territory["markType"], LogoProposal["key"]> = { wordmark: "typo", lettermark: "typo", monogram: "typo", symbol_wordmark: "concept", abstract_mark: "concept", emblem: "embleme" };

/** Police du studio → identifiant Shopify de la marque (pour le site et la charte), si elle existe côté thème. */
function shopifyHandle(family: string, weight: number): string | null {
  const key = Object.entries(SHOPIFY_TO_CANVAS).find(([, v]) => v === family)?.[0];
  return key ? `${key}_n${Math.round(weight / 100)}` : null;
}

/** Variantes utiles en plus de celles du logo principal (pas de variante décorative pour remplir une galerie). */
export function extraVariants(spec: LogoSpec): { role: string; name: string; spec: LogoSpec; width: number }[] {
  const out: { role: string; name: string; spec: LogoSpec; width: number }[] = [
    { role: "logo-mono", name: C("logo-noir.svg", "logo-black.svg"), spec: { ...spec, color: "#111111", accent: "#111111" }, width: 1200 },
  ];
  // Empilée : seulement si le logo a une marque (symbole ou monogramme) et n'est pas déjà empilé.
  if (spec.custom && spec.layout !== "vertical") out.push({ role: "logo-stacked", name: C("logo-empile.svg", "logo-stacked.svg"), spec: { ...spec, layout: "vertical", tagline: undefined }, width: 900 });
  return out;
}

/** Proposition Logo V2 d'un projet (FINAL, ou version du studio sans relecture IA), sinon erreur. */
function proposalOf(projectId: string, assetId: string) {
  const a = getAsset(assetId);
  const meta = a ? json<any>(a.meta as any, {}) : null;
  if (!a || a.project_id !== projectId || meta?.engine !== "logo-v2") throw new UserFacingError(L("Proposition introuvable.", "Proposal not found."));
  const verdict = meta.gate?.verdict;
  if (verdict !== "FINAL" && verdict !== "PROVISIONAL") throw new UserFacingError(L("Cette proposition n'a pas passé le contrôle qualité : elle ne peut pas devenir le logo.", "This proposal did not pass the quality check: it can't become the logo."));
  return { meta, verdict: verdict as "FINAL" | "PROVISIONAL" };
}

/**
 * Application d'une proposition Logo V2 : typographie des titres, logo principal et déclinaisons (principal, clair,
 * horizontal, marque réduite, favicon, noir seul, empilée, petite taille), boutique mise à jour ; kit et charte
 * seulement pour un logo non provisoire. `provisional` : version du studio sans relecture IA (jamais présentée comme finale).
 */
async function applyProposal(ctx: JobContext | null, projectId: string, assetId: string, meta: any, opts: { provisional: boolean }) {
  const p = loadProject(projectId);
  const t: Territory = meta.territory;
  const spec: LogoSpec = meta.spec;
  const { color, accent, ...rest } = spec;
  // Système de marque : la typographie du logo devient celle des titres (sauf typographies validées par le client),
  // AVANT la charte et les planches faites ci-dessous.
  const cur = loadProject(projectId).brand!;
  const handle = shopifyHandle(spec.family, spec.weight);
  if (handle && !(cur.validated ?? []).includes("fonts")) saveBrand(projectId, { ...cur, fonts: { ...cur.fonts, heading: handle } });
  const pr: LogoProposal = { id: assetId, key: KEY[t.markType], label: t.name, concept: `${t.name} — ${t.concept}`, spec: { ...rest, tagline: undefined }, colors: { color, accent: accent ?? color } };
  const applied = await applyLogo(ctx, projectId, pr, { noTagline: true, provisional: opts.provisional });
  // Variantes utiles en plus (noir seul, empilée si pertinente, petite taille).
  const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, sourceAssetId: applied.main.id, meta: { engine: "logo-v2", territory: t.id } };
  for (const v of extraVariants({ ...spec, tagline: undefined })) {
    await saveAsset({ ...base, data: Buffer.from(buildLogo(v.spec).svg), name: v.name, mime: "image/svg+xml", kind: "logo", role: `${v.role}-svg` });
    await saveAsset({ ...base, data: await logoPng(v.spec, v.width), name: v.name.replace(/\.svg$/, ".png"), mime: "image/png", role: v.role });
  }
  const small = await sharp(await logoPng(spec, 240)).resize({ width: 120, height: 48, fit: "inside" }).png().toBuffer();
  await saveAsset({ ...base, data: small, name: C("logo-petite-taille.png", "logo-small.png"), mime: "image/png", role: "logo-small" });
  const after = loadProject(projectId).brand!;
  saveBrand(projectId, { ...after, logo: { ...after.logo, engine: "v2" } });
  return applied;
}

/**
 * Choix du CLIENT : décision du Project Brain, puis application et verrou (aucun traitement automatique ne remplacera
 * ce logo). Le choix du client vaut contrôle humain : une version du studio choisie par lui devient son logo.
 */
export async function chooseLogoV2(ctx: JobContext | null, projectId: string, assetId: string) {
  const { meta, verdict } = proposalOf(projectId, assetId);
  const t: Territory = meta.territory;
  // 1. Décision du client (Project Brain) — avant tout le reste.
  recordBrandDecision(projectId, "logo", `${t.name} — ${t.concept.slice(0, 160)} (${assetId})${verdict === "PROVISIONAL" ? " [version du studio choisie par le client]" : ""}`);
  // 2. Logo principal, déclinaisons, charte et planches.
  const applied = await applyProposal(ctx, projectId, assetId, meta, { provisional: false });
  // 3. Logo validé par le choix du client (verrou : aucun traitement automatique ne le remplacera).
  const after = loadProject(projectId).brand!;
  saveBrand(projectId, { ...after, validated: [...new Set([...(after.validated ?? []), "logo"])], logo: { ...after.logo, status: "validated", provisional: false } });
  return { main: applied.main.id, territory: t.id };
}

/**
 * Création complète et demande unique (sans choix du client) : la meilleure proposition FINALE est appliquée comme
 * proposition (non verrouillée, le client peut en choisir une autre) ; à défaut, la meilleure version du studio, comme
 * logo PROVISOIRE. Un logo fourni ou validé par le client n'est jamais remplacé.
 */
export async function applyBestLogoV2(ctx: JobContext | null, projectId: string, results: { assetId?: string; verdict: string; score: number | null }[]) {
  const brand = loadProject(projectId).brand;
  if (!brand || brand.logo.status === "validated" || brand.logo.status === "provided" || (brand.validated ?? []).includes("logo")) return null;
  const rank = (r: { verdict: string; score: number | null }) => (r.verdict === "FINAL" ? 100 : 0) + (r.score ?? 0);
  const best = results.filter((r) => r.assetId && (r.verdict === "FINAL" || r.verdict === "PROVISIONAL")).sort((a, b) => rank(b) - rank(a))[0];
  if (!best) return null;
  const { meta, verdict } = proposalOf(projectId, best.assetId!);
  await applyProposal(ctx, projectId, best.assetId!, meta, { provisional: verdict !== "FINAL" });
  return { assetId: best.assetId!, provisional: verdict !== "FINAL" };
}

/**
 * Nom ou palette modifiés par le client : le logo V2 appliqué est reconstruit avec le nouveau nom et les couleurs de
 * la palette aux mêmes rôles (encre, accent) que sa direction, puis réappliqué partout. Sans IA. Renvoie false si le
 * logo appliqué ne vient pas du moteur V2.
 */
export async function reapplyLogoV2(ctx: JobContext | null, projectId: string): Promise<boolean> {
  const p = loadProject(projectId);
  const b = p.brand;
  if (!b || b.logo.engine !== "v2" || !b.logo.proposalId) return false;
  const a = getAsset(b.logo.proposalId);
  const meta = a ? json<any>(a.meta as any, {}) : null;
  if (!meta || meta.engine !== "logo-v2") return false;
  const t: Territory = meta.territory;
  const color = b.palette[t.colorRole?.ink as keyof typeof b.palette] ?? meta.spec.color;
  const accent = b.palette[t.colorRole?.accent as keyof typeof b.palette] ?? meta.spec.accent ?? color;
  const next = { ...meta, spec: { ...meta.spec, name: b.name, color, accent } };
  const wasValidated = b.logo.status === "validated";
  await applyProposal(ctx, projectId, b.logo.proposalId, next, { provisional: !wasValidated && !!b.logo.provisional });
  if (wasValidated) {
    const after = loadProject(projectId).brand!;
    saveBrand(projectId, { ...after, logo: { ...after.logo, status: "validated" } });
  }
  return true;
}
