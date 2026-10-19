/**
 * Social Quality Gate V2 : contrôles LOCAUX gratuits d'une publication (faits, affirmations à éviter, informations
 * à compléter, médias refusés ou sans droits, conformité au réseau, légende, répétition) et rapport de VARIÉTÉ d'un
 * calendrier (piliers, part promotionnelle, accroches, médias réutilisés). Politique `social_post_v2`.
 *
 * Règles : un défaut bloquant interdit l'approbation et la programmation ; sans relecture IA ni approbation du
 * client, rien n'est FINAL ; une panne de contrôle n'est jamais une validation (le gate renvoie « non contrôlé »).
 */
import type { Project } from "../projects";
import { all, json, one } from "../db";
import { getAsset } from "../library";
import { isAutoUsable } from "../quality/usable";
import { lintClaims, lintHollow } from "../ai/tasks";
import { decide, type GateDecision } from "../quality/gate";
import { fold } from "../seo-v2/lang";
import { platformSpec } from "./platforms";
import { hookSimilarity } from "./memory";
import { brainIssues } from "./brain-check";
import { creativeContract, type Editorial } from "./creative-contract";

export type PostCheck = { blocking: string[]; issues: string[]; codes: string[]; score: number };
const PLACEHOLDER = /\[(À|A) compléter[^\]]*\]|\[To complete[^\]]*\]/i;
const firstLine = (s: string) => fold((s.split("\n").find((l) => l.trim()) ?? "").trim());

type Row = { id: string; project_id: string; network: string; format: string; title: string; caption: string; hashtags: string; media: string; scheduled_at: number | null; plan_id: string | null; status: string; group_id: string | null;brief:string;pillar:string|null;objective:string|null };

