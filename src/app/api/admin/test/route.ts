import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { pingAnthropic } from "@/lib/ai/llm";
import { pingProvider } from "@/lib/ai/media-providers";
import { pingStock } from "@/lib/stock/photos";
import { L } from "@/lib/i18n-server";

/** Vérifie réellement une clé (appel minimal au fournisseur). */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(req, z.object({ provider: z.enum(["anthropic", "openai", "google", "fal", "pexels", "pixabay"]) }));
  try {
    const msg = b.provider === "anthropic" ? await pingAnthropic("claude-haiku-4-5").then((r) => L(`Réponse reçue de ${r.model}`, `Response received from ${r.model}`)) : b.provider === "pexels" || b.provider === "pixabay" ? await pingStock(b.provider) : await pingProvider(b.provider);
    return ok({ ok: true, message: msg });
  } catch (e) {
    return ok({ ok: false, message: (e as Error).message });
  }
});
