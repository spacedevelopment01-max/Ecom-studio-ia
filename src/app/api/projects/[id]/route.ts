import { z } from "zod";
import { all, json, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { publicJob, type Job } from "@/lib/jobs";
import { currentTheme, saveSettings } from "@/lib/projects";
import { pipelineState } from "@/lib/engine/pipeline";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { aiMode, hasAiCredits } from "@/lib/ai/access";
import { aiAvailability } from "@/lib/ai/config";
import { balance } from "@/lib/billing";
import { sectorLabel } from "@/lib/project-types";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const pipeline = one<Job>("SELECT * FROM jobs WHERE project_id = ? AND type = 'pipeline.run' ORDER BY created_at DESC LIMIT 1", p.id);
  const active = all<Job>("SELECT * FROM jobs WHERE project_id = ? AND status IN ('queued','running','paused') ORDER BY created_at DESC LIMIT 20", p.id);
  const counts = Object.fromEntries(all<{ role: string; n: number }>("SELECT role, COUNT(*) n FROM assets WHERE project_id = ? AND deleted_at IS NULL GROUP BY role", p.id).map((r) => [r.role, r.n]));
  const posts = Object.fromEntries(all<{ status: string; n: number }>("SELECT status, COUNT(*) n FROM posts WHERE project_id = ? GROUP BY status", p.id).map((r) => [r.status, r.n]));
  const theme = currentTheme(p.id);
  const logo = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", p.id);
  const cover = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role IN ('scene','packshot') AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", p.id);
  const cutout = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL ORDER BY created_at LIMIT 1", p.id);
  const b = balance(user.id);
  return ok({
    project: { id: p.id, name: p.name, status: p.status, platform: p.platform, storeUrl: p.row.store_url, createdAt: p.row.created_at, updatedAt: p.row.updated_at, sectorLabel: sectorLabel(p.product.sector) },
    product: p.product,
    brand: p.brand,
    strategy: p.strategy,
    settings: p.settings,
    pipeline: pipeline ? { job: publicJob(pipeline), steps: pipelineState(pipeline) } : null,
    active: active.map(publicJob),
    counts,
    posts,
    theme: theme ? { versionId: theme.version.id, number: theme.version.number, direction: theme.spec.direction, summary: theme.version.summary, updatedAt: theme.version.created_at } : null,
    logoUrl: logo ? `/api/files/${logo.id}` : null,
    coverUrl: cover ? `/api/files/${cover.id}?thumb=1` : null,
    cutoutUrl: cutout ? `/api/files/${cutout.id}?thumb=1` : null,
    // credits : l'IA est réellement utilisée pour ce client (sinon moteur local).
    ai: { ...aiAvailability(), credits: hasAiCredits(user.id), mode: aiMode(user.id) },
    credits: { usedPct: b.usedPct, alert: b.alert, paused: b.paused, empty: b.capacity === 0 },
  });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
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
    }),
  );
  if (b.name) run("UPDATE projects SET name = ?, updated_at = ? WHERE id = ?", b.name, now(), p.id);
  if (b.platform) run("UPDATE projects SET platform = ?, updated_at = ? WHERE id = ?", b.platform, now(), p.id);
  if (b.settings) {
    if (b.settings.timezone) {
      try {
        new Intl.DateTimeFormat("fr-FR", { timeZone: b.settings.timezone });
      } catch {
        throw new Error("Fuseau horaire inconnu.");
      }
    }
    saveSettings(p.id, { ...p.settings, ...b.settings } as any);
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
