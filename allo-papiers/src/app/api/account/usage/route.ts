import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { usage } from "@/lib/quota";
import { aiMode } from "@/lib/ai/provider";
import { nextMonthStart } from "@/lib/time";

export const GET = route(async () => {
  const { user } = await requireSession();
  return json({ ...(await usage(user.id)), aiMode: aiMode(), aiConsent: Boolean(user.ai_consent_at), renewsOn: nextMonthStart() });
});
