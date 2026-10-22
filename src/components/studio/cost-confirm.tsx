"use client";
/**
 * Confirmation simple avant une création qui utilise l'IA : « Cette création utilise le budget IA de ce projet.
 * Reste 72 %. » Plus de décompte à l'unité (visuels, vidéos) ni de packs : seul le budget IA du projet (jetons
 * consommés, affiché en %) compte. Budget épuisé : recharger l'IA du projet (10 €) ou continuer avec le moteur
 * local, sans IA. Découverte (sans forfait) : moteur local, rien à confirmer. Le serveur contrôle le budget de toute façon.
 */
import { useCallback, useState } from "react";
import { Gauge, Sparkles, TriangleAlert } from "lucide-react";
import { api, Button, formatDate, Modal, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { aiLeftPct, formatEur, UsageMeter } from "../billing-client";
import { useOptionalProject } from "./project-context";
import { TOPUP_PRICE_EUR } from "@/lib/plans";
import type { ProjectSub } from "./project-subscription";

import { costUsage, type CostAction } from "@/lib/ai/cost-confirm";
export { costUsage, type CostAction } from "@/lib/ai/cost-confirm";

type State = { kind: "confirm" | "empty"; many?: boolean; local: boolean; sub: ProjectSub; resolve: (go: boolean) => void };

export function useCostConfirm() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const project = useOptionalProject();
  const projectId = project?.id ?? null;
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  /** Résout vrai si l'action peut partir. */
  const confirm = useCallback(
    async (action: CostAction, opts: { beats?: number; localOk?: boolean; videos?: "ai" | "edited" | "none" } = {}) => {
      const u = costUsage(action, opts.videos);
      if (!u || !projectId) return true;
      let sub: ProjectSub | null;
      try {
        sub = (await api<{ subscription: ProjectSub | null }>(`/api/projects/${projectId}/subscription`)).subscription;
      } catch {
        return true; // la vérification ne doit jamais bloquer : le serveur contrôle le budget
      }
      // Découverte (sans forfait) : moteur local, aucun budget à décompter.
      if (!sub?.ai) return true;
      const kind: State["kind"] = sub.ai.paused ? "empty" : "confirm";
      if (kind === "confirm" && !u.ask) return true;
      return new Promise<boolean>((resolve) => setState({ kind, many: u.many, local: u.local, sub: sub!, resolve }));
    },
    [projectId],
  );

  const close = (go: boolean) => {
    state?.resolve(go);
    setState(null);
  };

  const topup = async () => {
    if (!projectId) return;
    setBusy(true);
    try {
      const r = await api<{ url: string }>("/api/billing/checkout", { body: { kind: "topup", projectId } });
      window.location.href = r.url;
    } catch (e) {
      toast("bad", (e as Error).message);
      setBusy(false);
    }
  };

  const s = state;
  const ai = s?.sub.ai ?? null;
  const left = ai ? aiLeftPct(ai) : 0;
  const renews = s ? formatDate(s.sub.aiRenewsAt ?? s.sub.periodEnd ?? Date.now(), { day: "numeric", month: "long" }) : "";
  const canTopUp = !!s && (s.sub.status === "active" || s.sub.status === "manual");
  const title = !s ? "" : s.kind === "empty" ? left > 0 ? t("Budget IA disponible insuffisant", "Insufficient available AI budget") : t("Budget IA du projet épuisé", "Project AI budget used up") : t("Avant de lancer", "Before you start");
  const dialog = (
    <Modal open={!!s} onClose={() => close(false)} title={title}>
      {s && ai && (
        <div className="grid gap-4 text-sm" data-ai-budget-confirm={s.kind}>
          {s.kind === "confirm" ? (
            <div className="grid gap-3 rounded-2xl border border-line bg-paper-2 p-4 text-ink">
              <p className="flex gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
                <span>
                  {s.many
                    ? t("Chaque image créée par l'IA utilise une part du budget IA de ce projet.", "Each image created by AI uses part of this project's AI budget.")
                    : t("Cette création utilise une part du budget IA de ce projet.", "This uses part of this project's AI budget.")}
                </span>
              </p>
              <div>
                <p className="flex items-center justify-between gap-3 text-xs text-ink-2">
                  <span className="inline-flex items-center gap-1.5"><Gauge className="size-3.5" aria-hidden />{t("Budget IA du projet", "Project AI budget")}</span>
                  <strong className="tabular-nums text-ink">{t(`Reste ${left} %`, `${left}% left`)}</strong>
                </p>
                <div className="mt-1.5"><UsageMeter used={100 - left} label={t("Budget IA du projet", "Project AI budget")} /></div>
              </div>
            </div>
          ) : (
            <p className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                {left > 0 ? t(
                  `Il reste ${left} % du budget IA de ce projet, mais le montant disponible est inférieur au minimum requis pour lancer une création. Les réservations en cours peuvent aussi immobiliser une partie du budget. Aucun nouvel appel n’est lancé.`,
                  `${left}% of this project's AI budget remains, but the available amount is below the minimum required to start a creation. Pending reservations may also hold part of the budget. No new call is started.`,
                ) : t(
                  `Le budget IA de ce projet est utilisé à 100 %. Il repart le ${renews}, ou tout de suite avec une recharge.${s.local ? " En attendant, le moteur local du studio peut le faire sans IA." : ""}`,
                  `This project's AI budget is 100% used. It resets on ${renews}, or right away with a top-up.${s.local ? " Meanwhile, the studio's local engine can do it without AI." : ""}`,
                )}
              </span>
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => close(false)}>{t("Annuler", "Cancel")}</Button>
            {s.kind === "confirm" ? (
              <Button type="button" icon={<Sparkles className="size-4" />} onClick={() => close(true)}>{t("Continuer", "Continue")}</Button>
            ) : (
              <>
                {s.local && <Button type="button" variant="secondary" onClick={() => close(true)}>{t("Continuer sans IA", "Continue without AI")}</Button>}
                {canTopUp && <Button type="button" variant="signal" loading={busy} onClick={topup}>{t(`Recharger l'IA · ${formatEur(TOPUP_PRICE_EUR, lang)}`, `Top up AI · ${formatEur(TOPUP_PRICE_EUR, lang)}`)}</Button>}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
  return { confirm, dialog };
}
