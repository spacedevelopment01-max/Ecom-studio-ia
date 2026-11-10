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
import { jobSpentMicro } from "./budget";
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
import { clientImages, COPY_CRAFT } from "./custom-theme/brand";
import { hasServicePlan, placeServiceImage, revealFilledSections, serviceMediaSlots, type ServiceSlot } from "../theme/service-media-plan";
import { saveThemeVersion } from "../projects";
import { withQuotedImageRoute } from "../ai/media-providers";
import { mockupImageRoute } from "./mockup-code/tools";

export const STUDIO_BRAND_JOB = "syna.studio.brand";
export type StudioBrandPayload = { projectId: string; capMicro: number; conversationId?: string | null; images: ImagesMode; copy?: boolean };

/** Direction de rédaction : l'angle choisi par le client et son émotion, à faire ressentir dans chaque texte. */
export function angleBrief(p: Project, j: Journey | null): string {
  if (!j) return "";
  const plan = (() => { try { return activityPlan(p.id, j); } catch { return null; } })();
  const a = plan?.angle, d = angleDetails(j, plan?.company);
  if (!a) return "";
  return [
    `Angle marketing choisi par le client : « ${a.title} »${a.goal ? ` (objectif : ${a.goal})` : ""}.`,
    d.emotion ? `Émotion à faire ressentir : ${d.emotion}. Chaque titre et chaque texte part d'une situation vécue, d'un désir ou d'un soulagement de la cliente ou du client ; les faits ne servent que de preuves.` : "",
    // Mêmes règles d'écriture que le thème sur mesure (retour du propriétaire du 9 novembre 2026) : l'accroche de l'angle
    // est une piste, jamais une formule recopiée partout ; un bouton porte le désir, jamais un ordre.
    a.message ? `Piste d'accroche de l'angle (au plus UNE fois, pour l'ouverture de l'accueil, et seulement si elle donne vraiment envie ; sinon écris mieux) : « ${a.message} ».` : "",
    a.cta ? `Piste pour le bouton principal (à garder seulement s'il porte le désir, sans ordre au lecteur) : « ${a.cta} ».` : "",
    d.story ? `Ce qu'on raconte : ${d.story}` : "",
    d.show ? `Ce qu'on montre : ${d.show}` : "",
    plan?.keyMessages.length ? `Messages clés : ${plan.keyMessages.map((m) => `« ${m} »`).join(" ; ")}.` : "",
    d.toConfirm?.length ? `NON confirmés, à ne JAMAIS affirmer : ${d.toConfirm.join(" ; ")}.` : "",
    COPY_CRAFT,
    "Même voix partout, aucun superlatif creux, aucun jargon de marketing visible (jamais « angle », « émotion », « preuve »).",
  ].filter(Boolean).join("\n");
}

/** Emplacements d'images du thème du Studio en place : total, déjà remplis, encore vides (à créer). */
export function studioImageNeeds(projectId: string): { total: number; filled: number; missing: number; requests: NonNullable<ReturnType<typeof adaptationOf>>["generationRequests"]; service?: ServiceSlot[]; /** Vides que SINA ne peut pas inventer (vraie photo du client seulement). */ toProvide?: number } | null {
  const plan = adaptationOf(projectId);
  // Thèmes de services sans plan d'emplacements : leur liste de photos (d'après leur démonstration).
  const cur = currentTheme(projectId);
  if (!plan && cur && hasServicePlan(cur.spec.direction)) {
    const slots = serviceMediaSlots(cur.spec);
    return { total: slots.length, filled: slots.filter((x) => x.filled).length, missing: slots.filter((x) => !x.filled).length, requests: [], service: slots, toProvide: slots.filter((x) => !x.filled && x.authentic).length };
  }
  if (!plan) return null;
  const slots = plan.slots.filter((s) => s.role !== "logo" && s.role !== "video");
  const images = plan.generationRequests.filter((r) => r.kind === "image");
  const requests = images.filter((r) => !AUTHENTIC_ROLES.has(r.role));
  // Comme pour les thèmes de services : « missing » compte tous les vides, « toProvide » ceux que seul le client peut remplir.
  return { total: slots.length, filled: slots.filter((s) => !!s.assetId).length, missing: images.length, requests, toProvide: images.length - requests.length };
}
function adaptationOf(projectId: string) {
  return currentTheme(projectId)?.spec.meta?.adaptation ?? null;
}

/**
 * Emplacements des thèmes à plan que SINA ne peut pas inventer : aucun depuis la décision du propriétaire du 10 novembre
 * 2026 (les réalisations sont créées quand le client n'en a pas assez ; l'équipe est traitée par les thèmes de services).
 */
const AUTHENTIC_ROLES = new Set<string>();

