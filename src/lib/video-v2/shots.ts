/**
 * Planification des plans : pour chaque plan, le procédé le plus sobre qui suffit.
 *
 *  1. vidéo réelle de la bibliothèque (gratuite, la plus crédible) ;
 *  2. packshot ou composition locale avec le produit RÉEL (aux pixels d'origine : fidélité garantie) ;
 *  3. photo réelle animée (mouvement de caméra au montage) ;
 *  4. typographie animée, animation d'interface (logiciel) ;
 *  5. génération vidéo IA (Router V2) seulement si elle apporte ce que rien d'autre ne donne (geste, mouvement réel,
 *     personnage), si la demande n'est pas « simple », si le client l'autorise et si le budget le permet ;
 *  6. image de l'Image Engine V2 (recherche ou génération) pour un plan sans aucun visuel.
 */
import type { CreativeStrategy, ShotPlan, Shot, VideoIntent } from "./types";
import type { Inventory } from "./storyboard";
import { chooseProvider, type ProviderChoice, type ShotNeed } from "./providers";

export type PlanContext = {
  intent: VideoIntent;
  strategy: CreativeStrategy;
  inv: Inventory;
  allowGeneration: boolean;
  /** Fournisseur vidéo pour un besoin donné (Router V2) ; null : aucun compatible. */
  provider: (need: ShotNeed) => ProviderChoice | null;
  /** Budget restant pour la génération (EUR micro). */
  budgetMicro: number;
};

export type ShotPlanning = { shots: ShotPlan[]; estimateMicro: number; skippedForBudget: number; notes: string[] };

/** Plans qui gagnent vraiment à être tournés (mouvement réel, geste, personnage) — les autres se montent. */
function benefitsFromMotion(s: Shot, ctx: PlanContext): boolean {
  if (s.character) return true;
  if (s.part === "cta" || s.part === "proof" || s.part === "conclusion") return false;
  if (ctx.strategy.style.language === "digital_explainer") return false; // interface : animation locale
  return s.part === "demonstration" || (s.part === "hook" && ctx.intent.complexity === "production");
}

export function planShots(storyboard: Shot[], ctx: PlanContext): ShotPlanning {
  const notes: string[] = [];
  let estimate = 0;
  let skipped = 0;
  const videos = [...ctx.inv.videos];
  const photoIds = new Set(ctx.inv.photos.map((p) => p.id));
  const shots = storyboard.map((s): ShotPlan => {
    // Carte de fin, preuve, signature : compositions locales (calques de l'éditeur, modifiables).
    if (s.part === "cta") return { ...s, method: "local_composition", source: { kind: "compose" }, why: "carte de fin composée (logo, CTA) : modifiable, gratuite" };
    if (s.part === "proof") return { ...s, method: "kinetic_type", source: { kind: "compose" }, why: "fait confirmé en typographie animée" };
    if (s.part === "conclusion" && ctx.inv.cutout) return { ...s, method: "packshot", source: { kind: "compose", assetId: ctx.inv.cutout.id }, why: "packshot du produit réel (pixels d'origine)" };
    if (ctx.strategy.style.language === "digital_explainer" && (s.framing === "screen" || s.part === "demonstration")) {
      const screen = ctx.inv.screens[0];
      return { ...s, method: "ui_animation", source: screen ? { kind: "asset", assetId: screen.id } : { kind: "compose" }, why: screen ? "capture réelle du logiciel animée" : "animation d'interface locale (aucune capture fournie : [À compléter : captures d'écran du logiciel])" };
    }
    // Vidéo réelle disponible : réutilisée (une fois chacune), sauf plan de personnage.
    if (!s.character && videos.length && (s.part === "demonstration" || s.part === "development" || s.part === "hook")) {
      const v = videos.shift()!;
      return { ...s, method: "existing_video", source: { kind: "asset", assetId: v.id }, why: "vidéo réelle de la bibliothèque" };
    }
    // Génération : seulement quand elle sert, autorisée, pas pour une demande simple, et dans le budget.
    if (ctx.allowGeneration && ctx.intent.complexity !== "simple" && benefitsFromMotion(s, ctx)) {
      const need: ShotNeed = { imageToVideo: true, people: s.character, nativeAudio: s.character && !!s.voice, aspect: ctx.intent.aspect, durationS: s.durationS };
      let choice = ctx.provider(need);
      // Sans son natif disponible, le personnage parle par la voix off et les sous-titres (dit clairement).
      if (!choice && need.nativeAudio) {
        choice = ctx.provider({ ...need, nativeAudio: false });
        if (choice) notes.push(`${s.id} : aucun fournisseur avec son natif vérifié — voix portée par la piste voix et les sous-titres`);
      }
      if (choice && estimate + choice.estimateMicro <= ctx.budgetMicro) {
        estimate += choice.estimateMicro;
        return { ...s, method: s.character ? "avatar" : "ai_video", source: { kind: "generate", assetId: s.reference.assetId, provider: choice.provider, model: choice.model, estimateMicro: choice.estimateMicro }, why: `${s.character ? "personnage synthétique (signalé)" : "mouvement réel utile"} — ${choice.provider}:${choice.model} (${choice.reason}), ${choice.shootS} s tournées` };
      }
      if (choice) {
        skipped++;
        notes.push(`${s.id} : génération écartée (budget restant insuffisant) — montage local à la place`);
      } else notes.push(`${s.id} : aucun fournisseur vidéo compatible et disponible — montage local à la place`);
    }
    if (s.character) {
      // Personnage impossible sans génération : plan d'usage sans personne (jamais un faux client).
      notes.push(`${s.id} : personnage non tourné — plan d'usage sans personne`);
    }
    if (s.showsProduct && ctx.inv.cutout && (s.framing === "close" || s.framing === "extreme_close" || s.part === "hook")) return { ...s, character: false, method: "packshot", source: { kind: "compose", assetId: ctx.inv.cutout.id }, why: "produit réel détouré, mouvement au montage" };
    if (s.reference.assetId && photoIds.has(s.reference.assetId)) return { ...s, character: false, method: "animated_image", source: { kind: "asset", assetId: s.reference.assetId }, why: "photo réelle animée (mouvement de caméra au montage)" };
    if (ctx.inv.cutout && s.showsProduct) return { ...s, character: false, method: "packshot", source: { kind: "compose", assetId: ctx.inv.cutout.id }, why: "produit réel détouré" };
    // Aucun visuel : Image Engine V2 (recherche d'abord, génération selon ses propres règles), puis animation.
    if (ctx.intent.complexity !== "simple") return { ...s, character: false, method: "animated_image", source: { kind: "image_v2" }, why: "image demandée à l'Image Engine V2, animée au montage" };
    return { ...s, character: false, method: "kinetic_type", source: { kind: "compose" }, why: "typographie animée (demande simple, aucun visuel)" };
  });
  return { shots, estimateMicro: estimate, skippedForBudget: skipped, notes };
}

/** Plans à générer (payants) : la seule partie qui coûte, affichée avant toute exécution. */
export const paidShots = (shots: ShotPlan[]) => shots.filter((s) => s.source.kind === "generate");
