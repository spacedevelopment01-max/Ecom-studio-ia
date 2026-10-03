"use client";
/**
 * Avertissement avant une action IA gourmande : part estimée des crédits de création qu'elle va consommer,
 * avec le choix de lancer, de passer au moteur local (gratuit) ou d'annuler.
 */
import { useCallback, useState } from "react";
import { Cpu, Sparkles, TriangleAlert } from "lucide-react";
import { api, Button, Modal, Progress } from "../ui";

export type CostAction = "pipeline" | "theme" | "images" | "image" | "video-clip" | "ugc";
type Estimate = { action: CostAction; label: string; pctOfAvailable: number; leftAfterPct: number; level: "light" | "heavy" | "very-heavy" | "insufficient"; ai: boolean };

export function useCostConfirm() {
  const [state, setState] = useState<{ est: Estimate; resolve: (go: boolean) => void; localOk: boolean } | null>(null);

  /** Résout vrai si l'action peut partir (léger, local, ou confirmé par le client). */
  const confirm = useCallback(async (action: CostAction, opts: { beats?: number; localOk?: boolean } = {}) => {
    let est: Estimate;
    try {
      est = await api<Estimate>(`/api/estimate?action=${action}${opts.beats ? `&beats=${opts.beats}` : ""}`);
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
    <Modal open={!!state} onClose={() => close(false)} title={e?.level === "insufficient" ? "Crédits insuffisants" : "Action gourmande en IA"}>
      {e && (
        <div className="grid gap-4 text-sm">
          <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-warn">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>{e.label}</strong> :{" "}
              {e.level === "insufficient"
                ? "vos crédits de création restants ne suffisent pas pour cette action avec l'IA."
                : <>cette action va utiliser environ <strong>{pct} % de vos crédits restants</strong>{e.level === "very-heavy" ? ", une bonne partie de ce qu'il vous reste" : ""}.</>}
            </p>
          </div>
          {e.level !== "insufficient" && (
            <div>
              <p className="text-xs text-muted">Crédits restants après l'action (estimation)</p>
              <div className="mt-1.5 flex items-center gap-3"><Progress value={e.leftAfterPct / 100} /><span className="w-12 text-right text-xs tabular-nums">{Math.round(e.leftAfterPct)} %</span></div>
            </div>
          )}
          <p className="text-xs text-muted">Estimation prudente : le débit réel, mesuré pendant la génération, est souvent plus faible. Le mode local est gratuit mais donne des résultats moins personnalisés.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => close(false)}>Annuler</Button>
            {state?.localOk && <Button type="button" variant="secondary" icon={<Cpu className="size-4" />} onClick={goLocal}>Faire en local (gratuit)</Button>}
            {e.level === "insufficient"
              ? <a href="/studio/compte" className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-medium text-paper">Recharger mes crédits</a>
              : <Button type="button" icon={<Sparkles className="size-4" />} onClick={() => close(true)}>Lancer avec l'IA</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
  return { confirm, dialog };
}
