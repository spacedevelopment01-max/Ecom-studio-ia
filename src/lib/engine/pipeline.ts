/**
 * Pilote : de la photo (ou du lien) à la boutique, aux images, aux vidéos et
 * au calendrier. Chaque étape est un point de reprise : après une
 * interruption, le travail repart de l'étape en cours sans refaire — ni
 * repayer — les étapes terminées. Le client peut laisser faire ou valider la
 * marque avant la suite (mode guidé).
 */
import { mergeProductProfile } from "../brain/facts";
import { userPlan } from "../quotas";
import { friendlyToolError } from "../tool-errors";
import { all, id, json, now, one, run } from "../db";
import { enqueue, JobCancelled, JobContext, JobPaused, type Job } from "../jobs";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject, saveProduct, saveServices, setStatus, remember, notify } from "../projects";
import { importLink, fetchImage } from "./import-link";
import { runImageSetV2 } from "../image-v2/set";
import { analysisPhotos, cutoutSummary, ensureCutouts, validCutouts } from "./cutouts";
import { localAnalysis, factsFromDescription, localServiceAnalysis, mergeServiceProfile } from "./local";
import { buildBrand } from "./brand";
import { localCopy } from "./local-copy";
import { buildShop } from "./shop";
import { importExistingSiteNote, loadSiteImport, saveReproductionNotes, siteKept } from "./existing-site";
import { buildReproducedShop, platformName } from "./site-reproduce";
import { produceVideo, videoStepNote, type VideoStepResult } from "./videos";

/** Ce qu'une étape vidéo garde (repris tel quel à la reprise d'une tâche). */
const stepVideo = (r: Awaited<ReturnType<typeof produceVideo>>): VideoStepResult => ({ assetId: r.assetId, method: r.method, clipFallback: r.clipFallback });
import { aiAnalyzeProduct, aiAnalyzeService, aiShopCopyChecked } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { emptyProduct, type BusinessType, type ProductProfile } from "../project-types";
import { C, L, inBothLangs } from "../i18n-server";
import { note, stepNoteText, type StepNote } from "../step-notes";
import { pipelinePlan } from "../orchestrator/execute";

export const STEPS = [
  { id: "sources", label: "Lecture des sources", detail: "Photos, lien importé, description", en: { label: "Reading sources", detail: "Photos, imported link, description" } },
  { id: "cutout", label: "Détourage du produit", detail: "Photos triées, produit isolé puis contrôlé, couleurs mesurées", en: { label: "Product cutout", detail: "Photos sorted, product isolated then checked, colors measured" } },
  { id: "analysis", label: "Analyse du produit", detail: "Faits confirmés, observations, inconnues, questions", en: { label: "Product analysis", detail: "Confirmed facts, observations, unknowns, questions" } },
  { id: "brand", label: "Direction de marque", detail: "Nom, positionnement, palette, typographies, logo", en: { label: "Brand direction", detail: "Name, positioning, palette, typography, logo" } },
  { id: "copy", label: "Rédaction", detail: "Textes de la boutique, contrôle qualité", en: { label: "Copywriting", detail: "Store copy, quality check" } },
  { id: "images", label: "Images", detail: "Packshots, détails, scènes, bannières, visuels sociaux", en: { label: "Images", detail: "Packshots, close-ups, scenes, banners, social visuals" } },
  { id: "video", label: "Vidéos", detail: "Publicité 9:16 et vidéo de boutique 16:9", en: { label: "Videos", detail: "9:16 ad and 16:9 store video" } },
  { id: "shop", label: "Boutique", detail: "Thème Shopify complet, aperçu, versions", en: { label: "Store", detail: "Complete Shopify theme, preview, versions" } },
  { id: "calendar", label: "Calendrier", detail: "7 jours de publications préparées à valider", en: { label: "Calendar", detail: "7 days of posts ready for your approval" } },
  { id: "organize", label: "Rangement", detail: "Dossiers, noms et liens des fichiers", en: { label: "Organizing", detail: "Folders, file names and links" } },
] as const;

