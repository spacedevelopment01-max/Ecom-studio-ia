/** Résolution native et cloisonnée des repères envoyés par le navigateur. Aucun média n'est analysé. */
import {HttpError,ownedProject,type User} from '../../auth';
import {one} from '../../db';
import {currentTheme,themeVersion} from '../../projects';
import {containerOf,sectionSchema} from '../../theme/spec';
import {themeTargetPaths} from './theme-tool-context';
import {routeFor} from '../../theme/render';
import {L} from '../../i18n-server';
import {stableHash} from '../../brain/hash';
import {ActiveContextSchema,type ActiveContext} from './active-context-contract';
import type {ConversationRow} from './contract';
import {conversationCatalogueEnabled,conversationContextEnabled} from './tool-flags';
import {getProduct} from '../../products/catalog';
import {requirePlan} from '../../plan-gates';
import {managedSections} from '../../contenus';
import {createHash} from 'node:crypto';
export const activeContextEnabled=conversationContextEnabled;
const missing=()=>new HttpError(404,L('Cette cible est introuvable dans ce projet. Rien n’a été modifié.','This target was not found in this project. Nothing changed.'),'conversation_target_not_found');
function resolveNativeContext(c:ConversationRow,raw:unknown){
 const selected=ActiveContextSchema.parse(raw),target=selected.target;
 if(selected.projectId&&selected.projectId!==c.project_id)throw missing();
 if(!target)return{selection:selected,kind:'tab' as const,label:selected.tab,contentRead:false};
 if(!c.project_id)throw missing();
 if(target.kind==='catalogue-product'||target.kind==='catalogue-variant'){
  if(selected.tab!=='catalogue'||!conversationCatalogueEnabled())throw missing();
  if(!one("SELECT 1 FROM sqlite_master WHERE type='table' AND name='studio_products'")||!one('SELECT 1 FROM studio_products WHERE id=? AND project_id=?',target.productId,c.project_id))throw missing();
  const p=getProduct(c.project_id,target.productId),version=target.kind==='catalogue-product'?target.version:target.productVersion;
  if(p.version!==version)throw new HttpError(409,L('La fiche produit a changé. Désignez-la à nouveau.','The product listing changed. Select it again.'),'conversation_target_stale');
  if(target.kind==='catalogue-variant'){const v=p.variants.find(v=>v.id===target.variantId);if(!v)throw missing();if(v.version!==target.version)throw new HttpError(409,L('La variante a changé. Désignez-la à nouveau.','The variant changed. Select it again.'),'conversation_target_stale');return{selection:selected,kind:'catalogue-variant' as const,label:`${p.data.title} · ${v.options.join(' / ')||v.sku}`,isCurrent:true,contentRead:true,product:p,variant:v,visualQuality:'not_reviewed' as const};}
  return{selection:selected,kind:'catalogue-product' as const,label:p.data.title,isCurrent:true,contentRead:true,product:p,visualQuality:'not_reviewed' as const};
 }
 if(target.kind==='asset'){
  if(!['images','videos','marque','fichiers'].includes(selected.tab))throw missing();
  const a=one<{id:string;version:number;name:string;kind:string;status:string;mime:string;role:string|null;width:number|null;height:number|null}>("SELECT id,version,name,kind,status,mime,role,width,height FROM assets WHERE id=? AND project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture'",target.assetId,c.project_id,c.user_id);
  if(!a)throw missing();
  if(a.version!==target.version)throw new HttpError(409,L('La version du média a changé. Désignez-le à nouveau.','The media version changed. Select it again.'),'conversation_target_stale');
  return{selection:selected,kind:'asset' as const,label:a.name,asset:a,contentRead:false,visualQuality:'not_reviewed' as const};
 }
 if(selected.tab!=='boutique')throw missing();
 const theme=themeVersion(c.project_id,target.versionId);if(!theme)throw missing();
 const isCurrent=currentTheme(c.project_id)?.version.id===target.versionId;
 if(target.kind==='theme-page'){
  if(!target.path.startsWith('/')||target.path.startsWith('//')||/[?#\\]/.test(target.path))throw missing();
  const template=routeFor(theme.spec,target.path,new URLSearchParams()).template;
  if(!themeTargetPaths(theme.spec,template).includes(target.path))throw missing();
  return{selection:selected,kind:'theme-page' as const,label:target.path,version:theme.version.number,isCurrent,template,contentRead:false};
 }
 if(target.pagePath&&(!target.pagePath.startsWith('/')||target.pagePath.startsWith('//')||/[?#\\]/.test(target.pagePath)||!themeTargetPaths(theme.spec,target.template).includes(target.pagePath)))throw missing();
 const container=containerOf(theme.spec,target.template),section=container?.sections[target.section];
 if(!section||!container?.order.includes(target.section)||section.disabled||!themeTargetPaths(theme.spec,target.template).length)throw missing();
 const block=target.block?section.blocks?.[target.block]:null;
 if(target.block&&(!block||block.disabled||!(section.block_order??Object.keys(section.blocks??{})).includes(target.block)))throw missing();
 const schema=sectionSchema(theme.spec,section.type);
 if(target.kind==='theme-field'){
  if(managedSections(theme.spec,c.project_id).has(`${target.template}:${target.section}`))throw new HttpError(422,L('Ce champ est alimenté par un contenu métier. Désignez-le dans son espace natif ; le réglage du thème n’est pas le texte affiché.','This field is populated by business content. Select it in its native workspace; the theme setting is not the displayed text.'),'conversation_target_field_unsupported');
  if(target.path&&target.pagePath&&target.path!==target.pagePath)throw missing();
  const page=target.pagePath??target.path;
  if(page&&(!page.startsWith('/')||page.startsWith('//')||/[?#\\]/.test(page)||!themeTargetPaths(theme.spec,target.template).includes(page)))throw missing();
  const defs=block?schema?.blocks.find(b=>b.type===block.type)?.settings:schema?.settings;
  const matches=defs?.filter(d=>d.id===target.key)??[];
  if(matches.length!==1)throw new HttpError(422,L('Champ natif absent ou ambigu. Choisissez une clé du répertoire du projet.','Native field missing or ambiguous. Choose a key from the project directory.'),'conversation_target_field_unsupported');
  const def=matches[0],settings=block?block.settings:section.settings;
  if(!['text','textarea','richtext','inline_richtext','image_picker'].includes(def.type))throw new HttpError(422,L('Ce type de champ n’est pas raccordé au contexte A2.','This field type is not connected to A2 context.'),'conversation_target_field_unsupported');
  const base={selection:selected,kind:'theme-field' as const,label:def.label??target.key,version:theme.version.number,isCurrent,sectionType:section.type,blockType:block?.type??null,fieldType:def.type,locked:theme.spec.locks.includes(`${target.template}:${target.section}`),source:{table:'theme_versions',id:theme.version.id,template:target.template,section:target.section,block:target.block??null,key:target.key},previewPaths:themeTargetPaths(theme.spec,target.template)};
  if(def.type==='image_picker'){
   const filename=settings[`${target.key}_asset`],assetId=typeof filename==='string'?theme.spec.files[filename]:null;
   const media=assetId?one<{id:string;version:number;kind:string;role:string|null}>("SELECT id,version,kind,role FROM assets WHERE id=? AND project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture'",assetId,c.project_id,c.user_id):null;
   if(!media||media.kind!=='image')throw new HttpError(404,L('Le média de ce champ natif est absent du projet. Aucun média substitué.','This native field media is missing from the project. No media substituted.'),'conversation_target_not_found');
   return{...base,contentRead:false,text:null,media,visualQuality:'not_reviewed' as const};
  }
  const value=Object.hasOwn(settings,target.key)?settings[target.key]:def.default;
  if(typeof value!=='string')throw new HttpError(422,L('Le texte exact de ce champ est indisponible.','The exact text of this field is unavailable.'),'conversation_target_field_unsupported');
  return{...base,contentRead:value.length<=8000,text:value.length<=8000?value:null,textReference:{characters:value.length,sha256:createHash('sha256').update(value).digest('hex'),representation:'native_setting_not_dom' as const},media:null};
 }
 return{selection:selected,kind:'theme-section' as const,label:schema?.name??section.type,version:theme.version.number,isCurrent,sectionType:section.type,blockType:block?.type??null,locked:theme.spec.locks.includes(`${target.template}:${target.section}`),contentRead:false};
}
export function resolveActiveContext(c:ConversationRow,raw:unknown){
 if(c.project_id){const user=one<User>('SELECT * FROM users WHERE id=?',c.user_id);if(!user)throw missing();ownedProject(user,c.project_id);requirePlan(user,c.project_id);}
 const r=resolveNativeContext(c,raw),target=r.selection.target;
 return{...r,canonical:{schema:'studio-native-target-2' as const,projectId:c.project_id,tab:r.selection.tab,kind:r.kind,identity:stableHash('native-object-identity-2',{kind:r.kind,...(target&&'template'in target?{template:target.template,section:'section'in target?target.section:null,block:'block'in target?target.block??null:null,key:'key'in target?target.key:null,sectionType:'sectionType'in r?r.sectionType:null,blockType:'blockType'in r?r.blockType:null,fieldType:'fieldType'in r?r.fieldType:null}:target?.kind==='asset'?{assetId:target.assetId}:target?{productId:'productId'in target?target.productId:null,variantId:'variantId'in target?target.variantId:null,path:'path'in target?target.path:null}: {})}),sourceFingerprint:stableHash('native-target-content-2',r),provenance:'server_native_read' as const,authorizationGranted:false as const}};
}
export function observedActiveContext(c:ConversationRow,selection?:ActiveContext){
 if(!selection)return null;
 try{const resolved=resolveActiveContext(c,selection);return{state:'resolved' as const,...resolved,reference:stableHash('conversation-active-context-1',resolved)};}
 catch(e){if(!(e instanceof HttpError))throw e;return{state:'unavailable' as const,selection,reason:e.code??'conversation_target_unavailable',contentRead:false};}
}
