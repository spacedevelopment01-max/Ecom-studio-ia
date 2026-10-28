/** Contexte Site exact et borné : schémas et médias du seul projet, jamais d'une démo voisine. */
import {all,one} from '../../db';
import {currentTheme} from '../../projects';
import {containerOf,sectionSchema,storeProducts,type ThemeSpec} from '../../theme/spec';
import {routeFor} from '../../theme/render';
/** Le renderer natif choisit les vrais modèles ; un modèle orphelin n'est pas une page livrée. */
export function themeTargetPaths(spec:ThemeSpec,template:string){
  if(template.startsWith('group:'))return ['/'];
  const candidates=['/','/collections','/collections/all','/cart','/search','/blogs/news','/blogs/news/article','/password','/404',...storeProducts(spec).map(p=>`/products/${p.handle}`),...spec.store.pages.map(p=>`/pages/${p.handle}`),...(spec.store.collections??[]).map(c=>`/collections/${c.handle}`),...(spec.store.biens??[]).map(b=>`/pages/bien/${b.handle}`)];
  return [...new Set(candidates.filter(path=>routeFor(spec,path,new URLSearchParams()).template===template))];
}
export function themeToolContext(projectId:string){
  const cur=currentTheme(projectId);if(!cur)return{available:false,reason:'no_theme',mode:'not_connected_without_existing_theme'};
  const targets=[];
  for(const template of ['group:header','group:footer',...Object.keys(cur.spec.templates)]){
    const container=containerOf(cur.spec,template);if(!container)continue;
    for(const sectionId of container.order){const section=container.sections[sectionId];if(!section)continue;const schema=sectionSchema(cur.spec,section.type);if(!schema)continue;
      const fields=(definitions:{id?:string;type:string;label?:string}[],settings:Record<string,unknown>,block?:string)=>definitions.filter(d=>d.id&&!d.id.endsWith('_asset')&&['text','textarea','richtext','inline_richtext','image_picker'].includes(d.type)).map(d=>{const value=settings[d.id!],assetKey=`${d.id}_asset`,filename=settings[assetKey];return{key:d.id!,type:d.type,label:d.label,...(typeof value==='string'&&value.length>1200?{value:undefined,valueRef:{versionId:cur.version.id,template,section:sectionId,block,key:d.id,characters:value.length,contentNotReadHere:true}}:{value,valueRef:undefined}),...(d.type==='image_picker'?{nativeMedia:{key:assetKey,filename:typeof filename==='string'?filename:null,assetId:typeof filename==='string'?cur.spec.files[filename]??null:null,writable:!cur.spec.imported&&definitions.some(x=>x.id===assetKey)}}:{nativeMedia:undefined})};});
      targets.push({template,section:sectionId,type:section.type,locked:cur.spec.locks.includes(`${template}:${sectionId}`),disabled:!!section.disabled,previewPaths:themeTargetPaths(cur.spec,template),fields:fields(schema.settings,section.settings),blocks:Object.entries(section.blocks??{}).map(([blockId,b])=>({block:blockId,type:b.type,disabled:!!b.disabled,fields:fields(schema.blocks.find(d=>d.type===b.type)?.settings??[],b.settings,blockId)}))});
    }
  }
  return{available:true,versionId:cur.version.id,number:cur.version.number,mode:'exact_client_text_or_owned_media_only',targets,media:all<{id:string;name:string;role:string|null}>("SELECT id,name,role FROM assets WHERE project_id=? AND kind='image' AND deleted_at IS NULL AND status!='rejected' ORDER BY created_at DESC LIMIT 40",projectId),mediaSelectionLimit:40,totalMedia:one<{n:number}>("SELECT COUNT(*) n FROM assets WHERE project_id=? AND kind='image' AND deleted_at IS NULL AND status!='rejected'",projectId)!.n,limits:'Proposer des retouches de texte exact fourni par le client et/ou des images de sa bibliothèque uniquement. Les champs longs sont représentés par une référence, pas un extrait tronqué : ne pas prétendre les avoir lus ; leur avant/après complet sera relu dans le devis natif. Les 40 médias les plus récents sont listés, le total est indiqué. Aucun HTML actif, section arbitraire, changement de structure, publication ou déverrouillage. Le devis local et sa confirmation restent distincts de la réponse IA.'};
}
