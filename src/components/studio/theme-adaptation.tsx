'use client';
import type { ClientContentPlan } from '@/lib/theme/client-adaptation';
import { useT } from '../i18n';
const reasons: Record<string, [
    string,
    string
]> = { media_missing: ['Image ou vidéo manquante', 'Missing image or video'], image_description_to_review: ['Décrire ce que montre cette image', 'Describe what this image shows'], image_alignment_to_review: ['Vérifier le sujet et le cadrage', 'Review subject and framing'], authentic_realization_missing: ['Ajouter une réalisation authentique ; aucune image générée ne la remplacera', 'Add an authentic completed project; generated imagery cannot replace it'], authentic_reviews: ['Avis réels autorisés à fournir, ou section à laisser non publiée', 'Supply authorized genuine reviews, or keep this section unpublished'], verified_comparison: ['Comparatif étayé à fournir', 'Supply a supported comparison'], verified_measurements: ['Mesures et sources à fournir', 'Supply measurements and sources'], verified_references: ['Références vérifiables à fournir', 'Supply verifiable references'], verified_making_process: ['Procédé de fabrication à documenter', 'Document the making process'], confirmed_hotspot_positions: ['Placer les repères sur les vrais détails', 'Place markers on the actual details'], project_logo_missing: ['Logo du projet manquant', 'Project logo missing'], confirmed_guarantee: ['Conditions de garantie à confirmer', 'Confirm guarantee terms'] };
export function ThemeAdaptationPanel({ plan, projectId, versionId, onSection, onRefresh, busy }: {
    plan: ClientContentPlan;
    projectId: string;
    versionId: string;
    onSection: (page: string, section: string) => void;
    onRefresh: () => void;
    busy: boolean;
}) {
    const t = useT();
    const issues = [...new Map(plan.issues.map(i => [`${i.page}:${i.section}:${i.code}`, i])).values()];
    return <section className="mb-5 rounded-2xl border border-warn/40 bg-warn/5 p-4 text-sm" data-theme-adaptation={plan.status} role="status">
  <h2 className="font-semibold">{plan.status === 'partial' ? t('Adaptation partielle : votre contenu reste à compléter', 'Partial adaptation: your content still needs completion') : t('Composition enregistrée, contrôle visuel à faire', 'Composition saved, visual review required')}</h2>
  <p className="mt-2 text-xs text-muted">{t('Les pages et les emplacements de la référence sont conservés. Aucun média ni fait de démonstration n’est repris. Les sections non prêtes restent dans l’éditeur et ne sont pas annoncées comme livrées.', 'Reference pages and placements are retained. No demo media or claims are reused. Unready sections stay in the editor and are not reported as delivered.')}</p>
  <details className="mt-3"><summary className="cursor-pointer font-medium">{t(`${plan.pages.length} pages · ${plan.slots.filter(s => s.assetId).length}/${plan.slots.length} médias affectés · ${issues.length} points à vérifier`, `${plan.pages.length} pages · ${plan.slots.filter(s => s.assetId).length}/${plan.slots.length} assigned media · ${issues.length} items to review`)}</summary>
   <ul className="mt-2 grid gap-2">{issues.map((i, n) => <li key={n}><button type="button" className="text-left underline" onClick={() => i.code === "project_logo_missing" ? window.location.assign(`/studio/${projectId}/marque`) : onSection(i.page, i.section)}>{i.page} · {reasons[i.code] ? t(...reasons[i.code]) : t('Informations de cette section à compléter', 'Complete this section’s information')}</button></li>)}</ul>
  </details>
  {!!plan.generationRequests.length && <details className="mt-3"><summary className="cursor-pointer font-medium">{t('Préparer les médias manquants', 'Prepare missing media')}</summary><p className="mt-2 text-xs">{t('Une proposition n’est pas une génération. Le moteur existant affiche son devis ; votre accord et les plafonds du projet restent nécessaires. Les images déjà acquises sont conservées.', 'A proposal is not a generation. The existing engine shows its quote; your approval and project limits remain required. Acquired images are retained.')}</p><ul className="mt-2 grid gap-2">{plan.generationRequests.map(r => <li key={r.key}><span className="break-words text-xs">{r.key}</span>{r.kind === 'image' ? <a className="ml-2 underline" href={`/studio/${projectId}/images?themeSlot=${encodeURIComponent(r.key)}&themeVersion=${encodeURIComponent(versionId)}`}>{t('Préparer ce visuel', 'Prepare this image')}</a> : <a className="ml-2 underline" href={`/studio/${projectId}/videos?themeSlot=${encodeURIComponent(r.key)}&themeVersion=${encodeURIComponent(versionId)}`}>{t('Ouvrir la préparation vidéo', 'Open video preparation')}</a>}</li>)}</ul></details>}
  <button type="button" disabled={busy} onClick={onRefresh} className="mt-4 rounded-full border border-line bg-card px-3 py-2 text-xs font-medium disabled:opacity-50">{t('Reprendre l’adaptation avec les contenus acquis', 'Resume adaptation with acquired content')}</button>
 </section>;
}
