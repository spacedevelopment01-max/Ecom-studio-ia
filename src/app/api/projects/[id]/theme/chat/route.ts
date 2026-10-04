import { z } from "zod";
import { id, now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { currentTheme } from "@/lib/projects";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

/** Message de retouche : enregistré puis traité en arrière-plan (résistant aux coupures). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!currentTheme(p.id)) throw new HttpError(409, L("La boutique n'est pas encore créée.", "The store hasn't been created yet."));
  const b = await body(
    req,
    z.object({
      message: z.string().trim().min(1).max(4000),
      selection: z.object({ template: z.string(), section: z.string(), block: z.string().optional(), text: z.string().max(400).optional(), tag: z.string().max(20).optional(), type: z.string().max(60).optional(), kind: z.string().max(20).optional() }).nullable().optional(),
      attachments: z.array(z.string()).max(6).default([]),
      page: z.string().max(40).default("index"),
    }),
  );
  const mid = id();
  run("INSERT INTO chat_messages (id, project_id, thread, role, content, attachments, selection, created_at) VALUES (?,?,?,?,?,?,?,?)", mid, p.id, "shop", "user", b.message, JSON.stringify(b.attachments), b.selection ? JSON.stringify(b.selection) : null, now());
  const job = enqueue({ userId: user.id, projectId: p.id, type: "shop.chat", label: L("Retouche de la boutique", "Store edit"), payload: { projectId: p.id, messageId: mid, message: b.message, selection: b.selection ?? null, attachments: b.attachments, page: b.page }, maxAttempts: 2 });
  run("UPDATE chat_messages SET job_id = ? WHERE id = ?", job.id, mid);
  return ok({ messageId: mid, jobId: job.id });
});
