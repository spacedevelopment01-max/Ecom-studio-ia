/** Contrôle de livraison après les moteurs existants : présence, propriétaire, fichier décodable et destination.
 * La qualité métier/visuelle reste du ressort des barrières existantes, jamais remplacée par ce contrôle technique. */
import sharp from "sharp";
import { getAsset, assetData } from "../library";
import { json } from "../db";
import { UserFacingError } from "../jobs";
import { L } from "../i18n-server";
import { isAutoUsable } from "../quality/usable";
import { redact } from "../redact";
import fs from "node:fs";
import { storagePath } from "../storage";
import { execTool } from "../exec-tool";

export type ImageDelivery = { state: "delivered" | "partial" | "review"; message: string; assetIds: string[]; expected: number; delivered: number; review: number };
export async function imageDelivery(projectId: string, references: (string | null | undefined)[], opts: { expected?: number; adGallery?: boolean; reasons?: string[] } = {}): Promise<ImageDelivery> {
  const ids=[...new Set(references.filter((id):id is string=>!!id))];
  const expected=Math.max(1,Math.floor(opts.expected??ids.length));
  function refuse(fr:string,en:string):never {throw new UserFacingError(L(fr,en)+L(" Les fichiers et les coûts déjà engagés sont conservés ; aucune nouvelle génération n'est lancée automatiquement."," Files and previously committed costs are kept; no new generation is started automatically."));}
  const reason=opts.reasons?.length?" "+redact(opts.reasons.filter(Boolean).join(" ; ")).slice(0,400):"";
  if(!ids.length)refuse("Aucune image livrable n'a été obtenue."+reason,"No deliverable image was obtained."+reason);
  let review=0;
  for(const id of ids){
    const a=getAsset(id);
    if(!a||a.project_id!==projectId||a.deleted_at)refuse("Une image attendue est absente ou n'appartient pas à ce projet.","An expected image is missing or does not belong to this project.");
    const meta=json<any>(a.meta,{});
    if(a.status==="rejected"||meta.gate?.fatal||meta.gate?.verdict==="REJECTED")refuse("Une image attendue n'a pas passé les contrôles.","An expected image did not pass the checks.");
    if(a.kind!=="image"||!/^image\/(png|jpeg|webp|avif|gif)$/.test(a.mime))refuse("Le résultat ne contient pas une image exploitable.","The result does not contain a usable image.");
    try {const data=assetData(a);if(!data.length)throw Error("empty");const info=await sharp(data).metadata();if(!info.width||!info.height)throw Error("dimensions");await sharp(data).stats();}
    catch{refuse("Le fichier image attendu est absent ou illisible.","The expected image file is missing or unreadable.");}
    if(opts.adGallery && (a.role!=="ad"||!meta.aiAd||!["ready","approved"].includes(a.status)))refuse("La publicité n'est pas accessible dans sa galerie attendue.","The ad is not accessible in its expected gallery.");
    if(a.status==="review"||!isAutoUsable(a))review++;
  }
  const state=ids.length<expected?"partial":review?"review":"delivered";
  const message=state==="partial"?L(`${ids.length}/${expected} images disponibles ; la création est partielle.`,`${ids.length}/${expected} images available; creation is partial.`):review?L(`${ids.length} image(s) disponible(s), à vérifier dans la bibliothèque.`,`${ids.length} image(s) available for review in the library.`):L(`${ids.length} image(s) enregistrée(s) et accessible(s).`,`${ids.length} image(s) saved and accessible.`);
  return {state,message,assetIds:ids,expected,delivered:ids.length,review};
}

/** Un fichier vidéo est attendu, pas seulement un scénario ou un document de montage. Aucun appel réseau. */
export async function videoDelivery(projectId:string,assetId:string|null|undefined) {
  function refuse():never {throw new UserFacingError(L("La vidéo attendue n’est pas livrable : référence, fichier ou contrôle manquant. Les médias et versions acquis sont conservés ; aucun nouvel essai payant automatique.","The expected video cannot be delivered: a reference, file or check is missing. Acquired media and versions are kept; no automatic paid retry."));}
  const a=assetId?getAsset(assetId):null;
  if(!a||a.project_id!==projectId||a.deleted_at||a.kind!=="video"||!/^video\//.test(a.mime))refuse();
  const meta=json<any>(a.meta,{});
  if(a.status==="rejected"||meta.gate?.fatal||meta.gate?.verdict==="REJECTED")refuse();
  try{
    const file=storagePath(a.storage_key);if(!fs.statSync(file).isFile()||fs.statSync(file).size===0)refuse();
    const {stdout}=await execTool("ffprobe",["-v","error","-protocol_whitelist","file,pipe","-show_entries","format=duration:stream=codec_type,width,height","-of","json",file],{timeout:15000});
    const probe=JSON.parse(stdout),duration=Number(probe.format?.duration);
    if(!Number.isFinite(duration)||duration<=0||!probe.streams?.some((s:any)=>s.codec_type==="video"&&s.width>0&&s.height>0))refuse();
    await execTool("ffmpeg",["-v","error","-protocol_whitelist","file,pipe","-i",file,"-frames:v","1","-an","-f","null","-"],{timeout:15000});
  }catch{refuse();}
  const review=a.status==="review"||!isAutoUsable(a);
  return {state:review?"review":"delivered",message:review?L("Vidéo enregistrée et lisible, à vérifier dans la bibliothèque.","Video saved and readable, for review in the library."):L("Vidéo enregistrée et lisible dans la bibliothèque.","Video saved and readable in the library."),assetIds:[a.id],expected:1,delivered:1,review:review?1:0};
}
