/**
 * Jeu d'images d'un projet (création complète, demande unique) — règle « images finales 100 % IA ».
 *
 * Chaque image finale est CRÉÉE par l'IA d'images (Image Engine V2 en génération seule, `noStock`) : brief et
 * direction artistique du client, vrai produit en référence (détourage préparé avant), contrôle, correction ciblée.
 *  - produit : image principale épurée sans texte, produit en situation pour l'ouverture (16:9) et pour la page (4:5),
 *    ambiance de l'univers (16:9) ;
 *  - entreprise de services : scènes du métier (étape précise du geste) et bannière, illustrations jamais présentées
 *    comme de vrais chantiers.
 * Plus de packshots composés par le studio, de recadrages ni de photos de banque comme images finales. Sans IA active :
 * rien n'est créé et la raison est dite (aucun gabarit à la place). Chaque image est un point de reprise.
 */
import type { JobContext } from "../jobs";
import { loadProject } from "../projects";
import { aiActiveFor } from "../ai/access";
import { L } from "../i18n-server";
import { runImageEngineV2, type ImageRequestV2 } from "./engine";
import { NO_AI_IMAGES } from "./ai-only";

export type ImageSetV2Result = { created: string[]; local: number; stock: number; generated: number; notes: string[] };

/** Plan du jeu d'images : un rôle par image, tous créés par l'IA. */
export function imageSetPlan(services: boolean): (ImageRequestV2 & { step: string; label: [string, string] })[] {
  const ai = { allowGenerate: true, noStock: true, count: 1 } as const;
  return services
    ? [
      { ...ai, step: "img-ai:trade:0", kind: "trade_photo", support: "service_page", aspect: "4:5", variant: 0, name: "metier-1", label: ["Scène du métier (IA)", "Trade scene (AI)"] },
      { ...ai, step: "img-ai:trade:1", kind: "trade_photo", support: "service_page", aspect: "4:5", variant: 1, name: "metier-2", label: ["Scène du métier (IA)", "Trade scene (AI)"] },
      { ...ai, step: "img-ai:banner", kind: "banner", support: "banner", aspect: "16:9", name: "banniere", label: ["Bannière du site (IA)", "Site banner (AI)"] },
    ]
    : [
      { ...ai, step: "img-ai:main", kind: "packshot", support: "product_page", aspect: "1:1", name: "produit-principal", label: ["Image principale du produit (IA)", "Main product image (AI)"] },
      { ...ai, step: "img2:lifestyle:0", kind: "lifestyle", support: "banner", aspect: "16:9", variant: 0, name: "en-situation-1", label: ["Produit en situation (IA)", "Lifestyle product photo (AI)"] },
      { ...ai, step: "img2:lifestyle:1", kind: "lifestyle", support: "product_page", aspect: "4:5", variant: 1, name: "en-situation-2", label: ["Produit en situation (IA)", "Lifestyle product photo (AI)"] },
      { ...ai, step: "img-ai:ambiance", kind: "ambiance", support: "site", aspect: "16:9", name: "ambiance", label: ["Ambiance de l'univers (IA)", "Brand world mood (AI)"] },
    ];
}

export async function runImageSetV2(ctx: JobContext, projectId: string, run: typeof runImageEngineV2 = runImageEngineV2, options: { instructions?: string } = {}): Promise<ImageSetV2Result> {
  const p = loadProject(projectId);
  const out: ImageSetV2Result = { created: [], local: 0, stock: 0, generated: 0, notes: [] };
  if (!aiActiveFor(p.userId, projectId)) {
    out.notes.push(L(NO_AI_IMAGES.fr, NO_AI_IMAGES.en));
    return out;
  }
  // Référence du produit préparée (détourage) avant toute génération : jamais un produit ressemblant.
  if (p.business !== "services") {
    const { ensureCutouts } = await import("../engine/cutouts");
    await ctx.step("img-ai:cutouts", async () => (await ensureCutouts(ctx, p)).length);
  }
  const plan = imageSetPlan(p.business === "services");
  for (const [i, { step, label, ...req }] of plan.entries()) {
    const r = await ctx.step(step, async () => {
      ctx.progress(0.8 + (i / plan.length) * 0.15, L(label[0], label[1]));
      const res = await run(ctx, projectId, { ...req, ...(options.instructions ? { instructions: options.instructions } : {}) });
      return { ids: res.outcomes.filter((o) => o.assetId && o.verdict !== "REJECTED").map((o) => o.assetId!), notes: res.notes, stopped: res.stoppedByCostCap };
    });
    out.created.push(...r.ids);
    out.generated += r.ids.length;
    out.notes.push(...r.notes);
    if (r.stopped) {
      out.notes.push(L("Budget de la tâche atteint : les images restantes ne sont pas créées (aucun gabarit à la place).", "Task budget reached: the remaining images are not created (no template instead)."));
      break;
    }
  }
  return out;
}
