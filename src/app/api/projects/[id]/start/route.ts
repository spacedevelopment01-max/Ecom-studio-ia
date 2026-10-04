import { HttpError } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { hasProductInput, launchPipeline, readStartForm, saveStartFiles, serviceProfileFromInput } from "@/lib/project-start";
import { saveServices } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

/** Démarre la création d'un projet créé sans entrée produit (photo, lien ou description ajoutés maintenant). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'pipeline.run' AND status IN ('queued','running','paused')", p.id)) {
    throw new HttpError(409, L("Une création est déjà en cours pour ce projet.", "A creation is already in progress for this project."));
  }
  const form = await req.formData();
  const { input, files, logo } = readStartForm(form);
  // Le type de projet choisi au démarrage (boutique ou services) remplace celui de la création.
  const business = form.get("businessType") ? input.businessType : p.business;
  const existing = business === "services" ? 0 : one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'original' AND deleted_at IS NULL", p.id)!.n;
  if (business === "services" && !hasProductInput({ ...input, businessType: "services" }, files)) throw new HttpError(400, L("Décrivez votre activité en quelques lignes ou indiquez le lien de votre site actuel.", "Describe your business in a few lines or give the link to your current website."));
  if (!hasProductInput(input, files) && !existing) throw new HttpError(400, L("Ajoutez au moins une photo, un lien ou une description de quelques lignes.", "Add at least a photo, a link or a description of a few lines."));
  if (form.get("businessType")) {
    run("UPDATE projects SET business_type = ? WHERE id = ?", business, p.id);
    if (business === "services") saveServices(p.id, serviceProfileFromInput(input));
  }
  if (input.platform && form.get("platform")) run("UPDATE projects SET platform = ? WHERE id = ?", input.platform, p.id);
  await saveStartFiles(p.id, user.id, files, logo, business);
  if (form.get("storeType")) run("UPDATE projects SET store_type = ? WHERE id = ?", input.storeType, p.id);
  const job = launchPipeline(p.id, user.id, input, files.length || existing);
  return ok({ jobId: job.id });
});
