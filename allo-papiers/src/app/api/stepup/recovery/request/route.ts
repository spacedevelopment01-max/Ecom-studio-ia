import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { requestVaultRecovery, VAULT_RECOVERY_HOURS } from "@/lib/stepup";
import { rateLimit } from "@/lib/rate-limit";

export const POST = route(async () => {
  const { user } = await requireSession({ allowLocked: true });
  await rateLimit(`vaultrecovery:${user.id}`, 3, 86400);
  await requestVaultRecovery(user);
  return json({ ok: true, message: `Demande enregistrée. Par sécurité, elle sera utilisable dans ${VAULT_RECOVERY_HOURS} heures. Un email vous permet de l'annuler.` });
});
