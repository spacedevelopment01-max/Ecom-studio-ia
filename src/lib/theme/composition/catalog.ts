/** Catalogue de composition lu dans la bibliothèque et les schémas réellement disponibles. */
import {ALL_ENTRIES} from '../section-families';
import {sectionSchema,type ThemeSpec} from '../spec';
import {sectionIncompatibility} from '../section-compat';
import {assertLibrarySelection} from '../plan-access';
import {componentAllowed} from './assemble';
import type {StoreKind} from '../store-kind';
import {HttpError} from '../../auth';
export function compositionCatalog(spec:ThemeSpec,projectId:string,kind:StoreKind|null){
 const types=[...new Set(ALL_ENTRIES.flatMap(e=>e.dispositions.map(d=>d.type)))].filter(componentAllowed);
 return types.filter(type=>!sectionIncompatibility(spec,type,kind)).flatMap(type=>{
  try{assertLibrarySelection(projectId,type);}catch(e){if(e instanceof HttpError&&[400,402].includes(e.status))return[];throw e;}
  const s=sectionSchema(spec,type);if(!s)return[];
  const fields=(defs:typeof s.settings)=>defs.filter(d=>d.id&&!d.id.endsWith('_asset')&&['text','textarea','richtext','inline_richtext','url','image_picker','range','select','radio','checkbox','color_scheme'].includes(d.type)).map(d=>({key:d.id!,type:d.type,label:d.label,...('options'in d?{options:d.options}:{}),...('min'in d?{min:d.min,max:d.max,step:d.step}:{})}));
  return[{type,name:s.name,fields:fields(s.settings),blocks:s.blocks.map(b=>({type:b.type,name:b.name,fields:fields(b.settings??[])}))}];
 });
}
/** Lossless dictionary: repeated native schemas are sent once, never client copy truncation. */
export function compactCompositionCatalog(entries:ReturnType<typeof compositionCatalog>){
 const ids=new Map<string,string>(),fieldDefinitions:Record<string,ReturnType<typeof compositionCatalog>[number]['fields'][number]>={};
 const references=(fields:ReturnType<typeof compositionCatalog>[number]['fields'])=>fields.map(field=>{const signature=JSON.stringify(field);let id=ids.get(signature);if(!id){id=`field.${ids.size+1}`;ids.set(signature,id);fieldDefinitions[id]=field;}return id;});
 return{components:entries.map(c=>({type:c.type,name:c.name,fields:references(c.fields),blocks:c.blocks.map(b=>({type:b.type,name:b.name,fields:references(b.fields)}))})),fieldDefinitions};
}
