/** Démarrage de la création d'un projet : enregistrement des entrées (photos, lien, description) puis lancement du pilote. */
import { z } from "zod";
import { HttpError } from "./auth";
import { json, now, one, run } from "./db";
import { enqueue } from "./jobs";
import { saveAsset } from "./library";
import { setStatus } from "./projects";

export const MAX_FILE = 25 * 1024 * 1024;

export const StartInput = z.object({
  link: z.string().url().optional().or(z.literal("")),
  description: z.string().max(8000).optional(),
  productName: z.string().max(120).optional(),
  brandName: z.string().max(80).optional(),
  price: z.string().max(40).optional(),
  platform: z.enum(["shopify", "woocommerce", "prestashop", "wix", "squarespace"]).default("shopify"),
  mode: z.enum(["autopilot", "guided"]).default("autopilot"),
  storeType: z.enum(["mono", "multi", "niche"]).default("mono"),
  /** Langue des contenus du projet (par défaut : celle de l'interface). */
  language: z.enum(["fr", "en"]).optional(),
});
export type StartInput = z.infer<typeof StartInput>;

export function readStartForm(form: FormData) {
  const input = StartInput.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const logo = form.get("logo");
  return { input, files, logo: logo && typeof logo !== "string" && logo.size > 0 ? logo : null };
}

export const hasProductInput = (input: StartInput, files: File[]) => files.length > 0 || !!input.link || !!(input.description && input.description.trim().length > 10);

/** Enregistre les photos et le logo fournis. */
export async function saveStartFiles(projectId: string, userId: string, files: File[], logo: File | null) {
  for (const [i, f] of files.slice(0, 8).entries()) {
    if (f.size > MAX_FILE) throw new HttpError(413, `La photo « ${f.name} » dépasse 25 Mo.`);
    if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(f.type)) throw new HttpError(415, `Format non pris en charge pour « ${f.name} » (JPEG, PNG, WebP, AVIF).`);
    await saveAsset({ projectId, userId, data: Buffer.from(await f.arrayBuffer()), name: f.name || `photo-${i + 1}.jpg`, mime: f.type, role: "original", folderKey: "product.originals", origin: "upload", meta: { uploadedAt: now() } });
  }
  if (logo) {
    await saveAsset({ projectId, userId, data: Buffer.from(await logo.arrayBuffer()), name: logo.name || "logo.png", mime: logo.type, kind: "image", role: "logo", folderKey: "brand.logos", origin: "upload", meta: { provided: true } });
  }
}

/** Lance le pilote complet sur un projet (photos déjà enregistrées comme originaux). */
export function launchPipeline(projectId: string, userId: string, input: StartInput, photoCount: number) {
  const prev = json<{ type: string; ref: string }[]>(one<{ sources_json: string }>("SELECT sources_json FROM projects WHERE id = ?", projectId)?.sources_json, []);
  const sources = [...prev, ...(photoCount ? [{ type: "photo", ref: `${photoCount} photo(s)` }] : []), ...(input.link ? [{ type: "link", ref: input.link }] : []), ...(input.description ? [{ type: "description", ref: "description du client" }] : [])];
  run("UPDATE projects SET sources_json = ?, updated_at = ? WHERE id = ?", JSON.stringify(sources), now(), projectId);
  if (input.productName || input.brandName) run("UPDATE projects SET name = ? WHERE id = ?", input.productName || input.brandName, projectId);
  setStatus(projectId, "queued");
  return enqueue({ userId, projectId, type: "pipeline.run", label: "Création du projet", payload: { projectId, mode: input.mode, input: { link: input.link || undefined, description: input.description, productName: input.productName, brandName: input.brandName, price: input.price } }, maxAttempts: 2 });
}
