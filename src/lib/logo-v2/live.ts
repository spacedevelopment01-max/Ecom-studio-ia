/**
 * Avancement en direct d'une série de logos (Logo V2), direction par direction : préparation des directions,
 * génération des images, contrôle qualité, résultat — ou échec avec sa raison. Enregistré dans la mémoire du projet
 * (artefact « logo_v2_live », jamais envoyé à l'IA) pour que l'interface l'affiche pendant la tâche, après la tâche
 * et après un rechargement. Une étape qui échoue est écrite avec sa raison, jamais passée sous silence.
 */
import { json, one } from "../db";
import { remember } from "../projects";

export type LiveStage = "prepare" | "images" | "save" | "done" | "failed";
export type LiveDirection = {
  id: string;
  name: string;
  style: string | null;
  /** waiting : pas encore commencée ; drawing : image en cours ; checking : contrôle qualité ; done ; failed. */
  status: "waiting" | "drawing" | "checking" | "done" | "failed";
  verdict?: string | null;
  score?: number | null;
  reason?: string;
  assetId?: string;
  /**
   * Génération par l'IA d'images : demande envoyée, aperçus reçus (flux), image reçue, image sauvegardée (point de
   * reprise de la tâche + original conservé) — une reprise après interruption ne repaie pas une image sauvegardée.
   */
  progress?: { phase: "sent" | "partial" | "received" | "saved"; partials?: number; atMs?: number; streamed?: boolean };
};
export type LiveState = {
  jobId: string;
  startedAt: number;
  updatedAt: number;
  stage: LiveStage;
  /** Modèle d'images des logos complets (null : logos construits avec de vraies polices). */
  art: string | null;
  directions: LiveDirection[];
  /** Erreur qui a interrompu la série (message compréhensible). */
  error?: string;
};

const KEY = "logo_v2_live";

export function readLive(projectId: string): LiveState | null {
  return json<LiveState | null>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = ?", projectId, KEY)?.value, null);
}

/** Suivi d'une série : chaque changement est écrit tout de suite (lecture par l'interface pendant la tâche). */
export function liveTracker(projectId: string, jobId: string) {
  const prev = readLive(projectId);
  // Reprise de la même tâche : l'état déjà écrit est repris (rien n'est perdu ni recompté).
  const state: LiveState = prev && prev.jobId === jobId ? prev : { jobId, startedAt: Date.now(), updatedAt: Date.now(), stage: "prepare", art: null, directions: [] };
  const flush = () => {
    state.updatedAt = Date.now();
    remember(projectId, { kind: "artifact", key: KEY, value: JSON.stringify(state), source: "system" });
  };
  flush();
  return {
    state,
    set(patch: Partial<Omit<LiveState, "jobId" | "directions">>) {
      Object.assign(state, patch);
      flush();
    },
    directions(list: { id: string; name: string; style: string | null }[]) {
      const known = new Map(state.directions.map((d) => [d.id, d] as const));
      state.directions = list.map((d) => known.get(d.id) ?? { ...d, status: "waiting" as const });
      flush();
    },
    dir(id: string, patch: Partial<LiveDirection>) {
      const d = state.directions.find((x) => x.id === id);
      if (d) Object.assign(d, patch);
      flush();
    },
  };
}
export type LiveTracker = ReturnType<typeof liveTracker>;
