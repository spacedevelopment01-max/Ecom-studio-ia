import { json, route } from "@/lib/http";
import { requireElevated } from "@/lib/auth";
import { generateRecoveryCodes } from "@/lib/stepup";

/** Génère 8 nouveaux codes de secours (les anciens deviennent invalides). Affichés une seule fois. */
export const POST = route(async () => {
  const { user } = await requireElevated();
  return json({ codes: await generateRecoveryCodes(user) });
});