/** Libellés des étapes pour le site d'une entreprise de services (mêmes étapes, vocabulaire de l'activité). */
const SERVICE_STEPS: Partial<Record<(typeof STEPS)[number]["id"], { label: string; detail: string; en: { label: string; detail: string } }>> = {
  sources: { label: "Lecture des sources", detail: "Description de l'activité, site actuel, photos", en: { label: "Reading sources", detail: "Business description, current website, photos" } },
  cutout: { label: "Photos de l'activité", detail: "Utilisées telles quelles : pas de détourage pour un site de services", en: { label: "Business photos", detail: "Used as they are: no cutout for a services website" } },
  analysis: { label: "Analyse de l'activité", detail: "Métier, prestations, zone, coordonnées ; faits confirmés et manques", en: { label: "Business analysis", detail: "Trade, services, area, contact details; confirmed facts and gaps" } },
  copy: { label: "Rédaction", detail: "Textes du site, contrôle qualité", en: { label: "Copywriting", detail: "Website copy, quality check" } },
  images: { label: "Images", detail: "Visuels de l'activité, bannières, visuels sociaux", en: { label: "Images", detail: "Business visuals, banners, social visuals" } },
  video: { label: "Vidéos", detail: "Vidéo courte pour les réseaux et vidéo de présentation", en: { label: "Videos", detail: "Short social video and presentation video" } },
  shop: { label: "Site", detail: "Site complet de l'activité, aperçu, versions", en: { label: "Website", detail: "Complete business website, preview, versions" } },
};
/** Libellés des étapes quand le client part de son site existant (« J'ai déjà mon site et mon logo »). */
const SITE_STEPS: Partial<Record<(typeof STEPS)[number]["id"], { label: string; detail: string; en: { label: string; detail: string } }>> = {
  sources: { label: "Lecture de votre site", detail: "Plateforme, logo, pages, produits, couleurs, polices, coordonnées", en: { label: "Reading your website", detail: "Platform, logo, pages, products, colors, fonts, contact details" } },
  brand: { label: "Votre marque", detail: "Nom, logo, couleurs et polices repris de votre site ; ton et messages", en: { label: "Your brand", detail: "Name, logo, colors and fonts taken from your website; tone and messages" } },
};
const SITE_SHOP = {
  keep: { label: "Votre site", detail: "Conservé tel quel sur sa plateforme", en: { label: "Your website", detail: "Kept as is on its platform" } },
  reproduce: { label: "Reproduction de votre site", detail: "Mêmes pages, menu, textes, images, logo et couleurs", en: { label: "Reproducing your website", detail: "Same pages, menu, text, images, logo and colors" } },
};
const stepInfo = (id: (typeof STEPS)[number]["id"], business: BusinessType = "products", site?: { decision?: "keep" | "reproduce" } | null) =>
  (site && id === "shop" && site.decision && SITE_SHOP[site.decision]) || (site && SITE_STEPS[id]) || (business === "services" && SERVICE_STEPS[id]) || STEPS.find((s) => s.id === id)!;
/** Site existant sans photo détourée : explication affichée à la place d'une étape vide. */
const NO_CUTOUT_SITE = () => note("skip.noCutoutSite");
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

function markStep(ctx: JobContext, step: StepId, status: "running" | "done" | "skipped" | "failed" | "paused", stepNote?: StepNote) {
  const steps = (ctx.checkpoint.__steps ?? {}) as Record<string, { status: string; at: number; note?: StepNote }>;
  steps[step] = { status, at: now(), note: stepNote };
  ctx.save("__steps", steps);
}

