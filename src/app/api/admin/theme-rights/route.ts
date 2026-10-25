/**
 * Droits par thème et par forfait (mission #190) : l'administrateur choisit les thèmes ouverts à chaque forfait.
 * Un forfait sans liste (« à choisir ») garde tous les thèmes proposés : aucune répartition n'est inventée.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { loadThemeRights, saveThemeRights } from "@/lib/theme/theme-rights-store";
import { undecidedPlans } from "@/lib/theme/theme-rights";
import { ACTIVE_DIRECTIONS } from "@/lib/theme/directions";
import { PRE_MAQUETTE_THEMES } from "@/lib/theme/theme-fit";

const view = () => {
  const rights = loadThemeRights();
  return {
    rights,
    undecided: undecidedPlans(rights),
    themes: ACTIVE_DIRECTIONS.map((d) => ({ id: d.id, name: d.name })),
    withdrawn: [...PRE_MAQUETTE_THEMES],
  };
};

export const GET = handle(async () => {
  await requireAdmin();
  return ok(view());
});

const List = z.array(z.string().max(64)).max(100).nullable();

export const POST = handle(async (req: Request) => {
  const admin = await requireAdmin();
  const b = await body(req, z.object({ plans: z.object({ creer: List.optional(), vendre: List.optional(), dominer: List.optional() }) }));
  saveThemeRights({ plans: b.plans }, admin.email);
  return ok(view());
});
