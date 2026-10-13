/**
 * Affiche de publication (réseaux sociaux, visuels du studio) au niveau d'une agence : la photo pleine page (scène IA,
 * photo libre du métier ou photo du client) et une mise en page typographique soignée — titre en grand, marque en
 * capitales espacées, ligne « Conception • Construction », bouton — avec le MÊME moteur que les publicités
 * (compositions éditoriale, affiche, panneau, cadre ; texte posé sur la zone calme de la photo, lisibilité mesurée).
 * Le document en calques est enregistré : le client modifie ensuite textes, couleurs et placement dans l'éditeur.
 * Aucun appel à l'IA ici (composition locale, gratuite).
 */
import { contactCta } from "../engine/services-text";
import crypto from "node:crypto";
import { all, json } from "../db";
import { assetData, getAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { brandTypo, palette } from "../engine/images";
import { C } from "../i18n-server";
import { saveVersion } from "../ad-doc/store";
import type { AdDocument } from "../ad-doc/types";
import { adArt, treatmentsFor, type AdArt, type AdLayout, type AdVariant, type LogoPlacement, type Treatment } from "./art";
import { artDirection } from "../art-direction";
import { HERO_TEMPLATES, isTemplateLayout, templateById, templatesFor, TEMPLATES } from "./library";
import { composeAd, type ComposeInput, type ComposeMetrics } from "./compose";
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
  /** Atouts confirmés (faits du produit, prestations) listés par les modèles « produit ». */
  features?: string[] | null;
  /** Composition imposée (du moteur, ou « tpl:<id> » de la bibliothèque) ; sinon choisie sans répétition. */
  layout?: string;
  /** Graine de la composition (deux publications d'un même projet ne se ressemblent pas). */
  seed: string;
  /** Couleurs, traitement et logo imposés (la même publicité déclinée dans un autre format). */
  variant?: AdVariant;
};

/** Compositions et traitements des dernières affiches du projet (la plus récente d'abord). */
export function recentPosterLooks(projectId: string, limit = 10): { layout: string; treatment: string | null; logo: string | null; scheme: string | null }[] {
  const rows = all<{ doc_json: string }>("SELECT doc_json FROM ad_documents d WHERE project_id = ? AND doc_key LIKE 'post:%' AND version = (SELECT MAX(version) FROM ad_documents x WHERE x.doc_key = d.doc_key) ORDER BY created_at DESC LIMIT ?", projectId, limit);
  return rows.map((r) => json<{ meta?: { recipe?: { layout?: string; variant?: { treatment?: string; logo?: string; scheme?: string } } } }>(r.doc_json, {})).map((d) => ({ layout: d.meta?.recipe?.layout ?? "", treatment: d.meta?.recipe?.variant?.treatment ?? null, logo: d.meta?.recipe?.variant?.logo ?? null, scheme: d.meta?.recipe?.variant?.scheme ?? null }));
}

/** Famille d'une composition (modèle de la bibliothèque, ou composition du moteur). */
const familyOf = (layout: string) => (isTemplateLayout(layout) ? (templateById(layout.slice(4))?.family ?? "photo") : `engine:${layout}`);

/**
 * Choix anti-répétition parmi TOUTE la bibliothèque (modèles + compositions du moteur) : jamais une composition
 * des dernières affiches du projet, jamais la même famille que la précédente (collage après collage…), et un
 * schéma de couleurs, un traitement de photo et une place du logo différents de la précédente. La graine fait
 * varier l'ordre (deux projets ne suivent pas le même parcours).
 */
/** Traitements qui voilent les couleurs de la photo (bichromie, noir et blanc). */
const VEILS: Treatment[] = ["duotone", "mono"];
/** Modèles « signature » (lot L), d'après les références de publicités produit du propriétaire. */
const SIGNATURE = ["signature-row", "feature-column", "centered-signature"];

