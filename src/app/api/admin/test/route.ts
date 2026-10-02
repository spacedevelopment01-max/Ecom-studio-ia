import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { pingAnthropic } from "@/lib/ai/llm";
import { pingProvider } from "@/lib/ai/media-providers";

/** Vérifie réellement une clé (appel minimal au fournisseur). */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ provider: z.enum(["anthropic", "openai", "google", "fal"]) }));
  try {
    const msg = b.provider === "anthropic" ? `Réponse reçue de ${(await pingAnthropic("claude-haiku-4-5")).model}` : await pingProvider(b.provider);
    return ok({ ok: true, message: msg });
  } catch (e) {
    return ok({ ok: false, message: (e as Error).message });
  }
});