/** Demandes d'images pour les emplacements vides (même moteur et mêmes contrôles que « Préparer ce visuel »). */
export function studioImageRequests(p: Project): ImageRequestV2[] {
  const cur = currentTheme(p.id), plan = cur?.spec.meta?.adaptation;
  if (!cur || !plan) return [];
  let scene = 0;
  return plan.generationRequests.filter((r) => r.kind === "image" && !AUTHENTIC_ROLES.has(r.role)).map((r) => {
    const kind: ImageRequestV2["kind"] = r.role === "packshot" ? "packshot" : r.role === "detail" ? "product_image" : p.business === "services" ? "trade_photo" : "usage_scene";
    // Décision du propriétaire du 10 novembre 2026 : une scène sur deux met en scène le vrai produit, l'autre montre
    // l'univers lié au produit SANS lui (jamais une copie de ses photos produit).
    const without = kind === "usage_scene" && scene++ % 2 === 1;
    const topic = r.request.length <= 600 ? r.request : r.request.slice(0, 600);
    return {
    kind: without ? "ambiance" as const : kind,
    support: "site" as const,
    aspect: (["1:1", "4:5", "2:3", "3:2", "9:16", "16:9"].includes(r.aspect) ? r.aspect : "16:9") as AspectId,
    topic: without ? `${topic.slice(0, 420)}\nCette image ne montre PAS le produit : l'univers qui l'entoure (objets, matières, lieu, moment liés à ${p.product.name}), jamais une copie des photos du produit.` : topic,
    references: without ? [] : r.referenceAssetIds,
    slot: `theme:${r.role}:${r.key}`,
    themePlacement: { versionId: cur.version.id, slotKey: r.key, contextHash: plan.contextHash },
    noStock: true, allowGenerate: true, count: 1, peopleAllowed: false,
    name: `theme-${r.role}-${r.key}`.slice(0, 60),
  }; });
}

/**
 * Demandes d'images pour les emplacements vides d'un thème de services (photo du métier du client, sans personne).
 * Jamais pour une photo que SINA ne peut pas inventer (équipe, réalisations) : seule la vraie va là.
 */
