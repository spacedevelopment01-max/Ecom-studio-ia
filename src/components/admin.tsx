"use client";
import { PACKS, PACKS_FOR_SALE, PLAN_IDS, PLANS } from "@/lib/plans";
import { useId, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, CheckCircle2, Copy, KeyRound, Link2, Mail, RefreshCw, XCircle } from "lucide-react";
import { api, Badge, Button, Card, cx, formatDate, Input, Logo, Modal, Select, ThemeToggle, useApi, useToast } from "./ui";
import { formatEur } from "./billing-client";
import { LangSwitch, useLang, useT } from "./i18n";
import { intlLocale, type Lang } from "@/lib/i18n";
import { AccountingView } from "./admin-accounting";

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
  smtp: { configured: boolean; hostMasked: string; port: string; userMasked: string; passwordConfigured: boolean; fromMasked: string };
  users: { id: string; email: string; name: string; role: string; created_at: number; subscription: string; stores: number; projects: number; availableEur: number; usedPct: number }[];
  usage: { provider: string; model: string; unit: string; calls: number; inp: number; out: number; q: number; costEur: number; billedEur: number; est: number }[];
  revenue: { kind: string; cents: number; n: number }[];
  errors: { id: string; scope: string; message: string; user_id: string | null; project_id: string | null; created_at: number }[];
  failedJobs: { id: string; type: string; error: string; attempts: number; updated_at: number }[];
  queue: { status: string; n: number }[];
  worker: { lastBeat: number; info: Record<string, unknown>; alive: boolean } | null;
};

const SECTIONS = [
  ["bord", "Tableau de bord", "Dashboard"],
  ["clients", "Clients", "Customers"],
  ["compta", "Comptabilité", "Accounting"],
  ["ia", "Fournisseurs IA", "AI providers"],
  ["routes", "Modèles et tarifs", "Models and pricing"],
  ["connexions", "Connexions OAuth", "OAuth connections"],
  ["paiements", "Paiements", "Payments"],
  ["emails", "E-mails", "Emails"],
  ["conso", "Consommation", "Usage"],
  ["sante", "Erreurs et tâches", "Errors and tasks"],
] as const;

const euro = (lang: Lang, n: number) => n.toLocaleString(intlLocale(lang), { style: "currency", currency: "EUR", maximumFractionDigits: 4 });
const num = (lang: Lang, n: number | null | undefined) => n?.toLocaleString(intlLocale(lang));
const pctTxt = (lang: Lang, n: number) => (lang === "en" ? `${n}%` : `${n} %`);

export function AdminConsole() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<Overview>("/api/admin/overview");
  const [tab, setTab] = useState<(typeof SECTIONS)[number][0]>("bord");
  const { data: dash, reload: reloadDash } = useApi<Dashboard>("/api/admin/dashboard");
  const set = async (pairs: { key: string; value: string | null }[], msg = t("Enregistré.", "Saved.")) => {
    try {
      await api("/api/admin/settings", { body: { set: pairs } });
      toast("ok", msg);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const post = async (b: Record<string, unknown>, msg = t("Enregistré.", "Saved.")) => {
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
          <Link href="/studio" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="size-4" /> <Logo compact /> <span className="font-medium">{t("Administration", "Admin")}</span></Link>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => { reload(); reloadDash(); }} aria-label={t("Actualiser", "Refresh")}><span className="hidden sm:inline">{t("Actualiser", "Refresh")}</span></Button>
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          {SECTIONS.map(([k, l, lEn]) => (
            <button key={k} onClick={() => setTab(k)} className={cx("shrink-0 rounded-full border px-4 py-2 text-sm", tab === k ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{t(l, lEn)}</button>
          ))}
        </nav>
        {!data ? <div className="skeleton h-72 rounded-3xl" /> : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
            <PricingAlert data={data} post={post} onOpen={() => setTab("routes")} />
            {tab === "ia" && <AiProviders data={data} set={set} />}
            {tab === "routes" && <Routes data={data} post={post} />}
            {tab === "connexions" && <OAuthApps data={data} set={set} />}
            {tab === "paiements" && <Payments data={data} set={set} />}
            {tab === "emails" && <SmtpSettings data={data} set={set} />}
            {tab === "bord" && (dash ? <DashboardView d={dash} onClients={() => setTab("clients")} /> : <div className="skeleton h-72 rounded-3xl" />)}
            {tab === "clients" && (dash ? <Clients d={dash} reload={() => { reload(); reloadDash(); }} /> : <div className="skeleton h-72 rounded-3xl" />)}
            {tab === "compta" && <AccountingView />}
            {tab === "conso" && <Usage data={data} />}
            {tab === "sante" && <Health data={data} reload={reload} />}
          </div>
        )}
      </div>
    </div>
  );
}

type SetFn = (pairs: { key: string; value: string | null }[], msg?: string) => Promise<void>;

function SecretRow({ label, masked, onSave, placeholder, type = "password" }: { label: string; masked: string; onSave: (v: string) => void; placeholder?: string; type?: "password" | "text" }) {
  const t = useT();
  const [v, setV] = useState("");
  const fid = useId();
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSave(v.trim()); setV(""); } }} className="grid min-w-0 gap-1.5">
      <label htmlFor={fid} className="break-words text-xs font-medium text-ink-2">{label} {masked && <span className="font-mono text-muted">{t("· actuelle : ", "· current: ")}{masked}</span>}</label>
      <div className="flex gap-2">
        <Input id={fid} type={type} autoComplete="off" value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder ?? (masked ? t("Remplacer…", "Replace…") : t("Coller la valeur", "Paste the value"))} />
        <Button type="submit" variant="secondary" disabled={!v.trim()}>{t("Enregistrer", "Save")}</Button>
      </div>
    </form>
  );
}

