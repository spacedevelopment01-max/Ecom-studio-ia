import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { resumePlus } from "@/lib/billing";

export const POST = route(async () => {
  const { user } = await requireSession();
  await resumePlus(user);
  return json({ ok: true });
});
