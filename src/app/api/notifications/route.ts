import { all, now, run } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ items: all("SELECT id, project_id, level, title, body, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", user.id) });
});

export const POST = handle(async () => {
  const user = await requireUser();
  run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", now(), user.id);
  return ok();
});
