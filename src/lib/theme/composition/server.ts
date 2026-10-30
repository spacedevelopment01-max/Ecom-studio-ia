/** Frontière serveur E1 : contexte du propriétaire et contrôles natifs à chaque prévisualisation. */
import {L} from '../../i18n-server';
import {UserFacingError} from '../../jobs';
import {CompositionPlanError,CompositionPlanSchema} from './contract';
import {HttpError,ownedProject,type User} from '../../auth';
import {currentTheme,loadProject} from '../../projects';
import {requirePlan} from '../../plan-gates';
import {all} from '../../db';
import {getAsset} from '../../library';
import {themeFileName} from '../../engine/shop';
import {assertThemeOperations} from '../plan-access';
import {projectKind} from '../project-kind';
import {containerOf,sectionSchema,type ThemeSpec} from '../spec';
import {themeTargetPaths} from '../../orchestrator/conversation/theme-tool-context';
import {stableHash} from '../../brain/hash';
import {assembleComposition} from './assemble';
import type {CompositionSource} from './contract';
import {nativeCompositionCopy,type NativeCopyReference} from './copy-sources';
import {originalCompositionBase} from './original';
import {conversationOriginalEnabled} from '../../orchestrator/conversation/tool-flags';
export function compositionBase(projectId:string){const current=currentTheme(projectId);return current?{...current,parentVersionId:current.version.id,isVirtual:false as const}:originalCompositionBase(projectId);}
const TEXT=new Set(['text','textarea','richtext','inline_richtext']);
/** A shared product template is not a source of per-product commercial copy. */
export function compositionScope(spec:ThemeSpec,template:string){
 const paths=themeTargetPaths(spec,template);if(!paths.length)return null;
 if(template==='index')return'home';
 const targets=paths.filter(p=>p.startsWith('/products/')||p.startsWith('/pages/'));
 return targets.length===1?targets[0]:null;
}
function resolve(user:User,projectId:string){
 ownedProject(user,projectId);requirePlan(user,projectId);const current=compositionBase(projectId);
 if(current.spec.meta?.demo?.isDemo)throw new HttpError(409,'Cette démonstration est protégée ; composez uniquement une copie du projet.');
 const sources=new Map<string,CompositionSource>();const descriptors:{id:string;kind:string;scope:string;ref:string;characters?:number;text?:string;fullContentNotReadHere?:boolean;assetId?:string;content?:NativeCopyReference}[]=[];
 const add=(s:CompositionSource)=>{const id=`source.${sources.size+1}`;sources.set(id,s);descriptors.push({id,kind:s.kind,scope:s.scope,ref:s.provenance.ref,...(s.kind==='copy'?{characters:s.text.length,...(s.text.length<=1200?{text:s.text}:{fullContentNotReadHere:true})}:s.kind==='media'?{assetId:s.assetId}:{text:s.url})});};
 for(const template of Object.keys(current.spec.templates)){
  const scope=compositionScope(current.spec,template);if(!scope)continue;const container=containerOf(current.spec,template)!;
  for(const sid of container.order){const instance=container.sections[sid],schema=sectionSchema(current.spec,instance.type);if(!schema||instance.disabled)continue;
   const read=(settings:Record<string,unknown>,defs:{id?:string;type:string}[],block?:string)=>{for(const d of defs){if(!d.id||d.id.endsWith('_asset')||typeof settings[d.id]!=='string'||!String(settings[d.id]).trim())continue;const value=String(settings[d.id]),provenance={kind:'acquired' as const,ref:`theme.${current.version.id}.${template}.${sid}.${block??'section'}.${d.id}`};if(TEXT.has(d.type))add({kind:'copy',text:value,scope,provenance});else if(d.type==='url')add({kind:'link',url:value,scope,provenance});}};
   read(instance.settings,schema.settings);for(const bid of instance.block_order??[])if(!instance.blocks![bid].disabled)read(instance.blocks![bid].settings,schema.blocks.find(b=>b.type===instance.blocks![bid].type)?.settings??[],bid);
  }
 }
 if(current.spec.meta?.original){const p=loadProject(projectId);add({kind:'copy',text:p.brand?.name??current.spec.store.shopName,scope:'home',provenance:{kind:'client',ref:'project.brand.name'}});if(p.product.summaryStatus==='provided'&&p.product.summary.trim())add({kind:'copy',text:p.product.summary,scope:'home',provenance:{kind:'client',ref:'project.product.summary'}});add({kind:'link',url:'/pages/contact',scope:'site',provenance:{kind:'client',ref:'native.contact'}});}
 for(const entry of nativeCompositionCopy(loadProject(projectId),current.spec.language??'fr',Object.keys(current.spec.templates).map(t=>compositionScope(current.spec,t)).filter((s):s is string=>!!s))){const{id,source,content}=entry;sources.set(id,source);if(source.kind==='copy')descriptors.push({id,kind:source.kind,scope:source.scope,ref:source.provenance.ref,characters:source.text.length,...(source.text.length<=1200?{text:source.text}:{fullContentNotReadHere:true}),content});}
 const media=all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND kind='image' AND COALESCE(role,'')!='theme-render-capture' AND deleted_at IS NULL AND status!='rejected' ORDER BY created_at,id LIMIT 40",projectId);
 for(const row of media){const a=getAsset(row.id);if(a)add({kind:'media',assetId:a.id,filename:themeFileName(a,a.role??'media'),scope:'site',provenance:{kind:a.origin==='upload'?'client':'acquired',ref:`asset.${a.id}`}});}
 const liveMedia=(assetId:string)=>{const a=getAsset(assetId);return a&&a.project_id===projectId&&a.user_id===user.id&&a.kind==='image'&&!a.deleted_at&&a.status!=='rejected'?{filename:themeFileName(a,a.role??'media')}:null;};
 return{current,sources,descriptors,liveMedia};
}
export function compositionContext(user:User,projectId:string){
 const r=resolve(user,projectId);return{versionId:r.current.version.id,modes:{adapt:!r.current.isVirtual,hybrid:!r.current.isVirtual,original:conversationOriginalEnabled()&&!!r.current.spec.meta?.original},startingWithoutTheme:r.current.isVirtual,sources:r.descriptors,mediaSelectionLimit:40,longContent:'Référence vers le texte entier conservé : ne pas prétendre avoir lu un texte non affiché. Les sources content viennent du moteur rédactionnel natif : cible, version, origine et verdict conservés, jamais une qualification supplémentaire. Réutiliser le corps richtext dans un champ richtext ; aucun rachat ni résumé.',pages:Object.keys(r.current.spec.templates).map(template=>({template,scope:compositionScope(r.current.spec,template),composable:!!compositionScope(r.current.spec,template)})),quality:'not_measured',generation:'acquired_native_copy_reuse_only_no_new_writing'};
}
export function previewNativeComposition(user:User,projectId:string,input:unknown){
 const r=resolve(user,projectId),p=loadProject(projectId);
 const plan=CompositionPlanSchema.parse(input);if(r.current.isVirtual&&plan.mode!=='original')throw new HttpError(409,L('Le premier plan sans thème doit utiliser le mode original.','The first plan without a starting theme must use original mode.'));if(plan.mode==='original'&&!conversationOriginalEnabled())throw new HttpError(409,L('Mode original non raccordé sans son drapeau.','Original mode is not connected without its flag.'));if(r.current.isVirtual&&!plan.pages.some(page=>page.template==='index'&&page.sections.some(s=>s.kind==='component'&&s.bindings.some(b=>r.sources.get(b.source)?.kind==='copy'))))throw new HttpError(409,L('Composez l’accueil avec un contenu acquis avant de créer une version.','Compose the home page with acquired content before creating a version.'));
 const assemble=()=>assembleComposition(r.current.spec,input,{versionId:r.current.version.id,storeKind:projectKind(p),scope:t=>compositionScope(r.current.spec,t)??'',source:id=>r.sources.get(id),authorize:ops=>assertThemeOperations(projectId,r.current.spec,ops,true),media:r.liveMedia});
 let result:ReturnType<typeof assemble>;try{result=assemble();}catch(error){if(error instanceof CompositionPlanError)throw new UserFacingError(L(error.message,error.english),'agent_composition_invalid');throw error;}
 // Native applyOps receives the actual category too when the public adapter is used.
 const kind=projectKind(p);if(!kind)throw new HttpError(409,'Le type du projet doit être confirmé avant composition.');
 result.spec.meta={...result.spec.meta,composition:result.record};
 return{...result,parentVersionId:r.current.parentVersionId,startingWithoutTheme:r.current.isVirtual,fingerprint:stableHash('composition-native-211-v1',result.spec),quality:'not_measured' as const,platformInstallation:'not_tested' as const};
}
