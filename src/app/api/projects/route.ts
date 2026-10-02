import { z } from "zod";
import { requireUser, HttpError } from "@/lib/auth";
import { all, id, now, one, run } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { ensureFolders, saveAsset } from "@/lib/library";
import { getSubscription, subscriptionActive } from "@/lib/billing";
import { DEFAULT_SETTINGS } from "@/lib/projects";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requireUser();
  const rows = all<any>(
    `SELECT p.id, p.name, p.status, p.platform, p.sector, p.brand_json, p.updated_at, p.created_at,
       (SELECT id FROM assets a WHERE a.project_id = p.id AND a.role IN ('scene','packshot','cutout','original') AND a.deleted_at IS NULL ORDER BY CASE a.role WHEN 'scene' THEN 0 WHEN 'packshot' THEN 1 WHEN 'cutout' THEN 2 ELSE 3 END, a.created_at DESC LIMIT 1) AS cover
     FROM projects p WHERE p.user_id = ? AND p.archived = 0 ORDER BY p.updated_at DESC`,
    user.id,
  );
  const sub = getSubscription(user.id);
  return ok({
    projects: rows.map((r) => {
      const b = r.brand_json ? JSON.parse(r.brand_json) : {};
      return { id: r.id, name: r.name, status: r.status, sector: r.sector, platform: r.platform, updatedAt: r.updated_at, cover: r.cover ? `/api/files/${r.cover}?thumb=1` : null, palette: b.palette ?? null, brand: b.name ?? null };
    }),
    subscription: { status: sub.status, stores: sub.stores },
  });
});

const MAX_FILE = 25 * 1024 * 1024;

/** Création d'un projet : photo(s), lien ou description, puis lancement du pilote. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const form = await req.formData();
  const input = z
    .object({
      link: z.string().url().optional().or(z.literal("")),
      description: z.string().max(8000).optional(),
      productName: z.string().max(120).optional(),
      brandName: z.string().max(80).optional(),
      price: z.string().max(40).optional(),
      platform: z.enum(["shopify", "woocommerce", "prestashop", "wix", "squarespace"]).default("shopify"),
      mode: z.enum(["autopilot", "guided"]).default("autopilot"),
    })
    .parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const logo = form.get("logo");
  if (!files.length && !input.link && !(input.description && input.description.trim().length > 10)) {
    throw new HttpError(400, "Ajoutez au moins une photo, un lien ou une description de quelques lignes.");
  }
  // Nombre de boutiques : limité par l'abonnement (une boutique d'essai sans abonnement).
  const sub = getSubscription(user.id);
  const count = one<{ n: number }>("SELECT COUNT(*) n FROM projects WHERE user_id = ? AND archived = 0", user.id)!.n;
  const allowed = subscriptionActive(sub) ? sub.stores : 1;
  if (count >= allowed && user.role !== "admin") {
    throw new HttpError(402, subscriptionActive(sub) ? `Votre abonnement couvre ${allowed} boutique(s). Ajoutez une boutique (40 €/mois) dans votre compte.` : "Le compte d'essai comprend une boutique. Abonnez-vous pour en gérer plusieurs.");
  }
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    pid,
    user.id,
    input.productName || input.brandName || "Nouveau projet",
    "queued",
    input.platform,
    JSON.stringify({ ...DEFAULT_SETTINGS, mode: input.mode, timezone: user.timezone }),
    JSON.stringify([...(files.length ? [{ type: "photo", ref: `${files.length} photo(s)` }] : []), ...(input.description ? [{ type: "description", ref: "description du client" }] : [])]),
    now(),
    now(),
  );
  ensureFolders(pid);
  for (const [i, f] of files.slice(0, 8).entries()) {
    if (f.size > MAX_FILE) throw new HttpError(413, `La photo « ${f.name} » dépasse 25 Mo.`);
    if (!/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(f.type)) throw new HttpError(415, `Format non pris en charge pour « ${f.name} » (JPEG, PNG, WebP, AVIF).`);
    await saveAsset({ projectId: pid, userId: user.id, data: Buffer.from(await f.arrayBuffer()), name: f.name || `photo-${i + 1}.jpg`, mime: f.type, role: "original", folderKey: "product.originals", origin: "upload", meta: { uploadedAt: now() } });
  }
  if (logo && typeof logo !== "string" && logo.size > 0) {
    await saveAsset({ projectId: pid, userId: user.id, data: Buffer.from(await logo.arrayBuffer()), name: logo.name || "logo.png", mime: logo.type, kind: "image", role: "logo", folderKey: "brand.logos", origin: "upload", meta: { provided: true } });
  }
  const job = enqueue({ userId: user.id, projectId: pid, type: "pipeline.run", label: "Création du projet", payload: { projectId: pid, mode: input.mode, input: { link: input.link || undefined, description: input.description, productName: input.productName, brandName: input.brandName, price: input.price } }, maxAttempts: 2 });
  return ok({ id: pid, jobId: job.id });
});
