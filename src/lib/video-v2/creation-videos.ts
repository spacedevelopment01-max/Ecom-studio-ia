/**
 * Vidéos de la création du projet (option vidéo choisie au lancement) : 2 vidéos de 15 s en 3 scènes, avec la carte
 * de fin (logo, marque) et la musique du studio.
 *  - produit, forfaits Développer (89 €) et Dominer (129 €), IA active : scènes faites par l'IA à partir de la vraie
 *    photo du produit (image Qwen puis mouvement Wan 2.6), dans un plafond de dépense calculé avant ;
 *  - service (tous forfaits) : plans libres de droits du métier, montés par le studio ;
 *  - sinon (forfait Créer, « montage seulement », IA coupée) ou en cas d'échec : montage local, sans génération.
 * Une vidéo par point de reprise et une clé stable par projet : rien n'est refait ni repayé.
 */
import { loadProject, type Project } from "../projects";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { currentTrace, withTrace } from "../ai/trace";
import { subjectOptions } from "../creative-subject";
import { videoDelivery } from "../media/delivery-check";
import { DEFAULT_TOTAL_S, SCENES, runThreeScenes, type SceneAspect, type SceneQuote, type ThreeScenesDeps, type ThreeScenesRequest } from "./three-scenes";

export const CREATION_VIDEOS: { as: "ad" | "post"; aspect: SceneAspect }[] = [
  { as: "ad", aspect: "9:16" }, // publicité pour les réseaux
  { as: "post", aspect: "16:9" }, // vidéo de la boutique ou du site
];

export type CreationVideoMode = "ai" | "stock" | "local";

export function creationVideoMode(p: Project, choice: "ai" | "edited" | "none" | undefined, o: { videosRight: "none" | "short" | "advanced" | null; aiActive: boolean }): CreationVideoMode {
  if (p.business === "services") return "stock";
  if (choice === "edited") return "local";
  return o.aiActive && (o.videosRight === "short" || o.videosRight === "advanced") ? "ai" : "local";
}

export type CreationVideoDeps = {
  scenes: ThreeScenesDeps;
  quote: (p: Project, req: ThreeScenesRequest) => SceneQuote;
  /** Montage local sans génération (repli) pour la vidéo n° k. */
  local: (k: number) => Promise<string | null>;
  /** Déjà dépensé par la tâche (le plafond s'y ajoute). */
  spentByJob: () => number;
};

export const creationVideoKey = (projectId: string, k: number) => `scenes:creation:${projectId}:${k}`;

export async function creationSceneVideos(ctx: JobContext | null, projectId: string, mode: CreationVideoMode, deps: CreationVideoDeps): Promise<string[]> {
  const p = loadProject(projectId);
  const subjects = subjectOptions(p).filter((s) => (mode === "ai" ? s.kind === "product" && !!s.referenceAssetId : true));
  const out: string[] = [];
  for (const [k, slot] of CREATION_VIDEOS.entries()) {
    const one = async (): Promise<string | null> => {
      if (mode === "local") return deps.local(k);
      const s = subjects.length ? subjects[k % subjects.length] : null;
      const req: ThreeScenesRequest = { as: slot.as, aspect: slot.aspect, scenes: SCENES, totalS: DEFAULT_TOTAL_S, mode, subject: s ? (s.kind === "service" ? { kind: "service", name: s.key } : { kind: "product", key: s.key }) : null, key: creationVideoKey(projectId, k) };
      try {
        if (mode === "ai") {
          const q = deps.quote(p, req);
          if (!q.allowed) throw new Error(q.reason ?? "Plans IA indisponibles ; aucun remplacement automatique.");
          // Plafond : jamais plus que le prix maximal de cette vidéo (images + plans), en plus de ce que la tâche a déjà dépensé.
          const cap = deps.spentByJob() + q.estimateMicro;
          const cur = currentTrace().costCapMicro;
          return (await withTrace({ costCapMicro: cur != null ? Math.min(cur, cap) : cap }, () => runThreeScenes(ctx, projectId, req, deps.scenes))).videoAssetId;
        }
        return (await runThreeScenes(ctx, projectId, req, deps.scenes)).videoAssetId;
      } catch (e) {
        if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
        throw new Error(`Vidéo ${k+1} incomplète : ${(e as Error).message}. Les médias obtenus sont conservés.`);
      }
    };
    const id = ctx ? await ctx.step(`creation-video:${k}`, one) : await one();
    await videoDelivery(projectId,id);
    out.push(id!);
  }
  return out;
}
