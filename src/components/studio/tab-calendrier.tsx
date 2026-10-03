"use client";
import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Sparkles, Settings2 } from "lucide-react";
import { api, Button, Card, cx, Field, Input, Modal, Select, Textarea, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { JobProgress, useActive } from "./common";
import { NETWORKS, NetworkDot, POST_STATUS, PostEditor, type PostView } from "./post-editor";

type ViewMode = "month" | "week" | "day";

function PlanForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { id, data } = useProject();
  const toast = useToast();
  const tz = data?.settings.timezone ?? "Europe/Paris";
  const { data: conns } = useApi<{ connections: { id: string; provider: string; name: string; linked: boolean; status: string }[] }>(open ? `/api/connections?project=${id}` : null);
  const [f, setF] = useState({ startDate: format(addDays(new Date(), 1), "yyyy-MM-dd"), days: 7, perDay: 1, slots: ["11:30", "18:30", "08:30", "13:00", "21:00"], timezone: tz, goals: "", tone: "", photo: 60, video: 30, text: 10, link: "", approval: "manual" as "manual" | "auto" });
  const [nets, setNets] = useState<Record<string, string | null | false>>({ instagram: null, facebook: false, tiktok: false, youtube: false, pinterest: false });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const networks = Object.entries(nets).filter(([, v]) => v !== false).map(([network, connectionId]) => ({ network, connectionId: connectionId || null }));
    if (!networks.length) return toast("bad", "Choisissez au moins un réseau.");
    setBusy(true);
    try {
      await api(`/api/projects/${id}/plans`, { body: { startDate: f.startDate, days: f.days, perDay: f.perDay, slots: f.slots.slice(0, f.perDay), timezone: f.timezone, networks, goals: f.goals, tone: f.tone, mix: { photo: f.photo, video: f.video, text: f.text }, link: f.link || undefined, approval: f.approval } });
      toast("ok", `${f.days * f.perDay} publications en préparation : textes, médias et dates.`);
      onClose();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Préparer des publications à l'avance" wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Premier jour" htmlFor="cstart"><Input id="cstart" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label="Nombre de jours" htmlFor="cdays"><Input id="cdays" type="number" min={1} max={60} value={f.days} onChange={(e) => setF({ ...f, days: Math.max(1, Math.min(60, Number(e.target.value))) })} /></Field>
          </div>
          <Field label="Publications par jour" htmlFor="cper">
            <div className="flex gap-1.5" id="cper">
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setF({ ...f, perDay: n })} className={cx("h-10 flex-1 rounded-xl border text-sm", f.perDay === n ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{n}</button>)}
            </div>
          </Field>
          <Field label="Horaires" htmlFor="cslot0">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: f.perDay }, (_, i) => <Input key={i} id={`cslot${i}`} type="time" value={f.slots[i]} onChange={(e) => { const s = [...f.slots]; s[i] = e.target.value; setF({ ...f, slots: s }); }} className="w-28" />)}
            </div>
          </Field>
          <Field label="Fuseau horaire" htmlFor="ctz"><Input id="ctz" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field>
          <Field label="Objectifs" htmlFor="cgoals"><Textarea id="cgoals" rows={2} value={f.goals} onChange={(e) => setF({ ...f, goals: e.target.value })} placeholder="Faire découvrir le produit, amener vers la boutique, préparer le lancement…" /></Field>
          <Field label="Ton" htmlFor="ctone"><Input id="ctone" value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value })} placeholder="Celui de la marque par défaut" /></Field>
          <Field label="Lien de la boutique" htmlFor="clink"><Input id="clink" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://…" /></Field>
        </div>
        <div className="grid content-start gap-4">
          <div>
            <p className="mb-2 text-sm font-medium">Réseaux et comptes</p>
            <div className="grid gap-2">
              {Object.keys(NETWORKS).map((n) => {
                const accounts = (conns?.connections ?? []).filter((c) => c.provider === n);
                const on = nets[n] !== false;
                return (
                  <div key={n} className={cx("flex items-center gap-3 rounded-2xl border p-2.5", on ? "border-ink" : "border-line")}>
                    <input type="checkbox" checked={on} onChange={(e) => setNets({ ...nets, [n]: e.target.checked ? accounts[0]?.id ?? null : false })} aria-label={NETWORKS[n].label} className="size-4 accent-[var(--signal)]" />
                    <NetworkDot network={n} />
                    <span className="flex-1 text-sm">{NETWORKS[n].label}</span>
                    {on && (
                      <Select value={(nets[n] as string) ?? ""} onChange={(e) => setNets({ ...nets, [n]: e.target.value || null })} className="h-8 w-40 text-xs" aria-label={`Compte ${NETWORKS[n].label}`}>
                        <option value="">Sans compte (à choisir)</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </Select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Répartition des contenus</p>
            {(["photo", "video", "text"] as const).map((k) => (
              <label key={k} className="mb-2 flex items-center gap-3 text-sm">
                <span className="w-24">{k === "photo" ? "Photos" : k === "video" ? "Vidéos" : "Textes / carrousels"}</span>
                <input type="range" min={0} max={100} step={10} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} className="flex-1 accent-[var(--signal)]" />
                <span className="w-10 text-right text-xs text-muted">{f[k]} %</span>
              </label>
            ))}
          </div>
          <div className="rounded-2xl bg-paper-2 p-3">
            <Toggle checked={f.approval === "auto"} onChange={(v) => setF({ ...f, approval: v ? "auto" : "manual" })} label="Programmer automatiquement selon mes règles" />
            <p className="mt-1.5 text-[11px] text-muted">Sinon, chaque publication arrive « à valider ». Les règles se règlent avec le bouton « Règles d'automatisation ».</p>
          </div>
          <Button size="lg" onClick={submit} loading={busy} icon={<Sparkles className="size-4" />}>Préparer {f.days * f.perDay} publications</Button>
        </div>
      </div>
    </Modal>
  );
}

function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { id, data, reload } = useProject();
  const toast = useToast();
  const [r, setR] = useState(data?.settings.autopublish ?? { enabled: false, networks: [], requireApprovalFor: [] });
  useEffect(() => {
    if (data) setR(data.settings.autopublish);
  }, [data]);
  return (
    <Modal open={open} onClose={onClose} title="Règles d'automatisation">
      <p className="text-sm text-muted">Lorsqu'elles sont activées, les publications préparées en mode automatique sont programmées sans validation individuelle, uniquement sur les réseaux cochés et avec un compte connecté. Elles partent ensuite à l'heure prévue, même navigateur fermé.</p>
      <div className="mt-4 grid gap-3">
        <Toggle checked={r.enabled} onChange={(v) => setR({ ...r, enabled: v })} label="Autoriser la programmation automatique" />
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(NETWORKS).map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.networks.includes(n)} onChange={(e) => setR({ ...r, networks: e.target.checked ? [...r.networks, n] : r.networks.filter((x) => x !== n) })} className="size-4 accent-[var(--signal)]" /> {NETWORKS[n].label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.requireApprovalFor.includes("video")} onChange={(e) => setR({ ...r, requireApprovalFor: e.target.checked ? [...r.requireApprovalFor, "video"] : r.requireApprovalFor.filter((x) => x !== "video") })} className="size-4 accent-[var(--signal)]" /> Toujours valider les vidéos à la main</label>
      </div>
      <Button className="mt-5" onClick={async () => { await api(`/api/projects/${id}`, { method: "PATCH", body: { settings: { autopublish: r } } }); toast("ok", "Règles enregistrées."); reload(); onClose(); }}>Enregistrer</Button>
    </Modal>
  );
}

export default function TabCalendrier() {
  const { id, data: project } = useProject();
  const toast = useToast();
  const tz = project?.settings.timezone ?? "Europe/Paris";
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => toZonedTime(new Date(), tz));
  const [openPost, setOpenPost] = useState<PostView | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const active = useActive(["calendar.plan", "video.render", "post."]);
  const range = useMemo(() => {
    if (mode === "month") return [startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 })];
    if (mode === "week") return [startOfWeek(cursor, { weekStartsOn: 1 }), endOfWeek(cursor, { weekStartsOn: 1 })];
    return [cursor, cursor];
  }, [mode, cursor]);
  const from = fromZonedTime(format(range[0], "yyyy-MM-dd") + "T00:00:00", tz).getTime();
  const to = fromZonedTime(format(addDays(range[1], 1), "yyyy-MM-dd") + "T00:00:00", tz).getTime();
  const { data, reload } = useApi<{ posts: PostView[] }>(`/api/projects/${id}/posts?from=${from}&to=${to}`, { poll: 10000 });
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(`es-insert-calendrier-${id}`)) {
        sessionStorage.removeItem(`es-insert-calendrier-${id}`);
        setPlanOpen(true);
      }
    } catch {}
  }, [id]);
  const days: Date[] = [];
  for (let d = range[0]; d <= range[1]; d = addDays(d, 1)) days.push(d);
  const postsOn = (d: Date) => (data?.posts ?? []).filter((p) => p.scheduledAt && formatInTimeZone(new Date(p.scheduledAt), tz, "yyyy-MM-dd") === format(d, "yyyy-MM-dd")).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
  const move = async (postId: string, day: Date) => {
    const p = data?.posts.find((x) => x.id === postId);
    if (!p || !p.scheduledAt) return;
    if (["published", "publishing"].includes(p.status)) return toast("bad", "Une publication envoyée ne peut pas être déplacée.");
    const time = formatInTimeZone(new Date(p.scheduledAt), tz, "HH:mm");
    try {
      await api(`/api/posts/${postId}`, { method: "PATCH", body: { scheduledAt: fromZonedTime(`${format(day, "yyyy-MM-dd")}T${time}:00`, tz).getTime() } });
      toast("ok", p.status === "scheduled" ? "Déplacée : à valider de nouveau." : "Publication déplacée.");
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const step = (n: number) => setCursor(mode === "month" ? addMonths(cursor, n) : addDays(cursor, n * (mode === "week" ? 7 : 1)));
  const today = toZonedTime(new Date(), tz);
  const Chip = ({ p }: { p: PostView }) => (
    <button draggable={!["published", "publishing"].includes(p.status)} onDragStart={(e) => e.dataTransfer.setData("text/post", p.id)} onClick={() => setOpenPost(p)} className={cx("flex w-full items-center gap-1.5 truncate rounded-lg border px-1.5 py-1 text-left text-[11px]", p.status === "failed" ? "border-bad/40 bg-bad-soft" : p.status === "published" ? "border-line bg-paper-2 opacity-70" : p.status === "scheduled" ? "border-ok/40 bg-ok-soft" : "border-line bg-card")} title={`${NETWORKS[p.network]?.label} · ${POST_STATUS[p.status]?.label}`}>
      <NetworkDot network={p.network} />
      <span className="shrink-0 tabular-nums text-muted">{formatInTimeZone(new Date(p.scheduledAt!), tz, "HH:mm")}</span>
      <span className="truncate">{p.title || p.caption}</span>
    </button>
  );
  return (
    <div className="mx-auto grid max-w-7xl gap-5">
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="grid size-10 place-items-center rounded-full border border-line bg-card" aria-label="Précédent"><ChevronLeft className="size-4" /></button>
          <button onClick={() => setCursor(today)} className="h-10 rounded-full border border-line bg-card px-4 text-sm">Aujourd'hui</button>
          <button onClick={() => step(1)} className="grid size-10 place-items-center rounded-full border border-line bg-card" aria-label="Suivant"><ChevronRight className="size-4" /></button>
        </div>
        <h2 className="font-display text-2xl font-semibold first-letter:uppercase">{mode === "day" ? format(cursor, "EEEE d MMMM yyyy", { locale: fr }) : mode === "week" ? `Semaine du ${format(range[0], "d MMMM", { locale: fr })}` : format(cursor, "MMMM yyyy", { locale: fr })}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-line bg-card p-0.5" role="group" aria-label="Vue">
            {(["day", "week", "month"] as ViewMode[]).map((m) => <button key={m} onClick={() => setMode(m)} className={cx("rounded-full px-3 py-1.5 text-sm", mode === m && "bg-ink text-paper")} aria-pressed={mode === m}>{m === "day" ? "Jour" : m === "week" ? "Semaine" : "Mois"}</button>)}
          </div>
          <Button variant="secondary" size="md" icon={<Settings2 className="size-4" />} onClick={() => setRulesOpen(true)}>Règles d'automatisation</Button>
          <Button variant="signal" icon={<Sparkles className="size-4" />} onClick={() => setPlanOpen(true)}>Préparer des publications</Button>
        </div>
      </div>
      <p className="text-xs text-muted">Fuseau : {tz} · glissez une publication sur un autre jour pour la déplacer · les publications programmées partent à l'heure prévue, même navigateur fermé.</p>
      {mode === "month" && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line text-center text-xs text-muted">
            {["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const list = postsOn(d);
              return (
                <div key={d.toISOString()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => move(e.dataTransfer.getData("text/post"), d)} className={cx("min-h-28 border-b border-r border-line p-1.5 sm:min-h-32", !isSameMonth(d, cursor) && "bg-paper-2/50")}>
                  <button onClick={() => (setCursor(d), setMode("day"))} className={cx("mb-1 grid size-7 place-items-center rounded-full text-xs", isSameDay(d, today) ? "bg-signal font-bold text-signal-ink" : "text-muted hover:bg-paper-2")}>{format(d, "d")}</button>
                  <div className="grid gap-1">
                    {list.slice(0, 3).map((p) => <Chip key={p.id} p={p} />)}
                    {list.length > 3 && <button onClick={() => (setCursor(d), setMode("day"))} className="text-left text-[11px] text-muted">+ {list.length - 3} autre(s)</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {mode === "week" && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => (
            <Card key={d.toISOString()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => move(e.dataTransfer.getData("text/post"), d)} className={cx("min-h-48 p-2", isSameDay(d, today) && "border-signal")}>
              <p className="mb-2 text-xs font-medium capitalize">{format(d, "EEE d", { locale: fr })}</p>
              <div className="grid gap-1.5">{postsOn(d).map((p) => <Chip key={p.id} p={p} />)}</div>
            </Card>
          ))}
        </div>
      )}
      {mode === "day" && (
        <div className="grid gap-3">
          {postsOn(cursor).length === 0 && <p className="py-10 text-center text-sm text-muted">Aucune publication ce jour-là.</p>}
          {postsOn(cursor).map((p) => (
            <Card key={p.id} className="flex items-center gap-4 p-3">
              <span className="w-14 shrink-0 text-center font-display text-lg tabular-nums">{formatInTimeZone(new Date(p.scheduledAt!), tz, "HH:mm")}</span>
              <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-paper-2">{p.media[0] && <img src={p.media[0].thumbUrl ?? p.media[0].url} alt="" className="size-full object-cover" />}</span>
              <button onClick={() => setOpenPost(p)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2 text-xs text-muted"><NetworkDot network={p.network} /> {NETWORKS[p.network]?.label} · {POST_STATUS[p.status]?.label}</span>
                <span className="mt-1 line-clamp-2 text-sm">{p.caption || p.title}</span>
              </button>
            </Card>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(POST_STATUS).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><span className={cx("size-2.5 rounded-full", { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", info: "bg-info", ink: "bg-ink", neutral: "bg-line" }[v.tone as string])} /> {v.label}</span>)}
      </div>
      <PlanForm open={planOpen} onClose={() => setPlanOpen(false)} />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
      <PostEditor post={openPost} onClose={() => setOpenPost(null)} onChanged={reload} />
    </div>
  );
}

