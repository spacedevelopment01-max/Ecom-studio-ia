/** Read only this project's uploaded documents; never silently omit an unreadable source. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {unzipSync} from 'fflate';
import {all} from '../db';
import {readFile} from '../storage';
import type {Asset} from '../library';
const documents=(projectId:string)=>all<Asset>("SELECT * FROM assets WHERE project_id=? AND kind='document' AND origin='upload' AND deleted_at IS NULL AND status!='rejected' ORDER BY id",projectId);
export function documentStamp(projectId:string){return createHash('sha256').update(JSON.stringify(documents(projectId).map(a=>[a.id,a.storage_key,a.size,a.created_at]))).digest('hex');}
export function readClientDocuments(projectId:string){
 const rows=documents(projectId);if(rows.length>12)throw new Error('Plus de douze documents sources : regroupez ou précisez les fichiers utiles avant analyse. Aucun document ignoré.');
 let length=0;
 return rows.map(a=>{
  if(a.size>2_000_000)throw new Error('Un document dépasse la limite de lecture de 2 Mo. Fournissez sa version texte utile avant analyse ; aucun document ignoré.');
  let text='';const bytes=readFile(a.storage_key),ext=a.name.split('.').pop()?.toLowerCase();
  try{
   if(['txt','md','csv','json'].includes(ext??''))text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   else if(ext==='pdf')text=execFileSync('pdftotext',['-layout','-enc','UTF-8','-','-'],{input:bytes,timeout:8000,maxBuffer:400000,stdio:['pipe','pipe','pipe']}).toString('utf8');
   else if(ext==='docx'){
    const files=unzipSync(bytes,{filter:e=>e.name==='word/document.xml'&&e.originalSize<=2_000_000}),xml=files['word/document.xml'];
    if(!xml||xml.length>2_000_000)throw new Error('document');
    text=Buffer.from(xml).toString('utf8').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
   }else throw new Error('unsupported');
  }catch{throw new Error('Un document source ne peut pas être lu intégralement (format, chiffrement ou outil PDF indisponible). Fournissez une version TXT/Markdown UTF-8 exploitable ; aucune analyse payante lancée.');}
  if(!text.trim()||(length+=text.length)>40000)throw new Error('Documents vides ou plus de 40 000 caractères : précisez des sources lisibles avant analyse, aucun texte tronqué silencieusement.');
  return {assetId:a.id,name:a.name,text};
 });
}

export function documentsMatch(projectId:string,stamp?:string){return (stamp??createHash("sha256").update("[]").digest("hex"))===documentStamp(projectId);}
