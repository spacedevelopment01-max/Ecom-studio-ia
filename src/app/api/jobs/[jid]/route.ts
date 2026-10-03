import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { cancelJob, getJob, publicJob, retryJob } from "@/lib/jobs";

async function jobOf(ctx: { params: Promise<{ jid: string }> }) {
  const user = await requireUser();
  const { jid } = await ctx.params;
  const j = getJob(jid);
  if (!j || (j.user_id !== user.id && user.role !== "admin")) throw new HttpError(404, "Tâche introuvable.");
  return j;
}

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ jid: string }> }) => ok({ job: publicJob(await jobOf(ctx)) }));

export const POST = handle(async (req: Request, ctx: { params: Promise<{ jid: string }> }) => {
  const j = await jobOf(ctx);
  const b = await body(req, z.object({ action: z.enum(["cancel", "retry"]) }));
  if (b.action === "cancel") cancelJob(j.id);
  else retryJob(j.id);
  return ok({ job: publicJob(getJob(j.id)!) });
});
