"use client";
/**
 * Médias de l'accueil : la vidéo d'entrée (film « Comment ça marche », fichier inchangé) et la démonstration
 * « Comment ça fonctionne » en quatre étapes, illustrée par les films explicatifs existants.
 */
import { useEffect, useRef, useState } from "react";
import { Check, FileText, ImageIcon, Link2, Pause, Play, Volume2 } from "lucide-react";
import { cx } from "../ui";
import { useLang, useT } from "../i18n";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Vidéo d'entrée : lue en silence quand elle est visible (en pause hors écran), bouton « Avec le son » qui la relance
 * depuis le début, bouton pause / lecture, et affichage de secours (image + lien) si le fichier ne se charge pas.
 * Mouvement réduit demandé : pas de lecture automatique, la vidéo attend un clic.
 */
export function HeroFilm({ src, poster, description }: { src: string; poster: string; description: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const t = useT();
  const [sound, setSound] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const userPaused = useRef(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Erreur survenue avant que la page soit interactive (fichier absent, format non lu) : affichage de secours.
    if (v.error) return setFailed(true);
    if (reduced()) {
      v.pause();
      v.controls = true;
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !userPaused.current) v.play().catch(() => {});
      else if (!e.isIntersecting) v.pause();
    }, { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const withSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.loop = false;
    v.currentTime = 0;
    v.controls = true;
    userPaused.current = false;
    setSound(true);
    v.play().catch(() => {});
  };
  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };
  if (failed) {
    return (
      <div className="relative aspect-video w-full bg-[#070B17]">
        <img src={poster} alt={description} className="size-full object-cover" />
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black/65 px-4 py-3 text-sm text-white backdrop-blur">
          <span>{t("La vidéo n'a pas pu être chargée.", "The video could not be loaded.")}</span>
          <a href={src} className="font-semibold underline underline-offset-4">{t("Ouvrir la vidéo", "Open the video")}</a>
        </div>
      </div>
    );
  }
  return (
    <div className="relative">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={!sound}
        loop={!sound}
        playsInline
        preload="metadata"
        aria-label={description}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        className="aspect-video w-full bg-[#070B17] object-cover"
      />
      {!sound && (
        <div className="absolute right-2.5 top-2.5 z-10 flex gap-2 sm:right-4 sm:top-4">
          <button type="button" onClick={togglePlay} aria-label={playing ? t("Mettre la vidéo en pause", "Pause the video") : t("Lire la vidéo", "Play the video")} className="grid size-10 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/70 sm:size-11">
            {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          </button>
          <button type="button" onClick={withSound} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-[#2F4BD8] px-4 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 sm:h-11">
            <Volume2 className="size-4" aria-hidden /> {t("Avec le son", "With sound")}
          </button>
        </div>
      )}
    </div>
  );
}

type Step = { title: string; text: string; video: string; poster: string };

/**
 * « Comment ça fonctionne » : quatre étapes qui se suivent toutes seules quand la section est visible
 * (un clic sur une étape arrête l'enchaînement). Chaque étape montre un film explicatif réel du studio
 * et, par-dessus, ce que fait le client à cette étape.
 */
export function HowItWorks({ steps }: { steps: Step[] }) {
  const t = useT();
  const { lang } = useLang();
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  useEffect(() => {
    if (reduced()) setAuto(false);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    vids.current.forEach((v, k) => {
      if (!v) return;
      if (k === i && visible && !reduced()) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else v.pause();
    });
  }, [i, visible]);
  useEffect(() => {
    if (!auto || !visible) return;
    const id = window.setTimeout(() => setI((k) => (k + 1) % steps.length), 6500);
    return () => window.clearTimeout(id);
  }, [auto, visible, i, steps.length]);
  const choose = (k: number) => {
    setAuto(false);
    setI(k);
  };
  const overlays = [
    // 1. Ce que le client donne
    <div key="0" className="flex flex-wrap gap-2">
      {[
        [ImageIcon, t("Une photo", "A photo")],
        [Link2, t("Un lien", "A link")],
        [FileText, t("Une description", "A description")],
      ].map(([Icon, l]: any, k) => (
        <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line">
          <Icon className="size-3.5" aria-hidden /> {l}
        </span>
      ))}
    </div>,
    // 2. Ce que le studio prépare
    <ul key="1" className="grid gap-1.5 text-[13px] font-medium text-ink sm:grid-cols-2">
      {[t("Analyse du produit", "Product analysis"), t("Marque et logo", "Brand and logo"), t("Boutique", "Store"), t("Images, textes, publications", "Images, copy, posts")].map((l, k) => (
        <li key={k} className="flex items-center gap-2"><Check className="size-3.5 text-signal" aria-hidden /> {l}</li>
      ))}
    </ul>,
    // 3. Le client garde la main
    <div key="2" className="text-[13px] text-ink">
      <p className="font-semibold">{t("« Ce bouton en noir, uniquement lui »", "\"Make this button black, only this one\"")}</p>
      <p className="mt-1 text-muted">{t("Seul l'élément désigné change · version restaurable", "Only the chosen element changes · restorable version")}</p>
    </div>,
    // 4. Utilisation
    <div key="3" className="flex flex-wrap gap-2">
      {[t("Boutique en ligne", "Online store"), t("Publications validées", "Approved posts"), t("Publicités", "Ads")].map((l, k) => (
        <span key={k} className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line">{l}</span>
      ))}
    </div>,
  ];
  return (
    <div ref={root} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
      <ol className="grid min-w-0 gap-2" aria-label={t("Les quatre étapes", "The four steps")}>
        {steps.map((s, k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => choose(k)}
              aria-current={k === i ? "step" : undefined}
              className={cx("group relative w-full cursor-pointer overflow-hidden rounded-2xl border p-4 text-left transition sm:p-5", k === i ? "border-line bg-card hp-elev" : "border-transparent hover:bg-card/60")}
            >
              <span className="flex items-start gap-4">
                <span className={cx("grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-semibold transition", k === i ? "bg-signal text-signal-ink" : "bg-paper-2 text-muted")}>{k + 1}</span>
                <span className="min-w-0">
                  <span className={cx("block font-display text-lg font-semibold leading-snug sm:text-xl", k === i ? "text-ink" : "text-ink-2")}>{s.title}</span>
                  <span className={cx("grid transition-[grid-template-rows] duration-500", k === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                    <span className="overflow-hidden">
                      <span className="block pt-2 text-[15px] leading-relaxed text-ink-2">{s.text}</span>
                    </span>
                  </span>
                </span>
              </span>
              {k === i && auto && visible && <span key={`${i}-${lang}`} className="hp-fill absolute inset-x-0 bottom-0 h-0.5 bg-signal" style={{ ["--dur" as any]: "6.5s" }} aria-hidden />}
            </button>
          </li>
        ))}
      </ol>
      <div className="relative mx-auto w-full min-w-0 max-w-[30rem] lg:mr-0">
        <div className="hp-window">
          <div className="hp-window-bar">
            <span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" />
            <span className="ml-2 truncate text-xs text-muted">{t(`Étape ${i + 1} sur ${steps.length}`, `Step ${i + 1} of ${steps.length}`)} · {steps[i].title}</span>
          </div>
          <div className="relative aspect-square w-full bg-[#070B17]">
            {steps.map((s, k) => (
              <video
                key={s.video}
                ref={(el) => void (vids.current[k] = el)}
                src={s.video}
                poster={s.poster}
                muted
                loop
                playsInline
                preload={k === 0 ? "metadata" : "none"}
                aria-hidden={k !== i}
                aria-label={s.title}
                className={cx("absolute inset-0 size-full object-cover transition-opacity duration-700", k === i ? "opacity-100" : "opacity-0")}
              />
            ))}
          </div>
          <div className="border-t border-line bg-paper-2/60 px-4 py-3.5 sm:px-5">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-muted">{[t("Ce que vous donnez", "What you provide"), t("Ce que le studio prépare", "What the studio prepares"), t("Ce que vous décidez", "What you decide"), t("Ce que vous obtenez", "What you get")][i]}</p>
            <div key={i} className="[animation:hp-rise_.45s_cubic-bezier(.16,1,.3,1)_both]">{overlays[i]}</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">{t("Films explicatifs réalisés avec le studio, sans voix.", "Explainer films made with the studio, without voice-over.")}</p>
      </div>
    </div>
  );
}
