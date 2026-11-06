import { requireUser, HttpError } from "@/lib/auth";
import { handle, ok, readForm } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { saveAttachment, MAX_ATTACHMENT_BYTES } from "@/lib/syna-agent/attachments";
export const runtime = "nodejs";
export const POST = handle(async (req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  const form = await readForm(req, MAX_ATTACHMENT_BYTES.video + 1048576), files = form.getAll("file");
  if (files.length !== 1 || typeof files[0] === "string" || !files[0].size) throw new HttpError(400, "Un fichier est attendu.");
  const f = files[0];
  const a = await saveAttachment(user, cid, { name: f.name, type: f.type, data: Buffer.from(await f.arrayBuffer()) });
  return ok({ id: a.id, kind: a.kind, name: a.name, analysis: a.kind === "document" ? { characters: a.analysis?.characters } : { ...a.analysis, frames: a.analysis?.frames?.length } });
});
