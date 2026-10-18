import { FONT_HANDLES } from "../theme/render";
/** Séries de trois identités : droits projet atomiques, indépendants du budget IA. */
import { z } from "zod";
import { all, id, json, now, one, tx } from "../db";
import { HttpError } from "../auth";
import { loadProject, remember } from "../projects";
import { planOfProject, requirePlan } from "../plan-gates";
import { stableHash } from "../brain/hash";
import type { Territory } from "./types";

const text = z.string().trim().min(1).max(1200);
const color = z.string().regex(/^#[a-f0-9]{6}$/i);
export const DirectionIdentitySchema = z.object({
  signature: text,
  palette: z.object({ primary: color, secondary: color, accent: color, light: color, dark: color }),
  colorRoles: z.object({ primary: text, secondary: text, accent: text, light: text, dark: text }),
  fonts: z.object({ heading: text.refine(v => FONT_HANDLES.includes(v), "Police de titres absente du studio"), body: text.refine(v => FONT_HANDLES.includes(v), "Police de texte absente du studio") }),
  tone: z.object({ voice: text, do: z.array(text).min(1).max(6), dont: z.array(text).min(1).max(6) }),
  mood: text, graphicLanguage: text, rules: z.array(text).min(2).max(8), sampleText: text,
});
export type DirectionIdentity = z.infer<typeof DirectionIdentitySchema>;
export type CompleteDirection = { previewId?: string; id: string; logoId: string; label: string; concept: string; identity: DirectionIdentity; territory: Territory; version: number };
export type DirectionSeries = {
  id: string; projectId: string; ordinal: number; name: string; inputHash: string; createdAt: number;
  requestKeys: string[]; status: "partial" | "complete"; attempts: number;
  territories: Territory[]; directions: CompleteDirection[]; selectedId?: string;
};
const KEY = "brand.direction.series.";
export const directionSeries = (pid: string) => all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE ? ORDER BY created_at,rowid", pid, `${KEY}%`).map(r => json<DirectionSeries>(r.value, null!)).filter(Boolean);
export const currentSeries = (pid: string) => directionSeries(pid).at(-1) ?? null;
export function seriesRights(pid: string) {
  const plan = planOfProject(pid), used = directionSeries(pid).length;
  const limit = !plan ? 0 : plan === "creer" ? 1 : plan === "vendre" ? 2 : null;
  return { plan, used, limit, canRenew: limit == null || used < limit, partial: currentSeries(pid)?.status === "partial", directionsPerSeries: 3 };
}
export function writeSeries(s: DirectionSeries) {
  remember(s.projectId, { kind: "artifact", key: `${KEY}${s.id}`, value: JSON.stringify(s), source: "ai" });
}
/** Appelé avant les effets payants, aussi depuis le worker/chat : un rechargement ne crée aucun droit. */
export function reserveDirectionSeries(pid: string, requestKey: string, opts: { renew?: boolean; correction?: string; expectedId?: string | null } = {}) {
  return tx(() => {
    requirePlan(null, pid);
    const rights = seriesRights(pid), series = directionSeries(pid), existing = series.find(s => s.requestKeys.includes(requestKey));
    if (existing) return existing;
    if ("expectedId" in opts && opts.expectedId !== (series.at(-1)?.id ?? null)) throw new HttpError(409, "La série a changé depuis la demande : rechargez, aucun nouveau droit consommé.");
    const p = loadProject(pid), name = p.brand?.name;
    if (!name || !["validated", "provided"].includes(p.brand!.nameStatus)) throw new HttpError(409, "Validez un seul nom avant les trois directions.");
    const inputHash = stableHash("brand-series", { name, strategy: p.strategy, offer: p.product, services: p.services });
    const last = series.at(-1);
    if (last?.status === "partial" && !opts.renew) {
      if (last.inputHash !== inputHash) throw new HttpError(409, "Le brief a changé : demandez explicitement une nouvelle série. Les anciennes propositions restent conservées.");
      if (last.attempts >= 2) throw new HttpError(409, "Limite de reprise de cette série atteinte : aucun appel supplémentaire automatique.");
      if (!opts.correction?.trim() || opts.correction.trim().length < 8) throw new HttpError(409, "Décrivez le problème avant de reprendre les seules directions manquantes.");
      const next = { ...last, attempts: last.attempts + 1, requestKeys: [...last.requestKeys, requestKey] }; writeSeries(next); return next;
    }
    if (last && !opts.renew) throw new HttpError(409, "Les trois directions sont déjà disponibles. Utilisez le renouvellement volontaire pour une nouvelle série.");
    if (!rights.canRenew) throw new HttpError(403, "Le droit de nouvelle série de ce forfait est utilisé. Les choix précédents restent disponibles ; un droit de série ne crée pas de budget IA.");
    const s: DirectionSeries = { id: id(), projectId: pid, ordinal: series.length + 1, name, inputHash, createdAt: now(), requestKeys: [requestKey], status: "partial", attempts: 1, territories: [], directions: [] };
    writeSeries(s); return s;
  });
}
export function updateDirectionSeries(pid: string, sid: string, change: (s: DirectionSeries) => void) {
  return tx(() => {
    const s = directionSeries(pid).find(s => s.id === sid);
    if (!s) throw new HttpError(404, "Série introuvable.");
    change(s);
    s.directions.sort((a, b) => s.territories.findIndex(t => t.id === a.id) - s.territories.findIndex(t => t.id === b.id));
    s.status = s.territories.length === 3 && s.directions.length === 3 && new Set(s.directions.map(d => d.id)).size === 3 && new Set(s.directions.map(d => d.logoId)).size === 3 && s.directions.every(d => DirectionIdentitySchema.safeParse(d.identity).success && s.territories.some(t => t.id === d.id)) ? "complete" : "partial";
    writeSeries(s); return s;
  });
}
export function directionOf(pid: string, logoId: string) {
  for (const s of directionSeries(pid)) {
    const direction = s.directions.find(d => d.logoId === logoId);
    if (direction) return { series: s, direction };
  }
  return null;
}
