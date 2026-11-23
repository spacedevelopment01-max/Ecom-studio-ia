import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { requirePlan } from "@/lib/plan-gates";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { accepterConditions, accordPersonne, conditionsAcceptees, etatAtelier, gardeFousAtelier, photosDuCatalogue } from "@/lib/atelier/service";
import { ameliorerDemande } from "@/lib/atelier/conseil";
import { vraiePhoto } from "@/lib/atelier/avant-apres";
import { palette } from "@/lib/engine/images";
import { poserDansPublication, poserDansPublicite, poserSurLeSite } from "@/lib/atelier/placer";

export const runtime = "nodejs";

/**
 * L'atelier de création (rapport 10 du 22 novembre 2026) : l'état de l'écran (outils ouverts, prix en pourcentage du
 * budget du mois, plafond des vidéos, conditions, modèles prêts, « Mes créations »), et les gestes sans appel payant
 * (conditions, accord écrit d'une personne, vérification d'une demande, amélioration de la demande, avant-après).
 * Les gestes payants passent par le devis et l'accord existants (images : `/images/v2` ; vidéos : `/creative/video`).
 */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  return ok(etatAtelier(user.id, p));
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accepter_conditions") }),
  z.object({ action: z.literal("accord_personne"), assetId: z.string().max(40), nom: z.string().min(2).max(120), phrase: z.string().min(10).max(300) }),
  z.object({ action: z.literal("verifier"), texte: z.string().max(1000).optional(), assetId: z.string().max(40).optional() }),
  z.object({ action: z.literal("ameliorer"), texte: z.string().max(400), geste: z.enum(["scene", "fond", "story", "carre", "retirer", "lot", "video"]), aspect: z.string().max(8).optional() }),
  z.object({ action: z.literal("catalogue") }),
  z.object({ action: z.literal("poser"), creationId: z.string().max(40), cible: z.enum(["publication", "publicite", "site"]), uid: z.string().regex(/^s[0-9a-f]{8}$/).optional(), src: z.string().max(400).optional() }),
  z.object({ action: z.literal("avant_apres"), avant: z.string().max(40), apres: z.string().max(40), aspect: z.enum(["9:16", "4:5", "1:1", "16:9"]).default("9:16") }),
]);

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, Body);
  if (b.action === "accepter_conditions") {
    accepterConditions(user.id);
    return ok({ acceptees: true });
  }
  if (b.action === "accord_personne") return ok({ accord: accordPersonne(p.id, b.assetId, { nom: b.nom, phrase: b.phrase, par: user.id }) });
  if (b.action === "verifier") {
    try {
      await gardeFousAtelier(user.id, p.id, { texte: b.texte ?? null, assetId: b.assetId ?? null });
      return ok({ ok: true });
    } catch (e) {
      if (e instanceof HttpError) return ok({ ok: false, raison: e.message, code: e.code ?? null });
      throw e;
    }
  }
  if (b.action === "ameliorer") {
    const pal = palette(p);
    const ton = p.brand?.personality?.[0] ?? null;
    return ok(ameliorerDemande(b.texte, { couleurs: [pal.primary, pal.accent], ton, aspect: b.aspect ?? null, geste: b.geste }, L("fr", "en") as "fr" | "en"));
  }
  if (b.action === "catalogue") return ok({ photos: photosDuCatalogue(p.id) });
  // L'avant et l'après, et poser une création : gratuits, mais réservés aux comptes abonnés.
  requirePlan(user, p.id);
  if (b.action === "poser") {
    // « Mes créations » : la création va vraiment là où le client la veut (mêmes règles que SINA, placer.ts).
    if (b.cible === "publication") return ok(poserDansPublication(p, user, b.creationId));
    if (b.cible === "publicite") return ok(poserDansPublicite(p, user, b.creationId));
    if (!b.uid || !b.src) throw new HttpError(400, L("Clique d'abord sur la photo de ton site à remplacer.", "First click the photo on your site to replace."));
    return ok(poserSurLeSite(p, b.creationId, { uid: b.uid, src: b.src }));
  }
  if (!conditionsAcceptees(user.id)) throw new HttpError(409, L("Lis et accepte d'abord les conditions de l'atelier (une seule fois).", "First read and accept the workshop terms (just once)."), "atelier_conditions");
  if (!vraiePhoto(p.id, b.avant) || !vraiePhoto(p.id, b.apres) || b.avant === b.apres) throw new HttpError(400, L("Choisis deux de tes vraies photos, différentes : l'avant et l'après. Je n'invente jamais l'après.", "Choose two of your real photos, different ones: before and after. I never invent the after."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "atelier.avant-apres", label: L("Avant et après", "Before and after"), payload: { projectId: p.id, avant: b.avant, apres: b.apres, aspect: b.aspect, costCapMicro: 0 } });
  return ok({ jobId: job.id });
});
