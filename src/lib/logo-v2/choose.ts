/**
 * Choix du client (Logo V2) → décision du Project Brain → déclinaisons → système de marque.
 * Seulement APRÈS le choix : variantes utiles (principale, horizontale, empilée si pertinente, marque réduite, noir
 * seul, blanc sur fond sombre, petite taille), typographies de la marque, charte et planches de mise en situation.
 */
import sharp from "sharp";
import type { JobContext } from "../jobs";
import { UserFacingError } from "../jobs";
import { assetData, getAsset, saveAsset } from "../library";
import { markBrandLogo } from "../brain/brand-locks";
import { canvasFamily } from "../media/fonts";
import { brandBoard } from "./brand-board";
import { faithfulSvg, STYLE_LABEL, correctArtworkText } from "./artwork";
import { brandDiscovery } from "./discovery";
import { artworkInks, artworkSymbol, paletteFromInks, symbolFavicon } from "./identity";
import { defaultStyle } from "./territories";
import { json } from "../db";
import { loadProject, saveBrand } from "../projects";
import { logoPng, logoSet, buildLogo, type LogoSpec } from "../media/logo";
import { SHOPIFY_TO_CANVAS } from "../media/fonts";
import { isLocked, recordBrandDecision } from "../brain/brand-locks";
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

/** Défauts qui interdisent un logo complet même choisi par le client (nom faux, texte inventé, ressemblance). */
const ARTWORK_NEVER = ["name_mismatch", "text_unreadable", "extra_text", "resembles_known_brand", "corrupt", "forbidden", "placeholder_shape", "duplicate"];

/**
 * Logo complet écarté par le contrôle mais présentable au CLIENT (son choix vaut contrôle humain) : seulement si le
 * nom est exact et qu'aucun défaut rédhibitoire n'a été relevé ; il reste marqué « non validé par le contrôle ».
 */
export function artworkChoosable(meta: any): boolean {
  return !!meta?.artwork && meta.gate?.verdict !== "RETRY" && !(meta.gate?.codes ?? []).some((c: string) => ARTWORK_NEVER.includes(c));
}

/** Proposition Logo V2 d'un projet (FINAL, ou version du studio sans relecture IA, ou logo complet choisissable), sinon erreur. */
function proposalOf(projectId: string, assetId: string, opts: { byClient?: boolean } = {}) {
  const a = getAsset(assetId);
  const meta = a ? json<any>(a.meta as any, {}) : null;
  if (!a || a.project_id !== projectId || meta?.engine !== "logo-v2") throw new UserFacingError(L("Proposition introuvable.", "Proposal not found."));
  const verdict = meta.gate?.verdict;
  if (verdict !== "FINAL" && verdict !== "PROVISIONAL" && !(opts.byClient && artworkChoosable(meta))) throw new UserFacingError(L("Cette proposition n'a pas passé le contrôle qualité : elle ne peut pas devenir le logo.", "This proposal did not pass the quality check: it can't become the logo."));
  return { meta, verdict: (verdict === "FINAL" || verdict === "PROVISIONAL" ? verdict : "CLIENT") as "FINAL" | "PROVISIONAL" | "CLIENT" };
}

