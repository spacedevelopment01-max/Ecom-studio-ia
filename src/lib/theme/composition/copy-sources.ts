/** Reuse the native editorial reference selection, never generate a second copy. */
import type {Project} from '../../projects';
import {sitePages} from '../../seo-v2/pages';
import {referenceContent} from '../../seo-v2/theme-copy';
import {toHtml,stripInline} from '../../seo-v2/doc';
import type {ContentDoc,ContentType,PageRef} from '../../seo-v2/types';
import {stableHash} from '../../brain/hash';
import type {CompositionSource} from './contract';
export type NativeCopyReference={docKey:string;versionId:string;version:number;target:string;type:ContentType;part:'heading'|'body';source:ContentDoc['meta2']['source'];by:ContentDoc['meta2']['by'];verdict:string|null;format:'text'|'richtext'};
/** Les réglages richtext natifs n'acceptent pas details/summary. Conserver chaque question/réponse entière dans des balises compatibles, sans HTML affiché en texte. */
export function compositionBodyHtml(doc:ContentDoc){return toHtml({blocks:doc.blocks.filter(b=>b.kind!=='h1').flatMap(b=>b.kind==='faq'?[{id:b.id+'-question',kind:'h3' as const,text:b.q},{id:b.id+'-answer',kind:'p' as const,text:b.a}]:[b])});}
const PAGE_TYPE:Partial<Record<PageRef['kind'],ContentType>>={home:'home_page',product:'product_page',service:'service_page',collection:'category_page',brand:'brand_page',local:'local_page'};
export function nativeCompositionCopy(p:Project,lang:string,scopes:string[],templatePages:PageRef[]=[]){
 const pages=sitePages(p),out:{id:string;source:CompositionSource;content:NativeCopyReference}[]=[];
 for(const scope of new Set(scopes)){
  const url=scope==='home'?'/':scope;
  // Une page prévue a encore url=null : sa cible canonique reste réutilisable avant le premier Site.
  // Hors accueil, seul le modèle natif réellement composé fournit l'association exacte, jamais son titre.
  let candidates=scope==='home'?pages.filter(page=>page.key==='home:accueil'):pages.filter(page=>page.url===url);
  if(!candidates.length){const projected=templatePages.filter(page=>page.url===url);if(projected.length===1&&projected[0].contentTarget)candidates=pages.filter(page=>page.key===projected[0].contentTarget);}
  if(candidates.length!==1)continue;
  const page=candidates[0],type=PAGE_TYPE[page.kind];if(!type)continue;
  for(const selectedType of [type,'faq' as const]){
   const selected=referenceContent(p.id,selectedType,lang,page.key);if(!selected)continue;
   const{doc,version,target}=selected;
   const add=(part:NativeCopyReference['part'],text:string,format:NativeCopyReference['format'])=>{
    if(!text.trim())return;const ref=`seo.${version.id}.${part}`;
    out.push({id:`copy.${stableHash('composition-native-copy',ref).slice(0,24)}`,source:{kind:'copy',text,format,scope,provenance:{kind:version.source==='user'?'client':'acquired',ref}},content:{docKey:version.docKey,versionId:version.id,version:version.version,target,type:doc.type,part,source:version.source,by:doc.meta2.by,verdict:version.verdict,format}});
   };
   const heading=doc.blocks.find(b=>b.kind==='h1');if(heading&&'text'in heading)add('heading',stripInline(heading.text),'text');
   add('body',compositionBodyHtml(doc),'richtext');
  }
 }
 return out;
}
