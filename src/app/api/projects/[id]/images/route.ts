import crypto from "node:crypto";
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { FORMATS, SCENE_STYLES } from "@/lib/media/compose";
import { L } from "@/lib/i18n-server";
import { HttpError } from "@/lib/auth";
import { aiActiveFor } from "@/lib/ai/access";
import { estimateMicro } from "@/lib/ai/estimate";
import { aiPostQuoteMicro } from "@/lib/engine/ai-post-image";
import { imageV2Kind } from "@/lib/image-v2/ai-only";

const Req = z.object({
  mode: z.enum(["set", "single"]),
  // Entreprise de services : annonce de prestation, carrousel de conseils, citation, infos pratiques, rendez-vous, ambiance.
  kind: z.enum(["packshot", "scene", "social", "ad", "banner", "service", "tips", "quote", "info", "booking", "ambiance", "promo", "event", "new", "review", "question", "team", "closing"]).optional(),
  style: z.enum(SCENE_STYLES.map((s) => s.id) as [string, ...string[]]).optional(),
  format: z.enum(Object.keys(FORMATS) as [string, ...string[]]).optional(),
  layout: z.enum(["editorial", "bold", "minimal", "centered", "split"]).optional(),
  headline: z.string().max(120).optional(),
  subline: z.string().max(200).optional(),
  cta: z.string().max(40).optional(),
  useAi: z.boolean().optional(),
  sourceCutoutId: z.string().optional(),
  serviceIndex: z.number().int().min(0).max(50).optional(),
  items: z.array(z.string().max(300)).max(6).optional(),
  usePhoto: z.boolean().optional(),
  background: z.enum(["photo", "image", "none"]).optional(),
  photoId: z.string().max(64).optional(),
  /** Ancien choix « free » refusé (410) : toute image finale est créée par l'IA. */
  visual: z.enum(["free", "ai_image", "ai_post"]).optional(),
});

/** Image par l'IA : jusqu'à deux images et leurs contrôles (une reprise si la première est refusée). */
const aiImageQuoteMicro = () => 2 * estimateMicro("image");

/** Devis affiché avant toute création payante (« Faire un visuel ») et état de l'IA du projet. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok({ ai: aiActiveFor(p.userId, p.id), quote: { ai_image: aiImageQuoteMicro() / 1e6, ai_post: aiPostQuoteMicro() / 1e6 } });
});

/** Libellé lisible de la tâche (jamais la clé interne). */
const KIND_LABELS: Record<string, [string, string]> = {
  packshot: ["Image produit sur fond uni", "Product image on plain background"],
  scene: ["Photo mise en scène", "Staged photo"],
  social: ["Visuel pour les réseaux", "Social media visual"],
  ad: ["Visuel publicitaire", "Ad visual"],
  banner: ["Bannière", "Banner"],
  service: ["Annonce de prestation", "Service announcement"],
  tips: ["Carrousel de conseils", "Tips carousel"],
  quote: ["Citation", "Quote"],
  info: ["Infos pratiques", "Practical information"],
  booking: ["Prise de rendez-vous", "Booking"],
  ambiance: ["Image d'ambiance", "Mood image"],
  promo: ["Offre du moment", "Current offer"],
  event: ["Événement", "Event"],
  new: ["Nouveauté", "What's new"],
  review: ["Avis d'un client", "Customer review"],
  question: ["Question à la communauté", "Community question"],
  team: ["Coulisses et équipe", "Behind the scenes"],
  closing: ["Horaires exceptionnels", "Special opening hours"],
};
const imageLabel = (kind: string) => {
  const [fr, en] = KIND_LABELS[kind] ?? ["Image", "Image"];
  return L(fr, en);
};

/** Rôle de l'image demandée (guide du moteur d'images : tout par l'IA, mais pas de texte sur une image produit). */
const TEXT_KINDS = new Set(["social", "ad", "service", "tips", "quote", "info", "booking", "promo", "event", "new", "review", "question", "team", "closing"]);

