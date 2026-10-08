"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, Circle, Clapperboard, FileText, FolderOpen, Loader2, Megaphone, Palette, RefreshCw, RotateCcw, SkipForward, Sparkles, Store, CalendarDays, X } from "lucide-react";
import { api, Badge, Button, Card, cx, Input, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useLang, useT } from "../i18n";
import { formatEur } from "../billing-client";

type Bi = { fr: string; en: string };
type Line = { kind: string; label: Bi; module: string; mode: "local" | "ai" | "search" | "done"; paid: boolean; estimateMicro: number; note?: string };
type Step = { kind: string; status: string; reason: string | null; verdict: string | null; note: string | null; attempts: number; label: Bi; module: string; tab: string; mode: string | null; spentMicro: number };
type Validation = { key: string; label: Bi; tab: string; count?: number };
type View = {
  workflow: { id: string; request: string; status: string; clarification: string | null; error: string | null; approvedMicro: number | null; capMicro: number | null; estimate: { lines: Line[]; totalMicro: number; aiActive: boolean; needsCreation: boolean }; createdAt: number };
  steps: Step[];
  job: { id: string; status: string; progress: number; message: string | null; error: string | null; attempts: number } | null;
  pipeline: { id: string; status: string; progress: number; message: string | null } | null;
  spentMicro: number;
  validations: Validation[];
};
type List = { workflows: (View | null)[]; validations: Validation[] };

const EXAMPLE: Bi = {
  fr: "Crée ma marque, mon logo, mes visuels, ma boutique Shopify, mes publicités et prépare mes publications Instagram pour les 30 prochains jours.",
  en: "Create my brand, my logo, my visuals, my Shopify store, my ads and prepare my Instagram posts for the next 30 days.",
};

/** Éditeurs du studio : tout reste modifiable à la main, gratuitement. */
export const EDITORS: { tab: string; icon: typeof Palette; label: Bi }[] = [
  { tab: "marque", icon: Palette, label: { fr: "Marque et logo", en: "Brand and logo" } },
  { tab: "boutique", icon: Store, label: { fr: "Boutique / site", en: "Store / website" } },
  { tab: "publicites", icon: Megaphone, label: { fr: "Publicités", en: "Ads" } },
  { tab: "videos", icon: Clapperboard, label: { fr: "Vidéos", en: "Videos" } },
  { tab: "produit", icon: FileText, label: { fr: "Textes et produit", en: "Copy and product" } },
  { tab: "calendrier", icon: CalendarDays, label: { fr: "Publications", en: "Posts" } },
  { tab: "fichiers", icon: FolderOpen, label: { fr: "Fichiers et dossiers", en: "Files and folders" } },
];

const eur = (micro: number, lang: "fr" | "en") => formatEur(Math.round(micro / 10_000) / 100, lang);

function StatusDot({ status }: { status: string }) {
  if (status === "done") return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ok text-white"><Check className="size-3.5" /></span>;
  if (status === "running") return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-signal text-signal-ink"><Loader2 className="size-3.5 animate-spin" /></span>;
  if (status === "failed" || status === "blocked") return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-bad text-white"><X className="size-3.5" /></span>;
  if (status === "skipped") return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-paper-2 text-muted"><SkipForward className="size-3" /></span>;
  return <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-muted"><Circle className="size-2" /></span>;
}

