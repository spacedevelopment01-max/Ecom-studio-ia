import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { cancelPlus } from "@/lib/billing";

export const POST = route(async () => {
  const { user } = await requireSession();
  await cancelPlus(user);
  return json({ ok: true });
});
