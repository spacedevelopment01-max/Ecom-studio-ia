"use client";
import {CommunicationAngleSelector,useCommunicationAngle} from "./communication-angle";
import { InitialCreatives } from "./initial-creatives";
import { CopyFailureHistory } from "./copy-correction";
/**
 * Studio social V2 : Piloter (vue d'ensemble, communication automatique, stratégie) → Créer (image, vidéo, plusieurs) → Gérer (calendrier, validation, statistiques).
 * Le client voit ce qui est prêt, à valider, programmé, publié, en échec ou à vérifier ; il modifie, déplace
 * (glisser-déposer sur ordinateur, date et heure sur téléphone), approuve et programme. Rien ne part sans son accord.
 */
import { visualParams, type VisualMode } from "@/lib/social-v2/visual-mode";
import type { LongTermStrategy } from "@/lib/social-v2/strategy-long";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ArrowDown, ArrowUp, BarChart3, Bot, Gauge, CalendarDays, CalendarPlus, Clapperboard, ImageIcon, Check, ChevronLeft, ChevronRight, Copy, ListChecks, MessageSquare, Pause, Pencil, Play, Plus, Send, Sparkles, Target, Trash2, Type, Wand2, X } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Select, Spinner, Textarea, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useBudgetPct } from "../billing-client";
import { useProject } from "./project-context";
import { AssetThumb, JobProgress, MediaPicker, useActive, type AssetView } from "./common";
import { AiWait } from "../wait-time";
import { AutopilotPanel, SocialOverview } from "./social-autopilot";
import { VisualChoice } from "./visual-choice";
import { BatchVisuals, CreateOnePanel } from "./social-create";
import { EditedVideos } from "./video-gallery";
import { GuidedVideo } from "./guided-video";

import type { Editorial } from "@/lib/social-v2/creative-contract";

export type PostV = {
  marketingStrategy?:import("@/lib/strategy-consumption").StrategyStamp|null;
  editorial?:Editorial|null;
  id: string; network: string; format: string; status: string; scheduledAt: number | null; timezone: string; title: string; caption: string; hashtags: string; link: string | null;
  media: AssetView[]; connectionId: string | null; connectionName: string | null; planId: string | null; error: string | null; remoteUrl: string | null; publishedAt: number | null;
  engine: string; pillar: string | null; objective: string | null; approvedValid: boolean; approvedHash: string | null; userEdited: boolean; blocking: string[]; issues: string[]; level: string;
};
type Pillar = { id: string; title: string; objective: string; share: number; idea: string; formats: string[] };
import type { SubjectView } from "./subject-picker";
export type Data = {
  longTerm?: LongTermStrategy;
  strategy: { archetype: string; objectives: string[]; audience: string; positioning: string; tone: string[]; messages: string[]; pillars: Pillar[]; formats: { format: string; share: number }[]; ctas: string[]; seasonality: { label: string; date: string }[]; gaps: string[] };
  plans: { id: string; engine: string; paused: boolean; createdAt: number; params: any }[];
  posts: PostV[];
  variety: { posts: number; pillars: Record<string, number>; promoShare: number; uniqueHooks: number; warnings: string[] } | null;
  accounts: { id: string; provider: string; name: string; status: string }[];
  platforms: { id: string; label: string; level: string; limits: string[]; formats: string[]; captionMax: number; hashtags: [number, number] }[];
  stats: { counts: Record<string, number>; byPlatform: { platform: string; label: string; scheduled: number; published: number; failed: number; uncertain: number; connected: boolean; metrics: Record<string, { state: string; value: number | null }> }[]; note: string };
  automations: { id: string; kind: string; status: string; last_run_at: number | null; last_result: string }[];
  ai: boolean;
  /** Produits ou services du projet (création guidée). */
  subjects?: SubjectView[];
  canPublish: boolean;
  timezone: string;
  limits: { perDay: number; calendarDays: number } | null;
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
  planned: ["Idée", "Idea", "neutral"],
  draft: ["Brouillon IA", "AI draft", "neutral"],
  generating: ["En attente de génération", "Awaiting generation", "info"],
  review: ["En attente de validation", "Awaiting approval", "warn"],
  incomplete: ["À compléter", "To complete", "warn"],
  approved: ["Approuvée", "Approved", "signal"],
  scheduled: ["Programmée", "Scheduled", "ok"],
  paused: ["En pause", "Paused", "neutral"],
  publishing: ["En publication", "Publishing", "info"],
  published: ["Publiée", "Published", "ink"],
  failed: ["Échec", "Failed", "bad"],
  uncertain: ["À vérifier", "To verify", "bad"],
  cancelled: ["Annulée", "Cancelled", "neutral"],
};
/** Statut affiché : « À compléter » quand une information manque (jamais présenté comme prêt). */
const stKey = (p: Pick<PostV, "status" | "blocking">) => (["planned", "draft", "review"].includes(p.status) && p.blocking.some((b) => /compléter|to complete/i.test(b)) ? "incomplete" : p.status);
const LEVEL: Record<string, [string, string, "ok" | "info" | "warn" | "neutral"]> = {
  connected: ["CONNECTÉ", "CONNECTED", "ok"],
  ready_to_connect: ["PRÊT À CONNECTER", "READY TO CONNECT", "info"],
  export: ["EXPORT", "EXPORT", "warn"],
  unavailable: ["NON DISPONIBLE", "UNAVAILABLE", "neutral"],
};
const SECTIONS = [
  ["vue", "Vue d'ensemble", "Overview", Gauge, "piloter"],
  ["pilote", "Ma communication automatique", "My automatic communication", Bot, "piloter"],
  ["strategie", "Stratégie", "Strategy", Target, "piloter"],
  ["image", "Publication image", "Image post", ImageIcon, "creer"],
  ["video", "Publication vidéo", "Video post", Clapperboard, "creer"],
  ["planifier", "Planifier plusieurs publications", "Plan several posts", CalendarPlus, "creer"],
  ["calendrier", "Calendrier", "Calendar", CalendarDays, "gerer"],
  ["publications", "À valider et suivre", "Review and track", ListChecks, "gerer"],
  ["stats", "Statistiques", "Statistics", BarChart3, "gerer"],
] as const;
const SECTION_GROUPS = [
  ["piloter", "Piloter", "Steer"],
  ["creer", "Créer", "Create"],
  ["gerer", "Gérer", "Manage"],
] as const;
type Section = (typeof SECTIONS)[number][0];

const Dot = ({ n }: { n: string }) => <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: NET[n]?.color ?? "#999" }} aria-hidden />;