export function checkPost(p: Project, postId: string): PostCheck {
  const r = one<Row>("SELECT * FROM posts WHERE id = ?", postId);
  if (!r) return { blocking: ["publication introuvable"], issues: [], codes: ["missing"], score: 0 };
  const blocking: string[] = [];
  const issues: string[] = [];
  const codes = new Set<string>();
  const add = (code: string, text: string, block: boolean) => {
    codes.add(code);
    (block ? blocking : issues).push(text);
  };
  const text = `${r.title}\n${r.caption}`;
  const savedBrief=json<{editorial?:Editorial;headline?:string}>(r.brief??"{}",{});
  const testimonial=savedBrief.editorial?.testimonial;
  const hasAuthorizedReview=testimonial?.verified===true && testimonial.authorized===true && typeof testimonial.source==="string" && !!testimonial.source.trim() && typeof testimonial.quote==="string" && !!testimonial.quote.trim();
  // A supplied review is evidence for that quotation, never for an aggregate rating or a new claim outside it.
  const outsideQuote=hasAuthorizedReview?text.split(testimonial!.quote).join(""):text;
  const inventedReviewOutside=/\b\d+\s+(?:avis|reviews?|clients?)\b|[★☆]|\bétoiles?\b|\bstars?\b|clients?\s+satisfaits?|satisfied customers?|happy customers?/i.test(outsideQuote);
  for (const c of lintClaims(text, p)) {
    const reviewTerm=/^(?:avis|reviews?|★|étoiles?|stars?|clients? satisfaits?|satisfied customers?|happy customers?)$/i.test(c.term);
    if(hasAuthorizedReview && reviewTerm && !inventedReviewOutside)continue;
    add("invented_claim", `affirmation non confirmée : « ${c.term} » (${c.label})`, true);
  }
  for (const a of p.product.claimsToAvoid ?? []) {
    const k = fold(a.replace(/\(.*?\)/g, "").trim());
    if (k.length > 2 && fold(text).includes(k)) add("forbidden_claim", `affirmation à éviter : « ${a} »`, true);
  }
  if (PLACEHOLDER.test(text)) add("incomplete", "information à compléter dans le texte", true);
  // Project Brain : produit retiré du catalogue (plus jamais promu) ou prix modifié depuis la rédaction (à relire).
  const brain = brainIssues(p, (r as Row & { brief?: string }).brief);
  for (const n of brain.removed) add("product_removed", `« ${n} » n'est plus au catalogue : publication à revoir`, true);
  for (const n of brain.priceChanged) add("price_changed", `prix de « ${n} » modifié depuis la rédaction : relisez la publication puis validez-la`, true);
  for (const h of lintHollow(text)) add("hollow_copy", `formule creuse : « ${h.term} »`, false);
  // Médias : du projet, non supprimés, non refusés, avec des droits connus.
  const spec = platformSpec(r.network);
  const media = json<string[]>(r.media, []);
  const assets = media.map((m) => getAsset(m));
  if(savedBrief.editorial)try {
    const current=creativeContract({...r,headline:savedBrief.headline??r.title,editorial:savedBrief.editorial},"organic");
    const wanted=current.slides.length?current.slides.flatMap(s=>s.blocks):current.blocks;
    for(const a of assets){if(!a)continue;const prior=json<any>(a.meta,{}).finalImage?.creative;
      if(prior){const printed=prior.series?prior.series.pages.flatMap((p:any)=>p.blocks):prior.blocks;
        if(JSON.stringify(wanted)!==JSON.stringify(printed)){add("editorial_visual_stale","contenu des blocs modifié : créer une nouvelle version des visuels avant validation",true);break;}}
    }
  } catch(e){add("editorial_evidence_missing",(e as Error).message,true);}
  for (const [i, a] of assets.entries()) {
    if (!a || a.project_id !== r.project_id || a.deleted_at) add("media_missing", `média ${i + 1} introuvable ou supprimé`, true);
    else if (a.status === "rejected" || !isAutoUsable(a)) add("media_rejected", `média ${i + 1} refusé ou non validé (« ${a.name} »)`, true);
    else {
      const stock = json<{ stock?: { license?: string } }>(a.meta, {}).stock;
      if (stock && !stock.license) add("rights_unknown", `média ${i + 1} : licence inconnue`, true);
    }
  }
  if (spec.needsMedia && !media.length) add("media_required", `${spec.label} exige un média`, true);
  const videoFormat = ["video", "reel", "short"].includes(r.format) || (r.format === "pin" && assets[0]?.kind === "video");
  if (["video", "reel", "short"].includes(r.format) && assets.length && assets[0]?.kind !== "video") add("wrong_media", `${spec.label} : ce format attend une vidéo`, true);
  if (videoFormat && assets[0]?.duration && spec.videoSeconds && (assets[0].duration > spec.videoSeconds.max || assets[0].duration < spec.videoSeconds.min)) add("video_duration", `vidéo de ${Math.round(assets[0].duration)} s (${spec.label} : ${spec.videoSeconds.min} à ${spec.videoSeconds.max} s)`, true);
  if (r.format === "carousel" && media.length > spec.carouselMax) add("too_many_media", `${media.length} médias (au plus ${spec.carouselMax})`, true);
  if (r.format === "carousel" && (media.length<2 || new Set(media).size!==media.length || assets.some(a=>a?.kind!=="image"))) add("incomplete_carousel", "un carrousel exige plusieurs images distinctes et ordonnées", true);
  if (r.caption.length > spec.captionMax) add("caption_too_long", `légende de ${r.caption.length} caractères (au plus ${spec.captionMax})`, true);
  const tags = r.hashtags.split(/\s+/).filter(Boolean);
  if (tags.length > spec.hashtags[1]) add("too_many_hashtags", `${tags.length} hashtags (au plus ${spec.hashtags[1]})`, false);
  if (!r.caption.trim() && r.network !== "youtube") add("empty_caption", "légende vide", true);
  // Réseau tout vidéo (TikTok, YouTube) : sans vraie vidéo, la publication ne peut pas partir (jamais d'image
  // transformée en vidéo vide pour contourner le réseau).
  if (spec.formats.every((f) => ["video", "short", "reel"].includes(f)) && !(assets[0]?.kind === "video")) add("no_compatible_format", `${spec.label} : ne peut pas partir sans vraie vidéo (aucun format compatible)`, true);
  // Répétition : même accroche qu'une autre publication du projet dans les 14 jours (ses propres adaptations pour
  // d'autres réseaux — même contenu — ne comptent pas) ; accroche très proche : simple avertissement.
  if (r.scheduled_at) {
    const near = all<{ id: string; caption: string; group_id: string | null }>("SELECT id, caption, group_id FROM posts WHERE project_id = ? AND id != ? AND status != 'cancelled' AND scheduled_at BETWEEN ? AND ?", r.project_id, r.id, r.scheduled_at - 14 * 86_400_000, r.scheduled_at + 14 * 86_400_000).filter((x) => !(r.group_id && x.group_id === r.group_id));
    const mine = firstLine(r.caption);
    if (mine && !PLACEHOLDER.test(mine)) {
      if (near.some((x) => firstLine(x.caption) === mine)) add("duplicate_hook", "même accroche qu'une autre publication proche", true);
      else if (near.some((x) => hookSimilarity(firstLine(x.caption), mine) >= 0.8)) add("similar_hook", "accroche très proche d'une autre publication des 14 jours", false);
    }
  }
  const score = Math.max(0, 10 - blocking.length * 2 - issues.length * 0.5);
  return { blocking, issues, codes: [...codes], score };
}

