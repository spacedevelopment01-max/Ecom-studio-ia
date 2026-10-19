import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { confirmInitialContext, initialCreativesView, quoteInitialCreatives, queueInitialCreatives } from "@/lib/social-v2/initial";
import { HttpError } from "@/lib/auth";
export const runtime = "nodejs";
export const GET = handle(async (_r: Request, ctx: Ctx) => { const { project: p } = await projectFromCtx(ctx); return ok({ initial: initialCreativesView(p.id) }); });
export const POST = handle(async (r: Request, ctx: Ctx) => {
    const { project: p } = await projectFromCtx(ctx), b = await body(r, z.object({ action: z.enum(["quote", "generate", "confirm-context"]), quoteId: z.string().max(100).optional() }));
    if (b.action === "confirm-context") {
        confirmInitialContext(p.id);
        return ok({ initial: initialCreativesView(p.id) });
    }
    if (b.action === "quote")
        return ok({ quote: quoteInitialCreatives(p.id) });
    if (!b.quoteId)
        throw new HttpError(400, "Devis accepté requis.");
    return ok(queueInitialCreatives(p.id, b.quoteId));
});
