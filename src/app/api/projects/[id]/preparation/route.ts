import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requirePlan } from "@/lib/plan-gates";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { all, json } from "@/lib/db";
import {
  restoreForReview,
  answerBriefQuestion,
  chooseRecommendedTheme,
  moveMedia,
  setPeopleConsent,
  approve,
  assignMedia,
  blockers,
  confirmIdentity,
  editBrief,
  historyOf,
  queuePreparation,
  readyContract,
  references,
  stateOf,
} from "@/lib/preparation/engine";
import { createQuote, quoteOf } from "@/lib/preparation/quote";
import { STEPS, type Input } from "@/lib/preparation/types";
import { isAutoUsable } from "@/lib/quality/usable";
import type { Asset } from "@/lib/library";
import {
  commitState,
  draft,
  requireUpstream,
  stageOf,
} from "@/lib/preparation/store";
import { latestContent } from "@/lib/seo-v2/store";
export const runtime = "nodejs";
const input = z.object({
  offerUrl: z.url().max(1000).optional().or(z.literal("")),
  description: z.string().max(8000),
  offerName: z.string().max(160),
  brandName: z.string().max(80),
  target: z.string().max(1200),
  constraints: z.string().max(5000),
  business: z.enum(["products", "services"]),
  photoIds: z.array(z.string().max(80)).max(12),
  referenceUrls: z.array(z.url().max(1000)).max(12),
  price: z.string().max(40),
  services: z.object({
    services: z
      .array(
        z.object({
          name: z.string().max(160),
          description: z.string().max(1000),
          price: z.string().max(60).optional(),
          duration: z.string().max(60).optional(),
        }),
      )
      .max(20),
    area: z.string().max(300),
    address: z.string().max(300),
    phone: z.string().max(40),
    email: z
      .string()
      .max(160)
      .refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        "Adresse e-mail invalide.",
      ),
    hours: z.string().max(400),
    bookingUrl: z
      .string()
      .max(500)
      .refine(
        (v) => !v || /^https?:\/\/[^\s]+$/i.test(v),
        "Lien de rendez-vous invalide.",
      ),
    contactMode: z.enum(["booking", "quote", "call", "form"]),
    contactModes: z
      .array(z.enum(["booking", "quote", "call", "form"]))
      .optional(),
  }),
});
function view(projectId: string) {
  return {
    state: stateOf(projectId),
    blockers: blockers(projectId),
    ready: readyContract(projectId),
    history: historyOf(projectId).map((s) => ({
      revision: s.revision,
      at: s.updatedAt,
      stages: Object.fromEntries(
        STEPS.map((k) => [k, s.stages[k]?.status || "pending"]),
      ),
    })),
    assets: all<Asset>(
      "SELECT * FROM assets WHERE project_id=? AND kind IN ('image','video') AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 150",
      projectId,
    )
      .filter(isAutoUsable)
      .map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        origin: a.origin,
        kind: a.kind,
        status: a.status,
        verdict: json<any>(a.meta, {}).gate?.verdict ?? null,
        url: `/api/files/${a.id}`,
      })),
  };
}
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  requirePlan(null, p.id);
  const b = await body(
    req,
    z.object({
      action: z.enum([
        "edit-brief",
        "answer",
        "references",
        "quote",
        "generate",
        "approve",
        "identity",
        "consent",
        "assign",
        "refresh-content",
        "restore",
        "theme-choice",
        "placement",
      ]),
      revision: z.number().int().min(0),
      step: z.enum(STEPS).optional(),
      runAction: z.enum(["generate", "analyze", "logo", "image", "collect"]).optional(),
      input: input.optional(),
      urls: z.array(z.url().max(1000)).max(12).optional(),
      questionId: z.string().max(100).optional(),
      answer: z.string().trim().min(1).max(3000).optional(),
      placement: z.object({ pageKey: z.string().max(200), sectionKey: z.string().max(200) }).optional(),
      choiceId: z.string().max(100).optional(),
      logoId: z.string().max(100).optional(),
      quoteId: z.string().max(100).optional(),
      slot: z.string().max(200).optional(),
      assetId: z.string().max(100).optional(),
      peopleConsent: z.enum(["none_confirmed", "this_slot"]).optional(),
      correction: z.string().max(1200).optional(),
      identity: z
        .object({
          name: z.string().max(80),
          tagline: z.string().max(250),
          palette: z
            .object({
              primary: z.string().regex(/^#[0-9a-f]{6}$/i),
              secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
              accent: z.string().regex(/^#[0-9a-f]{6}$/i),
              light: z.string().regex(/^#[0-9a-f]{6}$/i),
              dark: z.string().regex(/^#[0-9a-f]{6}$/i),
            })
            .optional(),
          fonts: z
            .object({ heading: z.string().max(80), body: z.string().max(80) })
            .optional(),
        })
        .optional(),
      version: z.number().int().min(1).optional(),
    }),
  );
  const s = stateOf(p.id);
  if (!s || s.revision !== b.revision)
    throw new HttpError(409, "Le projet a changé. Rechargez cette page.");
  if (b.action === "edit-brief") {
    if (!b.input) throw new HttpError(400, "Brief manquant.");
    for (const id of b.input.photoIds)
      if (
        !all<{ id: string }>(
          "SELECT id FROM assets WHERE id=? AND project_id=? AND kind='image' AND origin='upload' AND status!='rejected' AND deleted_at IS NULL",
          id,
          p.id,
        ).length
      )
        throw new HttpError(400, "Photo source étrangère ou refusée.");
    editBrief(p.id, b.revision, b.input as Input);
  }
  if (b.action === "answer") {
    if (!b.questionId || !b.answer) throw new HttpError(400, "Question et réponse requises.");
    answerBriefQuestion(p.id, b.revision, b.questionId, b.answer);
  }
  if (b.action === "theme-choice") {
    if (!b.choiceId) throw new HttpError(400, "Choix de thème requis.");
    chooseRecommendedTheme(p.id, b.revision, b.choiceId);
  }
  if (b.action === "placement") {
    if (!b.slot || !b.placement) throw new HttpError(400, "Affectation requise.");
    moveMedia(p.id, b.revision, b.slot, b.placement);
  }
  if (b.action === "references") references(p.id, b.revision, b.urls ?? []);
  if (b.action === "quote") {
    if (!b.step) throw new HttpError(400, "Étape manquante.");
    return ok({
      quote: createQuote(p.id, b.step, b.runAction ?? "generate", b.slot),
    });
  }
  if (b.action === "generate") {
    if (!b.quoteId)
      throw new HttpError(400, "Demandez le devis avant cet essai.");
    const q = quoteOf(p.id, b.quoteId);
    return ok({
      ...queuePreparation(p.id, b.revision, q.step, q.action, {
        capMicro: q.capMicro,
        paid: q.paid,
        slot: q.slot,
        correction: b.correction,
      }),
      ...view(p.id),
    });
  }
  if (b.action === "approve") {
    if (!b.step) throw new HttpError(400, "Étape manquante.");
    approve(p.id, b.revision, b.step, {
      choiceId: b.choiceId,
      logoId: b.logoId,
    });
  }
  if (b.action === "identity") {
    if (!b.identity) throw new HttpError(400, "Identité manquante.");
    confirmIdentity(p.id, b.revision, b.identity);
  }
  if (b.action === "consent") {
    if (!b.slot || !b.peopleConsent)
      throw new HttpError(400, "Autorisation manquante.");
    setPeopleConsent(p.id, b.revision, b.slot, b.peopleConsent);
  }
  if (b.action === "assign") {
    if (!b.slot || !b.assetId)
      throw new HttpError(400, "Emplacement et média requis.");
    assignMedia(p.id, b.revision, b.slot, b.assetId, b.peopleConsent);
  }
  if (b.action === "refresh-content")
    commitState(p.id, b.revision, (n) => {
      requireUpstream(n, "content");
      const c = structuredClone(stageOf(n, "content").data);
      c.documents = c.documents.map((d) => {
        const latest = latestContent(p.id, d.docKey);
        if (!latest) throw new HttpError(409, "Document absent.");
        return {
          ...d,
          doc: latest.doc,
          verdict: latest.version.verdict ?? "PROVISIONAL",
        };
      });
      draft(n, "content", c);
    });
  if (b.action === "restore") {
    if (!b.version) throw new HttpError(400, "Version manquante.");
    restoreForReview(p.id, b.revision, b.version);
  }

  return ok(view(p.id));
});