/** Décision de la barrière : contrôle local seul → PROVISOIRE au mieux (le client valide) ; défaut bloquant → refus. */
export function gatePost(check: PostCheck): GateDecision {
  return decide("social_post_v2", { checker: "local", score: check.score, codes: check.codes, issues: [...check.blocking, ...check.issues] });
}

export type VarietyReport = { posts: number; pillars: Record<string, number>; promoShare: number; uniqueHooks: number; repeatedHooks: string[]; consecutiveSamePillar: number; mediaReuse: number; placeholders: number; warnings: string[] };

/** Variété d'un calendrier : un mois ne doit pas être 90 variantes du même message. */
export function varietyReport(projectId: string, planId?: string | null): VarietyReport {
  const rows = all<{ pillar: string | null; objective: string | null; caption: string; media: string; scheduled_at: number }>(`SELECT pillar, objective, caption, media, scheduled_at FROM posts WHERE project_id = ? AND status != 'cancelled'${planId ? " AND plan_id = ?" : ""} ORDER BY scheduled_at`, ...(planId ? [projectId, planId] : [projectId]));
  const pillars: Record<string, number> = {};
  let consecutive = 0;
  const hooks = new Map<string, number>();
  const media = new Map<string, number>();
  let promo = 0;
  let placeholders = 0;
  rows.forEach((r, i) => {
    const k = r.pillar ?? "—";
    pillars[k] = (pillars[k] ?? 0) + 1;
    if (i && rows[i - 1].pillar === r.pillar && r.pillar) consecutive++;
    if (r.objective === "convert" || r.objective === "sell") promo++;
    const h = firstLine(r.caption);
    if (PLACEHOLDER.test(r.caption)) placeholders++;
    else if (h) hooks.set(h, (hooks.get(h) ?? 0) + 1);
    for (const m of json<string[]>(r.media, [])) media.set(m, (media.get(m) ?? 0) + 1);
  });
  const repeated = [...hooks.entries()].filter(([, n]) => n > 1).map(([h]) => h);
  const promoShare = rows.length ? Math.round((promo / rows.length) * 100) / 100 : 0;
  const warnings: string[] = [];
  if (promoShare > 0.35) warnings.push(`part promotionnelle élevée (${Math.round(promoShare * 100)} %)`);
  if (repeated.length) warnings.push(`${repeated.length} accroche(s) répétée(s)`);
  if (rows.length >= 10 && Object.keys(pillars).length < 3) warnings.push("moins de trois piliers éditoriaux");
  const reuse = [...media.values()].filter((n) => n > 2).length;
  if (reuse) warnings.push(`${reuse} média(s) utilisés plus de deux fois`);
  if (placeholders) warnings.push(`${placeholders} publication(s) à compléter (informations manquantes)`);
  return { posts: rows.length, pillars, promoShare, uniqueHooks: hooks.size, repeatedHooks: repeated, consecutiveSamePillar: consecutive, mediaReuse: reuse, placeholders, warnings };
}