const STATUS: Record<string, Bi> = {
  draft: { fr: "Devis à accepter", en: "Estimate to accept" },
  needs_clarification: { fr: "Précision nécessaire", en: "Clarification needed" },
  queued: { fr: "En attente", en: "Queued" },
  running: { fr: "En cours", en: "Running" },
  done: { fr: "Terminé", en: "Done" },
  failed: { fr: "Échec", en: "Failed" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
};

function ModeBadge({ line }: { line: Line }) {
  const t = useT();
  if (line.mode === "done") return <Badge tone="ok">{t("déjà fait", "already done")}</Badge>;
  if (line.paid) return <Badge tone="signal">{t("IA payante", "paid AI")}</Badge>;
  return <Badge>{t("local, gratuit", "local, free")}</Badge>;
}

function Estimate({ view, onStarted }: { view: View; onStarted: () => void }) {
  const { id } = useProject();
  const { lang } = useLang();
  const t = useT();
  const toast = useToast();
  const wf = view.workflow;
  const total = wf.estimate.totalMicro;
  const [accept, setAccept] = useState(total === 0);
  const [cap, setCap] = useState(total ? String(Math.ceil(total / 1_000_000)) : "");
  const [busy, setBusy] = useState<string | null>(null);
  async function act(action: "start" | "cancel") {
    setBusy(action);
    try {
      const capEur = cap.trim() ? Number(cap.replace(",", ".")) : null;
      await api(`/api/projects/${id}/workflow/${wf.id}`, { body: action === "start" ? { action, approveMicro: total ? total : 0, capEur: total ? capEur : null } : { action } });
      toast("ok", action === "start" ? t("C'est parti : suivez l'avancement ci-dessous.", "Started: follow the progress below.") : t("Demande annulée. Rien n'a été dépensé.", "Request cancelled. Nothing was spent."));
      onStarted();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="grid gap-3">
      <ul className="grid gap-1.5" aria-label={t("Devis par module", "Estimate by module")}>
        {wf.estimate.lines.map((l, i) => (
          <li key={`${l.kind}-${i}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-line px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{l.label[lang]}</span> <span className="text-xs text-muted">· {l.module}</span>
              {l.note && <span className="mt-0.5 block text-xs text-muted">{l.note}</span>}
            </span>
            <span className="flex items-center gap-2"><ModeBadge line={l} /><span className="tabular-nums">{eur(l.estimateMicro, lang)}</span></span>
          </li>
        ))}
      </ul>
      <p className="flex items-baseline justify-between rounded-xl bg-paper-2 px-3 py-2 text-sm font-semibold">
        <span>{t("Total estimé", "Estimated total")}</span><span className="tabular-nums" data-testid="wf-total">{eur(total, lang)}</span>
      </p>
      {total > 0 ? (
        <div className="grid gap-3 rounded-2xl border border-signal/40 bg-signal-soft p-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1" />
            <span>{t(`J'autorise jusqu'à ${eur(total, lang)} d'IA pour cette demande. Au-delà, le studio s'arrête et me demande.`, `I authorize up to ${eur(total, lang)} of AI for this request. Beyond that, the studio stops and asks me.`)}</span>
          </label>
          <label className="grid gap-1 text-sm sm:max-w-xs">
            <span>{t("Plafond de dépense (€)", "Spending cap (€)")}</span>
            <Input inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value)} aria-label={t("Plafond de dépense en euros", "Spending cap in euros")} />
          </label>
        </div>
      ) : (
        <p className="text-sm text-muted">{t("Tout est fait par les moteurs locaux du studio : aucun coût d'IA.", "Everything is done by the studio's local engines: no AI cost.")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => act("start")} loading={busy === "start"} disabled={!accept} data-testid="wf-start">{total ? t("Accepter et lancer", "Accept and start") : t("Lancer", "Start")}</Button>
        <Button variant="ghost" onClick={() => act("cancel")} loading={busy === "cancel"}>{t("Annuler", "Cancel")}</Button>
      </div>
    </div>
  );
}

function Progression({ view, reload }: { view: View; reload: () => void }) {
  const { id } = useProject();
  const { lang } = useLang();
  const t = useT();
  const toast = useToast();
  const done = view.steps.filter((s) => s.status === "done" || s.status === "skipped").length;
  const failed = view.workflow.status === "failed" || view.job?.status === "failed" || view.job?.status === "blocked";
  async function retry() {
    if (!view.job) return;
    try {
      await api(`/api/jobs/${view.job.id}`, { body: { action: "retry" } });
      toast("ok", t("Nouvel essai : les étapes déjà réussies ne sont pas refaites.", "Retrying: steps already done are not redone."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  }
  return (
    <div className="grid gap-3">
      {view.pipeline && view.pipeline.status !== "done" && (
        <p className="rounded-xl bg-paper-2 px-3 py-2 text-sm">{t("Création de base en cours (marque, boutique, images) : la suite démarre ensuite d'elle-même.", "Base creation running (brand, store, images): the rest starts automatically afterwards.")} <span className="tabular-nums text-muted">{Math.round(view.pipeline.progress * 100)} %</span></p>
      )}
      {view.steps.length > 0 && <p className="text-sm text-muted">{t(`${done} / ${view.steps.length} étapes`, `${done} / ${view.steps.length} steps`)} · {t("dépensé", "spent")} <span className="tabular-nums" data-testid="wf-spent">{eur(view.spentMicro, lang)}</span>{view.workflow.capMicro != null && <> · {t("plafond", "cap")} {eur(view.workflow.capMicro, lang)}</>}</p>}
      <ol className="grid gap-1.5" data-testid="wf-steps">
        {view.steps.map((s, i) => (
          <li key={`${s.kind}-${i}`} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2">
            <StatusDot status={s.status} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{s.label[lang]}</span>
                {s.verdict && <Badge tone={s.verdict === "FINAL" ? "ok" : s.verdict === "REJECTED" ? "bad" : "warn"}>{s.verdict}</Badge>}
                {s.spentMicro > 0 && <span className="text-xs tabular-nums text-muted">{eur(s.spentMicro, lang)}</span>}
                {s.attempts > 1 && <span className="text-xs text-muted">{t(`${s.attempts} essais`, `${s.attempts} attempts`)}</span>}
              </p>
              {(s.reason || s.note) && <p className="mt-0.5 break-words text-xs text-muted">{s.reason ?? s.note}</p>}
            </div>
            <Link href={`/studio/${id}/${s.tab}`} className="shrink-0 text-xs font-medium underline underline-offset-4">{t("Ouvrir", "Open")}</Link>
          </li>
        ))}
      </ol>
      {view.job && (view.job.status === "running" || view.job.status === "queued") && <p className="flex items-center gap-2 text-sm text-ink-2" role="status"><Loader2 className="size-4 animate-spin" aria-hidden /> {view.job.message ?? t("En cours…", "Running…")}</p>}
      {failed && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad" role="alert">
          <AlertTriangle className="size-4 shrink-0" aria-hidden /> <span className="min-w-0 flex-1 break-words">{view.workflow.error ?? view.job?.error ?? t("Une étape a échoué.", "A step failed.")}</span>
          {view.job && <Button size="sm" variant="secondary" icon={<RotateCcw className="size-4" />} onClick={retry}>{t("Réessayer", "Retry")}</Button>}
        </div>
      )}
    </div>
  );
}

export function Validations({ list }: { list: Validation[] }) {
  const { id } = useProject();
  const { lang } = useLang();
  const t = useT();
  if (!list.length) return null;
  return (
    <div className="grid gap-2" data-testid="wf-validations">
      <p className="text-sm font-semibold">{t("À valider par vous", "Waiting for your approval")}</p>
      <ul className="grid gap-1.5">
        {list.map((v) => (
          <li key={v.key}>
            <Link href={`/studio/${id}/${v.tab}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm hover:border-ink">
              <span className="min-w-0">{v.label[lang]}</span>
              {v.count ? <Badge tone="signal">{v.count}</Badge> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorsHub() {
  const { id } = useProject();
  const { lang } = useLang();
  const t = useT();
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">{t("Modifier à la main (gratuit)", "Edit by hand (free)")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {EDITORS.map((e) => (
          <Link key={e.tab} href={`/studio/${id}/${e.tab}`} className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:border-ink">
            <e.icon className="size-4 shrink-0" aria-hidden /> <span className="min-w-0 truncate">{e.label[lang]}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Studio Workflow V2 : une seule demande, un plan, un devis, une autorisation, un suivi. */
export function WorkflowPanel() {
  const { id, reload: reloadProject } = useProject();
  const { lang } = useLang();
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<List>(`/api/projects/${id}/workflow`, { poll: 3000 });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const current = data?.workflows.find((w): w is View => !!w && w.workflow.status !== "cancelled") ?? null;
  async function prepare() {
    if (text.trim().length < 3) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/workflow`, { body: { text } });
      setText("");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const refresh = () => { reload(); reloadProject(); };
  const status = current?.workflow.status;
  return (
    <Card className="p-5 sm:p-7" data-testid="workflow-panel">
      <SectionTitle title={t("Que voulez-vous obtenir ?", "What do you want to get?")}>{t("Écrivez tout en une fois : le studio prépare le plan et le devis, puis enchaîne marque, visuels, boutique, publicités, vidéos et publications. Rien de payant ne part sans votre accord ; ce qui est déjà validé n'est pas refait.", "Write it all at once: the studio prepares the plan and the estimate, then chains brand, visuals, store, ads, videos and posts. Nothing paid starts without your approval; what is already validated is not redone.")}</SectionTitle>
      <div className="grid gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} placeholder={EXAMPLE[lang]} aria-label={t("Votre demande", "Your request")} data-testid="wf-request" />
        <div className="flex flex-wrap gap-2">
          <Button onClick={prepare} loading={busy} disabled={text.trim().length < 3} icon={<Sparkles className="size-4" />} data-testid="wf-prepare">{t("Préparer le plan et le devis", "Prepare the plan and estimate")}</Button>
          <Button variant="ghost" size="sm" onClick={() => setText(EXAMPLE[lang])}>{t("Utiliser l'exemple", "Use the example")}</Button>
        </div>
      </div>
      {current && (
        <div className="mt-6 grid gap-4 border-t border-line pt-5" data-testid="wf-current">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 flex-1 break-words text-sm italic text-ink-2">« {current.workflow.request} »</p>
            <span className="flex items-center gap-2">
              <Badge tone={status === "done" ? "ok" : status === "failed" ? "bad" : status === "draft" || status === "needs_clarification" ? "warn" : "signal"} dot>{STATUS[status!]?.[lang] ?? status}</Badge>
              <button type="button" onClick={refresh} aria-label={t("Actualiser", "Refresh")} className="grid size-8 place-items-center rounded-full hover:bg-paper-2"><RefreshCw className="size-4" /></button>
            </span>
          </div>
          {status === "needs_clarification" && <p className="rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn" role="alert">{current.workflow.clarification}</p>}
          {status === "draft" && <Estimate key={current.workflow.id} view={current} onStarted={refresh} />}
          {status !== "draft" && status !== "needs_clarification" && <Progression view={current} reload={refresh} />}
        </div>
      )}
      <div className="mt-6 grid gap-5 border-t border-line pt-5">
        <Validations list={current?.validations ?? data?.validations ?? []} />
        <EditorsHub />
      </div>
    </Card>
  );
}

/** Changement d'identité : quelles créations utilisent l'ancienne, et mise à jour contrôlée (locale, gratuite). */
export function BrandPropagationCard() {
  const { id, reload: reloadProject } = useProject();
  const t = useT();
  const toast = useToast();
  type Item = { key: string; kind: string; label: string; changes: string[]; userEdited: boolean; updatable: boolean; reapproval?: boolean };
  const { data, reload } = useApi<{ current: string; items: Item[] }>(`/api/projects/${id}/brand/impact`);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [includeEdited, setIncludeEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ updated: { key: string; detail: string }[]; skipped: { key: string; reason: string }[] } | null>(null);
  const items = data?.items ?? [];
  if (!items.length && !result) return null;
  const CH: Record<string, Bi> = { name: { fr: "nom", en: "name" }, palette: { fr: "couleurs", en: "colours" }, fonts: { fr: "typographies", en: "fonts" }, logo: { fr: "logo", en: "logo" } };
  const isOn = (it: Item) => picked[it.key] ?? (it.updatable && !it.userEdited);
  async function apply() {
    const keys = items.filter((it) => it.updatable && isOn(it)).map((it) => it.key);
    if (!keys.length) return;
    setBusy(true);
    try {
      const r = await api<{ updated: { key: string; detail: string }[]; skipped: { key: string; reason: string }[] }>(`/api/projects/${id}/brand/impact`, { body: { keys, includeEdited } });
      setResult(r);
      setPicked({});
      toast("ok", t(`${r.updated.length} création(s) mise(s) à jour (nouvelle version, l'ancienne reste disponible).`, `${r.updated.length} creation(s) updated (new version, the previous one stays available).`));
      reload();
      reloadProject();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-7" data-testid="brand-propagation">
      <SectionTitle title={t("Votre identité a changé", "Your identity has changed")}>{t("Ces créations utilisent encore l'ancienne identité. Cochez celles à mettre à jour : c'est gratuit, une nouvelle version est créée et l'ancienne reste disponible. Vos créations modifiées à la main ne sont pas touchées, sauf si vous le demandez.", "These creations still use the previous identity. Tick the ones to update: it's free, a new version is created and the previous one stays available. Creations you edited by hand are left alone unless you ask.")}</SectionTitle>
      <ul className="grid gap-1.5">
        {items.map((it) => (
          <li key={it.key} className="flex items-start gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <input type="checkbox" className="mt-1" aria-label={it.label} disabled={!it.updatable} checked={it.updatable && isOn(it)} onChange={(e) => setPicked({ ...picked, [it.key]: e.target.checked })} />
            <span className="min-w-0 flex-1">
              <span className="font-medium break-words">{it.label}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {t("Change :", "Changes:")} {it.changes.map((c) => t(CH[c]?.fr ?? c, CH[c]?.en ?? c)).join(", ")}
                {it.userEdited && <> · {t("modifiée par vous", "edited by you")}</>}
                {it.reapproval && <> · {t("demandera une nouvelle approbation", "will need approving again")}</>}
                {!it.updatable && <> · {t("à reprendre dans l'éditeur", "to redo in the editor")}</>}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {items.some((it) => it.userEdited) && (
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={includeEdited} onChange={(e) => setIncludeEdited(e.target.checked)} /> <span>{t("Mettre aussi à jour mes créations modifiées à la main", "Also update the creations I edited by hand")}</span></label>
      )}
      {items.length > 0 && <Button className="mt-4" onClick={apply} loading={busy} data-testid="brand-apply">{t("Mettre à jour la sélection", "Update the selection")}</Button>}
      {result && (
        <div className="mt-4 grid gap-1 text-sm" data-testid="brand-result">
          {result.updated.map((u) => <p key={u.key} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> <span className="break-words">{u.detail}</span></p>)}
          {result.skipped.map((s) => <p key={s.key} className="flex items-start gap-2 text-muted"><SkipForward className="mt-0.5 size-4 shrink-0" aria-hidden /> <span className="break-words">{s.reason}</span></p>)}
        </div>
      )}
    </Card>
  );
}
