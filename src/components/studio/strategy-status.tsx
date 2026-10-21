"use client";
import { useApi } from '../ui';
import { useT } from '../i18n';
import { useProject } from './project-context';
import type { StrategyState } from '@/lib/marketing-strategy/types';
/** Every module exposes alignment rather than presenting an old angle as today's output. */
export function StrategyStatus(){const {id}=useProject(),t=useT();const {data}=useApi<StrategyState>(`/api/projects/${id}/marketing-strategy`,{poll:10000});if(!data)return null;const pending=data.alignment.filter(c=>!c.aligned&&!c.published);return <aside className="mb-4 rounded-2xl border border-line bg-paper-2 px-4 py-3 text-sm" data-strategy-status>
 <p>{data.active?<>{t('Angle actif','Active angle')} : <strong>{data.active.angle.title}</strong> · {t('version','version')} {data.active.version}.</>:t('Choisissez votre angle marketing avant de construire votre thème. Les cinq propositions sont consultables sans activer de droit.','Choose your marketing angle before building your theme. Viewing the five proposals never consumes a place.')}</p>
 {data.active&&data.active.inputDigest!==(data.analysis.currentInputDigest??data.analysis.inputDigest)&&<p className="mt-1">{t('Vos informations ont changé. Réconciliez votre angle actuel dans Stratégie avant une nouvelle création : cela n’active pas un autre angle.','Your information changed. Reconcile the current angle in Strategy before another creation: this does not activate a different angle.')}</p>}
 {pending.length>0&&<p className="mt-1" role="status">{pending.length} {t('élément(s) conservé(s) à contrôler : ancien angle, données modifiées ou retouche protégée. Ils ne sont pas annoncés comme alignés ; une programmation désalignée ne part pas sans vérification.','kept item(s) need review: previous angle, changed information or protected edit. They are not certified aligned; an unaligned scheduled post cannot be sent without review.')}</p>}
 <a className="mt-1 inline-block underline" href={`/studio/${id}/strategie`}>{t('Consulter la stratégie et les révisions','View strategy and revisions')}</a>
 </aside>;}
