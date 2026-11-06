import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { openThread } from "@/lib/syna-agent/thread";
export const runtime = "nodejs";
/** Ouvre (ou retrouve) LE fil du projet, ou le brouillon du compte sans projet. */
export const POST = handle(async (req: Request) => {
  assertSynaAgent(); const user = await requireUser();
  const { projectId } = await body(req, z.object({ projectId: z.string().max(40).nullable() }).strict());
  return ok(openThread(user, projectId));
});
