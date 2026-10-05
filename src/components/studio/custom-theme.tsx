"use client";
/**
 * « Thème entièrement sur mesure » (forfait Dominer) : l'IA conçoit le plan de la page puis écrit chaque
 * section pour la marque. Bouton dans la barre de l'aperçu, fenêtre avec explication, confirmation,
 * avancement (pause / reprise) et compte rendu honnête. Créer / Vendre : bouton désactivé avec la raison.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, Pause, Play, TriangleAlert, Wand2 } from "lucide-react";
import Link from "next/link";
import { api, Button, cx, Modal, Progress, Spinner, useApi, useToast } from "../ui";
import { useT } from "../i18n";

type JobView = { id: string; status: string; progress: number; message: string; error: string | null; result: any };
export type CustomThemeStatus = {
  allowed: boolean;
  blocked: "plan" | "limit" | null;
  reason: string | null;
  used: number;
  limit: number;
  sectionsAllowed: boolean;
  ai: boolean;
  hasTheme: boolean;
  imported: boolean;
  job: JobView | null;
  last: JobView | null;
};

/** État partagé (bouton du thème sur mesure, « Générer » de la bibliothèque) ; actualisé pendant une création. */
export function useCustomThemeStatus(projectId: string) {
  const [poll, setPoll] = useState(0);
  const r = useApi<CustomThemeStatus>(`/api/projects/${projectId}/theme/custom`, { poll });
  const active = !!r.data?.job;
  useEffect(() => setPoll(active ? 3000 : 0), [active]);
  return r;
}

