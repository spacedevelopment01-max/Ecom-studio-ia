"use client";
/**
 * « Version animée » d'une publication ou d'une publicité : le studio en fait une courte vidéo (titre qui arrive,
 * bouton qui bat, photo qui avance), gratuite et sans IA, rangée dans la bibliothèque (Vidéos › Réseaux sociaux).
 */
import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { api, Button, Select, useToast } from "../ui";
import { useT } from "../i18n";
import { MusicChoice } from "./music-choice";

export function AnimatePost({ projectId, docKey, compact, onDone }: { projectId: string; docKey: string; compact?: boolean; onDone?: () => void }) {
  const t = useT();
  const toast = useToast();
  const [style, setStyle] = useState<"pop" | "slide" | "zoom">("pop");
  const [music, setMusic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      const r = await api<{ animated: { url: string } }>(`/api/projects/${projectId}/ads/docs/${encodeURIComponent(docKey)}`, { body: { action: "animate", style, music } });
      setUrl(r.animated.url);
      toast("ok", t("Version animée créée (Bibliothèque › Vidéos › Réseaux sociaux).", "Animated version created (Library › Videos › Social media)."));
      onDone?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2" data-animate-post>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={style} onChange={(e) => setStyle(e.target.value as typeof style)} className="h-8 w-auto text-xs" aria-label={t("Animation", "Animation")}>
          <option value="pop">{t("Arrivée + bouton qui bat", "Entrance + pulsing button")}</option>
          <option value="slide">{t("Titre qui glisse", "Sliding headline")}</option>
          <option value="zoom">{t("Zoom d'ouverture", "Opening zoom")}</option>
        </Select>
        <MusicChoice value={music} onChange={setMusic} compact />
        <Button size="sm" variant="secondary" icon={<Clapperboard className="size-3.5" />} onClick={run} disabled={busy}>{busy ? t("Animation en cours…", "Animating…") : compact ? t("Animer", "Animate") : t("Créer la version animée (vidéo)", "Create the animated version (video)")}</Button>
      </div>
      {url && <video src={url} className="max-h-72 w-full rounded-xl bg-paper-2 object-contain" autoPlay loop muted playsInline controls />}
      {!compact && <p className="text-[11px] text-muted">{t("Vidéo de 7 s pour les réseaux (Reels, Stories, fil) : titre qui arrive, bouton qui bat, photo qui avance. Gratuit, sans IA.", "7-second video for social (Reels, Stories, feed): headline entrance, pulsing button, photo push-in. Free, no AI.")} {music ? t("Avec la musique du studio (droits inclus).", "With the studio's music (rights included).") : t("Sans musique.", "No music.")}</p>}
    </div>
  );
}
