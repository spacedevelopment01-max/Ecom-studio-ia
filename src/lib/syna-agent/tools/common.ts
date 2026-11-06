/** Aides communes des outils SYNA : projet du fil (droits relus), relecture et changements vérifiés. */
import { HttpError } from "../../auth";
import { loadProject } from "../../projects";
import { requirePlan } from "../../plan-gates";
import { L } from "../../i18n-server";
import type { ToolContext } from "../types";

export function project(ctx: ToolContext) {
  if (!ctx.projectId) throw new HttpError(409, L("Aucun projet rattaché à ce fil.", "No project is linked to this thread."));
  requirePlan(ctx.user, ctx.projectId);
  const p = loadProject(ctx.projectId);
  if (p.userId !== ctx.user.id) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  return p;
}

/** Comparaison stricte de deux valeurs relues (preuve de changement). */
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const euros = (cents: number | null | undefined) => (cents == null ? null : Number((cents / 100).toFixed(2)));
export const cents = (eur: number) => Math.round(eur * 100);

export function short(v: unknown, max = 160): string {
  const s = typeof v === "string" ? v : JSON.stringify(v ?? "");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
