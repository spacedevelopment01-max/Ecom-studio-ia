/**
 * Jeu d'images d'un projet (création complète, demande unique) — Image Engine V2 comme point central.
 *
 *  - composants locaux réutilisés (gratuits, sans IA) : packshots, détails recadrés de la photo d'origine, mises en
 *    scène du studio et bannières sans texte (produit réel, pixels d'origine) ;
 *  - photos libres de l'univers : recherche multisource V2, licences et contrôle du sujet ;
 *  - photos du produit en situation : génération V2 (brief, fidélité au produit, barrière, reprises ciblées), seulement
 *    si un fournisseur est disponible pour le compte et dans le plafond de la tâche ;
 *  - entreprise de services : photos réelles recadrées, photos libres puis images V2 par emplacement du site.
 * Les visuels réseaux et publicités viennent de Social V2 et Advertising V2 (plus de visuels figés de l'ancien moteur).
 * Chaque partie est un point de reprise : une reprise ne refait ni ne repaie ce qui est fait.
 */
import type { JobContext } from "../jobs";
import { loadProject } from "../projects";
import { L } from "../i18n-server";
import { runImageEngineV2 } from "./engine";

export type ImageSetV2Result = { created: string[]; local: number; stock: number; generated: number; notes: string[] };

export async function runImageSetV2(ctx: JobContext, projectId: string): Promise<ImageSetV2Result> {
  const p = loadProject(projectId);
  const { generateImageSet } = await import("../engine/images");
  // 1. Composants locaux (et, pour un service, photos libres et images V2 par emplacement).
  const local = await generateImageSet(ctx, projectId, { localOnly: true });
  const out: ImageSetV2Result = { created: [...local.created], local: local.created.length, stock: 0, generated: 0, notes: [] };
  if (p.business === "services") return out;
  // 2. Univers du produit en photos libres (sections du site sans produit) : recherche seule, jamais de génération.
  const stock = await ctx.step("img2:universe", async () => {
    ctx.progress(0.8, L("Photos libres de l'univers du produit", "Royalty-free photos of the product's world"));
    const r = await runImageEngineV2(ctx, projectId, { kind: "ambiance", support: "site", aspect: "16:9", count: 2, allowGenerate: false });
    return { ids: r.outcomes.filter((o) => o.assetId && o.verdict === "FINAL").map((o) => o.assetId!), notes: r.notes };
  });
  out.created.push(...stock.ids);
  out.stock = stock.ids.length;
  // 3. Produit réel en situation (génération contrôlée, fidélité au produit) : 16:9 pour l'ouverture, 4:5 pour la page.
  for (const [i, aspect] of (["16:9", "4:5"] as const).entries()) {
    const gen = await ctx.step(`img2:lifestyle:${i}`, async () => {
      ctx.progress(0.88 + i * 0.05, L("Photos du produit en situation", "Lifestyle product photos"));
      const r = await runImageEngineV2(ctx, projectId, { kind: "lifestyle", support: i === 0 ? "banner" : "product_page", aspect, variant: i, name: `en-situation-${i + 1}` });
      return { ids: r.outcomes.filter((o) => o.assetId && o.verdict === "FINAL").map((o) => o.assetId!), notes: r.notes };
    });
    out.created.push(...gen.ids);
    out.generated += gen.ids.length;
    out.notes.push(...gen.notes);
  }
  return out;
}
