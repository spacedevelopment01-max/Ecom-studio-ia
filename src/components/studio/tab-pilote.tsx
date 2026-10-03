"use client";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, Circle, Loader2, Palette, Pause, Play, RotateCcw, SkipForward, Store, X, Brain, Trash2, Plus } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, formatDate, Input, Progress, Select, Textarea, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { EngineNotice, SectionTitle } from "./common";
import { StartCreation } from "./start-creation";

function StepIcon({ status }: { status: string }) {
  if (status === "done") return <span className="grid size-7 place-items-center rounded-full bg-ok text-white"><Check className="size-4" /></span>;
  if (status === "running") return <span className="grid size-7 place-items-center rounded-full bg-signal text-signal-ink"><Loader2 className="size-4 animate-spin" /></span>;
  if (status === "failed") return <span className="grid size-7 place-items-center rounded-full bg-bad text-white"><X className="size-4" /></span>;
  if (status === "paused") return <span className="grid size-7 place-items-center rounded-full bg-warn-soft text-warn"><Pause className="size-3.5" /></span>;
  if (status === "skipped") return <span className="grid size-7 place-items-center rounded-full bg-paper-2 text-muted"><SkipForward className="size-3.5" /></span>;
  return <span className="grid size-7 place-items-center rounded-full border border-line text-muted"><Circle className="size-2.5" /></span>;
}

function Questions() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const open = (data?.product.questions ?? []).filter((q) => !q.answer);
  if (!open.length) return null;
  async function save() {
    const list = Object.entries(answers).filter(([, v]) => v.trim()).map(([id, answer]) => ({ id, answer }));
    if (!list.length) return;
    setBusy(true);
    try {
      const r = await api<{ themeUpdated: boolean; postsUpdated: number }>(`/api/projects/${id}/product`, { method: "PATCH", body: { answers: list } });
      toast("ok", `Merci. ${r.themeUpdated ? "La boutique a été complétée. " : ""}${r.postsUpdated ? `${r.postsUpdated} publication(s) mise(s) à jour.` : ""}`.trim());
      setAnswers({});
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle title="Quelques questions indispensables">Ces informations ne se déduisent pas d'une photo. Tant qu'elles manquent, elles restent « à compléter » dans vos textes : rien n'est inventé.</SectionTitle>
      <div className="grid gap-4">
        {open.map((q) => (
          <div key={q.id} className="grid gap-1.5">
            <label htmlFor={`q-${q.id}`} className="flex items-center gap-2 text-sm font-medium">
              {q.question} {q.required && <Badge tone="signal">indispensable</Badge>}
            </label>
            <p className="text-xs text-muted">{q.why}</p>
            <Input id={`q-${q.id}`} value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Votre réponse" />
          </div>
        ))}
      </div>
      <Button className="mt-5" onClick={save} loading={busy}>Enregistrer mes réponses</Button>
    </Card>
  );
}

