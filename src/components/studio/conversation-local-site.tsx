"use client";
import {localEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasNativeLocalReceipt} from '@/lib/local-site-confirmation-client';
import type {useLocalSiteConfirmation} from './use-local-site-confirmation';
import {Button} from '../ui';
const COLOR_LABELS:Record<string,string>={background:'Fond',surface:'Surface',text:'Texte',muted:'Texte secondaire',accent:'Accent',accent_text:'Texte sur l’accent',border:'Bordure'};
const colors=(v:unknown):Record<string,string>|null=>{if(typeof v!=='string'||!v.trim().startsWith('{'))return null;try{const o=JSON.parse(v);return o&&typeof o==='object'&&!Array.isArray(o)&&Object.values(o).every(x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x))?o as Record<string,string>:null;}catch{return null;}};
/** #301 v3 : couleurs avant / après d'une section en mots et pastilles (plus d'accolades JSON montrées au client). */
export function colorChanges(before:unknown,after:unknown){const b=colors(before),a=colors(after);if(!b||!a)return null;return Object.keys(a).filter(k=>a[k].toUpperCase()!==(b[k]??'').toUpperCase()).map(k=>({key:k,label:COLOR_LABELS[k]??'Autre couleur',before:b[k]??null,after:a[k]}));}
const Swatch=({hex}:{hex:string|null})=>hex?<span aria-hidden className="mr-1 inline-block size-3 rounded-sm border border-line align-middle" style={{backgroundColor:hex}}/>:null;
/** #301 v3 : une valeur qui contient du JSON de section (FAQ ajoutée, annulation) est résumée en mots ; le détail reste
 * consultable, replié. Renvoie null pour un texte simple. */
