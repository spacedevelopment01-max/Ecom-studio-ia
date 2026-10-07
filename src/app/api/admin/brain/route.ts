import { handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { brainReport, SCOPES, type Scope } from "@/lib/brain";
import { L } from "@/lib/i18n-server";

/**
 * Diagnostic du Project Brain (administration, lecture seule) : par scope, empreinte, version, taille, sections,
 * éléments écartés, dépassements de budget, sources et compteurs. Le contenu n'est jamais renvoyé par défaut ;
 * `?content=1` (administrateur authentifié uniquement) le renvoie après masquage des secrets (redact).
 * Filtres : ?project=<id> (obligatoire) &scope=logo,image…
 */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  const q = new URL(req.url).searchParams;
  const projectId = q.get("project") ?? "";
  if (!projectId || !one("SELECT id FROM projects WHERE id = ?", projectId)) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  const scopes = (q.get("scope") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is Scope => (SCOPES as readonly string[]).includes(x));
  return ok(brainReport(projectId, { scopes, content: q.get("content") === "1" }));
});
