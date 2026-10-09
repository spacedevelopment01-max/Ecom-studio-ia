import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { setSetting, setJsonSetting, getJsonSetting } from "@/lib/settings";
import { DEFAULT_ROUTES, TASKS, priceFor, priceValid, type TaskId } from "@/lib/ai/config";
import { effortValues, textModel } from "@/lib/ai/text-models";
import { mediaModel } from "@/lib/ai/media-models";
import { incompatibility, MEDIA_USAGES, mediaPrimary, mediaStatus, USAGE_INFO, usageNeed, usagePrimary, usageSettings, type UsageSetting } from "@/lib/ai/media-routing";
import { L } from "@/lib/i18n-server";

const pos = z.number().positive().finite();
/** Un tarif incomplet serait compté 0 € : chaque champ de coût doit être un nombre positif. */
const PriceSchema = z.discriminatedUnion("unit", [
  z.object({ unit: z.literal("tokens"), inputPerM: pos, outputPerM: pos, imageInputPerM: pos.optional(), imageOutputPerM: pos.optional() }),
  z.object({ unit: z.literal("image"), perImage: pos }),
  z.object({ unit: z.literal("video_second"), perSecond: pos }),
]);

// Réglages SMTP (serveur, identifiant, mot de passe, expéditeur) : chiffrés comme les clés, jamais renvoyés en clair.
const SECRET_KEYS = /apiKey$|clientSecret$|secretKey$|webhookSecret$|^smtp\.(host|user|password|from)$/;
const ALLOWED = /^(provider\.(anthropic|openai|google|fal|pexels|pixabay)\.(apiKey|disabled)|oauth\.(meta|tiktok|youtube|pinterest|canva|shopify)\.(clientId|clientSecret)|stripe\.(secretKey|webhookSecret)|smtp\.(host|port|user|password|from)|app\.url|meta\.graphVersion|shopify\.apiVersion)$/;

