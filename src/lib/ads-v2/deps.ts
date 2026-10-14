/**
 * Outils du moteur publicitaire V2 : rédaction (IA), relecture (IA de vision), image (Image Engine V2), détourage
 * et logo de la marque. Injectables : le studio et le benchmark utilisent `realAdDeps` ; les tests, des outils
 * simulés (aucun appel, aucune dépense).
 */
import { adIntent, skillReference } from "../ai/skills";
import sharp from "sharp";
import { llmConfigured, llmJson } from "../ai/llm";
import { productImagePath } from "../ai/media-providers";
import { brainView } from "../ai/context";
import type { JobContext } from "../jobs";
import { all, json, run } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { validCutouts } from "../engine/cutouts";
import { L } from "../i18n-server";
import { peopleAllowedFor, personCheckFr } from "../people-policy";
import type { ImageRequestV2 } from "../image-v2/engine";
import { z } from "zod";
import { CopySetSchema, type CopySet } from "./copy";
import { AD_REVIEW_SYSTEM, AdReviewSchema } from "./quality";
import type { AdReview } from "./types";

/** Cases du quadrillage 6 × 6 (A1…F6) où se trouve le produit. */
const ProductCellsSchema = z.object({ found: z.boolean(), cells: z.array(z.string()).max(36).default([]), person: z.boolean().catch(false) });

/** Photo orientée, réduite à 1024 px, quadrillée 6 × 6 avec l'étiquette de chaque case. */
async function gridded(src: Buffer): Promise<{ data: Buffer; info: { width: number; height: number } }> {
  const { data: img, info } = await sharp(src).rotate().resize(1024, 1024, { fit: "inside" }).jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const lines: string[] = [];
  for (let k = 1; k < 6; k++) lines.push(`<line x1="${(W * k) / 6}" y1="0" x2="${(W * k) / 6}" y2="${H}"/>`, `<line x1="0" y1="${(H * k) / 6}" x2="${W}" y2="${(H * k) / 6}"/>`);
  const labels: string[] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) labels.push(`<text x="${(W * c) / 6 + 6}" y="${(H * r) / 6 + 26}">${String.fromCharCode(65 + c)}${r + 1}</text>`);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><g stroke="#ff2d55" stroke-width="2" opacity="0.85">${lines.join("")}</g><g font-family="sans-serif" font-size="22" font-weight="700" fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke">${labels.join("")}</g></svg>`;
  const data = await sharp(img).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toBuffer();
  return { data, info: { width: W, height: H } };
}

export type AdsV2Deps = {
  canWrite: boolean;
  canReview: boolean;
  /** Photo publicitaire générée à partir de la photo du produit possible (IA d'images routée, contrôle IA disponible). */
  canGenerate?: boolean;
  /**
   * Référence du produit tirée d'une photo du client où il n'occupe qu'une partie de l'image (porté par une personne,
   * dans un décor) : le produit seul, recadré. Repéré une fois par l'IA de vision puis gardé. null : produit non trouvé.
   */
  productReference?: (photoId: string) => Promise<string | null>;
  writeCopy: (system: string, prompt: string, key: string) => Promise<CopySet>;
  review: (ad: Buffer, text: string, key: string) => Promise<AdReview>;
  /** Image par l'Image Engine V2 (réutilisation, recherche, génération routée, barrière) ; null si aucune image retenue. */
  image: (req: ImageRequestV2) => Promise<{ assetId: string; data: Buffer } | null>;
  /** Détourage du produit réel et logo de la marque (asset de la bibliothèque + données). */
  cutout: () => { id: string; data: Buffer } | null;
  logo: () => { id: string; data: Buffer } | null;
  /** Version claire du logo (posée sur une photo sombre) ; facultative. */
  logoLight?: () => { id: string; data: Buffer } | null;
};

