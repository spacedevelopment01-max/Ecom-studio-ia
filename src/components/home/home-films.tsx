"use client";
/**
 * Vidéos de démonstration de l'accueil : une vidéo par démo (produits et services mêlés), regardées image par image
 * avant d'être retenues (src/components/home/demo-curation.ts, DEMO_FILMS). Format vertical, affiche tirée de la vidéo,
 * lecture au clic, sans le son par défaut (bouton pour l'activer).
 */
import { useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../i18n";

export type DemoFilm = { id: string; brand: string; kind: "products" | "services"; label: string; src: string; poster: string };

function Film({ f }: { f: DemoFilm }) {
  const t = useT();
  const v = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const toggle = () => {
    const el = v.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };
  return (
    <figure className="group min-w-0">
      <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_60px_-30px_rgba(0,0,0,.8)]">
        <video
          ref={v}
          src={f.src}
          poster={f.poster}
          muted={muted}
          playsInline
          loop
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label={t(`Vidéo de démonstration ${f.brand}`, `${f.brand} demo video`)}
          className="size-full object-cover"
        />
        <button type="button" onClick={toggle} aria-label={playing ? t(`Mettre en pause la vidéo ${f.brand}`, `Pause the ${f.brand} video`) : t(`Lire la vidéo ${f.brand}`, `Play the ${f.brand} video`)} className={cx("absolute inset-0 grid cursor-pointer place-items-center transition", playing ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "bg-black/10")}>
          <span className="grid size-14 place-items-center rounded-full bg-white/90 text-[#0B1533] shadow-lg">{playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5" aria-hidden />}</span>
        </button>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={!muted} aria-label={muted ? t("Activer le son", "Turn sound on") : t("Couper le son", "Mute")} className="absolute bottom-2 right-2 grid size-11 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur">
          {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
        </button>
        <span className={cx("absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold", f.kind === "services" ? "bg-[#DDF2E6] text-[#165C3A]" : "bg-[#E9EDFD] text-[#2F4BD8]")}>{f.kind === "services" ? t("Service", "Service") : t("Produit", "Product")}</span>
      </div>
      <figcaption className="mt-3">
        <span className="block font-display text-base font-semibold text-white">{f.brand}</span>
        <span className="block text-sm text-white/65">{f.label}</span>
      </figcaption>
    </figure>
  );
}

export function DemoFilms({ films }: { films: DemoFilm[] }) {
  if (!films.length) return null;
  return (
    <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {films.map((f) => (
        <div key={f.id} className="w-[62%] shrink-0 snap-start sm:w-auto">
          <Film f={f} />
        </div>
      ))}
    </div>
  );
}
