"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Info, Minus, Plus, Sparkles } from "lucide-react";
import { api, Badge, Button, Card, cx, formatDate, Logo, Progress, ThemeToggle, useApi, useToast } from "./ui";

type Billing = {
  gauge: { usedPct: number; availablePct: number; alert: boolean; paused: boolean; periodEnd: number; availableEur: number; capacityEur: number; topupEur: number };
  byTask: { task: string; label: string; share: number; count: number }[];
  subscription: { status: string; stores: number; priceEur: number; allowanceEur: number; periodEnd: number | null };
  offer: { basePriceEur: number; extraStorePriceEur: number; aiShareOfSubscription: number; topupStepEur: number; aiShareOfTopup: number; alertThreshold: number };
  paymentsLive: boolean;
  history: { type: string; note: string; at: number; positive: boolean }[];
};

const SUB: Record<string, { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  none: { label: "Compte d'essai", tone: "neutral" },
  trial: { label: "Essai", tone: "neutral" },
  active: { label: "Abonnement actif", tone: "ok" },
  manual: { label: "Activé par l'administration", tone: "ok" },
  past_due: { label: "Paiement en retard", tone: "warn" },
  canceled: { label: "Résilié", tone: "bad" },
};

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const pct = (n: number) => `${Math.round(n * 100)} %`;

