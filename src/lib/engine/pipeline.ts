/**
 * Pilote : de la photo (ou du lien) à la boutique, aux images, aux vidéos et
 * au calendrier. Chaque étape est un point de reprise : après une
 * interruption, le travail repart de l'étape en cours sans refaire — ni
 * repayer — les étapes terminées. Le client peut laisser faire ou valider la
 * marque avant la suite (mode guidé).
 */
import { all, id, json, now, one, run } from "../db";
import { enqueue, JobContext, type Job } from "../jobs";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, saveProduct, setStatus, remember, notify } from "../projects";
import { importLink, fetchImage } from "./import-link";
import { ensureCutouts, generateImageSet } from "./images";
import { localAnalysis, factsFromDescription } from "./local";
import { buildBrand } from "./brand";
import { localCopy } from "./local-copy";
import { buildShop } from "./shop";
import { produceVideo } from "./videos";
import { aiAnalyzeProduct, aiShopCopyChecked } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import type { ProductProfile } from "../project-types";

export const STEPS = [
  { id: "sources", label: "Lecture des sources", detail: "Photos, lien importé, description" },
  { id: "cutout", label: "Détourage du produit", detail: "Pixels du produit isolés, couleurs mesurées" },
  { id: "analysis", label: "Analyse du produit", detail: "Faits confirmés, observations, inconnues, questions" },
  { id: "brand", label: "Direction de marque", detail: "Nom, positionnement, palette, typographies, logo" },
  { id: "copy", label: "Rédaction", detail: "Textes de la boutique, contrôle qualité" },
  { id: "images", label: "Images", detail: "Packshots, détails, scènes, bannières, visuels sociaux" },
  { id: "video", label: "Vidéos", detail: "Publicité 9:16 et vidéo de boutique 16:9" },
  { id: "shop", label: "Boutique", detail: "Thème Shopify complet, aperçu, versions" },
  { id: "calendar", label: "Calendrier", detail: "7 jours de publications préparées à valider" },
  { id: "organize", label: "Rangement", detail: "Dossiers, noms et liens des fichiers" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

/** Contexte limité à une étape : avancement global et points de reprise préfixés. */
class StepContext extends JobContext {
  constructor(private parent: JobContext, private start: number, private end: number, private prefix: string) {
    super(parent.job);
  }
  override progress(p: number, message?: string) {
    this.parent.progress(this.start + (this.end - this.start) * Math.max(0, Math.min(1, p)), message);
  }
  override async step<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.parent.step(`${this.prefix}:${key}`, fn);
  }
}

function markStep(ctx: JobContext, step: StepId, status: "running" | "done" | "skipped" | "failed", note?: string) {
  const steps = (ctx.checkpoint.__steps ?? {}) as Record<string, { status: string; at: number; note?: string }>;
  steps[step] = { status, at: now(), note };
  ctx.save("__steps", steps);
}

export type PipelinePayload = {
  projectId: string;
  from?: StepId;
  mode: "autopilot" | "guided";
  input: { link?: string; description?: string; productName?: string; brandName?: string; price?: string };
};

function parsePrice(s?: string): number | null {
  if (!s) return null;
  const m = s.replace(/\s/g, "").replace(",", ".").match(/(\d+(?:\.\d{1,2})?)/);
  return m ? Math.round(Number(m[1]) * 100) : null;
}

export async function runPipeline(ctx: JobContext) {
  const payload = ctx.payload as PipelinePayload;
  const projectId = payload.projectId;
  setStatus(projectId, "creating");
  const startIndex = payload.from ? STEPS.findIndex((s) => s.id === payload.from) : 0;
  const total = STEPS.length;
  try {
    for (let i = Math.max(0, startIndex); i < total; i++) {
      const step = STEPS[i];
      const done = (ctx.checkpoint.__steps ?? {})[step.id]?.status;
      if (done === "done" || done === "skipped") continue;
      markStep(ctx, step.id, "running");
      ctx.progress(i / total, `${step.label}…`);
      const sc = new StepContext(ctx, i / total, (i + 1) / total, step.id);
      const note = await runStep(step.id, sc, payload);
      markStep(ctx, step.id, note === "skipped" ? "skipped" : "done", note && note !== "skipped" ? note : undefined);
      if (step.id === "brand" && payload.mode === "guided") {
        setStatus(projectId, "awaiting_validation");
        const p = loadProject(projectId);
        notify(p.userId, projectId, "Votre marque est prête à valider", "Validez ou ajustez la direction de marque : la création continuera ensuite.");
        return { paused: "brand" };
      }
    }
    setStatus(projectId, "ready");
    const p = loadProject(projectId);
    notify(p.userId, projectId, "Votre projet est prêt", "Boutique, images, vidéos et calendrier sont disponibles dans le studio.", "success");
    return { done: true };
  } catch (e) {
    const cur = Object.entries((ctx.checkpoint.__steps ?? {}) as Record<string, any>).find(([, v]) => v.status === "running")?.[0];
    if (cur) markStep(ctx, cur as StepId, "failed", (e as Error).message);
    setStatus(projectId, "error");
    throw e;
  }
}

async function runStep(step: StepId, ctx: JobContext, payload: PipelinePayload): Promise<string | void> {
  const projectId = payload.projectId;
  const p = loadProject(projectId);
  const inp = payload.input;
  switch (step) {
    case "sources": {
      if (inp.link) {
        const imported = await ctx.step("link", async () => {
          ctx.progress(0.2, "Lecture du lien importé");
          const r = await importLink(inp.link!);
          let photos = 0;
          for (const [k, u] of r.images.slice(0, 4).entries()) {
            const buf = await fetchImage(u);
            if (!buf) continue;
            await saveAsset({ projectId, userId: p.userId, data: buf, name: `photo-importee-${k + 1}.${/png/.test(u) ? "png" : "jpg"}`, mime: /png/.test(u) ? "image/png" : "image/jpeg", role: "original", folderKey: "product.originals", origin: "link", meta: { source: u, page: r.url } });
            photos++;
          }
          const sources = [...json<any[]>(loadProject(projectId).row.sources_json, []), { type: "link", ref: r.url, note: r.title }];
          run("UPDATE projects SET sources_json = ? WHERE id = ?", JSON.stringify(sources), projectId);
          return { url: r.url, title: r.title, description: r.description, text: r.text.slice(0, 15000), product: r.product, platform: r.platform, photos };
        });
        remember(projectId, { kind: "artifact", key: "link_import", value: JSON.stringify(imported), source: "link", status: "confirmed" });
        return `Lien lu : ${imported.title || imported.url}${imported.photos ? ` (${imported.photos} photo(s) importée(s))` : ""}`;
      }
      return inp.description ? "Description enregistrée" : "Photos reçues";
    }
    case "cutout": {
      const cut = await ensureCutouts(ctx, p);
      if (!cut.length) return "skipped";
      return `${cut.length} détourage(s) réalisé(s) localement`;
    }
    case "analysis": {
      const cutouts = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL ORDER BY created_at", projectId);
      const colors = cutouts.length ? json<any>(cutouts[0].meta, {}).colors ?? [] : [];
      const link = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'link_import'", projectId)?.value, null);
      const price = parsePrice(inp.price) ?? link?.product?.price ?? null;
      let product: ProductProfile;
      if (llmConfigured()) {
        const originals = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'original' AND kind = 'image' AND deleted_at IS NULL ORDER BY created_at LIMIT 4", projectId);
        const r = await ctx.step("ai", () =>
          aiAnalyzeProduct(
            { userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:analysis` },
            {
              photos: originals.map((o, i) => ({ data: assetData(o), label: `photo ${i + 1}` })),
              colors: colors.map((c: any) => `${c.hex} (${c.name}, ${Math.round(c.share * 100)} %)`).join(", "),
              link: link ? { url: link.url, text: link.text, data: { title: link.title, description: link.description, product: link.product } } : null,
              description: inp.description,
              providedName: inp.productName,
              providedBrand: inp.brandName,
              price: inp.price,
            },
          ),
        );
        // Les faits donnés explicitement par le client priment.
        const userFacts = factsFromDescription(inp.description ?? "");
        const facts = [...userFacts, ...r.facts.filter((f) => !userFacts.some((u) => u.key === f.key))];
        product = {
          name: inp.productName || r.name,
          nameStatus: inp.productName ? "provided" : r.nameStatus,
          category: r.category,
          sector: r.sector,
          summary: r.summary,
          facts,
          visual: { colors, shape: r.visual.shape, materials: r.visual.materials, labelText: r.visual.labelText, hasLogo: r.visual.hasLogo, description: r.visual.description },
          price: { amount: price, currency: link?.product?.currency ?? "EUR", status: price === null ? "unknown" : "confirmed" },
          variants: r.variants,
          questions: price === null && !r.questions.some((q) => q.factKey === "price") ? [{ id: "price", question: "Quel est le prix de vente TTC ?", why: "Indispensable pour vendre ; il ne se déduit pas d'une photo.", required: true, factKey: "price" }, ...r.questions] : r.questions,
          claimsToAvoid: r.claimsToAvoid,
          sources: [],
          analyzedBy: "ai",
        };
        (product as any).detailRegions = r.detailRegions;
      } else {
        product = localAnalysis({ name: inp.productName, brand: inp.brandName, description: inp.description, price, colors, link, photos: cutouts.length });
      }
      saveProduct(projectId, product);
      if (product.name) run("UPDATE projects SET name = CASE WHEN name LIKE 'Nouveau projet%' THEN ? ELSE name END WHERE id = ?", product.name, projectId);
      const unknown = product.facts.filter((f) => f.status === "unknown").length;
      return `${product.facts.filter((f) => f.status !== "unknown").length} information(s) établie(s), ${unknown} inconnue(s), ${product.questions.length} question(s) — ${product.analyzedBy === "ai" ? "analyse IA" : "moteur local"}`;
    }
    case "brand": {
      const brand = await buildBrand(ctx, projectId, { providedBrand: inp.brandName });
      return `${brand.name} — direction ${brand.direction}${brand.generatedBy === "local" ? " (moteur local)" : ""}`;
    }
    case "copy": {
      const fresh = loadProject(projectId);
      if (llmConfigured()) {
        const r = await ctx.step("ai", () => aiShopCopyChecked({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, fresh, (m) => ctx.progress(0.5, m)));
        remember(projectId, { kind: "artifact", key: "shop_copy", value: JSON.stringify(r.copy), source: "ai", status: "confirmed" });
        return r.qc.remaining.length ? `Textes rédigés ; ${r.qc.remaining.length} point(s) à vérifier par vous` : "Textes rédigés et contrôlés";
      }
      remember(projectId, { kind: "artifact", key: "shop_copy", value: JSON.stringify(localCopy(fresh.product, fresh.brand!)), source: "local", status: "confirmed" });
      return "Textes de base assemblés (moteur local) — à enrichir";
    }
    case "images": {
      const has = one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL", projectId);
      if (!has) return "skipped";
      const r = await generateImageSet(ctx, projectId);
      return `${r.created.length} image(s) créée(s)`;
    }
    case "video": {
      const has = one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL", projectId);
      if (!has) return "skipped";
      const a = await ctx.step("v916", async () => (await produceVideo(new StepScope(ctx, 0, 0.5, "v916"), projectId, { format: "9:16", target: "ads", goal: "publicité courte pour les réseaux sociaux" })).assetId);
      const b = await ctx.step("v169", async () => (await produceVideo(new StepScope(ctx, 0.5, 1, "v169"), projectId, { format: "16:9", target: "shop", goal: "vidéo d'ambiance pour la boutique", music: "none" })).assetId);
      return `2 vidéos rendues (${[a, b].length})`;
    }
    case "shop": {
      const r = await buildShop(ctx, projectId);
      return `Version ${r.number} du thème enregistrée`;
    }
    case "calendar": {
      const planId = await ctx.step("plan", async () => {
        const pid = id();
        const fresh = loadProject(projectId);
        const conns = all<{ id: string; provider: string }>("SELECT c.id, c.provider FROM connections c JOIN project_connections pc ON pc.connection_id = c.id WHERE pc.project_id = ? AND c.provider IN ('instagram','facebook','tiktok','youtube','pinterest')", projectId);
        const networks = conns.length ? conns.map((c) => ({ network: c.provider, connectionId: c.id })) : [{ network: "instagram" }, { network: "facebook" }, { network: "pinterest" }];
        const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
        const params = { startDate: tomorrow, days: 7, perDay: 1, slots: ["11:30"], timezone: fresh.settings.timezone, networks, goals: "faire découvrir le produit et amener vers la boutique", tone: "", mix: { photo: 70, video: 20, text: 10 }, approval: "manual" as const };
        run("INSERT INTO content_plans (id, project_id, params, status, created_at) VALUES (?,?,?,?,?)", pid, projectId, JSON.stringify(params), "planning", now());
        const job = enqueue({ userId: p.userId, projectId, type: "calendar.plan", label: "Calendrier de 7 jours", payload: { projectId, planId: pid, params }, parentId: ctx.job.id, idempotencyKey: `pipeline-plan:${ctx.job.id}` });
        run("UPDATE content_plans SET job_id = ? WHERE id = ?", job.id, pid);
        return pid;
      });
      return `Calendrier en préparation (${planId.slice(0, 6)})`;
    }
    case "organize": {
      const n = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND deleted_at IS NULL", projectId)?.n ?? 0;
      const loose = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND folder_id IS NULL AND deleted_at IS NULL", projectId)?.n ?? 0;
      if (loose) enqueue({ userId: p.userId, projectId, type: "files.classify", label: "Classement des fichiers", payload: { projectId }, parentId: ctx.job.id, idempotencyKey: `pipeline-classify:${ctx.job.id}` });
      return `${n} fichiers rangés par dossier${loose ? `, ${loose} à classer` : ""}`;
    }
  }
}

/** Sous-portée pour une étape interne (vidéos multiples). */
class StepScope extends JobContext {
  constructor(private parent: JobContext, private a: number, private b: number, private prefix: string) {
    super(parent.job);
  }
  override progress(p: number, m?: string) {
    this.parent.progress(this.a + (this.b - this.a) * p, m);
  }
  override async step<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.parent.step(`${this.prefix}:${key}`, fn);
  }
}

export function pipelineState(job: Job | undefined) {
  const cp = json<Record<string, any>>(job?.checkpoint, {});
  const steps = (cp.__steps ?? {}) as Record<string, { status: string; at: number; note?: string }>;
  return STEPS.map((s) => ({ ...s, status: steps[s.id]?.status ?? "pending", note: steps[s.id]?.note, at: steps[s.id]?.at }));
}
