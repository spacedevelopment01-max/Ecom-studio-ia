import { z } from "zod";
import { id, now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { readNativePromptLibrary } from "@/lib/prompt-library-account";

export const GET = handle(async () => {
  const user = await requireUser();
  return ok(readNativePromptLibrary(user));
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, z.object({ title: z.string().trim().min(2).max(160), sector: z.string().max(40), category: z.string().max(40), target: z.string().max(20), body: z.string().min(10).max(12000), basedOn: z.string().optional() }));
  const pid = id();
  run("INSERT INTO user_prompts (id, user_id, title, sector, category, target, body, based_on, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, user.id, b.title, b.sector, b.category, b.target, b.body, b.basedOn ?? null, now(), now());
  return ok({ id: `u:${pid}` });
});