/** Réglages d'administration. Les secrets sont chiffrés et jamais renvoyés en clair. */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(
    req,
    z.object({
      set: z.array(z.object({ key: z.string(), value: z.string().nullable() })).optional(),
      route: z.object({ task: z.string(), provider: z.enum(["anthropic", "openai", "google", "fal"]), model: z.string().min(2).max(120), effort: z.string().max(20).optional() }).optional(),
      // Routage des modèles de texte : manuel (défaut, routage actuel inchangé) ou automatique multifournisseur.
      routingMode: z.enum(["manual", "auto"]).optional(),
      pinTask: z.object({ task: z.string(), pinned: z.boolean() }).optional(),
      // Routage multimédia (images, vidéos) : mode, principal, secours, confirmation et activation des modèles.
      mediaMode: z.object({ kind: z.enum(["image", "video"]), mode: z.enum(["manual", "auto"]) }).optional(),
      mediaPrimary: z.object({ kind: z.enum(["image", "video"]), key: z.string().max(160) }).optional(),
      mediaBackup: z.object({ kind: z.enum(["image", "video"]), key: z.string().max(160).nullable() }).optional(),
      mediaModel: z.object({ key: z.string().max(160), enabled: z.boolean().optional(), confirm: z.boolean().optional() }).optional(),
      // Réglage d'un USAGE (logos, images produit…) : principal (null = suivre le réglage général), secours (null =
      // aucun), mode, retour au réglage général, coupure (retouches produit).
      mediaUsage: z
        .object({
          usage: z.enum(MEDIA_USAGES),
          mode: z.enum(["manual", "auto"]).optional(),
          primary: z.string().max(160).nullable().optional(),
          backup: z.string().max(160).nullable().optional(),
          inheritBackup: z.boolean().optional(),
          off: z.boolean().optional(),
          reset: z.boolean().optional(),
        })
        .optional(),
      textModel: z.object({ key: z.string().regex(/^(anthropic|openai|google):[\w.-]+$/), enabled: z.boolean().optional(), confirm: z.boolean().optional() }).optional(),
      price: z.object({ key: z.string().regex(/^(anthropic|openai|google|fal):.+$/, { error: () => L("Clé attendue : fournisseur:modèle", "Expected key: provider:model") }), value: PriceSchema.nullable() }).optional(),
      pricesChecked: z.literal(true).optional(),
      usdToEur: z.number().min(0.3).max(3).optional(),
      // Coefficient au moins égal à 1 : l'enveloppe ne peut pas être débitée moins que le coût réel.
      markup: z.number().min(1).max(5).optional(),
    }),
  );
  for (const s of b.set ?? []) {
    if (!ALLOWED.test(s.key)) throw new HttpError(400, L(`Réglage non autorisé : ${s.key}`, `Setting not allowed: ${s.key}`));
    if (s.key === "smtp.port" && s.value && !/^\d{2,5}$/.test(s.value.trim())) throw new HttpError(400, L("Port SMTP invalide (ex. 587 ou 465).", "Invalid SMTP port (e.g. 587 or 465)."));
    if (s.key === "smtp.from" && s.value && !/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$|^[^<>]*<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>$/.test(s.value.trim())) throw new HttpError(400, L("Adresse d'expédition invalide (ex. studio@exemple.fr ou Studio <studio@exemple.fr>).", "Invalid sender address (e.g. studio@example.com or Studio <studio@example.com>)."));
    setSetting(s.key, s.value, SECRET_KEYS.test(s.key));
  }
  if (b.route) {
    if (!(b.route.task in DEFAULT_ROUTES)) throw new HttpError(400, L("Tâche inconnue.", "Unknown task."));
    // Tâche de texte : modèle du catalogue uniquement, effort parmi les valeurs acceptées par CE modèle.
    if (TASKS[b.route.task as TaskId].kind === "llm") {
      const m = textModel(b.route.provider, b.route.model);
      if (!m) throw new HttpError(400, L(`Modèle de texte inconnu : ${b.route.provider}:${b.route.model}. Choisissez un modèle du catalogue.`, `Unknown text model: ${b.route.provider}:${b.route.model}. Pick a model from the catalog.`));
      if (b.route.effort && !effortValues(m.provider, m.model).includes(b.route.effort)) throw new HttpError(400, L(`Effort « ${b.route.effort} » non accepté par ${m.label}.`, `Effort "${b.route.effort}" isn't accepted by ${m.label}.`));
    } else if (b.route.effort) {
      throw new HttpError(400, L("Les modèles d'image et de vidéo n'ont pas de réglage d'effort.", "Image and video models have no effort setting."));
    }
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
  if (b.routingMode) setSetting("ai.routing.mode", b.routingMode);
  if (b.pinTask) {
    if (!(b.pinTask.task in DEFAULT_ROUTES)) throw new HttpError(400, L("Tâche inconnue.", "Unknown task."));
    const pinned = new Set(getJsonSetting<string[]>("ai.routing.pinned", []));
    if (b.pinTask.pinned) pinned.add(b.pinTask.task);
    else pinned.delete(b.pinTask.task);
    setJsonSetting("ai.routing.pinned", [...pinned]);
  }
  if (b.textModel) {
    const [provider, ...rest] = b.textModel.key.split(":");
    const m = textModel(provider, rest.join(":"));
    if (!m) throw new HttpError(400, L("Modèle inconnu du catalogue.", "Model not in the catalog."));
    const all = getJsonSetting<Record<string, { enabled?: boolean; confirmedAt?: number }>>("ai.textModels", {});
    const cur = { ...(all[b.textModel.key] ?? {}) };
    if (b.textModel.enabled !== undefined) cur.enabled = b.textModel.enabled;
    if (b.textModel.confirm === true) {
      // Confirmation possible seulement avec un tarif valide : sans tarif, le coût maximal ne serait pas borné.
      const p = priceFor(m.provider, m.model);
      if (!p || !priceValid(p) || p.unit !== "tokens") throw new HttpError(400, L(`Renseignez d'abord le tarif officiel de ${m.label} (fournisseur:modèle, en jetons).`, `First enter the official price of ${m.label} (provider:model, per token).`));
      cur.confirmedAt = Date.now();
    } else if (b.textModel.confirm === false) delete cur.confirmedAt;
    all[b.textModel.key] = cur;
    setJsonSetting("ai.textModels", all);
  }
  const mediaOf = (key: string, kind?: string) => {
    const [provider, ...rest] = key.split(":");
    const m = mediaModel(provider, rest.join(":"));
    if (!m || (kind && m.kind !== kind)) throw new HttpError(400, L("Modèle image ou vidéo inconnu du catalogue.", "Image or video model not in the catalog."));
    return m;
  };
  if (b.mediaMode) {
    const modes = getJsonSetting<Record<string, string>>("ai.media.mode", {});
    modes[b.mediaMode.kind] = b.mediaMode.mode;
    setJsonSetting("ai.media.mode", modes);
  }
  if (b.mediaPrimary) {
    const m = mediaOf(b.mediaPrimary.key, b.mediaPrimary.kind);
    // Un principal doit être appelable : adaptateur réel, tarif connu et informations confirmées (coût borné).
    const st = mediaStatus(m);
    if (!m.adapter || !st.confirmed || st.reasons.some((r) => /tarif|price/i.test(r))) throw new HttpError(400, L(`${m.label} ne peut pas être principal : ${st.reasons.join(", ")}.`, `${m.label} can't be primary: ${st.reasons.join(", ")}.`));
    const routes = getJsonSetting<Record<string, unknown>>("ai.routes", {});
    routes[b.mediaPrimary.kind === "image" ? "image_generation" : "video_generation"] = { provider: m.provider, model: m.model };
    setJsonSetting("ai.routes", routes);
  }
  if (b.mediaBackup) {
    const backups = getJsonSetting<Record<string, string | null>>("ai.media.backup", {});
    if (b.mediaBackup.key === null) delete backups[b.mediaBackup.kind];
    else {
      const m = mediaOf(b.mediaBackup.key, b.mediaBackup.kind);
      const st = mediaStatus(m);
      const p = mediaPrimary(b.mediaBackup.kind);
      if (`${p.provider}:${p.model}` === b.mediaBackup.key) throw new HttpError(400, L("Le secours doit être différent du principal.", "The backup must differ from the primary."));
      // Secours couvert : tarif connu et confirmé (sa propre réservation borne son coût avant l'envoi).
      if (!m.adapter || !st.confirmed || st.reasons.some((r) => /tarif|price/i.test(r))) throw new HttpError(400, L(`${m.label} ne peut pas servir de secours : ${st.reasons.join(", ")}.`, `${m.label} can't be a backup: ${st.reasons.join(", ")}.`));
      backups[b.mediaBackup.kind] = b.mediaBackup.key;
    }
    setJsonSetting("ai.media.backup", backups);
  }
  if (b.mediaUsage) {
    const u = b.mediaUsage.usage;
    const info = USAGE_INFO[u];
    const settings = usageSettings();
    const cur: UsageSetting = { ...(settings[u] ?? {}) };
    // Modèle appelable pour CET usage : adaptateur réel, tarif connu et confirmé, capacités suffisantes.
    const callable = (key: string, role: string) => {
      const m = mediaOf(key, info.kind);
      const st = mediaStatus(m);
      if (!m.adapter || !st.confirmed || st.reasons.some((r) => /tarif|price/i.test(r))) throw new HttpError(400, L(`${m.label} ne peut pas être ${role} : ${st.reasons.join(", ")}.`, `${m.label} can't be ${role}: ${st.reasons.join(", ")}.`));
      const why = incompatibility(m, usageNeed(u));
      if (why) throw new HttpError(400, L(`${m.label} ne convient pas à « ${info.label.fr} » : ${why}.`, `${m.label} doesn't fit "${info.label.en}": ${why}.`));
      return m;
    };
    if (b.mediaUsage.reset) delete settings[u];
    else {
      if (b.mediaUsage.mode) cur.mode = b.mediaUsage.mode;
      if (b.mediaUsage.primary !== undefined) {
        if (b.mediaUsage.primary === null) delete cur.primary;
        else {
          callable(b.mediaUsage.primary, L("principal", "primary"));
          cur.primary = b.mediaUsage.primary;
        }
      }
      if (b.mediaUsage.inheritBackup) delete cur.backup;
      else if (b.mediaUsage.backup !== undefined) {
        if (b.mediaUsage.backup === null) cur.backup = null;
        else {
          const m = callable(b.mediaUsage.backup, L("secours", "backup"));
          // Secours couvert : utilisable (clé active, tarif valide), distinct du principal de l'usage.
          if (!mediaStatus(m).usable) throw new HttpError(400, L(`${m.label} ne peut pas servir de secours : ${mediaStatus(m).reasons.join(", ")}.`, `${m.label} can't be a backup: ${mediaStatus(m).reasons.join(", ")}.`));
          const p = cur.primary ?? (() => { const x = usagePrimary(u); return `${x.provider}:${x.model}`; })();
          if (p === b.mediaUsage.backup) throw new HttpError(400, L("Le secours doit être différent du principal.", "The backup must differ from the primary."));
          cur.backup = b.mediaUsage.backup;
        }
      }
      if (b.mediaUsage.off !== undefined) {
        if (b.mediaUsage.off && !info.canBeOff) throw new HttpError(400, L("Cet usage ne peut pas être coupé.", "This usage can't be turned off."));
        if (b.mediaUsage.off) cur.off = true;
        else delete cur.off;
      }
      settings[u] = cur;
    }
    setJsonSetting("ai.media.usage", settings);
  }
  if (b.mediaModel) {
    const m = mediaOf(b.mediaModel.key);
    const all = getJsonSetting<Record<string, { enabled?: boolean; confirmedAt?: number }>>("ai.media.models", {});
    const cur = { ...(all[b.mediaModel.key] ?? {}) };
    if (b.mediaModel.enabled !== undefined) cur.enabled = b.mediaModel.enabled;
    if (b.mediaModel.confirm === true) {
      const p = priceFor(m.provider, m.model);
      if (!p || !priceValid(p)) throw new HttpError(400, L(`Renseignez d'abord le tarif officiel de ${m.label} (« Tarifs des fournisseurs »).`, `First enter the official price of ${m.label} ("Provider prices").`));
      cur.confirmedAt = Date.now();
    } else if (b.mediaModel.confirm === false) delete cur.confirmedAt;
    all[b.mediaModel.key] = cur;
    setJsonSetting("ai.media.models", all);
  }
  if (b.pricesChecked) setSetting("ai.prices.checkedAt", String(Date.now()));
  if (b.usdToEur) setJsonSetting("billing.usdToEur", b.usdToEur);
  if (b.markup) setJsonSetting("billing.markup", b.markup);
  return ok();
});
