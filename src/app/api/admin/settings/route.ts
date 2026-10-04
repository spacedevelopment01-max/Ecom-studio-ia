import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { setSetting, setJsonSetting, getJsonSetting } from "@/lib/settings";
import { DEFAULT_ROUTES, type TaskId } from "@/lib/ai/config";
import { L } from "@/lib/i18n-server";

const pos = z.number().positive().finite();
/** Un tarif incomplet serait compté 0 € : chaque champ de coût doit être un nombre positif. */
const PriceSchema = z.discriminatedUnion("unit", [
  z.object({ unit: z.literal("tokens"), inputPerM: pos, outputPerM: pos, imageInputPerM: pos.optional(), imageOutputPerM: pos.optional() }),
  z.object({ unit: z.literal("image"), perImage: pos }),
  z.object({ unit: z.literal("video_second"), perSecond: pos }),
]);

const SECRET_KEYS = /apiKey$|clientSecret$|secretKey$|webhookSecret$/;
const ALLOWED = /^(provider\.(anthropic|openai|google|fal)\.(apiKey|disabled)|oauth\.(meta|tiktok|youtube|pinterest|canva|shopify)\.(clientId|clientSecret)|stripe\.(secretKey|webhookSecret)|app\.url|meta\.graphVersion|shopify\.apiVersion)$/;

/** Réglages d'administration. Les secrets sont chiffrés et jamais renvoyés en clair. */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(
    req,
    z.object({
      set: z.array(z.object({ key: z.string(), value: z.string().nullable() })).optional(),
      route: z.object({ task: z.string(), provider: z.enum(["anthropic", "openai", "google", "fal"]), model: z.string().min(2).max(120), effort: z.enum(["low", "medium", "high", "xhigh", "max"]).optional() }).optional(),
      price: z.object({ key: z.string().regex(/^(anthropic|openai|google|fal):.+$/, { error: () => L("Clé attendue : fournisseur:modèle", "Expected key: provider:model") }), value: PriceSchema.nullable() }).optional(),
      pricesChecked: z.literal(true).optional(),
      usdToEur: z.number().min(0.3).max(3).optional(),
      // Coefficient au moins égal à 1 : l'enveloppe ne peut pas être débitée moins que le coût réel.
      markup: z.number().min(1).max(5).optional(),
    }),
  );
  for (const s of b.set ?? []) {
    if (!ALLOWED.test(s.key)) throw new HttpError(400, L(`Réglage non autorisé : ${s.key}`, `Setting not allowed: ${s.key}`));
    setSetting(s.key, s.value, SECRET_KEYS.test(s.key));
  }
  if (b.route) {
    if (!(b.route.task in DEFAULT_ROUTES)) throw new HttpError(400, L("Tâche inconnue.", "Unknown task."));
    const routes = getJsonSetting<Record<string, unknown>>("ai.routes", {});
    routes[b.route.task as TaskId] = { provider: b.route.provider, model: b.route.model, ...(b.route.effort ? { effort: b.route.effort } : {}) };
    setJsonSetting("ai.routes", routes);
  }
  if (b.price) {
    const prices = getJsonSetting<Record<string, unknown>>("ai.prices", {});
    if (b.price.value === null) delete prices[b.price.key];
    else prices[b.price.key] = b.price.value;
    setJsonSetting("ai.prices", prices);
  }
  if (b.pricesChecked) setSetting("ai.prices.checkedAt", String(Date.now()));
  if (b.usdToEur) setJsonSetting("billing.usdToEur", b.usdToEur);
  if (b.markup) setJsonSetting("billing.markup", b.markup);
  return ok();
});
