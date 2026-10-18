import { startPreparation } from '@/lib/preparation/start';
import { stateOf } from '@/lib/preparation/store';
import { requireUser, HttpError } from "@/lib/auth";
import { all, id, now, one, run } from "@/lib/db";
import { attachStartRequest } from "@/lib/workflow";
import { handle, ok, readForm } from "@/lib/http";
import { ensureFolders } from "@/lib/library";
import { existingSiteFromInput, hasProductInput, launchPipeline, readStartForm, saveStartFiles, serviceProfileFromInput } from "@/lib/project-start";
import { aiUsage } from "@/lib/ai/access";
import { createProjectWithSubscription, NoFreeSubscription, pendingSubscriptions, subscriptionOfProject, subscriptionsOf } from "@/lib/project-billing";
import { DEFAULT_SETTINGS } from "@/lib/projects";
import { L, setProjectContentLang, uiLang } from "@/lib/i18n-server";

export const runtime = "nodejs";

/**
 * « Mes projets » : chaque projet avec son abonnement (forfait, statut, échéance, budget IA en %), les abonnements
 * payés en attente de création de projet, et les projets masqués (ancienne découverte) qu'un abonnement peut reprendre.
 */
export const GET = handle(async () => {
  const user = await requireUser();
  const rows = all<any>(
    `SELECT p.id, p.name, p.status, p.platform, p.sector, p.brand_json, p.business_type, p.hidden, p.updated_at, p.created_at,
       (SELECT id FROM assets a WHERE a.project_id = p.id AND a.role IN ('scene','packshot','lifestyle','banner','cutout','original') AND a.deleted_at IS NULL AND a.status != 'rejected' ORDER BY CASE a.role WHEN 'scene' THEN 0 WHEN 'packshot' THEN 1 WHEN 'lifestyle' THEN 2 WHEN 'banner' THEN 3 WHEN 'cutout' THEN 4 ELSE 5 END, a.created_at DESC LIMIT 1) AS cover
     FROM projects p WHERE p.user_id = ? AND p.archived = 0 ORDER BY p.updated_at DESC`,
    user.id,
  );
  const card = (r: any) => {
    const b = r.brand_json ? JSON.parse(r.brand_json) : {};
    const sub = subscriptionOfProject(r.id);
    return {
      id: r.id,
      name: r.name,
      status: r.status,
      sector: r.sector,
      platform: r.platform,
      business: r.business_type === "services" ? "services" : "products",
      updatedAt: r.updated_at,
      cover: r.cover ? `/api/files/${r.cover}?thumb=1` : null,
      palette: b.palette ?? null,
      brand: b.name ?? null,
      logo: b.logo?.chosen ? `/api/projects/${r.id}/brand/logo` : null,
      subscription: sub ? { id: sub.user_id, plan: sub.plan ?? "creer", status: sub.status, billing: sub.billing, periodEnd: sub.current_period_end, cancelAtPeriodEnd: !!sub.cancel_at_period_end } : null,
      ai: sub ? aiUsage(user.id, r.id) : null,
    };
  };
  return ok({
    projects: rows.filter((r) => !r.hidden).map(card),
    hidden: rows.filter((r) => r.hidden).map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at })),
    pending: pendingSubscriptions(user.id).map((s) => ({ id: s.user_id, plan: s.plan ?? "creer", billing: s.billing, status: s.status, createdAt: s.created_at })),
    subscriptions: subscriptionsOf(user.id).length,
  });
});

/**
 * Création d'un projet. Avec une photo, un lien ou une description, le pilote démarre aussitôt ;
 * sans rien, le projet est créé « à démarrer » et l'entrée produit s'ajoute plus tard dans le studio.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { input, files, logo } = readStartForm(await readForm(req, 260 * 1048576));
  // « J'ai déjà mon site et mon logo » : adresse et accord vérifiés ; type d'activité et plateforme fixés après lecture du site.
  const site = existingSiteFromInput(input);
  const services = !site && input.businessType === "services" ? serviceProfileFromInput(input) : null;
  // Site de services : la description de l'activité ou le lien du site existant est indispensable.
  if (input.flow === "legacy" && services && !hasProductInput(input, files)) throw new HttpError(400, L("Décrivez votre activité en quelques lignes ou indiquez le lien de votre site actuel.", "Describe your business in a few lines or give the link to your current website."));
  // UN ABONNEMENT = UN PROJET : il faut un abonnement payé pas encore rattaché (« en attente de création de projet »).
  // Supprimer, archiver ou dupliquer un projet ne libère jamais son abonnement (rattachement définitif en base).
  const wanted = new URL(req.url).searchParams.get("subscription");
  if (!pendingSubscriptions(user.id).length) {
    throw new HttpError(
      402,
      L("Chaque abonnement E-COM STUDIO IA est associé à un seul projet. Pour créer une nouvelle activité, choisissez un nouvel abonnement.", "Each E-COM STUDIO IA subscription is tied to a single project. To create a new business, choose a new subscription."),
      "subscription_required",
    );
  }
  const pid = id();
  const language = input.language ?? uiLang();
  setProjectContentLang(language);
  try {
    createProjectWithSubscription(user.id, wanted, () => {
      run(
        "INSERT INTO projects (id, user_id, name, status, platform, store_type, business_type, business_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        pid,
        user.id,
        input.productName || input.brandName || (site ? new URL(site.url).hostname.replace(/^www\./, "") : L("Nouveau projet", "New project")),
        "draft",
        site ? "shopify" : input.platform,
        site ? "mono" : input.storeType,
        site ? "products" : input.businessType,
        services ? JSON.stringify(services) : "{}",
        JSON.stringify({ ...DEFAULT_SETTINGS, mode: input.mode, timezone: user.timezone, language, ...(site ? { existingSite: { url: site.url, status: "pending" } } : {}) }),
        "[]",
        now(),
        now(),
      );
      return { projectId: pid, result: pid };
    });
  } catch (e) {
    // Abonnement déjà utilisé entre-temps (deux créations simultanées) : rien n'est créé.
    if (e instanceof NoFreeSubscription) throw new HttpError(409, L("Cet abonnement vient d'être utilisé pour un autre projet. Chaque abonnement finance un seul projet.", "This subscription was just used for another project. Each subscription funds a single project."), "subscription_required");
    throw e;
  }
  ensureFolders(pid);
  await saveStartFiles(pid, user.id, site ? [] : files, logo, site ? "products" : input.businessType);
  if (input.flow === "preparation") {
    startPreparation(pid,input);
    return ok({id:pid,jobId:null,started:true,preparation:true});
  }
  if (!hasProductInput(input, files)) return ok({ id: pid, jobId: null, started: false });
  const job = launchPipeline(pid, user.id, input, files.length);
  if (input.request) await attachStartRequest(pid, user.id, input.request, job.id);
  return ok({ id: pid, jobId: job.id, started: true });
});
