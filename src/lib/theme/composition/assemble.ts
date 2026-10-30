/** Assemblage exact dans ThemeSpec, avec les composants et validations du moteur natif. */
import {applyOps,validateSpec,type ThemeOp} from '../ops';
import {containerOf,sectionSchema,type ThemeSpec} from '../spec';
import {ALL_ENTRIES} from '../section-families';
import {ownerThemeOf} from '../theme-own-sections';
import {unsafeContentReason} from '../content-security';
import {themeTargetPaths} from '../../orchestrator/conversation/theme-tool-context';
import {CompositionPlanError,CompositionPlanSchema,type CompositionSource,type CompositionRecord} from './contract';
const COPY=new Set(['text','textarea','richtext','inline_richtext']);
const LAYOUT=new Set(['range','select','radio','checkbox','color_scheme']);
// Ces sections ont des effets métier. Leur structure existante est conservée à l’identique.
const FUNCTIONAL=/(?:product|purchase|cart|contact|booking|appointment|rendez|reservation|newsletter|account|checkout|form|settings)/i;
const CONTENT_KEYS=new Set(['url','image_picker','video','product','collection','page','html','liquid']);
function fail(message:string):never{throw new CompositionPlanError(`composition: ${message}`);}
export function componentAllowed(type:string){return !FUNCTIONAL.test(type)&&!ownerThemeOf(type)&&!type.startsWith('es-custom-')&&ALL_ENTRIES.some(e=>e.dispositions.some(d=>d.type===type));}
export type CompositionDependencies={
 versionId:string;storeKind?:import('../store-kind').StoreKind|null;
 /** Exact scope of each target template, resolved from native page/product assignments. */
 scope:(template:string)=>string;
 source:(id:string)=>CompositionSource|undefined;
 /** Native plan/library gate. Called for every effective operation, including structural changes. */
 authorize:(ops:ThemeOp[])=>void;
 /** Resolve AGAIN from the owned live library; a model cannot mint an asset/filename. */
 media:(assetId:string)=>{filename:string}|null;
};
export function assembleComposition(base:ThemeSpec,input:unknown,deps:CompositionDependencies){
 const plan=CompositionPlanSchema.parse(input);
 if(plan.versionId!==deps.versionId)fail('version parent périmée');
 if(base.imported)fail('composition de thème importé non raccordée');
 if(plan.mode==='original')fail('sur-mesure sans thème de départ non raccordé à cet incrément');
 let spec=structuredClone(base);const refs=new Map<string,CompositionSource>(),orders:Record<string,string[]>={};
 const apply=(ops:ThemeOp[])=>{if(!ops.length)return;deps.authorize(ops);const r=applyOps(spec,ops,{mediaFile:deps.media,storeKind:deps.storeKind});if(r.rejected.length)fail(r.rejected.map(x=>x.reason).join(' ; '));spec=r.spec;};
 for(const page of plan.pages){
  if(page.template.startsWith('group:')||!themeTargetPaths(base,page.template).length)fail('page absente ou groupe fonctionnel non composable');
  const original=containerOf(base,page.template);if(!original)fail('modèle absent');
  const scope=deps.scope(page.template);if(!scope)fail('cible de contenu ambiguë');
  const keep=page.sections.filter(s=>s.kind==='existing');
  const oldRefs=keep.map(s=>s.section);
  if(oldRefs.some(id=>!original.sections[id]||!original.order.includes(id)))fail('section existante absente');
  if(plan.mode==='adapt'&&original.order.some(id=>!oldRefs.includes(id)))fail('adaptation : toutes les sections existantes sont conservées');
  const required=original.order.filter(id=>base.locks.includes(`${page.template}:${id}`)||!componentAllowed(original.sections[id].type));
  if(required.some(id=>!oldRefs.includes(id)))fail('section fonctionnelle ou verrouillée à conserver');
  if(required.join('|')!==oldRefs.filter(id=>required.includes(id)).join('|'))fail('ordre des sections fonctionnelles à conserver');
  for(const id of required.filter(id=>base.locks.includes(`${page.template}:${id}`)))if(page.sections.findIndex(s=>s.kind==='existing'&&s.section===id)!==original.order.indexOf(id))fail('position verrouillée à conserver');
  const order:string[]=[];
  for(const section of page.sections){
   let sid:string,blockIds:Record<string,string>={};
   if(section.kind==='existing'){
    sid=section.section;const instance=containerOf(spec,page.template)!.sections[sid];
    if(instance.disabled&&(section.bindings.length||section.layout.length))fail('section masquée : pas de création visible annoncée');
    if(FUNCTIONAL.test(instance.type)&&(section.bindings.length||section.layout.length))fail('retouche métier via son outil dédié');
    for(const id of Object.keys(instance.blocks??{}))blockIds[id]=id;
   }else{
    if(!componentAllowed(section.type))fail('composant hors bibliothèque de composition sûre');
    const schema=sectionSchema(spec,section.type);if(!schema)fail('schéma absent');
    const before=new Set(Object.keys(containerOf(spec,page.template)!.sections));
    apply([{op:'add_section',template:page.template,type:section.type,blocks:section.blocks.map(b=>({type:b.type,settings:{}}))}]);
    sid=Object.keys(containerOf(spec,page.template)!.sections).find(id=>!before.has(id))??fail('ajout natif sans section');
    const instance=containerOf(spec,page.template)!.sections[sid];
    // Aucun texte/photo/produit par défaut de démo n’est emporté dans une nouvelle section.
    const clear=(settings:Record<string,unknown>,definitions:{id?:string;type:string}[])=>{for(const d of definitions){if(!d.id)continue;if(COPY.has(d.type)||CONTENT_KEYS.has(d.type)||d.id.endsWith('_asset'))settings[d.id]=d.type==='image_picker'?null:'';}};
    clear(instance.settings,schema.settings);
    section.blocks.forEach((b,i)=>{const id=instance.block_order?.[i];if(!id)fail('bloc natif absent');blockIds[b.id]=id;clear(instance.blocks![id].settings,schema.blocks.find(d=>d.type===b.type)?.settings??[]);});
   }
   order.push(sid);
   const instance=containerOf(spec,page.template)!.sections[sid],schema=sectionSchema(spec,instance.type)!;
   const definition=(key:string,block?:string)=>{const bid=block?blockIds[block]:undefined;if(block&&!bid)fail('bloc absent');const defs=bid?schema.blocks.find(d=>d.type===instance.blocks![bid].type)?.settings:schema.settings;const def=defs?.find(d=>d.id===key);if(!def)fail('réglage absent');return{def,block:bid};};
   const ops:ThemeOp[]=[];
   for(const l of section.layout){const{def,block}=definition(l.key,l.block);if(!LAYOUT.has(def.type))fail('réglage de composition hors schéma sûr');ops.push({op:'set_setting',template:page.template,section:sid,block,key:l.key,value:l.value});}
   for(const b of section.bindings){
    const{def,block}=definition(b.key,b.block),source=deps.source(b.source);if(!source||source.scope!==scope&&source.scope!=='site')fail('source absente ou destinée à une autre page');
    if(!source.provenance.ref)fail('provenance absente');refs.set(b.source,source);
    if(source.kind==='copy'){
     if(!COPY.has(def.type)||source.format==='richtext'&&def.type!=='richtext'||b.key.endsWith('_asset')||!source.text.trim()||source.text.length>16000||unsafeContentReason(source.text))fail('texte non applicable en sécurité');
     ops.push({op:'set_setting',template:page.template,section:sid,block,key:b.key,value:source.text});
    }else if(source.kind==='media'){
     if(def.type!=='image_picker'||!schema.settings.some(d=>d.id===`${b.key}_asset`)&&!block)fail('image native non raccordée');
     const live=deps.media(source.assetId);if(!live||live.filename!==source.filename)fail('média absent ou changé');
     const target=block?instance.blocks![block].settings:instance.settings;if(target[b.key])fail('image Shopify prioritaire : remplacement via son éditeur');
     ops.push({op:'use_media',template:page.template,section:sid,block,key:b.key,assetId:source.assetId});
    }else{
     if(def.type!=='url'||unsafeContentReason(source.url)||/[\\\x00-\x20]/.test(source.url)||!(/^(\/(?!\/)|#[\w-]+$|mailto:|tel:)/.test(source.url)))fail('lien natif attendu');
     ops.push({op:'set_setting',template:page.template,section:sid,block,key:b.key,value:source.url});
    }
   }
   apply(ops);
  }
  // Les suppressions/mouvements suivent les mêmes gates natifs que l’éditeur, sans override de verrou.
  for(const sid of original.order)if(!order.includes(sid))apply([{op:'remove_section',template:page.template,section:sid}]);
  order.forEach((sid,index)=>{if(containerOf(spec,page.template)!.order.indexOf(sid)!==index)apply([{op:'move_section',template:page.template,section:sid,position:{index}}]);});
  if(containerOf(spec,page.template)!.order.join('|')!==order.join('|'))fail('ordre natif non obtenu');orders[page.template]=order;
 }
 const errors=validateSpec(spec);if(errors.length)fail(errors.join(' ; '));
 const record:CompositionRecord={schema:1,plan,parentVersionId:deps.versionId,sourceRefs:[...refs].map(([id,s])=>({id,ref:s.provenance.ref,kind:s.kind})),templateSections:orders,quality:'not_measured',platformInstallation:'not_tested'};
 return{spec,record};
}
