"use client";
import { useRef, useState } from 'react';
import { api, Button, Modal, useToast } from '../ui';
import { formatMaximumPct } from '@/lib/budget-pct';
import { useT } from '../i18n';
type Quote = {
    id: string;
    maximumPct: number;
    estimatePct: number;
    expiresAt: number;
    included: boolean;
    creations: number;
};
/** Both native logo buttons share the same server-bound purchase contract. */
export function useNativeLogoConsent(projectId: string, onLaunched: (jobId: string) => void) {
    const t = useT(), toast = useToast(), [quote, setQuote] = useState<Quote | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
    const lock = useRef(false), operation = useRef<Record<string, unknown>>({}), command = useRef<Record<string, unknown> | null>(null);
    const ask = async (input: Record<string, unknown>) => { if (lock.current)
        return; lock.current = true; setBusy(true); setError(''); try {
        const response = await api<{
            quote: Quote;
        }>(`/api/projects/${projectId}/brand/logo-v2`, { body: { action: 'quote', ...input } });
        operation.current = input;
        command.current = null;
        setUncertain(false);
        setQuote(response.quote);
    }
    catch (e) {
        toast('bad', (e as Error).message);
    }
    finally {
        lock.current = false;
        setBusy(false);
    } };
    const confirm = async () => { if (lock.current || !quote)
        return; lock.current = true; setBusy(true); setError(''); const body = command.current ?? { ...operation.current, action: operation.current.operation, quoteId: quote.id, maximumPct: quote.maximumPct, confirmation: true, requestId: crypto.randomUUID() }; command.current = body; try {
        const result = await api<{
            jobId: string;
        }>(`/api/projects/${projectId}/brand/logo-v2`, { body });
        onLaunched(result.jobId);
        setQuote(null);
        setUncertain(false);
        command.current = null;
    }
    catch (e) {
        setError((e as Error).message);
        setUncertain(true);
    }
    finally {
        lock.current = false;
        setBusy(false);
    } };
    const pct = (value: number) => formatMaximumPct(value, 'fr');
    const dialog = <Modal open={!!quote} onClose={() => { if (!busy)
        setQuote(null); }} title={t('Devis de création de logos', 'Logo creation quote')}>
  {quote && <div className="space-y-4 text-sm"><p>{t('Consommation estimée : ', 'Estimated usage: ')}<strong>{pct(quote.estimatePct)}</strong></p><p>{t('Maximum autorisé : ', 'Authorized maximum: ')}<strong>{pct(quote.maximumPct)}</strong>{t(' du budget IA, sur la même base que votre jauge.', ' of your AI budget, on the same basis as your meter.')}</p><p>{quote.included ? t('Première série incluse dans le forfait ; les appels fournisseurs consomment néanmoins votre budget IA.', 'The first series is included in your plan; provider calls still use your AI budget.') : t('Cette demande utilise vos droits et votre budget IA. Les pistes acquises et le logo choisi restent conservés.', 'This request uses your entitlements and AI budget. Acquired routes and the chosen logo remain saved.')}</p><p>{t('Seule la consommation réelle est décomptée, dans cette limite. Aucun remplacement automatique du logo validé.', 'Only actual usage is counted, within this limit. No automatic replacement of your validated logo.')}</p><p>{t('Valable jusqu’à ', 'Valid until ')}{new Date(quote.expiresAt).toLocaleTimeString()}</p>{error && <p role="alert">{error}</p>}{uncertain && <p>{t('Vérifiez la tâche en cours. Réessayer envoie la même confirmation et ne crée pas un nouvel achat.', 'Check the current job. Retrying sends the same confirmation and does not create a new purchase.')}</p>}<div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void confirm()}>{uncertain ? t('Réessayer la même confirmation', 'Retry the same confirmation') : t('Confirmer la dépense des logos', 'Confirm logo spending')}</Button><Button variant="ghost" disabled={busy} onClick={() => setQuote(null)}>{t('Annuler', 'Cancel')}</Button></div></div>}
 </Modal>;
    return { ask, dialog, busy };
}
