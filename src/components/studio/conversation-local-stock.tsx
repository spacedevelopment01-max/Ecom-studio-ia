"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalStockReceipt} from '@/lib/local-stock-confirmation-client';
import type {useLocalStockConfirmation} from './use-local-stock-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SINA complète » — carte Stock gratuite (contrat #373 de Codex) : quantité d'une variante désignée dans le
 * Catalogue, avant / après exacts (« suivi désactivé » distinct de zéro), accord gratuit, reçu relu. Aucune
 * synchronisation de boutique, aucune publication, aucun appel IA.
 */
export function ConversationLocalStock({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalStockConfirmation>;busy:boolean}){
 const t=useT(),s=view.localStock,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localStockExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const qty=(n:number|null|undefined)=>n===null||n===undefined?t('suivi du stock désactivé','stock tracking off'):t(`${n} en stock`,`${n} in stock`);
 return <section aria-label={t('Stock — gratuit','Stock — free')} data-syna-stock-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {s?.target&&<p className="break-words">{t('Article : ','Item: ')}<strong>{s.target.label}</strong></p>}
  {s?.diff&&<dl className="space-y-1"><dt className="text-muted">{t('Avant','Before')}</dt><dd>{qty(s.diff.before)}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd>{qty(s.diff.after)}</dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seule cette quantité change dans le Catalogue. Aucune synchronisation de boutique, aucune publication, aucun appel IA.','Only this quantity changes in the Catalogue. No store sync, no publication, no AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalStockReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)}{s!.nativeHref&&<> · <a href={s!.nativeHref} className="underline">{t('Voir le Catalogue','View the Catalogue')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
