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
/** Optional presenter. Encre/Plein cadre may reuse the headless hook with their own markup. */
export function ConversationLocalSite({view,confirmation,busy,selectionMatches,onResume}:{view:ConversationView;confirmation:ReturnType<typeof useLocalSiteConfirmation>;busy:boolean;selectionMatches:boolean;onResume:()=>void}){
 const s=view.localSite,{controller,state}=confirmation,fresh=view.activeContext?.presentation,context=fresh&&fresh.revision>=(state.context?.revision??0)?fresh:state.context;
 if(!localEditAllowed(view,'local-site')||(!s&&!state.error&&!context?.needsRevalidation))return null;
 const needsSelection=s?.command!=='undo',scope=s?.scope,valid=hasNativeLocalReceipt(view),enabled=view.localSiteExecution?.enabled&&localEditAllowed(view,'local-site')&&!state.blocked;
 const display=(value:unknown)=>Array.isArray(value)?value.map(id=>`${scope?.labels[String(id)]??id} (${id})`).join(' → '):String(value??'');
 return <section aria-label="Retouche gratuite" className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">Gratuit — 0 €</p>{s&&<p>{s.message}</p>}
  {scope&&<p>Cible : {scope.label} · {scope.pagePaths.join(', ')} · {scope.template}/{scope.section}{scope.block?`/${scope.block}`:''}{scope.key?` · ${scope.key}`:''}</p>}
  {s?.diff&&colorChanges(s.diff.before,s.diff.after)&&<dl className="space-y-1 break-words">{colorChanges(s.diff.before,s.diff.after)!.map(c=><div key={c.key}><dt className="font-semibold">{c.label}</dt><dd><Swatch hex={c.before}/>{c.before??'(non défini)'} → <Swatch hex={c.after}/>{c.after}</dd></div>)}<dd className="text-xs text-muted">Les autres couleurs de la section restent identiques.</dd></dl>}
  {s?.diff&&!colorChanges(s.diff.before,s.diff.after)&&<dl className="space-y-2 break-words"><dt className="font-semibold">Avant</dt><dd className="whitespace-pre-wrap">{display(s.diff.before)}</dd><dt className="font-semibold">Après confirmation</dt><dd className="whitespace-pre-wrap">{display(s.diff.after)}</dd></dl>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||needsSelection&&(!selectionMatches||!!context?.needsRevalidation)} onClick={()=>void controller?.confirm()}>Confirmer la modification gratuite</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>Annuler la modification gratuite</Button><Button variant="ghost" disabled={busy||state.busy} onClick={onResume}>Reprendre cette cible</Button></div>}
  {valid&&<div role="status"><p>Résultat enregistré · version {s!.version!.number}</p><a className="underline" href={s!.previewHref} target="_blank" rel="noreferrer">Voir le résultat natif</a>{s!.restore&&<p><a className="underline" href={`/studio/${view.projectId}/boutique`} target="_blank" rel="noreferrer">Ouvrir les versions — restauration manuelle</a></p>}</div>}
  {state.error&&<div><p role="alert">{state.error}</p><Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>Actualiser sans exécuter</Button></div>}
  {state.uncertain&&<div><Button disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>Vérifier l’enregistrement</Button><Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>Réessayer la confirmation gratuite</Button></div>}
  {enabled&&needsSelection&&context?.needsRevalidation&&<div><p>La cible ou sa version a changé. Une nouvelle proposition sera nécessaire.</p>{context.recovery?.current&&<><p>Version désignée : {context.reference} · version proposée : {context.recovery.current.reference}</p><Button disabled={busy||state.busy} onClick={()=>void controller?.revalidate()}>Revalider la cible actuelle</Button></>}{!context.recovery?.current&&<p>Resélectionnez la cible dans l’aperçu natif.</p>}</div>}
 </section>;
}