/** Pixels sombres (encre) passés en blanc, couleurs gardées : version fidèle pour fonds sombres. */
async function onDark(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    if (lum < 0.38) data[i] = data[i + 1] = data[i + 2] = 255;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Silhouette d'une seule couleur (noir seul, blanc seul) : mêmes formes, transparence gardée. */
async function silhouette(png: Buffer, hex: string): Promise<Buffer> {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) (data[i] = r), (data[i + 1] = g), (data[i + 2] = b);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/**
 * Application d'un LOGO COMPLET (image de l'IA) : l'original devient le logo principal ; déclinaisons fidèles
 * (fond sombre, noir seul, blanc seul), version simplifiée construite par le studio pour les petites tailles
 * (favicon, tampon, broderie), version SVG seulement si elle est fidèle, typographie des titres, boutique mise à
 * jour, planche d'identité ; charte seulement pour un logo non provisoire.
 */
async function applyArtwork(ctx: JobContext | null, projectId: string, assetId: string, meta: any, opts: { provisional: boolean; png?: Buffer }) {
  const p = loadProject(projectId);
  const t: Territory = { ...meta.territory, style: meta.territory.style ?? defaultStyle(meta.territory) };
  const spec: LogoSpec = meta.spec;
  const png = opts.png ?? assetData(getAsset(assetId)!);
  ctx?.progress(0.3, L("Déclinaisons fidèles du logo", "Faithful logo variations"));
  const cur = loadProject(projectId).brand!;
  const handle = shopifyHandle(spec.family, spec.weight);
  if (handle && !(cur.validated ?? []).includes("fonts")) saveBrand(projectId, { ...cur, fonts: { ...cur.fonts, heading: handle } });
  const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, meta: { engine: "logo-v2", artwork: true, territory: t.id, proposal: assetId } };
  const main = await saveAsset({ ...base, data: png, name: C("logo-principal.png", "logo-main.png"), mime: "image/png", role: "logo", sourceAssetId: assetId, status: "approved" });
  const lightPng = await onDark(png);
  const light = await saveAsset({ ...base, data: lightPng, name: C("logo-fond-sombre.png", "logo-dark-background.png"), mime: "image/png", role: "logo-light", sourceAssetId: main.id });
  const monoPng = await silhouette(png, "#111111");
  await saveAsset({ ...base, data: monoPng, name: C("logo-noir.png", "logo-black.png"), mime: "image/png", role: "logo-mono", sourceAssetId: main.id });
  await saveAsset({ ...base, data: await silhouette(png, "#FFFFFF"), name: C("logo-blanc.png", "logo-white.png"), mime: "image/png", role: "logo-white", sourceAssetId: main.id });
  // Symbole seul, découpé dans le logo original (favicon, avatar, tampon) ; à défaut (logotype seul), version
  // simplifiée construite par le studio aux couleurs du logo, vectorielle.
  const symbol = await artworkSymbol(png, meta.artwork?.textBox ?? null);
  let markPng: Buffer;
  let mark;
  if (symbol) {
    markPng = await symbolFavicon(symbol);
    mark = await saveAsset({ ...base, data: symbol, name: C("symbole-seul.png", "symbol-only.png"), mime: "image/png", role: "logo-mark", sourceAssetId: main.id, meta: { ...base.meta, symbolFromArtwork: true } });
    const symbolSvg = await faithfulSvg(symbol);
    if (symbolSvg.ok) await saveAsset({ ...base, data: Buffer.from(symbolSvg.svg), name: C("symbole-seul.svg", "symbol-only.svg"), mime: "image/svg+xml", kind: "logo", role: "logo-mark-svg", sourceAssetId: main.id, meta: { ...base.meta, fidelity: Math.round(symbolSvg.fidelity * 1000) / 1000 } });
  } else {
    const simple = await logoSet({ ...spec, tagline: undefined });
    markPng = simple.faviconPng;
    mark = await saveAsset({ ...base, data: simple.monoPng, name: C("version-simplifiee.png", "simplified-version.png"), mime: "image/png", role: "logo-mark", sourceAssetId: main.id, meta: { ...base.meta, simplified: true } });
    await saveAsset({ ...base, data: Buffer.from(simple.monoSvg), name: C("version-simplifiee.svg", "simplified-version.svg"), mime: "image/svg+xml", kind: "logo", role: "logo-mark-svg", sourceAssetId: main.id });
  }
  const fav = await saveAsset({ ...base, data: markPng, name: "favicon.png", mime: "image/png", role: "favicon", sourceAssetId: main.id });
  // Exports WebP (site, réseaux sociaux) : mêmes images, sans perte de qualité visible.
  const webp = (img: Buffer) => sharp(img).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  await saveAsset({ ...base, data: await webp(png), name: C("logo-principal.webp", "logo-main.webp"), mime: "image/webp", role: "logo-webp", sourceAssetId: main.id });
  await saveAsset({ ...base, data: await webp(lightPng), name: C("logo-fond-sombre.webp", "logo-dark-background.webp"), mime: "image/webp", role: "logo-light-webp", sourceAssetId: main.id });
  if (symbol) await saveAsset({ ...base, data: await webp(symbol), name: C("symbole-seul.webp", "symbol-only.webp"), mime: "image/webp", role: "logo-mark-webp", sourceAssetId: mark.id });
  // SVG du logo complet : seulement fidèle (sinon le PNG haute définition reste le livrable, sans version simplifiée imposée).
  const svg = await faithfulSvg(png);
  if (svg.ok) await saveAsset({ ...base, data: Buffer.from(svg.svg), name: C("logo-principal.svg", "logo-main.svg"), mime: "image/svg+xml", kind: "logo", role: "logo-svg", sourceAssetId: main.id, meta: { ...base.meta, fidelity: Math.round(svg.fidelity * 1000) / 1000 } });
  const svgNote = svg.ok ? L(`Version vectorielle fidèle disponible (${Math.round(svg.fidelity * 100)} %).`, `Faithful vector version available (${Math.round(svg.fidelity * 100)}%).`) : L(`Pas de version vectorielle : ${svg.reason}.`, `No vector version: ${svg.reason}.`);
  // Couleurs de la marque = couleurs mesurées dans le logo (sauf palette validée par le client).
  const after = loadProject(projectId).brand!;
  const inks = await artworkInks(png);
  const fromLogo = isLocked(after, "palette") ? null : paletteFromInks(inks);
  saveBrand(projectId, { ...after, ...(fromLogo ? { palette: fromLogo } : {}), logo: { ...after.logo, assetId: main.id, markAssetId: mark.id, concept: `${t.name} — ${t.concept}`, status: "proposed", proposal: KEY[t.markType], proposalId: assetId, route: undefined, provisional: opts.provisional, engine: "v2" } });
  markBrandLogo(projectId, main.id);
  const { swapThemeLogos } = await import("../engine/identity");
  const fresh = loadProject(projectId).brand!;
  swapThemeLogos(projectId, { logo: main.id, light: light.id, favicon: fav.id }, isLocked(fresh, "fonts") ? null : { heading: fresh.fonts.heading, body: fresh.fonts.body }, fromLogo);
  // Planche d'identité : logo original, déclinaisons, couleurs exactes, typographies, applications.
  ctx?.progress(0.7, L("Planche d'identité de marque", "Brand identity board"));
  const board = await brandBoard({
    name: fresh.name,
    logo: png,
    light: lightPng,
    mono: monoPng,
    mark: markPng,
    palette: fresh.palette as unknown as Record<string, string>,
    fonts: { heading: canvasFamily(fresh.fonts.heading), body: canvasFamily(fresh.fonts.body), headingWeight: spec.weight },
    styleLabel: L(STYLE_LABEL[t.style][0], STYLE_LABEL[t.style][1]),
    svgNote,
    markIsSymbol: !!symbol,
  });
  await saveAsset({ ...base, data: board, name: C("planche-identite.png", "identity-board.png"), mime: "image/png", role: "brand-board", sourceAssetId: main.id });
  if (opts.provisional) return { main, svg: svg.ok };
  ctx?.progress(0.9, L("Charte de marque", "Brand guidelines"));
  const { saveBrandBook, saveBrandGuide } = await import("../engine/brand");
  await saveBrandGuide(projectId).catch((e) => console.error(`[charte] ${projectId} : ${(e as Error).message}`));
  await saveBrandBook(projectId).catch((e) => console.error(`[charte] ${projectId} : ${(e as Error).message}`));
  return { main, svg: svg.ok };
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
  const { meta, verdict } = proposalOf(projectId, assetId, { byClient: true });
  const t: Territory = meta.territory;
  // 1. Décision du client (Project Brain) — avant tout le reste.
  recordBrandDecision(projectId, "logo", `${t.name} — ${t.concept.slice(0, 160)} (${assetId})${verdict === "PROVISIONAL" ? " [version du studio choisie par le client]" : verdict === "CLIENT" ? " [logo complet non validé par le contrôle, choisi par le client]" : ""}`);
  // 2. Logo principal, déclinaisons, charte et planches.
  const applied = meta.artwork ? await applyArtwork(ctx, projectId, assetId, meta, { provisional: false }) : await applyProposal(ctx, projectId, assetId, meta, { provisional: false });
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
  if (meta.artwork) await applyArtwork(ctx, projectId, best.assetId!, meta, { provisional: verdict !== "FINAL" });
  else await applyProposal(ctx, projectId, best.assetId!, meta, { provisional: verdict !== "FINAL" });
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
  if (meta.artwork) return reapplyArtwork(ctx, projectId, a!.id, meta);
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

/**
 * Logo complet appliqué et nom de marque modifié : le nom est RÉÉCRIT par le studio dans la zone relevée par la
 * relecture (l'illustration n'est pas redessinée, aucune image payée), à partir de l'image originale. Les couleurs
 * dessinées par l'IA ne sont pas recolorées. Sans zone connue : false (le logo garde son nom, le client est prévenu).
 */
async function reapplyArtwork(ctx: JobContext | null, projectId: string, assetId: string, meta: any): Promise<boolean> {
  const p = loadProject(projectId);
  const b = p.brand!;
  const expected = meta.artwork?.expected?.name;
  if (!expected || expected === b.name) return true;
  const box = meta.artwork?.textBox;
  if (!box) return false;
  const original = getAsset(assetId)!;
  const t: Territory = { ...meta.territory, style: meta.territory.style ?? defaultStyle(meta.territory) };
  const fixed = await correctArtworkText(assetData(original), box, t, { ...brandDiscovery(p), name: b.name });
  if (!fixed) return false;
  const next = await saveAsset({ projectId, userId: p.userId, data: fixed, name: original.name ?? C("logo-v2.png", "logo-v2.png"), mime: "image/png", role: original.role ?? "logo-v2", folderKey: "brand.logos", origin: "generated", status: "review", sourceAssetId: original.id, meta: { ...meta, spec: { ...meta.spec, name: b.name }, artwork: { ...meta.artwork, expected: { ...meta.artwork.expected, name: b.name }, textCorrected: true }, change: `nom réécrit par le studio : « ${expected} » → « ${b.name} »` } });
  const wasValidated = b.logo.status === "validated";
  await applyArtwork(ctx, projectId, next.id, json<any>(next.meta as any, {}), { provisional: !wasValidated && !!b.logo.provisional, png: fixed });
  if (wasValidated) {
    const after = loadProject(projectId).brand!;
    saveBrand(projectId, { ...after, logo: { ...after.logo, status: "validated" } });
  }
  return true;
}