export function pickPosterLook(art: AdArt, n: number, recent: { layout: string; treatment: string | null; logo: string | null; scheme?: string | null }[], hasPhoto: boolean, hasProduct = false, productPhoto = false): { layout: string; variant: AdVariant } {
  // Produit détouré sans photo : seulement les affiches « produit héros » (jamais une composition typographique avec
  // le produit posé dans un coin).
  // Photo qui montre le produit (photo du client en situation, mise en scène) : la photo reste entière, en plein
  // cadre ; jamais découpée en cercle, en demi-image ou recadrée sur un détail (modèles « photo » de la bibliothèque).
  const engine = (productPhoto ? [] : hasPhoto ? art.cycle.filter((l) => l !== "typographic" && l !== "band") : hasProduct ? [] : (["typographic"] as AdLayout[])) as string[];
  // Avec une photo, elle remplit le fond : pas de modèle où elle n'occupe qu'une case (collages, modèles typographiques).
  // Avec un produit détouré : les modèles « produit » qui le mettent en scène (les autres l'oublieraient).
  const picked = (hasProduct ? TEMPLATES.filter((t) => t.product && (t.photo !== "required" || hasPhoto) && (hasPhoto || HERO_TEMPLATES.includes(t.id))) : templatesFor(hasPhoto).filter((t) => !t.product && (!t.styles || t.styles.includes(art.style)) && (!hasPhoto || (t.photo === "required" && t.family !== "collage")))).filter((t) => !(productPhoto && (t.coversSubject || t.family !== "photo" || (t.treatments ?? []).every((x) => VEILS.includes(x)) && !!t.treatments?.length)));
  // Aucun modèle « photo » pour ce style de marque : tous les modèles « photo » plein cadre restent possibles.
  const all = picked.length || !productPhoto ? picked : TEMPLATES.filter((t) => t.family === "photo" && t.photo === "required" && !t.product && !t.coversSubject);
  // Direction artistique : seules les familles qui portent la ligne de la marque (s'il en reste assez).
  const da = artDirection(art);
  const inLine = all.filter((t) => da.families.includes(t.family));
  const tpls = (inLine.length >= 6 ? inLine : all).map((t) => `tpl:${t.id}`);
  // Ordre propre à la graine : mélange déterministe, modèles et compositions du moteur entremêlés.
  // Photo du produit en situation : les modèles « signature » (marque espacée, grand titre, atouts, bouton) d'abord.
  const first = (l: string) => (productPhoto && SIGNATURE.includes(l.slice(4)) ? 0 : 1);
  const pool = [...tpls, ...engine].map((l, k) => ({ l, r: (Math.imul(n ^ (k * 2654435761), 2246822519) >>> 0) % 1000 })).sort((a, b) => first(a.l) - first(b.l) || a.r - b.r).map((x) => x.l);
  const avoid = new Set(recent.slice(0, Math.max(0, Math.min(10, pool.length - 2))).map((r) => r.layout));
  const lastFam = recent[0] ? familyOf(recent[0].layout) : null;
  const layout = pool.find((l) => !avoid.has(l) && familyOf(l) !== lastFam) ?? pool.find((l) => !avoid.has(l)) ?? pool.find((l) => l !== recent[0]?.layout) ?? pool[0];
  const rot = <T,>(xs: T[], k: number) => [...xs.slice(k % xs.length), ...xs.slice(0, k % xs.length)];
  const tpl = isTemplateLayout(layout) ? templateById(layout.slice(4)) : null;
  const all_ts: Treatment[] = tpl ? (tpl.treatments ?? ["natural"]) : treatmentsFor(layout as AdLayout, art.style);
  // Photo qui montre le produit : couleurs vraies (jamais un voile bichrome ou noir et blanc qui le masque).
  const ts = productPhoto ? (all_ts.filter((t) => !VEILS.includes(t)).length ? all_ts.filter((t) => !VEILS.includes(t)) : (["natural"] as Treatment[])) : all_ts;
  // Étalonnage signature de la marque dès que la composition le permet (le fil garde une même lumière).
  const sig = da.grades.filter((g) => ts.includes(g) && g !== recent[0]?.treatment);
  const treatment = sig[0] ?? rot(ts, Math.floor(n / 7)).find((t) => t !== recent[0]?.treatment) ?? ts[0];
  const scheme = tpl ? (rot(tpl.schemes, Math.floor(n / 5)).find((x) => x !== recent[0]?.scheme) ?? tpl.schemes[0]) : undefined;
  const logos: LogoPlacement[] = ["column", "corner", "foot"];
  const logo = rot(logos, Math.floor(n / 3)).find((x) => x !== recent[0]?.logo) ?? "column";
  return { layout, variant: { treatment, logo, ...(scheme ? { scheme } : {}) } };
}

