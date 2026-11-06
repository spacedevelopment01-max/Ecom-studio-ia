"use client";
/**
 * SINA agent (#492) : LE fil unique du projet. Discussion libre, pièces jointes (photos, vidéos, documents), actions
 * dans tous les modules, accords pour les actions sensibles et hors budget, changements vérifiés par module.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, cx, Textarea } from "../ui";
import { useT } from "../i18n";
import { useOptionalProject } from "./project-context";

type Msg = { id: string; seq: number; role: "user" | "assistant" | "tool" | "event"; runId: string | null; content: any; createdAt: number };
type View = {
  conversationId: string; projectId: string | null; messages: Msg[];
  run: { id: string; status: string; step: number; pending: any; error: string | null } | null;
  budget: { authorizedPct: number | null; spentPct: number | null };
  attachments: { id: string; kind: string; name: string; analysis: any }[];
  journey?: { current: number; mode: "creation" | "refonte"; keep: string[]; steps: { n: number; fr: string; en: string; status: "todo" | "doing" | "review" | "done" | "skipped" }[] };
};
const WORKING = ["queued", "running", "waiting_jobs"];

/** Frise du chantier : les étapes 0 à 13 du parcours de création, leur état, l'étape en cours. */
function JourneyBar({ journey, compact }: { journey: NonNullable<View["journey"]>; compact: boolean }) {
  const t = useT();
  const label = { todo: t("à faire", "to do"), doing: t("en cours", "in progress"), review: t("à valider", "to approve"), done: t("validée", "approved"), skipped: t("sans objet", "not needed") };
  const cur = journey.steps.find((s) => s.n === journey.current);
  return (
    <div className="border-b border-line px-3 py-2" data-syna-journey>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{t("Étape", "Step")} {journey.current} · {cur ? t(cur.fr, cur.en) : ""}</span>
        {journey.mode === "refonte" && <span className="text-muted">{t("Refonte · gardé tel quel", "Redesign · kept as is")} : {journey.keep.join(", ")}</span>}
      </div>
      <ol className={cx("mt-1.5 flex gap-1", compact ? "" : "sm:gap-1.5")} aria-label={t("Étapes du parcours", "Journey steps")}>
        {journey.steps.map((s) => (
          <li key={s.n} className="min-w-0 flex-1" title={`${s.n}. ${t(s.fr, s.en)} — ${label[s.status]}`} data-step={s.n} data-status={s.status}>
            <span className={cx("block h-1.5 rounded-full",
              s.status === "done" ? "bg-ink" : s.status === "doing" ? "bg-signal" : s.status === "review" ? "bg-warn" : s.status === "skipped" ? "bg-line opacity-50" : "bg-line")} />
            <span className="sr-only">{s.n}. {t(s.fr, s.en)} : {label[s.status]}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
const ACCEPT = "image/*,video/mp4,video/quicktime,video/webm,application/pdf,.docx,.txt,.md,.csv";

export function SynaThread({ projectId, compact = false, subscriptionKey }: { projectId: string | null; compact?: boolean; subscriptionKey?: string }) {
  const t = useT(), router = useRouter(), project = useOptionalProject();
  const [v, setV] = useState<View | null>(null);
  const [text, setText] = useState(""), [files, setFiles] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [budgetEdit, setBudgetEdit] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null), lastRun = useRef<string>("");

  const load = useCallback(async () => {
    const view = await api<View>("/api/syna/open", { body: { projectId, ...(projectId ? {} : subscriptionKey ? { subscriptionKey } : {}) } });
    setV(view);
  }, [projectId, subscriptionKey]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  // Suivi de l'exécution : relecture régulière tant que SINA travaille, puis rafraîchissement des onglets du Studio.
  const working = !!v?.run && WORKING.includes(v.run.status);
  useEffect(() => {
    if (!v) return;
    if (!working) {
      if (lastRun.current && lastRun.current === v.run?.id) { lastRun.current = ""; project?.reload?.(); if (v.projectId && v.projectId !== projectId) router.push(`/studio/${v.projectId}/pilote`); router.refresh(); }
      return;
    }
    lastRun.current = v.run!.id;
    const h = setTimeout(() => api<View>(`/api/syna/${v.conversationId}`).then(setV).catch(() => undefined), 1800);
    return () => clearTimeout(h);
  }, [v, working, project, router, projectId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [v?.messages.length]);

  async function send(message?: string) {
    const body = (message ?? text).trim();
    if (!v || !body || busy) return;
    setBusy(true); setError("");
    try {
      const next = await api<View>(`/api/syna/${v.conversationId}`, { body: { requestId: crypto.randomUUID(), text: body, attachmentIds: message ? [] : files.map((f) => f.id) } });
      setV(next); if (!message) { setText(""); setFiles([]); }
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function attach(list: FileList | null) {
    if (!v || !list?.length) return;
    setBusy(true); setError("");
    try {
      for (const f of Array.from(list)) {
        const form = new FormData(); form.append("file", f);
        const a = await api<{ id: string; kind: string; name: string }>(`/api/syna/${v.conversationId}/attachments`, { form });
        setFiles((x) => [...x, a]);
      }
    } catch (e: any) { setError(e.message); } finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  async function decide(pendingId: string, approve: boolean) {
    if (!v) return; setBusy(true);
    try { setV(await api<View>(`/api/syna/${v.conversationId}/decision`, { body: { pendingId, approve } })); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function saveBudget() {
    if (!v || budgetEdit == null) return;
    try { setV(await api<View>(`/api/syna/${v.conversationId}/budget`, { body: { pct: Number(budgetEdit.replace(",", ".")) } })); setBudgetEdit(null); } catch (e: any) { setError(e.message); }
  }
  async function stop() { if (v) setV(await api<View>(`/api/syna/${v.conversationId}/stop`, { body: {} })); }

  // Les résultats d'outils d'une même exécution sont regroupés sous la réponse de SINA, par module.
  const items = useMemo(() => groupThread(v?.messages ?? []), [v?.messages]);
  if (!v) return <div className="p-4 text-sm text-muted">{error || t("Ouverture du fil SINA…", "Opening SINA thread…")}</div>;
  const pending = v.run?.status === "waiting_confirmation" ? v.run.pending : null;

  return (
    <div className={cx("flex h-full min-h-0 flex-col", compact ? "text-sm" : "")} data-syna-thread>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs text-muted">
        {budgetEdit == null
          ? <button type="button" className="underline-offset-2 hover:underline" onClick={() => setBudgetEdit(String(v.budget.authorizedPct ?? 10))} data-syna-budget>
              {t("Budget autorisé", "Authorised budget")} : {fmt(v.budget.authorizedPct)} % · {t("engagé", "used")} {fmt(v.budget.spentPct)} %
            </button>
          : <span className="flex items-center gap-1">{t("Budget autorisé (%)", "Authorised budget (%)")}<input className="w-14 rounded border border-line bg-card px-1" value={budgetEdit} onChange={(e) => setBudgetEdit(e.target.value)} inputMode="decimal" aria-label={t("Budget autorisé en pourcentage", "Authorised budget in percent")} /><Button size="sm" variant="secondary" onClick={saveBudget}>OK</Button></span>}
        {working && <Button size="sm" variant="ghost" onClick={stop}>{t("Arrêter", "Stop")}</Button>}
      </div>
      {v.journey && <JourneyBar journey={v.journey} compact={compact} />}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
        {!items.length && <p className="text-muted">{t("Décrivez votre objectif, joignez une photo, une vidéo ou un document : SINA choisit les outils du Studio, les enchaîne et vous montre ce qui a changé.", "Describe your goal or attach a photo, video or document.")}</p>}
        {items.map((it) => it.kind === "user"
          ? <div key={it.m.id} className="ml-6 rounded-2xl bg-ink px-3 py-2 text-paper" data-syna-user>
              <p className="whitespace-pre-wrap">{it.m.content.text}</p>
              {!!it.m.content.attachments?.length && <p className="mt-1 text-xs opacity-80">📎 {it.m.content.attachments.map((aid: string) => v.attachments.find((a) => a.id === aid)?.name ?? aid).join(", ")}</p>}
            </div>
          : it.kind === "assistant"
          ? <div key={it.m.id} className="mr-4 space-y-2" data-syna-assistant>
              {!!it.m.content.message && <div className="rounded-2xl border border-line bg-card px-3 py-2"><p className="whitespace-pre-wrap">{it.m.content.message}</p></div>}
              {it.m.content.question && <div className="rounded-xl border border-accent/40 bg-paper-2 px-3 py-2" data-syna-question>
                <p className="font-medium">{it.m.content.question.text}</p>
                {!!it.m.content.question.choices?.length && <div className="mt-2 flex flex-wrap gap-2">{it.m.content.question.choices.map((c: string) => <Button key={c} size="sm" variant="secondary" disabled={busy || working} onClick={() => send(c)}>{c}</Button>)}</div>}
              </div>}
              {it.tools.map((tm) => <ToolResult key={tm.id} m={tm} projectId={v.projectId} onChoose={(n) => send(t(`Je choisis la maquette ${n}.`, `I choose mockup ${n}.`))} busy={busy || working} />)}
            </div>
          : <EventLine key={it.m.id} m={it.m} />)}
        {pending && <div className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-ink dark:bg-amber-950/30" data-syna-confirmation>
          <p className="font-medium">{pending.reason === "budget" ? t("Dépense au-delà du budget autorisé", "Spending beyond the authorised budget") : t("Action à confirmer", "Action to confirm")}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{pending.preview}</p>
          {pending.tool === "budget.raise"
            ? <p className="mt-2 text-xs">{t("Augmentez le budget autorisé ci-dessus, puis demandez à SINA de continuer.", "Raise the budget above, then ask SINA to continue.")}</p>
            : <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => decide(pending.id, true)} disabled={busy}>{t("Confirmer", "Confirm")}</Button><Button size="sm" variant="secondary" onClick={() => decide(pending.id, false)} disabled={busy}>{t("Refuser", "Decline")}</Button></div>}
        </div>}
        {working && <p className="text-xs text-muted" data-syna-working>{v.run?.status === "waiting_jobs" ? t("SINA attend la fin d'une création (images, vidéo ou site) puis reprend seule…", "SINA is waiting for a creation to finish…") : t("SINA travaille…", "SINA is working…")}</p>}
        {v.run?.status === "failed" && <p className="text-xs text-red-600">{t("L'exécution s'est arrêtée : ", "The run stopped: ")}{v.run.error}</p>}
        <div ref={end} />
      </div>

      <div className="border-t border-line p-3">
        {!!files.length && <div className="mb-2 flex flex-wrap gap-1">{files.map((f) => <span key={f.id} className="rounded-full border border-line px-2 py-0.5 text-xs">{f.kind === "video" ? "🎬" : f.kind === "image" ? "🖼" : "📄"} {f.name} <button type="button" aria-label={t("Retirer", "Remove")} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>×</button></span>)}</div>}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={compact ? 3 : 4} maxLength={8000} placeholder={t("Votre demande, même avec plusieurs modifications…", "Your request, even with several changes…")} aria-label={t("Message à SINA", "Message to SINA")}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <input ref={fileInput} type="file" accept={ACCEPT} multiple className="sr-only" aria-label={t("Joindre des fichiers", "Attach files")} onChange={(e) => attach(e.target.files)} />
          <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()} disabled={busy}>📎 {t("Photo, vidéo, document", "Photo, video, document")}</Button>
          <Button size="sm" onClick={() => send()} disabled={busy || working || !text.trim()}>{t("Envoyer", "Send")}</Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
      </div>
    </div>
  );
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : n < 1 ? n.toFixed(2).replace(".", ",") : String(Math.round(n * 10) / 10).replace(".", ","));

type Item = { kind: "user" | "event"; m: Msg } | { kind: "assistant"; m: Msg; tools: Msg[] };
function groupThread(ms: Msg[]): Item[] {
  const out: Item[] = [];
  for (const m of ms) {
    if (m.role === "tool") { const last = [...out].reverse().find((x) => x.kind === "assistant") as any; if (last) last.tools.push(m); continue; }
    if (m.role === "assistant") { out.push({ kind: "assistant", m, tools: [] }); continue; }
    if (m.role === "event" && !["error", "stopped", "waiting_jobs"].includes(m.content.kind)) continue;
    out.push({ kind: m.role === "user" ? "user" : "event", m });
  }
  return out;
}

const READ_TOOLS = /^(site\.outline|site\.versions|catalogue\.list|ads\.list|posts\.list|brand\.read|files\.list|videos\.list|bookings\.(services|list)|pilot\.state|strategy\.read|jobs\.status|attachment\.read)$/;

function ToolResult({ m, projectId, onChoose, busy }: { m: Msg; projectId: string | null; onChoose: (n: number) => void; busy: boolean }) {
  const t = useT(), c = m.content;
  if (READ_TOOLS.test(c.tool) && c.ok) return <p className="text-xs text-muted" data-syna-read={c.tool}>🔎 {c.summary}</p>;
  const mockups: any[] | undefined = c.data?.mockups;
  const changes: any[] = c.changes ?? [];
  return (
    <div className={cx("rounded-xl border px-3 py-2 text-sm", c.ok ? "border-line bg-paper-2" : "border-red-300 bg-red-50 dark:bg-red-950/30")} data-syna-tool={c.tool} data-syna-ok={c.ok ? "1" : "0"}>
      <p className={cx("text-xs font-medium", c.ok ? "text-muted" : "text-red-700")}>{c.ok ? "✓" : "✕"} {c.summary}</p>
      {!!changes.length && <ul className="mt-1 space-y-0.5 text-xs">{changes.map((x, i) => <li key={i} data-syna-change={x.module}><b className="font-semibold">{x.module}</b> · {x.object} — {x.summary}{x.verified ? " ✓" : ` (${t("non vérifié", "not verified")})`}</li>)}</ul>}
      {mockups && projectId && <div className="mt-2 grid grid-cols-1 gap-2" data-syna-mockups>{mockups.filter((x) => x.versionId).map((x) => (
        <div key={x.versionId} className="overflow-hidden rounded-lg border border-line bg-card">
          <div className="relative h-40 overflow-hidden"><iframe title={x.name} src={x.preview} className="pointer-events-none absolute left-0 top-0 h-[640px] w-[1280px] origin-top-left scale-[0.25]" loading="lazy" /></div>
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs"><span>{x.n}. {x.name}</span><span className="flex gap-1"><a className="underline" href={x.preview} target="_blank" rel="noreferrer">{t("Voir", "View")}</a><Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.n)}>{t("Choisir", "Choose")}</Button></span></div>
        </div>))}</div>}
      {mockups && mockups.some((x) => x.href && !x.versionId) && <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3" data-syna-mockup-images>{mockups.filter((x) => x.href && !x.versionId).map((x) => (
        <div key={x.assetId} className="overflow-hidden rounded-lg border border-line bg-card">
          <a href={x.href} target="_blank" rel="noreferrer"><img src={x.href} alt={`${t("Maquette", "Mockup")} ${x.n} — ${x.direction}`} className="h-56 w-full object-cover object-top" loading="lazy" /></a>
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs"><span>{x.n}. {x.direction}</span><span className="flex gap-1"><a className="underline" href={x.href} target="_blank" rel="noreferrer">{t("Agrandir", "Enlarge")}</a><Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.n)}>{t("Choisir", "Choose")}</Button></span></div>
        </div>))}</div>}
      {c.data?.preview && !mockups && <a className="mt-1 inline-block text-xs underline" href={c.data.preview} target="_blank" rel="noreferrer">{t("Voir l'aperçu", "Open preview")}</a>}
      {c.data?.href && <a className="mt-1 inline-block text-xs underline" href={c.data.href} data-syna-download>{t("Télécharger", "Download")} {c.data.name ?? ""}</a>}
    </div>
  );
}

function EventLine({ m }: { m: Msg }) {
  const t = useT(), c = m.content;
  if (c.kind === "error") return <p className="text-xs text-red-600">{t("Erreur : ", "Error: ")}{c.message}</p>;
  if (c.kind === "stopped") return <p className="text-xs text-muted">{t("Arrêté à votre demande.", "Stopped.")}</p>;
  if (c.kind === "waiting_jobs") return <p className="text-xs text-muted">⏳ {t("Création lancée en arrière-plan ; SINA reprendra seule.", "Creation running in the background; SINA will resume.")}</p>;
  return null;
}