export function CustomThemeButton({ projectId, status, reload, onDone }: { projectId: string; status: CustomThemeStatus | null; reload: () => void; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const job = status?.job ?? null;
  // Fin de la création : l'aperçu passe sur la nouvelle version.
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !job) onDone();
    wasActive.current = !!job;
  }, [job, onDone]);
  if (!status) return null;
  const locked = !status.allowed;
  const start = async () => {
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/theme/custom`, { body: {} });
      setConfirming(false);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (action: "pause" | "resume") => {
    if (!job) return;
    try {
      await api(`/api/jobs/${job.id}`, { body: { action } });
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const last = status.last;
  const result = last?.status === "done" ? (last.result as { number: number; written: number; total: number; fallbacks: { name: string; replacement: string | null }[] } | null) : null;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs", job ? "border-signal bg-signal-soft text-signal" : "border-line bg-card hover:border-ink")}
        title={t("Thème entièrement sur mesure", "Fully custom theme")}
      >
        {job ? <Spinner className="size-3.5" /> : locked ? <Lock className="size-3.5" aria-hidden /> : <Wand2 className="size-3.5" aria-hidden />} {t("Sur mesure", "Custom")}
      </button>
      <Modal open={open} onClose={() => (setOpen(false), setConfirming(false))} title={t("Thème entièrement sur mesure", "Fully custom theme")}>
        <div className="grid gap-4 text-sm">
          <p className="text-ink-2">{t("L'IA conçoit le plan de votre page puis écrit chaque section pour votre marque, avec vos textes et vos images, sans reprendre les sections de la bibliothèque.", "The AI designs your page plan, then writes every section for your brand, with your copy and images, without reusing library sections.")}</p>
          {job ? (
            <div className="rounded-2xl border border-line bg-paper-2 p-4" role="status">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-medium">{job.status === "paused" ? <span className="size-2 shrink-0 rounded-full bg-warn" aria-hidden /> : <Spinner className="shrink-0 text-signal" />} <span className="truncate">{job.status === "paused" ? t("En pause", "Paused") : t("Création en cours", "Creating")}</span></span>
                <span className="text-xs text-muted">{t(`${Math.round(job.progress * 100)} %`, `${Math.round(job.progress * 100)}%`)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{job.message}</p>
              <Progress value={job.progress} className="mt-3" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {job.status === "paused" ? (
                  <Button size="sm" variant="secondary" icon={<Play className="size-3.5" />} onClick={() => act("resume")}>{t("Reprendre", "Resume")}</Button>
                ) : (
                  <Button size="sm" variant="secondary" icon={<Pause className="size-3.5" />} onClick={() => act("pause")}>{t("Mettre en pause", "Pause")}</Button>
                )}
                <span className="text-xs text-muted">{t("Vous pouvez fermer cette fenêtre : la création continue.", "You can close this window: the creation keeps going.")}</span>
              </div>
            </div>
          ) : confirming ? (
            <div className="rounded-2xl border border-signal/40 bg-signal-soft/50 p-4">
              <p className="font-medium text-ink">{t("La création prend quelques minutes, votre thème actuel est conservé dans les versions.", "Creation takes a few minutes; your current theme is kept in the versions.")}</p>
              <p className="mt-1 text-xs text-muted">{t(`Vous pouvez créer ${status.limit} thèmes sur mesure par mois (${status.used} ce mois-ci).`, `You can create ${status.limit} custom themes per month (${status.used} this month).`)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button icon={<Wand2 className="size-4" />} loading={busy} onClick={start}>{t("Lancer la création", "Start creating")}</Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>{t("Annuler", "Cancel")}</Button>
              </div>
            </div>
          ) : (
            <>
              {result && (
                <div className="rounded-2xl border border-ok/30 bg-ok-soft p-4 text-ink">
                  <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 shrink-0 text-ok" aria-hidden /> {t(`Dernier thème sur mesure : version ${result.number}, ${result.written} section(s) sur ${result.total} écrites pour votre marque.`, `Last custom theme: version ${result.number}, ${result.written} of ${result.total} section(s) written for your brand.`)}</p>
                  {result.fallbacks?.length > 0 && (
                    <ul className="mt-2 grid gap-1 text-xs text-ink-2">
                      {result.fallbacks.map((f) => (
                        <li key={f.name}>{f.replacement ? t(`« ${f.name} » n'a pas passé les contrôles : la section « ${f.replacement} » de la bibliothèque est gardée à cet endroit.`, `“${f.name}” didn't pass the checks: the library section “${f.replacement}” is kept in its place.`) : t(`« ${f.name} » n'a pas passé les contrôles et a été retirée.`, `“${f.name}” didn't pass the checks and was left out.`)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {last?.status === "failed" && (
                <p className="flex gap-2 rounded-2xl border border-warn/30 bg-warn-soft p-3 text-xs text-warn"><TriangleAlert className="size-4 shrink-0" aria-hidden /> {last.error || t("La dernière création n'a pas abouti. Votre thème n'a pas changé.", "The last creation didn't complete. Your theme hasn't changed.")}</p>
              )}
              {locked ? (
                <div className="grid gap-2">
                  <Button disabled icon={<Lock className="size-4" />}>{status.blocked === "plan" ? t("Inclus dans le forfait Dominer", "Included in the Dominate plan") : t("Limite du mois atteinte", "Monthly limit reached")}</Button>
                  <p className="text-xs text-muted">{status.reason}</p>
                  {status.blocked === "plan" && <Link href="/studio/compte#forfaits" className="text-xs font-medium text-signal underline underline-offset-2">{t("Voir les forfaits dans « Mon compte »", "See the plans in “My account”")}</Link>}
                </div>
              ) : status.imported ? (
                <p className="rounded-2xl border border-line bg-paper-2 p-3 text-xs text-ink-2">{t("Votre thème importé est conservé tel quel : choisissez d'abord un thème du studio dans « Thèmes » pour créer un thème sur mesure.", "Your imported theme is kept as is: pick a studio theme in “Themes” first to create a custom theme.")}</p>
              ) : !status.ai ? (
                <p className="rounded-2xl border border-info/30 bg-info-soft p-3 text-xs text-info">{t("L'IA n'est pas disponible pour le moment : réessayez un peu plus tard.", "AI isn't available right now: try again a little later.")}</p>
              ) : (
                <Button icon={<Wand2 className="size-4" />} onClick={() => setConfirming(true)}>{t("Créer mon thème sur mesure", "Create my custom theme")}</Button>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
