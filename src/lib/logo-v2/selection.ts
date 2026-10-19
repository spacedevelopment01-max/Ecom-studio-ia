/** Choisir une proposition ne remplace pas l'identité active. La validation est une action distincte. */
import { one, json, now, tx } from "../db";
import { loadProject, remember } from "../projects";
import { requirePlan } from "../plan-gates";
import { HttpError } from "../auth";
import { stableHash } from "../brain/hash";
import { directionOf, directionNamingBrand } from "./direction-series";

const KEY = "brand.direction.pending";
export type DirectionSelection = { seriesId: string; directionId: string; logoId: string; selectedAt: number; brandHash: string; status: "selected" | "applied"; appliedAt?: number };
export const directionBrandHash = (pid: string) => stableHash("direction-active", loadProject(pid).brand);
export const pendingDirection = (pid: string) => json<DirectionSelection | null>(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key=?", pid, KEY)?.value, null);
export function selectCompleteDirection(pid: string, logoId: string) {
  return tx(() => {
    requirePlan(null, pid);
    const candidate = directionOf(pid, logoId);
    if (!candidate || candidate.series.status !== "complete") throw new HttpError(409, "Série incomplète : choisissez une direction complète disponible.");
    if (candidate.series.name !== directionNamingBrand(pid)?.name) throw new HttpError(409, "Le nom a changé : cette ancienne proposition reste conservée, mais ne peut pas être sélectionnée.");
    const selection: DirectionSelection = { seriesId: candidate.series.id, directionId: candidate.direction.id, logoId, selectedAt: now(), brandHash: directionBrandHash(pid), status: "selected" };
    remember(pid, { kind: "artifact", key: KEY, value: JSON.stringify(selection), source: "user" });
    return selection;
  });
}
export function assertSelectedDirection(pid: string, logoId: string) {
  const selection = pendingDirection(pid);
  if (!selection || selection.status !== "selected" || selection.logoId !== logoId) throw new HttpError(409, "Choisissez cette direction avant de valider son identité complète.");
  if (selection.brandHash !== directionBrandHash(pid)) throw new HttpError(409, "Votre identité a été modifiée depuis le choix. Vos retouches sont conservées : resélectionnez la proposition avant validation.");
  return selection;
}
export function completeDirectionSelection(pid: string, logoId: string) {
  const s = pendingDirection(pid);
  if (s?.logoId === logoId) remember(pid, { kind: "artifact", key: KEY, value: JSON.stringify({ ...s, status: "applied", appliedAt: now() }), source: "user" });
}
