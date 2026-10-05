import { z } from "zod";
import { all, json, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { publicJob, type Job } from "@/lib/jobs";
import { currentTheme, saveProduct, saveServices, saveSettings } from "@/lib/projects";
import { pipelineState } from "@/lib/engine/pipeline";
import { localizeQuestions } from "@/lib/engine/local";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { hasAiCredits } from "@/lib/ai/access";
import { assertAutopublish } from "@/lib/plan-gates";
import { aiAvailability } from "@/lib/ai/config";
import { balance } from "@/lib/billing";
import { FactSchema, sectorLabel } from "@/lib/project-types";
import { HttpError } from "@/lib/auth";
import { L, uiLang } from "@/lib/i18n-server";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const pipeline = one<Job>("SELECT * FROM jobs WHERE project_id = ? AND type = 'pipeline.run' ORDER BY created_at DESC LIMIT 1", p.id);
  const active = all<Job>("SELECT * FROM jobs WHERE project_id = ? AND status IN ('queued','running','paused') ORDER BY created_at DESC LIMIT 20", p.id);
  const counts = Object.fromEntries(all<{ role: string; n: number }>("SELECT role, COUNT(*) n FROM assets WHERE project_id = ? AND deleted_at IS NULL GROUP BY role", p.id).map((r) => [r.role, r.n]));
  const posts = Object.fromEntries(all<{ status: string; n: number }>("SELECT status, COUNT(*) n FROM posts WHERE project_id = ? GROUP BY status", p.id).map((r) => [r.status, r.n]));
  const theme = currentTheme(p.id);
  const logo = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", p.id);
  // Services : la photo d'ouverture est une photo de l'activité (réalisations, équipe, lieu) ou un visuel créé.
  const cover = one<{ id: string }>(
    p.business === "services"
      ? "SELECT id FROM assets WHERE project_id = ? AND role IN ('lifestyle','scene','banner','social') AND deleted_at IS NULL AND status != 'rejected' ORDER BY (role = 'lifestyle') DESC, (origin = 'upload') DESC, created_at DESC LIMIT 1"
      : "SELECT id FROM assets WHERE project_id = ? AND role IN ('scene','packshot') AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 1",
    p.id,
  );
  const cutout = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at LIMIT 1", p.id);
  const b = balance(user.id);
  return ok({
    project: { id: p.id, name: p.name, status: p.status, platform: p.platform, storeUrl: p.row.store_url, createdAt: p.row.created_at, updatedAt: p.row.updated_at, sectorLabel: p.business === "services" && p.product.category ? p.product.category : sectorLabel(p.product.sector, uiLang()), business: p.business },
    // Questions posées au commerçant : dans la langue de son interface, quelle que soit celle du projet.
    product: { ...p.product, questions: localizeQuestions(p.product.questions ?? []) },
    business: p.business,
    services: p.services,
    brand: p.brand,
    strategy: p.strategy,
    settings: p.settings,
    pipeline: pipeline ? { job: publicJob(pipeline), steps: pipelineState(pipeline, p.business, p.settings.existingSite) } : null,
    active: active.map(publicJob),
    counts,
    posts,
    theme: theme ? { versionId: theme.version.id, number: theme.version.number, direction: theme.spec.direction, summary: theme.version.summary, updatedAt: theme.version.created_at } : null,
    logoUrl: logo ? `/api/files/${logo.id}` : null,
    coverUrl: cover ? `/api/files/${cover.id}?thumb=1` : null,
    cutoutUrl: cutout ? `/api/files/${cutout.id}?thumb=1` : null,
    // credits : l'IA est réellement utilisée pour ce client (budget caché suffisant ; sinon moteur local, sans le dire).
    ai: { ...aiAvailability(), credits: hasAiCredits(user.id), mode: "ai" as const },
    credits: { usedPct: b.usedPct, alert: b.alert, paused: b.paused, empty: b.capacity === 0 },
  });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.object({
      name: z.string().min(1).max(120).optional(),
      platform: z.enum(["shopify", "woocommerce", "prestashop", "wix", "squarespace"]).optional(),
      settings: z
        .object({
          mode: z.enum(["autopilot", "guided"]).optional(),
          timezone: z.string().optional(),
          autopublish: z.object({ enabled: z.boolean(), networks: z.array(z.string()), requireApprovalFor: z.array(z.string()) }).optional(),
          socialLinks: z.record(z.string(), z.string()).optional(),
          language: z.enum(["fr", "en"]).optional(),
        })
        .optional(),
      /** Offre de services (projets « entreprise de services »). */
      services: z
        .object({
          services: z.array(z.object({ name: z.string().max(160), description: z.string().max(1000), price: z.string().max(60).optional(), duration: z.string().max(60).optional() })).max(40),
          area: z.string().max(300),
          address: z.string().max(300),
          phone: z.string().max(40),
          email: z.string().max(160),
          hours: z.string().max(400),
          bookingUrl: z.string().max(500),
          contactMode: z.enum(["booking", "quote", "call", "form"]),
        })
        .optional(),
      /** Description de l'activité (services) : nom, catégorie, résumé, informations confirmées. */
      activity: z.object({ name: z.string().max(160).optional(), category: z.string().max(120).optional(), summary: z.string().max(2000).optional(), facts: z.array(FactSchema).max(60).optional() }).optional(),
      /** Site existant conservé : le client demande au studio de créer un nouveau site malgré tout (ou y renonce). */
      existingSite: z.object({ newSiteRequested: z.boolean() }).optional(),
    }),
  );
  if (b.settings?.autopublish?.enabled) assertAutopublish(user);
  if (b.existingSite && p.settings.existingSite) saveSettings(p.id, { ...p.settings, existingSite: { ...p.settings.existingSite, newSiteRequested: b.existingSite.newSiteRequested } });
  if (b.name) run("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?", b.name, now(), p.id);
  if (b.platform) run("UPDATE projects SET platform = ?, updated_at = ? WHERE id = ?", b.platform, now(), p.id);
  if (b.services) {
    const sv = b.services;
    const email = sv.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, L("Adresse e-mail invalide.", "Invalid email address."));
    const bookingUrl = sv.bookingUrl.trim();
    if (bookingUrl && !/^https?:\/\/\S+$/i.test(bookingUrl)) throw new HttpError(400, L("Lien de prise de rendez-vous invalide (il doit commencer par https://).", "Invalid booking link (it must start with https://)."));
    saveServices(p.id, {
      services: sv.services.map((x) => ({ name: x.name.trim(), description: x.description.trim(), ...(x.price?.trim() ? { price: x.price.trim() } : {}), ...(x.duration?.trim() ? { duration: x.duration.trim() } : {}) })).filter((x) => x.name),
      area: sv.area.trim(),
      address: sv.address.trim(),
      phone: sv.phone.trim(),
      email,
      hours: sv.hours.trim(),
      bookingUrl,
      contactMode: sv.contactMode,
    });
  }
  if (b.activity) {
    const prod = { ...p.product };
    if (b.activity.name !== undefined) Object.assign(prod, { name: b.activity.name.trim(), nameStatus: "provided" });
    if (b.activity.category !== undefined) prod.category = b.activity.category.trim();
    if (b.activity.summary !== undefined) prod.summary = b.activity.summary.trim();
    if (b.activity.facts) prod.facts = b.activity.facts.filter((f) => f.label.trim());
    saveProduct(p.id, prod);
  }
  if (b.settings) {
    if (b.settings.timezone) {
      try {
        new Intl.DateTimeFormat("fr-FR", { timeZone: b.settings.timezone });
      } catch {
        throw new HttpError(400, L("Fuseau horaire inconnu.", "Unknown time zone."));
      }
    }
    const latest = one<{ settings_json: string }>("SELECT settings_json FROM projects WHERE id = ?", p.id);
    const curSettings = { ...p.settings, ...json<Record<string, unknown>>(latest?.settings_json, {}) };
    saveSettings(p.id, { ...curSettings, ...b.settings } as any);
  }
  return ok();
});

/** Archivage (les fichiers restent conservés). */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  run("UPDATE projects SET archived = 1, updated_at = ? WHERE id = ?", now(), p.id);
  run("UPDATE posts SET status = 'cancelled' WHERE project_id = ? AND status IN ('scheduled','review','draft')", p.id);
  return ok();
});
