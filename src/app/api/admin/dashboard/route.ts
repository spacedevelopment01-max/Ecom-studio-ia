import { handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { clientRows, dashboard } from "@/lib/admin-stats";

/** Tableau de bord : indicateurs clés et liste détaillée des clients. */
export const GET = handle(async () => {
  await requireAdmin();
  return ok({ ...dashboard(), clients: clientRows() });
});
