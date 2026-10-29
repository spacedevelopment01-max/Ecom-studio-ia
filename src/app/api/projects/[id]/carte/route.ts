/**
 * Carte du restaurant (#239, phase 2) : catégories et plats du projet. Propriétaire du projet seulement ; photos des
 * médias du projet seulement. Publier un plat le rend visible dans l'aperçu et l'export, et sur le site hébergé à la
 * prochaine publication du site.
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { addCategory, createItem, deleteCategory, ITEM_STATUSES, listCarte, renameCategory, reorderCategories, reorderItems, setItemStatus, updateItem } from "@/lib/contenus/carte";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(listCarte(p.id, { archived: new URL(req.url).searchParams.has("archives") }));
});

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("category-add"), title: z.string().max(60) }),
  z.object({ action: z.literal("category-rename"), id: z.string().max(40), title: z.string().max(60) }),
  z.object({ action: z.literal("category-delete"), id: z.string().max(40) }),
  z.object({ action: z.literal("category-order"), ids: z.array(z.string().max(40)).max(100) }),
  z.object({ action: z.literal("item-create"), item: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("item-update"), id: z.string().max(40), item: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("item-status"), id: z.string().max(40), status: z.enum(ITEM_STATUSES) }),
  z.object({ action: z.literal("item-order"), ids: z.array(z.string().max(40)).max(500) }),
]);

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, Schema);
  try {
    if (b.action === "category-add") return ok({ category: addCategory(p.id, b.title), ...listCarte(p.id) });
    if (b.action === "category-rename") renameCategory(p.id, b.id, b.title);
    if (b.action === "category-delete") deleteCategory(p.id, b.id);
    if (b.action === "category-order") reorderCategories(p.id, b.ids);
    if (b.action === "item-create") return ok({ item: createItem(p.id, b.item), ...listCarte(p.id) });
    if (b.action === "item-update") return ok({ item: updateItem(p.id, b.id, b.item), ...listCarte(p.id) });
    if (b.action === "item-status") return ok({ item: setItemStatus(p.id, b.id, b.status), ...listCarte(p.id) });
    if (b.action === "item-order") reorderItems(p.id, b.ids);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e) throw new HttpError(400, (e as { issues: { message: string; path: (string | number)[] }[] }).issues.map((i) => `${i.path.join(".")} : ${i.message}`).join(" ; ") || L("Saisie invalide.", "Invalid input."));
    throw e;
  }
  return ok(listCarte(p.id));
});
