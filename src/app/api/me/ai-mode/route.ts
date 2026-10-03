import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { aiMode, hasAiCredits, setAiMode } from "@/lib/ai/access";

/** Mode de création du client : IA (crédits) ou moteur local (gratuit). */
export const GET = handle(async () => {
  const u = await requireUser();
  return ok({ mode: aiMode(u.id), credits: hasAiCredits(u.id) });
});

export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const b = await body(req, z.object({ mode: z.enum(["ai", "local"]) }));
  setAiMode(u.id, b.mode);
  return ok({ mode: aiMode(u.id), credits: hasAiCredits(u.id) });
});
