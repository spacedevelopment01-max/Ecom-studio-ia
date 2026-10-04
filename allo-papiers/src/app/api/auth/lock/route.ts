import { json, route } from "@/lib/http";
import { getSession, lockNow } from "@/lib/auth";

/** Verrouillage immédiat (minuterie d'inactivité du navigateur ou bouton « Verrouiller »). */
export const POST = route(async () => {
  const s = await getSession();
  if (s) await lockNow(s.session.id);
  return json({ ok: true });
});
