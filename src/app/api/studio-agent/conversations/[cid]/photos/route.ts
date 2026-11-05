import {z} from 'zod';
import {requireUser,HttpError} from '@/lib/auth';
import {handle,ok,readForm} from '@/lib/http';
import type {Ctx} from '@/lib/route-helpers';
import {assertConversationEnabled} from '@/lib/orchestrator/conversation';
import {assertConversationPhotoImport,conversationPhotoReceipt,importConversationPhoto,MAX_CONVERSATION_PHOTO_BYTES} from '@/lib/orchestrator/conversation/photo-import';
export const runtime='nodejs';
const requestId=z.string().min(1).max(120);
export const GET=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{assertConversationEnabled();const user=await requireUser(),{cid}=await ctx.params;return ok(conversationPhotoReceipt(user,cid,requestId.parse(new URL(req.url).searchParams.get('requestId'))));});
export const POST=handle(async(req:Request,ctx:Ctx<{cid:string}>)=>{
 assertConversationEnabled();const user=await requireUser(),{cid}=await ctx.params;assertConversationPhotoImport(user,cid);
 const form=await readForm(req,MAX_CONVERSATION_PHOTO_BYTES+1048576),files=form.getAll('file');
 if(files.length!==1||typeof files[0]==='string'||!files[0].size)throw new HttpError(400,'Une seule photo est attendue par import, avec son identifiant de reprise.');
 if([...form.keys()].some(k=>!['file','requestId','folderId'].includes(k))||form.getAll('requestId').length!==1||form.getAll('folderId').length>1)throw new HttpError(400,'Champs d’import invalides ou dupliqués. Aucune analyse demandée.');
 const folder=form.get('folderId');if(folder!==null&&typeof folder!=='string')throw new HttpError(400,'Dossier invalide.');
 return ok(await importConversationPhoto(user,cid,{requestId:requestId.parse(form.get('requestId')),file:files[0],folderId:folder||null}));
});