export type PipelinePayload = {
  projectId: string;
  /** Étapes remplacées par une demande du client (Studio Workflow V2, ex. calendrier fait par Social V2) : sautées. */
  skip?: StepId[];
  from?: StepId;
  mode: "autopilot" | "guided";
  input: { link?: string; description?: string; productName?: string; brandName?: string; price?: string; businessType?: BusinessType; /** Vidéos choisies au lancement (par défaut : avec plans IA). */ videos?: "ai" | "edited" | "none"; /** « J'ai déjà mon site et mon logo » : adresse du site du client. */ existingSite?: boolean; siteUrl?: string };
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
  // Orchestrateur : plan de la création d'après l'état réel du projet (même clé que la tâche : reprise cohérente).
  const orch = pipelinePlan(ctx, loadProject(projectId), payload);
  try {
    for (let i = Math.max(0, startIndex); i < total; i++) {
      const step = STEPS[i];
      const done = (ctx.checkpoint.__steps ?? {})[step.id]?.status;
      if (done === "done" || done === "skipped") continue;
      if (payload.skip?.includes(step.id)) {
        markStep(ctx, step.id, "skipped", note("skip.byRequest"));
        continue;
      }
      // Étape inutile d'après le plan (marque existante gardée, textes déjà FINAL) : sautée, avec la raison.
      const planSkip = orch.skipped(step.id);
      if (planSkip) {
        const kept = loadProject(projectId);
        markStep(ctx, step.id, "skipped", planSkip === "brand" ? note("skip.brandKept", { name: kept.brand?.name ?? "" }) : note("skip.copyFinal"));
        continue;
      }
      const since = orch.since(step.id);
      markStep(ctx, step.id, "running");
      // Le type d'activité peut être fixé en cours de route (lecture du site existant du client).
      const cur = loadProject(projectId);
      const info = stepInfo(step.id, cur.business, cur.settings.existingSite);
      ctx.progress(i / total, `${L(info.label, info.en.label)}…`);
      const sc = new StepContext(ctx, i / total, (i + 1) / total, step.id);
      const res = await runStep(step.id, sc, payload);
      if (res && typeof res === "object" && "skipped" in res) markStep(ctx, step.id, "skipped", res.skipped);
      else markStep(ctx, step.id, res === "skipped" ? "skipped" : "done", res && res !== "skipped" ? res : undefined);
      orch.record(step.id, since, res === "skipped" || (!!res && typeof res === "object" && "skipped" in res));
      if (step.id === "brand" && payload.mode === "guided") {
        setStatus(projectId, "awaiting_validation");
        const p = loadProject(projectId);
        notify(p.userId, projectId, L("Votre marque est prête à valider", "Your brand is ready for review"), L("Validez ou ajustez la direction de marque : la création continuera ensuite.", "Approve or adjust the brand direction: creation will continue afterwards."));
        return { paused: "brand" };
      }
    }
    setStatus(projectId, "ready");
    const p = loadProject(projectId);
    notify(p.userId, projectId, L("Votre projet est prêt", "Your project is ready"), p.business === "services" ? L("Site, images, vidéos et calendrier sont disponibles dans le studio.", "Your website, images, videos and calendar are available in the studio.") : L("Boutique, images, vidéos et calendrier sont disponibles dans le studio.", "Your store, images, videos and calendar are available in the studio."), "success");
    return { done: true };
  } catch (e) {
    const cur = Object.entries((ctx.checkpoint.__steps ?? {}) as Record<string, any>).find(([, v]) => v.status === "running")?.[0];
    if (e instanceof JobPaused || e instanceof JobCancelled) {
      // Mise en pause ou annulation demandée par le client : ce n'est pas une erreur. L'étape en cours sera refaite
      // à la relance, les précédentes sont conservées.
      if (cur) markStep(ctx, cur as StepId, "paused", e instanceof JobCancelled ? note("stopped") : undefined);
      setStatus(projectId, "paused");
      throw e;
    }
    if (cur) markStep(ctx, cur as StepId, "failed", friendlyToolError((e as Error).message));
    setStatus(projectId, "error");
    throw e;
  }
}

/** Étape d'un moteur de contenus pour un site de services : une impossibilité (pas de photo exploitable…) est signalée sans arrêter la création. */
async function serviceContent(fn: () => Promise<StepNote>): Promise<StepNote | { skipped: StepNote }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof JobPaused || e instanceof JobCancelled) throw e;
    const raw = (e as Error).message;
    return { skipped: inBothLangs(() => L(`Non créé pour l'instant : ${friendlyToolError(raw)}`, `Not created for now: ${friendlyToolError(raw)}`)) };
  }
}

