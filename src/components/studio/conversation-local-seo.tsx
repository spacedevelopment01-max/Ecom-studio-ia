"use client";
import {nativeLocalEditAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {hasLocalSeoReceipt} from '@/lib/local-seo-confirmation-client';
import type {useLocalSeoConfirmation} from './use-local-seo-confirmation';
import {Button} from '../ui';
import {useT} from '../i18n';
/**
 * #301 « SINA complète » — carte SEO gratuite (contrat #367 de Codex) : titre SEO ou méta-description d'une page du site,
 * avant / après exacts, accord gratuit explicite, reçu relu dans une version native. Aucun devis, aucune publication.
 */
export function ConversationLocalSeo({view,confirmation,busy}:{view:ConversationView;confirmation:ReturnType<typeof useLocalSeoConfirmation>;busy:boolean}){
 const t=useT(),s=view.localSeo,{controller,state}=confirmation;
 if(view.recovery||(!s&&!state.error&&!state.uncertain))return null;
 const enabled=view.localSeoExecution?.enabled&&nativeLocalEditAllowed(view)&&!state.blocked;
 const field=s?.field==='description'?t('Méta-description (texte sous le titre dans Google)','Meta description (text under the title in Google)'):s?.field==='title'?t('Titre SEO (titre affiché dans Google et l’onglet)','SEO title (title shown in Google and the browser tab)'):'';
 const page=s?.label||(s?.target==='/'?t('Page d’accueil','Home page'):s?.target);
 return <section aria-label={t('Retouche SEO gratuite','Free SEO edit')} data-syna-seo-card className="min-w-0 space-y-3 rounded-xl border border-line p-4 text-sm">
  <p className="font-semibold">{t('Gratuit — 0 €','Free — €0')}</p>{s&&<p>{s.message}</p>}
  {page&&field&&<p className="break-words">{t('Page : ','Page: ')}<strong>{page}</strong> · {field}</p>}
  {s?.diff&&<dl className="space-y-1 whitespace-pre-wrap break-words"><dt className="text-muted">{t('Avant','Before')}</dt><dd>{s.diff.before||t('(vide)','(empty)')}</dd><dt className="text-muted">{t('Après confirmation','After confirmation')}</dt><dd>{s.diff.after}</dd></dl>}
  {s?.state==='proposed'&&<p className="text-xs text-muted">{t('Seul ce texte change, dans une nouvelle version de travail ; rien n’est publié. Aucun appel IA.','Only this text changes, in a new working version; nothing is published. No AI call.')}</p>}
  {s?.state==='proposed'&&enabled&&<div className="flex flex-wrap gap-2"><Button disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.confirm()}>{t('Confirmer gratuitement','Confirm for free')}</Button><Button variant="ghost" disabled={busy||state.busy||state.uncertain} onClick={()=>void controller?.cancel()}>{t('Annuler','Cancel')}</Button></div>}
  {hasLocalSeoReceipt(view)&&<p role="status" className="break-words">{t('Enregistré et relu · reçu ','Saved and re-read · receipt ')}{s!.receiptId!.slice(0,8)} · {t('version ','version ')}{s!.version!.number}{s!.previewHref&&<> · <a href={s!.previewHref} target="_blank" rel="noreferrer" className="underline">{t('Voir la page','View the page')}</a></>}</p>}
  {state.error&&<p role="alert">{state.error}</p>}
  {(state.error||state.uncertain)&&<Button variant="ghost" disabled={busy||state.busy} onClick={()=>void controller?.refresh()}>{t('Vérifier l’enregistrement','Check what was saved')}</Button>}
  {state.uncertain&&<Button disabled={busy||state.busy} onClick={()=>void controller?.confirm()}>{t('Réessayer la même confirmation gratuite','Retry the same free confirmation')}</Button>}
 </section>;
}
