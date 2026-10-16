/**
 * Alerte du propriétaire quand le studio ne peut pas utiliser Qwen-Image 3.0 Pro (modèle d'images du studio) et
 * passe sur un autre modèle — en pratique OpenAI (ChatGPT Images), plus cher. Décision du propriétaire (16/10/2026) :
 * le passage automatique est gardé, mais l'administrateur est prévenu VITE pour régler le problème.
 *
 *  - Dès la première génération payante passée ailleurs : e-mail aux administrateurs (si l'envoi d'e-mails est
 *    configuré) ET notification dans l'administration, avec quoi, pourquoi, depuis quand, projet et usage, surcoût
 *    estimé par image et quoi faire.
 *  - Pas d'avalanche : une alerte par incident, puis au plus un rappel par heure tant que le problème dure.
 *  - Quand Qwen refonctionne : une alerte « rétabli », l'incident est clos.
 *  - Un modèle choisi exprès par l'administration (autre que Qwen) n'est pas un incident : aucune alerte.
 * Ne fait jamais échouer une génération (toute erreur est journalisée puis ignorée).
 */
import { all, logError, one } from "../db";
import { getJsonSetting, setJsonSetting } from "../settings";
import { mailConfigured, sendMailInBackground } from "../mail";
import { notifyAdmins } from "../payments";
import { EUR } from "../billing";
import { mediaModel } from "./media-models";
import { mediaPrimary, mediaStatus, typicalCostMicro, USAGE_INFO, usageSettings, type MediaUsage } from "./media-routing";

export const STUDIO_IMAGE_MODEL = { provider: "alibaba", model: "qwen-image-3.0-pro" } as const;
const STUDIO_KEY = `${STUDIO_IMAGE_MODEL.provider}:${STUDIO_IMAGE_MODEL.model}`;
const INCIDENT_KEY = "ai.media.qwenIncident";
/** Rappel au plus une fois par heure tant que l'incident dure. */
export const QWEN_ALERT_EVERY_MS = 60 * 60_000;

export type QwenIncident = { since: number; lastAlertAt: number; alerts: number; reason: string; replacedBy: string; projectId: string | null; usage: string | null };

export const qwenIncident = (): QwenIncident | null => getJsonSetting<QwenIncident | null>(INCIDENT_KEY, null);

/** Modèle d'images voulu pour cet usage : celui choisi par l'administration, sinon Qwen-Image 3.0 Pro. */
function intended(usage: MediaUsage | null): string {
  let u: MediaUsage | undefined = usage ?? undefined;
  while (u) {
    const p = usageSettings()[u]?.primary;
    if (p) return p;
    u = USAGE_INFO[u].parent;
  }
  const r = getJsonSetting<Partial<Record<string, { provider: string; model: string }>>>("ai.routes", {}).image_generation;
  return r?.provider && r.model ? `${r.provider}:${r.model}` : STUDIO_KEY;
}

const euros = (micro: number) => `${(micro / EUR).toFixed(2).replace(".", ",")} €`;

/** Surcoût estimé d'une image par rapport à Qwen-Image 3.0 Pro (tarifs de l'administration). */
function extraCost(provider: string, model: string): string {
  const m = mediaModel(provider, model);
  const q = mediaModel(STUDIO_IMAGE_MODEL.provider, STUDIO_IMAGE_MODEL.model);
  const a = m ? typicalCostMicro(m) : null;
  const b = q ? typicalCostMicro(q) : null;
  if (a == null || b == null) return "inconnu (tarif non renseigné)";
  return a > b ? `environ ${euros(a - b)} de plus par image (${euros(a)} au lieu de ${euros(b)})` : `aucun (${euros(a)} par image)`;
}

function adminEmails(): string[] {
  return all<{ email: string }>("SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL").map((r) => r.email);
}

function alert(title: string, body: string) {
  notifyAdmins(title, body);
  if (!mailConfigured()) return;
  for (const to of adminEmails()) sendMailInBackground({ to, subject: `E-COM STUDIO IA — ${title}`, text: body }, "mail.qwen-alert");
}

const projectName = (projectId: string | null) => (projectId ? (one<{ name: string }>("SELECT name FROM projects WHERE id = ?", projectId)?.name ?? projectId) : "—");
const dateFr = (t: number) => new Date(t).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

/**
 * À appeler juste avant chaque génération d'IMAGE payante, avec le modèle réellement appelé. `excluded` : modèles
 * écartés pour cette génération (le principal vient d'échouer sans coût et le secours prend le relais).
 */
export function noteImageModel(o: { provider: string; model: string; projectId: string | null; usage: MediaUsage | null; excluded?: string[]; now?: number }) {
  try {
    const now = o.now ?? Date.now();
    const key = `${o.provider}:${o.model}`;
    const inc = qwenIncident();
    if (key === STUDIO_KEY) {
      if (inc) {
        setJsonSetting(INCIDENT_KEY, null);
        alert(
          "Qwen-Image 3.0 Pro rétabli",
          `Qwen-Image 3.0 Pro fonctionne de nouveau : les images repassent par le modèle du studio.\n\nIncident du ${dateFr(inc.since)} au ${dateFr(now)} (${inc.replacedBy} utilisé à la place ; cause : ${inc.reason}).`,
        );
      }
      return;
    }
    // Modèle choisi exprès par l'administration : pas un incident.
    if (intended(o.usage) !== STUDIO_KEY) return;
    const q = mediaModel(STUDIO_IMAGE_MODEL.provider, STUDIO_IMAGE_MODEL.model)!;
    const st = mediaStatus(q);
    const reason = !st.usable ? st.reasons.join(", ") : o.excluded?.includes(STUDIO_KEY) ? "Qwen-Image 3.0 Pro a refusé la demande ou est en panne (échec sans coût), le secours a pris le relais" : `le routage a choisi ${mediaPrimary("image").provider}:${mediaPrimary("image").model}`;
    if (inc && now - inc.lastAlertAt < QWEN_ALERT_EVERY_MS) return;
    const since = inc?.since ?? now;
    setJsonSetting(INCIDENT_KEY, { since, lastAlertAt: now, alerts: (inc?.alerts ?? 0) + 1, reason, replacedBy: key, projectId: o.projectId, usage: o.usage } satisfies QwenIncident);
    const usage = o.usage ? USAGE_INFO[o.usage].label.fr : "images";
    alert(
      inc ? "Rappel : Qwen-Image 3.0 Pro toujours inutilisable" : "Qwen-Image 3.0 Pro inutilisable : images passées sur un autre modèle",
      [
        `Quoi : Qwen-Image 3.0 Pro (modèle d'images du studio) n'a pas pu être utilisé ; l'image a été créée avec ${key} à la place.`,
        `Pourquoi : ${reason}.`,
        `Depuis : ${dateFr(since)}.`,
        `Concerné : projet « ${projectName(o.projectId)} », usage « ${usage} ».`,
        `Surcoût estimé : ${extraCost(o.provider, o.model)}.`,
        "Quoi faire : vérifier la clé Alibaba dans Administration › Fournisseurs IA (clé présente, active, bonne région), puis l'état de Qwen-Image 3.0 Pro dans Administration › Images & Vidéos.",
        inc ? "Prochain rappel dans une heure au plus tôt si le problème dure ; une alerte « rétabli » suivra quand Qwen refonctionnera." : "Une alerte « rétabli » suivra quand Qwen refonctionnera (rappel au plus une fois par heure d'ici là).",
      ].join("\n"),
    );
  } catch (e) {
    logError("media.qwen-alert", e);
  }
}
