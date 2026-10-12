"use client";
/**
 * Temps d'une préparation (IA ou moteur local), partout où le client attend : temps écoulé, temps restant estimé
 * (durée habituelle mesurée, corrigée par l'avancement), barre d'avancement. Une estimation est toujours dite
 * « environ » ; sans repère, on affiche seulement le temps écoulé.
 */
import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cx, Progress, Spinner } from "./ui";
import { useLang, useT } from "./i18n";
import { clock, remaining, roughly, type Estimate } from "@/lib/time-estimate";

/** Rafraîchit l'affichage chaque seconde tant que `active`. */
export function useTick(active: boolean) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

/** Heure de début d'une attente : posée quand `busy` devient vrai, effacée à la fin. */
export function useWaitStart(busy: boolean) {
  const [start, setStart] = useState<number | null>(null);
  useEffect(() => {
    setStart(busy ? Date.now() : null);
  }, [busy]);
  return start;
}

/** Ligne « ⏱ 0:42 · environ 1 min restante » (sous une barre d'avancement). */
export function TimeInfo({ startedAt, progress, estimate, paused, className }: { startedAt: number; progress: number; estimate?: Estimate; paused?: boolean; className?: string }) {
  const t = useT();
  const { lang } = useLang();
  useTick(!paused);
  const elapsed = Math.max(0, Date.now() - startedAt);
  const r = remaining(elapsed, progress, estimate);
  const rest =
    paused ? t("en pause", "paused")
    : r.kind === "remaining" ? t(`environ ${roughly(r.ms, "fr")} ${roughly(r.ms, "fr") === "1 min" ? "restante" : "restantes"}`, `about ${roughly(r.ms, "en")} left`)
    : r.kind === "almost" ? t("presque terminé", "almost done")
    : r.kind === "longer" ? t("un peu plus long que d'habitude", "taking a little longer than usual")
    : estimate ? "" : t("durée estimée en cours de calcul", "estimating the time");
  return (
    <p className={cx("flex flex-wrap items-center gap-x-1.5 text-xs text-muted tabular-nums", className)} data-wait-time>
      <Clock className="size-3.5" aria-hidden />
      <span>{t(`${clock(elapsed)} écoulées`, `${clock(elapsed)} elapsed`)}</span>
      {rest && <span aria-hidden>·</span>}
      {rest && <span>{rest}</span>}
      {estimate?.source === "history" && !paused && <span className="text-muted/80">({t(`d'habitude ${roughly(estimate.ms, "fr")}`, `usually ${roughly(estimate.ms, lang === "en" ? "en" : "fr")}`)})</span>}
    </p>
  );
}

/** Durées réelles des attentes directes, mémorisées dans ce navigateur (médiane des 7 dernières), sinon `fallback`. */
function learned(key: string, fallback: number): { ms: number; source: "history" | "default" } {
  try {
    const xs = JSON.parse(localStorage.getItem(`es-wait-${key}`) ?? "[]") as number[];
    if (xs.length >= 2) return { ms: [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)], source: "history" };
  } catch {}
  return { ms: fallback, source: "default" };
}
function remember(key: string, ms: number) {
  try {
    const xs = JSON.parse(localStorage.getItem(`es-wait-${key}`) ?? "[]") as number[];
    localStorage.setItem(`es-wait-${key}`, JSON.stringify([...xs, Math.round(ms)].slice(-7)));
  } catch {}
}

/**
 * Attente d'une réponse directe (préparation faite pendant la requête, sans tâche de fond) : libellé, temps écoulé,
 * temps restant estimé (durées déjà mesurées ici, sinon ordre de grandeur `expectedMs`) et barre qui avance avec le
 * temps (bloquée à 95 % tant que la réponse n'est pas arrivée). `progress` (0–1) : avancement réel s'il est connu.
 */
export function AiWait({ busy, label, waitKey, expectedMs, progress, className }: { busy: boolean; label: string; waitKey: string; expectedMs: number; progress?: number; className?: string }) {
  const start = useWaitStart(busy);
  const last = useRef<{ key: string; start: number } | null>(null);
  useEffect(() => {
    if (busy && start) last.current = { key: waitKey, start };
    if (!busy && last.current) {
      remember(last.current.key, Date.now() - last.current.start);
      last.current = null;
    }
  }, [busy, start, waitKey]);
  useTick(busy);
  if (!busy || !start) return null;
  const elapsed = Date.now() - start;
  // Réponse quasi immédiate : pas de carte qui clignote (elle apparaît après une seconde d'attente).
  if (elapsed < 900) return null;
  const est = learned(waitKey, expectedMs);
  const value = progress != null ? progress : Math.min(0.95, elapsed / Math.max(1000, est.ms));
  return (
    <div className={cx("rounded-2xl border border-line bg-card p-3", className)} role="status" aria-live="polite" data-ai-wait={waitKey}>
      <p className="flex items-center gap-2 text-sm font-medium"><Spinner className="text-signal" /> {label}</p>
      <Progress value={value} className="mt-2" />
      <TimeInfo startedAt={start} progress={progress ?? 0} estimate={est} className="mt-1.5" />
    </div>
  );
}