function Memory() {
  const { id } = useProject();
  const toast = useToast();
  const { data, reload } = useApi<{ items: { id: string; kind: string; key: string; value: string; status: string; source: string; scope: string; updated_at: number }[] }>(`/api/projects/${id}/memory`);
  const [form, setForm] = useState({ kind: "preference", key: "", value: "", scope: "all" });
  const items = (data?.items ?? []).filter((m) => m.kind !== "fact");
  const KIND: Record<string, string> = { decision: "Décision", correction: "Correction", preference: "Préférence", goal: "Objectif" };
  return (
    <Card className="p-5 sm:p-6">
      <SectionTitle title="Mémoire du projet">Décisions, corrections et préférences que l'IA respecte dans toutes les créations suivantes.</SectionTitle>
      <ul className="grid gap-2">
        {items.map((m) => (
          <li key={m.id} className="flex items-start gap-3 rounded-2xl border border-line p-3 text-sm">
            <Brain className="mt-0.5 size-4 shrink-0 text-signal" />
            <div className="min-w-0 flex-1">
              <p><Badge tone="neutral">{KIND[m.kind] ?? m.kind}</Badge> <span className="font-medium">{m.key}</span></p>
              <p className="mt-1 break-words text-ink-2">{m.value}</p>
            </div>
            <button onClick={async () => { await api(`/api/projects/${id}/memory?item=${m.id}`, { method: "DELETE" }); reload(); }} className="grid size-8 place-items-center rounded-full hover:bg-paper-2" aria-label="Oublier"><Trash2 className="size-4 text-muted" /></button>
          </li>
        ))}
        {!items.length && <li className="text-sm text-muted">Rien encore. Vos corrections dans la boutique ou la marque s'ajouteront ici automatiquement.</li>}
      </ul>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[150px_1fr]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!form.key || !form.value) return;
          try {
            await api(`/api/projects/${id}/memory`, { body: form });
            setForm({ ...form, key: "", value: "" });
            reload();
            toast("ok", "Ajouté à la mémoire du projet.");
          } catch (err) {
            toast("bad", (err as Error).message);
          }
        }}
      >
        <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="Type">
          <option value="preference">Préférence</option>
          <option value="correction">Correction</option>
          <option value="decision">Décision</option>
          <option value="goal">Objectif</option>
        </Select>
        <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="Sujet (ex. ton des légendes)" />
        <Textarea value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Ce qu'il faut retenir (ex. jamais d'emoji, vouvoyer)" className="sm:col-span-2" rows={2} />
        <Button type="submit" variant="secondary" icon={<Plus className="size-4" />} className="justify-self-start">Ajouter</Button>
      </form>
    </Card>
  );
}

