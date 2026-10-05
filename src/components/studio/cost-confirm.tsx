"use client";
/**
 * Avertissement avant une action IA gourmande : part estimée des crédits de création qu'elle va consommer,
 * avec le choix de lancer, de passer au moteur local (gratuit) ou d'annuler.
 */
import { useCallback, useState } from "react";
import { Cpu, Sparkles, TriangleAlert } from "lucide-react";
import { api, Button, Modal, Progress } from "../ui";
import { useT } from "../i18n";

export type CostAction = "pipeline" | "theme" | "images" | "image" | "video-clip" | "ugc";
type Estimate = { action: CostAction; label: string; pctOfAvailable: number; leftAfterPct: number; level: "light" | "heavy" | "very-heavy" | "insufficient"; ai: boolean };

export function useCostConfirm() {
  const t = useT();
  const [state, setState] = useState<{ est: Estimate; resolve: (go: boolean) => void; localOk: boolean } | null>(null);

  /** Résout vrai si l'action peut partir (léger, local, ou confirmé par le client). */
  const confirm = useCallback(async (action: CostAction, opts: { beats?: number; localOk?: boolean; videos?: "ai" | "edited" | "none" } = {}) => {
    let est: Estimate;
    try {
      est = await api<Estimate>(`/api/estimate?action=${action}${opts.beats ? `&beats=${opts.beats}` : ""}${opts.videos ? `&videos=${opts.videos}` : ""}`);
    } catch {
      return true; // l'estimation ne doit jamais bloquer : le serveur vérifie les crédits de toute façon
    }
    if (!est.ai || est.level === "light") return true;
    return new Promise<boolean>((resolve) => setState({ est, resolve, localOk: opts.localOk !== false }));
  }, []);

  const close = (go: boolean) => {
    state?.resolve(go);
    setState(null);
  };
  const goLocal = async () => {
    await api("/api/me/ai-mode", { body: { mode: "local" } }).catch(() => {});
    close(true);
  };

  const e = state?.est;
  const pct = e ? Math.min(100, Math.round(e.pctOfAvailable)) : 0;
  const dialog = (
    <Modal open={!!state} onClose={() => close(false)} title={e?.level === "insufficient" ? t("Crédits insuffisants", "Not enough credits") : t("Action gourmande en IA", "AI-intensive action")}>
      {e && (
        <div className="grid gap-4 text-sm">
          <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>{e.label}</strong>{t(" :", ":")}{" "}
              {e.level === "insufficient"
                ? t("vos crédits de création restants ne suffisent pas pour cette action avec l'IA.", "your remaining creation credits are not enough for this action with AI.")
                : t(
                    <>cette action va utiliser environ <strong>{pct} % de vos crédits restants</strong>{e.level === "very-heavy" ? ", une bonne partie de ce qu'il vous reste" : ""}.</>,
                    <>this action will use about <strong>{pct}% of your remaining credits</strong>{e.level === "very-heavy" ? ", a large share of what you have left" : ""}.</>,
                  )}
            </p>
          </div>
          {e.level !== "insufficient" && (
            <div>
              <p className="text-xs text-muted">{t("Crédits restants après l'action (estimation)", "Credits left after this action (estimate)")}</p>
              <div className="mt-1.5 flex items-center gap-3"><Progress value={e.leftAfterPct / 100} /><span className="w-12 text-right text-xs tabular-nums">{t(`${Math.round(e.leftAfterPct)} %`, `${Math.round(e.leftAfterPct)}%`)}</span></div>
            </div>
          )}
          <p className="text-xs text-muted">{t("Estimation prudente : le débit réel, mesuré pendant la génération, est souvent plus faible. Le mode local est gratuit mais donne des résultats moins personnalisés.", "Conservative estimate: the actual charge, measured during generation, is often lower. Local mode is free but gives less tailored results.")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => close(false)}>{t("Annuler", "Cancel")}</Button>
            {state?.localOk && <Button type="button" variant="secondary" icon={<Cpu className="size-4" />} onClick={goLocal}>{t("Faire en local (gratuit)", "Run locally (free)")}</Button>}
            {e.level === "insufficient"
              ? <a href="/studio/compte" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper">{t("Recharger mes crédits", "Top up my credits")}</a>
              : <Button type="button" icon={<Sparkles className="size-4" />} onClick={() => close(true)}>{t("Lancer avec l'IA", "Run with AI")}</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
  return { confirm, dialog };
}
