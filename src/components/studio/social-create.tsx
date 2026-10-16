"use client";
/**
 * Publications › Créer : une publication IMAGE ou une publication VIDÉO, avec ou sans IA, et les visuels des
 * publications déjà planifiées. Le prix s'affiche avant tout lancement payant ; rien ne part sans validation.
 */
import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { Clapperboard, ImageIcon, Sparkles, Wand2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Field, Input, Select, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { JobProgress, useActive, type AssetView } from "./common";
import { AiWait } from "../wait-time";
import { VisualChoice } from "./visual-choice";
import { useBudgetPct } from "../billing-client";
import { visualParams, type VisualMode } from "@/lib/social-v2/visual-mode";
import { BANK_IMAGE_ROLES } from "@/lib/media/bank";
import type { Data } from "./social-studio";
import { SubjectPicker, subjectChoice } from "./subject-picker";

type Kind = "image" | "video";
type VideoMode = "free" | "ai_video";
const NETS: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  tiktok: { label: "TikTok", color: "#111111" },
  youtube: { label: "YouTube", color: "#FF0000" },
  pinterest: { label: "Pinterest", color: "#E60023" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
};
const VIDEO_FORMATS = new Set(["video", "reel", "short"]);

/** Choix de la vidéo : montage gratuit du studio, ou plans filmés par l'IA (payant, prix affiché avant). */
export function VideoChoice({ value, onChange, ai, price }: { value: VideoMode; onChange: (m: VideoMode) => void; ai: boolean; price?: string }) {
  const t = useT();
  const options: [VideoMode, string, string, string][] = [
    ["free", t("Montage gratuit du studio", "Free studio edit"), t("Vos images et vos plans de la banque, montés en vidéo verticale à vos couleurs, avec titres animés et sous-titres.", "Your bank images and clips, edited into a vertical video in your colours, with animated titles and captions."), t("Gratuit", "Free")],
    ["ai_video", t("Plans filmés par l'IA", "AI-filmed shots"), t("L'IA filme des plans de votre activité ou de votre produit (sans personne inventée), puis le studio monte la vidéo.", "AI films shots of your business or product (no made-up people), then the studio edits the video."), price ?? t("Payant · prix affiché avant", "Paid · price shown first")],
  ];
  return (
    <fieldset className="grid gap-2" data-video-mode>
      <legend className="mb-1.5 text-sm font-medium">{t("Comment faire la vidéo ?", "How should the video be made?")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map(([v, label, help, badge]) => {
          const off = v !== "free" && !ai;
          return (
            <label key={v} className={cx("flex gap-3 rounded-2xl border p-3 text-sm", off ? "cursor-not-allowed opacity-55" : "cursor-pointer", value === v ? "border-ink bg-paper-2" : "border-line")}>
              <input type="radio" name="video-mode" value={v} checked={value === v} disabled={off} onChange={() => onChange(v)} className="mt-1" data-video-option={v} />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted">{help}</span>
                <span className={cx("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold", v === "free" ? "bg-ok-soft text-ok" : "bg-signal-soft text-signal")}>{badge}</span>
              </span>
            </label>
          );
        })}
      </div>
      {!ai && <p className="text-xs text-muted">{t("Les plans filmés par l'IA ne sont pas disponibles pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI-filmed shots aren't available for this project (Discovery plan, AI budget used up or provider disabled).")}</p>}
    </fieldset>
  );
}

/** Une publication : comment faire le visuel, où et quand, le message, l'image de la banque ; prix avant lancement. */
export function CreateOnePanel({ data, kind, reload, onCreated }: { data: Data; kind: Kind; reload: () => void; onCreated: () => void }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const [imageMode, setImageMode] = useState<VisualMode>("free");
  const [videoMode, setVideoMode] = useState<VideoMode>("free");
  const mode = kind === "image" ? imageMode : videoMode;
  const [nets, setNets] = useState<string[]>(kind === "video" ? ["instagram", "tiktok"] : ["instagram", "facebook"]);
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("11:30");
  const [pillar, setPillar] = useState("");
  const [headline, setHeadline] = useState("");
  const [bg, setBg] = useState("");
  const subjects = data.subjects ?? [];
  const [subjectKey, setSubjectKey] = useState(subjects[0]?.key ?? "");
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [quote, setQuote] = useState<number | null>(null);
  // Prix en % du budget IA du mois (même base que la jauge « Reste … % ») ; jamais en euros.
  const budget = useBudgetPct();
  const jobs = useActive(["social.v2"]);
  const { data: bank } = useApi<{ assets: AssetView[] }>(kind === "image" ? `/api/projects/${id}/files?role=${BANK_IMAGE_ROLES.join(",")}` : null);
  const images = (bank?.assets ?? []).filter((a) => a.kind === "image" && a.status !== "rejected").slice(0, 36);
  const usable = data.platforms.filter((pl) => (kind === "video" ? pl.formats.some((f) => VIDEO_FORMATS.has(f)) : pl.formats.some((f) => f === "image" || f === "carousel" || f === "pin")));
  // Prix demandé au studio dès qu'un choix payant est fait (une production par réseau choisi).
  useEffect(() => {
    if (mode === "free" || !nets.length) return setQuote(mode === "free" ? 0 : null);
    let off = false;
    setQuote(null);
    api<{ estimateMicro: number }>(`/api/projects/${id}/social/v2`, { body: { action: "quote_one", kind, mode, networks: nets.length } })
      .then((r) => !off && setQuote(r.estimateMicro))
      .catch(() => !off && setQuote(null));
    return () => {
      off = true;
    };
  }, [id, kind, mode, nets.length]);
  const create = async () => {
    if (!nets.length) return toast("bad", t("Choisissez au moins un réseau.", "Choose at least one network."));
    setBusy(true);
    try {
      const r = await api<{ ids: string[]; jobId?: string; produced?: number; notes?: string[]; warnings: string[] }>(`/api/projects/${id}/social/v2`, {
        body: { action: "create_one", kind, mode, date, time, timezone: data.timezone || "Europe/Paris", platforms: nets.map((platform) => ({ platform, connectionId: data.accounts.find((a) => a.provider === platform && a.status === "active")?.id ?? null })), pillar: pillar || undefined, headline: headline.trim() || undefined, ...(mode !== "free" ? { subject: subjectChoice(subjects.find((x) => x.key === subjectKey) ?? subjects[0]), request: request.trim() || undefined } : {}), approvedEstimateMicro: mode === "free" ? undefined : quote },
      });
      toast("ok", r.jobId ? t("Publication créée : son visuel se prépare avec l'IA, puis elle attend votre validation.", "Post created: its visual is being made with AI, then it waits for your approval.") : t(`Publication créée (${r.ids.length} réseau${r.ids.length > 1 ? "x" : ""}) : relisez-la puis validez-la.`, `Post created (${r.ids.length} network${r.ids.length > 1 ? "s" : ""}): review it, then approve it.`));
      for (const w of [...(r.warnings ?? []), ...(r.notes ?? [])].slice(0, 3)) toast("info", w);
      reload();
      onCreated();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const paid = mode !== "free";
  return (
    <Card className="grid gap-6 p-5 sm:p-7" data-create-one={kind}>
      {jobs.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-paper-2">{kind === "image" ? <ImageIcon className="size-5" /> : <Clapperboard className="size-5" />}</span>
        <div>
          <h3 className="font-display text-xl font-semibold">{kind === "image" ? t("Créer une publication image", "Create an image post") : t("Créer une publication vidéo", "Create a video post")}</h3>
          <p className="mt-1 text-sm text-muted">{kind === "image" ? t("Une publication prête à relire : texte adapté à chaque réseau et visuel à votre marque.", "A post ready to review: copy adapted to each network and a branded visual.") : t("Une vidéo courte (reel, TikTok, short) avec son texte, prête à relire.", "A short video (reel, TikTok, short) with its copy, ready to review.")}</p>
        </div>
      </div>
      <section className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("1 · Avec ou sans IA", "1 · With or without AI")}</p>
        {kind === "image" ? (
          <VisualChoice value={imageMode} onChange={setImageMode} ai={!!data.ai} name={`one-${kind}`} prices={quote && imageMode !== "free" ? { [imageMode]: t(`Payant · ${budget.label(quote)}`, `Paid · ${budget.label(quote)}`) } : undefined} />
        ) : (
          <VideoChoice value={videoMode} onChange={setVideoMode} ai={!!data.ai} price={quote && videoMode !== "free" ? t(`Payant · ${budget.label(quote)}`, `Paid · ${budget.label(quote)}`) : undefined} />
        )}
      </section>
      {paid && (
        <section className="grid gap-2" data-guided>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("Votre idée pour l'IA", "Your idea for the AI")}</p>
          <SubjectPicker subjects={subjects} value={subjectKey} onChange={setSubjectKey} request={request} onRequest={setRequest} idPrefix={`one-${kind}`} video={kind === "video"} />
        </section>
      )}
      <section className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("2 · Où et quand", "2 · Where and when")}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("Réseaux", "Networks")}>
          {usable.map((pl) => {
            const on = nets.includes(pl.id);
            return (
              <button key={pl.id} type="button" aria-pressed={on} data-net={pl.id} onClick={() => setNets(on ? nets.filter((n) => n !== pl.id) : [...nets, pl.id])} className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", on ? "border-ink bg-ink text-paper" : "border-line")}>
                <span className="size-2.5 rounded-full" style={{ background: NETS[pl.id]?.color ?? "#999" }} aria-hidden /> {pl.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t("Jour", "Day")} htmlFor={`one-date-${kind}`}><Input id={`one-date-${kind}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label={t("Heure", "Time")} htmlFor={`one-time-${kind}`}><Input id={`one-time-${kind}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Field label={t("Thème", "Theme")} htmlFor={`one-pillar-${kind}`}>
            <Select id={`one-pillar-${kind}`} value={pillar} onChange={(e) => setPillar(e.target.value)}>
              <option value="">{t("Choisi par la stratégie", "Chosen by the strategy")}</option>
              {data.strategy.pillars.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </Field>
        </div>
      </section>
      <section className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("3 · Le message (facultatif)", "3 · The message (optional)")}</p>
        <Field label={t("Titre de la publication", "Post headline")} htmlFor={`one-head-${kind}`}><Input id={`one-head-${kind}`} value={headline} maxLength={70} onChange={(e) => setHeadline(e.target.value)} placeholder={t("Laissé vide : le studio le propose d'après votre activité", "Left empty: the studio suggests it from your business")} /></Field>
      </section>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between" data-one-price>
        <p className="text-sm">
          {!paid ? <span className="font-medium text-ok">{t("Gratuit : aucun budget IA utilisé.", "Free: no AI budget used.")}</span> : quote == null ? t("Calcul du prix…", "Calculating the price…") : t(<>Coût probable : <strong>{budget.label(quote)}</strong> pour {nets.length} réseau{nets.length > 1 ? "x" : ""}. Si le contrôle demande une 2e image, elle est décomptée et vous êtes prévenu. Rien n'est lancé sans votre clic.</>, <>Likely cost: <strong>{budget.label(quote)}</strong> for {nets.length} network{nets.length > 1 ? "s" : ""}. If the check needs a 2nd image, it is counted and you are told. Nothing starts without your click.</>)}
        </p>
        <Button onClick={create} loading={busy} disabled={busy || !nets.length || (paid && quote == null)} icon={<Wand2 className="size-4" />} data-create-one-submit>
          {kind === "image" ? t("Créer la publication", "Create the post") : t("Créer la vidéo", "Create the video")}
          {paid && quote != null ? ` · ${budget.label(quote)}` : ""}
        </Button>
      </div>
    </Card>
  );
}

/** Visuels (ou vidéos) des publications déjà planifiées qui n'en ont pas encore : en une fois, avec ou sans IA. */
export function BatchVisuals({ data, kind, reload }: { data: Data; kind: Kind; reload: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [imageMode, setImageMode] = useState<VisualMode>("free");
  const [videoMode, setVideoMode] = useState<VideoMode>("free");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [est, setEst] = useState<{ posts: number; free: number; paid: number; estimateMicro: number; pct?: number | null; capPct?: number | null; notes: string[] } | null>(null);
  // Plafond en % du budget IA du mois (proposé : le coût probable avec la place des reprises).
  const [cap, setCap] = useState(5);
  const budget = useBudgetPct();
  const todo = useMemo(
    () => data.posts.filter((p) => p.media.length === 0 && ["planned", "draft", "failed"].includes(p.status) && (p.scheduledAt ?? 0) >= Date.now() - 3_600_000 && VIDEO_FORMATS.has(p.format) === (kind === "video")).sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0)).slice(0, 30).map((p) => p.id),
    [data.posts, kind],
  );
  const paid = kind === "image" ? imageMode !== "free" : videoMode !== "free";
  const params = kind === "image" ? visualParams(imageMode) : { allowPaid: videoMode !== "free" };
  const produceFree = async () => {
    setBusy(true);
    let produced = 0;
    try {
      setProgress({ done: 0, total: todo.length });
      for (let i = 0; i < todo.length; i += 3) {
        const r = await api<{ produced: number }>(`/api/projects/${id}/social/v2`, { body: { action: "produce", ids: todo.slice(i, i + 3), allowPaid: false } });
        produced += r.produced;
        setProgress({ done: Math.min(todo.length, i + 3), total: todo.length });
        reload();
      }
      toast("ok", kind === "image" ? t(`${produced} visuels préparés gratuitement.`, `${produced} visuals prepared for free.`) : t(`${produced} vidéos montées gratuitement.`, `${produced} videos edited for free.`));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  const estimate = async () => {
    setBusy(true);
    try {
      const e = await api<NonNullable<typeof est>>(`/api/projects/${id}/social/v2`, { body: { action: "estimate", ids: todo, ...params } });
      setEst(e);
      if (e.capPct != null) setCap(Math.min(100, Math.max(1, Math.ceil(e.capPct))));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const producePaid = async () => {
    if (!est) return;
    try {
      await api(`/api/projects/${id}/social/v2`, { body: { action: "produce", ids: todo, ...params, maxCostPct: cap, approvedEstimateMicro: est.estimateMicro } });
      toast("ok", t("Production lancée dans le plafond accepté.", "Production started within the accepted cap."));
      setEst(null);
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  return (
    <Card className="grid gap-4 p-5 sm:p-7" data-batch-visuals={kind}>
      <AiWait busy={busy && !!progress} label={t("Production en cours…", "Producing…")} waitKey="social-produce" expectedMs={60000} progress={progress ? progress.done / Math.max(1, progress.total) : undefined} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">{kind === "image" ? t("Publications planifiées sans visuel", "Planned posts without a visual") : t("Publications vidéo planifiées sans vidéo", "Planned video posts without a video")}</h3>
        <Badge tone={todo.length ? "warn" : "ok"}>{todo.length}</Badge>
      </div>
      {!todo.length ? (
        <p className="text-sm text-muted">{kind === "image" ? t("Toutes vos publications planifiées ont leur visuel.", "All your planned posts have their visual.") : t("Toutes vos publications vidéo planifiées ont leur vidéo.", "All your planned video posts have their video.")}</p>
      ) : (
        <>
          {kind === "image" ? <VisualChoice value={imageMode} onChange={(m) => (setImageMode(m), setEst(null))} ai={!!data.ai} name="batch-image" /> : <VideoChoice value={videoMode} onChange={(m) => (setVideoMode(m), setEst(null))} ai={!!data.ai} />}
          <div className="flex flex-wrap gap-2">
            {paid ? (
              <Button variant="signal" loading={busy} disabled={!data.ai} onClick={estimate} data-action="estimate">{t("Voir le prix avant de lancer", "See the price before starting")}</Button>
            ) : (
              <Button variant="signal" icon={<Sparkles className="size-4" />} loading={busy} onClick={produceFree} data-action="produce-free">{t(`Préparer gratuitement (${todo.length})`, `Prepare for free (${todo.length})`)}</Button>
            )}
          </div>
          {progress && <p className="text-sm text-muted" data-produce-progress>{t(`Production gratuite : ${progress.done} / ${progress.total}`, `Free production: ${progress.done} / ${progress.total}`)}</p>}
          {est && (
            <div className="rounded-2xl border border-line p-3 text-sm">
              <p>{t(`${est.posts} publications : ${est.free} gratuites, ${est.paid} payantes — coût probable ${budget.label(est.estimateMicro)}.`, `${est.posts} posts: ${est.free} free, ${est.paid} paid — likely cost ${budget.label(est.estimateMicro)}.`)}</p>
              {est.notes.map((n) => <p key={n} className="text-warn">{n}</p>)}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span>{t("Plafond", "Cap")}</span><Input type="number" min={0} max={100} value={cap} onChange={(e) => setCap(Number(e.target.value))} className="h-9 w-24" aria-label={t("Plafond en % du budget IA du mois", "Cap as % of the monthly AI budget")} /><span>{t("% du budget IA", "% of AI budget")}</span>
                <Button size="sm" variant="signal" disabled={cap < Math.ceil(est.capPct ?? 0)} onClick={producePaid}>{t("J'accepte et je lance", "I accept, start")}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