async function runStep(step: StepId, ctx: JobContext, payload: PipelinePayload): Promise<StepNote | "skipped" | void | { skipped: StepNote }> {
  const projectId = payload.projectId;
  const p = loadProject(projectId);
  const inp = payload.input;
  const services = p.business === "services";
  // Découverte gratuite (sans forfait) : analyse, marque, logos et aperçu de la boutique ; images, vidéos et calendrier avec un forfait.
  if ((step === "images" || step === "video" || step === "calendar") && !userPlan(p.userId)) {
    return { skipped: note("skip.plan") };
  }
  switch (step) {
    case "sources": {
      if (inp.existingSite && inp.siteUrl) return importExistingSiteNote(ctx, projectId, inp.siteUrl);
      if (inp.link && services) {
        // Site actuel d'une entreprise de services : seul le texte sert (présentation, prestations, coordonnées).
        const imported = await ctx.step("link", async () => {
          ctx.progress(0.2, L("Lecture du site actuel", "Reading the current website"));
          const r = await importLink(inp.link!);
          const sources = [...json<any[]>(loadProject(projectId).row.sources_json, []).filter((x) => !(x.type === "link" && (x.ref === inp.link || x.ref === r.url))), { type: "link", ref: r.url, note: r.title }];
          run("UPDATE projects SET sources_json = ? WHERE id = ?", JSON.stringify(sources), projectId);
          return { url: r.url, title: r.title, description: r.description, text: r.text.slice(0, 15000), product: null, platform: r.platform, photos: 0 };
        });
        remember(projectId, { kind: "artifact", key: "link_import", value: JSON.stringify(imported), source: "link", status: "confirmed" });
        return inBothLangs(() => L(`Site lu : ${imported.title || imported.url}`, `Website read: ${imported.title || imported.url}`));
      }
      if (inp.link) {
        const imported = await ctx.step("link", async () => {
          ctx.progress(0.2, L("Lecture du lien importé", "Reading the imported link"));
          const r = await importLink(inp.link!);
          let photos = 0;
          for (const [k, u] of r.images.slice(0, 4).entries()) {
            const buf = await fetchImage(u);
            if (!buf) continue;
            await saveAsset({ projectId, userId: p.userId, data: buf, name: `${C("photo-importee", "imported-photo")}-${k + 1}.${/png/.test(u) ? "png" : "jpg"}`, mime: /png/.test(u) ? "image/png" : "image/jpeg", role: "original", folderKey: "product.originals", origin: "link", meta: { source: u, page: r.url } });
            photos++;
          }
          // La source « lien » déjà notée au lancement est complétée (adresse finale, titre), pas dupliquée.
          const sources = [...json<any[]>(loadProject(projectId).row.sources_json, []).filter((x) => !(x.type === "link" && (x.ref === inp.link || x.ref === r.url))), { type: "link", ref: r.url, note: r.title }];
          run("UPDATE projects SET sources_json = ? WHERE id = ?", JSON.stringify(sources), projectId);
          return { url: r.url, title: r.title, description: r.description, text: r.text.slice(0, 15000), product: r.product, platform: r.platform, photos };
        });
        remember(projectId, { kind: "artifact", key: "link_import", value: JSON.stringify(imported), source: "link", status: "confirmed" });
        return inBothLangs(() => L(`Lien lu : ${imported.title || imported.url}${imported.photos ? ` (${imported.photos} photo(s) importée(s))` : ""}`, `Link read: ${imported.title || imported.url}${imported.photos ? ` (${imported.photos} photo(s) imported)` : ""}`));
      }
      if (services) return inp.description ? note("sources.serviceDescription") : note("sources.photos");
      return inp.description ? note("sources.description") : note("sources.photos");
    }
    case "cutout": {
      if (services) {
        const n = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND role = 'lifestyle' AND origin IN ('upload','site') AND deleted_at IS NULL", projectId)?.n ?? 0;
        return { skipped: n ? note("skip.servicePhotos", { n }) : note("skip.serviceNoPhoto") };
      }
      let cut;
      try {
        cut = await ensureCutouts(ctx, p);
      } catch (e) {
        // Site existant : les photos du site ne se prêtent pas toujours au détourage ; le reste du studio continue avec elles.
        if (e instanceof JobPaused || e instanceof JobCancelled || !p.settings.existingSite) throw e;
        const msg = (e as Error).message;
        return { skipped: inBothLangs(() => L(`Détourage impossible sur les photos de votre site (${msg}) : ajoutez une photo nette du produit dans l'onglet Produit pour les visuels détourés.`, `Cutout not possible on your website's photos (${msg}): add a clear product photo in the Product tab for cutout visuals.`)) };
      }
      const sum = cutoutSummary(projectId);
      if (!cut.length) {
        // Aucun détourage valable : signalé clairement, la création continue avec ce qui est possible.
        const any = one("SELECT 1 FROM assets WHERE project_id = ? AND kind = 'image' AND role IN ('original','lifestyle') AND deleted_at IS NULL", projectId);
        if (!any) return "skipped";
        notify(p.userId, projectId, L("Aucun détourage valable du produit", "No usable product cutout"), L("Ajoutez une photo nette du produit seul, sur fond uni, dans l'onglet Produit : les visuels du produit et les vidéos se créeront ensuite.", "Add a sharp photo of the product alone, on a plain background, in the Product tab: product visuals and videos will be created next."), "warning");
        return { skipped: note("cutout.none", sum) };
      }
      return note("cutout.sorted", sum);
    }
    case "analysis": {
      if (services) {
        const done = await analyzeService(ctx, payload);
        // Photos dès maintenant (gratuites) : le site et ses aperçus ne restent pas vides jusqu'aux images.
        await ctx.step("early-photos", async () => {
          ctx.progress(0.9, L("Photos du métier (libres de droits)", "Trade photos (royalty-free)"));
          const { earlyServicePhotos } = await import("./service-media");
          return earlyServicePhotos(ctx, projectId).catch((e) => {
            if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
            return 0;
          });
        });
        return done;
      }
      const cutouts = validCutouts(projectId);
      const colors = cutouts.length ? json<any>(cutouts[0].meta, {}).colors ?? [] : [];
      const link = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'link_import'", projectId)?.value, null);
      const price = parsePrice(inp.price) ?? link?.product?.price ?? null;
      let product: ProductProfile;
      if (llmConfigured()) {
        // Packshots et photos en situation ; jamais les visuels publicitaires avec texte (allégations du vendeur).
        const originals = analysisPhotos(projectId);
        const r = await ctx.step("ai", () =>
          aiAnalyzeProduct(
            { userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:analysis` },
            {
              photos: originals.slice(0, 6).map((o, i) => ({ data: assetData(o), label: `photo ${i + 1}` })),
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
          questions: price === null && !r.questions.some((q) => q.factKey === "price") ? [{ id: "price", question: L("Quel est le prix de vente TTC ?", "What is the retail price (including tax)?"), why: L("Indispensable pour vendre ; il ne se déduit pas d'une photo.", "Essential for selling; it can't be inferred from a photo."), required: true, factKey: "price" }, ...r.questions] : r.questions,
          claimsToAvoid: r.claimsToAvoid,
          sources: [],
          analyzedBy: "ai",
        };
        (product as any).detailRegions = r.detailRegions;
      } else {
        product = localAnalysis({ name: inp.productName, brand: inp.brandName, description: inp.description, price, colors, link, photos: cutouts.length });
      }
      // Relance d'analyse : les informations saisies ou confirmées par le client sont conservées (Project Brain).
      product = mergeProductProfile(loadProject(projectId).product, product);
      saveProduct(projectId, product);
      if (product.name) run("UPDATE projects SET name = CASE WHEN name LIKE 'Nouveau projet%' THEN ? ELSE name END WHERE id = ?", product.name, projectId);
      const unknown = product.facts.filter((f) => f.status === "unknown").length;
      const established = product.facts.filter((f) => f.status !== "unknown").length;
      return note("analysis.product", { established, unknown, questions: product.questions.length, ai: product.analyzedBy === "ai" ? 1 : 0 });
    }
    case "brand": {
      const brand = await buildBrand(ctx, projectId, { providedBrand: inp.brandName });
      return brand.checks?.length ? note("brand.toCheck", { name: brand.name, direction: brand.direction, n: brand.checks.length }) : note("brand.done", { name: brand.name, direction: brand.direction });
    }
    case "copy": {
      const fresh = loadProject(projectId);
      if (llmConfigured()) {
        const r = await ctx.step("ai", () => aiShopCopyChecked({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, fresh, (m) => ctx.progress(0.5, m), (k, fn) => ctx.step(k, fn)));
        remember(projectId, { kind: "artifact", key: "shop_copy", value: JSON.stringify(r.copy), source: "ai", status: "confirmed" });
        return r.qc.remaining.length ? note("copy.toCheck", { n: r.qc.remaining.length }) : note("copy.checked");
      }
      remember(projectId, { kind: "artifact", key: "shop_copy", value: JSON.stringify(localCopy(fresh.product, fresh.brand!, fresh)), source: "local", status: "confirmed" });
      return note("copy.base");
    }
    case "images": {
      // Image Engine V2 (composants locaux gratuits, photos libres, génération contrôlée), puis publicités par
      // Advertising Engine V2 (documents à calques modifiables dans l'éditeur visuel).
      if (services) {
        return serviceContent(async () => {
          const r = await runImageSetV2(ctx, projectId);
          const ads = await pipelineAds(ctx, projectId);
          return note("images.done", { n: r.created.length + ads });
        });
      }
      const has = validCutouts(projectId).length > 0;
      if (!has) return { skipped: p.settings.existingSite ? NO_CUTOUT_SITE() : note("skip.noCutout") };
      const r = await runImageSetV2(ctx, projectId);
      const ads = await pipelineAds(ctx, projectId);
      return note("images.done", { n: r.created.length + ads });
    }
    case "video": {
      if (inp.videos === "none") return { skipped: note("skip.videosNone") };
      if (services) {
        return serviceContent(async () => {
          const a = await ctx.step("v916", async () => stepVideo(await produceVideo(new StepScope(ctx, 0, 0.5, "v916"), projectId, { format: "9:16", target: "ads", useAiClip: inp.videos !== "edited", goal: C("vidéo courte pour faire connaître l'activité sur les réseaux sociaux", "short video to promote the business on social media") })));
          const b = await ctx.step("v169", async () => stepVideo(await produceVideo(new StepScope(ctx, 0.5, 1, "v169"), projectId, { format: "16:9", target: "shop", useAiClip: inp.videos !== "edited", goal: C("vidéo de présentation de l'activité pour le site", "business presentation video for the website"), music: "none" })));
          return inBothLangs(() => videoStepNote([a, b], inp.videos !== "edited"));
        });
      }
      const has = validCutouts(projectId).length > 0;
      if (!has) return { skipped: p.settings.existingSite ? NO_CUTOUT_SITE() : note("skip.noCutout") };
      const a = await ctx.step("v916", async () => stepVideo(await produceVideo(new StepScope(ctx, 0, 0.5, "v916"), projectId, { format: "9:16", target: "ads", useAiClip: inp.videos !== "edited", goal: C("publicité courte pour les réseaux sociaux", "short ad for social media") })));
      const b = await ctx.step("v169", async () => stepVideo(await produceVideo(new StepScope(ctx, 0.5, 1, "v169"), projectId, { format: "16:9", target: "shop", useAiClip: inp.videos !== "edited", goal: C("vidéo d'ambiance pour la boutique", "mood video for the store"), music: "none" })));
      return inBothLangs(() => videoStepNote([a, b], inp.videos !== "edited"));
    }
    case "shop": {
      const site = loadSiteImport(projectId);
      if (site && p.settings.existingSite) {
        // Site conservé tel quel : aucun thème n'est créé (le client peut en demander un depuis l'onglet Boutique).
        if (siteKept(projectId)) return { skipped: inBothLangs(() => L(`Votre site ${platformName(site.platform)} est conservé tel quel`, `Your ${platformName(site.platform)} website is kept as is`)) };
        if (site.decision === "reproduce" && !p.settings.existingSite.newSiteRequested) {
          const r = await ctx.step("reproduce", () => buildReproducedShop(ctx, projectId, site));
          saveReproductionNotes(projectId, r.versionId);
          return note("shop.reproduced", { n: r.number });
        }
      }
      const r = await buildShop(ctx, projectId);
      return note(services ? "shop.site" : "shop.theme", { n: r.number });
    }
    case "calendar": {
      await startWeekCalendar(ctx, projectId, `pipeline-plan:${ctx.job.id}`);
      return note("calendar.started");
    }
    case "organize": {
      const n = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND deleted_at IS NULL", projectId)?.n ?? 0;
      const loose = one<{ n: number }>("SELECT COUNT(*) n FROM assets WHERE project_id = ? AND folder_id IS NULL AND deleted_at IS NULL", projectId)?.n ?? 0;
      if (loose) enqueue({ userId: p.userId, projectId, type: "files.classify", label: L("Classement des fichiers", "File organization"), payload: { projectId }, parentId: ctx.job.id, idempotencyKey: `pipeline-classify:${ctx.job.id}` });
      return note("organize.done", { n, loose });
    }
  }
}

/**
 * Publicités de la création complète : Advertising Engine V2 (angles, textes contrôlés, créations composées), en
 * documents à calques ouverts dans l'éditeur visuel. Une publicité impossible (pas assez de faits confirmés) ne
 * bloque pas la création. Point de reprise : une reprise ne refait ni ne repaie rien.
 */
async function pipelineAds(ctx: JobContext, projectId: string): Promise<number> {
  return ctx.step("ads-v2", async () => {
    ctx.progress(0.96, L("Publicités (moteur publicitaire)", "Ads (advertising engine)"));
    try {
      const { runAdEngineV2 } = await import("../ads-v2/engine");
      const r = await runAdEngineV2(ctx, projectId, { count: 2, maxCostEur: 1 });
      return r.outcomes.filter((o) => o.assetId).length;
    } catch (e) {
      if (e instanceof JobPaused || e instanceof JobCancelled) throw e;
      console.warn(`[pipeline] publicités V2 non créées : ${(e as Error).message}`);
      return 0;
    }
  });
}

/** Calendrier de 7 jours (réseaux connectés, sinon Instagram, Facebook, Pinterest) lancé en tâche enfant, une seule fois. */
export async function startWeekCalendar(ctx: JobContext, projectId: string, idempotencyKey: string) {
  const p = loadProject(projectId);
  return await ctx.step("plan", async () => {
    const pid = id();
    const fresh = loadProject(projectId);
    const conns = all<{ id: string; provider: string }>("SELECT c.id, c.provider FROM connections c JOIN project_connections pc ON pc.connection_id = c.id WHERE pc.project_id = ? AND c.provider IN ('instagram','facebook','tiktok','youtube','pinterest')", projectId);
    const networks = conns.length ? conns.map((c) => ({ network: c.provider, connectionId: c.id })) : [{ network: "instagram" }, { network: "facebook" }, { network: "pinterest" }];
    const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
    const params = { startDate: tomorrow, days: 7, perDay: 1, slots: ["11:30"], timezone: fresh.settings.timezone, networks, goals: fresh.business === "services" ? C("faire connaître l'activité et ses prestations, amener vers une prise de contact", "promote the business and its services, drive people to get in touch") : C("faire découvrir le produit et amener vers la boutique", "introduce the product and drive traffic to the store"), tone: "", mix: { photo: 70, video: 20, text: 10 }, approval: "manual" as const };
    run("INSERT INTO content_plans (id, project_id, params, status, created_at) VALUES (?,?,?,?,?)", pid, projectId, JSON.stringify(params), "planning", now());
    const job = enqueue({ userId: p.userId, projectId, type: "calendar.plan", label: L("Calendrier de 7 jours", "7-day calendar"), payload: { projectId, planId: pid, params }, parentId: ctx.job.id, idempotencyKey });
    run("UPDATE content_plans SET job_id = ? WHERE id = ?", job.id, pid);
    return pid;
  });
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

export function pipelineState(job: Job | undefined, business: BusinessType = "products", site?: { decision?: "keep" | "reproduce" } | null) {
  const cp = json<Record<string, any>>(job?.checkpoint, {});
  const steps = (cp.__steps ?? {}) as Record<string, { status: string; at: number; note?: StepNote }>;
  return STEPS.map((s) => {
    const i = stepInfo(s.id, business, site);
    // Résumé traduit à l'affichage, dans la langue de l'interface de la personne qui lit.
    return { id: s.id, label: L(i.label, i.en.label), detail: L(i.detail, i.en.detail), status: steps[s.id]?.status ?? "pending", note: stepNoteText(steps[s.id]?.note, L("fr", "en")), at: steps[s.id]?.at };
  });
}

/**
 * Analyse d'une entreprise de services : profil de l'activité (nom, métier, résumé, faits)
 * et offre complétée (prestations, zone, coordonnées) à partir de la description et du site actuel.
 * Ce que le client a saisi prime ; rien n'est inventé (les manques restent vides, à compléter dans l'onglet Activité).
 */
async function analyzeService(ctx: JobContext, payload: PipelinePayload): Promise<StepNote> {
  const projectId = payload.projectId;
  const p = loadProject(projectId);
  const inp = payload.input;
  const link = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'link_import'", projectId)?.value, null);
  const local = localServiceAnalysis({ name: inp.productName, brand: inp.brandName, description: inp.description, link, services: p.services });
  let product: ProductProfile = local.product;
  let offer = local.services;
  if (llmConfigured()) {
    const photos = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'lifestyle' AND origin IN ('upload','site') AND kind = 'image' AND deleted_at IS NULL ORDER BY (origin = 'upload') DESC, created_at LIMIT 4", projectId);
    const r = await ctx.step("ai", () =>
      aiAnalyzeService(
        { userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:analysis` },
        {
          photos: photos.map((o, i) => ({ data: assetData(o), label: `photo ${i + 1}` })),
          link: link ? { url: link.url, text: link.text, data: { title: link.title, description: link.description } } : null,
          description: inp.description,
          providedName: inp.productName,
          providedBrand: inp.brandName,
          known: p.services,
        },
      ),
    );
    // Les faits écrits par le client priment sur ceux de l'analyse.
    const facts = [...local.product.facts, ...r.facts.filter((f) => !local.product.facts.some((u) => u.key === f.key))];
    product = {
      ...emptyProduct(),
      name: inp.productName || r.name || local.product.name,
      nameStatus: inp.productName ? "provided" : r.nameStatus,
      category: r.category || local.product.category,
      sector: r.sector ?? local.product.sector,
      summary: r.summary || local.product.summary,
      facts,
      questions: r.questions.filter((q) => !/price|shipping|returns/i.test(q.factKey)),
      claimsToAvoid: r.claimsToAvoid,
      analyzedBy: "ai",
    };
    offer = mergeServiceProfile(p.services, {
      services: r.services.map((x) => ({ name: x.name, description: x.description, ...(x.price ? { price: x.price } : {}), ...(x.duration ? { duration: x.duration } : {}) })),
      area: r.area,
      address: r.address,
      phone: r.phone,
      email: r.email,
      hours: r.hours,
      bookingUrl: /^https?:\/\//i.test(r.bookingUrl) ? r.bookingUrl : "",
      ...(r.contactMode !== "unknown" ? { contactMode: r.contactMode } : {}),
    });
    // Ce que le moteur local a lu mot pour mot complète encore les manques.
    offer = mergeServiceProfile(offer, local.services);
  }
  // Relance d'analyse : les informations saisies ou confirmées par le client sont conservées (Project Brain).
  product = mergeProductProfile(p.product, product);
  saveProduct(projectId, product);
  saveServices(projectId, offer);
  if (product.name) run("UPDATE projects SET name = CASE WHEN name LIKE 'Nouveau projet%' OR name LIKE 'New project%' THEN ? ELSE name END WHERE id = ?", inp.brandName || product.name, projectId);
  const missing = inBothLangs(() =>
    [
      !offer.services.length && L("prestations", "services"),
      !offer.area && !offer.address && L("zone ou adresse", "area or address"),
      !offer.phone && !offer.email && L("téléphone ou e-mail", "phone or email"),
      !offer.hours && L("horaires", "hours"),
    ]
      .filter(Boolean)
      .join(", "),
  );
  return note("analysis.service", { services: offer.services.length, facts: product.facts.length, missing, ai: product.analyzedBy === "ai" ? 1 : 0 });
}