function AiProviders({ data, set }: { data: Overview; set: SetFn }) {
  const t = useT();
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
      <Card className="p-5 text-sm text-ink-2">{t("Les clés sont chiffrées en base (AES-256-GCM avec APP_SECRET) et ne sont jamais renvoyées au navigateur. Les clients n'ont jamais de clé à fournir. Sans clé, le studio fonctionne avec son moteur intégré (sans IA externe) et l'indique clairement aux clients.", "Keys are encrypted in the database (AES-256-GCM with APP_SECRET) and are never sent back to the browser. Customers never have to provide a key. Without a key, the studio runs on its built-in engine (no external AI) and tells customers so clearly.")}</Card>
      <div className="grid gap-4 md:grid-cols-2">
        {data.providers.map((p) => (
          <Card key={p.id} className="grid gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{p.role}</p>
              </div>
              {p.configured ? (p.disabled ? <Badge tone="warn">{t("Désactivé", "Disabled")}</Badge> : <Badge tone="ok" dot>{t("Clé enregistrée", "Key saved")}</Badge>) : <Badge>{t("Aucune clé", "No key")}</Badge>}
            </div>
            <SecretRow label={p.keyHelp} masked={p.keyMasked} onSave={(v) => set([{ key: `provider.${p.id}.apiKey`, value: v }], t("Clé enregistrée (chiffrée).", "Key saved (encrypted)."))} />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={<Activity className="size-4" />} disabled={!p.configured} loading={testing === p.id} onClick={() => test(p.id)}>{t("Tester réellement", "Run a live test")}</Button>
              {p.configured && <Button size="sm" variant="ghost" onClick={() => set([{ key: `provider.${p.id}.disabled`, value: p.disabled ? null : "1" }])}>{p.disabled ? t("Réactiver", "Re-enable") : t("Désactiver", "Disable")}</Button>}
              {p.configured && <Button size="sm" variant="ghost" onClick={() => confirm(t("Supprimer cette clé ?", "Delete this key?")) && set([{ key: `provider.${p.id}.apiKey`, value: null }], t("Clé supprimée.", "Key deleted."))}>{t("Supprimer", "Delete")}</Button>}
              <a href={p.docs} target="_blank" rel="noreferrer" className="text-xs underline">{t("Documentation", "Documentation")}</a>
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
        <p className="font-display text-lg font-semibold">{t("Adresse publique du studio", "Studio public URL")}</p>
        <p className="text-sm text-ink-2">{t("Utilisée pour les retours OAuth, les médias publiés (Instagram, TikTok, Pinterest récupèrent les fichiers par URL) et l'installation du thème Shopify. Doit être en HTTPS et accessible depuis Internet. Actuelle : ", "Used for OAuth callbacks, published media (Instagram, TikTok and Pinterest fetch files by URL) and Shopify theme installation. Must use HTTPS and be reachable from the internet. Current: ")}<span className="font-mono">{data.appUrl}</span></p>
        <UrlRow initial={data.appUrl} onSave={(v) => set([{ key: "app.url", value: v }], t("Adresse enregistrée.", "URL saved."))} />
      </Card>
    </>
  );
}

function UrlRow({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const t = useT();
  const [v, setV] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v.trim().replace(/\/$/, "")); }} className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={t("https://studio.exemple.fr", "https://studio.example.com")} aria-label={t("Adresse publique", "Public URL")} />
      <Button type="submit" variant="secondary">{t("Enregistrer", "Save")}</Button>
    </form>
  );
}

