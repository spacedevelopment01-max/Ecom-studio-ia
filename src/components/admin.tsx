"use client";
import { useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Copy, KeyRound, RefreshCw, XCircle } from "lucide-react";
import { api, Badge, Button, Card, cx, formatDate, Input, Logo, Select, ThemeToggle, useApi, useToast } from "./ui";

type Overview = {
  appUrl: string;
  providers: { id: string; name: string; role: string; keyHelp: string; docs: string; keyMasked: string; configured: boolean; disabled: boolean }[];
  tasks: { id: string; label: string; kind: string; route: { provider: string; model: string; effort?: string }; defaultRoute: { provider: string; model: string }; price: unknown }[];
  prices: Record<string, unknown>;
  usdToEur: number;
  pricing: { checkedAt: number | null; reviewDays: number; missing: { task: string; label: string; key: string }[] };
  markup: number;
  oauth: { key: string; label: string; configured: boolean; clientIdMasked: string; redirectUri: string; needs: string; docs: string }[];
  stripe: { secretMasked: string; webhookConfigured: boolean; verifiedAt: string | null; live: boolean; webhookUrl: string };
  users: { id: string; email: string; name: string; role: string; created_at: number; subscription: string; stores: number; projects: number; availableEur: number; usedPct: number }[];
  usage: { provider: string; model: string; unit: string; calls: number; inp: number; out: number; q: number; costEur: number; billedEur: number; est: number }[];
  revenue: { kind: string; cents: number; n: number }[];
  errors: { id: string; scope: string; message: string; user_id: string | null; project_id: string | null; created_at: number }[];
  failedJobs: { id: string; type: string; error: string; attempts: number; updated_at: number }[];
  queue: { status: string; n: number }[];
  worker: { lastBeat: number; info: Record<string, unknown>; alive: boolean } | null;
};

const SECTIONS = [
  ["bord", "Tableau de bord"],
  ["clients", "Clients"],
  ["ia", "Fournisseurs IA"],
  ["routes", "Modèles et tarifs"],
  ["connexions", "Connexions OAuth"],
  ["paiements", "Paiements"],
  ["conso", "Consommation"],
  ["sante", "Erreurs et tâches"],
] as const;

const euro = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 4 });

export function AdminConsole() {
  const toast = useToast();
  const { data, reload } = useApi<Overview>("/api/admin/overview");
  const [tab, setTab] = useState<(typeof SECTIONS)[number][0]>("bord");
  const { data: dash, reload: reloadDash } = useApi<Dashboard>("/api/admin/dashboard");
  const set = async (pairs: { key: string; value: string | null }[], msg = "Enregistré.") => {
    try {
      await api("/api/admin/settings", { body: { set: pairs } });
      toast("ok", msg);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const post = async (b: Record<string, unknown>, msg = "Enregistré.") => {
    try {
      await api("/api/admin/settings", { body: b });
      toast("ok", msg);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="size-4" /> <Logo compact /> <span className="font-medium">Administration</span></Link>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => { reload(); reloadDash(); }}>Actualiser</Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {SECTIONS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full border px-4 py-2 text-sm", tab === k ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{l}</button>
          ))}
        </nav>
        {!data ? <div className="skeleton h-72 rounded-3xl" /> : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
            <PricingAlert data={data} post={post} onOpen={() => setTab("routes")} />
            {tab === "ia" && <AiProviders data={data} set={set} />}
            {tab === "routes" && <Routes data={data} post={post} />}
            {tab === "connexions" && <OAuthApps data={data} set={set} />}
            {tab === "paiements" && <Payments data={data} set={set} />}
            {tab === "bord" && (dash ? <DashboardView d={dash} onClients={() => setTab("clients")} /> : <div className="skeleton h-72 rounded-3xl" />)}
            {tab === "clients" && (dash ? <Clients d={dash} reload={() => { reload(); reloadDash(); }} /> : <div className="skeleton h-72 rounded-3xl" />)}
            {tab === "conso" && <Usage data={data} />}
            {tab === "sante" && <Health data={data} reload={reload} />}
          </div>
        )}
      </div>
    </div>
  );
}

type SetFn = (pairs: { key: string; value: string | null }[], msg?: string) => Promise<void>;

