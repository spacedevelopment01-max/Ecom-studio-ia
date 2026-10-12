/**
 * LE plan vidéo libre de droits (Pixabay d'abord, puis Pexels) d'un moment d'une vidéo : cherché pour ce moment
 * (accroche, geste du métier, démonstration, résultat), en rapport direct avec le métier, la prestation ou le produit,
 * jamais déjà utilisé dans le projet ni dans la même vidéo, assez long pour le plan, à la bonne orientation, et
 * contrôlé (une image du milieu du plan regardée par l'IA quand elle est active ; sinon seule une description qui
 * cite le métier ou le produit est acceptée). Le plan retenu est gardé dans la bibliothèque avec son crédit.
 * Boutique : l'univers du produit (lieu, matière, usage), jamais le produit lui-même — le vrai produit est montré
 * par les plans de photos du projet, intercalés. Gratuit (aucune génération) ; le contrôle IA est léger.
 */
import fs from "node:fs";
import path from "node:path";
import { all } from "../db";
import { saveAsset } from "../library";
import type { Project } from "../projects";
import { C } from "../i18n-server";
import { JobCancelled, JobPaused } from "../jobs";
import { llmConfigured } from "../ai/llm";
import { decide } from "../quality/gate";
import { gateSave } from "../quality/store";
import { peopleAllowedFor, queriesFor } from "../people-policy";
import { tmpDir } from "../storage";
import { execTool } from "../exec-tool";
import { downloadStockVideo, searchStockVideos, stockVideoCredit, type StockVideo } from "./photos";
import { rankStock, tradeStock } from "./trade-queries";

type Ictx = { userId: string; projectId: string; jobId?: string | null };

export type StockClipRequest = {
  /** Sujet du plan (ce que l'image doit montrer). */
  topic: string;
  /** Moment de la vidéo (accroche, développement, démonstration…), pour varier les recherches. */
  part: string;
  aspect: "9:16" | "16:9" | "1:1" | "4:5";
  /** Durée voulue du plan (s) : les plans plus courts passent après. */
  durationS: number;
  /** Rang du plan dans la vidéo (rotation des recherches). */
  index: number;
  key: string;
};

/** Plans libres déjà pris dans le projet (jamais repris d'une vidéo à l'autre). */
export function takenStockVideos(projectId: string): Set<string> {
  return new Set(all<{ k: string }>("SELECT json_extract(meta, '$.stock.source') || ':' || json_extract(meta, '$.stock.id') k FROM assets WHERE project_id = ? AND kind = 'video' AND json_extract(meta, '$.stock') IS NOT NULL", projectId).map((x) => x.k));
}

/** Recherches d'un plan : le métier (ou l'univers du produit) d'abord, nuancé par le sujet du plan, en rotation. */
async function clipQueries(ictx: Ictx, p: Project, r: StockClipRequest): Promise<{ lang: "fr" | "en"; queries: string[]; must: string[] }> {
  const services = p.business === "services";
  const trade = [p.product.category, p.product.name].filter(Boolean)[0] ?? "";
  if (services) {
    const items = (p.services?.services ?? []).filter((s) => s.name?.trim());
    const svc = items.length ? items[r.index % items.length] : null;
    const known = tradeStock(`${r.topic} ${svc?.name ?? ""} ${trade}`) ?? tradeStock(`${trade} ${svc?.name ?? ""}`) ?? tradeStock(trade);
    if (known) {
      const q = known.queries;
      const k = r.index % Math.max(1, q.length);
      return { lang: "en", queries: [...q.slice(k), ...q.slice(0, k)].slice(0, 3), must: known.must };
    }
    return { lang: "fr", queries: [svc?.name ?? "", trade, `${trade} ${r.topic}`].filter(Boolean), must: [] };
  }
  const { universeQueries } = await import("../engine/stock-universe");
  const u = await universeQueries(ictx, p);
  const k = r.index % Math.max(1, u.queries.length);
  const known = tradeStock(`${p.product.category ?? ""} ${p.product.sector ?? ""} ${p.product.name ?? ""}`);
  return { lang: u.lang, queries: [...u.queries.slice(k), ...u.queries.slice(0, k)], must: known?.must ?? [] };
}

