"use client";
import { useEffect, useState } from "react";
import { useProject } from "./project-context";
import { useT } from "../i18n";
import { api, Button, Card, useApi } from "../ui";
import type { initialCreativesView, quoteInitialCreatives } from "@/lib/social-v2/initial";
type View = NonNullable<ReturnType<typeof initialCreativesView>>;
type Quote = ReturnType<typeof quoteInitialCreatives>;
const buttonStyle = { whiteSpace: "normal" as const, height: "auto", minHeight: 44, padding: "8px 16px", maxWidth: "100%" };
/** Shared orchestration status, independent organic/ad destinations. Existing design forms stay separate. */
export function InitialCreatives({ ads = false, onChange }: {
    ads?: boolean;
    onChange?: () => void;
}) {
    const { id } = useProject(), t = useT(), url = `/api/projects/${id}/social/initial`;
    const { data, reload } = useApi<{
        initial: View | null;
        authorization?: { status: string };
    }>(url, { poll: 3000 });
    const [quote, setQuote] = useState<Quote | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
    const initial = data?.initial;
    const hasInitial = !!initial;
    useEffect(() => {
        if (hasInitial) onChange?.();
    }, [hasInitial, initial?.accepted, initial?.status, initial?.hash, onChange]);
    if (!initial)
        return null;
    const group = ads ? initial.ads : initial.organic;
    if(ads&&group.required===0)return <Card className="p-4" data-initial-ads-lock>{t("Les dix publicités initiales sont réservées à Dominer. Vos dix publications restent disponibles dans Publications.","The ten initial ads require Dominate. Your ten organic posts remain available in Posts.")}</Card>;
    async function act(action: "quote" | "generate" | "confirm-context") { setBusy(true); setError(""); try {
        const r = await api<{
            quote?: Quote;
        }>(url, { body: { action, quoteId: quote?.id } });
        if (r.quote)
            setQuote(r.quote);
        else
            setQuote(null);
        reload();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <Card className="min-w-0 p-4" data-initial-creatives={ads ? "ads" : "organic"}>
  <h2 className="font-display text-lg">{ads ? t("Vos dix publicités initiales", "Your ten initial ads") : t("Vos dix publications initiales", "Your ten initial posts")}</h2>
  <p className="mt-2 text-sm" data-initial-count>{group.accepted}/{group.required} {t("acceptées", "accepted")} · {group.inProgress} {t("en cours", "in progress")} · {group.missing} {t("manquantes", "missing")}</p>
  <p className="mt-1 text-sm text-muted">{ads ? t("4 Facebook carrées 1:1 · 3 Instagram 4:5 · 3 stories 9:16. Dix concepts distincts, jamais des déclinaisons. Votre charte reste commune.", "4 Facebook squares 1:1 · 3 Instagram 4:5 · 3 stories 9:16. Ten distinct concepts, never format variants. Your identity remains shared.") : t("4 carrés 1:1 · 3 feed Instagram 4:5 · 3 stories 9:16. Dix concepts distincts, jamais des déclinaisons. Votre charte reste commune.", "4 squares 1:1 · 3 Instagram feed 4:5 · 3 stories 9:16. Ten distinct concepts, never format variants. Your identity remains shared.")}</p>
  <p className="mt-2 text-sm" data-initial-total>{t("Ensemble initial", "Initial set")} : {initial.accepted}/{initial.required} · {t("Publications", "Posts")} {initial.organic.accepted}/{initial.organic.required} · {t("Publicités", "Ads")} {initial.ads.accepted}/{initial.ads.required}</p>
  <p className="mt-1 text-sm text-muted">{t(`${initial.required} idées et compositions comparées avant génération, puis contrôle des visuels produits. Médias du site à part. Aucun envoi ni programmation sur les réseaux.`, `${initial.required} ideas and compositions compared before generation, then actual visuals checked. Website media are separate. No social sending or scheduling.`)}</p>
  {initial.reason && <p className="mt-2 text-sm" role="status">{initial.reason}</p>}
  {initial.legacy && !initial.ready && <Button style={buttonStyle} className="mt-3" disabled={busy} onClick={() => act("confirm-context")} data-initial-confirm>{t(`Je confirme le brief, la stratégie et la charte pour les ${initial.required} créations`, `Confirm brief, strategy and identity for the ${initial.required} creations`)}</Button>}
  {initial.actualBudgetPct != null && initial.actualBudgetPct > 0 && <p className="mt-2 text-sm">{t("Consommation réelle de l’ensemble", "Actual set usage")} : {initial.actualBudgetPct.toFixed(2)} % {t("du budget IA du mois", "of monthly AI budget")}</p>}
  {initial.ready && initial.status !== "complete" && initial.status !== "running" && data?.authorization?.status !== 'authorized' && <Button style={buttonStyle} className="mt-3" disabled={busy} onClick={() => act("quote")} data-initial-quote>{t("Devis global des créations manquantes", "Global quote for missing creations")}</Button>}
  {quote && <div className="mt-3 text-sm" data-initial-estimate><p>{quote.organicMissing} {t("publications", "posts")} + {quote.adsMissing} {t("publicités", "ads")} = {quote.missing} {t("créations indépendantes", "independent creations")}</p><p>{t("Coût probable", "Likely cost")} : {quote.probableBudgetPct == null ? "—" : `${quote.probableBudgetPct.toFixed(1)} %`} · {t("plafond avec corrections", "cap including corrections")} : {quote.maxBudgetPct == null ? "—" : `${quote.maxBudgetPct.toFixed(1)} %`} {t("du budget IA du mois", "of monthly AI budget")}</p><p className="mt-1">{quote.note}</p><Button style={buttonStyle} className="mt-2" disabled={busy || quote.maxBudgetPct == null} onClick={() => act("generate")} data-initial-generate>{t("J’accepte le devis global et lance l’ensemble initial", "Accept global quote and start initial set")}</Button></div>}
  {group.slots.length > 0 && <ul className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">{group.slots.map(s => <li key={s.index}>{s.index % 10 + 1} · {s.aspect} · {s.accepted ? t("acceptée", "accepted") : t("à terminer", "unfinished")}</li>)}</ul>}
  {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
 </Card>;
}
