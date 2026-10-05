/** Accès au blog côté API : forfait (402 « inclus dans les forfaits Vendre et Dominer ») et quota d'articles. */
import { HttpError } from "@/lib/auth";
import { one } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { aiAvailability } from "@/lib/ai/config";
import { assertBlogWrite, BlogAccessError, blogPlanReason, getArticle, type BlogRow } from "@/lib/engine/blog";

/** Avant une action qui consomme 1 article (écrire, réécrire avec l'IA). */
export function gateBlogWrite(userId: string, projectId: string) {
  try {
    assertBlogWrite(userId);
  } catch (e) {
    if (e instanceof BlogAccessError) throw new HttpError(402, e.message, e.code);
    throw e;
  }
  if (!aiAvailability().llm) throw new HttpError(409, L("L'écriture d'articles demande l'IA, qui n'est pas encore connectée sur cette installation. Rien n'a été décompté.", "Writing posts requires AI, which isn't connected on this installation yet. Nothing was counted."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'blog.write' AND status IN ('queued','running','paused')", projectId)) {
    throw new HttpError(409, L("Un article est déjà en cours d'écriture : attendez qu'il soit terminé.", "A post is already being written: wait for it to finish."));
  }
}

/** Forfait qui inclut le blog (sujets proposés : gratuits mais réservés aux forfaits concernés). */
export function gateBlogPlan(userId: string) {
  const reason = blogPlanReason(userId);
  if (reason) throw new HttpError(402, reason);
}

export function articleOf(projectId: string, articleId: string): BlogRow {
  const a = getArticle(projectId, articleId);
  if (!a) throw new HttpError(404, L("Article introuvable.", "Post not found."));
  return a;
}
