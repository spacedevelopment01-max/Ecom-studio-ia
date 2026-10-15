"use client";
/**
 * Vidéo guidée (Publications › Publication vidéo, Publicités › Publicité vidéo) : le client choisit le produit ou le
 * service, décrit son idée (avec les idées de prompts), puis le format, la durée totale et le nombre de scènes.
 * Produit : images de départ par l'IA (Qwen) + mouvement par Wan 2.6 ; service : plans libres de droits liés au
 * métier. Montage du studio (titres, logo, musique). Prix affiché avant, rien ne part sans le clic du client.
 */
import { useEffect, useRef, useState } from "react";
import { Clapperboard, Download, Wand2 } from "lucide-react";
import { api, Button, Card, cx, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { useProject } from "./project-context";
import { JobProgress, SectionTitle, useActive } from "./common";
import { formatEur } from "../billing-client";
import { SubjectPicker, subjectChoice, type SubjectView } from "./subject-picker";
import { MusicChoice } from "./music-choice";

type Quote = { mode: "ai" | "stock"; allowed: boolean; reason: string | null; estimateMicro: number; scenes: number; totalS: number; clipS: number };
type VideoItem = { id: string; url: string; aspect: string | null; durationS: number | null; as: "post" | "ad"; mode: string | null; subject: string | null; request: string | null; at: number };
type Data = { videos: VideoItem[]; ai: boolean; subjects: SubjectView[]; limits: { scenes: [number, number]; totalS: [number, number] } };
const ASPECTS = [
  { v: "9:16", fr: "Vertical 9:16 (Reels, TikTok, Stories)", en: "Vertical 9:16 (Reels, TikTok, Stories)" },
  { v: "4:5", fr: "Portrait 4:5 (fil d'actualité)", en: "Portrait 4:5 (feed)" },
  { v: "1:1", fr: "Carré 1:1", en: "Square 1:1" },
  { v: "16:9", fr: "Paysage 16:9 (YouTube, site)", en: "Landscape 16:9 (YouTube, website)" },
] as const;
const DURATIONS = [10, 15, 20, 30, 45, 60];
const eur = (micro: number, lang: "fr" | "en") => formatEur(Math.max(0.01, Math.ceil(micro / 1e4) / 100), lang);

export function GuidedVideo({ as }: { as: "post" | "ad" }) {
  const { id } = useProject();
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data, reload } = useApi<Data>(`/api/projects/${id}/creative/video`);
  const jobs = useActive("video.scenes");
  const subjects = data?.subjects ?? [];
  const [subjectKey, setSubjectKey] = useState("");
  const [request, setRequest] = useState("");
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]["v"]>("9:16");
  const [totalS, setTotalS] = useState(15);
  const [scenes, setScenes] = useState(3);
  const [music, setMusic] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!subjectKey && subjects[0]) setSubjectKey(subjects[0].key);
  }, [subjects, subjectKey]);
  const subject = subjectChoice(subjects.find((s) => s.key === subjectKey) ?? subjects[0]);
  // Prix recalculé à chaque réglage (format, durée, scènes, produit ou service).
  useEffect(() => {
    if (!subjects.length) return;
    let off = false;
    setQuote(null);
    api<Quote>(`/api/projects/${id}/creative/video`, { body: { action: "quote", as, subject, aspect, totalS, scenes } })
      .then((q) => !off && setQuote(q))
      .catch(() => !off && setQuote(null));
    return () => {
      off = true;
    };
  }, [id, as, subjectKey, aspect, totalS, scenes, subjects.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = jobs.length > 0;
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) reload();
    was.current = running;
  }, [running, reload]);
  const create = async () => {
    if (!quote?.allowed) return;
    setBusy(true);
    try {
      await api(`/api/projects/${id}/creative/video`, { body: { action: "create", as, subject, request: request.trim() || undefined, aspect, totalS, scenes, music, approvedEstimateMicro: quote.estimateMicro } });
      toast("ok", t("Vidéo en préparation : elle apparaît ici dès qu'elle est prête.", "Video being prepared: it appears here as soon as it's ready."));
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const videos = (data?.videos ?? []).filter((v) => v.as === as);
  const perScene = Math.round(((totalS - 2.5) / scenes) * 10) / 10;
  return (
    <section className="mb-8" data-guided-video={as}>
      <SectionTitle title={as === "ad" ? t("Publicité vidéo guidée", "Guided video ad") : t("Publication vidéo guidée", "Guided video post")}>
        {t("Choisissez le produit ou le service, décrivez votre idée, puis le format, la durée et le nombre de scènes. Produit : scènes créées par l'IA à partir de votre vrai produit ; service : plans réels de votre métier.", "Pick the product or service, describe your idea, then the format, length and number of scenes. Product: scenes made by AI from your real product; service: real footage of your trade.")}
      </SectionTitle>
      <Card className="grid gap-5 p-5">
        {jobs[0] && <JobProgress job={jobs[0]} />}
        <SubjectPicker subjects={subjects} value={subjectKey} onChange={setSubjectKey} request={request} onRequest={setRequest} idPrefix={`video-${as}`} video surface={as === "ad" ? "ad_video" : "post_video"} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("Format", "Format")}</p>
            <div className="grid gap-1.5" role="radiogroup" aria-label={t("Format", "Format")}>
              {ASPECTS.map((a) => (
                <button key={a.v} type="button" role="radio" aria-checked={aspect === a.v} onClick={() => setAspect(a.v)} className={cx("rounded-xl border px-3 py-1.5 text-left text-sm", aspect === a.v ? "border-ink bg-paper-2" : "border-line")} data-video-aspect={a.v}>
                  {t(a.fr, a.en)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("Durée totale", "Total length")}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Durée totale", "Total length")}>
              {DURATIONS.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={totalS === d} onClick={() => setTotalS(d)} className={cx("rounded-full border px-3 py-1.5 text-sm", totalS === d ? "border-ink bg-ink text-paper" : "border-line")} data-video-duration={d}>
                  {d} s
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">{t("Nombre de scènes", "Number of scenes")}</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("Nombre de scènes", "Number of scenes")}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={scenes === n} onClick={() => setScenes(n)} className={cx("size-9 rounded-full border text-sm", scenes === n ? "border-ink bg-ink text-paper" : "border-line")} data-video-scenes={n}>
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">{t(`≈ ${perScene} s par scène, puis la carte de fin avec votre logo.`, `≈ ${perScene} s per scene, then the end card with your logo.`)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">{t("Musique", "Music")}</p>
          <MusicChoice value={music} onChange={setMusic} />
          <p className="text-xs text-muted">{music ? t("Morceau composé par le studio dans le style de votre marque (droits inclus).", "Track composed by the studio in your brand's style (rights included).") : t("Vidéo sans musique.", "Video without music.")}</p>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between" data-video-price>
          <p className="text-sm">
            {!quote ? t("Calcul du prix…", "Calculating the price…") : !quote.allowed ? <span className="text-warn">{quote.reason}</span> : quote.estimateMicro === 0 ? <span className="font-medium text-ok">{t("Gratuit : plans libres de droits de votre métier, montés par le studio.", "Free: royalty-free footage of your trade, edited by the studio.")}</span> : t(<>Coût maximal : <strong>{eur(quote.estimateMicro, lang)}</strong> ({quote.mode === "ai" ? `${quote.scenes} image${quote.scenes > 1 ? "s" : ""} + ${quote.scenes} plan${quote.scenes > 1 ? "s" : ""} Wan 2.6` : "contrôle des plans"}), pris sur le budget IA du projet.</>, <>Maximum cost: <strong>{eur(quote.estimateMicro, lang)}</strong> ({quote.mode === "ai" ? `${quote.scenes} image${quote.scenes > 1 ? "s" : ""} + ${quote.scenes} Wan 2.6 shot${quote.scenes > 1 ? "s" : ""}` : "shot checks"}), taken from the project's AI budget.</>)}
          </p>
          <Button onClick={create} loading={busy} disabled={busy || running || !quote?.allowed || !subjects.length} icon={<Wand2 className="size-4" />} data-guided-video-submit>
            {as === "ad" ? t("Créer la publicité vidéo", "Create the video ad") : t("Créer la vidéo", "Create the video")}
            {quote?.allowed && quote.estimateMicro > 0 ? ` · ${eur(quote.estimateMicro, lang)}` : ""}
          </Button>
        </div>
      </Card>
      {videos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-guided-videos>
          {videos.map((v) => (
            <Card key={v.id} className="overflow-hidden p-0">
              <video src={v.url} controls playsInline preload="metadata" className="w-full bg-ink" style={{ aspectRatio: (v.aspect ?? "9:16").replace(":", " / ") }} />
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-xs text-muted" title={v.request ?? ""}>
                  <Clapperboard className="mr-1 inline size-3.5" />
                  {v.subject ?? "—"} · {v.aspect} · {v.durationS ? `${Math.round(v.durationS)} s` : ""}
                </p>
                <a href={`${v.url}?download=1`} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 hover:bg-paper-2" download>
                  <Download className="size-3.5" /> MP4
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
