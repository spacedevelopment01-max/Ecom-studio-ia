import { all, one } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { enqueue, publicJob, type Job } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { assertCanSpend } from "@/lib/billing";
import { currentTheme } from "@/lib/projects";
import { L } from "@/lib/i18n-server";
import { llmConfigured } from "@/lib/ai/llm";
import { runForUser } from "@/lib/ai/access";
import { estimateMicro } from "@/lib/ai/estimate";
import { assertFullyCustomTheme, customThemeAccess, sectionGenerationAllowed } from "@/lib/theme/custom-access";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

const activeJob = (projectId: string) => one<Job>("SELECT * FROM jobs WHERE project_id = ? AND type = 'theme.custom' AND status IN ('queued','running','paused','blocked') ORDER BY created_at DESC LIMIT 1", projectId);

/** État du thème entièrement sur mesure : accès selon le forfait, tâche en cours, dernier résultat. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const access = customThemeAccess(user);
  const cur = currentTheme(p.id);
  const last = one<Job>("SELECT * FROM jobs WHERE project_id = ? AND type = 'theme.custom' AND status IN ('done','failed') ORDER BY created_at DESC LIMIT 1", p.id);
  return ok({
    ...access,
    sectionsAllowed: sectionGenerationAllowed(user),
    ai: await runForUser(user.id, async () => llmConfigured()),
    hasTheme: !!cur,
    imported: !!cur?.spec.imported,
    job: (() => {
      const j = activeJob(p.id);
      return j ? publicJob(j) : null;
    })(),
    last: last ? publicJob(last) : null,
  });
});

/** Lance la création du thème entièrement sur mesure (forfait Dominer). */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  // Une création déjà en cours (ou en pause) pour ce projet : on la renvoie au lieu d'en lancer une deuxième.
  const running = activeJob(p.id);
  if (running) return ok({ jobId: running.id, job: publicJob(running) });
  assertFullyCustomTheme(user);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Créez d'abord la boutique : le thème sur mesure part de votre marque et de vos textes.", "Build the store first: the custom theme starts from your brand and copy."));
  if (cur.spec.imported) throw new HttpError(409, L("Votre thème importé est conservé tel quel : le thème entièrement sur mesure se crée à partir d'un thème du studio. Choisissez d'abord un thème dans « Thèmes ».", "Your imported theme is kept as is: the fully custom theme is built from a studio theme. Pick a theme in “Themes” first."));
  if (!(await runForUser(user.id, async () => llmConfigured()))) throw new HttpError(402, L("Le thème entièrement sur mesure est écrit par l'IA, indisponible pour le moment. Réessayez un peu plus tard.", "The fully custom theme is written by AI, which is unavailable right now. Try again a little later."));
  // Plusieurs sections écrites par l'IA : on vérifie d'abord que l'utilisation équitable du mois le permet.
  try {
    if (user.role !== "admin") assertCanSpend(user.id, estimateMicro("theme-custom"));
  } catch (e) {
    throw new HttpError(402, (e as Error).message);
  }
  // Idempotence : deux clics simultanés sur la même version ne créent qu'une tâche.
  const n = all<{ id: string }>("SELECT id FROM jobs WHERE project_id = ? AND type = 'theme.custom'", p.id).length;
  const job = enqueue({
    userId: user.id,
    projectId: p.id,
    type: "theme.custom",
    label: L("Thème entièrement sur mesure", "Fully custom theme"),
    payload: { projectId: p.id, fromVersion: cur.version.id },
    idempotencyKey: `theme.custom:${p.id}:${cur.version.id}:${n}`,
    maxAttempts: 3,
  });
  return ok({ jobId: job.id, job: publicJob(job) });
});