export function sectionSummary(value:unknown):{intro:string;items:string[];raw:string}|null{
 if(typeof value!=='string')return null;const i=value.search(/[[{]/);if(i<0)return null;
 let data:unknown;try{data=JSON.parse(value.slice(i));}catch{return null;}
 const list=(Array.isArray(data)?data:[data]).filter((x):x is {id?:string;type?:string;blocks?:Record<string,{settings?:Record<string,unknown>}>}=>!!x&&typeof x==='object'&&typeof (x as {type?:unknown}).type==='string');
 if(!list.length)return null;
 const items=list.flatMap(sec=>{const blocks=Object.values(sec.blocks??{}),texts=blocks.map(b=>String(b.settings?.question??b.settings?.heading??b.settings?.title??'').replace(/<[^>]+>/g,'').trim()).filter(Boolean);
  return [`Section « ${sec.type==='faq'?'Questions fréquentes':sec.type} »${sec.id?` (${sec.id})`:''} : ${blocks.length} élément${blocks.length>1?'s':''}`,...texts.slice(0,6).map(t=>`— ${t.slice(0,90)}`)];});
 return {intro:value.slice(0,i).replace(/[\s:]+$/,''),items,raw:value.slice(i)};
}
const Summary=({value,fallback}:{value:unknown;fallback:string})=>{const s=sectionSummary(value);if(!s)return <>{fallback}</>;return <>{s.intro&&<span className="block">{s.intro}</span>}<ul className="list-none space-y-0.5">{s.items.map((t,i)=><li key={i}>{t}</li>)}</ul><details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">Détail technique</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap">{s.raw}</pre></details></>;};
/** Optional presenter. Encre/Plein cadre may reuse the headless hook with their own markup. */
export function ConversationLocalSite({view,confirmation,busy,selectionMatches,onResume}:{view:ConversationView;confirmation:ReturnType<typeof useLocalSiteConfirmation>;busy:boolean;selectionMatches:boolean;onResume:()=>void}){
 const s=view.localSite,{controller,state}=confirmation,fresh=view.activeContext?.presentation,context=fresh&&fresh.revision>=(state.context?.revision??0)?fresh:state.context;
 if(!localEditAllowed(view,'local-site')||(!s&&!state.error&&!context?.needsRevalidation))return null;
 const needsSelection=s?.command!=='undo',scope=s?.scope,valid=hasNativeLocalReceipt(view),enabled=view.localSiteExecution?.enabled&&localEditAllowed(view,'local-site')&&!state.blocked;
 const display=(value:unknown)=>Array.isArray(value)?value.map(id=>`${scope?.labels[String(id)]??id} (${id})`).join(' → '):String(value??'');
 return <section aria-label="Retouche gratuite" className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">Gratuit — 0 €</p>{s&&<p>{s.message}</p>}
  {scope&&<p>Cible : {scope.label} · {scope.pagePaths.join(', ')} · {scope.template}/{scope.section}{scope.block?`/${scope.block}`:''}{scope.key?` · ${scope.key}`:''}</p>}
  {s?.diff&&colorChanges(s.diff.before,s.diff.after)&&<dl className="space-y-2 break-words"><dt className="font-semibold">Avant</dt><dd>{colorChanges(s.diff.before,s.diff.after)!.map(c=><span key={c.key} className="block">{c.label} : <Swatch hex={c.before}/>{c.before??'(non défini)'}</span>)}</dd><dt className="font-semibold">Après confirmation</dt><dd>{colorChanges(s.diff.before,s.diff.after)!.map(c=><span key={c.key} className="block">{c.label} : <Swatch hex={c.after}/>{c.after}</span>)}</dd><dd className="text-xs text-muted">Les autres couleurs de la section restent identiques.</dd></dl>}
  {s?.diff&&!colorChanges(s.diff.before,s.diff.after)&&<dl className="space-y-2 break-words"><dt className="font-semibold">Avant</dt><dd className="whitespace-pre-wrap"><Summary value={s.diff.before} fallback={display(s.diff.before)}/></dd><dt className="font-semibold">Après confirmation</dt><dd className="whitespace-pre-wrap"><Summary value={s.diff.after} fallback={display(s.diff.after)}/></dd></dl>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||needsSelection&&(!selectionMatches||!!context?.needsRevalidation)} onClick={()=>void controller?.confirm()}>Confirmer la modification gratuite</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>Annuler la modification gratuite</Button><Button variant="ghost" disabled={busy||state.busy} onClick={onResume}>Reprendre cette cible</Button></div>}
  {valid&&<div role="status"><p>Résultat enregistré · version {s!.version!.number}</p><a className="underline" href={s!.previewHref} target="_blank" rel="noreferrer">Voir le résultat natif</a>{s!.restore&&<p><a className="underline" href={`/studio/${view.projectId}/boutique`} target="_blank" rel="noreferrer">Ouvrir les versions — restauration manuelle</a></p>}</div>}
  {state.error&&<div><p role="alert">{state.error}</p><Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>Actualiser sans exécuter</Button></div>}
  {state.uncertain&&<div><Button disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>Vérifier l’enregistrement</Button><Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>Réessayer la confirmation gratuite</Button></div>}
  {/* Après un masquage ou une suppression enregistrés, la section désignée n'est plus une cible : ce n'est pas une
      anomalie, la carte le dit simplement au lieu d'afficher l'alerte « La cible ou sa version a changé » (#301). */}
  {valid&&(s!.command==='hide'||s!.command==='remove')&&<p>{s!.command==='hide'?'Section masquée : elle n’est plus désignée.':'Section supprimée : elle n’est plus désignée.'} Désignez une autre section pour une nouvelle retouche.</p>}
  {enabled&&needsSelection&&context?.needsRevalidation&&!(valid&&(s!.command==='hide'||s!.command==='remove'))&&<div><p>La cible ou sa version a changé. Une nouvelle proposition sera nécessaire.</p>{context.recovery?.current&&<><p>Version désignée : {context.reference} · version proposée : {context.recovery.current.reference}</p><Button disabled={busy||state.busy} onClick={()=>void controller?.revalidate()}>Revalider la cible actuelle</Button></>}{!context.recovery?.current&&<p>Resélectionnez la cible dans l’aperçu natif.</p>}</div>}
 </section>;
}