/** Ordre d'essai : pertinence (rankStock) d'abord, puis un plan assez long et bien défini avant un plan court. */
export function clipOrder<T extends Pick<StockVideo, "duration" | "width" | "height">>(found: T[], wantS: number): T[] {
  const score = (v: T, i: number) => -i * 0.6 + (v.duration >= wantS + 0.5 ? 2 : v.duration >= wantS ? 1 : 0) + Math.min(1, Math.min(v.width, v.height) / 1080);
  return found.map((v, i) => ({ v, s: score(v, i) })).sort((a, b) => b.s - a.s).map((x) => x.v);
}

export async function findStockClip(ictx: Ictx, p: Project, r: StockClipRequest, exclude: Set<string>): Promise<{ assetId: string; durationS: number } | null> {
  const services = p.business === "services";
  const people = peopleAllowedFor(p);
  const ai = llmConfigured();
  const q = await clipQueries(ictx, p, r);
  // Sans IA pour regarder le plan : seule une description de la banque qui cite le métier vaut contrôle.
  if (!ai && !q.must.length) return null;
  const orientation = r.aspect === "16:9" ? "landscape" : "portrait";
  const taken = new Set([...takenStockVideos(p.id), ...exclude]);
  const found = rankStock(await searchStockVideos(queriesFor(q.queries, people), orientation, q.lang, taken).catch(() => []), q.must, ai, undefined, { people });
  const trade = [p.product.category, p.product.name].filter(Boolean)[0] ?? "";
  const subject = services ? `${trade} — ${r.topic}` : C(`univers du produit « ${p.product.name} » (${p.product.category ?? ""}) — ${r.topic} ; sans le produit lui-même`, `world of the product "${p.product.name}" (${p.product.category ?? ""}) — ${r.topic}; without the product itself`);
  const { checkAmbiance } = await import("../engine/service-media");
  for (const v of clipOrder(found, r.durationS).slice(0, 3)) {
    try {
      const buf = await downloadStockVideo(v);
      let d = decide("stock_video", { checker: "metadata", score: 7 });
      if (ai) {
        const dir = tmpDir("stockclip");
        try {
          fs.writeFileSync(path.join(dir, "in.mp4"), buf);
          await execTool("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0.5, Math.min(3, (v.duration || 4) / 2))), "-i", path.join(dir, "in.mp4"), "-frames:v", "1", "-q:v", "3", path.join(dir, "f.jpg")]);
          const frame = fs.readFileSync(path.join(dir, "f.jpg"));
          d = (await checkAmbiance({ ...ictx, usageKey: `${r.key}:stockclipqc:${v.source}:${v.id}` }, frame, subject, services)).decision;
          if (d.deliverable !== "stock_video") d = decide("stock_video", d.checked ? { checker: "ai", score: d.score, codes: [...d.fatalCodes, ...d.blockingCodes], issues: d.feedback ? [d.feedback] : [] } : { checker: "ai", score: null, error: d.reason });
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          d = decide("stock_video", { checker: "ai", score: null, error: (e as Error).message });
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      if (d.verdict !== "FINAL") continue;
      const keep = gateSave(ictx, d);
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: buf, name: `${C("plan-libre", "stock-shot")}-${r.part}-${v.source}-${v.id}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", meta: { provider: v.source, recipe: stockVideoCredit(v), stock: { source: v.source, id: v.id, page: v.page, author: v.author, license: v.license }, subject: r.topic, part: r.part, durationS: v.duration, ...keep.meta }, status: "review" });
      exclude.add(`${v.source}:${v.id}`);
      return { assetId: a.id, durationS: v.duration };
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    }
  }
  return null;
}