export function AccountPage() {
  const toast = useToast();
  const { data, reload } = useApi<Billing>("/api/billing");
  const { data: me } = useApi<{ user: { email: string; name: string; role: string } }>("/api/me");
  const [stores, setStores] = useState(1);
  const [topup, setTopup] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) setStores(Math.max(1, data.subscription.stores));
  }, [data]);
  useEffect(() => {
    const u = new URL(window.location.href);
    const p = u.searchParams.get("paiement") ?? u.searchParams.get("recharge");
    if (!p) return;
    toast(p === "ok" ? "ok" : "bad", p === "ok" ? "Paiement reçu. Votre compte se met à jour dès la confirmation de Stripe (quelques secondes)." : "Paiement annulé : rien n'a été débité.");
    window.history.replaceState(null, "", "/studio/compte");
    const t = setTimeout(reload, 4000);
    return () => clearTimeout(t);
  }, [toast, reload]);

  const checkout = async (kind: "subscription" | "topup") => {
    setBusy(kind);
    try {
      const r = await api<{ url: string }>("/api/billing/checkout", { body: kind === "subscription" ? { kind, stores } : { kind, amount: topup } });
      window.location.href = r.url;
    } catch (e) {
      toast("bad", (e as Error).message);
      setBusy(null);
    }
  };

  const o = data?.offer;
  const price = o ? Math.round((o.basePriceEur + (stores - 1) * o.extraStorePriceEur) * 100) / 100 : 0;
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="size-4" /> <Logo compact /></Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-4xl font-semibold">Compte et crédits</h1>
          {me && <p className="mt-1 text-ink-2">{me.user.name} · {me.user.email}</p>}
        </div>
        {!data ? (
          <div className="skeleton h-64 rounded-3xl" />
        ) : (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[.16em] text-muted">Crédits de création</p>
                  <p className="mt-2 font-display text-5xl font-semibold">{data.gauge.capacityEur === 0 ? "0 %" : pct(data.gauge.availablePct)} <span className="font-sans text-lg font-normal tracking-normal text-ink-2">disponible</span></p>
                </div>
                {data.gauge.capacityEur === 0 ? <Badge>Aucun crédit</Badge> : data.gauge.paused ? <Badge tone="bad" dot>Générations en pause</Badge> : data.gauge.alert ? <Badge tone="warn" dot>80 % utilisés</Badge> : <Badge tone="ok" dot>Actif</Badge>}
              </div>
              <Progress value={data.gauge.capacityEur === 0 ? 0 : data.gauge.usedPct * 100} className={cx("mt-5 h-3", data.gauge.alert && "[&>span]:bg-warn")} />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{pct(data.gauge.usedPct)} utilisés</span>
                <span>Renouvellement des crédits le {formatDate(data.gauge.periodEnd, { day: "numeric", month: "long" })}</span>
              </div>
              {data.gauge.paused && data.gauge.capacityEur > 0 && <p className="mt-4 rounded-2xl bg-bad-soft p-3 text-sm text-bad">Vos crédits sont épuisés : les nouvelles générations par IA sont en pause. Tout le reste (édition, aperçu, export, fichiers, publications déjà validées, moteur intégré) continue de fonctionner.</p>}
              {data.gauge.capacityEur === 0 && <p className="mt-4 rounded-2xl bg-paper-2 p-3 text-sm text-ink-2">Votre compte n'a pas encore de crédits de création (ils sont inclus dans l'abonnement, ou ajoutés par une recharge). En attendant, le studio utilise son moteur intégré (analyse, marque, textes, images de composition et vidéos motion design générés sur le serveur, sans IA externe).</p>}
              <div className="mt-6 grid gap-2">
                <p className="text-sm font-medium">Répartition de votre consommation ce mois-ci</p>
                {data.byTask.length === 0 ? (
                  <p className="text-sm text-muted">Aucune consommation IA sur la période.</p>
                ) : (
                  data.byTask.map((t) => (
                    <div key={t.task} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                      <span>{t.label} <span className="text-xs text-muted">· {t.count} appel(s)</span></span>
                      <span className="tabular-nums">{pct(t.share)}</span>
                      <Progress value={t.share * 100} className="col-span-2 h-1.5" />
                    </div>
                  ))
                )}
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="flex flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-xl font-semibold">Abonnement</p>
                  <Badge tone={SUB[data.subscription.status]?.tone}>{SUB[data.subscription.status]?.label ?? data.subscription.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-ink-2">{euro(o!.basePriceEur)} TTC / mois pour une boutique, {euro(o!.extraStorePriceEur)} / mois par boutique supplémentaire. L'IA est comprise, avec des crédits de création renouvelés chaque mois. Aucun quota de créations : seuls les crédits comptent.</p>
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-line p-3">
                  <span className="text-sm">Boutiques</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setStores(Math.max(1, stores - 1))} className="grid size-9 place-items-center rounded-full border border-line" aria-label="Retirer une boutique"><Minus className="size-4" /></button>
                    <span className="w-6 text-center font-semibold tabular-nums">{stores}</span>
                    <button onClick={() => setStores(Math.min(50, stores + 1))} className="grid size-9 place-items-center rounded-full border border-line" aria-label="Ajouter une boutique"><Plus className="size-4" /></button>
                  </div>
                </div>
                <p className="mt-3 text-sm"><strong className="text-2xl">{euro(price)}</strong> TTC / mois</p>
                <div className="mt-auto pt-5">
                  {data.paymentsLive ? (
                    <Button variant="signal" icon={<CreditCard className="size-4" />} loading={busy === "subscription"} onClick={() => checkout("subscription")}>{data.subscription.status === "active" ? "Modifier l'abonnement" : "S'abonner"}</Button>
                  ) : (
                    <PaymentsOff />
                  )}
                </div>
              </Card>

              <Card className="flex flex-col p-6">
                <p className="font-display text-xl font-semibold">Recharger mes crédits</p>
                <p className="mt-2 text-sm text-ink-2">Par multiples de {euro(o!.topupStepEur)}. Les crédits rechargés s'ajoutent à ceux de l'abonnement et sont conservés d'un mois à l'autre.</p>
                {data.gauge.topupEur > 0 && <p className="mt-2 text-sm">Solde de recharge conservé : <strong>{pct(data.gauge.capacityEur ? data.gauge.topupEur / data.gauge.capacityEur : 0)}</strong> de votre capacité actuelle.</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  {[10, 20, 50, 100].map((v) => (
                    <button key={v} onClick={() => setTopup(v)} className={cx("h-10 rounded-full border px-4 text-sm", topup === v ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{euro(v)}</button>
                  ))}
                </div>
                <div className="mt-auto pt-5">
                  {data.paymentsLive ? (
                    <Button icon={<Sparkles className="size-4" />} loading={busy === "topup"} onClick={() => checkout("topup")}>Recharger {euro(topup)}</Button>
                  ) : (
                    <PaymentsOff />
                  )}
                </div>
              </Card>
            </div>

            {data.history.length > 0 && (
              <Card className="p-6">
                <p className="font-display text-xl font-semibold">Historique des crédits</p>
                <ul className="mt-3 divide-y divide-line text-sm">
                  {data.history.map((h, i) => (
                    <li key={i} className="flex justify-between gap-3 py-2"><span>{h.note}</span><span className="shrink-0 text-muted">{formatDate(h.at, { day: "numeric", month: "short", year: "numeric" })}</span></li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PaymentsOff() {
  return (
    <p className="flex gap-2 rounded-2xl bg-paper-2 p-3 text-xs text-ink-2">
      <Info className="mt-0.5 size-4 shrink-0" />
      Le paiement en ligne n'est pas encore activé sur cette installation (clés Stripe et webhook à configurer puis vérifier dans l'administration). En attendant, l'administration peut activer un abonnement manuellement.
    </p>
  );
}
