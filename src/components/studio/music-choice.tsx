"use client";
/** Choix du client pour toute vidéo : avec la musique composée par le studio (droits inclus) ou sans musique. */
import { Music, VolumeX } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../i18n";

export function MusicChoice({ value, onChange, compact }: { value: boolean; onChange: (v: boolean) => void; compact?: boolean }) {
  const t = useT();
  const opts = [
    { v: true, label: t("Avec musique", "With music"), icon: <Music className="size-3.5" /> },
    { v: false, label: t("Sans musique", "No music"), icon: <VolumeX className="size-3.5" /> },
  ];
  return (
    <div className={cx("inline-flex rounded-full border border-line p-0.5", compact ? "text-xs" : "text-sm")} role="radiogroup" aria-label={t("Musique", "Music")} data-music-choice>
      {opts.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={cx("inline-flex items-center gap-1.5 rounded-full px-3", compact ? "h-7" : "h-9", value === o.v ? "bg-ink text-paper" : "text-ink-2")} data-music={o.v ? "on" : "off"}>
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
