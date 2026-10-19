"use client";
import { useState } from 'react';
import { useProject } from './project-context';
import { useT } from '../i18n';
import { api, Button, Card, useApi } from '../ui';
import type { initialAuthorizationView, quoteInitialAuthorization } from '@/lib/social-v2/initial-authorization';
type View = ReturnType<typeof initialAuthorizationView>;
type Quote = ReturnType<typeof quoteInitialAuthorization>;
const style = { height: 'auto', minHeight: 44, whiteSpace: 'normal' as const, padding: '8px 16px', maxWidth: '100%' };
/** Explicit first consent belongs to preparation, before final identity validation. No client-supplied cap. */
export function InitialAuthorization() {
  const { id } = useProject(), t = useT(), url = `/api/projects/${id}/social/initial`;
  const { data, reload } = useApi<{ authorization: View }>(url, { poll: 3000 });
  const [quote, setQuote] = useState<Quote | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const a = data?.authorization;
  if (!a?.available) return null;
  async function act(action: string) {
    setBusy(true); setError('');
    try { const r = await api<{ quote?: Quote }>(url, { body: { action, quoteId: quote?.id } }); setQuote(r.quote ?? null); reload(); }
    catch(e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <Card className="min-w-0 p-4" data-initial-authorization>
    <h2 className="font-display text-lg">{t('Préparer automatiquement vos vingt créations', 'Automatically prepare your twenty creations')}</h2>
    <p className="mt-2 text-sm">{t('10 publications utiles et 10 publicités indépendantes. Le lot démarre en arrière-plan après votre accord et la validation définitive de votre marque, sans autre confirmation de ce même devis. Aucun envoi sur les réseaux.', '10 useful posts and 10 independent ads. The set starts in the background after consent and final identity approval, without another confirmation of the same quote. No social sending.')}</p>
    {a.status === 'authorized' && <p className="mt-2 text-sm" role="status">{t('Accord enregistré. Démarrage automatique après validation définitive de l’identité ; vous pouvez continuer le studio.', 'Consent saved. Automatic start after final identity approval; you can continue using the studio.')}</p>}
    {a.status === 'consumed' && <p className="mt-2 text-sm" role="status">{t('Accord déjà utilisé : les résultats sont suivis ci-dessus. Les acquis ne seront pas refaits.', 'Consent already used: results are tracked above. Accepted work will not be regenerated.')}</p>}
    {a.reason && <p className="mt-2 text-sm" role="status">{a.reason}</p>}
    {!['authorized', 'consumed'].includes(a.status) && <Button style={style} className="mt-3" disabled={busy} onClick={() => act('authorize-quote')} data-initial-auto-quote>{t('Voir le devis de démarrage automatique', 'See the automatic-start quote')}</Button>}
    {quote && <div className="mt-3 text-sm" data-initial-auto-estimate>
      <p>{t('Coût probable', 'Likely cost')} : {quote.probableBudgetPct?.toFixed(1) ?? '—'} % · {t('plafond avec corrections', 'cap including corrections')} : {quote.maxBudgetPct?.toFixed(1) ?? '—'} % {t('du budget IA du mois', 'of monthly AI budget')}</p>
      <p className="mt-2">{quote.note}</p>
      <Button style={style} className="mt-3" disabled={busy || quote.maxBudgetPct == null} onClick={() => act('authorize')} data-initial-auto-accept>{t('J’accepte ce devis et le démarrage automatique après validation de ma marque', 'Accept this quote and automatic start after identity approval')}</Button>
    </div>}
    {a.status === 'authorized' && <Button style={style} className="mt-3" disabled={busy} onClick={() => act('cancel-authorization')} data-initial-auto-cancel>{t('Annuler cet accord avant le démarrage', 'Cancel consent before starting')}</Button>}
    {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
  </Card>;
}