/** Rentabilité : tarif manquant (génération refusée) et tarifs à revérifier. */
function PricingAlert({ data, post, onOpen }: { data: Overview; post: (b: Record<string, unknown>, msg?: string) => Promise<void>; onOpen: () => void }) {
  const t = useT();
  const { checkedAt, reviewDays, missing } = data.pricing;
  const age = checkedAt ? Math.floor((Date.now() - checkedAt) / 86400_000) : null;
  const stale = age === null || age > reviewDays;
  if (!missing.length && !stale) return null;
  return (
    <div className="grid gap-3">
      {missing.length > 0 && (
        <div className="rounded-2xl border border-bad/30 bg-bad-soft p-4 text-sm text-bad">
          <p className="font-semibold">{t("Tarif manquant : ces générations sont refusées pour protéger votre marge.", "Missing price: these generations are blocked to protect your margin.")}</p>
          <ul className="mt-1.5 list-disc pl-5">{missing.map((m) => <li key={m.task}>{m.label} · <span className="font-mono text-xs">{m.key}</span></li>)}</ul>
          <Button size="sm" variant="secondary" className="mt-3" onClick={onOpen}>{t("Renseigner les tarifs", "Enter prices")}</Button>
        </div>
      )}
      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          <p>
            <span className="font-semibold">{age === null ? t("Tarifs des fournisseurs jamais confirmés.", "Provider prices have never been confirmed.") : t(`Tarifs vérifiés il y a ${age} jours.`, `Prices checked ${age} days ago.`)}</span>{" "}
            {t(`Si un fournisseur a augmenté ses prix, le budget IA interne des clients (garde-fou de marge, jamais affiché) sous-estime la dépense réelle. Comparez avec les pages officielles (OpenAI, Google, Anthropic, fal.ai) et le taux USD → EUR, tous les ${reviewDays} jours.`, `If a provider has raised its prices, the customers' internal AI budget (a margin safeguard, never shown) underestimates the actual spend. Compare with the official pricing pages (OpenAI, Google, Anthropic, fal.ai) and the USD → EUR rate every ${reviewDays} days.`)}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onOpen}>{t("Voir les tarifs", "View prices")}</Button>
            <Button size="sm" onClick={() => post({ pricesChecked: true }, t("Tarifs marqués comme vérifiés.", "Prices marked as checked."))}>{t("J'ai vérifié les tarifs", "I've checked the prices")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Routes({ data, post }: { data: Overview; post: (b: Record<string, unknown>, msg?: string) => Promise<void> }) {
  const t = useT();
  const [edit, setEdit] = useState<Record<string, { provider: string; model: string; effort?: string }>>({});
  const [priceKey, setPriceKey] = useState("");
  const [priceJson, setPriceJson] = useState("");
  const [fx, setFx] = useState(String(data.usdToEur));
  const [markup, setMarkup] = useState(String(data.markup));
  return (
    <>
      <Card className="overflow-x-auto p-5">
        <p className="font-display text-lg font-semibold">{t("Routage des tâches", "Task routing")}</p>
        <p className="mb-4 text-sm text-ink-2">{t("Chaque tâche utilise le fournisseur et le modèle indiqués. Les identifiants de modèles doivent correspondre exactement à ceux du fournisseur.", "Each task uses the provider and model shown. Model IDs must match the provider's exactly.")}</p>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2">{t("Tâche", "Task")}</th><th>{t("Fournisseur", "Provider")}</th><th>{t("Modèle", "Model")}</th><th>{t("Effort", "Effort")}</th><th>{t("Tarif", "Price")}</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {data.tasks.map((k) => {
              const r = edit[k.id] ?? k.route;
              return (
                <tr key={k.id}>
                  <td className="py-2 pr-2">{k.label}<span className="block text-[11px] text-muted">{k.kind}</span></td>
                  <td className="pr-2"><Select value={r.provider} onChange={(e) => setEdit({ ...edit, [k.id]: { ...r, provider: e.target.value } })} aria-label={t("Fournisseur", "Provider")}>{data.providers.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}</Select></td>
                  <td className="pr-2"><Input value={r.model} onChange={(e) => setEdit({ ...edit, [k.id]: { ...r, model: e.target.value } })} aria-label={t("Modèle", "Model")} className="font-mono text-xs" /></td>
                  <td className="pr-2">{r.provider === "anthropic" ? <Select value={r.effort ?? ""} onChange={(e) => setEdit({ ...edit, [k.id]: { ...r, effort: e.target.value || undefined } })} aria-label={t("Effort", "Effort")}><option value="">{t("défaut", "default")}</option>{["low", "medium", "high", "xhigh", "max"].map((x) => <option key={x}>{x}</option>)}</Select> : <span className="text-muted">—</span>}</td>
                  <td className="pr-2 text-xs">{k.price ? <Badge tone="ok">{t("défini", "set")}</Badge> : <Badge tone="warn">{t("manquant", "missing")}</Badge>}</td>
                  <td>{edit[k.id] && <Button size="sm" onClick={async () => { await post({ route: { task: k.id, ...edit[k.id] } }, t("Routage enregistré.", "Routing saved.")); const n = { ...edit }; delete n[k.id]; setEdit(n); }}>OK</Button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card className="grid gap-4 p-5">
        <p className="font-display text-lg font-semibold">{t("Tarifs des fournisseurs (USD)", "Provider prices (USD)")}</p>
        <p className="text-sm text-ink-2">{t("Coûts internes, jamais affichés aux clients. Les images et vidéos sont comptées à l'unité (image, seconde de vidéo) lorsque le fournisseur facture ainsi : aucun jeton n'est inventé. Vérifiez ces tarifs sur les pages officielles.", "Internal costs, never shown to customers. Images and videos are counted per unit (image, second of video) when the provider bills that way: no tokens are made up. Check these prices on the official pages.")}</p>
        <div className="grid gap-1 font-mono text-xs">
          {Object.entries(data.prices).map(([k, v]) => (
            <button key={k} onClick={() => { setPriceKey(k); setPriceJson(JSON.stringify(v)); }} className="flex justify-between gap-3 rounded-lg px-2 py-1 text-left hover:bg-paper-2"><span>{k}</span><span className="text-muted">{JSON.stringify(v)}</span></button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); try { post({ price: { key: priceKey, value: JSON.parse(priceJson) } }, t("Tarif enregistré.", "Price saved.")); } catch { alert(t("JSON invalide", "Invalid JSON")); } }} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <Input value={priceKey} onChange={(e) => setPriceKey(e.target.value)} placeholder={t("fournisseur:modèle", "provider:model")} aria-label={t("Clé du tarif", "Price key")} className="font-mono text-xs" />
          <Input value={priceJson} onChange={(e) => setPriceJson(e.target.value)} placeholder='{"unit":"tokens","inputPerM":3,"outputPerM":15}' aria-label={t("Tarif JSON", "Price JSON")} className="font-mono text-xs" />
          <Button type="submit" variant="secondary">{t("Enregistrer", "Save")}</Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <form onSubmit={(e) => { e.preventDefault(); post({ usdToEur: Number(fx) }, t("Taux enregistré.", "Rate saved.")); }} className="flex items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs font-medium text-ink-2">{t("Taux USD → EUR", "USD → EUR rate")}<Input value={fx} onChange={(e) => setFx(e.target.value)} inputMode="decimal" /></label>
            <Button type="submit" variant="secondary">OK</Button>
          </form>
          <form onSubmit={(e) => { e.preventDefault(); post({ markup: Number(markup) }, t("Coefficient enregistré.", "Multiplier saved.")); }} className="flex items-end gap-2">
            <label className="grid flex-1 gap-1 text-xs font-medium text-ink-2">{t("Coefficient appliqué au coût (débit de l'enveloppe, 1 au minimum)", "Multiplier applied to cost (charged to the allowance, minimum 1)")}<Input value={markup} onChange={(e) => setMarkup(e.target.value)} inputMode="decimal" /></label>
            <Button type="submit" variant="secondary">OK</Button>
          </form>
        </div>
      </Card>
    </>
  );
}

function CopyLine({ value }: { value: string }) {
  const t = useT();
  const toast = useToast();
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); toast("ok", t("Copié.", "Copied.")); }} className="flex w-full items-center justify-between gap-2 rounded-xl bg-paper-2 px-3 py-2 text-left font-mono text-[11px]">
      <span className="truncate">{value}</span><Copy className="size-3.5 shrink-0" />
    </button>
  );
}

function OAuthApps({ data, set }: { data: Overview; set: SetFn }) {
  const t = useT();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.oauth.map((o) => (
        <Card key={o.key} className="grid gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="font-display text-lg font-semibold">{o.label}</p>
            {o.configured ? <Badge tone="ok" dot>{t("Configuré", "Configured")}</Badge> : <Badge tone="warn" dot>{t("À configurer", "To configure")}</Badge>}
          </div>
          <p className="text-xs text-muted">{o.needs}</p>
          <div className="grid gap-1"><span className="text-xs font-medium text-ink-2">{t("Adresse de retour à déclarer chez le fournisseur", "Redirect URI to register with the provider")}</span><CopyLine value={o.redirectUri} /></div>
          <SecretRow label="Client ID / App ID / Client key" masked={o.clientIdMasked} onSave={(v) => set([{ key: `oauth.${o.key}.clientId`, value: v }])} />
          <SecretRow label="Client secret" masked={o.configured ? "••••" : ""} onSave={(v) => set([{ key: `oauth.${o.key}.clientSecret`, value: v }], t("Secret enregistré (chiffré).", "Secret saved (encrypted)."))} />
          <a href={o.docs} target="_blank" rel="noreferrer" className="text-xs underline">{t("Documentation officielle", "Official documentation")}</a>
        </Card>
      ))}
    </div>
  );
}

