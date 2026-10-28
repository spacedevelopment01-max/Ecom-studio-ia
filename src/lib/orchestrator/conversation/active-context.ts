/** Résolution native et cloisonnée des repères envoyés par le navigateur. Aucun média n'est analysé. */
import {HttpError} from '../../auth';
import {one} from '../../db';
import {currentTheme,themeVersion} from '../../projects';
import {containerOf,sectionSchema} from '../../theme/spec';
import {themeTargetPaths} from './theme-tool-context';
import {routeFor} from '../../theme/render';
import {L} from '../../i18n-server';
import {stableHash} from '../../brain/hash';
import {ActiveContextSchema,type ActiveContext} from './active-context-contract';
import type {ConversationRow} from './contract';
import {conversationContextEnabled} from './tool-flags';
export const activeContextEnabled=conversationContextEnabled;
const missing=()=>new HttpError(404,L('Cette cible est introuvable dans ce projet. Rien n’a été modifié.','This target was not found in this project. Nothing changed.'),'conversation_target_not_found');
export function resolveActiveContext(c:ConversationRow,raw:unknown){
 const selected=ActiveContextSchema.parse(raw),target=selected.target;
 if(!target)return{selection:selected,kind:'tab' as const,label:selected.tab,contentRead:false};
 if(!c.project_id)throw missing();
 if(target.kind==='asset'){
  if(!['images','videos','marque','fichiers'].includes(selected.tab))throw missing();
  const a=one<{id:string;version:number;name:string;kind:string;status:string;mime:string;width:number|null;height:number|null}>("SELECT id,version,name,kind,status,mime,width,height FROM assets WHERE id=? AND project_id=? AND user_id=? AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'')!='theme-render-capture'",target.assetId,c.project_id,c.user_id);
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
 const container=containerOf(theme.spec,target.template),section=container?.sections[target.section];
 if(!section||!container?.order.includes(target.section)||section.disabled||!themeTargetPaths(theme.spec,target.template).length)throw missing();
 const block=target.block?section.blocks?.[target.block]:null;
 if(target.block&&(!block||block.disabled||!(section.block_order??Object.keys(section.blocks??{})).includes(target.block)))throw missing();
 const schema=sectionSchema(theme.spec,section.type);
 return{selection:selected,kind:'theme-section' as const,label:schema?.name??section.type,version:theme.version.number,isCurrent,sectionType:section.type,blockType:block?.type??null,locked:theme.spec.locks.includes(`${target.template}:${target.section}`),contentRead:false};
}
export function observedActiveContext(c:ConversationRow,selection?:ActiveContext){
 if(!selection)return null;
 try{const resolved=resolveActiveContext(c,selection);return{state:'resolved' as const,...resolved,reference:stableHash('conversation-active-context-1',resolved)};}
 catch(e){if(!(e instanceof HttpError))throw e;return{state:'unavailable' as const,selection,reason:e.code??'conversation_target_unavailable',contentRead:false};}
}
