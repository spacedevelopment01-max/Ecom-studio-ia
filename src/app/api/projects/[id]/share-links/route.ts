import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { revokeProjectLinks } from "@/lib/share-links";
export const POST=handle(async(req:Request,ctx:Ctx)=>{
 const{user,project}=await projectFromCtx(ctx);await body(req,z.object({action:z.literal('revoke'),confirmed:z.literal(true)}));revokeProjectLinks(user.id,project.id);return ok({revoked:true});
});
