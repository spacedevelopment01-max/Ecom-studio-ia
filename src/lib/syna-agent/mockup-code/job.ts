/**
 * SINA (#492), étape 7 : tâche de fond « syna.mockup.code » (reprenable : lecture, écriture et comparaisons ont leurs
 * points de reprise ; une reprise ne repaie rien de ce qui est fait). Le site codé est enregistré comme NOUVELLE
 * VERSION INACTIVE du thème, avec son rapport : le client la regarde et décide (site.use_version) ; le site courant
 * ne change pas. Le rapport est aussi gardé dans la mémoire du projet (artefact `syna.step7.report`).
 */
import { L } from "../../i18n-server";
import { UserFacingError, type JobContext } from "../../jobs";
import { currentTheme, loadProject, notify, remember, saveThemeVersion, themeVersion } from "../../projects";
import { validateSpec } from "../../theme/ops";
import { withTrace } from "../../ai/trace";
import { setStep, updateJourney } from "../journey";
import { realStep7Deps, step7CallMaxMicro } from "./deps";
import { loadMockupSet } from "./mockup-set";
import { runStep7, type Step7Deps, type Step7Report } from "./pipeline";

import { loadSiteCopy } from "./copy";
import { siteSchemes } from "../../engine/site-reproduce";
import { cloneSpec, type ThemeSpec } from "../../theme/spec";
import type { Project } from "../../projects";
import { saveAsset } from "../../library";
import { getJsonSetting } from "../../settings";
import type { DirectionId } from "../../theme/directions";
export const MOCKUP_CODE_JOB = "syna.mockup.code";
export const STEP7_REPORT_KEY = "syna.step7.report";

export type MockupCodePayload = { projectId: string; direction: "A" | "B" | "C"; capMicro: number; maxRounds?: number; conversationId?: string | null; pages?: string[] };

/** Remplaçables par les tests (aucun appel réel) : dépendances du déroulé et thème de départ. */
export const mockupCodeJobDeps: {
  deps?: (o: Parameters<typeof realStep7Deps>[0]) => Step7Deps & { close?(): Promise<void> };
  callMaxMicro?: typeof step7CallMaxMicro;
} = {};

/**
 * Thème de départ : le site courant, sinon le site natif préparé gratuitement (pages, produits, menus, sans IA). Un
 * projet parti d'une maquette n'a pas de thème (essai réel du 8 novembre : « choisissez un thème de la galerie avant de
 * composer ce projet ») : le squelette est pris dans le thème de la galerie qui met le mieux en scène son offre
 * (réglage « syna.step7.base_direction » pour l'imposer) ; seule sa structure sert, le design vient de la maquette.
 */
async function baseVersionId(projectId: string): Promise<string> {
  const cur = currentTheme(projectId);
  if (cur) return cur.version.id;
  const { buildShop } = await import("../../engine/shop");
  const { themeChoices } = await import("../themes");
  const forced = getJsonSetting<string>("syna.step7.base_direction", "");
  const direction = (forced || themeChoices(projectId).list[0]?.id || undefined) as DirectionId | undefined;
  const r = await buildShop(null, projectId, { useAi: false, prepareOnly: true, ...(direction ? { direction } : {}) });
  return r.versionId;
}

/**
 * Couleurs, polices et logo de la charte posés sur le thème de départ (essai réel du 8 novembre : l'accueil de Brindi
 * codé en bleu, couleurs du thème qui sert de squelette, logo absent). Les sections codées passent par ces variables.
 */
export function withBrand(spec: ThemeSpec, p: Project): ThemeSpec {
  const out = cloneSpec(spec);
  const b = p.brand;
  if (!b) return out;
  const settings = out.settings as Record<string, unknown>;
  if (b.palette) settings.color_schemes = siteSchemes(b.palette);
  if (b.fonts?.heading) settings.type_heading_font = b.fonts.heading;
  if (b.fonts?.body) settings.type_body_font = b.fonts.body;
  return out;
}

