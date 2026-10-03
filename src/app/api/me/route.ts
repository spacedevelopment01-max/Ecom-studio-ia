import { handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const GET = handle(async () => {
  const u = await requireUser();
  return ok({ user: { id: u.id, email: u.email, name: u.name, role: u.role, timezone: u.timezone } });
});
