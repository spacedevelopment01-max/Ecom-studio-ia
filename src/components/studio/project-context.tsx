"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useApi } from "../ui";
import type { Brand, BusinessType, ProductProfile, ProjectSettings, ServiceProfile, Strategy } from "@/lib/project-types";

export type JobView = { id: string; type: string; label: string; status: string; progress: number; message: string; error: string | null; result: any; createdAt: number; updatedAt: number; finishedAt: number | null; alive?: boolean; idleMs?: number; estimate?: { ms: number; source: "history" | "default" } | null; startedAt?: number };
export type Overview = {
  /** Forfait du projet (null : découverte, sans abonnement). */
  plan?: string | null;
  project: { id: string; name: string; status: string; platform: string; storeUrl: string | null; createdAt: number; updatedAt: number; sectorLabel: string; business: BusinessType };
  /** Pour un projet de services, `product` décrit l'activité et `services` l'offre. */
  product: ProductProfile;
  business: BusinessType;
  previewSandbox?: string;
  services: ServiceProfile;
  brand: Brand | null;
  strategy: Strategy | null;
  settings: ProjectSettings;
  pipeline: { job: JobView; steps: { id: string; label: string; detail: string; status: string; note?: string; at?: number }[] } | null;
  active: JobView[];
  counts: Record<string, number>;
  posts: Record<string, number>;
  theme: { versionId: string; number: number; direction: string; summary: string; updatedAt: number } | null;
  logoUrl: string | null;
  coverUrl: string | null;
  cutoutUrl: string | null;
  ai: { llm: boolean; image: boolean; video: boolean; ugc?: boolean; ugcVoice?: boolean; credits?: boolean; mode?: "ai" | "local" };
  credits: { usedPct: number; alert: boolean; paused: boolean; empty?: boolean };
  /** Budget IA de ce projet en % (null : découverte, l'IA n'est pas incluse). */
  aiBudget?: { usage: AiBudgetUsage; renewsAt: number } | null;
};

export type AiBudgetUsage = { plan: { used: number }; credits: { used: number } | null; paused: boolean };

const Ctx = createContext<{ id: string; data: Overview | null; reload: () => Promise<void>; error: string | null } | null>(null);

export function ProjectProvider({ id, children }: { id: string; children: ReactNode }) {
  // Rafraîchi toutes les 3,5 s seulement pendant une tâche ; au repos toutes les 15 s (un lancement depuis l'écran
  // recharge aussitôt et repasse en rythme rapide).
  const [busy, setBusy] = useState(true);
  const first = useApi<Overview>(`/api/projects/${id}`, { poll: busy ? 3500 : 15000 });
  useEffect(() => {
    if (first.data) setBusy(first.data.active.length > 0);
  }, [first.data]);
  return <Ctx.Provider value={{ id, data: first.data, reload: first.reload, error: first.error }}>{children}</Ctx.Provider>;
}

/** Projet ouvert, ou null hors d'un projet (pages du compte). */
export const useOptionalProject = () => useContext(Ctx);

export function useProject() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProject hors du projet");
  return v;
}

/** Suivi d'une tâche lancée depuis un espace (rafraîchit le projet à la fin). */
export function useJobWatch() {
  const { data } = useProject();
  return (jobId: string | null | undefined) => (jobId ? data?.active.find((j) => j.id === jobId) ?? null : null);
}