function SecretRow({ label, masked, onSave, placeholder }: { label: string; masked: string; onSave: (v: string) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSave(v.trim()); setV(""); } }} className="grid gap-1.5">
      <label className="text-xs font-medium text-ink-2">{label} {masked && <span className="font-mono text-muted">· actuelle : {masked}</span>}</label>
      <div className="flex gap-2">
        <Input type="password" autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder ?? (masked ? "Remplacer…" : "Coller la valeur")} />
        <Button type="submit" variant="secondary" disabled={!v.trim()}>Enregistrer</Button>
      </div>
    </form>
  );
}

function AiProviders({ data, set }: { data: Overview; set: SetFn }) {
  const toast = useToast();
  const [testing, setTesting] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, { ok: boolean; message: string }>>({});
  const test = async (p: string) => {
    setTesting(p);
    try {
      const r = await api<{ ok: boolean; message: string }>("/api/admin/test", { body: { provider: p } });
      setResult((x) => ({ ...x, [p]: r }));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
    setTesting(null);
  };
  return (
    <>
      <Card className="p-5 text-sm text-ink-2">Les clés sont chiffrées en base (AES-256-GCM avec APP_SECRET) et ne sont jamais renvoyées au navigateur. Les clients n'ont jamais de clé à fournir. Sans clé, le studio fonctionne avec son moteur intégré (sans IA externe) et l'indique clairement aux clients.</Card>
      <div className="grid gap-4 md:grid-cols-2">
        {data.providers.map((p) => (
          <Card key={p.id} className="grid gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{p.role}</p>
              </div>
              {p.configured ? (p.disabled ? <Badge tone="warn">Désactivé</Badge> : <Badge tone="ok" dot>Clé enregistrée</Badge>) : <Badge>Aucune clé</Badge>}
            </div>
            <SecretRow label={p.keyHelp} masked={p.keyMasked} onSave={(v) => set([{ key: `provider.${p.id}.apiKey`, value: v }], "Clé enregistrée (chiffrée).")} />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={<Activity className="size-4" />} disabled={!p.configured} loading={testing === p.id} onClick={() => test(p.id)}>Tester réellement</Button>
              {p.configured && <Button size="sm" variant="ghost" onClick={() => set([{ key: `provider.${p.id}.disabled`, value: p.disabled ? null : "1" }])}>{p.disabled ? "Réactiver" : "Désactiver"}</Button>}
              {p.configured && <Button size="sm" variant="ghost" onClick={() => confirm("Supprimer cette clé ?") && set([{ key: `provider.${p.id}.apiKey`, value: null }], "Clé supprimée.")}>Supprimer</Button>}
              <a href={p.docs} target="_blank" rel="noreferrer" className="text-xs underline">Documentation</a>
            </div>
            {result[p.id] && (
              <p className={cx("flex gap-2 rounded-xl p-2.5 text-xs", result[p.id].ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
                {result[p.id].ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />} {result[p.id].message}
              </p>
            )}
          </Card>
        ))}
      </div>
      <Card className="grid gap-3 p-5">
        <p className="font-display text-lg font-semibold">Adresse publique du studio</p>
        <p className="text-sm text-ink-2">Utilisée pour les retours OAuth, les médias publiés (Instagram, TikTok, Pinterest récupèrent les fichiers par URL) et l'installation du thème Shopify. Doit être en HTTPS et accessible depuis Internet. Actuelle : <span className="font-mono">{data.appUrl}</span></p>
        <UrlRow initial={data.appUrl} onSave={(v) => set([{ key: "app.url", value: v }], "Adresse enregistrée.")} />
      </Card>
    </>
  );
}

function UrlRow({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v.trim().replace(/\/$/, "")); }} className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="https://studio.exemple.fr" aria-label="Adresse publique" />
      <Button type="submit" variant="secondary">Enregistrer</Button>
    </form>
  );
}

