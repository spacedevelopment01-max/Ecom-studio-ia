/**
 * Symbole de logo sur mesure, dans l'ordre :
 *  1. IA disponible : pictogramme SVG dessiné d'après le produit et la marque → nettoyage strict côté serveur →
 *     lisibilité à 16/32 px → contrôle visuel par l'IA (lisible ? évoque le produit ? pas un logo existant ?) ;
 *     deux essais au plus, le second guidé par les défauts du premier ;
 *  2. sinon (ou en cas d'échec) : silhouette réelle du produit, tirée du détourage validé (contrôlée à l'image
 *     par l'IA quand elle est disponible) ;
 *  3. sinon : aucun symbole sur mesure — l'appelant garde le symbole de la bibliothèque.
 * Un symbole refusé n'est jamais proposé ; les raisons sont rendues pour le journal.
 */
import type { Project } from "../projects";
import { fitSymbol, sanitizeSymbolSvg, silhouetteSymbol, symbolLegibility, symbolSheet, type CustomSymbol } from "../media/logo-symbol";
import { L } from "../i18n-server";

export type SymbolCheck = { legible: boolean; evokesProduct: boolean; resemblesExistingLogo: boolean; score: number; issues: string[] };

/** Accès à l'IA (injecté : réel dans le studio, simulé dans les tests). */
export type SymbolAi = {
  draw(feedback?: string): Promise<{ concept: string; svg: string }>;
  check(sheet: Buffer): Promise<SymbolCheck>;
  passed(r: SymbolCheck): boolean;
};

export type SymbolDesign = { symbol: CustomSymbol; concept: string; source: "ai" | "silhouette"; notes: string[] } | { symbol: null; notes: string[] };

export const MAX_AI_DRAWS = 2;

export async function designSymbol(input: { project: Pick<Project, "product" | "brand">; cutout: Buffer | null; color: string; accent: string; ai: SymbolAi | null }): Promise<SymbolDesign> {
  const { ai, color, accent } = input;
  const notes: string[] = [];
  if (ai) {
    let feedback: string | undefined;
    for (let attempt = 0; attempt < MAX_AI_DRAWS; attempt++) {
      let out: { concept: string; svg: string };
      try {
        out = await ai.draw(feedback);
      } catch (e) {
        notes.push(`IA indisponible pour le symbole : ${(e as Error).message}`);
        break;
      }
      const clean = sanitizeSymbolSvg(out.svg, { accent });
      if (!clean.ok) {
        notes.push(`symbole IA refusé (SVG) : ${clean.reason}`);
        feedback = `SVG refusé par la validation : ${clean.reason}. Respecte strictement les règles.`;
        continue;
      }
      const sym = fitSymbol(clean.symbol, 0.06);
      const leg = symbolLegibility(sym);
      if (!leg.ok) {
        notes.push(`symbole IA refusé (lisibilité) : ${leg.issues.join(" ; ")}`);
        feedback = `illisible en petit : ${leg.issues.join(" ; ")}. Formes plus grandes et plus simples, traits plus épais.`;
        continue;
      }
      let check: SymbolCheck;
      try {
        check = await ai.check(await symbolSheet(sym, color, accent));
      } catch (e) {
        notes.push(`contrôle visuel du symbole impossible : ${(e as Error).message}`);
        break;
      }
      if (ai.passed(check)) return { symbol: sym, concept: out.concept.trim() || L("Symbole dessiné d'après la forme du produit.", "Symbol drawn from the product's shape."), source: "ai", notes };
      notes.push(`symbole IA refusé au contrôle visuel (${check.score}/10) : ${check.issues.join(" ; ") || "sans détail"}`);
      feedback = [!check.legible && "illisible à 16 px", !check.evokesProduct && "n'évoque pas le produit", check.resemblesExistingLogo && "ressemble à un logo existant", ...check.issues].filter(Boolean).join(" ; ");
    }
  }
  if (input.cutout) {
    const sil = await silhouetteSymbol(input.cutout).catch((e) => ({ ok: false as const, reason: (e as Error).message }));
    if (!sil.ok) notes.push(`silhouette écartée : ${sil.reason}`);
    else {
      let ok = true;
      if (ai) {
        try {
          const check = await ai.check(await symbolSheet(sil.symbol, color, accent));
          ok = ai.passed(check);
          if (!ok) notes.push(`silhouette refusée au contrôle visuel (${check.score}/10) : ${check.issues.join(" ; ") || "sans détail"}`);
        } catch (e) {
          // Contrôle visuel impossible : la silhouette a passé les contrôles locaux (lisibilité, forme reconnaissable).
          notes.push(`contrôle visuel de la silhouette impossible : ${(e as Error).message}`);
        }
      }
      if (ok)
        return {
          symbol: sil.symbol,
          concept: L("Symbole tiré de la silhouette réelle du produit, simplifiée et en aplat : reconnaissable d'un coup d'œil, net jusqu'en favicon.", "Symbol taken from the product's real silhouette, simplified and solid: recognizable at a glance, crisp down to favicon size."),
          source: "silhouette",
          notes,
        };
    }
  } else notes.push("pas de détourage validé pour tirer une silhouette");
  return { symbol: null, notes };
}
