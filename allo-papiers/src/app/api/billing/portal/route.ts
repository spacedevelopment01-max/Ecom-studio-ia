import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { billingPortalUrl } from "@/lib/billing";

export const POST = route(async () => {
  const { user } = await requireSession();
  return json({ url: await billingPortalUrl(user) });
});
