import { one } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { createResetLink } from "@/lib/password";
import { L } from "@/lib/i18n-server";

/** L'administration génère un lien de réinitialisation (1 heure, usage unique) à transmettre au client. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ uid: string }> }) => {
  const admin = await requireAdmin();
  const { uid } = await ctx.params;
  if (!one("SELECT 1 FROM users WHERE id = ?", uid)) throw new HttpError(404, L("Utilisateur introuvable.", "User not found."));
  const r = createResetLink(uid, admin.id);
  return ok({ url: r.url, expiresAt: r.expiresAt });
});
