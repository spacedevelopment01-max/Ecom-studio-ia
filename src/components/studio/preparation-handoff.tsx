"use client";
import { useState } from 'react';
import { useProject } from './project-context';
import { useT } from '../i18n';
import { api, Button, Card, useApi } from '../ui';
import type { CategoryRecommendation, ProjectCategory } from '@/lib/project-handoff/categories';
import type { ProjectHandoff } from '@/lib/project-handoff/contract';
type View = { ready: boolean; category: CategoryRecommendation; categoryContextHash: string; blockers: string[]; contract: ProjectHandoff | null };
/** Offers a real clarification rather than assigning a storefront from the product's name. */
export function PreparationHandoff({ onChange }: { onChange?: () => void }) {
  const { id, data: project } = useProject(), t = useT(), url = `/api/projects/${id}/preparation/handoff`;
  const { data, reload } = useApi<View>(url, { poll: 3000 });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!data) return null;
  async function choose(category: ProjectCategory) {
    if (!data) return;
    setBusy(true); setError('');
    try { await api(url, { body: { action: 'category-choice', category, contextHash: data.categoryContextHash } }); await reload(); onChange?.(); }
    catch(e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const services = project?.business === 'services';
  return <Card className="min-w-0 p-4" data-preparation-handoff>
    <h2 className="font-display text-lg">{t('Le site adapté à votre offre', 'The website that fits your offer')}</h2>
    {data.category.clarification && <p className="mt-2 text-sm" role="status">{data.category.clarification}</p>}
    {data.category.reasons.map((r,i) => <p key={i} className="mt-2 text-sm">{r}</p>)}
    <div className="mt-3 flex flex-wrap gap-2" data-category-choices>
      {(services ? ['services'] : ['specialized','ecommerce']).map(c => <Button key={c} style={{ height: 'auto', minHeight: 44, whiteSpace: 'normal', padding: '8px 16px', maxWidth: '100%' }} variant={data.category.category === c ? 'signal' : 'secondary'} disabled={busy} onClick={() => choose(c as ProjectCategory)} data-category-choice={c}>{c === 'services' ? t('Prestations de services','Services') : c === 'specialized' ? t('Boutique spécialisée : offre phare ou gamme ciblée','Specialist store: hero offer or focused range') : t('E-commerce : catalogue et collections','E-commerce: catalogue and collections')}</Button>)}
    </div>
    {data.category.eligibleThemes.length > 0 && <p className="mt-3 text-sm">{t('Thèmes correspondants', 'Matching themes')} : {data.category.eligibleThemes.map(x=>x.name).join(', ')}. {t('Vous pouvez les consulter dans Boutique. Le choix de catégorie ne modifie aucun thème installé.', 'View them in Storefront. Choosing a category does not change an installed theme.')}</p>}
    <p className="mt-3 text-sm" role="status" data-handoff-status={data.ready ? 'ready' : 'review_required'}>{data.ready ? t('Les données sont prêtes pour l’étape thème. La mise en page n’a pas encore été exécutée.', 'The data is ready for the theme stage. The layout has not been built yet.') : t('Les données du site sont encore à compléter ou à revalider. Vos contenus restent enregistrés.', 'The website data still needs completion or approval. Your content remains saved.')}</p>
    <a href={`/studio/${id}/boutique`} className="mt-3 inline-block underline" data-open-theme-gallery>{t('Consulter les thèmes et l’éditeur','Open themes and editor')}</a>
    {data.contract && <p className="mt-2 text-sm">{data.contract.pages.length} {t('pages avec leurs textes et SEO', 'pages with copy and SEO')} · {data.contract.media.filter(x=>x.kind==='image').length} {t('images du site', 'website images')} · {data.contract.media.filter(x=>x.kind==='video').length} {t('vidéo(s)', 'video(s)')}</p>}
    {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
  </Card>;
}
