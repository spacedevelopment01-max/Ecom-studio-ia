import {videoIntent} from './video-v2/intent';
import {loadProject} from './projects';
import { one } from './db';
import { HttpError } from "./auth";
/** Strategy provenance for one execution. A concurrent activation never relabels acquired content. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { activeStrategy, defaultStrategy, serviceStrategyProject, communicationStrategy, recordStrategyContent, strategyContext, strategyContextFor, currentStrategyInputDigest, assertStrategyPreparationCurrent } from './marketing-strategy';

type Selection = NonNullable<ReturnType<typeof activeStrategy>>;
export type StrategyStamp = Pick<Selection, 'id' | 'version' | 'angleId' | 'inputDigest'>;
const scope = new AsyncLocalStorage<{ projectId: string; selection: Selection | null; context: string; purpose?:"site" }>();
export function withStrategyScope<T>(projectId: string, fn: () => T, snapshotOverride?: Selection | null): T {
  const selected = scope.getStore();
  if (snapshotOverride === undefined && selected && selected.projectId === projectId) {
    assertStrategyInputsCurrent(projectId);
    return fn();
  }
  const selection = snapshotOverride === undefined ? defaultStrategy(projectId) : snapshotOverride;
  if (selection) assertSelectionCurrent(projectId, selection, snapshotOverride !== undefined);
  return scope.run({ projectId, selection, context: strategyContextFor(selection) }, fn);
}
export function strategySelection(projectId: string) {
  if(!projectId)return null; // Pure previews may have no persisted project yet.
  const selected = scope.getStore();
  return selected && selected.projectId === projectId ? selected.selection : defaultStrategy(projectId);
}
export function strategyStamp(projectId: string): StrategyStamp | null {
  const s = strategySelection(projectId);
  return s ? { id: s.id, version: s.version, angleId: s.angleId, inputDigest: s.inputDigest } : null;
}
export function selectedStrategyContext(projectId: string) {
  if(!projectId)return "";
  const selected = scope.getStore();
  return selected && selected.projectId === projectId ? selected.context : strategyContextFor(defaultStrategy(projectId));
}
/** Unknown/restored/manual content must not be silently certified against today's strategy. */
export function strategyContent(projectId: string, module: string, contentId: string, options: { stamp?: StrategyStamp | null; protected?: boolean; published?: boolean; scheduled?: boolean } = {}) {
  const stamp = options.stamp === undefined ? strategyStamp(projectId) : options.stamp;
  return recordStrategyContent(projectId, module, contentId, { strategy: stamp, protected: !!options.protected, published: !!options.published, scheduled: !!options.scheduled });
}

/** No new paid creation on stale facts/identity or a strategy superseded during execution. */
function assertSelectionCurrent(projectId: string, selected: Selection, prepared = false) {
  if (selected.projectId !== projectId) throw new HttpError(404, "Cette stratégie ne fait pas partie de ce projet.", "strategy_project_mismatch");
  if(selected.id.startsWith("draft-"))assertStrategyPreparationCurrent(projectId,selected.id.slice(6));
  const active = activeStrategy(projectId);
  if(serviceStrategyProject(projectId)&&!selected.id.startsWith("draft-"))communicationStrategy(projectId,{strategyId:selected.id});
  if (selected.inputDigest !== currentStrategyInputDigest(projectId) || (!serviceStrategyProject(projectId) && !prepared && !selected.id.startsWith('draft-') && active?.angleId !== selected.angleId)) {
    throw new HttpError(409, "Les informations du projet ou son angle ont changé. Préparez à nouveau cet angle pour réconcilier les faits et l’identité avant toute nouvelle création. Vos contenus acquis et vos choix sont conservés.", "strategy_inputs_stale");
  }
}
export function assertStrategyInputsCurrent(projectId: string) {
  const selected = strategySelection(projectId);
  if (selected) assertSelectionCurrent(projectId, selected);
}

/** Stable semantic key for reusing an acquired A version after A→B→A, without hiding provenance. */
export function strategyReuseKey(projectId: string) {
  const selected = strategySelection(projectId);
  return selected ? { angleId: selected.angleId, inputDigest: selected.inputDigest } : null;
}
/** Only cache inputs are normalized; persisted documents and Brain traces keep their exact version. */
export function strategyReuseInput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strategyReuseInput);
  if (!value || typeof value !== 'object') return value;
  const object = value as Record<string, unknown>;
  if (typeof object.angleId === 'string' && typeof object.inputDigest === 'string' && 'activatedAt' in object) {
    return { angleId: object.angleId, inputDigest: object.inputDigest };
  }
  const result = Object.fromEntries(Object.entries(object).map(([key, part]) => [key, strategyReuseInput(part)]));
  if (typeof object.stable === 'string' && typeof object.hash === 'string' && typeof object.scope === 'string') {
    result.stable = object.stable.replace(/<strategie_marketing_active\b[^>]*angle="([^"]+)"[^>]*>/g, '<strategie_marketing_active angle="$1">');
    delete result.hash;
  }
  return result;
}

