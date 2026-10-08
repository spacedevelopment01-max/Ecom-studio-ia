"use client";
/**
 * Studio social V2 (phase 9A) : Stratégie → Créer → Calendrier → Publications → Comptes → Statistiques.
 * Le client voit ce qui est prêt, à valider, programmé, publié, en échec ou à vérifier ; il modifie, déplace
 * (glisser-déposer sur ordinateur, date et heure sur téléphone), approuve et programme. Rien ne part sans son accord.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ArrowDown, ArrowUp, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Link2, ListChecks, MessageSquare, Pause, Play, Plus, Send, Sparkles, Target, Trash2, Wand2, X } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Select, Spinner, Textarea, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { AssetThumb, MediaPicker, type AssetView } from "./common";

type PostV = {
  id: string; network: string; format: string; status: string; scheduledAt: number | null; timezone: string; title: string; caption: string; hashtags: string; link: string | null;
  media: AssetView[]; connectionId: string | null; connectionName: string | null; planId: string | null; error: string | null; remoteUrl: string | null; publishedAt: number | null;
  engine: string; pillar: string | null; objective: string | null; approvedValid: boolean; approvedHash: string | null; userEdited: boolean; blocking: string[]; issues: string[]; level: string;
};
type Pillar = { id: string; title: string; objective: string; share: number; idea: string };
type Data = {
  strategy: { archetype: string; objectives: string[]; audience: string; positioning: string; tone: string[]; messages: string[]; pillars: Pillar[]; formats: { format: string; share: number }[]; ctas: string[]; seasonality: { label: string; date: string }[]; gaps: string[] };
  plans: { id: string; engine: string; paused: boolean; createdAt: number; params: any }[];
  posts: PostV[];
  variety: { posts: number; pillars: Record<string, number>; promoShare: number; uniqueHooks: number; warnings: string[] } | null;
  accounts: { id: string; provider: string; name: string; status: string }[];
  platforms: { id: string; label: string; level: string; limits: string[]; formats: string[]; captionMax: number; hashtags: [number, number] }[];
  stats: { counts: Record<string, number>; byPlatform: { platform: string; label: string; scheduled: number; published: number; failed: number; uncertain: number; connected: boolean; metrics: Record<string, { state: string; value: number | null }> }[]; note: string };
  automations: { id: string; kind: string; status: string; last_run_at: number | null; last_result: string }[];
  ai: boolean;
  canPublish: boolean;
  timezone: string;
};

const NET: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  tiktok: { label: "TikTok", color: "#111111" },
  youtube: { label: "YouTube", color: "#FF0000" },
  pinterest: { label: "Pinterest", color: "#E60023" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
};
const STATUS: Record<string, [string, string, "neutral" | "info" | "warn" | "ok" | "bad" | "ink" | "signal"]> = {
  planned: ["Planifiée (texte)", "Planned (copy)", "neutral"],
  draft: ["Brouillon", "Draft", "neutral"],
  generating: ["En création", "Generating", "info"],
  review: ["À valider", "To review", "warn"],
  approved: ["Approuvée", "Approved", "signal"],
  scheduled: ["Programmée", "Scheduled", "ok"],
  paused: ["En pause", "Paused", "neutral"],
  publishing: ["En publication", "Publishing", "info"],
  published: ["Publiée", "Published", "ink"],
  failed: ["Échec", "Failed", "bad"],
  uncertain: ["À vérifier", "To verify", "bad"],
  cancelled: ["Annulée", "Cancelled", "neutral"],
};
const LEVEL: Record<string, [string, string, "ok" | "info" | "warn" | "neutral"]> = {
  connected: ["CONNECTÉ", "CONNECTED", "ok"],
  ready_to_connect: ["PRÊT À CONNECTER", "READY TO CONNECT", "info"],
  export: ["EXPORT", "EXPORT", "warn"],
  unavailable: ["NON DISPONIBLE", "UNAVAILABLE", "neutral"],
};
const SECTIONS = [
  ["strategie", "Stratégie", "Strategy", Target],
  ["creer", "Créer", "Create", Sparkles],
  ["calendrier", "Calendrier", "Calendar", CalendarDays],
  ["publications", "Publications", "Posts", ListChecks],
  ["comptes", "Comptes", "Accounts", Link2],
  ["stats", "Statistiques", "Statistics", BarChart3],
] as const;
type Section = (typeof SECTIONS)[number][0];

const Dot = ({ n }: { n: string }) => <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: NET[n]?.color ?? "#999" }} aria-hidden />;

export function SocialStudio({ initial = "calendrier" }: { initial?: Section }) {
  const { id } = useProject();
  const t = useT();
  const [section, setSection] = useState<Section>(initial);
  const [range, setRange] = useState(() => ({ from: Date.now() - 40 * 86_400_000, to: Date.now() + 120 * 86_400_000 }));
  const { data, reload, error } = useApi<Data>(`/api/projects/${id}/social/v2?from=${range.from}&to=${range.to}`);
  const [open, setOpen] = useState<string | null>(null);
  if (error && !data) return <Empty title={t("Réseaux sociaux indisponibles", "Social unavailable")}>{error}</Empty>;
  if (!data) return <div className="grid place-items-center py-24 text-muted"><Spinner className="size-6" /></div>;
  const c = data.stats.counts;
  const chips: [string, number, string][] = [
    [t("À valider", "To review"), (c.review ?? 0) + (c.planned ?? 0), "warn"],
    [t("Approuvées", "Approved"), c.approved ?? 0, "signal"],
    [t("Programmées", "Scheduled"), c.scheduled ?? 0, "ok"],
    [t("Publiées", "Published"), c.published ?? 0, "ink"],
    [t("Échecs", "Failed"), c.failed ?? 0, "bad"],
    [t("À vérifier", "To verify"), c.uncertain ?? 0, "bad"],
  ];
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 gap-5" data-social-studio>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(([label, n, tone]) => <Badge key={label} tone={tone as never}>{label} : {n}</Badge>)}
        </div>
        <nav className="mt-4 flex gap-1 overflow-x-auto" aria-label={t("Sections", "Sections")}>
          {SECTIONS.map(([key, frl, enl, Icon]) => (
            <button key={key} type="button" data-section={key} onClick={() => setSection(key)} className={cx("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm", section === key ? "bg-ink text-paper" : "border border-line hover:border-ink")}>
              <Icon className="size-4" aria-hidden /> {t(frl, enl)}
            </button>
          ))}
        </nav>
      </Card>
      {section === "strategie" && <StrategyPanel data={data} />}
      {section === "creer" && <CreatePanel data={data} onDone={() => (reload(), setSection("calendrier"))} reload={reload} />}
      {section === "calendrier" && <CalendarPanel data={data} reload={reload} onOpen={setOpen} onRange={setRange} />}
      {section === "publications" && <PostsPanel data={data} reload={reload} onOpen={setOpen} />}
      {section === "comptes" && <AccountsPanel data={data} />}
      {section === "stats" && <StatsPanel data={data} />}
      {open && <PostEditorV2 postId={open} data={data} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

// ------------------------------------------------------------------ stratégie

function StrategyPanel({ data }: { data: Data }) {
  const t = useT();
  const s = data.strategy;
  return (
    <Card className="grid gap-5 p-5 sm:p-7" data-social-strategy>
      <div>
        <h3 className="font-display text-xl font-semibold">{t("Stratégie éditoriale", "Editorial strategy")}</h3>
        <p className="mt-1 text-sm text-muted">{t("Construite à partir de vos seules informations ; rien n'est inventé.", "Built from your information only; nothing is made up.")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-sm font-semibold">{t("Objectifs", "Goals")}</p><ul className="mt-1 list-disc pl-5 text-sm">{s.objectives.map((o) => <li key={o}>{o}</li>)}</ul></div>
        <div><p className="text-sm font-semibold">{t("Public et positionnement", "Audience and positioning")}</p><p className="mt-1 text-sm">{s.audience}</p><p className="mt-1 text-sm text-muted">{s.positioning}</p></div>
      </div>
      <div>
        <p className="text-sm font-semibold">{t("Piliers éditoriaux", "Content pillars")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.pillars.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line p-3">
              <p className="font-medium">{p.title} <span className="text-xs text-muted">· {Math.round(p.share * 100)} %</span></p>
              <p className="mt-1 text-xs text-muted">{p.idea}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-sm font-semibold">{t("Appels à l'action", "Calls to action")}</p><p className="mt-1 text-sm">{s.ctas.join(" · ")}</p></div>
        <div><p className="text-sm font-semibold">{t("Temps forts (dates réelles)", "Key dates (real)")}</p><p className="mt-1 text-sm">{s.seasonality.length ? s.seasonality.map((m) => `${m.label} (${m.date})`).join(" · ") : t("Aucun dans la période", "None in the period")}</p></div>
      </div>
      {s.gaps.length > 0 && <div className="rounded-2xl bg-warn-soft p-3 text-sm text-warn"><p className="font-semibold">{t("À compléter pour de meilleures publications", "To complete for better posts")}</p><ul className="mt-1 list-disc pl-5">{s.gaps.slice(0, 6).map((g) => <li key={g}>{g}</li>)}</ul></div>}
    </Card>
  );
}

// ------------------------------------------------------------------ créer

function CreatePanel({ data, onDone, reload }: { data: Data; onDone: () => void; reload: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [f, setF] = useState({ startDate: tomorrow, endDate: format(addDays(new Date(), 30), "yyyy-MM-dd"), perDay: 2, weekdays: [0, 1, 2, 3, 4, 5, 6], slots: ["11:30", "18:30", "08:30", "13:00", "21:00"], timezone: data.timezone || "Europe/Paris", exclude: "", distribution: "rotate" as "rotate" | "all", priority: [] as string[], mix: { image: 40, carousel: 20, video: 30, text: 10 } });
  const [nets, setNets] = useState<Record<string, { on: boolean; account: string }>>(() => Object.fromEntries(["instagram", "facebook", "tiktok", "youtube", "pinterest", "linkedin"].map((n) => [n, { on: n === "instagram" || n === "facebook", account: data.accounts.find((a) => a.provider === n && a.status === "active")?.id ?? "" }])));
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; warnings: string[]; notes?: string[] } | null>(null);
  const [est, setEst] = useState<{ posts: number; free: number; paid: number; estimateMicro: number; notes: string[] } | null>(null);
  const [cap, setCap] = useState(5);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const latest = data.plans.find((p) => p.engine === "v2");
  const days = Math.max(1, Math.round((Date.parse(f.endDate) - Date.parse(f.startDate)) / 86_400_000) + 1);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const plan = () => run(async () => {
    const platforms = Object.entries(nets).filter(([, v]) => v.on).map(([platform, v]) => ({ platform, connectionId: v.account || null }));
    if (!platforms.length) throw new Error(t("Choisissez au moins un réseau.", "Choose at least one network."));
    const r = await api<{ created: number; warnings: string[] }>(`/api/projects/${id}/social/v2`, { body: { action: "plan", request: { startDate: f.startDate, endDate: f.endDate, perDay: f.perDay, weekdays: f.weekdays, slots: f.slots.slice(0, f.perDay), timezone: f.timezone, platforms, distribution: f.distribution, priority: f.priority, formatMix: f.mix, exclude: f.exclude.split(/[\s,;]+/).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) } } });
    setResult(r);
    toast("ok", t(`${r.created} publications planifiées (textes proposés, aucun média payant).`, `${r.created} posts planned (proposed copy, no paid media).`));
    reload();
  });
  const fromAsk = () => run(async () => {
    const r = await api<{ created: number; warnings: string[]; notes: string[] }>(`/api/projects/${id}/social/v2`, { body: { action: "ask", text: ask } });
    setResult(r);
    toast("ok", t(`${r.created} publications planifiées.`, `${r.created} posts planned.`));
    reload();
  });
  // Gratuit, par petits lots (un montage vidéo local prend du temps) : chaque requête reste courte et la progression
  // s'affiche ; les 30 prochaines publications sans média du dernier calendrier.
  const produceFree = () => run(async () => {
    if (!latest) throw new Error(t("Préparez d'abord un calendrier.", "Prepare a calendar first."));
    const todo = data.posts.filter((p) => p.planId === latest.id && p.media.length === 0 && ["planned", "draft", "failed"].includes(p.status)).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0)).slice(0, 30).map((p) => p.id);
    let produced = 0;
    setProgress({ done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i += 3) {
      const r = await api<{ produced: number }>(`/api/projects/${id}/social/v2`, { body: { action: "produce", ids: todo.slice(i, i + 3), allowPaid: false } });
      produced += r.produced;
      setProgress({ done: Math.min(todo.length, i + 3), total: todo.length });
      reload();
    }
    setProgress(null);
    toast("ok", t(`${produced} visuels préparés gratuitement (bibliothèque et rendu local).`, `${produced} visuals prepared for free (library and local render).`));
    reload();
  });
  const estimate = () => run(async () => {
    if (!latest) throw new Error(t("Préparez d'abord un calendrier.", "Prepare a calendar first."));
    setEst(await api(`/api/projects/${id}/social/v2`, { body: { action: "estimate", planId: latest.id, allowPaid: true } }));
  });
  const producePaid = () => run(async () => {
    if (!latest || !est) return;
    await api(`/api/projects/${id}/social/v2`, { body: { action: "produce", planId: latest.id, allowPaid: true, maxCostEur: cap, approvedEstimateMicro: est.estimateMicro } });
    toast("ok", t("Production lancée dans le plafond accepté.", "Production started within the accepted cap."));
    setEst(null);
  });
  const toggleDay = (d: number) => setF((x) => ({ ...x, weekdays: x.weekdays.includes(d) ? x.weekdays.filter((y) => y !== d) : [...x.weekdays, d].sort() }));
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5" data-social-create>
      <Card className="grid gap-4 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">{t("Demander en une phrase", "Ask in one sentence")}</h3>
        <Textarea rows={2} value={ask} onChange={(e) => setAsk(e.target.value)} placeholder={t("Ex. Prépare mes publications pour les 30 prochains jours, avec 3 publications par jour, des images, des vidéos et des textes.", "E.g. Prepare my posts for the next 30 days, 3 posts a day, with images, videos and text.")} />
        <div><Button variant="secondary" icon={<Wand2 className="size-4" />} loading={busy} disabled={ask.trim().length < 5} onClick={fromAsk}>{t("Préparer (gratuit)", "Prepare (free)")}</Button></div>
      </Card>
      <Card className="grid gap-4 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">{t("1. Planifier", "1. Plan")} <span className="text-sm font-normal text-muted">{t("— calendrier, thèmes, formats et textes proposés : gratuit", "— calendar, themes, formats and proposed copy: free")}</span></h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("Début", "Start")} htmlFor="s-start"><Input id="s-start" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          <Field label={t("Fin", "End")} htmlFor="s-end"><Input id="s-end" type="date" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
          <Field label={t("Fuseau horaire", "Time zone")} htmlFor="s-tz"><Input id="s-tz" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} /></Field>
        </div>
        <Field label={t("Publications par jour", "Posts per day")} htmlFor="s-per">
          <div className="flex gap-1.5" id="s-per">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" data-per-day={n} onClick={() => setF({ ...f, perDay: n })} className={cx("h-10 flex-1 rounded-xl border text-sm", f.perDay === n ? "border-ink bg-ink text-paper" : "border-line")}>{n}</button>)}
          </div>
        </Field>
        <Field label={t("Horaires", "Times")} htmlFor="s-slot0">
          <div className="flex flex-wrap gap-2">{Array.from({ length: f.perDay }, (_, i) => <Input key={i} id={`s-slot${i}`} type="time" value={f.slots[i]} onChange={(e) => { const s = [...f.slots]; s[i] = e.target.value; setF({ ...f, slots: s }); }} className="h-10 w-32" />)}</div>
        </Field>
        <Field label={t("Jours de publication", "Publishing days")} htmlFor="s-days">
          <div className="flex flex-wrap gap-1.5" id="s-days">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => <button key={d} type="button" onClick={() => toggleDay(d)} className={cx("h-9 rounded-xl border px-3 text-sm", f.weekdays.includes(d) ? "border-ink bg-ink text-paper" : "border-line text-muted")}>{t(["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][d], ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])}</button>)}
          </div>
        </Field>
        <Field label={t("Jours exclus (AAAA-MM-JJ, séparés par des virgules)", "Excluded days (YYYY-MM-DD, comma-separated)")} htmlFor="s-ex"><Input id="s-ex" value={f.exclude} onChange={(e) => setF({ ...f, exclude: e.target.value })} placeholder="2026-12-25" /></Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("Réseaux", "Networks")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.platforms.map((pl) => {
              const v = nets[pl.id];
              const accts = data.accounts.filter((a) => a.provider === pl.id);
              const lvl = accts.some((a) => a.status === "active") ? "connected" : pl.level;
              return (
                <label key={pl.id} className={cx("flex flex-wrap items-center gap-2 rounded-2xl border p-3", v.on ? "border-ink" : "border-line")}>
                  <input type="checkbox" checked={v.on} onChange={(e) => setNets({ ...nets, [pl.id]: { ...v, on: e.target.checked } })} data-platform={pl.id} />
                  <Dot n={pl.id} /> <span className="font-medium">{pl.label}</span>
                  <Badge tone={LEVEL[lvl][2]}>{t(LEVEL[lvl][0], LEVEL[lvl][1])}</Badge>
                  {accts.length > 0 && <Select value={v.account} onChange={(e) => setNets({ ...nets, [pl.id]: { ...v, account: e.target.value } })} className="h-8 w-full text-xs"><option value="">{t("Aucun compte", "No account")}</option>{accts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}
                </label>
              );
            })}
          </div>
          <label className="mt-2 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.distribution === "all"} onChange={(e) => setF({ ...f, distribution: e.target.checked ? "all" : "rotate" })} /> {t("Chaque créneau sur tous les réseaux choisis (texte adapté à chacun)", "Each slot on every chosen network (copy adapted to each)")}</label>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("Répartition des formats", "Format mix")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["image", "carousel", "video", "text"] as const).map((k) => (
              <label key={k} className="grid gap-1 text-xs">
                <span>{t({ image: "Images", carousel: "Carrousels", video: "Vidéos", text: "Textes" }[k], { image: "Images", carousel: "Carousels", video: "Videos", text: "Text" }[k])} : {f.mix[k]} %</span>
                <input type="range" min={0} max={100} step={5} value={f.mix[k]} onChange={(e) => setF({ ...f, mix: { ...f.mix, [k]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("Thèmes prioritaires", "Priority themes")}</p>
          <div className="flex flex-wrap gap-1.5">{data.strategy.pillars.map((p) => <button key={p.id} type="button" onClick={() => setF({ ...f, priority: f.priority.includes(p.id) ? f.priority.filter((x) => x !== p.id) : [...f.priority, p.id] })} className={cx("rounded-full border px-3 py-1.5 text-sm", f.priority.includes(p.id) ? "border-signal bg-signal-soft text-signal" : "border-line")}>{p.title}</button>)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="signal" icon={<CalendarDays className="size-4" />} loading={busy} onClick={plan} data-action="plan">{t(`Planifier ${days * f.perDay} publications (gratuit)`, `Plan ${days * f.perDay} posts (free)`)}</Button>
        </div>
        {result && (
          <div className="rounded-2xl bg-paper-2 p-3 text-sm">
            <p>{t(`${result.created} publications planifiées.`, `${result.created} posts planned.`)}</p>
            {[...(result.warnings ?? []), ...(result.notes ?? [])].map((w) => <p key={w} className="text-warn">⚠ {w}</p>)}
            <button type="button" className="mt-1 underline" onClick={onDone}>{t("Voir le calendrier", "See the calendar")}</button>
          </div>
        )}
      </Card>
      <Card className="grid gap-3 p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold">{t("2. Produire les visuels et vidéos", "2. Produce visuals and videos")}</h3>
        <p className="text-sm text-muted">{t("Par lots. Gratuit : vos médias validés de la bibliothèque et des visuels à la marque. Avec l'IA : estimation d'abord, puis plafond que vous fixez.", "In batches. Free: your validated library media and branded visuals. With AI: estimate first, then a cap you set.")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Sparkles className="size-4" />} loading={busy} disabled={!latest} onClick={produceFree} data-action="produce-free">{t("Produire gratuitement (30 publications)", "Produce for free (30 posts)")}</Button>
          <Button variant="secondary" loading={busy} disabled={!latest || !data.ai} onClick={estimate} title={!data.ai ? t("IA non disponible pour ce compte", "AI not available for this account") : undefined}>{t("Estimer la production avec l'IA", "Estimate AI production")}</Button>
        </div>
        {progress && <p className="text-sm text-muted" data-produce-progress>{t(`Production gratuite : ${progress.done} / ${progress.total}`, `Free production: ${progress.done} / ${progress.total}`)}</p>}
        {est && (
          <div className="rounded-2xl border border-line p-3 text-sm">
            <p>{t(`${est.posts} publications : ${est.free} gratuites, ${est.paid} payantes — estimation ${(est.estimateMicro / 1e6).toFixed(2)} €.`, `${est.posts} posts: ${est.free} free, ${est.paid} paid — estimate €${(est.estimateMicro / 1e6).toFixed(2)}.`)}</p>
            {est.notes.map((n) => <p key={n} className="text-warn">{n}</p>)}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span>{t("Plafond", "Cap")}</span><Input type="number" min={0} max={100} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="h-9 w-24" /><span>€</span>
              <Button size="sm" variant="signal" disabled={est.estimateMicro / 1e6 > cap} onClick={producePaid}>{t("J'accepte et je lance", "I accept, start")}</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ calendrier

type View = "month" | "week" | "day" | "list";

function CalendarPanel({ data, reload, onOpen, onRange }: { data: Data; reload: () => void; onOpen: (id: string) => void; onRange: (r: { from: number; to: number }) => void }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const tz = data.timezone || "Europe/Paris";
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [chat, setChat] = useState("");
  const [pending, setPending] = useState<{ text: string; estimateMicro: number } | null>(null);
  const locale = lang === "en" ? enUS : fr;
  const ymd = (ms: number) => formatInTimeZone(ms, tz, "yyyy-MM-dd");
  const byDay = useMemo(() => {
    const m = new Map<string, PostV[]>();
    for (const p of data.posts) if (p.scheduledAt) m.set(ymd(p.scheduledAt), [...(m.get(ymd(p.scheduledAt)) ?? []), p]);
    for (const list of m.values()) list.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
    return m;
  }, [data.posts, tz]);
  const days = useMemo(() => {
    if (view === "day") return [cursor];
    const start = view === "week" ? startOfWeek(cursor, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = view === "week" ? endOfWeek(cursor, { weekStartsOn: 1 }) : endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [view, cursor]);
  useEffect(() => {
    onRange({ from: addDays(days[0], -1).getTime(), to: addDays(days[days.length - 1], 2).getTime() + (view === "list" ? 90 * 86_400_000 : 0) });
  }, [days[0]?.getTime(), days.length, view]);
  const move = async (postId: string, day: string) => {
    const p = data.posts.find((x) => x.id === postId);
    if (!p?.scheduledAt) return;
    const time = formatInTimeZone(p.scheduledAt, tz, "HH:mm");
    try {
      await api(`/api/projects/${id}/social/v2/posts/${postId}`, { method: "PATCH", body: { scheduledAt: fromZonedTime(`${day}T${time}:00`, tz).getTime() } });
      toast("ok", t("Publication déplacée.", "Post moved."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const step = (dir: 1 | -1) => setCursor((c) => (view === "month" ? addMonths(c, dir) : addDays(c, dir * (view === "week" ? 7 : 1))));
  const send = async (confirm = false) => {
    const text = confirm && pending ? pending.text : chat;
    if (!text.trim()) return;
    try {
      const r = await api<{ applied: boolean; summary: string; needsConfirm?: boolean; estimateMicro?: number }>(`/api/projects/${id}/social/v2`, { body: { action: "edit", text, confirm } });
      if (r.needsConfirm) setPending({ text, estimateMicro: r.estimateMicro ?? 0 });
      else {
        setPending(null);
        setChat("");
        toast(r.applied ? "ok" : "bad", r.summary);
        reload();
      }
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const latest = data.plans.find((p) => p.engine === "v2");
  const card = (p: PostV, compact: boolean) => (
    <button key={p.id} type="button" draggable={!["publishing", "published", "uncertain"].includes(p.status)} onDragStart={(e) => e.dataTransfer.setData("text/post", p.id)} onClick={() => onOpen(p.id)} data-post={p.id} className={cx("flex w-full min-w-0 items-center gap-1 rounded-lg sm:gap-1.5 border border-line bg-card px-1.5 py-1 text-left text-[11px] hover:border-ink", p.blocking.length > 0 && "border-warn")}>
      <Dot n={p.network} />
      {!compact && p.media[0] && <AssetThumb a={p.media[0]} className="size-6 shrink-0 rounded" />}
      <span className={cx("shrink-0 tabular-nums text-muted", compact && "hidden sm:inline")}>{p.scheduledAt ? formatInTimeZone(p.scheduledAt, tz, "HH:mm") : ""}</span>
      <span className={cx("min-w-0 flex-1 truncate", compact && "hidden sm:block")}>{p.title || p.caption.slice(0, 40)}</span>
      <span className={cx("size-1.5 shrink-0 rounded-full", { review: "bg-warn", planned: "bg-line", approved: "bg-signal", scheduled: "bg-ok", published: "bg-ink", failed: "bg-bad", uncertain: "bg-bad" }[p.status] ?? "bg-line")} aria-label={p.status} />
    </button>
  );
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4" data-social-calendar>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-xl border border-line" aria-label={t("Précédent", "Previous")}><ChevronLeft className="size-4" /></button>
          <button type="button" onClick={() => setCursor(new Date())} className="h-9 rounded-xl border border-line px-3 text-sm">{t("Aujourd'hui", "Today")}</button>
          <button type="button" onClick={() => step(1)} className="grid size-9 place-items-center rounded-xl border border-line" aria-label={t("Suivant", "Next")}><ChevronRight className="size-4" /></button>
          <span className="ml-2 font-display text-lg font-semibold capitalize">{format(cursor, view === "day" ? "EEEE d MMMM yyyy" : "MMMM yyyy", { locale })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(["month", "week", "day", "list"] as View[]).map((v) => <button key={v} type="button" data-view={v} onClick={() => setView(v)} className={cx("h-9 rounded-xl px-3 text-sm", view === v ? "bg-ink text-paper" : "border border-line")}>{t({ month: "Mois", week: "Semaine", day: "Jour", list: "Liste" }[v], { month: "Month", week: "Week", day: "Day", list: "List" }[v])}</button>)}
          {latest && (latest.paused
            ? <Button size="sm" variant="secondary" icon={<Play className="size-4" />} onClick={async () => { await api(`/api/projects/${id}/social/v2`, { body: { action: "resume", planId: latest.id } }); reload(); }}>{t("Reprendre", "Resume")}</Button>
            : <Button size="sm" variant="secondary" icon={<Pause className="size-4" />} onClick={async () => { await api(`/api/projects/${id}/social/v2`, { body: { action: "pause", planId: latest.id } }); reload(); }}>{t("Mettre en pause", "Pause")}</Button>)}
        </div>
      </Card>
      {view === "list" ? (
        <Card className="divide-y divide-line">
          {data.posts.filter((p) => p.scheduledAt && p.scheduledAt >= Date.now() - 86_400_000).slice(0, 200).map((p) => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-paper-2" data-post={p.id}>
              <Dot n={p.network} />
              <span className="w-32 shrink-0 text-xs tabular-nums text-muted">{formatInTimeZone(p.scheduledAt!, tz, "dd/MM HH:mm")}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{p.title || p.caption.slice(0, 60)}</span>
              <Badge tone={STATUS[p.status]?.[2] ?? "neutral"}>{t(STATUS[p.status]?.[0] ?? p.status, STATUS[p.status]?.[1] ?? p.status)}</Badge>
            </button>
          ))}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {view !== "day" && <div className="grid grid-cols-7 border-b border-line bg-paper-2 text-center text-xs text-muted">{[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} className="py-2">{t(["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][d], ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])}</div>)}</div>}
          <div className={cx("grid", view === "day" ? "grid-cols-1" : "grid-cols-7")}>
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const list = byDay.get(key) ?? [];
              const out = view === "month" && !isSameMonth(d, cursor);
              return (
                <div key={key} data-day={key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const pid = e.dataTransfer.getData("text/post"); if (pid) move(pid, key); }} className={cx("min-h-24 min-w-0 overflow-hidden border-b border-r border-line p-1 sm:min-h-28 sm:p-1.5", out && "bg-paper-2/60", view === "day" && "min-h-64")}>
                  <button type="button" onClick={() => (setCursor(d), setView("day"))} className={cx("mb-1 text-xs", key === format(new Date(), "yyyy-MM-dd") ? "rounded-full bg-ink px-1.5 text-paper" : "text-muted")}>{format(d, "d")}</button>
                  <div className="grid min-w-0 grid-cols-1 gap-1">
                    {list.slice(0, view === "month" ? 4 : 20).map((p) => card(p, view === "month"))}
                    {view === "month" && list.length > 4 && <button type="button" onClick={() => (setCursor(d), setView("day"))} className="text-left text-[11px] text-muted">+{list.length - 4}</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Card className="grid gap-2 p-4" data-social-chat>
        <p className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4" /> {t("Modifier le calendrier en une phrase", "Edit the calendar in one sentence")}</p>
        <p className="text-xs text-muted">{t("Ex. « Supprime les publications du dimanche », « Mets les vidéos le vendredi », « Programme deux publications par jour au lieu de trois », « Remplace les images des trois prochaines publications » (gratuit) ; « Rends les publications plus premium » (IA, avec estimation).", "E.g. \"Delete Sunday posts\", \"Put videos on Friday\", \"Two posts a day instead of three\", \"Replace the images of the next three posts\" (free); \"Make posts more premium\" (AI, with an estimate).")}</p>
        <div className="flex gap-2">
          <Input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("Votre demande", "Your request")} />
          <Button onClick={() => send()}>{t("Envoyer", "Send")}</Button>
        </div>
        {pending && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warn-soft p-2 text-sm text-warn">
            {t(`Cette retouche utilise l'IA : estimation ${(pending.estimateMicro / 1e6).toFixed(2)} €.`, `This edit uses AI: estimate €${(pending.estimateMicro / 1e6).toFixed(2)}.`)}
            <Button size="sm" variant="signal" onClick={() => send(true)}>{t("Confirmer", "Confirm")}</Button>
            <Button size="sm" variant="secondary" onClick={() => setPending(null)}>{t("Annuler", "Cancel")}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ publications

function PostsPanel({ data, reload, onOpen }: { data: Data; reload: () => void; onOpen: (id: string) => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [filter, setFilter] = useState("todo");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const tz = data.timezone || "Europe/Paris";
  const groups: Record<string, (p: PostV) => boolean> = {
    todo: (p) => ["planned", "review", "draft"].includes(p.status),
    approved: (p) => p.status === "approved",
    scheduled: (p) => p.status === "scheduled" || p.status === "paused",
    published: (p) => p.status === "published",
    problems: (p) => ["failed", "uncertain"].includes(p.status),
    all: () => true,
  };
  const list = data.posts.filter(groups[filter]);
  const act = async (action: "approve" | "schedule" | "unschedule", idsList: string[]) => {
    try {
      const r = await api<{ approved?: string[]; scheduled?: string[]; refused?: { id: string; reason: string }[] }>(`/api/projects/${id}/social/v2`, { body: { action, ids: idsList } });
      const n = (r.approved ?? r.scheduled ?? idsList).length;
      toast(r.refused?.length ? "bad" : "ok", t(`${n} fait(s)${r.refused?.length ? `, ${r.refused.length} refusé(s) : ${r.refused[0].reason}` : ""}`, `${n} done${r.refused?.length ? `, ${r.refused.length} refused: ${r.refused[0].reason}` : ""}`));
      setSel(new Set());
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const week = () => {
    const now = Date.now();
    return data.posts.filter((p) => p.scheduledAt && p.scheduledAt >= now && p.scheduledAt < now + 7 * 86_400_000 && ["review", "planned"].includes(p.status)).map((p) => p.id);
  };
  const auto = async (kind: string) => {
    await api(`/api/projects/${id}/social/v2`, { body: { action: "automation", kind } });
    toast("ok", t("Règle enregistrée.", "Rule saved."));
    reload();
  };
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4" data-social-posts>
      <Card className="flex flex-wrap items-center gap-2 p-4">
        {Object.keys(groups).map((g) => <button key={g} type="button" data-filter={g} onClick={() => setFilter(g)} className={cx("h-9 rounded-xl px-3 text-sm", filter === g ? "bg-ink text-paper" : "border border-line")}>{t({ todo: "À valider", approved: "Approuvées", scheduled: "Programmées", published: "Publiées", problems: "À traiter", all: "Toutes" }[g]!, { todo: "To review", approved: "Approved", scheduled: "Scheduled", published: "Published", problems: "Needs action", all: "All" }[g]!)} ({data.posts.filter(groups[g]).length})</button>)}
        <span className="flex-1" />
        <Button size="sm" variant="secondary" icon={<Check className="size-4" />} disabled={!sel.size} onClick={() => act("approve", [...sel])} data-action="approve-selected">{t("Approuver la sélection", "Approve selection")}</Button>
        <Button size="sm" variant="secondary" onClick={() => act("approve", week())}>{t("Approuver les 7 prochains jours", "Approve next 7 days")}</Button>
        <Button size="sm" variant="signal" icon={<Send className="size-4" />} disabled={!sel.size} onClick={() => act("schedule", [...sel])} data-action="schedule-selected">{t("Programmer la sélection", "Schedule selection")}</Button>
      </Card>
      {!data.canPublish && <p className="rounded-2xl border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">{t("La programmation sur les réseaux est incluse dans les forfaits. Vous pouvez préparer, modifier et approuver gratuitement.", "Scheduling to networks is included in the plans. You can prepare, edit and approve for free.")}</p>}
      {list.length === 0 ? <Empty title={t("Rien ici", "Nothing here")}>{t("Préparez un calendrier dans « Créer ».", "Prepare a calendar in \"Create\".")}</Empty> : (
        <Card className="divide-y divide-line">
          {list.slice(0, 300).map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <input type="checkbox" checked={sel.has(p.id)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })} aria-label={t("Sélectionner", "Select")} />
              <button type="button" onClick={() => onOpen(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" data-post={p.id}>
                {p.media[0] ? <AssetThumb a={p.media[0]} className="size-12 shrink-0 rounded-xl" /> : <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-paper-2 text-[10px] text-muted">{t("texte", "copy")}</span>}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs text-muted"><Dot n={p.network} /> {NET[p.network]?.label} · {p.format} · {p.scheduledAt ? formatInTimeZone(p.scheduledAt, tz, "dd/MM HH:mm") : "—"}{p.pillar ? ` · ${p.pillar}` : ""}</span>
                  <span className="block truncate text-sm font-medium">{p.title || p.caption.slice(0, 80)}</span>
                  {p.blocking.length > 0 && <span className="block truncate text-xs text-warn">⚠ {p.blocking[0]}</span>}
                  {p.status === "uncertain" && <span className="block truncate text-xs text-bad">{p.error}</span>}
                </span>
                <Badge tone={STATUS[p.status]?.[2] ?? "neutral"}>{t(STATUS[p.status]?.[0] ?? p.status, STATUS[p.status]?.[1] ?? p.status)}</Badge>
              </button>
            </div>
          ))}
        </Card>
      )}
      <Card className="grid gap-3 p-5">
        <h3 className="font-display text-lg font-semibold">{t("Automatisations", "Automations")}</h3>
        <p className="text-sm text-muted">{t("Aucune ne dépense d'IA ni ne publie sans approbation.", "None spends AI or posts without approval.")}</p>
        <div className="flex flex-wrap gap-2">
          {[["prepare_next_week", "Préparer la semaine suivante (brouillons)", "Prepare next week (drafts)"], ["schedule_approved", "Programmer les publications approuvées", "Schedule approved posts"], ["notify_errors", "M'avertir des échecs", "Notify me of failures"], ["require_validation", "Me rappeler ce qui est à valider", "Remind me what to approve"]].map(([k, frl, enl]) => <Button key={k} size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => auto(k)}>{t(frl, enl)}</Button>)}
        </div>
        {data.automations.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={a.status === "active" ? "ok" : "neutral"}>{a.status === "active" ? t("active", "active") : t("en pause", "paused")}</Badge>
            <span className="flex-1">{a.kind}{a.last_result ? ` — ${a.last_result}` : ""}</span>
            <Button size="sm" variant="secondary" onClick={async () => { await api(`/api/projects/${id}/social/v2`, { body: { action: "automation_status", automationId: a.id, status: a.status === "active" ? "paused" : "active" } }); reload(); }}>{a.status === "active" ? t("Pause", "Pause") : t("Reprendre", "Resume")}</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ comptes et statistiques

function AccountsPanel({ data }: { data: Data }) {
  const t = useT();
  const { id } = useProject();
  return (
    <Card className="grid gap-4 p-5 sm:p-7" data-social-accounts>
      <h3 className="font-display text-xl font-semibold">{t("Comptes et réseaux", "Accounts and networks")}</h3>
      <p className="text-sm text-muted">{t("Connexion par les autorisations officielles des réseaux (aucun mot de passe). Une connexion ne garantit pas l'autorisation de publier : chaque réseau valide l'application.", "Connection through the networks' official authorization (no password). A connection does not guarantee permission to publish: each network approves the app.")} <a className="underline" href={`/studio/${id}/connexions`}>{t("Gérer les connexions", "Manage connections")}</a></p>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.platforms.map((pl) => {
          const accts = data.accounts.filter((a) => a.provider === pl.id);
          const lvl = accts.some((a) => a.status === "active") ? "connected" : pl.level;
          return (
            <div key={pl.id} className="rounded-2xl border border-line p-4" data-platform-card={pl.id}>
              <p className="flex items-center gap-2 font-medium"><Dot n={pl.id} /> {pl.label} <Badge tone={LEVEL[lvl][2]}>{t(LEVEL[lvl][0], LEVEL[lvl][1])}</Badge></p>
              {accts.map((a) => <p key={a.id} className="mt-1 text-sm">{a.name} — {a.status === "active" ? t("actif", "active") : t("à reconnecter", "reconnect")}</p>)}
              <ul className="mt-2 list-disc pl-5 text-xs text-muted">{pl.limits.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StatsPanel({ data }: { data: Data }) {
  const t = useT();
  const s = data.stats;
  const state = (x: string) => t({ available: "disponible", unavailable: "indisponible", not_connected: "non connecté" }[x] ?? x, { available: "available", unavailable: "unavailable", not_connected: "not connected" }[x] ?? x);
  return (
    <Card className="grid gap-4 p-5 sm:p-7" data-social-stats>
      <h3 className="font-display text-xl font-semibold">{t("Statistiques", "Statistics")}</h3>
      <p className="text-sm text-muted">{s.note}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[["scheduled", "Programmées", "Scheduled"], ["published", "Publiées", "Published"], ["failed", "Échecs", "Failed"], ["uncertain", "À vérifier", "To verify"], ["review", "À valider", "To review"]].map(([k, frl, enl]) => <div key={k} className="rounded-2xl bg-paper-2 p-3"><p className="text-2xl font-semibold tabular-nums">{s.counts[k] ?? 0}</p><p className="text-xs text-muted">{t(frl, enl)}</p></div>)}
      </div>
      {s.byPlatform.map((pl) => (
        <div key={pl.platform} className="rounded-2xl border border-line p-4">
          <p className="flex items-center gap-2 font-medium"><Dot n={pl.platform} /> {pl.label} · {t(`${pl.published} publiée(s), ${pl.scheduled} programmée(s), ${pl.failed} échec(s)`, `${pl.published} published, ${pl.scheduled} scheduled, ${pl.failed} failed`)}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-6">
            {Object.entries(pl.metrics).map(([m, v]) => <div key={m}><p className="text-muted">{m}</p><p>{v.value != null ? v.value : state(v.state)}</p></div>)}
          </div>
        </div>
      ))}
    </Card>
  );
}

// ------------------------------------------------------------------ éditeur de publication

function PostEditorV2({ postId, data, onClose, onChanged }: { postId: string; data: Data; onClose: () => void; onChanged: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const base = `/api/projects/${id}/social/v2/posts/${postId}`;
  const { data: v, reload } = useApi<{ post: PostV; attempts: { attempt: number; started_at: number; outcome: string; detail: string }[]; platform: { label: string; captionMax: number; hashtags: [number, number]; level: string; formats: string[] } }>(base);
  const tz = data.timezone || "Europe/Paris";
  const [f, setF] = useState<{ title: string; caption: string; hashtags: string; link: string; date: string; time: string; media: AssetView[]; network: string; connectionId: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (v && !f) setF({ title: v.post.title, caption: v.post.caption, hashtags: v.post.hashtags, link: v.post.link ?? "", date: v.post.scheduledAt ? formatInTimeZone(v.post.scheduledAt, tz, "yyyy-MM-dd") : "", time: v.post.scheduledAt ? formatInTimeZone(v.post.scheduledAt, tz, "HH:mm") : "10:00", media: v.post.media, network: v.post.network, connectionId: v.post.connectionId ?? "" });
  }, [v, f, tz]);
  const refresh = useCallback(async () => {
    await reload();
    onChanged();
  }, [reload, onChanged]);
  if (!v || !f) return <Modal open onClose={onClose} title={t("Publication", "Post")}><div className="grid place-items-center py-10"><Spinner /></div></Modal>;
  const p = v.post;
  const locked = ["publishing", "published", "uncertain"].includes(p.status);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = () => run(async () => {
    const r = await api<{ reapproval: boolean }>(base, { method: "PATCH", body: { title: f.title, caption: f.caption, hashtags: f.hashtags, link: f.link || null, media: f.media.map((m) => m.id), scheduledAt: f.date ? fromZonedTime(`${f.date}T${f.time}:00`, tz).getTime() : undefined, network: f.network, connectionId: f.connectionId || null } });
    toast("ok", r.reapproval ? t("Enregistré : la version a changé, une nouvelle approbation est nécessaire.", "Saved: the version changed, a new approval is needed.") : t("Enregistré.", "Saved."));
    setF(null);
    await refresh();
  });
  const action = (a: string, extra: Record<string, unknown> = {}) => run(async () => {
    await api(base, { body: { action: a, ...extra } });
    toast("ok", t("C'est fait.", "Done."));
    if (a === "delete") {
      onChanged();
      onClose();
      return;
    }
    setF(null);
    await refresh();
  });
  const moveMedia = (i: number, dir: -1 | 1) => setF((x) => { if (!x) return x; const m = [...x.media]; const j = i + dir; if (j < 0 || j >= m.length) return x; [m[i], m[j]] = [m[j], m[i]]; return { ...x, media: m }; });
  return (
    <Modal open onClose={onClose} title={t("Publication", "Post")} wide>
      <div className="grid min-w-0 grid-cols-1 gap-4" data-post-editor>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Dot n={p.network} /> {NET[p.network]?.label} · {p.format}
          <Badge tone={STATUS[p.status]?.[2] ?? "neutral"}>{t(STATUS[p.status]?.[0] ?? p.status, STATUS[p.status]?.[1] ?? p.status)}</Badge>
          {p.engine === "v2" && (p.approvedValid ? <Badge tone="ok">{t("version approuvée", "approved version")}</Badge> : <Badge tone="warn">{t("à approuver", "needs approval")}</Badge>)}
          {p.userEdited && <Badge>{t("modifiée par vous", "edited by you")}</Badge>}
          {p.pillar && <span className="text-muted">· {p.pillar}</span>}
        </div>
        {p.blocking.length > 0 && <div className="rounded-xl bg-warn-soft p-3 text-sm text-warn"><p className="font-semibold">{t("À corriger avant approbation", "To fix before approval")}</p><ul className="list-disc pl-5">{p.blocking.map((b) => <li key={b}>{b}</li>)}</ul></div>}
        {p.status === "uncertain" && (
          <div className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
            <p>{p.error}</p>
            <div className="mt-2 flex gap-2"><Button size="sm" variant="secondary" onClick={() => action("confirm_uncertain", { published: true })}>{t("Elle est publiée", "It is published")}</Button><Button size="sm" variant="secondary" onClick={() => action("confirm_uncertain", { published: false })}>{t("Elle n'est pas publiée", "It is not published")}</Button></div>
          </div>
        )}
        {p.error && p.status !== "uncertain" && <p className="text-sm text-warn">{p.error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Titre", "Title")} htmlFor="pe-title"><Input id="pe-title" disabled={locked} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={t("Réseau", "Network")} htmlFor="pe-net"><Select id="pe-net" disabled={locked} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}>{Object.entries(NET).map(([k, n]) => <option key={k} value={k}>{n.label}</option>)}</Select></Field>
        </div>
        <Field label={t("Légende", "Caption")} htmlFor="pe-cap" hint={<span className={cx("text-xs", f.caption.length > v.platform.captionMax ? "text-warn" : "text-muted")}>{f.caption.length}/{v.platform.captionMax}</span>}>
          <Textarea id="pe-cap" rows={6} disabled={locked} value={f.caption} onChange={(e) => setF({ ...f, caption: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t(`Hashtags (${v.platform.hashtags[0]} à ${v.platform.hashtags[1]})`, `Hashtags (${v.platform.hashtags[0]} to ${v.platform.hashtags[1]})`)} htmlFor="pe-tags"><Input id="pe-tags" disabled={locked} value={f.hashtags} onChange={(e) => setF({ ...f, hashtags: e.target.value })} /></Field>
          <Field label={t("Lien (appel à l'action)", "Link (call to action)")} htmlFor="pe-link"><Input id="pe-link" disabled={locked} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></Field>
          <Field label={t("Date", "Date")} htmlFor="pe-date"><Input id="pe-date" type="date" disabled={locked} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={t(`Heure (${tz})`, `Time (${tz})`)} htmlFor="pe-time"><Input id="pe-time" type="time" disabled={locked} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
          <Field label={t("Compte", "Account")} htmlFor="pe-acct"><Select id="pe-acct" disabled={locked} value={f.connectionId} onChange={(e) => setF({ ...f, connectionId: e.target.value })}><option value="">{t("Aucun", "None")}</option>{data.accounts.filter((a) => a.provider === f.network).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">{t("Médias (dans l'ordre)", "Media (in order)")}</p>
          <div className="flex flex-wrap gap-2">
            {f.media.map((m, i) => (
              <div key={m.id} className="relative">
                <AssetThumb a={m} className="size-24 rounded-xl" />
                {!locked && <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button type="button" className="rounded bg-card/90 p-0.5" onClick={() => moveMedia(i, -1)} aria-label={t("Avant", "Earlier")}><ArrowUp className="size-3 -rotate-90" /></button>
                  <button type="button" className="rounded bg-card/90 p-0.5 text-bad" onClick={() => setF({ ...f, media: f.media.filter((x) => x.id !== m.id) })} aria-label={t("Retirer", "Remove")}><X className="size-3" /></button>
                  <button type="button" className="rounded bg-card/90 p-0.5" onClick={() => moveMedia(i, 1)} aria-label={t("Après", "Later")}><ArrowDown className="size-3 -rotate-90" /></button>
                </div>}
              </div>
            ))}
            {!locked && <button type="button" onClick={() => setPicker(true)} className="grid size-24 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">{t("+ Média", "+ Media")}</button>}
          </div>
          <MediaPicker open={picker} onClose={() => setPicker(false)} multiple kinds={["image", "video"]} onPick={(as) => (setF({ ...f, media: [...f.media, ...as].slice(0, 10) }), setPicker(false))} />
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            <Button variant="signal" loading={busy} onClick={save} data-action="save-post">{t("Enregistrer", "Save")}</Button>
            <Button variant="secondary" loading={busy} onClick={() => action("approve")} data-action="approve-post">{t("Approuver cette version", "Approve this version")}</Button>
            {p.status === "scheduled" || p.status === "paused" ? <Button variant="secondary" onClick={() => action("unschedule")}>{t("Déprogrammer", "Unschedule")}</Button> : <Button variant="secondary" disabled={!data.canPublish} onClick={() => action("schedule")} data-action="schedule-post">{t("Programmer", "Schedule")}</Button>}
            <Button variant="secondary" disabled={!data.canPublish} onClick={() => action("publish_now")}>{t("Publier maintenant", "Publish now")}</Button>
            <Button variant="secondary" icon={<Copy className="size-4" />} onClick={() => action("duplicate")}>{t("Dupliquer", "Duplicate")}</Button>
            <Button variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => action("delete")}>{t("Supprimer", "Delete")}</Button>
          </div>
        )}
        {p.remoteUrl && <a className="text-sm underline" href={p.remoteUrl} target="_blank" rel="noreferrer">{t("Voir sur le réseau", "View on the network")}</a>}
        {v.attempts.length > 0 && (
          <div className="rounded-xl bg-paper-2 p-3 text-xs">
            <p className="font-semibold">{t("Historique des envois", "Sending history")}</p>
            {v.attempts.map((a, i) => <p key={i}>{formatInTimeZone(a.started_at, tz, "dd/MM HH:mm")} — {a.outcome}{a.detail ? ` : ${a.detail}` : ""}</p>)}
          </div>
        )}
        {v.platform.level !== "ready_to_connect" && <p className="text-xs text-muted">{t("Ce réseau n'a pas de publication directe depuis le studio : copiez le texte et téléchargez les médias pour publier à la main.", "This network has no direct publishing from the studio: copy the text and download the media to post manually.")}</p>}
      </div>
    </Modal>
  );
}
