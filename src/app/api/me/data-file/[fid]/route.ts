import fs from "node:fs";
import { requireUser, HttpError } from "@/lib/auth";
import { handle } from "@/lib/http";
import { one } from "@/lib/db";
import { storagePath } from "@/lib/storage";
import type { Asset } from "@/lib/library";
/** Copie personnelle : inclut les projets archivés, sans rouvrir leurs droits de génération. */
export const GET=handle(async(_req:Request,ctx:{params:Promise<{fid:string}>})=>{
 const u=await requireUser(),{fid}=await ctx.params;
 const a=one<Asset>("SELECT a.* FROM assets a JOIN projects p ON p.id=a.project_id WHERE a.id=? AND a.user_id=? AND p.user_id=?",fid,u.id,u.id);
 if(!a||!a.storage_key.startsWith(`${u.id}/${a.project_id}/`))throw new HttpError(404,"Fichier introuvable / File not found");
 const file=storagePath(a.storage_key);if(!fs.existsSync(file))throw new HttpError(404,"Fichier introuvable / File not found");
 return new Response(fs.createReadStream(file) as any,{headers:{"Content-Type":"application/octet-stream","Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`,"Content-Length":String(fs.statSync(file).size),"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Referrer-Policy":"no-referrer"}});
});