/** Rentabilité : tarif manquant (génération refusée) et tarifs à revérifier. */
function PricingAlert({ data, post, onOpen }: { data: Overview; post: (b: Record<string, unknown>, msg?: string) => Promise<void>; onOpen: () => void }) {
  const { checkedAt, reviewDays, missing } = data.pricing;
  const age = checkedAt ? Math.floor((Date.now() - checkedAt) / 86400_000) : null;
  const stale = age === null || age > reviewDays;
  if (!missing.length && !stale) return null;
  return (
    <div className="grid gap-3">
      {missing.length > 0 && (
        <div className="rounded-2xl border border-bad/30 bg-bad-soft p-4 text-sm text-bad">
          <p className="font-semibold">Tarif manquant : ces générations sont refusées pour protéger votre marge.</p>
          <ul className="mt-1.5 list-disc pl-5">{missing.map((m) => <li key={m.task}>{m.label} · <span className="font-mono text-xs">{m.key}</span></li>)}</ul>
          <Button size="sm" variant="secondary" className="mt-3" onClick={onOpen}>Renseigner les tarifs</Button>
        </div>
      )}
      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          <p>
            <span className="font-semibold">{age === null ? "Tarifs des fournisseurs jamais confirmés." : `Tarifs vérifiés il y a ${age} jours.`}</span>{" "}
            Si un fournisseur a augmenté ses prix, les crédits des clients sous-estiment la dépense réelle. Comparez avec les pages officielles (OpenAI, Google, Anthropic, fal.ai) et le taux USD → EUR, tous les {reviewDays} jours.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onOpen}>Voir les tarifs</Button>
            <Button size="sm" onClick={() => post({ pricesChecked: true }, "Tarifs marqués comme vérifiés.")}>J'ai vérifié les tarifs</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Routes({ data, post }: { data: Overview; post: (b: Record<string, unknown>, msg?: string) => Promise<void> }) {
  const [edit, setEdit] = useState<Record<string, { provider: string; model: string; effort?: string }>>({});
  const [priceKey, setPriceKey] = useState("");
  const [priceJson, setPriceJson] = useState("");
  const [fx, setFx] = useState(String(data.usdToEur));
  const [markup, setMarkup] = useState(String(data.markup));
  return (
    <>
      <Card className="overflow-x-auto p-5">
        <p className="font-display text-lg font-semibold">Routage des tâches</p>
        <p className="mb-4 text-sm text-ink-2">Chaque tâche utilise le fournisseur et le modèle indiqués. Les identifiants de modèles doivent correspondre exactement à ceux du fournisseur.</p>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2">Tâche</th><th>Fournisseur</th><th>Modèle</th><th>Effort</th><th>Tarif</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {data.tasks.map((t) => {
              const r = edit[t.id] ?? t.route;
              return (
                <tr key={t.id}>
                  <td className="py-2 pr-2">{t.label}<span className="block text-[11px] text-muted">{t.kind}</span></td>
                  <td className="pr-2"><Select value={r.provider} onChange={(e) => setEdit({ ...edit, [t.id]: { ...r, provider: e.target.value } })} aria-label="Fournisseur">{data.providers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}</Select></td>
                  <td className="pr-2"><Input value={r.model} onChange={(e) => setEdit({ ...edit, [t.id]: { ...r, model: e.target.value } })} aria-label="Modèle" className="font-mono text-xs" /></td>
                  <td className="pr-2">{r.provider === "anthropic" ? <Select value={r.effort ?? ""} onChange={(e) => setEdit({ ...edit, [t.id]: { ...r, effort: e.target.value || undefined } })} aria-label="Effort"><option value="">défaut</option>{["low", "medium", "high", "xhigh", "max"].map((x) => <option key={x}>{x}</option>)}</Select> : <span className="text-muted">—</span>}</td>
                  <td className="pr-2 text-xs">{t.price ? <Badge tone="ok">défini</Badge> : <Badge tone="warn">manquant</Badge>}</td>
                  <td>{edit[t.id] && <Button size="sm" onClick={async () => { await post({ route: { task: t.id, ...edit[t.id] } }, "Routage enregistré."); const n = { ...edit }; delete n[t.id]; setEdit(n); }}>OK</Button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card className="grid gap-4 p-5">
        <p className="font-display text-lg font-semibold">Tarifs des fournisseurs (USD)</p>
        <p className="text-sm text-ink-2">Coûts internes, jamais affichés aux clients. Les images et vidéos sont comptées à l'unité (image, seconde de vidéo) lorsque le fournisseur facture ainsi : aucun jeton n'est inventé. Vérifiez ces tarifs sur les pages officielles.</p>
        <div className="grid gap-1 font-mono text-xs">
          {Object.entries(data.prices).map(([k, v]) => (
            <button key={k} onClick={() => { setPriceKey(k); setPriceJson(JSON.stringify(v)); }} className="flex justify-between gap-3 rounded-lg px-2 py-1 text-left hover:bg-paper-2"><span>{k}</span><span className="text-muted">{JSON.stringify(v)}</span></button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); try { post({ price: { key: priceKey, value: JSON.parse(priceJson) } }, "Tarif enregistré."); } catch { alert("JSON invalide"); } }} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <Input value={priceKey} onChange={(e) => setPriceKey(e.target.value)} placeholder="fournisseur:modèle" aria-label="Clé du tarif" className="font-mono text-xs" />
          <Input value={priceJson} onChange={(e) => setPriceJson(e.target.value)} placeholder='{"unit":"tokens","inputPerM":3,"outputPerM":15}' aria-label="Tarif JSON" className="font-mono text-xs" />
          <Button type="submit" variant="secondary">Enregistrer</Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <form onSubmit={(e) => { e.preventDefault(); post({ usdToEur: Number(fx) }, "Taux enregistré."); }} className="flex items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs font-medium text-ink-2">Taux USD → EUR<Input value={fx} onChange={(e) => setFx(e.target.value)} inputMode="decimal" /></label>
            <Button type="submit" variant="secondary">OK</Button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); post({ markup: Number(markup) }, "Coefficient enregistré."); }} className="flex items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs font-medium text-ink-2">Coefficient appliqué au coût (débit de l'enveloppe, 1 au minimum)<Input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" /></label>
            <Button type="submit" variant="secondary">OK</Button>
          </form>
        </div>
      </Card>
    </>
  );
}

