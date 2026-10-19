import { FONT_HANDLES } from "../theme/render";
/** Séries de trois identités : droits projet atomiques, indépendants du budget IA. */
import { z } from "zod";
import { all, id, json, now, one, tx } from "../db";
import { HttpError } from "../auth";
import { loadProject, remember } from "../projects";
import { planOfProject, requirePlan } from "../plan-gates";
import { stableHash } from "../brain/hash";
import type { Territory } from "./types";
import { directionPaletteIssues, directionSeriesPaletteIssues } from "./direction-palette";
import { stateOf, inputHash, requireUpstream } from "../preparation/store";

const text = z.string().trim().min(1).max(1200);
const color = z.string().regex(/^#[a-f0-9]{6}$/i);
export const DirectionIdentitySchema = z.object({
  signature: text,
  palette: z.object({ primary: color, secondary: color, accent: color, light: color, dark: color }).superRefine((p, ctx) => {
    for (const message of directionPaletteIssues(p)) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  }),
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
  territories: Territory[]; directions: CompleteDirection[]; selectedId?: string; paletteIssues?: string[]; integrityIssues?: string[];
};
const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Garde-fous de structure AVANT de payer les dessins ; la qualité artistique reste à relire. */
export function directionSetIssues(territories: readonly Territory[]): string[] {
  const issues: string[] = [];
  for (const [i, a] of territories.entries()) for (const b of territories.slice(i + 1)) {
    const axes = (t: Territory) => [t.markType, t.composition, t.typography?.style, t.construction, t.sobriety <= 2 ? "sobre" : t.sobriety >= 4 ? "expressif" : "mesuré", t.style];
    if (axes(a).filter((v, k) => v !== axes(b)[k]).length < 3) issues.push(`Directions ${a.id}/${b.id} : compositions insuffisamment distinctes.`);
    if (!a.identity || !b.identity) { issues.push("Ensemble d’identité incomplet."); continue; }
    const fields = ["signature", "mood", "graphicLanguage"] as const;
    const different = fields.filter(k => normalized(a.identity![k] ?? "") !== normalized(b.identity![k] ?? "")).length + (normalized(a.identity.tone?.voice ?? "") !== normalized(b.identity.tone?.voice ?? "") ? 1 : 0) + (JSON.stringify(a.identity.fonts) !== JSON.stringify(b.identity.fonts) ? 1 : 0);
    if (different < 2) issues.push(`Directions ${a.id}/${b.id} : changer les couleurs ne crée pas deux identités complètes distinctes.`);
  }
  return issues;
}
/** La palette ne suffit pas : vérifie aussi le kit entier et les axes de composition. */
export function directionSeriesIssues(s: DirectionSeries): string[] {
  const issues: string[] = [];
  if (s.territories.length !== 3 || s.directions.length !== 3 || new Set(s.territories.map(t => t.id)).size !== 3 || new Set(s.directions.map(d => d.id)).size !== 3 || new Set(s.directions.map(d => d.logoId)).size !== 3) issues.push("Trois directions et trois dessins distincts sont nécessaires.");
  for (const d of s.directions) {
    if (!DirectionIdentitySchema.safeParse(d.identity).success || !s.territories.some(t => t.id === d.id)) issues.push(`Direction ${d.id} : identité ou territoire incomplet.`);
    const a = one<{ status: string; meta: string; project_id: string; deleted_at: number | null }>("SELECT status,meta,project_id,deleted_at FROM assets WHERE id=?", d.logoId);
    if (!a || a.project_id !== s.projectId || a.deleted_at || a.status === "rejected" || json<any>(a.meta, {}).gate?.verdict !== "FINAL") issues.push(`Direction ${d.id} : dessin final absent ou refusé.`);
  }
  if (s.directions.some(d => !d.territory)) issues.push("Territoire complet manquant.");
  else issues.push(...directionSetIssues(s.directions.map(d => ({ ...d.territory, identity: d.identity }))));
  return issues;
}
const KEY = "brand.direction.series.";
export const directionSeries = (pid: string) => all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key LIKE ? ORDER BY created_at,rowid", pid, `${KEY}%`).map(r => json<DirectionSeries>(r.value, null!)).filter(Boolean).map(s => {
  // Relecture des séries historiques sans écraser leurs fichiers ni la marque déjà choisie.
  const paletteIssues = s.directions.every(d => ["primary", "secondary", "accent", "light", "dark"].every(role => /^#[a-f0-9]{6}$/i.test((d.identity?.palette as Record<string,string> | undefined)?.[role] ?? ""))) ? directionSeriesPaletteIssues(s.directions.map(d => d.identity)) : ["Palette incomplète."];
  const integrityIssues = directionSeriesIssues(s);
  return { ...s, paletteIssues, integrityIssues, status: s.status === "complete" && (paletteIssues.length || integrityIssues.length) ? "partial" as const : s.status };
});
export const currentSeries = (pid: string) => directionSeries(pid).at(-1) ?? null;
/** Nom proposé/confirmé dans le parcours, sans remplacer une identité déjà active. */
export function directionNamingBrand(pid: string) {
  const s = stateOf(pid), b = s?.stages.brand;
  if (s && b) {
    requireUpstream(s, "brand");
    if (!b.data.identityConfirmed) throw new HttpError(409, "Confirmez le nom proposé avant la série ; l’identité active reste conservée.");
    if (b.inputHash !== inputHash(s, "brand")) throw new HttpError(409, "La stratégie a changé : confirmez le nom de la nouvelle série avant de continuer.");
    return b.data.proposal;
  }
  return loadProject(pid).brand;
}
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
    const p = loadProject(pid), naming = directionNamingBrand(pid), name = naming?.name;
    if (!name || !["validated", "provided"].includes(naming!.nameStatus)) throw new HttpError(409, "Validez un seul nom avant les trois directions.");
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
    s.paletteIssues = s.directions.every(d => ["primary", "secondary", "accent", "light", "dark"].every(role => /^#[a-f0-9]{6}$/i.test((d.identity?.palette as Record<string,string> | undefined)?.[role] ?? ""))) ? directionSeriesPaletteIssues(s.directions.map(d => d.identity)) : ["Palette incomplète."];
    s.integrityIssues = directionSeriesIssues(s);
    s.status = !s.paletteIssues.length && !s.integrityIssues.length ? "complete" : "partial";
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
