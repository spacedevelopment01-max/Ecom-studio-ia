/**
 * Outils du moteur publicitaire V2 : rédaction (IA), relecture (IA de vision), image (Image Engine V2), détourage
 * et logo de la marque. Injectables : le studio et le benchmark utilisent `realAdDeps` ; les tests, des outils
 * simulés (aucun appel, aucune dépense).
 */
import sharp from "sharp";
import { llmConfigured, llmJson } from "../ai/llm";
import { brainView } from "../ai/context";
import type { JobContext } from "../jobs";
import { assetData, getAsset } from "../library";
import type { Project } from "../projects";
import { validCutouts } from "../engine/cutouts";
import { L } from "../i18n-server";
import type { ImageRequestV2 } from "../image-v2/engine";
import { CopySetSchema, type CopySet } from "./copy";
import { AD_REVIEW_SYSTEM, AdReviewSchema } from "./quality";
import type { AdReview } from "./types";

export type AdsV2Deps = {
  canWrite: boolean;
  canReview: boolean;
  writeCopy: (system: string, prompt: string, key: string) => Promise<CopySet>;
  review: (ad: Buffer, text: string, key: string) => Promise<AdReview>;
  /** Image par l'Image Engine V2 (réutilisation, recherche, génération routée, barrière) ; null si aucune image retenue. */
  image: (req: ImageRequestV2) => Promise<{ assetId: string; data: Buffer } | null>;
  cutout: () => Buffer | null;
  logo: () => Buffer | null;
};

export function realAdDeps(ctx: JobContext | null, p: Project, aiActive: boolean): AdsV2Deps {
  const base = { userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null };
  const ai = aiActive && llmConfigured();
  return {
    canWrite: ai,
    canReview: ai,
    writeCopy: (system, prompt, key) =>
      llmJson(
        {
          task: "ad_creative",
          ...base,
          usageKey: key,
          promptKey: "ads-v2-copy",
          // Rédaction publicitaire : niveau fort directement (pas d'essai faible voué à l'échec).
          routing: { difficulty: "complex", deliverable: "ad_v2" },
          system,
          context: brainView(p, "advertising").stable,
          prompt,
          maxTokens: 6000,
        },
        CopySetSchema,
      ),
    async review(ad, text, key) {
      const small = await sharp(ad).resize(1080, 1080, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
      return (await llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: key,
          promptKey: "ads-v2-review",
          routing: { difficulty: "complex", deliverable: "ad_v2" },
          system: AD_REVIEW_SYSTEM,
          context: brainView(p, "advertising").stable,
          images: [{ data: small, label: L("création publicitaire à juger", "ad creative to review") }],
          prompt: `${text}\nRéponds { "criteria": { "hook": 0, "clarity": 0, "relevance": 0, "brand": 0, "visual": 0, "hierarchy": 0, "legibility": 0, "cta": 0, "platform": 0, "distinctiveness": 0 }, "issues": [], "claimProblems": [], "productAltered": false, "textIllegible": false, "generic": false, "fix": { "target": "copy|hook|layout|visual|cta|none", "instruction": "…" } }.`,
          maxTokens: 2500,
        },
        AdReviewSchema,
      )) as AdReview;
    },
    async image(req) {
      const { runImageEngineV2 } = await import("../image-v2/engine");
      const r = await runImageEngineV2(ctx, p.id, req);
      const o = r.outcomes.find((x) => x.assetId && (x.verdict === "FINAL" || x.verdict === "PROVISIONAL"));
      const a = o?.assetId ? getAsset(o.assetId) : undefined;
      return a ? { assetId: a.id, data: assetData(a) } : null;
    },
    cutout: () => {
      const c = p.business === "products" ? validCutouts(p.id)[0] : undefined;
      return c ? assetData(c) : null;
    },
    logo: () => {
      const id = p.brand?.logo?.assetId;
      const a = id ? getAsset(id) : undefined;
      return a && !a.deleted_at && /png|svg/.test(a.mime) && a.mime !== "image/svg+xml" ? assetData(a) : null;
    },
  };
}