function CopyLine({ value }: { value: string }) {
  const toast = useToast();
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); toast("ok", "Copié."); }} className="flex w-full items-center justify-between gap-2 rounded-xl bg-paper-2 px-3 py-2 text-left font-mono text-[11px]">
      <span className="truncate">{value}</span><Copy className="size-3.5 shrink-0" />
    </button>
  );
}

function OAuthApps({ data, set }: { data: Overview; set: SetFn }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.oauth.map((o) => (
        <Card key={o.key} className="grid gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-lg font-semibold">{o.label}</p>
            {o.configured ? <Badge tone="ok" dot>Configuré</Badge> : <Badge tone="warn" dot>À configurer</Badge>}
          </div>
          <p className="text-xs text-muted">{o.needs}</p>
          <div className="grid gap-1"><span className="text-xs font-medium text-ink-2">Adresse de retour à déclarer chez le fournisseur</span><CopyLine value={o.redirectUri} /></div>
          <SecretRow label="Client ID / App ID / Client key" masked={o.clientIdMasked} onSave={(v) => set([{ key: `oauth.${o.key}.clientId`, value: v }])} />
          <SecretRow label="Client secret" masked={o.configured ? "••••" : ""} onSave={(v) => set([{ key: `oauth.${o.key}.clientSecret`, value: v }], "Secret enregistré (chiffré).")} />
          <a href={o.docs} target="_blank" rel="noreferrer" className="text-xs underline">Documentation officielle</a>
        </Card>
      ))}
    </div>
  );
}

function Payments({ data, set }: { data: Overview; set: SetFn }) {
  const s = data.stripe;
  return (
    <Card className="grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold">Stripe</p>
        {s.live ? <Badge tone="ok" dot>Actif et vérifié</Badge> : <Badge tone="warn" dot>Non actif</Badge>}
      </div>
      <p className="text-sm text-ink-2">Les paiements ne sont annoncés comme actifs aux clients qu'une fois la clé secrète et le secret du webhook enregistrés <strong>et</strong> un premier événement signé reçu de Stripe (preuve que la chaîne fonctionne). Abonnement : 49,90 € TTC/mois + 40 €/boutique supplémentaire ; recharges par multiples de 10 €.</p>
      <div className="grid gap-1"><span className="text-xs font-medium text-ink-2">Adresse du webhook (événements : checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid)</span><CopyLine value={s.webhookUrl} /></div>
      <SecretRow label="Clé secrète (sk_live_… ou sk_test_…)" masked={s.secretMasked} onSave={(v) => set([{ key: "stripe.secretKey", value: v }], "Clé Stripe enregistrée (chiffrée).")} />
      <SecretRow label="Secret de signature du webhook (whsec_…)" masked={s.webhookConfigured ? "••••" : ""} onSave={(v) => set([{ key: "stripe.webhookSecret", value: v }], "Secret enregistré.")} />
      <p className="text-xs text-muted">{s.verifiedAt ? `Dernier événement signé vérifié : ${s.verifiedAt}` : "Aucun événement Stripe vérifié pour l'instant. Envoyez un événement de test depuis le tableau de bord Stripe."}</p>
    </Card>
  );
}

