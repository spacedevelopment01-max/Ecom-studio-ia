/**
 * Affiche de publication (réseaux sociaux, visuels du studio) au niveau d'une agence : la photo pleine page (scène IA,
 * photo libre du métier ou photo du client) et une mise en page typographique soignée — titre en grand, marque en
 * capitales espacées, ligne « Conception • Construction », bouton — avec le MÊME moteur que les publicités
 * (compositions éditoriale, affiche, panneau, cadre ; texte posé sur la zone calme de la photo, lisibilité mesurée).
 * Le document en calques est enregistré : le client modifie ensuite textes, couleurs et placement dans l'éditeur.
 * Aucun appel à l'IA ici (composition locale, gratuite).
 */
import crypto from "node:crypto";
import { all, json } from "../db";
import { assetData, getAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { brandTypo, palette } from "../engine/images";
import { C } from "../i18n-server";
import { saveVersion } from "../ad-doc/store";
import type { AdDocument } from "../ad-doc/types";
import { adArt, treatmentsFor, type AdArt, type AdLayout, type AdVariant, type LogoPlacement, type Treatment } from "./art";
import { composeAd, type ComposeMetrics } from "./compose";
import type { FormatSpec } from "./types";

export type PosterAspect = "1:1" | "4:5" | "9:16" | "2:3" | "16:9" | "1.91:1" | "2:1";

const SIZES: Record<PosterAspect, { width: number; height: number; safe: FormatSpec["safe"] }> = {
  "1:1": { width: 1080, height: 1080, safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
  "4:5": { width: 1080, height: 1350, safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
  "9:16": { width: 1080, height: 1920, safe: { top: 0.14, bottom: 0.2, side: 0.06 } },
  "2:3": { width: 1000, height: 1500, safe: { top: 0.05, bottom: 0.1, side: 0.06 } },
  "16:9": { width: 1600, height: 900, safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
  "1.91:1": { width: 1200, height: 628, safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
  "2:1": { width: 1600, height: 800, safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
};

export function posterFormat(aspect: PosterAspect): FormatSpec {
  const s = SIZES[aspect] ?? SIZES["4:5"];
  return { platform: aspect === "9:16" ? "meta_story" : "meta_feed", aspect: aspect as FormatSpec["aspect"], width: s.width, height: s.height, label: aspect, safe: s.safe };
}

function brandLogos(p: Project): { logo: Asset | null; light: Asset | null } {
  const id = p.brand?.logo?.assetId;
  const a = id ? getAsset(id) : undefined;
  const logo = a && !a.deleted_at && /png/.test(a.mime) ? a : null;
  const light = id ? (all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-light' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", p.id, id)[0] ?? null) : null;
  return { logo, light: light && /png/.test(light.mime) ? light : null };
}

export type PosterInput = {
  aspect: PosterAspect;
  headline: string;
  subline?: string | null;
  eyebrow?: string | null;
  cta?: string | null;
  /** Photo de fond (scène, photo du métier, photo du client). Sans photo : composition typographique à la marque. */
  background?: Asset | null;
  /** Produit détouré (pixels d'origine), posé dans la scène quand la photo ne le montre pas. */
  product?: Asset | null;
  layout?: AdLayout;
  /** Graine de la composition (deux publications d'un même projet ne se ressemblent pas). */
  seed: string;
};

/** Compositions et traitements des dernières affiches du projet (la plus récente d'abord). */
export function recentPosterLooks(projectId: string, limit = 6): { layout: string; treatment: string | null; logo: string | null }[] {
  const rows = all<{ doc_json: string }>("SELECT doc_json FROM ad_documents d WHERE project_id = ? AND doc_key LIKE 'post:%' AND version = (SELECT MAX(version) FROM ad_documents x WHERE x.doc_key = d.doc_key) ORDER BY created_at DESC LIMIT ?", projectId, limit);
  return rows.map((r) => json<{ meta?: { recipe?: { layout?: string; variant?: { treatment?: string; logo?: string } } } }>(r.doc_json, {})).map((d) => ({ layout: d.meta?.recipe?.layout ?? "", treatment: d.meta?.recipe?.variant?.treatment ?? null, logo: d.meta?.recipe?.variant?.logo ?? null }));
}

/**
 * Choix anti-répétition : la composition, le traitement de la photo et la place du logo d'une nouvelle affiche ne
 * reprennent pas ceux des affiches précédentes du projet (composition : aucune des dernières ; traitement et logo :
 * différents de la précédente). La graine fait varier le point de départ (deux projets ne suivent pas le même ordre).
 */
export function pickPosterLook(art: AdArt, n: number, recent: { layout: string; treatment: string | null; logo: string | null }[], hasPhoto: boolean): { layout: AdLayout; variant: AdVariant } {
  const cycle = hasPhoto ? art.cycle.filter((l) => l !== "typographic" && l !== "band") : (["typographic"] as AdLayout[]);
  const start = n % Math.max(1, cycle.length);
  const order = [...cycle.slice(start), ...cycle.slice(0, start)];
  const avoid = new Set(recent.slice(0, Math.max(0, cycle.length - 2)).map((r) => r.layout));
  const layout = order.find((l) => !avoid.has(l)) ?? order.find((l) => l !== recent[0]?.layout) ?? order[0];
  const ts = treatmentsFor(layout, art.style);
  const lastT = recent[0]?.treatment;
  const tStart = Math.floor(n / 7) % ts.length;
  const treatment: Treatment = [...ts.slice(tStart), ...ts.slice(0, tStart)].find((t) => t !== lastT) ?? ts[0];
  const logos: LogoPlacement[] = ["column", "corner", "foot"];
  const logo = [...logos.slice(Math.floor(n / 3) % 3), ...logos.slice(0, Math.floor(n / 3) % 3)].find((x) => x !== recent[0]?.logo) ?? "column";
  return { layout, variant: { treatment, logo } };
}

/** Clé de document d'une affiche (lignée éditable : publication ou visuel). */
export const posterDocKey = (projectId: string, seed: string, aspect: string) => `post:${crypto.createHash("sha256").update(`${projectId}|${seed}|${aspect}`).digest("hex").slice(0, 20)}`;

export async function composePoster(p: Project, i: PosterInput): Promise<{ jpg: Buffer; doc: AdDocument; docKey: string; layout: AdLayout; metrics: ComposeMetrics }> {
  const typo = brandTypo(p);
  const art = adArt(p, typo);
  const n = parseInt(crypto.createHash("sha256").update(i.seed).digest("hex").slice(0, 6), 16);
  const look = pickPosterLook(art, n, recentPosterLooks(p.id), !!i.background);
  const layout = i.layout ?? look.layout;
  const variant: AdVariant = i.layout ? { ...look.variant, treatment: treatmentsFor(i.layout, art.style).includes(look.variant.treatment!) ? look.variant.treatment : treatmentsFor(i.layout, art.style)[0] } : look.variant;
  const { logo, light } = brandLogos(p);
  const cta = (i.cta ?? "").trim() || (p.business === "services" ? C("Prendre rendez-vous", "Book now") : C("Découvrir", "Discover"));
  const r = await composeAd({
    format: posterFormat(i.aspect),
    layout,
    palette: palette(p),
    typo,
    art,
    brand: p.brand?.name ?? p.name,
    headline: i.headline.trim() || p.brand?.tagline || p.brand?.name || p.name,
    subline: i.subline?.trim() || null,
    eyebrow: i.eyebrow?.trim() || null,
    cta,
    background: i.background ? assetData(i.background) : null,
    product: i.product ? assetData(i.product) : null,
    logo: logo ? assetData(logo) : null,
    logoLight: light ? assetData(light) : null,
    ids: { background: i.background?.id ?? null, product: i.product?.id ?? null, logo: logo?.id ?? null, logoLight: light?.id ?? null },
    conceptId: null,
    variant,
  });
  return { jpg: r.jpg, doc: r.doc, docKey: posterDocKey(p.id, i.seed, i.aspect), layout: ((r.doc.meta.recipe?.layout as AdLayout | undefined) ?? layout), metrics: r.metrics };
}

/** Enregistre le document de l'affiche (version « moteur ») lié à son rendu : modifiable ensuite dans l'éditeur. */
export function savePosterDoc(projectId: string, docKey: string, doc: AdDocument, renderedAssetId: string) {
  return saveVersion(projectId, docKey, doc, { note: "affiche de publication", renderedAssetId });
}
