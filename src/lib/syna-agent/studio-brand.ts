/**
 * Thème du Studio monté À LA MARQUE du client (consigne du propriétaire du 9 novembre 2026 : « le client choisit, sina
 * monte le thème du client, image et texte », « avec du texte réflexion, du bon copywriting de l'émotion, dans l'angle
 * marketing choisi ») : tâche de fond « syna.studio.brand », reprenable.
 *  1) Textes : toute la boutique réécrite par le rédacteur du Studio (relecture du directeur de création, allégations non
 *     confirmées retirées), avec la direction de SINA : l'angle choisi, son émotion, son accroche, ce qu'on raconte.
 *  2) Images : ses images (envoyées par lui) se posent d'elles-mêmes dans les emplacements ; les emplacements encore vides
 *     reçoivent une image créée par le moteur d'images du Studio (devis exact, contrôle de chaque image), selon son choix.
 *  3) La boutique est recomposée dans le thème choisi avec ces textes et ces images : elle est en place dans la Boutique.
 */
import { L } from "../i18n-server";
import { UserFacingError, type JobContext } from "../jobs";
import { currentTheme, loadProject, notify, remember, type Project } from "../projects";
import { aiShopCopyChecked } from "../ai/tasks";
import { withTrace } from "../ai/trace";
import { activityPlan } from "./activity";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { angleDetails } from "./mockup-code/copy";
import type { ImageRequestV2 } from "../image-v2/engine";
import type { AspectId } from "../image-v2/types";
import type { ImagesMode } from "./custom-theme/brand";

export const STUDIO_BRAND_JOB = "syna.studio.brand";
export type StudioBrandPayload = { projectId: string; capMicro: number; conversationId?: string | null; images: ImagesMode; copy?: boolean };

/** Direction de rédaction : l'angle choisi par le client et son émotion, à faire ressentir dans chaque texte. */
export function angleBrief(p: Project, j: Journey | null): string {
  if (!j) return "";
  const plan = (() => { try { return activityPlan(p.id, j); } catch { return null; } })();
  const a = plan?.angle, d = angleDetails(j);
  if (!a) return "";
  return [
    `Angle marketing choisi par le client : « ${a.title} »${a.goal ? ` (objectif : ${a.goal})` : ""}.`,
    d.emotion ? `Émotion à faire ressentir : ${d.emotion}. Chaque titre et chaque texte part d'une situation vécue, d'un désir ou d'un soulagement de la cliente ou du client ; les faits ne servent que de preuves.` : "",
    a.message ? `Accroche (titre d'ouverture de l'accueil, mot pour mot) : « ${a.message} ».` : "",
    a.cta ? `Appel à l'action (bouton principal, mot pour mot) : « ${a.cta} ».` : "",
    d.story ? `Ce qu'on raconte : ${d.story}` : "",
    d.show ? `Ce qu'on montre : ${d.show}` : "",
    plan?.keyMessages.length ? `Messages clés : ${plan.keyMessages.map((m) => `« ${m} »`).join(" ; ")}.` : "",
    d.toConfirm?.length ? `NON confirmés, à ne JAMAIS affirmer : ${d.toConfirm.join(" ; ")}.` : "",
    "Phrases courtes et concrètes, même voix partout, aucun superlatif creux, aucun jargon de marketing visible (jamais « angle », « émotion », « preuve »).",
  ].filter(Boolean).join("\n");
}

/** Emplacements d'images du thème du Studio en place : total, déjà remplis, encore vides (à créer). */
export function studioImageNeeds(projectId: string): { total: number; filled: number; missing: number; requests: NonNullable<ReturnType<typeof adaptationOf>>["generationRequests"] } | null {
  const plan = adaptationOf(projectId);
  if (!plan) return null;
  const slots = plan.slots.filter((s) => s.role !== "logo" && s.role !== "video");
  const requests = plan.generationRequests.filter((r) => r.kind === "image");
  return { total: slots.length, filled: slots.filter((s) => !!s.assetId).length, missing: requests.length, requests };
}
function adaptationOf(projectId: string) {
  return currentTheme(projectId)?.spec.meta?.adaptation ?? null;
}

/** Demandes d'images pour les emplacements vides (même moteur et mêmes contrôles que « Préparer ce visuel »). */
export function studioImageRequests(p: Project): ImageRequestV2[] {
  const cur = currentTheme(p.id), plan = cur?.spec.meta?.adaptation;
  if (!cur || !plan) return [];
  return plan.generationRequests.filter((r) => r.kind === "image").map((r) => ({
    kind: r.role === "packshot" ? "packshot" : r.role === "detail" ? "product_image" : p.business === "services" ? "trade_photo" : "usage_scene",
    support: "site",
    aspect: (["1:1", "4:5", "2:3", "3:2", "9:16", "16:9"].includes(r.aspect) ? r.aspect : "16:9") as AspectId,
    topic: r.request.length <= 600 ? r.request : r.request.slice(0, 600),
    references: r.referenceAssetIds,
    slot: `theme:${r.role}:${r.key}`,
    themePlacement: { versionId: cur.version.id, slotKey: r.key, contextHash: plan.contextHash },
    noStock: true, allowGenerate: true, count: 1, peopleAllowed: false,
    name: `theme-${r.role}-${r.key}`.slice(0, 60),
  }));
}

