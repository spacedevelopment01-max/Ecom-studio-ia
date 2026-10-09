import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { FORMATS, SCENE_STYLES } from "@/lib/media/compose";
import { L } from "@/lib/i18n-server";
import { HttpError } from "@/lib/auth";

const Req = z.object({
  mode: z.enum(["set", "single"]),
  // Entreprise de services : annonce de prestation, carrousel de conseils, citation, infos pratiques, rendez-vous, ambiance.
  kind: z.enum(["packshot", "scene", "social", "ad", "banner", "service", "tips", "quote", "info", "booking", "ambiance"]).optional(),
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
};
const imageLabel = (kind: string) => {
  const [fr, en] = KIND_LABELS[kind] ?? ["Image", "Image"];
  return L(fr, en);
};

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requireCreationPlan(user, "images");
  const b = await body(req, Req);
  const kind = b.kind ?? "scene";
  // Visuels avec texte : Advertising Engine V2 (onglet Publicités, éditeur à calques) et Social V2 (Publications).
  if (b.mode === "single" && p.business !== "services" && (kind === "social" || kind === "ad")) throw new HttpError(410, L("Les visuels avec texte se créent dans Publicités (modifiables dans l'éditeur visuel) ou Publications.", "Visuals with text are created in Ads (editable in the visual editor) or Posts."));
  // Image générée par IA : toujours Image Engine V2 (brief, fidélité au produit, contrôle, bibliothèque).
  if (b.mode === "single" && (kind === "ambiance" || (b.useAi && (kind === "scene" || kind === "banner")))) {
    const f = b.format ? FORMATS[b.format as keyof typeof FORMATS] : null;
    const aspect = !f ? "4:5" : f.w > f.h * 1.5 ? "16:9" : f.h > f.w * 1.5 ? "9:16" : f.h > f.w * 1.1 ? "4:5" : "1:1";
    const v2kind = p.business === "services" ? (kind === "banner" ? "banner" : "trade_photo") : kind === "banner" ? "banner" : "lifestyle";
    const job = enqueue({ userId: user.id, projectId: p.id, type: "image.v2", label: L("Images : direction artistique et sélection", "Images: art direction and selection"), payload: { projectId: p.id, request: { kind: v2kind, aspect, count: 1, topic: b.subline ?? null, allowGenerate: true } } });
    return ok({ jobId: job.id, engine: "image-v2" });
  }
  const job =
    b.mode === "set"
      ? enqueue({ userId: user.id, projectId: p.id, type: "images.generate", label: L("Jeu d'images complet", "Full image set"), payload: { projectId: p.id } })
      : enqueue({ userId: user.id, projectId: p.id, type: "image.single", label: imageLabel(b.kind ?? "scene"), payload: { projectId: p.id, request: { kind: b.kind ?? "scene", style: b.style, format: b.format, layout: b.layout, headline: b.headline, subline: b.subline, cta: b.cta, useAi: b.useAi, sourceCutoutId: b.sourceCutoutId, serviceIndex: b.serviceIndex, items: b.items, usePhoto: b.usePhoto } } });
  return ok({ jobId: job.id });
});
