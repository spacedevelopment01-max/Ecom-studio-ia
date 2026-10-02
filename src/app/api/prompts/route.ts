import { z } from "zod";
import { all, id, now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, SECTOR_DATA, libraryPrompts } from "@/lib/prompts-library";

export const GET = handle(async () => {
  const user = await requireUser();
  const favorites = all<{ prompt_id: string }>("SELECT prompt_id FROM prompt_favorites WHERE user_id = ?", user.id).map((r) => r.prompt_id);
  const mine = all<any>("SELECT * FROM user_prompts WHERE user_id = ? ORDER BY updated_at DESC", user.id).map((r) => ({ id: `u:${r.id}`, sector: r.sector, sectorLabel: SECTOR_DATA.find((s) => s.id === r.sector)?.label ?? "Personnel", category: r.category, categoryLabel: CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category, group: "Mes prompts", target: r.target, title: r.title, body: r.body, mine: true, basedOn: r.based_on }));
  return ok({ prompts: [...mine, ...libraryPrompts()], favorites, sectors: SECTOR_DATA.map((s) => ({ id: s.id, label: s.label })), categories: CATEGORIES });
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const b = await body(req, z.object({ title: z.string().trim().min(2).max(160), sector: z.string().max(40), category: z.string().max(40), target: z.string().max(20), body: z.string().min(10).max(12000), basedOn: z.string().optional() }));
  const pid = id();
  run("INSERT INTO user_prompts (id, user_id, title, sector, category, target, body, based_on, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", pid, user.id, b.title, b.sector, b.category, b.target, b.body, b.basedOn ?? null, now(), now());
  return ok({ id: `u:${pid}` });
});
