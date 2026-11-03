"use client";
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {adDocumentJobPending,hasAdDocumentReceipt} from '@/lib/local-ad-document-confirmation-client';
import type {useLocalAdDocumentConfirmation} from './use-local-ad-document-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/** #301 vague 2 : effets de la retouche dits en mots du client (relevé de recette : « x », « w », « font.size »… et 212.16). */
const EFFECT_LABELS:Record<string,[string,string]>={x:['Position horizontale (px)','Horizontal position (px)'],y:['Position verticale (px)','Vertical position (px)'],w:['Largeur du bloc (px)','Block width (px)'],h:['Hauteur du bloc (px)','Block height (px)'],'font.size':['Taille du texte (px)','Text size (px)'],'autoFit.minSize':['Taille minimale du texte (px)','Minimum text size (px)']};
export function adEffectLabel(field:string,t:(fr:string,en:string)=>string){const l=EFFECT_LABELS[field];return l?t(l[0],l[1]):t('Autre réglage','Other setting');}
export function adEffectValue(v:unknown,t:(fr:string,en:string)=>string){return v===null||v===undefined?t('(non défini)','(unset)'):typeof v==='number'?String(Math.round(v)):String(v);}
/** #301 vague 2 : état du reçu en mots du client (FR / EN), jamais le code technique (« cancelled », « stale »…). */
export function adReceiptStateLabel(state:string,t:(fr:string,en:string)=>string){
 switch(state){
  case 'cancelled':return t('proposition annulée, rien n’a été modifié','proposal cancelled, nothing was changed');
  case 'stale':return t('création modifiée depuis la proposition : désignez de nouveau le titre','creative changed since the proposal: select the title again');
  case 'saved':return t('enregistré, reçu en cours de relecture','saved, receipt being re-read');
  case 'recorded_job_unfinished':return t('écriture enregistrée, vérification en cours','write recorded, verification in progress');
  case 'queued':case 'running':return t('retouche en cours','edit in progress');
  case 'failed':return t('retouche échouée, rien n’a été annoncé comme fait','edit failed, nothing was claimed as done');
  case 'done':return t('tâche terminée, reçu en cours de relecture','job finished, receipt being re-read');
  default:return t('état inconnu : actualisez sans relancer','unknown state: refresh without starting it again');
 }
}
export function ConversationLocalAdDocument({view,confirmation,busy,selectionMatches}:{view:ConversationView;confirmation:ReturnType<typeof useLocalAdDocumentConfirmation>;busy:boolean;selectionMatches:boolean}){
 const t=useT(),s=view.localAdDocument,{controller,state}=confirmation;if(view.recovery||view.readOnlyReason||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=!!view.localAdDocumentExecution?.enabled&&!state.blocked,valid=hasAdDocumentReceipt(view),waiting=adDocumentJobPending(view);
 const preview=(side:'before'|'after')=>{const expected=`/api/studio-agent/conversations/${view.id}/ad-documents?receipt=${encodeURIComponent(s?.proposalId??'')}&preview=${side}`;return s?.previews?.[side]===expected?expected:null;};
 const exportHref=s?.version&&s.exportHref===`/api/projects/${view.projectId}/ads/docs/${encodeURIComponent(s.target.docKey)}?export=png&version=${s.version.version}`?s.exportHref:null;
 return <section aria-label={t('Modification gratuite de la création','Free creative edit')} className="space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p><p>{t('Titre unique de la création enregistrée. Aucun appel IA ni publication. Vérifiez tous les changements avant de confirmer.','The saved creative’s unique title. No AI call or publishing. Review all changes before confirming.')}</p>
  {s&&['proposed','saved','recorded_job_unfinished'].includes(s.state)&&<><div className="grid gap-3 sm:grid-cols-2">{(['before','after'] as const).map(side=><figure key={side}><figcaption className="mb-1 text-xs">{side==='before'?t('Avant','Before'):t('Après confirmation','After confirmation')}</figcaption>{preview(side)&&<img src={preview(side)!} alt={side==='before'?t('Création avant modification','Creative before change'):t('Aperçu exact après confirmation','Exact preview after confirmation')} className="h-auto w-full rounded-lg border border-line"/>}</figure>)}</div><dl className="space-y-2 whitespace-pre-wrap break-words">{s.nativeEffects.map(e=><div key={e.field}><dt className="font-semibold">{adEffectLabel(e.field,t)}</dt><dd>{t('Avant : ','Before: ')}{adEffectValue(e.before,t)} · {t('Après confirmation : ','After confirmation: ')}{adEffectValue(e.after,t)}</dd></div>)}</dl></>}
  {s?.state==='proposed'&&enabled&&s.confirmationRequired&&<><p className="text-xs text-muted">{t('Proposition non enregistrée.','Proposal not saved.')} {new Date(s.expiresAt).toLocaleTimeString()}</p>{!selectionMatches&&<p>{t('Revalidez le titre désigné avant de confirmer.','Revalidate the selected title before confirming.')}</p>}<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain||!selectionMatches} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div></>}
  {waiting&&<p role="status">{s?.state==='recorded_job_unfinished'?t('Écriture native enregistrée ; vérification de la tâche en cours. Ne relancez pas la modification.','Native write recorded; verifying the job. Do not run the change again.'):t('Retouche locale en cours de vérification. Aucun résultat annoncé avant le reçu.','Local edit being verified. No result is claimed before the receipt.')}</p>}
  {valid&&<div role="status"><p>{t('Enregistré et relu · version ','Saved and re-read · version ')}{s!.version!.version}</p>{exportHref&&<a className="inline-flex min-h-11 items-center underline" href={exportHref}>{t('Exporter cette version PNG','Export this PNG version')}</a>}</div>}
  {s&&!valid&&!waiting&&s.state!=='proposed'&&<p role="status">{t('État du reçu : ','Receipt state: ')}{adReceiptStateLabel(s.state,t)}{s.notice?' · '+s.notice:''}</p>}
  {s?.job?.error&&<p role="alert">{s.job.error}</p>}{s?.state==='stale'&&enabled&&<Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler cette proposition','Cancel this proposal')}</Button>}{state.error&&<p role="alert">{state.error}</p>}{state.uncertain&&<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void controller?.refresh()}>{t('Vérifier le reçu','Check the receipt')}</Button><Button disabled={busy} variant="secondary" onClick={()=>void controller?.retry()}>{t('Réessayer la même demande gratuite','Retry the same free request')}</Button></div>}
 </section>;
}