type ClientRow = { id: string; email: string; name: string; role: string; createdAt: number; subscription: string; stores: number; monthlyEur: number; projects: number; lastActive: number | null; jobs30: number; aiCost30Eur: number; usedPct: number; availableEur: number; paidEur: number; segment: "abonne" | "offert" | "essai" | "sans" | "impaye" | "resilie" };
type Dashboard = {
  accounts: { total: number; new7: number; new30: number; active30: number };
  plans: Record<ClientRow["segment"], number>;
  conversionPct: number;
  mrrEur: number;
  storesBilled: number;
  usage: { subscribers: number; using: number; notUsing: number; avgUsedPct: number; nearLimit: number };
  money30: { paidEur: number; payments: number; subscriptionEur: number; subscriptionCount: number; topupEur: number; topupCount: number; revenueHtEur: number; aiCostEur: number; stripeFeesEur: number; marginEur: number };
  months: { label: string; subscriptionEur: number; topupEur: number; payments: number }[];
  lastPayments: { id: string; email: string; kind: string; amountEur: number; status: string; at: number }[];
  atRisk: { email: string; lastActive: number | null }[];
  nearLimit: { email: string; usedPct: number }[];
  clients: ClientRow[];
};

const SEGMENTS: { id: ClientRow["segment"]; label: string; short: string; tone: "ok" | "info" | "neutral" | "warn" | "bad" }[] = [
  { id: "abonne", label: "Abonnés payants", short: "Abonné", tone: "ok" },
  { id: "offert", label: "Abonnements offerts", short: "Offert", tone: "info" },
  { id: "essai", label: "En essai", short: "Essai", tone: "neutral" },
  { id: "sans", label: "Sans abonnement", short: "Sans abonnement", tone: "neutral" },
  { id: "impaye", label: "Paiement en échec", short: "Impayé", tone: "warn" },
  { id: "resilie", label: "Résiliés", short: "Résilié", tone: "bad" },
];
const segLabel = (s: ClientRow["segment"]) => SEGMENTS.find((x) => x.id === s)!;
const eur2 = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const ago = (t: number | null) => {
  if (!t) return "jamais";
  const d = Math.floor((Date.now() - t) / 86400_000);
  return d <= 0 ? "aujourd'hui" : d === 1 ? "hier" : `il y a ${d} j`;
};