/** Website work always uses the general foundation for services, including when called by communication work. */
export function withSiteStrategy<T>(projectId:string,fn:()=>T):T {const foundation=defaultStrategy(projectId);return serviceStrategyProject(projectId)?scope.run({projectId,selection:null,context:'',purpose:'site'},fn):withStrategyScope(projectId,fn);}
export function serviceSiteScope(projectId:string){const s=scope.getStore();return s?.projectId===projectId&&s.purpose==='site';}
export function withCommunicationStrategy<T>(projectId:string,fn:()=>T,options:{angleId?:string;strategyId?:string}={}):T {
 if(!serviceStrategyProject(projectId)){if(options.angleId&&strategySelection(projectId)?.angleId!==options.angleId)throw new HttpError(409,"Cet angle diffère de la stratégie du produit. Préparez sa transition avant génération.","strategy_changed");return withStrategyScope(projectId,fn);}
 const inherited=scope.getStore();
 const selected=options.angleId||options.strategyId?communicationStrategy(projectId,options):inherited?.projectId===projectId&&inherited.selection?inherited.selection:communicationStrategy(projectId);
 return withStrategyScope(projectId,fn,selected);
}
export function contentStrategy(projectId:string,module:string,contentId:string){
 defaultStrategy(projectId);
 const row=one<{strategy_id:string|null}>('SELECT strategy_id FROM marketing_strategy_contents WHERE project_id=? AND module=? AND content_id=?',projectId,module,contentId);
 return row?.strategy_id?communicationStrategy(projectId,{strategyId:row.strategy_id}):null;
}

/** Communication jobs pin their content's strategy, not the latest default. Website jobs stay general. */
export function communicationJob(type:string,payload:any):boolean {
 if(type.startsWith('video.')&&(payload?.request?.purpose==='site'||payload?.request?.siteAmbience||!payload?.request?.ask?.purpose&&['website','shop_page'].includes(payload?.request?.ask?.platform)))return false;
 return type==='image.ai_post'||/^(social\.|post\.|calendar\.|ads\.|campaign\.|ugc\.|video\.)/.test(type)||(type==='content.v2'&&payload?.request?.type==='ad_copy');
}
export function jobStrategy(projectId:string,type:string,payload:any,executing=false):Selection|null {
 if(!serviceStrategyProject(projectId))return strategySelection(projectId);
 if(!communicationJob(type,payload)||type==='video.v2'&&siteVideoRequest(projectId,payload?.request))return null;
 // Rendering or repairing an acquired document inherits its immutable provenance.
 const contentId=payload?.postId;const docKey=payload?.docKey;
 if(contentId&&!one("SELECT 1 FROM posts WHERE project_id=? AND id=?",projectId,contentId))throw new HttpError(404,"Publication introuvable.");
 if(docKey){const doc=one<{doc_json:string}>('SELECT doc_json FROM video_documents WHERE project_id=? AND doc_key=? ORDER BY version DESC LIMIT 1',projectId,docKey);if(doc){const parsed=JSON.parse(doc.doc_json);if(parsed.meta?.siteAmbience||['website','shop_page'].includes(parsed.platform))return null;}}
 const own=contentId?contentStrategy(projectId,'post',contentId):docKey?(()=>{const r=one<{id:string}>('SELECT id FROM video_documents WHERE project_id=? AND doc_key=? ORDER BY version DESC LIMIT 1',projectId,docKey);return r?contentStrategy(projectId,'video',r.id):null;})():null;
 if(own)return own;
 if(type==='post.publish'&&contentId)return null; // Legacy approved publication: native send gates still apply.
 const requested=payload?.angleId??payload?.request?.angleId;
 const inherited=strategySelection(projectId);
 if(!requested&&!executing&&inherited)return inherited;
 return communicationStrategy(projectId,{...(executing&&payload?.strategyVersion?{strategyId:payload.strategyVersion}:requested?{angleId:requested}:{})});
}

/** Preserve provenance across manual editing without requiring new spending rights or current facts. */
export function recordedContentStrategy(projectId:string,module:string,contentId:string):StrategyStamp|null {
 defaultStrategy(projectId);const r=one<any>('SELECT strategy_id,version,angle_id,input_digest FROM marketing_strategy_contents WHERE project_id=? AND module=? AND content_id=?',projectId,module,contentId);
 return r?.strategy_id?{id:r.strategy_id,version:r.version,angleId:r.angle_id,inputDigest:r.input_digest}:null;
}

/** Reuse the native intent resolver; a website described in plain language is still website work. */
export function siteVideoRequest(projectId:string,request:any):boolean {
 return request?.purpose==='site'||!!request?.siteAmbience||!!request?.ask&&!request.ask.purpose&&['website','shop_page'].includes(videoIntent(loadProject(projectId),request.ask).platform);
}