/**
 * Onglet Images : TOUTE image finale est créée par un modèle d'images (règle du propriétaire). Plus de « visuel
 * gratuit » mis en page par le studio ni de photo de banque : sans IA active, la demande est refusée et la raison dite.
 *  - visuels avec texte → publication entière conçue par l'IA (`image.ai_post`, textes exacts contrôlés) ;
 *  - image produit, mise en scène, bannière, ambiance → Image Engine V2 en génération seule (`noStock`), produit réel
 *    en référence, contrôle puis correction ciblée ;
 *  - jeu d'images → `images.generate` (même règle, `runImageSetV2`).
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requireCreationPlan(user, p.id, "images");
  const b = await body(req, Req);
  const kind = b.kind ?? "scene";
  if (b.visual === "free") throw new HttpError(410, L("Les images finales sont toutes créées par l'IA : la mise en page gratuite du studio n'existe plus.", "Final images are all created by AI: the free studio layout no longer exists."));
  if (!aiActiveFor(p.userId, p.id)) throw new HttpError(402, L("Les images sont créées par l'IA et l'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé). Aucune image n'est créée à la place par un gabarit.", "Images are created by AI and AI isn't active for this project (Discovery plan, AI budget used up or provider disabled). No template image is made instead."));
  // Double clic (même demande dans les 4 secondes) : la même tâche est rendue. Une demande répétée ensuite donne
  // volontairement un NOUVEAU visuel.
  const dedup = `images:${p.id}:${crypto.createHash("sha256").update(JSON.stringify(b)).digest("hex").slice(0, 24)}:${Math.floor(Date.now() / 4_000)}`;
  // Visuels avec texte d'une boutique : Publicités (éditeur visuel) ou Publications — créés là par l'IA.
  if (b.mode === "single" && p.business !== "services" && (kind === "social" || kind === "ad")) throw new HttpError(410, L("Les visuels avec texte se créent dans Publicités ou Publications (créés par l'IA).", "Visuals with text are created in Ads or Posts (created by AI)."));
  if (b.mode === "set") {
    const job = enqueue({ userId: user.id, projectId: p.id, idempotencyKey: dedup, type: "images.generate", label: L("Jeu d'images complet (IA)", "Full image set (AI)"), payload: { projectId: p.id } });
    return ok({ jobId: job.id, engine: "image-set-ai" });
  }
  if (b.visual === "ai_post" || TEXT_KINDS.has(kind)) {
    const job = enqueue({ userId: user.id, projectId: p.id, idempotencyKey: dedup, type: "image.ai_post", label: L("Visuel entièrement conçu par l'IA", "Visual fully designed by AI"), payload: { projectId: p.id, request: { kind, format: b.format, headline: b.headline, subline: b.subline, cta: b.cta, serviceIndex: b.serviceIndex, photoId: b.photoId } } });
    return ok({ jobId: job.id, engine: "ai-post" });
  }
  const f = b.format ? FORMATS[b.format as keyof typeof FORMATS] : null;
  const aspect = !f ? (kind === "banner" ? "16:9" : kind === "packshot" ? "1:1" : "4:5") : f.w > f.h * 1.5 ? "16:9" : f.h > f.w * 1.5 ? "9:16" : f.h > f.w * 1.1 ? "4:5" : "1:1";
  const v2kind = imageV2Kind(p.business === "services", kind);
  const job = enqueue({ userId: user.id, projectId: p.id, idempotencyKey: dedup, type: "image.v2", label: imageLabel(kind), payload: { projectId: p.id, request: { kind: v2kind, aspect, count: 1, topic: b.subline ?? null, allowGenerate: true, noStock: true, maxCostEur: aiImageQuoteMicro() / 1e6 } } });
  return ok({ jobId: job.id, engine: "image-v2" });
});