/** Offre en vigueur, générée depuis src/lib/plans.ts (forfaits et packs) : ne peut plus diverger des prix affichés aux clients. */
function OfferSummary() {
  const t = useT();
  const { lang } = useLang();
  const eur = (n: number) => formatEur(n, lang);
  return (
    <div className="grid gap-2 rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">
      <p>
        <strong className="text-ink">{t("Forfaits (TTC, une boutique ou un site par abonnement) : ", "Plans (incl. tax, one store or website per subscription): ")}</strong>
        {PLAN_IDS.map((id) => t(`${PLANS[id].name.fr} ${eur(PLANS[id].price.month)}/mois ou ${eur(PLANS[id].price.year)}/an`, `${PLANS[id].name.en} ${eur(PLANS[id].price.month)}/month or ${eur(PLANS[id].price.year)}/year`)).join(" · ")}
      </p>
      <p>
        <strong className="text-ink">{t("Packs (TTC, achat ponctuel, n'expirent pas) : ", "Packs (incl. tax, one-off purchase, never expire): ")}</strong>
        {PACKS_FOR_SALE.map((id) => `${PACKS[id].name[lang]} ${eur(PACKS[id].price)}`).join(" · ")}
        {PLAN_IDS.some((id) => PLANS[id].packDiscount > 0) && <>{" — "}{PLAN_IDS.filter((id) => PLANS[id].packDiscount > 0).map((id) => t(`-${Math.round(PLANS[id].packDiscount * 100)} % avec ${PLANS[id].name.fr}`, `${Math.round(PLANS[id].packDiscount * 100)}% off with ${PLANS[id].name.en}`)).join(", ")}</>}
      </p>
    </div>
  );
}

