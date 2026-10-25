import { requireUser } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { planAccountErasure, requestAccountErasure } from "@/lib/privacy";
import { all } from "@/lib/db";
import { z } from "zod";
export const GET=handle(async()=>{const u=await requireUser();return ok({plan:planAccountErasure(u.id),requests:all("SELECT id,status,created_at FROM privacy_requests WHERE user_id=? ORDER BY created_at DESC",u.id)});});
export const POST=handle(async(req:Request)=>{const u=await requireUser();await body(req,z.object({action:z.literal("request_erasure"),confirmed:z.literal(true)}));return ok({request:requestAccountErasure(u.id),deleted:false,automaticEnabled:false});});
