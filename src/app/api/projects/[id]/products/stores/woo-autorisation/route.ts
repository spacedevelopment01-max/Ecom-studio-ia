import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { ownedProject, requireUser } from "@/lib/auth";
import { assertStoreUrl } from "@/lib/products/connectors/types";
import { lienAutorisationWoo } from "@/lib/integrations/ventes";

/** Le lien « relier ma boutique WooCommerce en un clic » : le client approuve sur son site, la clé arrive seule. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const b = await body(req, z.object({ url: z.string().min(4).max(300) }));
  const u = await assertStoreUrl(b.url);
  return ok({ url: lienAutorisationWoo(id, user.id, `${u.origin}${u.pathname.replace(/\/+$/, "")}`) });
});
