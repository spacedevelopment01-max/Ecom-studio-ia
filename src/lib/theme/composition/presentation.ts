/** Vue lisible du plan : textes entiers et médias ; aucune exécution du HTML reçu. */
import {parseDocument,DomUtils} from 'htmlparser2';
import {containerOf,sectionSchema,type ThemeSpec} from '../spec';
export type CompositionSnapshot={kind:'native_page';sections:{id:string;name:string;fields:{label:string;text?:string;assetId?:string}[]}[]};
export function compositionSnapshot(spec:ThemeSpec,template:string):CompositionSnapshot{
 const c=containerOf(spec,template);return{kind:'native_page',sections:(c?.order??[]).map(id=>{
  const s=c!.sections[id],schema=sectionSchema(spec,s.type),fields:CompositionSnapshot['sections'][number]['fields']=[];
  const read=(settings:Record<string,unknown>,defs:{id?:string;type:string;label?:string}[])=>{for(const d of defs){if(!d.id)continue;const v=settings[d.id];if(['text','textarea','richtext','inline_richtext','url'].includes(d.type)&&!d.id.endsWith('_asset')&&typeof v==='string'&&v.trim())fields.push({label:d.label??d.id,text:DomUtils.textContent(parseDocument(v.replace(/<\/(?:p|li|h[1-6])>/gi,'$&\n').replace(/<br\s*\/?\s*>/gi,'\n'))).trim()});else if(d.type==='image_picker'){const name=settings[`${d.id}_asset`];const assetId=typeof name==='string'?spec.files[name]:null;if(assetId)fields.push({label:d.label??d.id,assetId});}}};
  read(s.settings,schema?.settings??[]);for(const bid of s.block_order??[]){const b=s.blocks![bid];read(b.settings,schema?.blocks.find(x=>x.type===b.type)?.settings??[]);}
  return{id,name:schema?.name??s.type,fields};
 })};
}