/** Remplaçables par les tests (aucun appel réel). */
export const studioBrandDeps: {
  copy?: (brief: string) => Promise<{ copy: unknown; qc: { verdict: string; remaining: string[] } }>;
  image?: (req: ImageRequestV2) => Promise<string | null>;
  compose?: (projectId: string, direction: string) => Promise<void>;
} = {};

export async function runStudioBrandJob(ctx: JobContext) {
  const a = ctx.payload as StudioBrandPayload;
  const p = loadProject(a.projectId);
  const cur = currentTheme(p.id);
  const direction = cur?.spec.direction;
  if (!cur || !direction) throw new UserFacingError(L("Aucun thème du Studio choisi : choisis d'abord ton thème.", "No Studio theme chosen yet."));
  const j = a.conversationId ? (() => { try { return journeyOf(a.conversationId!); } catch { return null; } })() : null;
  const brief = angleBrief(p, j);
  const report = { copy: "non réécrits", imagesMade: 0, imagesFailed: 0, problems: [] as string[] };
  const compose = async () => studioBrandDeps.compose ? studioBrandDeps.compose(p.id, direction) : void await (await import("../engine/shop")).switchDirection(ctx, p.id, direction as never);

  // 1) Textes de toute la boutique, dans l'angle choisi.
  if (a.copy !== false) {
    ctx.progress(0.05, L("Écriture des textes de ta boutique", "Writing your store copy"));
    const r = await ctx.step("copy", () => studioBrandDeps.copy ? studioBrandDeps.copy(brief)
      : withTrace({ jobId: ctx.job.id, projectId: p.id, step: "studio-copy", costCapMicro: a.capMicro }, () => aiShopCopyChecked({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, p, (m) => ctx.progress(0.1, m), (k, fn) => ctx.step(k, fn), brief || undefined)));
    remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(r.copy), source: "ai", status: "confirmed" });
    remember(p.id, { kind: "artifact", key: "shop_copy.syna", value: JSON.stringify({ angle: j?.angleChoice?.id ?? null, verdict: r.qc.verdict, at: Date.now() }), source: "ai", origin: "system" });
    report.copy = r.qc.verdict;
    if (r.qc.remaining.length) report.problems.push(`textes : ${r.qc.remaining.slice(0, 3).join(" ; ")}`);
  }
  // 2) Boutique recomposée avec les textes et les images du client déjà envoyées.
  ctx.progress(0.4, L("Mise en place dans ton thème", "Placing everything in your theme"));
  await compose();
  // 3) Images créées pour les emplacements encore vides (choix du client : « sina » ou « mix »).
  if (a.images !== "client") {
    const fresh = loadProject(p.id);
    const reqs = studioImageRequests(fresh);
    for (const [i, req] of reqs.entries()) {
      ctx.progress(0.45 + (0.45 * i) / Math.max(1, reqs.length), L(`Images : ${i + 1} sur ${reqs.length}`, `Images: ${i + 1} of ${reqs.length}`));
      try {
        const id = await ctx.step(`img:${req.themePlacement!.slotKey}`, async () => {
          if (studioBrandDeps.image) return studioBrandDeps.image(req);
          const { runImageEngineV2 } = await import("../image-v2/engine");
          const out = await runImageEngineV2(ctx, p.id, { ...req, maxCostEur: Math.max(0.05, a.capMicro / 1e6 / Math.max(1, reqs.length)) });
          return out.outcomes.find((o) => o.assetId && o.verdict === "FINAL")?.assetId ?? null;
        });
        if (id) report.imagesMade++; else { report.imagesFailed++; report.problems.push(`image ${req.themePlacement!.slotKey} : aucun visuel validé`); }
      } catch (e) { report.imagesFailed++; report.problems.push(`image ${req.themePlacement!.slotKey} : ${(e as Error).message.slice(0, 140)}`); }
    }
    if (report.imagesMade) { ctx.progress(0.92, L("Images posées dans ton thème", "Placing images")); await compose(); }
  }
  const needs = studioImageNeeds(p.id);
  if (needs?.missing) report.problems.push(`${needs.missing} emplacement(s) d'image encore vide(s)`);
  if (a.conversationId) { try { updateJourney(a.conversationId, (x) => setStep(x, 8, "review", L("thème du Studio monté à la marque, à voir dans la Boutique", "Studio theme built"))); } catch { /* fil supprimé */ } }
  notify(p.userId, p.id, report.problems.length ? L("Ton site est monté dans ton thème : des points restent à voir", "Your site is built: some points remain") : L("Ton site est monté dans ton thème, à ta marque", "Your site is built for your brand"), L("Il est en place dans l'onglet Boutique.", "It is in the Boutique tab."), report.problems.length ? "warning" : "success");
  return { ...report, images: needs };
}