export function serviceImageRequests(p: Project, slots: ServiceSlot[]): (ImageRequestV2 & { slotKey: string })[] {
  const what = p.business === "services" ? p.services.services.map((x) => x.name).join(", ") : p.product.name;
  return slots.filter((x) => !x.filled && !x.authentic).map((x) => ({
    slotKey: x.key,
    kind: p.business === "services" ? "trade_photo" : "usage_scene",
    support: "site", aspect: x.aspect,
    topic: [`Photo pour la page « ${x.template} » du site de ${p.brand?.name ?? p.name}${what ? ` (${what})` : ""}.`, x.shows ? `Même rôle que la photo de démonstration du thème (« ${x.shows} »), adaptée à ce métier et à cette marque.` : ""].filter(Boolean).join(" "),
    slot: `site:${x.key}`, noStock: true, allowGenerate: true, count: 1, peopleAllowed: false,
    name: `site-${x.key.replace(/[^a-z0-9]+/gi, "-")}`.slice(0, 60),
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
  // Plafond annoncé au client = plafond de TOUTE la tâche (textes puis images) : chaque image reçoit une part de ce qui
  // reste, jamais plus (audit du 10 novembre 2026 : les images recevaient chacune une part du plafond entier, en plus
  // de la rédaction, soit jusqu'à deux fois le devis).
  const left = () => Math.max(0, a.capMicro - jobSpentMicro(ctx.job.id));
  const imageBudgetEur = (remaining: number) => left() / 1e6 / Math.max(1, remaining);
  const MIN_IMAGE_EUR = 0.05;
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
  // 3bis) Thèmes de services (liste de photos d'après la démonstration) : ses images d'abord, puis celles créées.
  const svcCur = currentTheme(p.id);
  if (svcCur && !svcCur.spec.meta?.adaptation && hasServicePlan(svcCur.spec.direction)) {
    const spec = JSON.parse(JSON.stringify(svcCur.spec));
    // Ses images vont d'abord aux photos que SINA ne peut pas inventer (seules les vraies y ont leur place).
    const empty = serviceMediaSlots(spec).filter((x) => !x.filled).sort((x, y) => Number(!!y.authentic) - Number(!!x.authentic));
    const used = new Set(Object.values<string>(spec.files ?? {}));
    // Même quand le client laisse SINA créer les images, ses vraies photos vont aux emplacements qu'elle ne peut pas
    // inventer (équipe, biens, réalisations) : sinon ils resteraient vides alors qu'il les a envoyées.
    const own = clientImages(p.id).map((x) => x.id).filter((id) => !used.has(id));
    let placed = 0, i = 0, toProvide = 0;
    for (const slot of empty) {
      if (i < own.length && (slot.authentic || a.images !== "sina")) { placeServiceImage(spec, slot, own[i++]); placed++; continue; }
      if (slot.authentic) { toProvide++; continue; }
      if (a.images === "client") { report.problems.push(`photo ${slot.key} : aucune image du client pour cet emplacement`); continue; }
      const remainingSlots = empty.length - empty.indexOf(slot);
      if (!studioBrandDeps.image && imageBudgetEur(remainingSlots) < MIN_IMAGE_EUR) { report.problems.push(`image ${slot.key} : plafond annoncé atteint, image non créée`); continue; }
      const req = serviceImageRequests(loadProject(p.id), [slot])[0];
      ctx.progress(0.45 + (0.45 * placed) / Math.max(1, empty.length), L(`Images : ${placed + 1} sur ${empty.length}`, `Images: ${placed + 1} of ${empty.length}`));
      try {
        const id = await ctx.step(`svc:${slot.key}`, async () => {
          if (studioBrandDeps.image) return studioBrandDeps.image(req);
          const { runImageEngineV2 } = await import("../image-v2/engine");
          // Images des thèmes : OpenAI (décision du propriétaire du 10 novembre 2026), la même route qu'au devis.
          const out = await withQuotedImageRoute(mockupImageRoute(), () => runImageEngineV2(ctx, p.id, { ...req, maxCostEur: imageBudgetEur(remainingSlots) }));
          return out.outcomes.find((o) => o.assetId && o.verdict === "FINAL")?.assetId ?? null;
        });
        if (id) { placeServiceImage(spec, slot, id); placed++; report.imagesMade++; } else { report.imagesFailed++; report.problems.push(`image ${slot.key} : aucun visuel validé`); }
      } catch (e) { report.imagesFailed++; report.problems.push(`image ${slot.key} : ${(e as Error).message.slice(0, 140)}`); }
    }
    if (toProvide) report.problems.push(`${toProvide} photo(s) à fournir par toi : SINA ne peut pas inventer ton équipe ni tes réalisations (un cadre l'explique à leur place dans l'aperçu)`);
    if (placed) revealFilledSections(spec);
    if (placed) saveThemeVersion(p.id, spec, L(`Photos posées dans le thème (${placed}) — SINA, étape 8`, `Photos placed (${placed}) — SINA, step 8`), "ai", { syna: { step: 8, photos: placed } }, undefined, { activate: true });
  }
  // 3) Images créées pour les emplacements encore vides (choix du client : « sina » ou « mix »).
  else if (a.images !== "client") {
    const fresh = loadProject(p.id);
    const reqs = studioImageRequests(fresh);
    for (const [i, req] of reqs.entries()) {
      if (!studioBrandDeps.image && imageBudgetEur(reqs.length - i) < MIN_IMAGE_EUR) { report.imagesFailed++; report.problems.push(`image ${req.themePlacement!.slotKey} : plafond annoncé atteint, image non créée`); continue; }
      ctx.progress(0.45 + (0.45 * i) / Math.max(1, reqs.length), L(`Images : ${i + 1} sur ${reqs.length}`, `Images: ${i + 1} of ${reqs.length}`));
      try {
        const id = await ctx.step(`img:${req.themePlacement!.slotKey}`, async () => {
          if (studioBrandDeps.image) return studioBrandDeps.image(req);
          const { runImageEngineV2 } = await import("../image-v2/engine");
          const out = await withQuotedImageRoute(mockupImageRoute(), () => runImageEngineV2(ctx, p.id, { ...req, maxCostEur: imageBudgetEur(reqs.length - i) }));
          return out.outcomes.find((o) => o.assetId && o.verdict === "FINAL")?.assetId ?? null;
        });
        if (id) report.imagesMade++; else { report.imagesFailed++; report.problems.push(`image ${req.themePlacement!.slotKey} : aucun visuel validé`); }
      } catch (e) { report.imagesFailed++; report.problems.push(`image ${req.themePlacement!.slotKey} : ${(e as Error).message.slice(0, 140)}`); }
    }
    if (report.imagesMade) { ctx.progress(0.92, L("Images posées dans ton thème", "Placing images")); await compose(); }
  }
  const needs = studioImageNeeds(p.id);
  if (needs?.missing) report.problems.push(`${needs.missing} emplacement(s) d'image encore vide(s)`);
  if (needs?.toProvide && !needs.service) report.problems.push(`${needs.toProvide} photo(s) de tes réalisations à fournir par toi : SINA ne peut pas les inventer`);
  if (a.conversationId) { try { updateJourney(a.conversationId, (x) => setStep(x, 8, "review", L("thème du Studio monté à la marque, à voir dans la Boutique", "Studio theme built"))); } catch { /* fil supprimé */ } }
  notify(p.userId, p.id, report.problems.length ? L("Ton site est monté dans ton thème : des points restent à voir", "Your site is built: some points remain") : L("Ton site est monté dans ton thème, à ta marque", "Your site is built for your brand"), L("Il est en place dans l'onglet Boutique.", "It is in the Boutique tab."), report.problems.length ? "warning" : "success");
  return { ...report, images: needs };
}
