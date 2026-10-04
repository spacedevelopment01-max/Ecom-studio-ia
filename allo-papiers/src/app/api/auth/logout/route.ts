import { json, route } from "@/lib/http";
import { clearSessionCookie, getSession, revokeSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const POST = route(async () => {
  const s = await getSession();
  if (s) {
    await revokeSession(s.user.id, s.session.id);
    await audit(s.user.id, "deconnexion", { targetType: "session", targetId: s.session.id });
  }
  await clearSessionCookie();
  return json({ ok: true });
});