export function SocialStudio({ initial = "calendrier" }: { initial?: Section }) {
  const { id } = useProject();
  const t = useT();
  const [section, setSection] = useState<Section>(initial);
  // Lien direct vers une rubrique (#image, #video, #strategie…) ; anciens liens (#creer, #comptes) redirigés.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      const alias: Record<string, Section> = { creer: "planifier", comptes: "vue" };
      const target = (alias[h] ?? h) as Section;
      if (SECTIONS.some((x) => x[0] === target)) setSection(target);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const [range, setRange] = useState(() => ({ from: Date.now() - 40 * 86_400_000, to: Date.now() + 120 * 86_400_000 }));
  const { data, reload, error } = useApi<Data>(`/api/projects/${id}/social/v2?from=${range.from}&to=${range.to}`);
  const [open, setOpen] = useState<string | null>(null);
  if (error && !data) return <Empty title={t("Réseaux sociaux indisponibles", "Social unavailable")}>{error}</Empty>;
  if (!data) return <div className="grid place-items-center py-24 text-muted"><Spinner className="size-6" /></div>;
  const c = data.stats.counts;
  const review = (c.review ?? 0) + (c.planned ?? 0);
  const chips: [string, number, string][] = [
    [t("À valider", "To review"), (c.review ?? 0) + (c.planned ?? 0), "warn"],
    [t("Approuvées", "Approved"), c.approved ?? 0, "signal"],
    [t("Programmées", "Scheduled"), c.scheduled ?? 0, "ok"],
    [t("Publiées", "Published"), c.published ?? 0, "ink"],
    [t("Échecs", "Failed"), c.failed ?? 0, "bad"],
    [t("À vérifier", "To verify"), c.uncertain ?? 0, "bad"],
  ];
  const go = (x: Section) => {
    setSection(x);
    try {
      history.replaceState(null, "", `#${x}`);
    } catch {}
  };
  return (
    <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]" data-social-studio>
      <aside className="min-w-0 lg:sticky lg:top-24 lg:h-max" data-social-subnav>
        <Card className="p-3">
          <div className="flex flex-wrap gap-1.5 px-1 pb-3">
            {chips.filter(([, n]) => n > 0).map(([label, n, tone]) => <Badge key={label} tone={tone as never}>{label} : {n}</Badge>)}
          </div>
          {/* Téléphone : liste déroulante ; ordinateur : sous-menu vertical par groupe. */}
          <Select aria-label={t("Rubrique", "Section")} value={section} onChange={(e) => go(e.target.value as Section)} className="lg:hidden">
            {SECTION_GROUPS.map(([g, gfr, gen]) => (
              <optgroup key={g} label={t(gfr, gen)}>
                {SECTIONS.filter((x) => x[4] === g).map(([key, frl, enl]) => <option key={key} value={key}>{t(frl, enl)}</option>)}
              </optgroup>
            ))}
          </Select>
          <nav className="hidden lg:block" aria-label={t("Rubriques des publications", "Post sections")}>
            {SECTION_GROUPS.map(([g, gfr, gen]) => (
              <div key={g} className="mb-2 last:mb-0">
                <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{t(gfr, gen)}</p>
                {SECTIONS.filter((x) => x[4] === g).map(([key, frl, enl, Icon]) => (
                  <button key={key} type="button" data-section={key} aria-current={section === key ? "page" : undefined} onClick={() => go(key)} className={cx("mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition", section === key ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink")}>
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex-1">{t(frl, enl)}</span>
                    {key === "publications" && review > 0 && <span className={cx("grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", section === key ? "bg-paper text-ink" : "bg-signal text-signal-ink")}>{review}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </Card>
      </aside>
      <div className="grid min-w-0 grid-cols-1 content-start gap-5">
        <CopyFailureHistory/>
        <InitialCreatives onChange={reload}/>
        {section === "vue" && <SocialOverview counts={data.stats.counts} posts={data.posts} statsNote={data.stats.note} hasMetrics={data.stats.byPlatform.some((b) => Object.values(b.metrics).some((m) => m.value != null))} onGo={(s: string) => go((s === "creer" ? "planifier" : s) as Section)} />}
        {section === "pilote" && <AutopilotPanel onChanged={reload} />}
        {section === "strategie" && <StrategyPanel data={data} />}
        {section === "image" && (
          <>
            <CreateOnePanel data={data} kind="image" reload={reload} onCreated={() => go("publications")} />
            <BatchVisuals data={data} kind="image" reload={reload} />
          </>
        )}
        {section === "video" && (
          <>
            <GuidedVideo as="post" />
            <CreateOnePanel data={data} kind="video" reload={reload} onCreated={() => go("publications")} />
            <BatchVisuals data={data} kind="video" reload={reload} />
            <EditedVideos />
          </>
        )}
        {section === "planifier" && <CreatePanel data={data} onDone={() => (reload(), go("calendrier"))} onGo={go} reload={reload} />}
        {section === "calendrier" && <CalendarPanel data={data} reload={reload} onOpen={setOpen} onRange={setRange} />}
        {section === "publications" && <PostsPanel data={data} reload={reload} onOpen={setOpen} />}
        {section === "stats" && <StatsPanel data={data} />}
      </div>
      {open && <PostEditorV2 postId={open} data={data} onClose={() => setOpen(null)} onChanged={reload} />}
    </div>
  );
}

// ------------------------------------------------------------------ stratégie

function StrategyPanel({ data }: { data: Data }) {
  const t = useT();
  const s = data.strategy;
  const lt = data.longTerm;
  const H = ({ n, title, sub }: { n: string; title: string; sub?: string }) => (
    <div className="mb-3 flex items-baseline gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">{n}</span>
      <div>
        <h4 className="font-display text-lg font-semibold">{title}</h4>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
    </div>
  );
  const STAGE_TONE: Record<string, string> = { awareness: "bg-info", trust: "bg-signal", action: "bg-ok", loyalty: "bg-warn" };
  return (
    <div className="grid gap-5" data-social-strategy>
      <Card className="grid gap-3 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Stratégie sur 12 mois", "12-month strategy")}{lt ? ` · ${lt.horizon}` : ""}</p>
        <h3 className="font-display text-2xl font-semibold leading-tight">{lt?.vision ?? s.objectives[0]}</h3>
        <p className="text-sm text-muted">{t("Construite uniquement à partir de vos informations : aucun chiffre, résultat ni client n'est inventé. Ce qui manque est indiqué « À compléter ».", "Built only from your information: no figure, result or customer is made up. Anything missing is marked \"To complete\".")}</p>
        <div className="grid gap-2 sm:grid-cols-3">{s.objectives.map((o, i) => <div key={o} className="rounded-2xl bg-paper-2 p-3 text-sm"><span className="text-xs text-muted">{t("Objectif", "Goal")} {i + 1}</span><p className="font-medium">{o}</p></div>)}</div>
      </Card>

      {lt && (
        <Card className="p-5 sm:p-7" data-strategy-roadmap>
          <H n="1" title={t("Feuille de route", "Roadmap")} sub={t("Quatre étapes de trois mois : chacune prépare la suivante.", "Four three-month stages: each prepares the next.")} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {lt.roadmap.map((q, i) => (
              <div key={q.id} className="flex flex-col rounded-2xl border border-line p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t(`Étape ${i + 1}`, `Stage ${i + 1}`)} · {q.months}</p>
                <p className="mt-1 font-display text-lg font-semibold">{q.title}</p>
                <p className="mt-1 text-sm">{q.focus}</p>
                {q.pillars.length > 0 && <p className="mt-2 text-xs text-muted">{t("Piliers : ", "Pillars: ")}{q.pillars.join(" · ")}</p>}
                <p className="mt-1 text-xs text-muted">{t("Rythme : ", "Pace: ")}{q.rhythm}</p>
                <ul className="mt-3 grid gap-1 text-sm">{q.milestones.map((m) => <li key={m} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden />{m}</li>)}</ul>
                <p className="mt-auto pt-3 text-xs"><span className="font-medium">{t("À suivre : ", "Track: ")}</span>{q.kpis.join(" · ")}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {lt && (
        <Card className="p-5 sm:p-7" data-strategy-funnel>
          <H n="2" title={t("Le parcours de vos clients", "Your customers' journey")} sub={t("Chaque publication a un rôle : faire connaître, faire confiance, faire agir ou fidéliser.", "Every post has a role: get known, build trust, drive action or build loyalty.")} />
          <div className="grid gap-2">
            {lt.funnel.map((f) => (
              <div key={f.id} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[180px_minmax(0,1fr)_200px] sm:items-center">
                <div>
                  <p className="font-medium">{f.title}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-2"><div className={cx("h-full rounded-full", STAGE_TONE[f.id])} style={{ width: `${Math.max(4, f.share)}%` }} /></div>
                  <p className="mt-0.5 text-[11px] text-muted">{f.share} % {t("du calendrier", "of the calendar")}</p>
                </div>
                <div className="text-sm"><p>{f.goal}</p><p className="text-xs text-muted">{[...f.pillars, ...f.content].join(" · ")}</p></div>
                <p className="text-xs"><span className="font-medium">{t("Mesure : ", "Measure: ")}</span>{f.kpis.join(", ")}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="grid gap-5 p-5 sm:p-7">
        <H n="3" title={t("Publics et positionnement", "Audiences and positioning")} />
        {lt && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lt.personas.map((x) => (
              <div key={x.name} className="rounded-2xl border border-line p-3 text-sm">
                <p className="font-medium">{x.name}</p>
                <p className="mt-1 text-xs text-muted">{t("Besoin : ", "Need: ")}{x.need}</p>
                <p className="text-xs text-muted">{t("Où les toucher : ", "Where to reach them: ")}{x.channel}</p>
                <Badge className="mt-2" tone={x.confirmed ? "ok" : "neutral"}>{x.confirmed ? t("Déclaré par vous", "Declared by you") : t("Hypothèse à confirmer", "Assumption to confirm")}</Badge>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-sm font-semibold">{t("Positionnement", "Positioning")}</p><p className="mt-1 text-sm">{s.positioning}</p><p className="mt-2 text-sm font-semibold">{t("Ton", "Tone")}</p><p className="mt-1 text-sm">{s.tone.join(" · ") || t("[À compléter : ton de la marque]", "[To complete: brand tone]")}</p></div>
          <div><p className="text-sm font-semibold">{t("Messages à répéter (faits vérifiés)", "Messages to repeat (verified facts)")}</p>{s.messages.length ? <ul className="mt-1 list-disc pl-5 text-sm">{s.messages.slice(0, 6).map((m) => <li key={m}>{m}</li>)}</ul> : <p className="mt-1 text-sm text-warn">{t("[À compléter : vos points forts confirmés]", "[To complete: your confirmed strengths]")}</p>}</div>
        </div>
      </Card>

      <Card className="p-5 sm:p-7">
        <H n="4" title={t("Piliers de contenu", "Content pillars")} sub={t("Les grands thèmes qui reviennent, et leur part du calendrier.", "The recurring themes and their share of the calendar.")} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.pillars.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line p-3">
              <div className="flex items-baseline justify-between gap-2"><p className="font-medium">{p.title}</p><span className="text-xs text-muted">{Math.round(p.share * 100)} %</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(p.share * 100)}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{p.idea}</p>
              <p className="mt-1 text-[11px] text-muted">{t("Formats : ", "Formats: ")}{p.formats.join(", ")}</p>
            </div>
          ))}
        </div>
      </Card>

      {lt && (
        <Card className="grid gap-4 p-5 sm:p-7" data-strategy-year>
          <H n="5" title={t("Temps forts de l'année", "Key dates of the year")} sub={t("Dates réelles des 12 prochains mois, et périodes propices à votre activité.", "Real dates for the next 12 months, and good periods for your business.")} />
          {lt.moments.length ? (
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{lt.moments.map((m) => <li key={m.date + m.label} className="rounded-2xl bg-paper-2 p-3 text-sm"><p className="text-xs text-muted">{m.month}</p><p className="font-medium">{m.label} · {m.date}</p><p className="text-xs text-muted">{m.prepare}</p></li>)}</ol>
          ) : <p className="text-sm text-muted">{t("Aucune fête commerciale ne concerne directement votre activité : la feuille de route suit vos saisons.", "No retail holiday directly concerns your business: the roadmap follows your seasons.")}</p>}
          {lt.seasons.length > 0 && <div className="grid gap-2 sm:grid-cols-3">{lt.seasons.map((x) => <div key={x.period} className="rounded-2xl border border-line p-3 text-sm"><p className="font-medium">{x.period}</p><p className="text-xs text-muted">{x.idea}</p></div>)}</div>}
        </Card>
      )}

      {lt && (
        <Card className="grid gap-5 p-5 sm:p-7">
          <H n="6" title={t("Rythme, indicateurs et suivi", "Pace, indicators and follow-up")} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="text-sm"><p className="font-semibold">{t("Rythme", "Pace")}</p><p className="mt-1">{lt.rhythm.perWeek}</p><p className="mt-1 text-xs text-muted">{t("Formats : ", "Formats: ")}{lt.rhythm.mix}</p><p className="mt-2 font-semibold">{t("Réseaux", "Networks")}</p><ul className="mt-1 text-xs text-muted">{lt.rhythm.channels.map((c) => <li key={c}>{c}</li>)}</ul><p className="mt-2 font-semibold">{t("Appels à l'action", "Calls to action")}</p><p className="mt-1 text-xs text-muted">{s.ctas.join(" · ")}</p></div>
            <div className="text-sm"><p className="font-semibold">{t("Indicateurs", "Indicators")}</p><ul className="mt-1 grid gap-2">{lt.kpis.map((k) => <li key={k.name}><p className="font-medium">{k.name}</p><p className="text-xs text-muted">{k.why}</p><p className={cx("text-xs", /compléter|complete/i.test(k.target) ? "text-warn" : "text-ok")}>{k.target}</p></li>)}</ul></div>
            <div className="text-sm"><p className="font-semibold">{t("Rituels de suivi", "Follow-up rituals")}</p><ul className="mt-1 grid gap-2">{lt.rituals.map((r) => <li key={r.when}><p className="font-medium">{r.when}</p><p className="text-xs text-muted">{r.what}</p></li>)}</ul></div>
          </div>
        </Card>
      )}

      {lt && lt.nextActions.length > 0 && (
        <Card className="p-5 sm:p-7" data-strategy-next>
          <H n="7" title={t("Vos prochaines actions", "Your next actions")} />
          <ul className="grid gap-2 text-sm">{lt.nextActions.map((a) => <li key={a} className={cx("rounded-2xl p-3", /compléter|complete/i.test(a) ? "bg-warn-soft text-warn" : "bg-paper-2")}>{a}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ créer

function CreatePanel({ data, onDone, onGo, reload }: { data: Data; onDone: () => void; onGo: (s: Section) => void; reload: () => void }) {
  const { id } = useProject();
  const [angleId,setAngleId]=useCommunicationAngle();
  const t = useT();
  const toast = useToast();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const [f, setF] = useState({ startDate: tomorrow, endDate: format(addDays(new Date(), 30), "yyyy-MM-dd"), perDay: Math.min(2, data.limits?.perDay ?? 1), weekdays: [0, 1, 2, 3, 4, 5, 6], slots: ["11:30", "18:30", "08:30", "13:00", "21:00"], timezone: data.timezone || "Europe/Paris", exclude: "", distribution: "rotate" as "rotate" | "all", priority: [] as string[], mix: { image: 40, carousel: 20, video: 30, text: 10 } });
  const [nets, setNets] = useState<Record<string, { on: boolean; account: string }>>(() => Object.fromEntries(["instagram", "facebook", "tiktok", "youtube", "pinterest", "linkedin"].map((n) => [n, { on: n === "instagram" || n === "facebook", account: data.accounts.find((a) => a.provider === n && a.status === "active")?.id ?? "" }])));
  const [ask, setAsk] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; warnings: string[]; notes?: string[] } | null>(null);
  const days = Math.max(1, Math.round((Date.parse(f.endDate) - Date.parse(f.startDate)) / 86_400_000) + 1);
  // Attente en cours (libellé et clé de mesure du temps) ; production payante : tâche de fond suivie ci-dessous.
  const [what, setWhat] = useState<{ key: string; label: string; ms: number } | null>(null);
  const jobs = useActive(["social.v2"]);
  const run = async (fn: () => Promise<void>, w?: { key: string; label: string; ms: number }) => {
    setBusy(true);
    setWhat(w ?? null);
    try {
      await fn();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
      setWhat(null);
    }
  };
  const plan = () => run(async () => {
    const platforms = Object.entries(nets).filter(([, v]) => v.on).map(([platform, v]) => ({ platform, connectionId: v.account || null }));
    if (!platforms.length) throw new Error(t("Choisissez au moins un réseau.", "Choose at least one network."));
    const r = await api<{ created: number; warnings: string[] }>(`/api/projects/${id}/social/v2`, { body: { action: "plan", angleId, request: { angleId, startDate: f.startDate, endDate: f.endDate, perDay: f.perDay, weekdays: f.weekdays, slots: f.slots.slice(0, f.perDay), timezone: f.timezone, platforms, distribution: f.distribution, priority: f.priority, formatMix: f.mix, structure: "weekly", exclude: f.exclude.split(/[\s,;]+/).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) } } });
    setResult(r);
    toast("ok", t(`${r.created} publications planifiées (textes proposés, aucun média payant).`, `${r.created} posts planned (proposed copy, no paid media).`));
    reload();
  }, { key: "social-plan", label: t("Préparation du calendrier de publications…", "Preparing the posting calendar…"), ms: 20000 });
  const fromAsk = () => run(async () => {
    const r = await api<{ created: number; warnings: string[]; notes: string[] }>(`/api/projects/${id}/social/v2`, { body: { action: "ask", angleId, text: ask } });
    setResult(r);
    toast("ok", t(`${r.created} publications planifiées.`, `${r.created} posts planned.`));
    reload();
  }, { key: "social-ask", label: t("Préparation de vos publications…", "Preparing your posts…"), ms: 25000 });
  const toggleDay = (d: number) => setF((x) => ({ ...x, weekdays: x.weekdays.includes(d) ? x.weekdays.filter((y) => y !== d) : [...x.weekdays, d].sort() }));
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5" data-social-create>
      <CommunicationAngleSelector value={angleId} onChange={setAngleId}/>
      {jobs.map((j) => <JobProgress key={j.id} job={j} />)}
      <AiWait busy={busy && !!what} label={what?.label ?? ""} waitKey={what?.key ?? "social"} expectedMs={what?.ms ?? 20000} />
      <Card className="grid gap-2 p-5 sm:p-7" data-create-guide>
        <h3 className="font-display text-xl font-semibold">{t("Planifier plusieurs publications", "Plan several posts")}</h3>
        <ol className="grid gap-1.5 text-sm sm:grid-cols-3">
          <li className="rounded-2xl bg-paper-2 p-3"><span className="font-semibold">{t("1. Planifier", "1. Plan")}</span> — {t("ici : les dates, les sujets et les textes (gratuit).", "here: dates, topics and copy (free).")}</li>
          <li className="rounded-2xl bg-paper-2 p-3"><span className="font-semibold">{t("2. Créer les visuels", "2. Create the visuals")}</span> — {t("dans", "in")} <button type="button" className="underline" onClick={() => onGo("image")}>{t("Publication image", "Image post")}</button> {t("et", "and")} <button type="button" className="underline" onClick={() => onGo("video")}>{t("Publication vidéo", "Video post")}</button>{t(", avec ou sans IA.", ", with or without AI.")}</li>
          <li className="rounded-2xl bg-paper-2 p-3"><span className="font-semibold">{t("3. Relire et valider", "3. Review and approve")}</span> — {t("dans", "in")} <button type="button" className="underline" onClick={() => onGo("publications")}>{t("À valider et suivre", "Review and track")}</button>.</li>
        </ol>
        <p className="text-xs text-muted">{t("Vous préférez que tout se fasse seul, semaine après semaine ? Utilisez « Ma communication automatique ».", "Prefer everything to happen on its own, week after week? Use \"My automatic communication\".")}</p>
      </Card>
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
            {[1, 2, 3, 4, 5].map((n) => { const over = !!data.limits && n > data.limits.perDay; return <button key={n} type="button" data-per-day={n} disabled={over} title={over ? t("Forfait supérieur nécessaire", "Higher plan needed") : undefined} onClick={() => setF({ ...f, perDay: n })} className={cx("h-10 flex-1 rounded-xl border text-sm", f.perDay === n ? "border-ink bg-ink text-paper" : "border-line", over && "cursor-not-allowed opacity-40")}>{n}</button>; })}
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
            {/* Visuels (créés par l'IA, devis en % du budget IA puis accord) : étape 2, sans doublon de parcours. */}
            <p className="mt-1" data-plan-visuals-next>{t("Visuels de ces publications, créés par l'IA (coût montré avant, en % de votre budget IA) :", "Visuals for these posts, created by AI (cost shown first, as a % of your AI budget):")} <button type="button" className="underline" onClick={() => onGo("image")}>{t("Publication image", "Image post")}</button> · <button type="button" className="underline" onClick={() => onGo("video")}>{t("Publication vidéo", "Video post")}</button></p>
            <button type="button" className="mt-1 underline" onClick={onDone}>{t("Voir le calendrier", "See the calendar")}</button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ calendrier

type View = "month" | "week" | "day" | "list";

/** Couleur de statut (bord gauche de la carte, pastille, légende). */
const STATUS_COLOR: Record<string, string> = { planned: "bg-line", draft: "bg-line", generating: "bg-info", review: "bg-warn", approved: "bg-signal", scheduled: "bg-ok", paused: "bg-line", publishing: "bg-info", published: "bg-ink", failed: "bg-bad", uncertain: "bg-bad", cancelled: "bg-line" };
const LOCKED = ["publishing", "published", "uncertain"];

/** Avatar du réseau (pastille de couleur avec son initiale). */
const NetAvatar = ({ n }: { n: string }) => (
  <span className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white ring-2 ring-card" style={{ background: NET[n]?.color ?? "#999" }} title={NET[n]?.label ?? n} aria-label={NET[n]?.label ?? n}>
    {(NET[n]?.label ?? n).slice(0, 1)}
  </span>
);

/**
 * Carte d'une publication dans le calendrier (comme les outils de planification du marché) : heure, réseau, statut en
 * couleur, thème, début du texte, VIGNETTE du visuel et actions rapides (modifier, dupliquer, supprimer).
 * Glisser-déposer sur un autre jour pour la déplacer (ordinateur).
 */
function CalCard({ p, tz, onOpen, onAction, row = false }: { p: PostV; tz: string; onOpen: (id: string) => void; onAction: (id: string, a: "duplicate" | "delete") => void; row?: boolean }) {
  const t = useT();
  const st = STATUS[stKey(p)];
  const media = p.media[0];
  const video = media?.kind === "video" || /reel|video|story/i.test(p.format);
  const locked = LOCKED.includes(p.status);
  const thumb = (
    <button type="button" onClick={() => onOpen(p.id)} className={cx("relative block shrink-0 overflow-hidden rounded-lg bg-paper-2", row ? "size-20" : "aspect-[4/3] w-full")} aria-label={t("Ouvrir la publication", "Open the post")}>
      {media ? <AssetThumb a={media} className="size-full object-cover" /> : <span className="grid size-full place-items-center text-muted"><Type className="size-5" aria-hidden /><span className="sr-only">{t("Texte seul", "Text only")}</span></span>}
      {video && <span className="absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-md bg-black/55 text-white"><Play className="size-3" aria-hidden /></span>}
    </button>
  );
  return (
    <div draggable={!locked && !row} onDragStart={(e) => e.dataTransfer.setData("text/post", p.id)} {...(row ? { "data-agenda-post": p.id } : { "data-post": p.id })} className={cx("group relative min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md", p.blocking.length > 0 ? "border-warn" : "border-line", row && "flex gap-3 p-2")}>
      <span className={cx("absolute inset-y-0 left-0 w-1", STATUS_COLOR[p.status] ?? "bg-line")} aria-hidden />
      {p.marketingStrategy&&<span className="block px-2 py-1 text-[11px]" data-post-angle={p.marketingStrategy.angleId}>{t("Angle", "Angle")} : {({usage:t("Usage concret","Concrete use"),reassurance:t("Choix éclairé","Informed choice"),expression:t("Expression personnelle","Personal expression"),discovery:t("Découverte","Discovery"),generalist:t("Présenter l’ensemble de votre offre","Present your entire offer")})[p.marketingStrategy.angleId]}</span>}
      {row && thumb}
      <div className={cx("min-w-0", row ? "flex-1" : "grid gap-1.5 p-2 pl-2.5")}>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold tabular-nums">{p.scheduledAt ? formatInTimeZone(p.scheduledAt, tz, "HH:mm") : "—"}</span>
          <span className="flex-1" />
          <NetAvatar n={p.network} />
        </div>
        <div className="flex min-w-0 flex-wrap gap-1">
          <span className={cx("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium", { warn: "bg-warn-soft text-warn", ok: "bg-ok-soft text-ok", bad: "bg-bad-soft text-bad", info: "bg-info-soft text-info", signal: "bg-signal-soft text-signal", ink: "bg-ink text-paper", neutral: "bg-paper-2 text-muted" }[st?.[2] ?? "neutral"])}>
            <span className={cx("size-1.5 rounded-full", STATUS_COLOR[p.status] ?? "bg-line")} aria-hidden />{t(st?.[0] ?? p.status, st?.[1] ?? p.status)}
          </span>
          {p.pillar && <span className="truncate rounded-full bg-paper-2 px-1.5 py-0.5 text-[10px] text-muted">{p.pillar}</span>}
        </div>
        <button type="button" onClick={() => onOpen(p.id)} className="line-clamp-2 text-left text-[11px] leading-snug text-muted hover:text-ink">{p.title || p.caption.slice(0, 90) || t("Sans texte", "No copy")}</button>
        {!row && thumb}
        <div className="flex items-center gap-0.5 text-muted">
          <button type="button" onClick={() => onOpen(p.id)} className="grid size-7 place-items-center rounded-md hover:bg-paper-2 hover:text-ink" aria-label={t("Modifier", "Edit")} title={t("Modifier", "Edit")}><Pencil className="size-3.5" /></button>
          <button type="button" onClick={() => onAction(p.id, "duplicate")} className="grid size-7 place-items-center rounded-md hover:bg-paper-2 hover:text-ink" aria-label={t("Dupliquer", "Duplicate")} title={t("Dupliquer", "Duplicate")}><Copy className="size-3.5" /></button>
          {!locked && <button type="button" onClick={() => onAction(p.id, "delete")} className="grid size-7 place-items-center rounded-md hover:bg-bad-soft hover:text-bad" aria-label={t("Supprimer", "Delete")} title={t("Supprimer", "Delete")}><Trash2 className="size-3.5" /></button>}
        </div>
      </div>
    </div>
  );
}

function CalendarPanel({ data, reload, onOpen, onRange }: { data: Data; reload: () => void; onOpen: (id: string) => void; onRange: (r: { from: number; to: number }) => void }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const tz = data.timezone || "Europe/Paris";
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [net, setNet] = useState<string>("all");
  const posts = useMemo(() => (net === "all" ? data.posts : data.posts.filter((p) => p.network === net)), [data.posts, net]);
  const [chat, setChat] = useState("");
  // Aperçu à confirmer (suppression, autre modification, ou coût IA en % du budget) et dernière réponse affichée.
  const [pending, setPending] = useState<{ text: string; kind: "delete" | "change" | "ai"; summary: string; pct: number | null } | null>(null);
  const [answer, setAnswer] = useState<{ ok: boolean; text: string } | null>(null);
  const locale = lang === "en" ? enUS : fr;
  const ymd = (ms: number) => formatInTimeZone(ms, tz, "yyyy-MM-dd");
  const byDay = useMemo(() => {
    const m = new Map<string, PostV[]>();
    for (const p of posts) if (p.scheduledAt) m.set(ymd(p.scheduledAt), [...(m.get(ymd(p.scheduledAt)) ?? []), p]);
    for (const list of m.values()) list.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
    return m;
  }, [posts, tz]);
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
  const [sending, setSending] = useState(false);
  const send = async (confirm = false) => {
    const text = confirm && pending ? pending.text : chat;
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      // Retouche IA : le % du budget IA accepté est renvoyé avec la confirmation (le serveur revérifie le coût).
      const r = await api<{ applied: boolean; summary: string; needsConfirm?: boolean; confirmKind?: "delete" | "change" | "ai"; pct?: number | null; unclear?: boolean }>(`/api/projects/${id}/social/v2`, { body: { action: "edit", text, confirm, ...(confirm && pending?.kind === "ai" && pending.pct != null ? { approvedPct: pending.pct } : {}) } });
      // Toujours une réponse visible sous la demande (jamais de silence) : aperçu à confirmer, résultat ou exemples.
      if (r.needsConfirm) {
        setAnswer(null);
        setPending({ text, kind: r.confirmKind ?? "ai", summary: r.summary, pct: r.pct ?? null });
      } else {
        setPending(null);
        if (r.applied) setChat("");
        setAnswer({ ok: r.applied, text: r.summary });
        if (r.applied) toast("ok", r.summary);
        reload();
      }
    } catch (e) {
      setAnswer({ ok: false, text: (e as Error).message });
    } finally {
      setSending(false);
    }
  };
  const latest = data.plans.find((p) => p.engine === "v2");
  const quick = async (postId: string, a: "duplicate" | "delete") => {
    if (a === "delete" && !window.confirm(t("Supprimer cette publication ?", "Delete this post?"))) return;
    try {
      await api(`/api/projects/${id}/social/v2/posts/${postId}`, { body: { action: a } });
      toast("ok", a === "delete" ? t("Publication supprimée.", "Post deleted.") : t("Publication dupliquée.", "Post duplicated."));
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const perCell = view === "month" ? 2 : 20;
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
          <select value={net} onChange={(e) => setNet(e.target.value)} data-net-filter aria-label={t("Réseau", "Network")} className="h-9 rounded-xl border border-line bg-card px-2 text-sm">
            <option value="all">{t("Tous les réseaux", "All networks")}</option>
            {[...new Set(data.posts.map((p) => p.network))].map((n) => <option key={n} value={n}>{NET[n]?.label ?? n}</option>)}
          </select>
          {(["month", "week", "day", "list"] as View[]).map((v) => <button key={v} type="button" data-view={v} onClick={() => setView(v)} className={cx("h-9 rounded-xl px-3 text-sm", view === v ? "bg-ink text-paper" : "border border-line")}>{t({ month: "Mois", week: "Semaine", day: "Jour", list: "Liste" }[v], { month: "Month", week: "Week", day: "Day", list: "List" }[v])}</button>)}
          {latest && (latest.paused
            ? <Button size="sm" variant="secondary" icon={<Play className="size-4" />} onClick={async () => { await api(`/api/projects/${id}/social/v2`, { body: { action: "resume", planId: latest.id } }); reload(); }}>{t("Reprendre", "Resume")}</Button>
            : <Button size="sm" variant="secondary" icon={<Pause className="size-4" />} onClick={async () => { await api(`/api/projects/${id}/social/v2`, { body: { action: "pause", planId: latest.id } }); reload(); }}>{t("Mettre en pause", "Pause")}</Button>)}
        </div>
      </Card>
      {view === "list" ? (
        <Card className="divide-y divide-line">
          {posts.filter((p) => p.scheduledAt && p.scheduledAt >= Date.now() - 86_400_000).slice(0, 200).map((p) => (
            <button key={p.id} type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-paper-2" data-post={p.id}>
              <Dot n={p.network} />
              <span className="w-32 shrink-0 text-xs tabular-nums text-muted">{formatInTimeZone(p.scheduledAt!, tz, "dd/MM HH:mm")}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{p.title || p.caption.slice(0, 60)}</span>
              <Badge tone={STATUS[stKey(p)]?.[2] ?? "neutral"}>{t(STATUS[stKey(p)]?.[0] ?? p.status, STATUS[stKey(p)]?.[1] ?? p.status)}</Badge>
            </button>
          ))}
        </Card>
      ) : (
        <>
          {/* Ordinateur et tablette : grille des jours, une carte avec vignette par publication. */}
          <Card className="hidden overflow-hidden sm:block">
            {view !== "day" && <div className="grid grid-cols-7 border-b border-line bg-paper-2 text-center text-xs font-medium text-muted">{[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} className="py-2">{t(["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][d], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d])}</div>)}</div>}
            <div className={cx("grid", view === "day" ? "grid-cols-1" : "grid-cols-7")}>
              {days.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const list = byDay.get(key) ?? [];
                const out = view === "month" && !isSameMonth(d, cursor);
                return (
                  <div key={key} data-day={key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const pid = e.dataTransfer.getData("text/post"); if (pid) move(pid, key); }} className={cx("min-w-0 border-b border-r border-line bg-paper-2/30 p-1.5", view === "month" ? "min-h-40" : "min-h-72", out && "opacity-50", view === "day" && "min-h-64")}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <button type="button" onClick={() => (setCursor(d), setView("day"))} className={cx("grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-semibold", key === todayKey ? "bg-ink text-paper" : "text-muted hover:text-ink")}>{format(d, "d")}</button>
                      {list.length > 0 && <span className="text-[10px] text-muted">{list.length}</span>}
                    </div>
                    <div className={cx("grid min-w-0 gap-1.5", view === "day" ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1")}>
                      {list.slice(0, perCell).map((p) => <CalCard key={p.id} p={p} tz={tz} onOpen={onOpen} onAction={quick} />)}
                      {list.length > perCell && <button type="button" onClick={() => (setCursor(d), setView("day"))} className="rounded-lg border border-dashed border-line py-1 text-[11px] text-muted hover:border-ink">+{list.length - perCell} {t("autres", "more")}</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          {/* Téléphone : les jours qui ont des publications, cartes en ligne avec vignette. */}
          <div className="grid gap-3 sm:hidden" data-social-agenda>
            {days.filter((d) => (byDay.get(format(d, "yyyy-MM-dd")) ?? []).length > 0 && (view !== "month" || isSameMonth(d, cursor))).map((d) => {
              const key = format(d, "yyyy-MM-dd");
              return (
                <div key={key} className="grid gap-1.5">
                  <p className={cx("text-xs font-semibold capitalize", key === todayKey ? "text-ink" : "text-muted")}>{format(d, "EEEE d MMMM", { locale })}</p>
                  {(byDay.get(key) ?? []).map((p) => <CalCard key={p.id} p={p} tz={tz} onOpen={onOpen} onAction={quick} row />)}
                </div>
              );
            })}
            {!days.some((d) => (byDay.get(format(d, "yyyy-MM-dd")) ?? []).length > 0) && <Empty title={t("Aucune publication sur cette période", "No posts in this period")}>{t("Préparez un calendrier dans « Créer ».", "Prepare a calendar in \"Create\".")}</Empty>}
          </div>
          {/* Légende des statuts. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" data-calendar-legend>
            {(["scheduled", "published", "review", "approved", "failed"] as const).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className={cx("size-2.5 rounded-full", STATUS_COLOR[k])} aria-hidden /> {t(STATUS[k][0], STATUS[k][1])}</span>)}
          </div>
        </>
      )}
      <Card className="grid gap-2 p-4" data-social-chat>
        <p className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4" /> {t("Modifier le calendrier en une phrase", "Edit the calendar in one sentence")}</p>
        <p className="text-xs text-muted">{t("Ex. « Efface tout à partir du 19 octobre », « Vide novembre », « Pas le week-end », « Mets les vidéos le vendredi à 18h », « Décale tout d'une semaine », « Passe les publications Facebook sur Instagram », « Deux publications par jour au lieu de trois », « Annule ma dernière modification » (gratuit, aperçu avant d'agir) ; « Remplace les images des 3 prochaines publications », « Rends les publications plus premium » (IA, coût montré avant en % de votre budget IA).", "E.g. \"Delete everything from October 19\", \"Clear November\", \"No weekends\", \"Move videos to Friday at 6pm\", \"Push everything back a week\", \"Move Facebook posts to Instagram\", \"Two posts a day instead of three\", \"Undo my last change\" (free, preview before acting); \"Replace the images of the next 3 posts\", \"Make posts more premium\" (AI, cost shown first as a % of your AI budget).")}</p>
        <div className="flex gap-2">
          <Input value={chat} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("Votre demande", "Your request")} />
          <Button onClick={() => send()} loading={sending}>{t("Envoyer", "Send")}</Button>
        </div>
        <AiWait busy={sending} label={t("Modification du calendrier…", "Editing the calendar…")} waitKey="social-edit" expectedMs={15000} />
        {pending && (
          <div className="grid gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn" data-edit-confirm={pending.kind}>
            {/* Le résumé du serveur porte l'aperçu, et pour l'IA le coût en % du budget IA (jamais en euros). */}
            <p>{pending.kind === "ai" ? t(`Cette retouche utilise l'IA : ${pending.summary}`, `This edit uses AI: ${pending.summary}`) : pending.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={pending.kind === "delete" ? "danger" : "signal"} loading={sending} onClick={() => send(true)} data-action="confirm-edit">{pending.kind === "delete" ? t("Confirmer la suppression", "Confirm deletion") : t("Confirmer", "Confirm")}</Button>
              <Button size="sm" variant="secondary" onClick={() => setPending(null)}>{t("Annuler", "Cancel")}</Button>
            </div>
          </div>
        )}
        {answer && !pending && <p className={cx("rounded-xl p-2 text-sm", answer.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")} role="status" data-edit-answer={answer.ok ? "ok" : "no"}>{answer.text}</p>}
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
                <Badge tone={STATUS[stKey(p)]?.[2] ?? "neutral"}>{t(STATUS[stKey(p)]?.[0] ?? p.status, STATUS[stKey(p)]?.[1] ?? p.status)}</Badge>
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

// ------------------------------------------------------------------ statistiques

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

/**
 * Aperçu de la publication telle qu'elle apparaîtra : compte, visuel complet (à sa taille, sans recadrage), légende et
 * hashtags. Plusieurs médias : flèches pour les parcourir. « Agrandir » ouvre le visuel en grand.
 */
function PostPreview({ media, caption, hashtags, network }: { media: AssetView[]; caption: string; hashtags: string; network: string }) {
  const t = useT();
  const { data } = useProject();
  const [i, setI] = useState(0);
  const m = media[Math.min(i, media.length - 1)];
  const name = data?.brand?.name ?? data?.project.name ?? "";
  const tags = hashtags.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card" data-post-preview>
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-paper-2 p-1">{data?.logoUrl ? <img src={data.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : null}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted"><Dot n={network} /> {NET[network]?.label}</span>
      </div>
      <div className="relative bg-paper-2">
        {!m ? (
          <div className="grid aspect-square place-items-center text-sm text-muted">{t("Aucun média", "No media")}</div>
        ) : m.kind === "video" ? (
          <video key={m.id} src={m.url} controls playsInline className="mx-auto block max-h-[62vh] w-full bg-black object-contain" />
        ) : (
          <img key={m.id} src={m.url} alt={t("Visuel de la publication", "Post visual")} className="mx-auto block max-h-[62vh] w-full object-contain" />
        )}
        {media.length > 1 && (
          <>
            <button type="button" onClick={() => setI((x) => (x - 1 + media.length) % media.length)} className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow" aria-label={t("Média précédent", "Previous media")}><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => setI((x) => (x + 1) % media.length)} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-card/90 shadow" aria-label={t("Média suivant", "Next media")}><ChevronRight className="size-4" /></button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{Math.min(i, media.length - 1) + 1} / {media.length}</span>
          </>
        )}
      </div>
      <div className="grid gap-1.5 px-3 py-3 text-sm">
        <p className="whitespace-pre-line break-words"><span className="font-semibold">{name}</span> {caption}</p>
        {tags && <p className="break-words text-signal">{tags}</p>}
        {m && <a href={m.url} target="_blank" rel="noreferrer" className="justify-self-start text-xs text-muted underline-offset-2 hover:underline">{t("Agrandir le visuel", "Enlarge the visual")}</a>}
      </div>
    </div>
  );
}

function PostEditorV2({ postId, data, onClose, onChanged }: { postId: string; data: Data; onClose: () => void; onChanged: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const base = `/api/projects/${id}/social/v2/posts/${postId}`;
  const { data: v, reload } = useApi<{ post: PostV; attempts: { attempt: number; started_at: number; outcome: string; detail: string }[]; platform: { label: string; captionMax: number; hashtags: [number, number]; level: string; formats: string[] }; variants?: { id: string; network: string; label: string; format: string; status: string; blocking: string[] }[] }>(base);
  const tz = data.timezone || "Europe/Paris";
  const [f, setF] = useState<{ title: string; caption: string; editorial?:Editorial; hashtags: string; link: string; date: string; time: string; media: AssetView[]; network: string; connectionId: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (v && !f) setF({ title: v.post.title, caption: v.post.caption,editorial:v.post.editorial??undefined, hashtags: v.post.hashtags, link: v.post.link ?? "", date: v.post.scheduledAt ? formatInTimeZone(v.post.scheduledAt, tz, "yyyy-MM-dd") : "", time: v.post.scheduledAt ? formatInTimeZone(v.post.scheduledAt, tz, "HH:mm") : "10:00", media: v.post.media, network: v.post.network, connectionId: v.post.connectionId ?? "" });
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
    const r = await api<{ reapproval: boolean }>(base, { method: "PATCH", body: { title: f.title, caption: f.caption,editorial:f.editorial, hashtags: f.hashtags, link: f.link || null, media: f.media.map((m) => m.id), scheduledAt: f.date ? fromZonedTime(`${f.date}T${f.time}:00`, tz).getTime() : undefined, network: f.network, connectionId: f.connectionId || null } });
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
    <Modal open onClose={onClose} title={t("Publication", "Post")} xl>
      <div className="grid min-w-0 grid-cols-1 gap-4" data-post-editor>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Dot n={p.network} /> {NET[p.network]?.label} · {p.format}
          <Badge tone={STATUS[stKey(p)]?.[2] ?? "neutral"}>{t(STATUS[stKey(p)]?.[0] ?? p.status, STATUS[stKey(p)]?.[1] ?? p.status)}</Badge>
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
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-0">
          <p className="mb-1.5 text-sm font-medium">{t("Aperçu de la publication", "Post preview")}</p>
          <PostPreview media={f.media} caption={f.caption} hashtags={f.hashtags} network={f.network} />
        </div>
        <div className="grid min-w-0 content-start gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Titre", "Title")} htmlFor="pe-title"><Input id="pe-title" disabled={locked} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label={t("Réseau", "Network")} htmlFor="pe-net"><Select id="pe-net" disabled={locked} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}>{Object.entries(NET).map(([k, n]) => <option key={k} value={k}>{n.label}</option>)}</Select></Field>
        </div>
        {!!f.editorial?.blocks?.length&&<section className="grid gap-2" data-edit-editorial-blocks>
          <p className="text-sm font-medium">{t("Contenu des visuels", "Visual content")}</p>
          <p className="text-xs text-muted">{t("Modifier ce contenu exige une nouvelle version du visuel ; les images actuelles restent conservées.","Changing this content requires a new visual version; current images are preserved.")}</p>
          {f.editorial.blocks.map((block,i)=><Field key={i} label={t(`Bloc ${i+1}`,`Block ${i+1}`)} htmlFor={`editorial-block-${i}`}><Textarea id={`editorial-block-${i}`} value={block.text} disabled={locked||!!f.editorial?.testimonial} onChange={e=>setF({...f,editorial:{...f.editorial,blocks:f.editorial!.blocks!.map((b,n)=>n===i?{...b,text:e.target.value}:b)}})} /></Field>)}
        </section>}
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
                <AssetThumb a={m} className="size-20 rounded-xl" />
                {!locked && <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button type="button" className="rounded bg-card/90 p-0.5" onClick={() => moveMedia(i, -1)} aria-label={t("Avant", "Earlier")}><ArrowUp className="size-3 -rotate-90" /></button>
                  <button type="button" className="rounded bg-card/90 p-0.5 text-bad" onClick={() => setF({ ...f, media: f.media.filter((x) => x.id !== m.id) })} aria-label={t("Retirer", "Remove")}><X className="size-3" /></button>
                  <button type="button" className="rounded bg-card/90 p-0.5" onClick={() => moveMedia(i, 1)} aria-label={t("Après", "Later")}><ArrowDown className="size-3 -rotate-90" /></button>
                </div>}
              </div>
            ))}
            {!locked && <button type="button" onClick={() => setPicker(true)} className="grid size-20 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">{t("+ Média", "+ Media")}</button>}
          </div>
          <MediaPicker open={picker} onClose={() => setPicker(false)} multiple kinds={["image", "video"]} onPick={(as) => (setF({ ...f, media: [...f.media, ...as].slice(0, 10) }), setPicker(false))} />
          {!locked && <PostVisualMaker postId={p.id} ai={!!data.ai} hasMedia={f.media.length > 0} onDone={async () => (setF(null), await refresh())} />}
        </div>
        </div>
        </div>
        {!locked && (
          <div className="flex flex-wrap gap-2">
            <Button variant="signal" loading={busy} onClick={save} data-action="save-post">{t("Enregistrer", "Save")}</Button>
            <Button variant="secondary" loading={busy} onClick={() => action("approve")} data-action="approve-post">{t("Approuver cette version", "Approve this version")}</Button>
            {p.status === "scheduled" || p.status === "paused" ? <Button variant="secondary" onClick={() => action("unschedule")}>{t("Déprogrammer", "Unschedule")}</Button> : <Button variant="secondary" disabled={!data.canPublish} onClick={() => action("schedule")} data-action="schedule-post">{t("Programmer", "Schedule")}</Button>}
            <Button variant="secondary" disabled={!data.canPublish} onClick={() => action("publish_now")}>{t("Publier maintenant", "Publish now")}</Button>
            <Button variant="secondary" icon={<Copy className="size-4" />} onClick={() => action("duplicate")}>{t("Dupliquer", "Duplicate")}</Button>
            {f.media.length > 0 && (
              <Select
                value=""
                disabled={busy}
                aria-label={t("Dupliquer dans un autre format", "Duplicate in another format")}
                className="h-10 w-auto"
                data-action="duplicate-format"
                onChange={(e) => {
                  const aspect = e.target.value;
                  if (!aspect) return;
                  void run(async () => {
                    await api(base, { body: { action: "duplicate_format", aspect } });
                    toast("ok", t(`Copie au format ${aspect} créée (gratuit) : à relire dans le calendrier.`, `${aspect} copy created (free): review it in the calendar.`));
                    onChanged();
                  });
                }}
              >
                <option value="">{t("Dupliquer dans un autre format…", "Duplicate in another format…")}</option>
                <option value="4:5">{t("Portrait 4:5", "Portrait 4:5")}</option>
                <option value="1:1">{t("Carré 1:1", "Square 1:1")}</option>
                <option value="9:16">{t("Story 9:16", "Story 9:16")}</option>
                <option value="16:9">{t("Paysage 16:9", "Landscape 16:9")}</option>
              </Select>
            )}
            <Button variant="secondary" icon={<Trash2 className="size-4" />} onClick={() => action("delete")}>{t("Supprimer", "Delete")}</Button>
          </div>
        )}
        {p.remoteUrl && <a className="text-sm underline" href={p.remoteUrl} target="_blank" rel="noreferrer">{t("Voir sur le réseau", "View on the network")}</a>}
        {(v.variants?.length ?? 0) > 0 && (
          <div className="grid gap-1.5 rounded-2xl border border-line p-3 text-sm" data-variants>
            <p className="font-medium">{t("Le même contenu, adapté pour", "The same content, adapted for")}</p>
            {v.variants!.map((x) => (
              <p key={x.id} className="flex flex-wrap items-center gap-2">
                <Dot n={x.network} /> {x.label} <span className="text-xs text-muted">({x.format})</span>
                <Badge tone={STATUS[x.status]?.[2] ?? "neutral"}>{t(STATUS[x.status]?.[0] ?? x.status, STATUS[x.status]?.[1] ?? x.status)}</Badge>
                {x.blocking.length > 0 && <span className="basis-full text-xs text-warn">{x.blocking[0]}</span>}
              </p>
            ))}
          </div>
        )}
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

// ------------------------------------------------------------------ choix du visuel

/** Visuel d'UNE publication : le client choisit (gratuit / image IA / publication entièrement IA), voit le prix, accepte. */
function PostVisualMaker({ postId, ai, hasMedia, onDone }: { postId: string; ai: boolean; hasMedia: boolean; onDone: () => Promise<void> }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [mode, setMode] = useState<VisualMode>("free");
  const [busy, setBusy] = useState(false);
  const [est, setEst] = useState<{ estimateMicro: number; capMicro?: number; paid: number; notes: string[] } | null>(null);
  const budget = useBudgetPct();
  const url = `/api/projects/${id}/social/v2`;
  const go = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const make = () => go(async () => {
    if (mode === "free") {
      const r = await api<{ produced: number; notes: string[] }>(url, { body: { action: "produce", ids: [postId], allowPaid: false, replace: true } });
      toast(r.produced ? "ok" : "bad", r.produced ? t("Visuel créé gratuitement.", "Visual created for free.") : (r.notes[0] ?? t("Aucun visuel créé.", "No visual created.")));
      await onDone();
      return;
    }
    setEst(await api(url, { body: { action: "estimate", ids: [postId], replace: true, ...visualParams(mode) } }));
  });
  const accept = () => go(async () => {
    if (!est) return;
    // Plafond de la tâche : reprises comprises (seul le coût réel est décompté).
    const cap = Math.ceil((est.capMicro ?? est.estimateMicro) / 10_000) / 100;
    await api(url, { body: { action: "produce", ids: [postId], replace: true, ...visualParams(mode), maxCostEur: cap, approvedEstimateMicro: est.estimateMicro } });
    toast("ok", t("C'est lancé : le visuel arrive dans quelques minutes (suivi en haut de l'onglet).", "Started: the visual arrives in a few minutes (progress at the top of the tab)."));
    setEst(null);
    await onDone();
  });
  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-line p-3" data-post-visual>
      <p className="text-sm font-semibold">{hasMedia ? t("Refaire le visuel de cette publication", "Remake this post's visual") : t("Créer le visuel de cette publication", "Create this post's visual")}</p>
      <VisualChoice value={mode} onChange={(m) => (setMode(m), setEst(null))} ai={ai} name={`visual-mode-${postId}`} />
      {hasMedia && <p className="text-xs text-muted">{t("Le visuel actuel est remplacé ; il reste dans votre bibliothèque.", "The current visual is replaced; it stays in your library.")}</p>}
      {!est ? (
        <div><Button size="sm" variant="signal" loading={busy} disabled={mode !== "free" && !ai} onClick={make} data-action="post-visual">{mode === "free" ? t("Créer le visuel (gratuit)", "Create the visual (free)") : t("Voir le prix", "See the price")}</Button></div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>{t(`Coût probable : ${budget.label(est.estimateMicro)} (une reprise éventuelle est décomptée et annoncée).`, `Likely cost: ${budget.label(est.estimateMicro)} (any redo is counted and announced).`)}</span>
          {est.notes.map((n) => <span key={n} className="text-warn">{n}</span>)}
          <Button size="sm" variant="signal" loading={busy} disabled={!est.paid} onClick={accept} data-action="post-visual-accept">{t("J'accepte et je lance", "I accept, start")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEst(null)}>{t("Annuler", "Cancel")}</Button>
        </div>
      )}
    </div>
  );
}
