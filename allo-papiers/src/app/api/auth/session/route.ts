import { json, route } from "@/lib/http";
import { getSession, isElevated, LOCK_MINUTES, userHasPasskey } from "@/lib/auth";

export const GET = route(async () => {
  const s = await getSession();
  if (!s) return json({ connected: false });
  return json({
    connected: true,
    email: s.user.email,
    plan: s.user.plan,
    locked: s.session.locked,
    elevated: isElevated(s.session),
    elevatedUntil: s.session.elevated_until,
    hasPasskey: await userHasPasskey(s.user.id),
    lockMinutes: LOCK_MINUTES,
  });
});
