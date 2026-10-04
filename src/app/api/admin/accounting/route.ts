import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { deleteCategory, report, saveAccountingSettings, saveCategory } from "@/lib/accounting-store";
import { rangeFromUrl } from "@/lib/accounting-api";

/** Rapport comptable d'une période (indicateurs, comparaison, graphiques, compte de résultat, journal). */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  return ok(report(rangeFromUrl(req.url)));
});

/** Réglages : prise en compte des lignes automatiques, catégories personnalisées. */
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const b = await body(
    req,
    z.object({
      settings: z.object({ countAiCosts: z.boolean().optional(), countStripeFees: z.boolean().optional() }).optional(),
      category: z.object({ id: z.string().max(40).optional(), fr: z.string().trim().min(1).max(60), en: z.string().trim().min(1).max(60) }).optional(),
      deleteCategory: z.string().max(40).optional(),
    }),
  );
  if (b.settings) saveAccountingSettings(b.settings);
  if (b.category) saveCategory(b.category);
  if (b.deleteCategory) deleteCategory(b.deleteCategory);
  return ok();
});
