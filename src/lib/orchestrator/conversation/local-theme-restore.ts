/** Restore an acquired native version, or undo an exactly proven native motion receipt. */
import {createHash} from 'node:crypto';
import {HttpError,ownedProject,type User} from '../../auth';
import {all,id,json,now,one} from '../../db';
import {stableHash} from '../../brain/hash';
import {currentTheme,listThemeVersions,themeVersion,saveThemeVersion} from '../../projects';
import {getAsset,assetData} from '../../library';
import {requirePlan} from '../../plan-gates';
import {applyOps,type ThemeOp} from '../../theme/ops';
import {previewNativeThemeUndo} from './theme-tool-execution';
import {localSiteEnabled} from './local-site';
import type {ConversationRow,ConversationState} from './contract';
export type RestoreProposal={id:string;sourceVersionId:string;targetVersionId:string;nativeFingerprint:string;mediaFingerprint:string;resultFingerprint:string;targetFingerprint:string;expiresAt:number;sourceReceipt?:{turnId:string;fingerprint:string}};
export type RestorePresentation={schema:'syna-local-theme-restore-1';state:'ambiguous'|'listed'|'proposed'|'applied';projectId:string;message:string;financialConsent:false;costEur:0;providerCalls:0;publication:false;confirmationRequired:boolean;actionsExecuted:boolean;proposalId?:string;targetVersionId?:string;sourceReceiptId?:string;diff?:{before:string;after:string};preview?:{beforeHref:string;afterHref:string};choices?:{id:string;number:number;summary:string;current:boolean;previewHref:string}[];receiptId?:string;version?:{id:string;parentId:string;number:number};previewHref?:string};
export const localThemeRestoreEnabled=()=>localSiteEnabled();
export const localThemeRestoreCandidate=(text:string)=>/^(?:restaure|reviens|retourne|montre|liste)\b/iu.test(text.trim())&&/\bversions?\b/iu.test(text)&&/\bsite\b/iu.test(text);
const genericUndo=(text:string)=>/^annule (?:la derni[èe]re retouche|le dernier r[èe]glage d[’']animation)(?: du site)?\s*[.!]?$/iu.test(text.trim());
export const localThemeRestoreGuardCandidate=(text:string)=>localThemeRestoreCandidate(text)||genericUndo(text);
const fp=(s:unknown)=>stableHash('native-theme-restore-1',s);
function lastMotion(c:ConversationRow){
 const cur=c.project_id?currentTheme(c.project_id):null;if(!cur)return null;
 const row=one<{id:string;request_id:string;response_json:string}>("SELECT id,request_id,response_json FROM agent_conversation_turns WHERE conversation_id=? AND json_extract(response_json,'$.localSiteMotion.actionsExecuted')=1 AND json_extract(response_json,'$.localSiteMotion.version.id')=? AND json_extract(response_json,'$.localSiteMotion.receiptId')=request_id ORDER BY revision DESC LIMIT 1",c.id,cur.version.id);if(!row)return null;
 const view=json<{projectId?:string;localSiteMotion?:import('./local-site-motion').MotionPresentation}>(row.response_json,{}),r=view.localSiteMotion,parent=r?.version?themeVersion(c.project_id!,r.version.parentId):null;
 if(view.projectId!==c.project_id||r?.schema!=='syna-local-site-motion-1'||r.state!=='applied'||r.actionsExecuted!==true||r.confirmationRequired!==false||r.version?.number!==cur.version.number||r.financialConsent!==false||r.costEur!==0||r.providerCalls!==0||r.publication!==false||r.receiptId!==row.request_id||!r.key||!r.diff||!parent||cur.version.parent_id!==parent.version.id||!['motion_enabled','motion_intensity','motion_parallax'].includes(r.key))return null;
 const before=r.key==='motion_intensity'?String(parent.spec.settings[r.key]??'normal'):parent.spec.settings[r.key]!==false;if(before!==r.diff.before)return null;
 const value=r.diff.after;if(r.key==='motion_intensity'?!['subtle','normal','expressive'].includes(String(value)):typeof value!=='boolean')return null;
 const result=applyOps(parent.spec,[{op:'set_global',key:r.key,value} as ThemeOp]);if(result.rejected.length||result.applied.length!==1||fp(result.spec)!==fp(cur.spec))return null;
 return{row,parent,receiptId:row.request_id,fingerprint:stableHash('native-motion-undo-receipt-1',row)};
}
type FreeVersionReceipt={projectId?:string;schema?:string;state?:string;actionsExecuted?:boolean;confirmationRequired?:boolean;financialConsent?:boolean;costEur?:number;providerCalls?:number;publication?:boolean;receiptId?:string;version?:{id?:string;parentId?:string;number?:number}};
function lastVersionReceipt(c:ConversationRow){
 const motion=lastMotion(c);if(motion)return motion;const cur=c.project_id?currentTheme(c.project_id):null;if(!cur)return null;
 const domains=[['localSeo','syna-local-seo-1'],['localPages','syna-local-pages-1'],['localThemeChoice','syna-local-theme-choice-1'],['localThemeRestore','syna-local-theme-restore-1']] as const;
 for(const [field,schema]of domains){
  const row=one<{id:string;request_id:string;response_json:string}>(`SELECT id,request_id,response_json FROM agent_conversation_turns WHERE conversation_id=? AND json_extract(response_json,'$.${field}.version.id')=? AND json_extract(response_json,'$.${field}.receiptId')=request_id ORDER BY revision DESC LIMIT 1`,c.id,cur.version.id);if(!row)continue;
  const view=json<Record<string,unknown>>(row.response_json,{}),r=view[field] as FreeVersionReceipt|undefined,parent=r?.version?.parentId?themeVersion(c.project_id!,r.version.parentId):null;
  if(!r||r.receiptId!==row.request_id||view.projectId!==c.project_id||r.projectId!==c.project_id||r.schema!==schema||r.state!=='applied'||r.actionsExecuted!==true||r.confirmationRequired!==false||r.financialConsent!==false||r.costEur!==0||r.providerCalls!==0||r.publication!==false||!parent||cur.version.parent_id!==parent.version.id||r.version?.number!==cur.version.number)continue;
  return{row,parent,receiptId:row.request_id,fingerprint:stableHash('native-version-undo-receipt-1',row)};
 }
 return null;
}
export const hasCurrentVersionUndo=(c:ConversationRow,text:string)=>genericUndo(text)&&!!lastVersionReceipt(c);
const present=(c:ConversationRow,state:RestorePresentation['state'],message:string,extra:Partial<RestorePresentation>={}):RestorePresentation=>({schema:'syna-local-theme-restore-1',state,projectId:c.project_id!,message,financialConsent:false,costEur:0,providerCalls:0,publication:false,confirmationRequired:false,actionsExecuted:false,...extra});
function current(user:User,c:ConversationRow,m:ConversationState){if(!localThemeRestoreEnabled())throw new HttpError(404,'Restauration gratuite indisponible.');if(!c.project_id)throw new HttpError(409,'Rattachez un projet avec un site.');ownedProject(user,c.project_id);requirePlan(user,c.project_id);if(m.activeContextTab!=='boutique')throw new HttpError(409,'Ouvrez Site pour consulter ou restaurer ses versions.');const cur=currentTheme(c.project_id);if(!cur||cur.spec.imported)throw new HttpError(409,'Cette restauration conversationnelle concerne les versions natives ; le thème importé reste restaurable dans son écran.');return cur;}
function mediaFingerprint(pid:string,target:NonNullable<ReturnType<typeof themeVersion>>){return stableHash('native-theme-restore-media-1',[...new Set(Object.values(target.spec.files))].sort().map(assetId=>{const a=getAsset(assetId);if(!a||a.project_id!==pid||a.deleted_at||a.status==='rejected')throw new HttpError(409,'Un média acquis de cette version manque ;aucun remplacement automatique.');let digest:string;try{digest=createHash('sha256').update(assetData(a)).digest('hex');}catch{throw new HttpError(409,'Les octets d’un média acquis manquent ;site courant conservé.');}return{asset:a,digest};}));}
export function proposeLocalThemeRestore(user:User,c:ConversationRow,m:ConversationState,text:string):RestorePresentation{
 delete m.localThemeRestoreProposal;const cur=current(user,c,m),versions=listThemeVersions(c.project_id!),choices=versions.slice(0,50).map(v=>({id:v.id,number:v.number,summary:v.summary,current:v.id===cur.version.id,previewHref:`/preview/${c.project_id}/v/${v.id}`})),question=(message:string)=>present(c,'ambiguous',message,{choices});
 if(/^(?:montre|liste) les versions du site\s*[.!]?$/iu.test(text.trim()))return present(c,'listed','Versions acquises du site de travail. Aucun changement ni publication ;choisissez un numéro ou identifiant exact.',{choices});
 const motion=genericUndo(text)?lastVersionReceipt(c):null,match=/^(?:restaure la|reviens [àa] la|retourne [àa] la) version [«“"]?([\w-]+)[»”"]? du site\s*[.!]?$/iu.exec(text.trim());
 const matches=motion?[motion.parent.version]:match?versions.filter(v=>v.id===match[1]||/^\d+$/.test(match[1])&&v.number===Number(match[1])):[];
 if(matches.length!==1)return question('Précisez un numéro ou identifiant exact : Restaure la version 2 du site. Aucun choix de la version précédente par supposition.');
 const target=themeVersion(c.project_id!,matches[0].id)!;if(target.version.id===cur.version.id||fp(target.spec)===fp(cur.spec))return question('Cette version est déjà le site de travail ou son contenu est identique. Aucune nouvelle version.');if(target.spec.imported)return question('Cette version est un thème importé. Utilisez sa restauration native ;aucun code tiers ne sera substitué dans ce parcours.');
 let native:ReturnType<typeof previewNativeThemeUndo>,media:string;try{native=previewNativeThemeUndo(user,c.project_id!,{beforeVersionId:cur.version.id,targetVersionId:target.version.id,changes:[]});media=mediaFingerprint(c.project_id!,target);}catch(e){if(e instanceof HttpError&&[404,409,422].includes(e.status))return question(e.message);throw e;}
 if(fp(native.spec)!==fp(target.spec))return question('Les règles de vocabulaire modifieraient cette ancienne version. L’aperçu acquis ne correspond plus à une restauration exacte ;aucun accord proposé.');
 const p:RestoreProposal={id:id(),sourceVersionId:cur.version.id,targetVersionId:target.version.id,nativeFingerprint:native.undoSourceFingerprint,mediaFingerprint:media,resultFingerprint:fp(native.spec),targetFingerprint:fp(target),expiresAt:now()+15*60000,...(motion?{sourceReceipt:{turnId:motion.row.id,fingerprint:motion.fingerprint}}:{})};m.localThemeRestoreProposal=p;
 return present(c,'proposed','Vérifiez les deux versions natives acquises. Après accord gratuit, leur contenu sera restauré dans une NOUVELLE version du site de travail ;historique et médias conservés. Aucune génération ni publication.',{proposalId:p.id,targetVersionId:p.targetVersionId,...(motion?{sourceReceiptId:motion.receiptId}:{}),diff:{before:`v${cur.version.number} · ${cur.spec.name}`,after:`v${target.version.number} · ${target.spec.name}`},preview:{beforeHref:`/preview/${c.project_id}/v/${cur.version.id}`,afterHref:`/preview/${c.project_id}/v/${target.version.id}`},confirmationRequired:true});
}
export function confirmLocalThemeRestore(user:User,c:ConversationRow,m:ConversationState,proposalId:string,requestId:string):RestorePresentation{
 const cur=current(user,c,m),p=m.localThemeRestoreProposal;if(!p||p.id!==proposalId||p.expiresAt<now()||cur.version.id!==p.sourceVersionId)throw new HttpError(409,'La version courante ou la proposition a changé.');const target=themeVersion(c.project_id!,p.targetVersionId);if(!target||fp(target)!==p.targetFingerprint||mediaFingerprint(c.project_id!,target)!==p.mediaFingerprint)throw new HttpError(409,'La version cible ou ses médias ont changé.');
 if(p.sourceReceipt){const proof=lastVersionReceipt(c);if(!proof||proof.row.id!==p.sourceReceipt.turnId||proof.fingerprint!==p.sourceReceipt.fingerprint||proof.parent.version.id!==p.targetVersionId)throw new HttpError(409,'Le reçu de cette version native ne prouve plus son annulation.');}
 const native=previewNativeThemeUndo(user,c.project_id!,{beforeVersionId:p.sourceVersionId,targetVersionId:p.targetVersionId,undoSourceFingerprint:p.nativeFingerprint,changes:[]});if(fp(native.spec)!==p.resultFingerprint)throw new HttpError(409,'Le résultat de restauration a changé.');
 const v=saveThemeVersion(c.project_id!,native.spec,'Restauration gratuite de la version '+target.version.number,'user',undefined,p.sourceVersionId),read=currentTheme(c.project_id!)!;if(read.version.id!==v.id||fp(read.spec)!==p.resultFingerprint)throw new HttpError(409,'Restauration native non confirmée.');delete m.localThemeRestoreProposal;
 return present(c,'applied','Version acquise restaurée, enregistrée et relue dans le site de travail. Anciennes versions et médias conservés ;aucune dépense ni publication.',{proposalId:p.id,targetVersionId:p.targetVersionId,receiptId:requestId,version:{id:v.id,parentId:p.sourceVersionId,number:v.number},previewHref:`/preview/${c.project_id}/v/${v.id}`,actionsExecuted:true});
}
