/** Durable receipts around the provider→file→asset window. Private project data, never an exported proof. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "../db";
import { UserFacingError } from "../jobs";
import { L } from "../i18n-server";
const paths=(projectId:string,key:string)=>{
 const hash=crypto.createHash("sha256").update(`${projectId}:${key}`).digest("hex");
 const dir=path.join(DATA_DIR,"video-receipts",crypto.createHash("sha256").update(projectId).digest("hex"));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});return {dir,json:path.join(dir,`${hash}.json`),blob:path.join(dir,`${hash}.bin`)};
};
function atomic(file:string,data:Buffer|string) {
 const tmp=`${file}.${crypto.randomUUID()}.tmp`;
 const fd=fs.openSync(tmp,"wx",0o600);
 try {try {fs.writeFileSync(fd,data);fs.fsyncSync(fd);} finally {fs.closeSync(fd);}fs.renameSync(tmp,file);}
 finally {if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
function stateOf(file:string):{state?:string} {
 try {const state=JSON.parse(fs.readFileSync(file,"utf8"));if(state&&typeof state==="object"&&typeof state.state==="string")return state;}catch{}
 throw new UserFacingError(L("Reçu vidéo illisible ou en cours d’enregistrement : fichier conservé, aucun nouvel envoi. Vérifiez le stockage et rapprochez le résultat avant une reprise.","Video receipt unreadable or being saved: file kept, no new dispatch. Check storage and reconcile the result before resuming."),"VIDEO_RECEIPT_UNREADABLE");
}
export async function videoReceipt(projectId:string,key:string,produce:()=>Promise<Buffer>):Promise<Buffer> {
 const p=paths(projectId,key);
 if(fs.existsSync(p.blob)) return fs.readFileSync(p.blob);
 if(fs.existsSync(p.json)) {
  const state=stateOf(p.json);
  if(state.state!=="confirmed_failed") throw new UserFacingError("Résultat vidéo incertain ou traitement concurrent : reçu conservé. Aucune relance automatique ; rapprochez la tâche du fournisseur avant de reprendre.");
 }
 // Exclusive start also blocks concurrent execution of the same paid stage.
 let fd:number|null=null;
 try {fd=fs.openSync(p.json,"wx",0o600);fs.writeFileSync(fd,JSON.stringify({key,state:"started",at:Date.now()}));fs.fsyncSync(fd);}
 catch(error) {
  if(fd!==null) {
   // This process exclusively created the claim, and produce() has not run: only this unsent claim is removed.
   fs.closeSync(fd);fd=null;fs.unlinkSync(p.json);
   throw new UserFacingError(L("Le reçu vidéo n’a pas pu être enregistré : aucun plan envoyé ni payé. Vérifiez l’espace de stockage avant de reprendre ; les autres résultats restent conservés.","The video receipt could not be saved: no shot sent or paid for. Check storage space before resuming; other results are kept."),"VIDEO_RECEIPT_STORE_FAILED");
  }
  if(!fs.existsSync(p.json)) throw error;
  const state=stateOf(p.json);
  if(state.state!=="confirmed_failed") throw new UserFacingError("Étape vidéo déjà engagée : aucune seconde requête automatique.");
  // A confirmed, free refusal remains a manual decision, never a worker retry.
  throw new UserFacingError("Échec fournisseur confirmé : reçu conservé ; préparez une reprise ciblée explicite.");
 }
 finally {if(fd!==null)fs.closeSync(fd);}
 let data:Buffer;
 try {data=await produce();}
 catch(error) {
  const known=(error as {mediaReleased?:boolean}).mediaReleased===true;
  atomic(p.json,JSON.stringify({key,state:known?"confirmed_failed":"uncertain",at:Date.now()}));
  throw error;
 }
 // Persist bytes before any media decoding or database insertion. Crash before this line stays uncertain.
 atomic(p.blob,data);
 atomic(p.json,JSON.stringify({key,state:"received",sha256:crypto.createHash("sha256").update(data).digest("hex"),bytes:data.length,at:Date.now()}));
 return data;
}
export function hasUncertainVideoReceipt(projectId:string,prefix:string) {
 const p=paths(projectId,prefix);
 return fs.readdirSync(p.dir).filter(f=>f.endsWith(".json")).some(f=>{
  try {const r=JSON.parse(fs.readFileSync(path.join(p.dir,f),"utf8"));return r.key?.startsWith(prefix) && ["started","uncertain"].includes(r.state);}
  catch {return true;}
 });
}
