import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { readSynaPrefs, writeSynaPrefs } from "@/lib/syna-ui/prefs-store";
import { resolveSynaPrefs } from "@/lib/syna-ui/preferences";

/**
 * Réglages d'affichage du Studio (mission #282, lot 1 bis) : mode Encre / Plein cadre, apparence, bleu, largeur,
 * densité, taille du texte, panneau. Portée : le compte connecté, et au choix un de SES projets. Aucun lien avec l'IA,
 * les forfaits ou les données du projet.
 */
function ownProject(userId: string, projectId: string | null | undefined): string | null {
  if (!projectId) return null;
  if (!one("SELECT 1 FROM projects WHERE id = ? AND user_id = ? AND archived = 0", projectId, userId)) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  return projectId;
}
const view = (userId: string, projectId: string | null) => {
  const s = readSynaPrefs(userId, projectId);
  return { account: s.account, project: s.project, resolved: resolveSynaPrefs(s.account, s.project), updatedAt: s.updatedAt };
};

export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  const projectId = ownProject(u.id, new URL(req.url).searchParams.get("projectId"));
  return ok(view(u.id, projectId), { headers: { "Cache-Control": "no-store" } });
});

const Prefs = z.record(z.string(), z.unknown());
export const PUT = handle(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req, z.object({ scope: z.enum(["account", "project"]), projectId: z.string().max(64).optional(), prefs: Prefs }));
  const projectId = ownProject(u.id, b.projectId);
  if (b.scope === "project" && !projectId) throw new HttpError(400, L("Projet requis.", "Project required."));
  writeSynaPrefs(u.id, b.scope, projectId, b.prefs);
  return ok(view(u.id, projectId), { headers: { "Cache-Control": "no-store" } });
});
