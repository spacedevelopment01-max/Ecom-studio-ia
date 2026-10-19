import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { confirmInitialContext, initialCreativesView, quoteInitialCreatives, queueInitialCreatives } from "@/lib/social-v2/initial";
import { HttpError } from "@/lib/auth";
import { initialAuthorizationView, quoteInitialAuthorization, acceptInitialAuthorization, cancelInitialAuthorization } from "@/lib/social-v2/initial-authorization";
export const runtime = "nodejs";
export const GET = handle(async (_r: Request, ctx: Ctx) => { const { project: p } = await projectFromCtx(ctx); return ok({ initial: initialCreativesView(p.id), authorization: initialAuthorizationView(p.id) }); });
export const POST = handle(async (r: Request, ctx: Ctx) => {
    const { project: p } = await projectFromCtx(ctx), b = await body(r, z.object({ action: z.enum(["quote", "generate", "confirm-context", "authorize-quote", "authorize", "cancel-authorization"]), quoteId: z.string().max(100).optional() }));
    if (b.action === "authorize-quote") return ok({ quote: quoteInitialAuthorization(p.id) });
    if (b.action === "cancel-authorization") { cancelInitialAuthorization(p.id); return ok({ authorization: initialAuthorizationView(p.id) }); }
    if (b.action === "authorize") {
        if (!b.quoteId) throw new HttpError(400, "Devis initial accepté requis.");
        return ok(acceptInitialAuthorization(p.id, b.quoteId));
    }
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