export function realAdDeps(ctx: JobContext | null, p: Project, aiActive: boolean): AdsV2Deps {
  const base = { userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null };
  const ai = aiActive && llmConfigured();
  return {
    canWrite: ai,
    canReview: ai,
    canGenerate: ai && !!productImagePath("ad_visual"),
    async productReference(photoId) {
      const done = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'product-ref' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", p.id, photoId)[0];
      if (done) return done.id;
      const photo = getAsset(photoId);
      if (!ai || !photo || photo.project_id !== p.id) return null;
      const src = assetData(photo);
      // Photo quadrillée (6 × 6 cases étiquetées A1…F6) : un modèle de vision désigne des cases bien plus sûrement
      // qu'il ne donne des coordonnées.
      const { data: grid, info } = await gridded(src);
      const r = (await llmJson(
        {
          task: "quality_control",
          ...base,
          usageKey: `product-ref:${photoId}`,
          promptKey: "ads-v2-product-cells",
          routing: { difficulty: "standard", deliverable: "image_v2" },
          system: "You locate a product in a photo divided into a labelled grid. Answer with JSON only.",
          images: [{ data: grid, label: L("photo du client quadrillée", "client photo with a grid") }],
          prompt: `Product: "${p.product.name ?? ""}"${p.product.category ? ` (${p.product.category})` : ""}. The photo is divided into a 6 × 6 grid: columns A to F from left to right, rows 1 to 6 from top to bottom (labels in the top-left corner of each cell). List every cell that contains a part of this product (not the person wearing or holding it, not the background). If the product is not clearly visible, found = false. person = true if a person (face, body, hand) is visible in the photo.\nReply { "found": true, "cells": ["C2", "D2"], "person": false }.`,
          maxTokens: 600,
        },
        ProductCellsSchema,
      )) as z.infer<typeof ProductCellsSchema>;
      // Photo du client lue par l'IA de vision : une personne visible y est notée (repère de la règle de présence
      // humaine ; un choix déjà enregistré par le client n'est jamais remplacé).
      const prev = json<Record<string, unknown>>(photo.meta as any, {});
      if (r.person && prev.hasPerson === undefined) run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify({ ...prev, hasPerson: true }), photo.id);
      const cells = (r.found ? r.cells : []).map((c) => /^([A-F])([1-6])$/.exec(c.trim().toUpperCase())).filter((m): m is RegExpExecArray => !!m).map((m) => ({ c: m[1].charCodeAt(0) - 65, r: Number(m[2]) - 1 }));
      if (!cells.length || cells.length > 20) return null;
      const W = info.width, H = info.height;
      const cw = W / 6, ch = H / 6;
      // Union des cases, plus une demi-case de marge pour garder la silhouette entière.
      const x0 = Math.max(0, (Math.min(...cells.map((c) => c.c)) - 0.5) * cw), y0 = Math.max(0, (Math.min(...cells.map((c) => c.r)) - 0.5) * ch);
      const x1 = Math.min(W, (Math.max(...cells.map((c) => c.c)) + 1.5) * cw), y1 = Math.min(H, (Math.max(...cells.map((c) => c.r)) + 1.5) * ch);
      const box = { left: Math.round(x0), top: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
      if (box.width < 160 || box.height < 160) return null;
      const b = { cells: r.cells };
      const full = await sharp(src).rotate().toBuffer({ resolveWithObject: true });
      const k = full.info.width / W;
      const big = { left: Math.round(box.left * k), top: Math.round(box.top * k), width: Math.min(full.info.width - Math.round(box.left * k), Math.round(box.width * k)), height: Math.min(full.info.height - Math.round(box.top * k), Math.round(box.height * k)) };
      const crop = await sharp(full.data).extract(big).jpeg({ quality: 92 }).toBuffer();
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: crop, name: "reference-produit.jpg", mime: "image/jpeg", role: "product-ref", origin: "generated", sourceAssetId: photoId, status: "ready", meta: { recipe: "Produit recadré dans la photo du client (référence des photos publicitaires)", box: b } });
      return a.id;
    },
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
          // Compétences publicitaires (ad-creative, image, canvas-design, brand-guidelines ; + ads pour un service).
          reference: skillReference(adIntent(p)),
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
          prompt: `${text}\n${personCheckFr(peopleAllowedFor(p))}\nRéponds { "criteria": { "hook": 0, "clarity": 0, "relevance": 0, "brand": 0, "visual": 0, "hierarchy": 0, "legibility": 0, "cta": 0, "platform": 0, "distinctiveness": 0 }, "issues": [], "claimProblems": [], "productAltered": false, "textIllegible": false, "generic": false, "personVisible": false, "fix": { "target": "copy|hook|layout|visual|cta|none", "instruction": "…" } }.`,
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
      return c ? { id: c.id, data: assetData(c) } : null;
    },
    logo: () => {
      const id = p.brand?.logo?.assetId;
      const a = id ? getAsset(id) : undefined;
      return a && !a.deleted_at && /png/.test(a.mime) ? { id: a.id, data: assetData(a) } : null;
    },
    logoLight: () => {
      // Déclinaison « fond sombre » du logo actuel (faite à partir de lui, jamais celle d'un ancien logo).
      const id = p.brand?.logo?.assetId;
      if (!id) return null;
      const a = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-light' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", p.id, id)[0];
      return a && /png/.test(a.mime) ? { id: a.id, data: assetData(a) } : null;
    },
  };
}
