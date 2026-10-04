import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sendStepUpEmailCode } from "@/lib/stepup";
import { rateLimit } from "@/lib/rate-limit";

export const POST = route(async () => {
  const { user, session } = await requireSession({ allowLocked: true });
  await rateLimit(`emailcode:${user.id}`, 5, 900);
  await sendStepUpEmailCode(user, session);
  return json({ ok: true, message: "Un code à 6 chiffres vient d'être envoyé par email." });
});