export async function runMockupCodeJob(ctx: JobContext) {
  const a = ctx.payload as MockupCodePayload;
  const p = loadProject(a.projectId);
  const set = loadMockupSet(p.id);
  const d = set?.directions.find((x) => x.key === a.direction);
  if (!set || !d) throw new UserFacingError(L("Maquette introuvable : préparez et choisissez d'abord une maquette (étape 6).", "Mockup not found: prepare and choose a mockup first (step 6)."));
  const units = (mockupCodeJobDeps.callMaxMicro ?? step7CallMaxMicro)(p.userId);
  if (!units) throw new UserFacingError(L("Le coût des appels n'a pas pu être encadré (modèle ou tarif inconnu) : aucun appel n'a été fait.", "The call cost could not be bounded: no call was made."));
  ctx.progress(0.02, L("Préparation du thème de départ", "Preparing the base theme"));
  const baseId = await ctx.step("base", () => baseVersionId(p.id));
  const base0 = themeVersion(p.id, baseId)?.spec;
  if (!base0) throw new UserFacingError(L("Thème de départ introuvable.", "Base theme not found."));
  const base = withBrand(base0, p);
  const options = { project: p, jobId: ctx.job.id, usageKey: ctx.job.id, step: <T,>(k: string, fn: () => Promise<T>) => ctx.step(k, fn), done: (k: string) => k in ctx.checkpoint, callMaxMicro: units };
  const deps = { ...(mockupCodeJobDeps.deps ?? realStep7Deps)(options), progress: (f: number, m: string) => ctx.progress(0.05 + f * 0.9, m) };
  try {
    const { spec, report } = await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "mockup-code", costCapMicro: a.capMicro }, () =>
      runStep7({ direction: a.pages?.length ? { ...d, images: d.images.filter((i) => i.pages.some((k) => a.pages!.includes(k))) } : d, pages: a.pages?.length ? set.pages.filter((x) => a.pages!.includes(x.key)) : set.pages, base, options: { costCapMicro: a.capMicro, maxRounds: a.maxRounds }, copy: loadSiteCopy(p.id)?.pages ?? null }, deps));
    // Rien d'écrit du tout (plafond atteint avant la première écriture) : aucune version vide n'est enregistrée
    // (essai réel du 8 novembre : une reprise sans budget a produit une version 5 vide).
    if (report.pages.every((x) => !x.written.length && !x.library.length) && report.stoppedBy === "budget") throw new UserFacingError(L("Plafond atteint avant d'écrire la moindre section : rien n'a été enregistré, le site précédent reste tel quel.", "Cost cap reached before writing anything: nothing was saved."));
    const problems = validateSpec(spec);
    if (problems.length) throw new UserFacingError(L(`Le thème codé ne passe pas la validation : ${problems.slice(0, 3).join(" ; ")}. Le site courant n'a pas changé.`, `The coded theme fails validation. The current site hasn't changed.`));
    const v = saveThemeVersion(p.id, spec, L(`${a.pages?.length ? `Pages ${a.pages.join(", ")} codées` : "Site codé"} d'après la maquette ${d.key} « ${d.name} » (SINA, étape 7)`, `Site coded from mockup ${d.key} (SINA, step 7)`), "ai", { syna: { step: 7, direction: d.key, ok: report.ok, summary: report.summary } }, undefined, { activate: false });
    // Captures du site codé (gratuites) : montrées à SINA à côté de la maquette (essai réel du 8 novembre : « je n'ai pas
    // pu voir le rendu du site codé »), rangées dans les Fichiers.
    const captures: { page: string; viewport: "desktop" | "phone"; assetId: string }[] = [];
    for (const pr of report.pages.filter((x) => x.path).slice(0, 4)) {
      for (const [vp, w] of [["desktop", 1440], ["phone", 390]] as const) {
        try {
          const shot = await deps.screenshot({ spec, path: pr.path!, width: w });
          if (!shot) continue;
          const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: shot.image, name: `site-code-${pr.key}-${vp}.jpg`, mime: "image/jpeg", role: "site-capture", origin: "generated", meta: { synaStep7: { versionId: v.id, page: pr.key, viewport: vp } } });
          captures.push({ page: pr.key, viewport: vp, assetId: asset.id });
        } catch { /* capture impossible : le rapport le dit déjà (non vérifiée) */ }
      }
    }
    remember(p.id, { kind: "artifact", key: STEP7_REPORT_KEY, value: JSON.stringify({ versionId: v.id, number: v.number, direction: d.key, report, captures }), source: "local", origin: "system" });
    if (a.conversationId) {
      try { updateJourney(a.conversationId, (j) => setStep(j, 7, "review", report.summary.slice(0, 300))); } catch { /* fil supprimé : le rapport reste dans le projet */ }
    }
    notify(p.userId, p.id, report.ok ? L("Votre site codé d'après la maquette est prêt", "Your site coded from the mockup is ready") : L("Site codé d'après la maquette : des points restent à corriger", "Site coded from the mockup: some points remain"), report.summary.slice(0, 200), report.ok ? "success" : "warning");
    return { versionId: v.id, number: v.number, ok: report.ok, summary: report.summary, pages: compactPages(report) };
  } finally {
    await deps.close?.();
  }
}

/** Résumé court du rapport (résultat de la tâche, relu par SINA). */
export const compactPages = (r: Step7Report) => r.pages.map((x) => ({ page: x.key, statut: x.status, note: x.scores.length ? Math.max(...x.scores.map((s) => s.score)) : null, ecarts: x.differences.slice(0, 3), seo: x.seo.slice(0, 3), liens: x.brokenLinks.slice(0, 3) }));

/** Gestionnaire à enregistrer dans worker/handlers.ts. */
export const mockupCodeHandlers: Record<string, (ctx: JobContext) => Promise<unknown>> = {
  [MOCKUP_CODE_JOB]: (ctx) => runMockupCodeJob(ctx),
};
