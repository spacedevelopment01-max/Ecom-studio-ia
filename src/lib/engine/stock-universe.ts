/**
 * Univers d'un produit en photos et vidéos libres de droits (gratuites) : le lieu, la matière, l'usage, l'ambiance —
 * jamais le produit lui-même (les banques d'images n'ont pas le vôtre). Pour les sections du site sans produit et les
 * plans de coupe des vidéos. Crédit de l'auteur gardé ; contrôle qualité si l'IA est active.
 */
import { z } from "zod";
import { all } from "../db";
import { saveAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { llmConfigured, llmJson } from "../ai/llm";
import { JobCancelled, JobPaused } from "../jobs";
import { C } from "../i18n-server";
import { searchStock, stockCredit } from "../stock/photos";
import { rankStock, tradeStock } from "../stock/trade-queries";
import { firstOnTopic } from "./service-media";

type Ictx = { userId: string; projectId: string; jobId?: string | null };

/** Recherches de l'univers du produit (IA légère si active ; sinon catégorie et secteur). */
export async function universeQueries(ictx: Ictx, p: Project): Promise<{ lang: "fr" | "en"; queries: string[] }> {
  const local = [p.product.category, p.product.sector ?? ""].filter(Boolean);
  if (!llmConfigured()) return { lang: "fr", queries: local };
  try {
    const r = await llmJson(
      {
        task: "classification",
        ...ictx,
        usageKey: `${ictx.jobId ?? "stock"}:universe-queries`,
        system: "You write search queries for royalty-free photo and video libraries. Short English queries (2 to 4 words) showing the WORLD of a product without the product itself: where and how it is used, its raw material, its origin, the mood of its customers' daily life. No brand names, never the product as such.",
        prompt: `Product: ${p.product.name} — ${p.product.category}. ${(p.product.summary ?? "").slice(0, 300)}\nAudience: ${p.brand?.audience ?? ""}\nAnswer { "queries": ["…", "…", "…"] }.`,
        maxTokens: 400,
      },
      z.object({ queries: z.array(z.string()).max(4) }),
    );
    return r.queries.length ? { lang: "en", queries: r.queries } : { lang: "fr", queries: local };
  } catch (e) {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    return { lang: "fr", queries: local };
  }
}

/**
 * Photos d'ambiance de l'univers (rôle « ambiance », jamais prises pour une photo du produit). Filtre gratuit d'abord
 * (description de la banque), puis au plus 5 candidats contrôlés par photo voulue, avec le sujet explicite ; seule une
 * photo FINAL est gardée (jamais le premier résultat pris au hasard, jamais une photo « à vérifier »).
 */
export async function universePhotos(ictx: Ictx, p: Project, n = 2): Promise<Asset[]> {
  const { lang, queries } = await universeQueries(ictx, p);
  const used = new Set(all<{ k: string }>("SELECT json_extract(meta, '$.stock.source') || ':' || json_extract(meta, '$.stock.id') k FROM assets WHERE project_id = ? AND json_extract(meta, '$.stock') IS NOT NULL", p.id).map((x) => x.k));
  const known = tradeStock(`${p.product.category ?? ""} ${p.product.sector ?? ""} ${p.product.name ?? ""}`);
  const must = known?.must ?? [];
  // Univers d'un produit : une matière ou une texture peut être justement recherchée (aucun concept écarté ici).
  const found = rankStock(await searchStock(queries, "landscape", lang, used), must, llmConfigured(), []);
  const subject = C(`univers du produit « ${p.product.name} » (${p.product.category ?? ""}) : lieu, matière, usage, sans le produit lui-même`, `world of the product "${p.product.name}" (${p.product.category ?? ""}): place, material, use, without the product itself`);
  const out: Asset[] = [];
  let rest = found;
  // Au plus n passes de 5 candidats (5 contrôles payants au plus par photo voulue), réussies ou non.
  let passes = 0;
  while (out.length < n && rest.length && passes++ < n) {
    const pick = await firstOnTopic(ictx, rest, subject, (ph) => `${ictx.jobId ?? "stock"}:universeqc:${ph.source}:${ph.id}`, must.length > 0, { stockPrompt: false });
    // Candidats déjà regardés (refusés, ou celui retenu) : jamais repris pour la photo suivante.
    if (!pick) {
      rest = rest.slice(5);
      continue;
    }
    rest = rest.slice(rest.indexOf(pick.photo) + 1);
    const { photo, img, gate } = pick;
    out.push(await saveAsset({ projectId: p.id, userId: p.userId, data: img, name: `${C("ambiance-univers", "world-mood")}-${out.length + 1}.jpg`, mime: "image/jpeg", role: "ambiance", folderKey: "images.scenes", origin: "import", meta: { recipe: stockCredit(photo), stock: { source: photo.source, id: photo.id, page: photo.page, author: photo.author, license: photo.license }, format: "16:9", ...gate.meta }, status: "review" }));
  }
  return out;
}
