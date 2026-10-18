import { redact } from "../redact";
import { placementHash, receiptFor } from "./media-context";
import { stableHash } from "../brain/hash";
import sharp from "sharp";
import { collectPixabaySlot } from "./pixabay";
import { reviewPlacement } from "./media-review";
import { all, one, json, run } from "../db";
import { assetData, saveAsset } from "../library";
import { prepareEditorial } from "./editorial";
import { currentSeries } from "../logo-v2/direction-series";
import { copyContract } from "./copy-contract";
/** Adaptateurs vers les moteurs réels du studio. Les dépendances injectées n'existent qu'au niveau des tests. */
import { exactInstructions } from "./instructions";
import { inspectBrief } from "./inspect";
import { aiActiveFor, assertAiAllowed } from "../ai/access";
import { llmConfigured } from "../ai/llm";
import { aiBrandChecked } from "../engine/brand-check";
import { brandFromAi } from "../ai/tasks";
import { localBrand } from "../engine/local";
import { runContentEngineV2 } from "../seo-v2/engine";
import { localOnlyDeps } from "../seo-v2/deps";
import { localCopy } from "../engine/local-copy";
import { runImageEngineV2 } from "../image-v2/engine";
import { runLogoEngineV2 } from "../logo-v2/engine";
import { isAutoUsable } from "../quality/usable";
import { getAsset, type Asset } from "../library";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import type { Brief, Research, Identity, Contents, VisualSlot } from "./types";
import { researchProject } from "./research";
import { analyzeResearch } from "./research-ai";
import { sitePlan } from "./plan";
import { latestContent } from "../seo-v2/store";
import { remember } from "../projects";
import { stateOf } from "./store";
import { sitePages } from "../seo-v2/pages";
export type Dependencies = {
  simulation?: boolean;
  inspect: (
    p: Project,
    b: Brief,
    ctx: JobContext,
    paid: boolean,
  ) => Promise<Brief>;
  research: (
    p: Project,
    b: Brief,
    ctx: JobContext,
    paid: boolean,
  ) => Promise<Research>;
  identity: (p: Project, ctx: JobContext, paid: boolean) => Promise<Identity>;
  contents: (
    p: Project,
    ctx: JobContext,
    paid: boolean,
    options?: { previous?: Contents; pageKey?: string; correction?: string },
  ) => Promise<Contents>;
  logos: (p: Project, ctx: JobContext, cap: number) => Promise<string[]>;
  image: (
    p: Project,
    ctx: JobContext,
    slot: VisualSlot,
    refs: string[],
    cap: number,
  ) => Promise<string>;
};
export const realDependencies: Dependencies = {
  inspect: inspectBrief,
  async research(p, b, ctx, paid) {
    const r = await researchProject(p, b);
    return paid ? analyzeResearch(p, ctx, r) : r;
  },
  async identity(p, ctx, paid) {
    const provided = stateOf(p.id)?.stages.brief?.data.input.brandName;
    let brand = localBrand(p.product, provided || p.brand?.name, p).brand;
    brand.positioning = p.strategy?.angles[0]?.idea || brand.positioning;
    brand.audience = p.strategy?.audience[0]?.label || brand.audience;
    if (paid) {
      assertAiAllowed(p.userId, p.id);
      if (!llmConfigured())
        throw new Error(
          "Fournisseur de textes indisponible. Aucun résultat IA remplacé silencieusement.",
        );
      const r = await ctx.step("identity-ai", () =>
        aiBrandChecked(
          {
            userId: p.userId,
            projectId: p.id,
            jobId: ctx.job.id,
            usageKey: `${ctx.job.id}:identity`,
          },
          {
            ...p,
            brand: provided
              ? { ...brand, name: provided, validated: ["name"] }
              : p.brand,
          },
          [exactInstructions(p.id), ctx.payload.correction || ""].join("\n"),
        ),
      );
      brand = brandFromAi(
        r,
        { concept: r.logo.concept, status: "proposed" },
        brand.palette,
      ).brand;
    }
    if (provided) brand = { ...brand, name: provided, nameStatus: "provided" };
    return {
      proposal: {
        ...brand,
        alternatives: [],
        logo: { concept: "Logo à choisir", status: "proposed" },
        validated: [],
      },
      identityConfirmed: false,
      logoCandidates: [],
      legalAvailability: "not_checked",
      provenance: paid ? "provider" : "local",
    };
  },
  async contents(p, ctx, paid, options) {
    const plan = sitePlan(p);
    const sourceHash = stableHash("preparation-content", { product: p.product, services: p.services, strategy: p.strategy, brand: p.brand, instructions: exactInstructions(p.id) });
    const documents: Contents["documents"] = [];
    const notes: string[] = [];
    let pending: string | undefined;
    const cacheKey = (page: string) => `preparation.page.${page}.${sourceHash}`;
    const cached = new Map<string, Contents["documents"][number]>();
    for (const page of plan.pages) {
      const memo = json<{ docKey: string; docHash: string } | null>(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'", p.id, cacheKey(page.key))?.value, null);
      const prior = options?.previous?.sourceHash === sourceHash ? options.previous.documents.find(d => d.doc.page.key === page.key) : undefined;
      const current = latestContent(p.id, memo?.docKey ?? prior?.docKey ?? "");
      if (current) {
        if (memo && stableHash("content-doc", current.doc) !== memo.docHash && current.doc.meta2.source === "engine") { notes.push(`Version d’un autre contexte conservée : ${page.title}. La version exacte du contexte demandé sera réutilisée si elle existe.`); continue; }
        const item = { docKey: current.version.docKey, doc: current.doc, verdict: current.version.verdict ?? "PROVISIONAL" };
        cached.set(page.key, item); documents.push(item); page.docKey = item.docKey;
        if (memo && stableHash("content-doc", current.doc) !== memo.docHash) notes.push(`Texte modifié conservé : ${page.title}. Contrôle éditorial à reprendre dans son éditeur.`);
      }
    }
    if (paid) { assertAiAllowed(p.userId, p.id); if (!llmConfigured()) throw new Error("Fournisseur de textes indisponible, documents conservés."); }
    for (const page of plan.pages) {
      const old = cached.get(page.key);
      const targeted = options?.pageKey === page.key;
      if (options?.pageKey && !targeted) continue;
      if (!targeted && old?.verdict === "FINAL" && old.doc.meta2.by === "ai") continue;
      if (!targeted && old && ["user", "ai_local"].includes(old.doc.meta2.source)) { pending = `Texte modifié par vous conservé : ${page.title}. Sélectionnez explicitement cette page ou utilisez son éditeur pour une correction ciblée.`; continue; }
      const type = page.kind === "contact" ? "contact_page" : page.kind === "home" ? "home_page" : page.kind === "product" ? "product_page" : page.kind === "service" ? "service_page" : "brand_page";
      const correction = targeted || (old && old.verdict !== "FINAL") ? options?.correction : undefined;
      try {
        const result = await ctx.step(`content:${page.key}`, () => runContentEngineV2(ctx, p.id, {
          type,
          target: { page: { key: page.key, title: page.title, url: null, kind: page.kind === "contact" ? "page" : page.kind, status: "planned" }, ...(page.kind === "service" ? { serviceIndex: Number(page.key.split(":")[1]) } : {}) },
          pageKey: sitePages(p).find(x => x.kind === page.kind && (page.kind === "home" || page.kind === "brand" || x.title === page.title))?.key,
          request: `Page ${page.title}. ${page.goal}. Sections requises : ${JSON.stringify(page.sections)}. Pour Contact : coordonnées confirmées, motif de demande et CTA, sans délai inventé. Angle validé : ${p.strategy?.angles.map(a => a.idea).join(" ")}. Consignes exactes : ${exactInstructions(p.id)}. ${correction ? `Correction ciblée de cette page : ${correction}` : ""}`,
          force: !!correction, maxCostEur: .6,
        }, paid ? undefined : localOnlyDeps()));
        if (paid && result.by !== "ai") throw new Error(`Rédaction IA incomplète pour ${page.title}. Le brouillon local reste conservé et n’est pas un résultat IA final.`);
        if (!result.doc || !result.docKey) throw new Error(`Aucun texte utilisable pour ${page.title}.`);
        const item = { docKey: result.docKey, doc: result.doc, verdict: result.verdict };
        const index = documents.findIndex(d => d.doc.page.key === page.key);
        if (index >= 0) documents[index] = item; else documents.push(item);
        page.docKey = result.docKey;
        if (paid) remember(p.id, { kind: "artifact", key: cacheKey(page.key), value: JSON.stringify({ docKey: result.docKey, docHash: stableHash("content-doc", result.doc), sourceHash }), source: "ai" });
        notes.push(...result.notes);
        if (paid && result.verdict !== "FINAL") { pending = `Texte à reprendre : ${page.title}. Les autres pages acceptées sont réutilisées.`; break; }
      } catch (error) {
        if (error instanceof Error && ["JobPaused", "JobCancelled", "LeaseLost"].includes(error.constructor.name)) throw error;
        pending = redact((error as Error).message); break; // Aucune relance d'un échec API incertain.
      }
    }
    const c: Contents = { copy: options?.previous?.copy ?? localCopy(p.product, p.brand!, p), documents, ...plan, recommendation: options?.previous?.recommendation, notes: [...new Set(notes)], sourceHash, provenance: paid ? "provider" : "local" };
    if (!paid) { c.copy = copyContract(c).copy; return c; }
    if (pending || plan.pages.some(page => !documents.some(d => d.doc.page.key === page.key && d.verdict === "FINAL" && d.doc.meta2.by === "ai"))) return { ...c, pending: pending || "Des pages restent à rédiger ou à relire. Seuls les éléments manquants seront repris." };
    try { return await prepareEditorial(p, ctx, c); }
    catch (error) {
      if (error instanceof Error && ["JobPaused", "JobCancelled", "LeaseLost"].includes(error.constructor.name)) throw error;
      return { ...c, pending: `Plan éditorial incomplet : ${redact((error as Error).message)}. Les documents déjà rédigés restent réutilisables sans nouvelle rédaction.` };
    }
  },
  async logos(p, ctx, cap) {
    assertAiAllowed(p.userId, p.id);
    const r = await runLogoEngineV2(ctx, p.id, {
      capMicro: cap,
      instructions: [
        exactInstructions(p.id),
        ctx.payload.correction || "",
      ].join("\n"),
    });
    const series = currentSeries(p.id);
    if (series) return series.directions.map(d => d.logoId);
    return r.shown
      .filter((a) => a.verdict === "FINAL" && a.assetId)
      .map((a) => a.assetId!);
  },
  async image(p, ctx, slot, refs, cap) {
    assertAiAllowed(p.userId, p.id);
    const content = stateOf(p.id)!.stages.content!.data;
    const saveReceipt = (reviewed: VisualSlot) => {
      const reviewPath = `$.preparation.reviews."${reviewed.alignment?.contextHash ?? "unverified"}"`;
      run("UPDATE assets SET meta=json_set(meta,'$.preparation.reviewedSlot',json(?),'$.preparation.brandHash',?, ?,json(?)) WHERE id=? AND project_id=?", JSON.stringify(reviewed), stableHash("preparation", p.brand), reviewPath, JSON.stringify(reviewed), reviewed.assetId!, p.id);
    };
    const hash = placementHash(p, content, slot);
    for (const prior of all<Asset>("SELECT * FROM assets WHERE project_id=? AND deleted_at IS NULL AND json_extract(meta,'$.gate.verdict')='FINAL' ORDER BY created_at DESC", p.id)) {
      const receipt = receiptFor(json<any>(prior.meta, {}), hash);
      if (isAutoUsable(prior) && receipt?.alignment?.contextHash === hash && receipt.alignment.status === "accepted") { saveReceipt(receipt); return prior.id; }
    }
    if (slot.assetId) {
      const prior = getAsset(slot.assetId), receipt = json<any>(prior?.meta, {}).preparation?.reviewedSlot;
      if (prior?.project_id === p.id && isAutoUsable(prior) && !slot.correction && receipt?.alignment?.contextHash !== hash) {
        const reviewed = await reviewPlacement(p, ctx, content, slot, prior); saveReceipt(reviewed);
        if (reviewed.alignment?.status !== "accepted") throw new Error(`Média conservé mais inadapté au nouvel emplacement : ${reviewed.alignment?.reason}`);
        return prior.id;
      }
    }
    if (slot.source === "pixabay") {
      const reviewed = await collectPixabaySlot(p, ctx, { ...content, slots: stateOf(p.id)!.stages.media?.data.slots ?? content.slots }, slot);
      saveReceipt(reviewed);
      return reviewed.assetId!;
    }
    const r = await runImageEngineV2(ctx, p.id, {
      kind:
        p.business === "services"
          ? "trade_photo"
          : "lifestyle",
      support: "site",
      aspect: slot.aspect ?? "16:9",
      topic: [slot.scene || slot.purpose, slot.correction ? `Correction ciblée : ${slot.correction}` : ""].filter(Boolean).join("\n"),
      instructions: [exactInstructions(p.id), slot.correction || ""].filter(Boolean).join("\n"),
      slot: slot.key,
      references: refs,
      peopleAllowed: slot.peopleConsent === "this_slot",
      noStock: true,
      preserveOriginal: true,
      allowGenerate: true,
      count: 1,
      maxCostEur: cap / 1e6,
    });
    const out = r.outcomes.find((o) => o.assetId && o.verdict === "FINAL");
    const a = out?.assetId ? getAsset(out.assetId) : null;
    if (!a || !isAutoUsable(a) || r.stoppedByCostCap)
      throw new Error(
        "Aucun visuel final contrôlé disponible. Les essais restent conservés ; vérifiez le fournisseur, le budget et le résultat avant une reprise.",
      );
    const reviewed = await reviewPlacement(p, ctx, { ...content, slots: stateOf(p.id)!.stages.media?.data.slots ?? content.slots }, slot, a);
    saveReceipt(reviewed);
    if (reviewed.alignment?.status !== "accepted") throw new Error(`Visuel conservé mais à corriger : ${reviewed.alignment?.reason}`);
    const web = await saveAsset({ projectId: p.id, userId: p.userId, data: await sharp(assetData(a)).resize(1920, 1920, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer(), name: `${slot.key.replaceAll(":", "-")}-web.webp`, mime: "image/webp", origin: "generated", role: "image-web", folderKey: "images.scenes", sourceAssetId: a.id, status: "approved", meta: { derived: true } });
    saveReceipt({ ...reviewed, webAssetId: web.id });
    return a.id;
  },
};
