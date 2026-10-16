/**
 * Banque du THÈME, remplie à la création du projet (règle du propriétaire) :
 *  - AUCUNE photo de banque comme image du site (règle « images finales 100 % IA ») : les images du site sont créées
 *    par l'IA (`runImageSetV2`). `THEME_BANK_IMAGES` vaut 0 ; les photos libres déjà présentes restent marquées « thème »
 *    sans être reprises automatiquement ;
 *  - vidéos libres de droits : 3 pour un service, 1 pour un produit SEULEMENT si une vidéo vraiment liée est trouvée
 *    (ex. une gourde → un sentier de randonnée), sinon aucune.
 * Elles servent uniquement à alimenter le thème (site) : JAMAIS reprises automatiquement dans les publications ou les
 * publicités (le client peut ensuite choisir lui-même d'en utiliser une). Marquées `meta.bank = "theme"`.
 */
import { all, run } from "../db";
import type { Project } from "../projects";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";

/** Photos de banque ajoutées comme images du site : aucune (images finales créées par l'IA). */
export const THEME_BANK_IMAGES = 0;
export const THEME_BANK_VIDEOS = { services: 3, products: 1 } as const;

type Ictx = { userId: string; projectId: string; jobId?: string | null };

export type ThemeBankDeps = {
  /** Produits : photos de l'univers du produit (lieu, matière, usage), contrôlées. */
  productPhotos: (ictx: Ictx, p: Project, n: number) => Promise<string[]>;
  /** Services : photos du métier, contrôlées, jusqu'à `target` au total. */
  servicePhotos: (ictx: Ictx, p: Project, target: number) => Promise<string[]>;
  /** Un plan vidéo libre de droits en rapport DIRECT avec le produit ou le service (null : rien d'assez proche). */
  clip: (ictx: Ictx, p: Project, index: number, exclude: Set<string>) => Promise<{ assetId: string } | null>;
};

/** Images libres de droits déjà dans le projet (comptent dans les 15). */
export const stockImageCount = (projectId: string) => all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND kind = 'image' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.stock') IS NOT NULL", projectId).length;
const bankVideoCount = (projectId: string) => all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND kind = 'video' AND deleted_at IS NULL AND json_extract(meta, '$.bank') = 'theme'", projectId).length;

/** Marque des médias comme réservés au thème (jamais repris dans une publication ou une publicité). */
export function markThemeBank(ids: string[]) {
  for (const id of ids) run("UPDATE assets SET meta = json_set(COALESCE(meta, '{}'), '$.bank', 'theme') WHERE id = ?", id);
}

export async function fillThemeBank(ctx: JobContext | null, p: Project, deps: ThemeBankDeps): Promise<{ images: number; videos: number }> {
  const ictx = { userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null };
  const keep = (e: unknown) => {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    console.warn("[banque du thème]", (e as Error).message);
    return [] as string[];
  };
  const services = p.business === "services";
  const missing = Math.max(0, THEME_BANK_IMAGES - stockImageCount(p.id));
  let added: string[] = [];
  if (missing) {
    ctx?.progress(0.97, services ? "Banque d'images du thème : photos du métier" : "Banque d'images du thème : univers du produit");
    added = services ? await deps.servicePhotos(ictx, p, THEME_BANK_IMAGES).catch(keep) : await deps.productPhotos(ictx, p, missing).catch(keep);
  }
  // Toutes les images libres de droits du projet sont des images du thème (jamais des fonds de publications/publicités).
  markThemeBank(all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND kind = 'image' AND json_extract(meta, '$.stock') IS NOT NULL AND json_extract(meta, '$.bank') IS NULL", p.id).map((r) => r.id));
  const wanted = services ? THEME_BANK_VIDEOS.services : THEME_BANK_VIDEOS.products;
  const exclude = new Set<string>();
  let videos = bankVideoCount(p.id);
  for (let k = videos; k < wanted; k++) {
    const c = await deps.clip(ictx, p, k, exclude).catch((e) => {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      return null;
    });
    if (!c) break; // produit : aucune vidéo vraiment liée → aucune (jamais un plan hors sujet)
    exclude.add(c.assetId);
    markThemeBank([c.assetId]);
    videos++;
  }
  return { images: added.length, videos };
}

/** Branchement réel : moteurs de photos libres existants (contrôle du sujet) et recherche de plans vidéo. */
export function realThemeBankDeps(): ThemeBankDeps {
  return {
    async productPhotos(ictx, p, n) {
      const { universePhotos } = await import("../engine/stock-universe");
      return (await universePhotos(ictx, p, n)).map((a) => a.id);
    },
    async servicePhotos(ictx, p, target) {
      const { stockGallery } = await import("../engine/service-media");
      return stockGallery(ictx, p, (p.brand?.name || p.product.name || "activite").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30), target);
    },
    async clip(ictx, p, index, exclude) {
      const { findStockClip } = await import("../stock/stock-clip");
      const topic = p.business === "services" ? (p.services?.services?.[index]?.name ?? p.product.category ?? p.product.name ?? "") : `${p.product.name ?? ""} ${p.product.category ?? ""}`;
      return findStockClip(ictx, p, { topic, part: ["hook", "demonstration", "result"][index % 3], aspect: "16:9", durationS: 6, index, key: `bank-theme-${index}` }, exclude);
    },
  };
}
