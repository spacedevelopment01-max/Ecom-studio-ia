"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useApi } from "../ui";
import type { Brand, ProductProfile, ProjectSettings, Strategy } from "@/lib/project-types";

export type JobView = { id: string; type: string; label: string; status: string; progress: number; message: string; error: string | null; result: any; createdAt: number; updatedAt: number; finishedAt: number | null };
export type Overview = {
  project: { id: string; name: string; status: string; platform: string; storeUrl: string | null; createdAt: number; updatedAt: number; sectorLabel: string };
  product: ProductProfile;
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
  ai: { llm: boolean; image: boolean; video: boolean; ugc?: boolean; ugcVoice?: boolean; credits?: boolean };
  credits: { usedPct: number; alert: boolean; paused: boolean; empty?: boolean };
};

const Ctx = createContext<{ id: string; data: Overview | null; reload: () => Promise<void>; error: string | null } | null>(null);

export function ProjectProvider({ id, children }: { id: string; children: ReactNode }) {
  const first = useApi<Overview>(`/api/projects/${id}`, { poll: 3500 });
  return <Ctx.Provider value={{ id, data: first.data, reload: first.reload, error: first.error }}>{children}</Ctx.Provider>;
}

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