function Tile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card className={cx("p-4 sm:p-5", accent && "border-signal/40")}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function DashboardView({ d, onClients }: { d: Dashboard; onClients: () => void }) {
  const m = d.money30;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile accent label="Abonnés payants" value={String(d.plans.abonne)} hint={`${d.storesBilled} boutique${d.storesBilled > 1 ? "s" : ""} facturée${d.storesBilled > 1 ? "s" : ""}`} />
        <Tile accent label="Revenu mensuel récurrent" value={eur2(d.mrrEur)} hint="TTC, abonnements payants en cours" />
        <Tile label="Comptes inscrits" value={String(d.accounts.total)} hint={`+${d.accounts.new7} en 7 j · +${d.accounts.new30} en 30 j`} />
        <Tile label="Conversion en abonnés" value={`${Math.round(d.conversionPct)} %`} hint="abonnés payants / comptes inscrits" />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">Répartition des comptes</p>
          <Button size="sm" variant="secondary" onClick={onClients}>Voir les clients</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SEGMENTS.map((s) => (
            <div key={s.id} className="rounded-2xl border border-line p-3">
              <Badge tone={s.tone}>{s.label}</Badge>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{d.plans[s.id]}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-display text-lg font-semibold">Utilisation du forfait</p>
          <p className="text-xs text-muted">Abonnés payants et offerts, sur les 30 derniers jours.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">L'utilisent</p><p className="font-display text-2xl font-semibold tabular-nums">{d.usage.using}<span className="text-base text-muted"> / {d.usage.subscribers}</span></p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">Ne l'utilisent pas</p><p className="font-display text-2xl font-semibold tabular-nums">{d.usage.notUsing}</p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">Crédits utilisés en moyenne</p><p className="font-display text-2xl font-semibold tabular-nums">{Math.round(d.usage.avgUsedPct)} %</p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">Proches de la limite (80 %+)</p><p className="font-display text-2xl font-semibold tabular-nums">{d.usage.nearLimit}</p></div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-ink-2">Risque de départ (aucune création en 30 j)</p>
              <ul className="mt-1.5 grid gap-1 text-sm">{d.atRisk.length ? d.atRisk.map((r) => <li key={r.email} className="flex justify-between gap-2"><span className="truncate">{r.email}</span><span className="shrink-0 text-xs text-muted">{ago(r.lastActive)}</span></li>) : <li className="text-muted">Aucun</li>}</ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-ink-2">À relancer pour une recharge</p>
              <ul className="mt-1.5 grid gap-1 text-sm">{d.nearLimit.length ? d.nearLimit.map((r) => <li key={r.email} className="flex justify-between gap-2"><span className="truncate">{r.email}</span><span className="shrink-0 text-xs text-muted">{Math.round(r.usedPct)} %</span></li>) : <li className="text-muted">Aucun</li>}</ul>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg font-semibold">Argent des 30 derniers jours</p>
          <p className="text-xs text-muted">Paiements encaissés via Stripe. Marge estimée : HT moins coût IA et frais Stripe estimés (hors serveur, cotisations et impôts).</p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt>Paiements reçus</dt><dd className="tabular-nums">{m.payments} · <strong>{eur2(m.paidEur)}</strong> TTC</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>dont abonnements</dt><dd className="tabular-nums">{m.subscriptionCount} · {eur2(m.subscriptionEur)}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>dont recharges</dt><dd className="tabular-nums">{m.topupCount} · {eur2(m.topupEur)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-2"><dt>Chiffre d'affaires HT</dt><dd className="tabular-nums">{eur2(m.revenueHtEur)}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>Coût IA réel</dt><dd className="tabular-nums">− {eur2(m.aiCostEur)}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>Frais Stripe estimés</dt><dd className="tabular-nums">− {eur2(m.stripeFeesEur)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-base"><dt className="font-semibold">Marge estimée</dt><dd className={cx("font-semibold tabular-nums", m.marginEur < 0 && "text-bad")}>{eur2(m.marginEur)}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto p-5">
          <p className="font-display text-lg font-semibold">Encaissements par mois</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1.5">Mois</th><th className="hidden text-right sm:table-cell">Paiements</th><th className="text-right">Abonnements</th><th className="text-right">Recharges</th><th className="text-right">Total TTC</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.months.map((x) => (
                <tr key={x.label}><td className="py-1.5 pr-2 capitalize">{x.label}</td><td className="hidden text-right tabular-nums sm:table-cell">{x.payments}</td><td className="text-right tabular-nums">{eur2(x.subscriptionEur)}</td><td className="text-right tabular-nums">{eur2(x.topupEur)}</td><td className="text-right font-semibold tabular-nums">{eur2(x.subscriptionEur + x.topupEur)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto p-5">
          <p className="font-display text-lg font-semibold">Derniers paiements</p>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {d.lastPayments.length ? d.lastPayments.map((p) => (
                <tr key={p.id}><td className="py-1.5 pr-2"><span className="block truncate">{p.email}</span><span className="text-xs text-muted">{p.kind === "subscription" ? "Abonnement" : "Recharge"} · {formatDate(p.at)}</span></td><td className="text-right tabular-nums">{eur2(p.amountEur)}</td><td className="pl-2 text-right"><Badge tone={p.status === "paid" ? "ok" : "warn"}>{p.status === "paid" ? "payé" : p.status}</Badge></td></tr>
              )) : <tr><td className="py-2 text-muted">Aucun paiement pour l'instant.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

function Clients({ d, reload }: { d: Dashboard; reload: () => void }) {
  const toast = useToast();
  const [seg, setSeg] = useState<"tous" | "inactifs" | "limite" | ClientRow["segment"]>("tous");
  const [q, setQ] = useState("");
  const act = async (uid: string, b: Record<string, unknown>) => {
    try {
      await api(`/api/admin/users/${uid}`, { body: b });
      toast("ok", "Compte mis à jour.");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const subscribed = (c: ClientRow) => c.segment === "abonne" || c.segment === "offert";
  const list = d.clients.filter((c) => {
    if (q && !`${c.email} ${c.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (seg === "tous") return true;
    if (seg === "inactifs") return subscribed(c) && c.jobs30 === 0;
    if (seg === "limite") return subscribed(c) && c.usedPct >= 0.8;
    return c.segment === seg;
  });
  const filters: [typeof seg, string, number][] = [
    ["tous", "Tous", d.clients.length],
    ...SEGMENTS.map((s) => [s.id, s.label, d.clients.filter((c) => c.segment === s.id).length] as [typeof seg, string, number]),
    ["inactifs", "Abonnés inactifs (30 j)", d.clients.filter((c) => subscribed(c) && c.jobs30 === 0).length],
    ["limite", "Proches de la limite", d.clients.filter((c) => subscribed(c) && c.usedPct >= 0.8).length],
  ];
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un e-mail ou un nom" aria-label="Rechercher" className="max-w-xs" />
        <a href="/api/admin/clients.csv" className="ml-auto inline-flex h-9 items-center rounded-full border border-line px-4 text-sm hover:border-ink">Exporter en CSV (Excel)</a>
      </div>
      <div className="scrollbar-none -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {filters.map(([k, l, n]) => (
          <button key={k} onClick={() => setSeg(k)} className={cx("shrink-0 rounded-full border px-3 py-1.5 text-xs", seg === k ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{l} · {n}</button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2">Client</th><th>Statut</th><th>Abonnement</th><th>Boutiques</th><th>Activité</th><th>Forfait</th><th>Payé</th><th>Actions</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-2">{u.name || "—"}<span className="block text-xs text-muted">{u.email} {u.role === "admin" && "· admin"}</span><span className="block text-[11px] text-muted">inscrit {ago(u.createdAt)} · {u.projects} projet{u.projects > 1 ? "s" : ""}</span></td>
                <td className="pr-2"><Badge tone={segLabel(u.segment).tone}>{segLabel(u.segment).short}</Badge>{u.monthlyEur > 0 && <span className="mt-1 block text-xs text-muted">{eur2(u.monthlyEur)} / mois</span>}</td>
                <td className="pr-2"><Select value={u.subscription} onChange={(e) => act(u.id, { subscription: e.target.value })} aria-label="Abonnement">{[["none", "Sans abonnement"], ["trial", "Essai"], ["manual", "Offert (manuel)"], ["active", "Payant (Stripe)"], ["past_due", "Impayé (Stripe)"], ["canceled", "Résilié"]].map(([v, l]) => <option key={v} value={v} disabled={v === "active" || v === "past_due"}>{l}</option>)}</Select></td>
                <td className="pr-2"><Input type="number" min={1} max={50} defaultValue={u.stores} onBlur={(e) => Number(e.target.value) !== u.stores && act(u.id, { stores: Number(e.target.value) })} className="w-20" aria-label="Boutiques" /></td>
                <td className="pr-2 text-xs">{ago(u.lastActive)}<span className="block text-muted">{u.jobs30} création{u.jobs30 > 1 ? "s" : ""} en 30 j</span></td>
                <td className="pr-2 tabular-nums">{Math.round(u.usedPct * 100)} %<span className="block text-xs text-muted">reste {eur2(u.availableEur)} · IA {eur2(u.aiCost30Eur)}</span></td>
                <td className="pr-2 tabular-nums">{eur2(u.paidEur)}</td>
                <td><Button size="sm" variant="ghost" icon={<KeyRound className="size-3.5" />} onClick={() => { const v = prompt("Crédit IA à ajouter (en €, négatif pour retirer) :", "10"); if (v && !isNaN(Number(v))) act(u.id, { creditEur: Number(v), note: "Crédit ajouté par l'administration" }); }}>Créditer</Button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="py-6 text-center text-muted">Aucun client dans cette catégorie.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">« Offert (manuel) » active l'abonnement sans paiement en ligne (crédits IA compris). « Payant » et « Impayé » sont pilotés par Stripe. « Payé » : total encaissé depuis l'inscription.</p>
    </Card>
  );
}

function Usage({ data }: { data: Overview }) {
  const cost = data.usage.reduce((s, u) => s + u.costEur, 0);
  const billed = data.usage.reduce((s, u) => s + u.billedEur, 0);
  const rev = data.revenue.reduce((s, r) => s + r.cents, 0) / 100;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted">Coût fournisseurs (30 j)</p><p className="mt-1 font-display text-3xl font-semibold">{euro(cost)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Débité des enveloppes (30 j)</p><p className="mt-1 font-display text-3xl font-semibold">{euro(billed)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Encaissements Stripe (30 j)</p><p className="mt-1 font-display text-3xl font-semibold">{euro(rev)}</p></Card>
      </div>
      <Card className="overflow-x-auto p-5">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2">Fournisseur / modèle</th><th>Unité</th><th>Appels</th><th>Entrée</th><th>Sortie / quantité</th><th>Coût</th><th>Débité</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.usage.length === 0 && <tr><td colSpan={7} className="py-4 text-muted">Aucune consommation sur 30 jours.</td></tr>}
            {data.usage.map((u, i) => (
              <tr key={i}>
                <td className="py-2 font-mono text-xs">{u.provider}:{u.model}</td>
                <td>{u.unit}{u.est ? <Badge tone="warn" className="ml-1">estimé</Badge> : null}</td>
                <td>{u.calls}</td>
                <td className="tabular-nums">{u.inp?.toLocaleString("fr-FR") ?? "—"}</td>
                <td className="tabular-nums">{(u.unit === "tokens" ? u.out : u.q)?.toLocaleString("fr-FR") ?? "—"}</td>
                <td className="tabular-nums">{euro(u.costEur)}</td>
                <td className="tabular-nums">{euro(u.billedEur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Health({ data, reload }: { data: Overview; reload: () => void }) {
  const toast = useToast();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs text-muted">Processus de tâches (worker)</p>
          {data.worker ? (
            <p className="mt-1 flex items-center gap-2 font-medium">{data.worker.alive ? <Badge tone="ok" dot>En marche</Badge> : <Badge tone="bad" dot>Arrêté</Badge>} dernier signal {formatDate(data.worker.lastBeat, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
          ) : <p className="mt-1"><Badge tone="bad" dot>Jamais démarré</Badge> <span className="text-sm">lancez « npm run worker »</span></p>}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">File de tâches</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.queue.map((q) => <Badge key={q.status} tone={q.status === "failed" ? "bad" : q.status === "running" ? "info" : "neutral"}>{q.status} : {q.n}</Badge>)}</div>
        </Card>
      </div>
      <Card className="p-5">
        <p className="font-display text-lg font-semibold">Tâches en échec</p>
        <ul className="mt-2 divide-y divide-line text-sm">
          {data.failedJobs.length === 0 && <li className="py-2 text-muted">Aucune.</li>}
          {data.failedJobs.map((j) => (
            <li key={j.id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0"><span className="font-mono text-xs">{j.type}</span> · {j.attempts} essai(s)<span className="block break-words text-xs text-bad">{j.error}</span></span>
              <Button size="sm" variant="ghost" onClick={async () => { try { await api(`/api/jobs/${j.id}`, { body: { action: "retry" } }); toast("ok", "Relancée."); reload(); } catch (e) { toast("bad", (e as Error).message); } }}>Relancer</Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <p className="font-display text-lg font-semibold">Journal d'erreurs</p>
        <ul className="mt-2 divide-y divide-line text-sm">
          {data.errors.length === 0 && <li className="py-2 text-muted">Aucune erreur.</li>}
          {data.errors.map((e) => (
            <li key={e.id} className="py-2"><span className="font-mono text-xs">{e.scope}</span> <span className="text-xs text-muted">{formatDate(e.created_at)}</span><span className="block break-words text-xs">{e.message}</span></li>
          ))}
        </ul>
      </Card>
    </>
  );
}
