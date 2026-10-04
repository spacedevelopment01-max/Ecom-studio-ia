import { requireUser, HttpError } from "@/lib/auth";
import { all, id, now, one, run } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { ensureFolders } from "@/lib/library";
import { hasProductInput, launchPipeline, readStartForm, saveStartFiles, serviceProfileFromInput } from "@/lib/project-start";
import { getSubscription, subscriptionActive } from "@/lib/billing";
import { DEFAULT_SETTINGS } from "@/lib/projects";
import { L, setProjectContentLang, uiLang } from "@/lib/i18n-server";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requireUser();
  const rows = all<any>(
    `SELECT p.id, p.name, p.status, p.platform, p.sector, p.brand_json, p.business_type, p.updated_at, p.created_at,
       (SELECT id FROM assets a WHERE a.project_id = p.id AND a.role IN ('scene','packshot','lifestyle','banner','cutout','original') AND a.deleted_at IS NULL ORDER BY CASE a.role WHEN 'scene' THEN 0 WHEN 'packshot' THEN 1 WHEN 'lifestyle' THEN 2 WHEN 'banner' THEN 3 WHEN 'cutout' THEN 4 ELSE 5 END, a.created_at DESC LIMIT 1) AS cover
     FROM projects p WHERE p.user_id = ? AND p.archived = 0 ORDER BY p.updated_at DESC`,
    user.id,
  );
  const sub = getSubscription(user.id);
  return ok({
    projects: rows.map((r) => {
      const b = r.brand_json ? JSON.parse(r.brand_json) : {};
      return { id: r.id, name: r.name, status: r.status, sector: r.sector, platform: r.platform, business: r.business_type === "services" ? "services" : "products", updatedAt: r.updated_at, cover: r.cover ? `/api/files/${r.cover}?thumb=1` : null, palette: b.palette ?? null, brand: b.name ?? null };
    }),
    subscription: { status: sub.status, stores: sub.stores },
  });
});

/**
 * Création d'un projet. Avec une photo, un lien ou une description, le pilote démarre aussitôt ;
 * sans rien, le projet est créé « à démarrer » et l'entrée produit s'ajoute plus tard dans le studio.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { input, files, logo } = readStartForm(await req.formData());
  const services = input.businessType === "services" ? serviceProfileFromInput(input) : null;
  // Site de services : la description de l'activité ou le lien du site existant est indispensable.
  if (services && !hasProductInput(input, files)) throw new HttpError(400, L("Décrivez votre activité en quelques lignes ou indiquez le lien de votre site actuel.", "Describe your business in a few lines or give the link to your current website."));
  // Nombre de boutiques : limité par l'abonnement (une boutique d'essai sans abonnement).
  const sub = getSubscription(user.id);
  const count = one<{ n: number }>("SELECT COUNT(*) n FROM projects WHERE user_id = ? AND archived = 0", user.id)!.n;
  const allowed = subscriptionActive(sub) ? sub.stores : 1;
  if (count >= allowed && user.role !== "admin") {
    throw new HttpError(402, subscriptionActive(sub) ? L(`Votre abonnement couvre ${allowed} boutique(s). Ajoutez une boutique (40 €/mois) dans votre compte.`, `Your subscription covers ${allowed} store(s). Add a store (€40/month) in your account.`) : L("Le compte d'essai comprend une boutique. Abonnez-vous pour en gérer plusieurs.", "The trial account includes one store. Subscribe to manage more."));
  }
  const pid = id();
  const language = input.language ?? uiLang();
  setProjectContentLang(language);
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, store_type, business_type, business_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    pid,
    user.id,
    input.productName || input.brandName || L("Nouveau projet", "New project"),
    "draft",
    input.platform,
    input.storeType,
    input.businessType,
    services ? JSON.stringify(services) : "{}",
    JSON.stringify({ ...DEFAULT_SETTINGS, mode: input.mode, timezone: user.timezone, language }),
    "[]",
    now(),
    now(),
  );
  ensureFolders(pid);
  await saveStartFiles(pid, user.id, files, logo, input.businessType);
  if (!hasProductInput(input, files)) return ok({ id: pid, jobId: null, started: false });
  const job = launchPipeline(pid, user.id, input, files.length);
  return ok({ id: pid, jobId: job.id, started: true });
});
