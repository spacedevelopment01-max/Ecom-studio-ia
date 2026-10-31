import {z} from 'zod';
import {requireUser} from '@/lib/auth';
import {body,handle,ok} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {BrandReviewCommandSchema} from '@/lib/orchestrator/conversation/brand-review-contract';
import {brandReviewView,quoteBrandReview,confirmBrandReview} from '@/lib/orchestrator/conversation/brand-review-execution';
export const runtime='nodejs';
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,source=z.string().min(1).max(100).parse(new URL(req.url).searchParams.get('source'));return ok(brandReviewView(u,cid,source));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{const u=await requireUser(),{cid}=await ctx.params,cmd=await body(req,BrandReviewCommandSchema);return ok(cmd.action==='quote'?quoteBrandReview(u,cid,cmd):confirmBrandReview(u,cid,cmd.quoteId));});