function Payments({ data, set }: { data: Overview; set: SetFn }) {
  const t = useT();
  const s = data.stripe;
  return (
    <Card className="grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold">Stripe</p>
        {s.live ? <Badge tone="ok" dot>{t("Actif et vérifié", "Active and verified")}</Badge> : <Badge tone="warn" dot>{t("Non actif", "Inactive")}</Badge>}
      </div>
      <p className="text-sm text-ink-2">{t(<>Les paiements ne sont annoncés comme actifs aux clients qu'une fois la clé secrète et le secret du webhook enregistrés <strong>et</strong> un premier événement signé reçu de Stripe (preuve que la chaîne fonctionne).</>, <>Payments are shown to customers as active only once the secret key and the webhook secret are saved <strong>and</strong> a first signed event has been received from Stripe (proof that the whole chain works).</>)}</p>
      <OfferSummary />
      <div className="grid gap-1"><span className="text-xs font-medium text-ink-2">{t("Adresse du webhook (événements : checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid)", "Webhook URL (events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid)")}</span><CopyLine value={s.webhookUrl} /></div>
      <SecretRow label={t("Clé secrète (sk_live_… ou sk_test_…)", "Secret key (sk_live_… or sk_test_…)")} masked={s.secretMasked} onSave={(v) => set([{ key: "stripe.secretKey", value: v }], t("Clé Stripe enregistrée (chiffrée).", "Stripe key saved (encrypted)."))} />
      <SecretRow label={t("Secret de signature du webhook (whsec_…)", "Webhook signing secret (whsec_…)")} masked={s.webhookConfigured ? "••••" : ""} onSave={(v) => set([{ key: "stripe.webhookSecret", value: v }], t("Secret enregistré.", "Secret saved."))} />
      <p className="text-xs text-muted">{s.verifiedAt ? t(`Dernier événement signé vérifié : ${s.verifiedAt}`, `Last verified signed event: ${s.verifiedAt}`) : t("Aucun événement Stripe vérifié pour l'instant. Envoyez un événement de test depuis le tableau de bord Stripe.", "No Stripe event verified yet. Send a test event from the Stripe dashboard.")}</p>
    </Card>
  );
}

/** Envoi d'e-mails (SMTP) : mot de passe oublié. Valeurs chiffrées, affichées masquées uniquement. */
function SmtpSettings({ data, set }: { data: Overview; set: SetFn }) {
  const t = useT();
  const toast = useToast();
  const m = data.smtp;
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const test = async () => {
    setTesting(true);
    try {
      setResult(await api<{ ok: boolean; message: string }>("/api/admin/mail-test", { body: {} }));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
    setTesting(false);
  };
  const save = (key: string, msg?: string) => (v: string) => set([{ key, value: v }], msg ?? t("Enregistré (chiffré).", "Saved (encrypted)."));
  return (
    <Card className="grid gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold">{t("Envoi d'e-mails (SMTP)", "Sending emails (SMTP)")}</p>
        {m.configured ? <Badge tone="ok" dot>{t("Configuré", "Configured")}</Badge> : <Badge tone="warn" dot>{t("À configurer", "To configure")}</Badge>}
      </div>
      <p className="text-sm text-ink-2">{t("Sert à envoyer les liens « Mot de passe oublié ». Tant que ce n'est pas configuré, la page « Mot de passe oublié » invite le client à écrire au support (page contact) ; vous pouvez alors lui générer un lien depuis l'onglet Clients. Utilisez les réglages SMTP de votre fournisseur d'e-mails (OVH, Brevo, Gmail avec mot de passe d'application…). Les valeurs sont chiffrées et ne sont jamais réaffichées en clair.", "Used to send “Forgot password” links. Until it's configured, the “Forgot password” page asks customers to write to support (contact page); you can then generate a link for them from the Customers tab. Use your email provider's SMTP settings (OVH, Brevo, Gmail with an app password…). Values are encrypted and never shown again in clear text.")}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <SecretRow type="text" label={t("Serveur SMTP (ex. smtp.exemple.fr)", "SMTP server (e.g. smtp.example.com)")} masked={m.hostMasked} onSave={save("smtp.host")} />
        <SecretRow type="text" label={t("Port (587 ou 465)", "Port (587 or 465)")} masked={m.port} onSave={save("smtp.port", t("Port enregistré.", "Port saved."))} placeholder="587" />
        <SecretRow type="text" label={t("Identifiant", "Username")} masked={m.userMasked} onSave={save("smtp.user")} />
        <SecretRow label={t("Mot de passe SMTP", "SMTP password")} masked={m.passwordConfigured ? "••••" : ""} onSave={save("smtp.password")} />
        <SecretRow type="text" label={t("Adresse d'expédition (ex. Studio <studio@exemple.fr>)", "Sender address (e.g. Studio <studio@example.com>)")} masked={m.fromMasked} onSave={save("smtp.from")} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={<Mail className="size-4" />} disabled={!m.configured} loading={testing} onClick={test}>{t("Envoyer un e-mail de test (à votre adresse)", "Send a test email (to your address)")}</Button>
        {m.configured && <Button size="sm" variant="ghost" onClick={() => confirm(t("Effacer tous les réglages SMTP ?", "Clear all SMTP settings?")) && set(["smtp.host", "smtp.port", "smtp.user", "smtp.password", "smtp.from"].map((key) => ({ key, value: null })), t("Réglages SMTP effacés.", "SMTP settings cleared."))}>{t("Tout effacer", "Clear all")}</Button>}
      </div>
      {result && (
        <p className={cx("flex gap-2 rounded-xl p-2.5 text-xs", result.ok ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>
          {result.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />} <span className="min-w-0 break-words">{result.message}</span>
        </p>
      )}
    </Card>
  );
}

type ClientRow = { id: string; email: string; name: string; role: string; createdAt: number; subscription: string; stores: number; plan: string | null; monthlyEur: number; projects: number; lastActive: number | null; jobs30: number; aiCost30Eur: number; usedPct: number; availableEur: number; paidEur: number; segment: "abonne" | "offert" | "essai" | "sans" | "impaye" | "resilie" };
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

const SEGMENTS: { id: ClientRow["segment"]; label: string; labelEn: string; short: string; shortEn: string; tone: "ok" | "info" | "neutral" | "warn" | "bad" }[] = [
  { id: "abonne", label: "Abonnés payants", labelEn: "Paying subscribers", short: "Abonné", shortEn: "Subscriber", tone: "ok" },
  { id: "offert", label: "Abonnements offerts", labelEn: "Complimentary subscriptions", short: "Offert", shortEn: "Complimentary", tone: "info" },
  { id: "essai", label: "En essai", labelEn: "On trial", short: "Essai", shortEn: "Trial", tone: "neutral" },
  { id: "sans", label: "Sans abonnement", labelEn: "No subscription", short: "Sans abonnement", shortEn: "No subscription", tone: "neutral" },
  { id: "impaye", label: "Paiement en échec", labelEn: "Payment failed", short: "Impayé", shortEn: "Unpaid", tone: "warn" },
  { id: "resilie", label: "Résiliés", labelEn: "Canceled", short: "Résilié", shortEn: "Canceled", tone: "bad" },
];
const segLabel = (s: ClientRow["segment"]) => SEGMENTS.find((x) => x.id === s)!;
const money2 = (lang: Lang, n: number) => n.toLocaleString(intlLocale(lang), { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const agoTxt = (lang: Lang, t: number | null) => {
  if (!t) return lang === "en" ? "never" : "jamais";
  const d = Math.floor((Date.now() - t) / 86400_000);
  if (lang === "en") return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} d ago`;
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
  const t = useT();
  const { lang } = useLang();
  const eur2 = (n: number) => money2(lang, n);
  const ago = (x: number | null) => agoTxt(lang, x);
  const m = d.money30;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile accent label={t("Abonnés payants", "Paying subscribers")} value={num(lang, d.plans.abonne) ?? "0"} hint={t(`${d.storesBilled} boutique${d.storesBilled > 1 ? "s" : ""} facturée${d.storesBilled > 1 ? "s" : ""}`, `${d.storesBilled} store${d.storesBilled > 1 ? "s" : ""} billed`)} />
        <Tile accent label={t("Revenu mensuel récurrent", "Monthly recurring revenue")} value={eur2(d.mrrEur)} hint={t("TTC, abonnements payants en cours", "Incl. tax, current paid subscriptions")} />
        <Tile label={t("Comptes inscrits", "Registered accounts")} value={num(lang, d.accounts.total) ?? "0"} hint={t(`+${d.accounts.new7} en 7 j · +${d.accounts.new30} en 30 j`, `+${d.accounts.new7} in 7 d · +${d.accounts.new30} in 30 d`)} />
        <Tile label={t("Conversion en abonnés", "Conversion to subscribers")} value={pctTxt(lang, Math.round(d.conversionPct))} hint={t("abonnés payants / comptes inscrits", "paying subscribers / registered accounts")} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold">{t("Répartition des comptes", "Account breakdown")}</p>
          <Button size="sm" variant="secondary" onClick={onClients}>{t("Voir les clients", "View customers")}</Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SEGMENTS.filter((s) => s.id !== "essai" || d.plans.essai > 0).map((s) => (
            <div key={s.id} className="min-w-0 rounded-2xl border border-line p-3">
              <Badge tone={s.tone}>{t(s.label, s.labelEn)}</Badge>
              <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{d.plans[s.id]}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="font-display text-lg font-semibold">{t("Utilisation du forfait", "Plan usage")}</p>
          <p className="text-xs text-muted">{t("Abonnés payants et offerts, sur les 30 derniers jours.", "Paying and complimentary subscribers, over the last 30 days.")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">{t("L'utilisent", "Using it")}</p><p className="font-display text-2xl font-semibold tabular-nums">{d.usage.using}<span className="text-base text-muted"> / {d.usage.subscribers}</span></p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">{t("Ne l'utilisent pas", "Not using it")}</p><p className="font-display text-2xl font-semibold tabular-nums">{d.usage.notUsing}</p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">{t("Budget IA utilisé en moyenne", "Average AI budget used")}</p><p className="font-display text-2xl font-semibold tabular-nums">{pctTxt(lang, Math.round(d.usage.avgUsedPct))}</p></div>
            <div className="rounded-2xl bg-paper-2 p-3"><p className="text-xs text-muted">{t("Proches de la limite (80 %+)", "Close to the limit (80%+)")}</p><p className="font-display text-2xl font-semibold tabular-nums">{d.usage.nearLimit}</p></div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-2">{t("Risque de départ (aucune création en 30 j)", "Churn risk (no creation in 30 d)")}</p>
              <ul className="mt-1.5 grid gap-1 text-sm">{d.atRisk.length ? d.atRisk.map((r) => <li key={r.email} className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate" title={r.email}>{r.email}</span><span className="shrink-0 text-xs text-muted">{ago(r.lastActive)}</span></li>) : <li className="text-muted">{t("Aucun", "None")}</li>}</ul>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-2">{t("À relancer pour un pack (budget du mois presque utilisé)", "To follow up for a pack (monthly budget almost used)")}</p>
              <ul className="mt-1.5 grid gap-1 text-sm">{d.nearLimit.length ? d.nearLimit.map((r) => <li key={r.email} className="flex min-w-0 justify-between gap-2"><span className="min-w-0 truncate" title={r.email}>{r.email}</span><span className="shrink-0 text-xs text-muted">{pctTxt(lang, Math.round(r.usedPct))}</span></li>) : <li className="text-muted">{t("Aucun", "None")}</li>}</ul>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-display text-lg font-semibold">{t("Argent des 30 derniers jours", "Money over the last 30 days")}</p>
          <p className="text-xs text-muted">{t("Paiements encaissés via Stripe. Marge estimée : HT moins coût IA et frais Stripe estimés (hors serveur, cotisations et impôts).", "Payments collected through Stripe. Estimated margin: revenue excl. tax minus AI cost and estimated Stripe fees (excluding hosting, social charges and taxes).")}</p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt>{t("Paiements reçus", "Payments received")}</dt><dd className="tabular-nums">{m.payments} · <strong>{eur2(m.paidEur)}</strong> {t("TTC", "incl. tax")}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>{t("dont abonnements", "of which subscriptions")}</dt><dd className="tabular-nums">{m.subscriptionCount} · {eur2(m.subscriptionEur)}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>{t("dont packs", "of which packs")}</dt><dd className="tabular-nums">{m.topupCount} · {eur2(m.topupEur)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-2"><dt>{t("Chiffre d'affaires HT", "Revenue excl. tax")}</dt><dd className="tabular-nums">{eur2(m.revenueHtEur)}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>{t("Coût IA réel", "Actual AI cost")}</dt><dd className="tabular-nums">− {eur2(m.aiCostEur)}</dd></div>
            <div className="flex justify-between gap-3 text-ink-2"><dt>{t("Frais Stripe estimés", "Estimated Stripe fees")}</dt><dd className="tabular-nums">− {eur2(m.stripeFeesEur)}</dd></div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-base"><dt className="font-semibold">{t("Marge estimée", "Estimated margin")}</dt><dd className={cx("font-semibold tabular-nums", m.marginEur < 0 && "text-bad")}>{eur2(m.marginEur)}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto p-5">
          <p className="font-display text-lg font-semibold">{t("Encaissements par mois", "Collections by month")}</p>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-1.5">{t("Mois", "Month")}</th><th className="hidden text-right sm:table-cell">{t("Paiements", "Payments")}</th><th className="text-right">{t("Abonnements", "Subscriptions")}</th><th className="text-right">{t("Packs", "Packs")}</th><th className="text-right">{t("Total TTC", "Total incl. tax")}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {d.months.map((x) => (
                <tr key={x.label}><td className="py-1.5 pr-2 capitalize">{x.label}</td><td className="hidden text-right tabular-nums sm:table-cell">{x.payments}</td><td className="text-right tabular-nums">{eur2(x.subscriptionEur)}</td><td className="text-right tabular-nums">{eur2(x.topupEur)}</td><td className="text-right font-semibold tabular-nums">{eur2(x.subscriptionEur + x.topupEur)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="overflow-x-auto p-5">
          <p className="font-display text-lg font-semibold">{t("Derniers paiements", "Latest payments")}</p>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {d.lastPayments.length ? d.lastPayments.map((p) => (
                <tr key={p.id}><td className="py-1.5 pr-2"><span className="block max-w-[16rem] truncate sm:max-w-none">{p.email}</span><span className="text-xs text-muted">{p.kind === "subscription" ? t("Abonnement", "Subscription") : p.kind === "pack" ? t("Pack", "Pack") : t("Recharge (ancienne offre)", "Top-up (former offer)")} · {formatDate(p.at)}</span></td><td className="text-right tabular-nums">{eur2(p.amountEur)}</td><td className="pl-2 text-right"><Badge tone={p.status === "paid" ? "ok" : "warn"}>{p.status === "paid" ? t("payé", "paid") : p.status}</Badge></td></tr>
              )) : <tr><td className="py-2 text-muted">{t("Aucun paiement pour l'instant.", "No payments yet.")}</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}

function Clients({ d, reload }: { d: Dashboard; reload: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const eur2 = (n: number) => money2(lang, n);
  const ago = (x: number | null) => agoTxt(lang, x);
  const toast = useToast();
  const [seg, setSeg] = useState<"tous" | "inactifs" | "limite" | ClientRow["segment"]>("tous");
  const [q, setQ] = useState("");
  const [credit, setCredit] = useState<{ user: ClientRow; value: string } | null>(null);
  const [reset, setReset] = useState<{ user: ClientRow; url: string | null; loading: boolean } | null>(null);
  const resetLink = async (u: ClientRow) => {
    setReset({ user: u, url: null, loading: true });
    try {
      const r = await api<{ url: string }>(`/api/admin/users/${u.id}/reset-link`, { body: {} });
      setReset({ user: u, url: r.url, loading: false });
    } catch (e) {
      setReset(null);
      toast("bad", (e as Error).message);
    }
  };
  const act = async (uid: string, b: Record<string, unknown>) => {
    try {
      await api(`/api/admin/users/${uid}`, { body: b });
      toast("ok", t("Compte mis à jour.", "Account updated."));
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
    ["tous", t("Tous", "All"), d.clients.length],
    // « En essai » : ancienne offre, affiché seulement s'il reste des comptes dans ce cas.
    ...SEGMENTS.filter((s) => s.id !== "essai" || d.clients.some((c) => c.segment === "essai")).map((s) => [s.id, t(s.label, s.labelEn), d.clients.filter((c) => c.segment === s.id).length] as [typeof seg, string, number]),
    ["inactifs", t("Abonnés inactifs (30 j)", "Inactive subscribers (30 d)"), d.clients.filter((c) => subscribed(c) && c.jobs30 === 0).length],
    ["limite", t("Proches de la limite", "Close to the limit"), d.clients.filter((c) => subscribed(c) && c.usedPct >= 0.8).length],
  ];
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher un e-mail ou un nom", "Search by email or name")} aria-label={t("Rechercher", "Search")} className="max-w-xs" />
        <a href="/api/admin/clients.csv" className="ml-auto inline-flex h-9 items-center rounded-full border border-line px-4 text-sm hover:border-ink">{t("Exporter en CSV (Excel)", "Export to CSV (Excel)")}</a>
      </div>
      <div className="scrollbar-none -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {filters.map(([k, l, n]) => (
          <button key={k} onClick={() => setSeg(k)} className={cx("shrink-0 rounded-full border px-3 py-1.5 text-xs", seg === k ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{l} · {n}</button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2">{t("Client", "Customer")}</th><th>{t("Statut", "Status")}</th><th>{t("Abonnement", "Subscription")}</th><th>{t("Forfait", "Plan")}</th><th>{t("Activité", "Activity")}</th><th>{t("Budget IA", "AI budget")}</th><th>{t("Payé", "Paid")}</th><th>{t("Actions", "Actions")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-2">{u.name || "—"}<span className="block text-xs text-muted">{u.email} {u.role === "admin" && "· admin"}</span><span className="block text-[11px] text-muted">{t(`inscrit ${ago(u.createdAt)} · ${u.projects} projet${u.projects > 1 ? "s" : ""}`, `signed up ${ago(u.createdAt)} · ${u.projects} project${u.projects > 1 ? "s" : ""}`)}</span></td>
                <td className="pr-2"><Badge tone={segLabel(u.segment).tone}>{t(segLabel(u.segment).short, segLabel(u.segment).shortEn)}</Badge>{u.monthlyEur > 0 && <span className="mt-1 block text-xs text-muted">{eur2(u.monthlyEur)} {t("/ mois", "/ month")}</span>}</td>
                <td className="pr-2"><Select className="min-w-[12.5rem]" value={u.subscription} onChange={(e) => act(u.id, { subscription: e.target.value })} aria-label={t(`Abonnement de ${u.email}`, `Subscription of ${u.email}`)}>{[["none", t("Sans abonnement", "No subscription")], ["manual", t("Offert (manuel)", "Complimentary (manual)")], ["active", t("Payant (Stripe)", "Paid (Stripe)")], ["past_due", t("Impayé (Stripe)", "Unpaid (Stripe)")], ["canceled", t("Résilié", "Canceled")], ...(u.subscription === "trial" ? [["trial", t("Essai (ancienne offre)", "Trial (former offer)")]] : [])].map(([v, l]) => <option key={v} value={v} disabled={v === "active" || v === "past_due" || v === "trial"}>{l}</option>)}</Select></td>
                <td className="pr-2">{u.subscription === "none" || u.subscription === "trial" ? <span className="text-muted" title={t("Aucun forfait : choisissez d'abord un abonnement", "No plan: choose a subscription first")}>—</span> : <Select className="min-w-[8.5rem]" value={u.plan ?? "creer"} onChange={(e) => act(u.id, { plan: e.target.value })} aria-label={t(`Forfait de ${u.email}`, `Plan of ${u.email}`)}>{PLAN_IDS.map((id) => <option key={id} value={id}>{t(PLANS[id].name.fr, PLANS[id].name.en)}</option>)}</Select>}</td>
                <td className="whitespace-nowrap pr-2 text-xs">{ago(u.lastActive)}<span className="block text-muted">{t(`${u.jobs30} création${u.jobs30 > 1 ? "s" : ""} en 30 j`, `${u.jobs30} creation${u.jobs30 > 1 ? "s" : ""} in 30 d`)}</span></td>
                <td className="pr-2 tabular-nums">{pctTxt(lang, Math.round(u.usedPct * 100))}<span className="block text-xs text-muted">{t(`reste ${eur2(u.availableEur)} · IA ${eur2(u.aiCost30Eur)}`, `${eur2(u.availableEur)} left · AI ${eur2(u.aiCost30Eur)}`)}</span></td>
                <td className="pr-2 tabular-nums">{eur2(u.paidEur)}</td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <Button size="sm" variant="ghost" className="whitespace-nowrap" icon={<KeyRound className="size-3.5" />} onClick={() => setCredit({ user: u, value: "10" })}>{t("Budget IA", "AI budget")}</Button>
                    <Button size="sm" variant="ghost" className="whitespace-nowrap" icon={<Link2 className="size-3.5" />} onClick={() => resetLink(u)}>{t("Lien mot de passe", "Password link")}</Button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="py-6 text-center text-muted">{t("Aucun client dans cette catégorie.", "No customers in this category.")}</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">{t("« Offert (manuel) » active le forfait choisi sans paiement en ligne (quotas du forfait compris). « Payant » et « Impayé » sont pilotés par Stripe. « Payé » : total encaissé depuis l'inscription. « Budget IA » : garde-fou interne de dépense, jamais montré au client. « Lien mot de passe » : lien de réinitialisation valable 1 heure, à transmettre au client.", "\u201cComplimentary (manual)\u201d activates the chosen plan without online payment (plan quotas included). \u201cPaid\u201d and \u201cUnpaid\u201d are managed by Stripe. \u201cPaid\u201d column: total collected since sign-up. \u201cAI budget\u201d: internal spending safeguard, never shown to the customer. \u201cPassword link\u201d: reset link valid for 1 hour, to send to the customer.")}</p>
      <Modal open={!!credit} onClose={() => setCredit(null)} title={t("Ajuster le budget IA", "Adjust the AI budget")}>
        {credit && (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); const n = Number(credit.value.replace(",", ".")); if (!credit.value.trim() || isNaN(n) || n >= 0) return; act(credit.user.id, { creditEur: n, note: t("Ajustement du budget IA par l'administration", "AI budget adjusted by the admin") }); setCredit(null); }}>
            <p className="text-sm text-ink-2">{t(`Compte : ${credit.user.email}. Ce budget interne protège la marge ; le client ne le voit jamais (il voit ses quotas).`, `Account: ${credit.user.email}. This internal budget protects the margin; the customer never sees it (they see their quotas).`)}</p>
            <label className="grid gap-1.5 text-sm font-medium">{t("Montant à retirer, en euros (nombre négatif). Le budget ne peut pas être augmenté à la main : il vaut 40 % du prix HT du forfait, plus 50 % du HT des packs payés.", "Amount to remove, in euros (negative number). The budget can't be raised by hand: it is 40% of the plan's net price, plus 50% of the net price of paid packs.")}<Input value={credit.value} onChange={(e) => setCredit({ ...credit, value: e.target.value })} inputMode="decimal" autoFocus /></label>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setCredit(null)}>{t("Annuler", "Cancel")}</Button><Button type="submit">{t("Appliquer", "Apply")}</Button></div>
          </form>
        )}
      </Modal>
      <Modal open={!!reset} onClose={() => setReset(null)} title={t("Lien de réinitialisation", "Reset link")}>
        {reset && (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 text-sm">
            <p className="break-words text-ink-2">{t(`Pour ${reset.user.email}. Valable 1 heure, utilisable une seule fois ; les liens précédents sont annulés. Après le changement, toutes les sessions du compte sont fermées.`, `For ${reset.user.email}. Valid for 1 hour, single use; previous links are canceled. After the change, all the account's sessions are closed.`)}</p>
            {reset.loading ? <div className="skeleton h-10 rounded-xl" /> : reset.url && <CopyLine value={reset.url} />}
            <p className="text-xs text-muted">{t("Transmettez-le au client par un canal sûr (e-mail à son adresse de compte, par exemple).", "Send it to the customer through a safe channel (e.g. email to their account address).")}</p>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function Usage({ data }: { data: Overview }) {
  const t = useT();
  const { lang } = useLang();
  const cost = data.usage.reduce((s, u) => s + u.costEur, 0);
  const billed = data.usage.reduce((s, u) => s + u.billedEur, 0);
  const rev = data.revenue.reduce((s, r) => s + r.cents, 0) / 100;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted">{t("Coût fournisseurs (30 j)", "Provider cost (30 d)")}</p><p className="mt-1 font-display text-3xl font-semibold">{euro(lang, cost)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">{t("Débité des enveloppes (30 j)", "Charged to allowances (30 d)")}</p><p className="mt-1 font-display text-3xl font-semibold">{euro(lang, billed)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">{t("Encaissements Stripe (30 j)", "Stripe collections (30 d)")}</p><p className="mt-1 font-display text-3xl font-semibold">{euro(lang, rev)}</p></Card>
      </div>
      <Card className="overflow-x-auto p-5">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="py-2">{t("Fournisseur / modèle", "Provider / model")}</th><th>{t("Unité", "Unit")}</th><th>{t("Appels", "Calls")}</th><th>{t("Entrée", "Input")}</th><th>{t("Sortie / quantité", "Output / quantity")}</th><th>{t("Coût", "Cost")}</th><th>{t("Débité", "Charged")}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.usage.length === 0 && <tr><td colSpan={7} className="py-4 text-muted">{t("Aucune consommation sur 30 jours.", "No usage over the last 30 days.")}</td></tr>}
            {data.usage.map((u, i) => (
              <tr key={i}>
                <td className="py-2 font-mono text-xs">{u.provider}:{u.model}</td>
                <td>{u.unit}{u.est ? <Badge tone="warn" className="ml-1">{t("estimé", "estimated")}</Badge> : null}</td>
                <td>{num(lang, u.calls)}</td>
                <td className="tabular-nums">{num(lang, u.inp) ?? "—"}</td>
                <td className="tabular-nums">{num(lang, u.unit === "tokens" ? u.out : u.q) ?? "—"}</td>
                <td className="tabular-nums">{euro(lang, u.costEur)}</td>
                <td className="tabular-nums">{euro(lang, u.billedEur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function Health({ data, reload }: { data: Overview; reload: () => void }) {
  const t = useT();
  const toast = useToast();
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Card className="min-w-0 p-5">
          <p className="text-xs text-muted">{t("Processus de tâches (worker)", "Task process (worker)")}</p>
          {data.worker ? (
            <p className="mt-1 flex items-center gap-2 font-medium">{data.worker.alive ? <Badge tone="ok" dot>{t("En marche", "Running")}</Badge> : <Badge tone="bad" dot>{t("Arrêté", "Stopped")}</Badge>} {t("dernier signal", "last heartbeat")} {formatDate(data.worker.lastBeat, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
          ) : <p className="mt-1"><Badge tone="bad" dot>{t("Jamais démarré", "Never started")}</Badge> <span className="text-sm">{t("lancez « npm run worker »", "run \u201cnpm run worker\u201d")}</span></p>}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted">{t("File de tâches", "Task queue")}</p>
          <div className="mt-2 flex flex-wrap gap-2">{data.queue.map((q) => <Badge key={q.status} tone={q.status === "failed" ? "bad" : q.status === "running" ? "info" : "neutral"}>{q.status}{t(" : ", ": ")}{q.n}</Badge>)}</div>
        </Card>
      </div>
      <Card className="p-5">
        <p className="font-display text-lg font-semibold">{t("Tâches en échec", "Failed tasks")}</p>
        <ul className="mt-2 divide-y divide-line text-sm">
          {data.failedJobs.length === 0 && <li className="py-2 text-muted">{t("Aucune.", "None.")}</li>}
          {data.failedJobs.map((j) => (
            <li key={j.id} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0"><span className="font-mono text-xs">{j.type}</span> · {t(`${j.attempts} essai(s)`, `${j.attempts} attempt${j.attempts > 1 ? "s" : ""}`)}<span className="block break-words text-xs text-bad">{j.error}</span></span>
              <Button size="sm" variant="ghost" onClick={async () => { try { await api(`/api/jobs/${j.id}`, { body: { action: "retry" } }); toast("ok", t("Relancée.", "Retried.")); reload(); } catch (e) { toast("bad", (e as Error).message); } }}>{t("Relancer", "Retry")}</Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <p className="font-display text-lg font-semibold">{t("Journal d'erreurs", "Error log")}</p>
        <ul className="mt-2 divide-y divide-line text-sm">
          {data.errors.length === 0 && <li className="py-2 text-muted">{t("Aucune erreur.", "No errors.")}</li>}
          {data.errors.map((e) => (
            <li key={e.id} className="py-2"><span className="font-mono text-xs">{e.scope}</span> <span className="text-xs text-muted">{formatDate(e.created_at)}</span><span className="block break-words text-xs">{e.message}</span></li>
          ))}
        </ul>
      </Card>
    </>
  );
}