export default function TabPilote() {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return null;
  const pl = data.pipeline;
  const running = pl && (pl.job.status === "running" || pl.job.status === "queued");
  const awaiting = data.project.status === "awaiting_validation";
  const paused = pl?.job.status === "paused" || data.project.status === "paused";
  const failed = !paused && (pl?.job.status === "failed" || data.project.status === "error");
  async function pause(action: "pause" | "resume") {
    setBusy(action);
    try {
      await api(`/api/projects/${id}/pause`, { body: { action } });
      toast("ok", action === "pause" ? "Pause demandée : l'étape en cours s'arrête proprement, le travail fait est conservé." : "La création reprend là où elle s'était arrêtée.");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function resume(from?: string) {
    setBusy(from ?? "resume");
    try {
      await api(`/api/projects/${id}/resume`, { body: { from } });
      toast("ok", "La création reprend.");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const done = pl?.steps.filter((s) => s.status === "done" || s.status === "skipped").length ?? 0;
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <EngineNotice what="l'analyse, la marque et les textes" />
      {!pl && <StartCreation />}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Avancement de la création</p>
              <p className="mt-1 font-display text-3xl font-semibold">{pl ? `${done} / ${pl.steps.length} étapes` : "Aucune création lancée"}</p>
            </div>
            {running && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<Pause className="size-4" />} loading={busy === "pause"} onClick={() => pause("pause")}>Mettre en pause</Button>
                <Button variant="ghost" size="sm" onClick={async () => { if (!confirm("Arrêter définitivement cette création ? (La pause permet de reprendre plus tard.)")) return; await api(`/api/jobs/${pl!.job.id}`, { body: { action: "cancel" } }); reload(); }}>Arrêter</Button>
              </div>
            )}
            {paused && <Button size="sm" icon={<Play className="size-4" />} loading={busy === "resume"} onClick={() => pause("resume")}>Reprendre</Button>}
          </div>
          {pl && <Progress value={running ? pl.job.progress : done / pl.steps.length} className="mt-4" />}
          {running && <p className="mt-3 text-sm text-ink-2" role="status">{pl!.job.message}</p>}
          {paused && (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-warn-soft p-4 text-sm text-warn" role="status">
              <Pause className="size-4 shrink-0" /> Création en pause. Les étapes terminées sont conservées ; la reprise repart de l'étape interrompue.
            </p>
          )}
          {failed && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-bad-soft p-4 text-sm text-bad">
              <AlertTriangle className="size-5" />
              <span className="flex-1">{pl?.job.error ?? "Une étape a échoué."} Le travail déjà réalisé est conservé.</span>
              <Button size="sm" variant="danger" icon={<RotateCcw className="size-4" />} loading={busy === "retry"} onClick={async () => { setBusy("retry"); await api(`/api/jobs/${pl!.job.id}`, { body: { action: "retry" } }); setBusy(null); reload(); }}>Reprendre où c'était</Button>
            </div>
          )}
          {awaiting && (
            <div className="mt-4 rounded-2xl border border-warn/40 bg-warn-soft p-4 text-sm">
              <p className="font-medium text-warn">Votre marque attend votre validation.</p>
              <p className="mt-1 text-ink-2">Vérifiez le nom, la palette et le logo. La suite (textes, images, vidéos, boutique, calendrier) partira de vos choix.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => resume("copy")} loading={busy === "copy"}>Valider et continuer</Button>
                <Link href={`/studio/${id}/marque`} className="inline-flex h-8 items-center rounded-full border border-line bg-card px-3 text-[13px]">Ajuster la marque</Link>
              </div>
            </div>
          )}
          <ol className="mt-6 grid gap-1">
            {(pl?.steps ?? []).map((s) => (
              <li key={s.id} className={cx("flex items-start gap-3 rounded-2xl p-2.5", s.status === "running" && "bg-signal-soft")}>
                <StepIcon status={s.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted">{s.note ?? s.detail}</p>
                </div>
                {(s.status === "done" || s.status === "failed") && !running && ["copy", "images", "video", "shop", "calendar"].includes(s.id) && (
                  <button onClick={() => resume(s.id)} disabled={!!busy} className="shrink-0 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-paper-2 hover:text-ink" title="Relancer à partir de cette étape (les étapes précédentes sont conservées)">
                    Relancer
                  </button>
                )}
              </li>
            ))}
          </ol>
        </Card>
        <div className="grid content-start gap-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-paper-2">
              {data.coverUrl ? <img src={data.coverUrl} alt="" className="size-full object-cover" /> : <div className="skeleton size-full" />}
              {data.logoUrl && <img src={data.logoUrl} alt="Logo" className="absolute bottom-3 left-3 h-10 max-w-[60%] rounded-xl bg-white/90 object-contain px-3 py-1.5" />}
            </div>
            <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
              {[
                ["Images", (data.counts.packshot ?? 0) + (data.counts.scene ?? 0) + (data.counts.detail ?? 0) + (data.counts.social ?? 0) + (data.counts.ad ?? 0) + (data.counts.banner ?? 0), "images"],
                ["Vidéos", data.counts.video ?? 0, "videos"],
                ["Publications", Object.values(data.posts).reduce((s, n) => s + n, 0), "publications"],
              ].map(([l, n, t]) => (
                <Link key={l as string} href={`/studio/${id}/${t}`} className="p-4 hover:bg-paper-2">
                  <p className="font-display text-2xl font-semibold">{n as number}</p>
                  <p className="text-xs text-muted">{l}</p>
                </Link>
              ))}
            </div>
          </Card>
          {data.theme ? (
            <Card className="p-5">
              <p className="text-sm text-muted">Boutique · version {data.theme.number}</p>
              <p className="mt-1 font-display text-xl">Direction « {data.theme.direction} »</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink-2">{data.theme.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/studio/${id}/boutique`} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">
                  <Store className="size-4" /> Ouvrir l'éditeur <ArrowRight className="size-4" />
                </Link>
                <Link href={`/studio/${id}/boutique?themes`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink">
                  <Palette className="size-4" /> Changer de thème
                </Link>
              </div>
            </Card>
          ) : (
            <Empty title="La boutique arrive" icon={<Store className="size-5" />}>Elle sera composée après la marque, les textes et les images.</Empty>
          )}
          {pl?.job.finishedAt && <p className="text-xs text-muted">Dernière exécution terminée le {formatDate(pl.job.finishedAt)}.</p>}
        </div>
      </div>
      <Questions />
      <Memory />
    </div>
  );
}
