"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalSiteMotionReceipt} from '@/lib/local-site-motion-confirmation-client';
import type {useLocalSiteMotionConfirmation} from './use-local-site-motion-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SINA complète » — carte Animations gratuite (contrat #379 de Codex) : un seul réglage natif (animations,
 * intensité, parallaxe), avant / après en mots simples, accord gratuit, reçu relu. Aucun style inventé.
 */
export function ConversationLocalSiteMotion({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalSiteMotionConfirmation>;busy:boolean}){
 const t=useT(),s=view.localSiteMotion,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localSiteMotionExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const label=({motion_enabled:t('Animations du site','Site animations'),motion_intensity:t('Intensité des animations','Animation intensity'),motion_parallax:t('Parallaxe','Parallax')} as Record<string,string>)[s?.key??'']??t('Réglage','Setting');
 const value=(v:boolean|string)=>v===true?t('activées','on'):v===false?t('désactivées','off'):({subtle:t('discrète','subtle'),normal:t('normale','normal'),expressive:t('expressive','expressive')} as Record<string,string>)[v]??String(v);
 return <section aria-label={t('Animations — gratuit','Animations — free')} data-syna-motion-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.diff&&<dl className="space-y-1"><dt className="font-semibold">{label}</dt><dd><span className="text-muted">{t('Avant : ','Before: ')}</span>{value(s.diff.before)}</dd><dd><span className="text-muted">{t('Après confirmation : ','After confirmation: ')}</span>{value(s.diff.after)}</dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seul ce réglage change ; la version précédente reste dans l’historique. Un visiteur qui a demandé moins de mouvement le garde. Aucun appel IA.','Only this setting changes; the previous version stays in history. Visitors who asked for reduced motion keep it. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalSiteMotionReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · version ','Saved and re-read · version ')}{s!.version!.number}{s!.previewHref&&<> · <a href={s!.previewHref} target="_blank" rel="noopener" className="underline">{t('Voir le site de travail','View the working site')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