/**
 * Atouts listables d'un projet, uniquement confirmés : faits du produit donnés par le client ou lus sur sa source
 * (« Autonomie 30 h »), sinon les prestations d'une entreprise de services. Jamais d'atout supposé par l'IA.
 */
export function confirmedFeatures(p: Project, max = 6): string[] {
  if (p.business === "services") return (p.services?.services ?? []).map((s) => s.name.trim()).filter((s) => s && s.length <= 40).slice(0, max);
  const out: string[] = [];
  for (const f of p.product.facts ?? []) {
    if (f.status !== "confirmed" || !f.value?.trim()) continue;
    const both = `${f.label.trim()} ${f.value.trim()}`.replace(/\s+/g, " ");
    const s = both.length <= 34 ? both : f.value.trim().length <= 34 ? f.value.trim() : null;
    if (s && !out.includes(s)) out.push(s);
  }
  return out.slice(0, max);
}

/** Clé de document d'une affiche (lignée éditable : publication ou visuel). */
export const posterDocKey = (projectId: string, seed: string, aspect: string) => `post:${crypto.createHash("sha256").update(`${projectId}|${seed}|${aspect}`).digest("hex").slice(0, 20)}`;

export async function composePoster(p: Project, i: PosterInput): Promise<{ jpg: Buffer; doc: AdDocument; docKey: string; layout: string; metrics: ComposeMetrics }> {
  const typo = brandTypo(p);
  const art = adArt(p, typo);
  const n = parseInt(crypto.createHash("sha256").update(i.seed).digest("hex").slice(0, 6), 16);
  // Photo d'un produit (packshot, mise en scène, photo d'origine) : le produit est au centre, jamais voilé ni rogné.
  const look = pickPosterLook(art, n, recentPosterLooks(p.id), !!i.background, !!i.product, p.business !== "services" && !!i.background);
  const layout = i.layout ?? look.layout;
  const variant: AdVariant = i.variant ?? (i.layout ? (isTemplateLayout(i.layout) ? {} : { ...look.variant, treatment: treatmentsFor(i.layout as AdLayout, art.style).includes(look.variant.treatment!) ? look.variant.treatment : treatmentsFor(i.layout as AdLayout, art.style)[0] }) : look.variant);
  const { logo, light } = brandLogos(p);
  const cta = (i.cta ?? "").trim() || (p.business === "services" ? contactCta(p.services?.contactMode) : C("Découvrir", "Discover"));
  // Un titre qui n'est que le nom du produit n'accroche pas : la signature de la marque prend sa place (le nom du
  // produit passe dessous) dès que le produit est mis en scène.
  const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const name = p.business === "services" ? "" : p.product.name?.trim() ?? "";
  const tag = p.brand?.tagline?.trim() ?? "";
  const plainTitle = !!i.product && !!tag && !!name && fold(i.headline) === fold(name);
  const r = await composeAd({
    format: posterFormat(i.aspect),
    layout: layout as ComposeInput["layout"],
    palette: palette(p),
    typo,
    art,
    brand: p.brand?.name ?? p.name,
    headline: plainTitle ? tag : i.headline.trim() || p.brand?.tagline || p.brand?.name || p.name,
    subline: i.subline?.trim() || (plainTitle ? name : null),
    eyebrow: i.eyebrow?.trim() || null,
    cta,
    features: i.features ?? null,
    tagline: p.brand?.tagline?.trim() || null,
    productName: p.business === "services" ? null : p.product.name?.trim() || null,
    background: i.background ? assetData(i.background) : null,
    product: i.product ? assetData(i.product) : null,
    logo: logo ? assetData(logo) : null,
    logoLight: light ? assetData(light) : null,
    ids: { background: i.background?.id ?? null, product: i.product?.id ?? null, logo: logo?.id ?? null, logoLight: light?.id ?? null },
    conceptId: null,
    variant,
  });
  return { jpg: r.jpg, doc: r.doc, docKey: posterDocKey(p.id, i.seed, i.aspect), layout: r.doc.meta.recipe?.layout ?? layout, metrics: r.metrics };
}

/** Enregistre le document de l'affiche (version « moteur ») lié à son rendu : modifiable ensuite dans l'éditeur. */
export function savePosterDoc(projectId: string, docKey: string, doc: AdDocument, renderedAssetId: string) {
  return saveVersion(projectId, docKey, doc, { note: "affiche de publication", renderedAssetId });
}
