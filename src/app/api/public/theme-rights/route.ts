/** Droits par thème et par forfait, en lecture publique (grille des forfaits) : listes de thèmes seulement, rien de privé. */
import { handle, ok } from "@/lib/http";
import { loadThemeRights } from "@/lib/theme/theme-rights-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const r = loadThemeRights();
  return ok({ rights: { plans: r.plans } });
});
