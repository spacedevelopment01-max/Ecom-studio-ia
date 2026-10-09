import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { runForUser } from "@/lib/ai/access";
import { contentLang } from "@/lib/i18n-server";
import { orchestrateNow } from "@/lib/orchestrator/execute";
import { runAdEngineV2 } from "@/lib/ads-v2/engine";
import type { Platform } from "@/lib/ads-v2/types";
import { randomUUID } from "node:crypto";

/** Réseaux de la campagne → formats publicitaires de l'Advertising Engine V2. */
const PLATFORM_OF: Record<string, Platform> = { instagram: "meta_feed", facebook: "meta_feed", tiktok: "tiktok", pinterest: "pinterest", linkedin: "linkedin", youtube: "google_display", google: "google_display" };

/**
 * Propose les annonces d'une campagne et leur plan de test, dans la langue demandée (en-tête x-content-lang, sinon
 * langue du projet) — Advertising Engine V2 en mode « textes seulement » : angles tirés des faits confirmés, textes
 * locaux puis IA si elle est disponible pour le client, contrôle des allégations (rien d'inventé). Rien n'est
 * enregistré : la fenêtre de campagne reprend les propositions, la personne les relit puis enregistre. Les créations
 * (images à calques modifiables) se font avec « Créer des publicités » (même moteur).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ count: z.number().int().min(1).max(6).optional(), objective: z.string().max(80).optional(), audience: z.string().max(600).optional(), networks: z.array(z.string().max(20)).max(6).optional() }));
  const lang = contentLang();
  const platforms = [...new Set((b.networks ?? []).map((n) => PLATFORM_OF[n]).filter(Boolean))];
  const r = await runForUser(user.id, () => orchestrateNow(p, "ads.draft", `ads:${randomUUID()}`, () => runAdEngineV2(null, p.id, { count: b.count ?? 3, objective: b.objective ?? null, audience: b.audience ?? null, platforms: platforms.length ? platforms : undefined, copyOnly: true, maxCostEur: 0.5 })));
  const ads = r.concepts.map((c) => ({ angle: c.angle.type, lever: c.angle.lever, hook: c.copy.hook, primary: c.copy.primary, headline: c.copy.headline, description: c.copy.description, cta: c.copy.cta }));
  return ok({ ads, by: r.concepts.some((c) => c.copyBy === "ai") ? "ai" : "local", strategy: { ...r.strategy, by: r.concepts.some((c) => c.copyBy === "ai") ? "ai" : "local" }, notes: r.notes, lang, engine: "ads-v2" });
});
