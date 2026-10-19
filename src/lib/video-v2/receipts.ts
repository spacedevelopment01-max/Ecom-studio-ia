/** Durable receipts around the provider→file→asset window. Private project data, never an exported proof. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DATA_DIR } from "../db";
import { UserFacingError } from "../jobs";
const paths=(projectId:string,key:string)=>{
 const hash=crypto.createHash("sha256").update(`${projectId}:${key}`).digest("hex");
 const dir=path.join(DATA_DIR,"video-receipts",crypto.createHash("sha256").update(projectId).digest("hex"));
 fs.mkdirSync(dir,{recursive:true,mode:0o700});return {dir,json:path.join(dir,`${hash}.json`),blob:path.join(dir,`${hash}.bin`)};
};
function atomic(file:string,data:Buffer|string) {
 const tmp=`${file}.${crypto.randomUUID()}.tmp`;
 const fd=fs.openSync(tmp,"wx",0o600);
 try {fs.writeFileSync(fd,data);fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
 fs.renameSync(tmp,file);
}
export async function videoReceipt(projectId:string,key:string,produce:()=>Promise<Buffer>):Promise<Buffer> {
 const p=paths(projectId,key);
 if(fs.existsSync(p.blob)) return fs.readFileSync(p.blob);
 if(fs.existsSync(p.json)) {
  const state=JSON.parse(fs.readFileSync(p.json,"utf8"));
  if(state.state!=="confirmed_failed") throw new UserFacingError("Résultat vidéo incertain ou traitement concurrent : reçu conservé. Aucune relance automatique ; rapprochez la tâche du fournisseur avant de reprendre.");
 }
 // Exclusive start also blocks concurrent execution of the same paid stage.
 try {fs.writeFileSync(p.json,JSON.stringify({key,state:"started",at:Date.now()}),{flag:"wx",mode:0o600});}
 catch(error) {
  if(!fs.existsSync(p.json)) throw error;
  const state=JSON.parse(fs.readFileSync(p.json,"utf8"));
  if(state.state!=="confirmed_failed") throw new UserFacingError("Étape vidéo déjà engagée : aucune seconde requête automatique.");
  // A confirmed, free refusal remains a manual decision, never a worker retry.
  throw new UserFacingError("Échec fournisseur confirmé : reçu conservé ; préparez une reprise ciblée explicite.");
 }
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
