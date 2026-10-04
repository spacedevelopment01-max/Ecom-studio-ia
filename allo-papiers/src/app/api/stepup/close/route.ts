import { json, route } from "@/lib/http";
import { closeVault, requireSession } from "@/lib/auth";

export const POST = route(async () => {
  const { session } = await requireSession({ allowLocked: true });
  await closeVault(session.id);
  return json({ ok: true });
});
