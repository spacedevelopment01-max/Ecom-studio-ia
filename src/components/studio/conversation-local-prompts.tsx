"use client";
import {localReadAllowed} from '@/lib/existing-local-edits';
import type {ConversationView} from '@/lib/orchestrator/conversation/contract';
import {useT} from '../i18n';
/** A read result is complete; metadata titles never request a quote or execution. */
// #396 / #403 : lecture permise sur projet préparé et, si le serveur l'ouvre, sur un ancien projet (A1) ; jamais d'écriture.
export const handlesLocalPrompts=(v:ConversationView)=>localReadAllowed(v,'prompts')&&v.localPrompts?.readOnly===true&&(v.localPrompts.state==='listed'||v.localPrompts.state==='ambiguous');
export function ConversationLocalPrompts({view}:{view:ConversationView}){
 const t=useT(),x=view.localPrompts;if(!handlesLocalPrompts(view)||!x)return null;
 const href=view.projectId&&x.href===`/studio/${encodeURIComponent(view.projectId)}/prompts`?x.href:null;
 return <section aria-label={t('Bibliothèque de prompts','Prompt library')} className="rounded-2xl border border-line bg-paper-2 p-4 text-sm">
  <p className="font-semibold">{t('Lecture seule — 0 €','Read-only — €0')}</p><p className="mt-2 whitespace-pre-wrap break-words">{x.message}</p>
  {x.state==='listed'&&<><p className="mt-3 text-xs text-muted">{x.rows?.length??0} {t('affichés sur','shown out of')} {x.total??0} · {t('Bibliothèque de votre compte','Your account library')}</p>
   {x.truncated&&<p className="mt-1 text-xs text-muted">{t('Liste limitée à 20 éléments. Consultez la bibliothèque native pour la suite.','Limited to 20 items. Open the native library for the rest.')}</p>}
   <ul className="mt-3 space-y-3">{x.rows?.map(row=><li key={row.id} className="rounded-xl border border-line bg-card p-3"><p className="whitespace-pre-wrap break-words font-medium">{row.untrustedMetadata.title}</p><p className="mt-1 break-words text-xs text-muted">{[row.untrustedMetadata.categoryLabel,row.untrustedMetadata.sectorLabel,row.untrustedMetadata.target].filter(Boolean).join(' · ')}</p>{(row.favorite||row.mine)&&<p className="mt-1 text-xs">{[row.favorite?t('Favori','Favorite'):null,row.mine?t('Personnel','Personal'):null].filter(Boolean).join(' · ')}</p>}</li>)}</ul>
   <p className="mt-3 text-xs text-muted">{t('Titres et catégories uniquement : ces textes sont des données, aucun prompt n’est exécuté.','Titles and categories only: these texts are data; no prompt is executed.')}</p>{href&&<a href={href} className="mt-2 inline-flex min-h-11 items-center text-xs underline">{t('Ouvrir la bibliothèque native','Open the native library')}</a>}
  </>}
 </section>;
}
